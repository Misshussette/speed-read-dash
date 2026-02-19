import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MDBReader from "npm:mdb-reader@3.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function computeBounds(times: number[], k = 4): { lower: number; upper: number } | null {
  if (times.length < 5) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map((t) => Math.abs(t - median));
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] || 1;
  return { lower: median - k * mad, upper: median + k * mad };
}

interface LapRow {
  session_id: string;
  lap_number: number;
  lap_time_s: number;
  s1_s: number | null;
  s2_s: number | null;
  s3_s: number | null;
  stint: number;
  driver: string | null;
  pit_type: string | null;
  pit_time_s: number | null;
  timestamp: string | null;
  lane: number | null;
  driving_station: number | null;
  team_number: string | null;
  stint_elapsed_s: number | null;
  session_elapsed_s: number | null;
  lap_status: string;
  validation_flags: string[];
  sort_key: number;
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

    const { import_id, event_id, file_path, selected_race_ids } = await req.json();

    if (!import_id || !event_id || !file_path || !Array.isArray(selected_race_ids) || selected_race_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing import_id, event_id, file_path, or selected_race_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update import status
    await supabaseAdmin.from("imports").update({
      status: "importing",
      started_at: new Date().toISOString(),
    }).eq("id", import_id);

    // Download MDB
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("race-files")
      .download(file_path);

    if (dlError || !fileData) {
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: dlError?.message || "Failed to download file",
        completed_at: new Date().toISOString(),
      }).eq("id", import_id);

      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const reader = new MDBReader(arrayBuffer);
    const tableNames = reader.getTableNames();

