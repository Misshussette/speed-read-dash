import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MDBReader from "npm:mdb-reader@3.1.0";
import { Buffer } from "node:buffer";

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

/**
 * Imports a SINGLE race from an MDB file.
 * Called once per selected race to stay within edge function CPU/memory limits.
 *
 * Expects: { import_id, event_id, file_path, race_id, race_meta: { name, date, track, seg_number } }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { import_id, event_id, file_path, race_id, race_meta } = await req.json();

    if (!import_id || !event_id || !file_path || !race_id) {
      return new Response(
        JSON.stringify({ error: "Missing import_id, event_id, file_path, or race_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raceIdStr = String(race_id);
    const meta = race_meta || { name: `Race ${raceIdStr}`, date: "", track: "", seg_number: 0 };

    // Download MDB
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("race-files")
      .download(file_path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    console.log(`MDB file size: ${buffer.length} bytes, importing race: ${raceIdStr}`);
    const reader = new MDBReader(buffer);
    const tableNames = reader.getTableNames().filter(
      (t: string) => !t.startsWith("MSys") && !t.startsWith("pbcat") && t !== "Numbering"
    );

    // Find RaceHistoryLap
    const lapTableName = tableNames.find(
      (t: string) => t.toLowerCase().replace(/[_\s]/g, "") === "racehistorylap"
    );

    if (!lapTableName) {
      return new Response(JSON.stringify({ error: "RaceHistoryLap table not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read all rows but immediately filter — only keep matching race_id
    const lapTable = reader.getTable(lapTableName);
    const allRows = lapTable.getData();
    console.log(`RaceHistoryLap total rows: ${allRows.length}, filtering for race ${raceIdStr}`);

    const raceLapRows: Record<string, unknown>[] = [];
    for (const row of allRows) {
      const rowRaceId = toStr(findColumn(row, ["RaceID", "Race_ID", "raceid"]));
      if (rowRaceId === raceIdStr) {
        raceLapRows.push(row);
      }
    }

    console.log(`Matched ${raceLapRows.length} laps for race ${raceIdStr}`);

    if (raceLapRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, race_id: raceIdStr, session_id: null, laps_count: 0, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasSectors = (meta.seg_number ?? 0) > 0;

    // Create session
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        event_id,
        name: meta.name || `Race ${raceIdStr}`,
        display_name: meta.name || `Race ${raceIdStr}`,
        track: meta.track || "Unknown",
        date: meta.date ? meta.date.split("T")[0] : new Date().toISOString().split("T")[0],
        data_mode: "pclap",
        has_sector_data: hasSectors,
        total_laps: raceLapRows.length,
        status: "processing",
        created_by: userId,
        filename: `${meta.name || raceIdStr}.mdb`,
      })
      .select("id")
      .single();

    if (sessionErr || !sessionData) {
      console.error(`Failed to create session:`, sessionErr);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = sessionData.id;

    // Convert rows to StintLab format
    const laps: LapRow[] = [];
    for (let i = 0; i < raceLapRows.length; i++) {
      const row = raceLapRows[i];
      const rawLapTime = toNum(findColumn(row, ["LapTime", "Lap_Time", "laptime"]));
      const lapTimeS = rawLapTime !== null ? rawLapTime / 1000 : 0;
      const rawRaceTime = toNum(findColumn(row, ["RaceTime", "Race_Time", "racetime"]));
      const sessionElapsedS = rawRaceTime !== null ? rawRaceTime / 1000 : null;
      const rawPitTime = toNum(findColumn(row, ["PitStopTime", "Pit_Stop_Time", "pitstoptime"]));
      const pitTimeS = rawPitTime !== null && rawPitTime > 0 ? rawPitTime / 1000 : null;
      const hasPit = pitTimeS !== null && pitTimeS > 0;
      const driverId = toStr(findColumn(row, ["DriverID", "Driver_ID", "driverid"]));
      const lane = toNum(findColumn(row, ["LaneID", "Lane_ID", "laneid", "Lane"]));
      const lapNumber = toNum(findColumn(row, ["Lap", "LapNumber", "Lap_Number", "lapnumber"])) ?? i + 1;
      const stint = toNum(findColumn(row, ["SegmentID", "Segment_ID", "segmentid"])) ?? 0;
      const teamId = toStr(findColumn(row, ["TeamID", "Team_ID", "teamid"])) || null;
      const recDateTime = findColumn(row, ["RecDateTime", "Rec_Date_Time", "recdatetime"]);
      const timestamp = recDateTime instanceof Date ? recDateTime.toISOString() : (toStr(recDateTime) || null);

      laps.push({
        session_id: sessionId,
        lap_number: lapNumber,
        lap_time_s: lapTimeS,
        s1_s: null,
        s2_s: null,
        s3_s: null,
        stint,
        driver: driverId || null,
        pit_type: hasPit ? "pit" : null,
        pit_time_s: pitTimeS,
        timestamp,
        lane,
        driving_station: null,
        team_number: teamId,
        stint_elapsed_s: null,
        session_elapsed_s: sessionElapsedS,
        lap_status: "valid",
        validation_flags: [],
        sort_key: sessionElapsedS ?? i,
      });
    }

    // Sort chronologically
    laps.sort((a, b) => a.sort_key - b.sort_key);

    // Validation
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

    // Insert in batches
    const BATCH_SIZE = 500;
    let insertFailed = false;
    for (let i = 0; i < laps.length; i += BATCH_SIZE) {
      const batch = laps.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabaseAdmin.from("laps").insert(batch);
      if (insertErr) {
        console.error(`Lap insert error:`, insertErr);
        await supabaseAdmin.from("sessions").update({ status: "error" }).eq("id", sessionId);
        insertFailed = true;
        break;
      }
    }

    if (!insertFailed) {
      await supabaseAdmin.from("sessions").update({ status: "ready" }).eq("id", sessionId);
    }

    return new Response(
      JSON.stringify({
        success: !insertFailed,
        race_id: raceIdStr,
        session_id: sessionId,
        name: meta.name,
        laps_count: laps.length,
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
