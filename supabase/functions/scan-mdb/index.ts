import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MDBReader from "npm:mdb-reader@3.1.0";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Flexible column name matching — maps by meaning, not strict naming.
 */
function findColumn(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[_\s]/g, "") === c.toLowerCase().replace(/[_\s]/g, "")
    );
    if (key !== undefined && row[key] !== null && row[key] !== undefined) return row[key];
  }
  return null;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { file_path, event_id } = await req.json();
    if (!file_path || !event_id) {
      return new Response(JSON.stringify({ error: "Missing file_path or event_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create import record
    const { data: importData, error: importErr } = await supabaseAdmin
      .from("imports")
      .insert({
        event_id,
        file_path,
        filename: file_path.split("/").pop() || file_path,
        status: "scanning",
        source_type: "mdb",
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (importErr) {
      console.error("Import create error:", importErr);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const importId = importData.id;

    // Download MDB from storage
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("race-files")
      .download(file_path);

    if (dlError || !fileData) {
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: dlError?.message || "Failed to download MDB file",
        completed_at: new Date().toISOString(),
      }).eq("id", importId);

      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse MDB
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    console.log(`MDB file size: ${buffer.length} bytes`);

    let reader: InstanceType<typeof MDBReader>;
    try {
      reader = new MDBReader(buffer);
    } catch (parseErr: unknown) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error("MDB parse error:", errMsg);
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: `Failed to parse MDB: ${errMsg}`,
        completed_at: new Date().toISOString(),
      }).eq("id", importId);

      return new Response(JSON.stringify({ error: "Invalid MDB file", details: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableNames = reader.getTableNames();
    // Filter out system tables
    const userTables = tableNames.filter(
      (t: string) => !t.startsWith("MSys") && !t.startsWith("pbcat") && t !== "Numbering"
    );
    console.log("MDB user tables found:", userTables);

    // Find RaceHistory table
    const raceHistoryName = userTables.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistory"
    );

    if (!raceHistoryName) {
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: `RaceHistory table not found. Available tables: ${userTables.join(", ")}`,
        completed_at: new Date().toISOString(),
      }).eq("id", importId);

      return new Response(
        JSON.stringify({ error: "RaceHistory table not found", available_tables: userTables }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read RaceHistory
    const raceHistoryTable = reader.getTable(raceHistoryName);
    const raceHistoryRows = raceHistoryTable.getData();
    console.log(`RaceHistory: ${raceHistoryRows.length} rows, columns: ${raceHistoryTable.getColumnNames().join(", ")}`);

    // Find RaceHistoryClas table
    const clasName = userTables.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistoryclas"
    );

    let clasRows: Record<string, unknown>[] = [];
    if (clasName) {
      const clasTable = reader.getTable(clasName);
      clasRows = clasTable.getData();
      console.log(`RaceHistoryClas: ${clasRows.length} rows, columns: ${clasTable.getColumnNames().join(", ")}`);
    }

    // NOTE: We intentionally do NOT read RaceHistoryLap here.
    // That table can have hundreds of thousands of rows and would exceed
    // edge function memory limits. Lap counts come from RaceHistory metadata
    // (LapRace / LapNumber columns) or from RaceHistoryClas.TotalLaps.

    // Group participants by race from RaceHistoryClas
    const driversByRace: Record<string, { name: string; lane: number | null; bestLap: number | null }[]> = {};
    for (const row of clasRows) {
      const raceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid"]));
      if (!raceId) continue;

      if (!driversByRace[raceId]) driversByRace[raceId] = [];
      const driverId = toStr(findColumn(row, ["DriverID", "Driver_ID", "driverid"]));
      driversByRace[raceId].push({
        name: driverId || "Unknown",
        lane: null, // Lane is in RaceHistoryLap, not in Clas
        bestLap: null, // Can compute from AverageLap if needed
      });
    }

    // Build race catalog from RaceHistory
    const raceCatalog = raceHistoryRows.map((row) => {
      const raceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid", "ID"]));
      const rawDate = findColumn(row, ["RaceDate", "Race_Date", "racedate", "Date", "date"]);
      const segNumber = toNum(findColumn(row, ["SegNumber", "Seg_Number", "segnumber"]));

      return {
        race_id: raceId,
        name: toStr(findColumn(row, ["RaceName", "Race_Name", "racename", "Name"])) || `Race ${raceId}`,
        date: rawDate instanceof Date ? rawDate.toISOString() : toStr(rawDate),
        track: toStr(findColumn(row, ["TrackID", "Track_ID", "trackid", "TrackName", "Track"])),
        track_length: toNum(findColumn(row, ["TrackLength", "Track_Length", "tracklength", "TrackLenght"])),
        duration: toStr(findColumn(row, ["TimeRace", "Time_Race", "timerace", "RaceDuration"])),
        lap_count: toNum(findColumn(row, ["LapRace", "LapNumber", "Lap_Number", "TotalLaps"])) || 0,
        seg_number: segNumber,
        has_sectors: segNumber !== null && segNumber > 0,
        comment: toStr(findColumn(row, ["Comment", "Comments", "Notes", "comment"])),
        drivers: driversByRace[raceId] || [],
      };
    });

    // Sort by date descending
    raceCatalog.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Update import with catalog
    await supabaseAdmin.from("imports").update({
      status: "catalog_ready",
      race_catalog: raceCatalog,
      completed_at: new Date().toISOString(),
    }).eq("id", importId);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importId,
        race_count: raceCatalog.length,
        catalog: raceCatalog,
        available_tables: userTables,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("scan-mdb error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