    // Get race metadata from RaceHistory
    const raceHistoryName = tableNames.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistory"
    );
    const raceHistoryRows: Record<string, unknown>[] = raceHistoryName
      ? reader.getTable(raceHistoryName).getData()
      : [];

    // Build race metadata map
    const raceMetaMap: Record<string, { name: string; date: string; track: string }> = {};
    for (const row of raceHistoryRows) {
      const raceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid", "ID"]));
      if (!raceId) continue;
      const rawDate = findColumn(row, ["RaceDate", "Race_Date", "racedate", "Date"]);
      raceMetaMap[raceId] = {
        name: toStr(findColumn(row, ["RaceName", "Race_Name", "racename", "Name"])) || `Race ${raceId}`,
        date: rawDate instanceof Date ? rawDate.toISOString().split("T")[0] : toStr(rawDate).split("T")[0],
        track: toStr(findColumn(row, ["TrackName", "Track_Name", "trackname", "Track", "Circuit"])),
      };
    }

    // Get driver info from RaceHistoryClas
    const clasName = tableNames.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistoryclas"
    );
    const clasRows: Record<string, unknown>[] = clasName
      ? reader.getTable(clasName).getData()
      : [];

    // Driver names by race+driverID
    const driverNameMap: Record<string, Record<string, string>> = {};
    for (const row of clasRows) {
      const raceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid"]));
      const driverId = toStr(findColumn(row, ["DriverID", "Driver_ID", "driverid"]));
      const driverName = toStr(findColumn(row, ["DriverName", "Driver_Name", "drivername", "Driver"]));
      if (raceId && driverId) {
        if (!driverNameMap[raceId]) driverNameMap[raceId] = {};
        driverNameMap[raceId][driverId] = driverName || driverId;
      }
    }

    // Get RaceHistoryLap table
    const lapTableName = tableNames.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistorylap"
    );

    if (!lapTableName) {
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: "RaceHistoryLap table not found",
        completed_at: new Date().toISOString(),
      }).eq("id", import_id);

      return new Response(JSON.stringify({ error: "RaceHistoryLap table not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lapTable = reader.getTable(lapTableName);
    const allLapRows = lapTable.getData();
    console.log(`Total lap rows: ${allLapRows.length}, importing for ${selected_race_ids.length} races`);

    // Convert selected_race_ids to strings for comparison
    const selectedSet = new Set(selected_race_ids.map(String));

    // Group laps by RaceID (only selected)
    const lapsByRace: Record<string, Record<string, unknown>[]> = {};
    for (const row of allLapRows) {
      const raceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid"]));
      if (!selectedSet.has(raceId)) continue;
      if (!lapsByRace[raceId]) lapsByRace[raceId] = [];
      lapsByRace[raceId].push(row);
    }

    const results: { race_id: string; session_id: string; name: string; laps_count: number }[] = [];
    let totalRowsProcessed = 0;

    // Process each selected race
    for (const raceId of selected_race_ids) {
      const raceIdStr = String(raceId);
      const raceMeta = raceMetaMap[raceIdStr] || { name: `Race ${raceIdStr}`, date: "", track: "" };
      const raceLapRows = lapsByRace[raceIdStr] || [];

      if (raceLapRows.length === 0) {
        console.log(`Skipping race ${raceIdStr}: no laps`);
        continue;
      }

      // Detect sectors
      const firstRow = raceLapRows[0];
      const hasS1 = findColumn(firstRow, ["Sector1", "S1", "s1", "Sector_1"]) !== null;
      const hasS2 = findColumn(firstRow, ["Sector2", "S2", "s2", "Sector_2"]) !== null;
      const hasS3 = findColumn(firstRow, ["Sector3", "S3", "s3", "Sector_3"]) !== null;
      const hasSectors = hasS1 && hasS2 && hasS3;

      // Create session for this race
      const { data: sessionData, error: sessionErr } = await supabaseAdmin
        .from("sessions")
        .insert({
          event_id,
          name: raceMeta.name,
          display_name: raceMeta.name,
          track: raceMeta.track || "Unknown",
          date: raceMeta.date || new Date().toISOString().split("T")[0],
          data_mode: "pclap",
          has_sector_data: hasSectors,
          total_laps: raceLapRows.length,
          status: "processing",
          created_by: userId,
          filename: `${raceMeta.name}.mdb`,
        })
        .select("id")
        .single();

      if (sessionErr || !sessionData) {
        console.error(`Failed to create session for race ${raceIdStr}:`, sessionErr);
        continue;
      }

      const sessionId = sessionData.id;
      const driverMap = driverNameMap[raceIdStr] || {};

      // Convert MDB lap rows to StintLab format
      const laps: LapRow[] = [];
      for (let i = 0; i < raceLapRows.length; i++) {
        const row = raceLapRows[i];

        // LapTime: PCLap uses milliseconds
        const rawLapTime = toNum(findColumn(row, ["LapTime", "Lap_Time", "laptime"]));
        const lapTimeS = rawLapTime !== null ? rawLapTime / 1000 : 0;

        const rawRaceTime = toNum(findColumn(row, ["RaceTime", "Race_Time", "racetime"]));
        const sessionElapsedS = rawRaceTime !== null ? rawRaceTime / 1000 : null;

        const driverId = toStr(findColumn(row, ["DriverID", "Driver_ID", "driverid"]));
        const driverName = toStr(findColumn(row, ["DriverName", "Driver_Name", "drivername"])) || driverMap[driverId] || driverId || null;

        const lane = toNum(findColumn(row, ["Lane", "LaneID", "Lane_ID", "lane"]));
        const lapNumber = toNum(findColumn(row, ["LapNumber", "Lap_Number", "lapnumber", "LapNr"])) ?? i + 1;
        const stint = toNum(findColumn(row, ["SegmentID", "Segment_ID", "segmentid", "Stint"])) ?? 0;
        const pitFlag = findColumn(row, ["Pit", "PitStop", "pit", "IsPit"]);
        const isPit = pitFlag === true || pitFlag === 1 || toStr(pitFlag).toLowerCase() === "true";

        laps.push({
          session_id: sessionId,
          lap_number: lapNumber,
          lap_time_s: lapTimeS,
          s1_s: hasSectors ? (toNum(findColumn(row, ["Sector1", "S1", "s1", "Sector_1"])) ?? 0) / 1000 : null,
          s2_s: hasSectors ? (toNum(findColumn(row, ["Sector2", "S2", "s2", "Sector_2"])) ?? 0) / 1000 : null,
          s3_s: hasSectors ? (toNum(findColumn(row, ["Sector3", "S3", "s3", "Sector_3"])) ?? 0) / 1000 : null,
          stint: stint,
          driver: driverName,
          pit_type: isPit ? "pit" : null,
          pit_time_s: null,
          timestamp: null,
          lane: lane,
          driving_station: null,
          team_number: null,
          stint_elapsed_s: null,
          session_elapsed_s: sessionElapsedS,
          lap_status: "valid",
          validation_flags: [],
          sort_key: sessionElapsedS ?? i,
        });
      }

      // Sort by chronological order
      laps.sort((a, b) => a.sort_key - b.sort_key);

      // Validation pass
      const positiveTimes = laps.filter((l) => l.lap_time_s > 0).map((l) => l.lap_time_s);
      const bounds = computeBounds(positiveTimes);
      let prevElapsed: number | null = null;

      for (const lap of laps) {
        const flags: string[] = [];
        if (lap.lap_time_s <= 0) flags.push("non_positive_time");
        if (bounds && lap.lap_time_s > 0 && (lap.lap_time_s < bounds.lower || lap.lap_time_s > bounds.upper))
          flags.push("statistical_outlier");
        if (prevElapsed !== null && lap.session_elapsed_s !== null && lap.session_elapsed_s < prevElapsed)
          flags.push("negative_time_delta");
        lap.validation_flags = flags;
        lap.lap_status = flags.includes("non_positive_time") ? "invalid" : flags.length > 0 ? "suspect" : "valid";
        if (lap.session_elapsed_s !== null) prevElapsed = lap.session_elapsed_s;
      }

      // Insert laps in batches
      const BATCH_SIZE = 500;
      for (let i = 0; i < laps.length; i += BATCH_SIZE) {
        const batch = laps.slice(i, i + BATCH_SIZE);
        const { error: insertErr } = await supabaseAdmin.from("laps").insert(batch);
        if (insertErr) {
          console.error(`Lap insert error for race ${raceIdStr}:`, insertErr);
          await supabaseAdmin.from("sessions").update({ status: "error" }).eq("id", sessionId);
          break;
        }
        totalRowsProcessed += batch.length;
      }

      // Mark session ready
      await supabaseAdmin.from("sessions").update({ status: "ready" }).eq("id", sessionId);

      results.push({
        race_id: raceIdStr,
        session_id: sessionId,
        name: raceMeta.name,
        laps_count: laps.length,
      });
    }

    // Mark import complete
    await supabaseAdmin.from("imports").update({
      status: "complete",
      rows_processed: totalRowsProcessed,
      completed_at: new Date().toISOString(),
    }).eq("id", import_id);

    return new Response(
      JSON.stringify({
        success: true,
        import_id,
        races_imported: results.length,
        total_laps: totalRowsProcessed,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-mdb-races error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
