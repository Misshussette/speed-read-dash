import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Column alias mapping (mirrors client-side)
const COLUMN_ALIASES: Record<string, string> = {
  lap_time_sec: "lap_time_s",
  laptime: "lap_time_s",
  lap_time: "lap_time_s",
  circuit: "track",
  car: "car_model",
  pilote: "driver",
  tour: "lap_number",
  relais: "stint",
  stint_id: "stint",
  stint_elapsed_sec: "stint_elapsed_s",
  session_elapsed_sec: "session_elapsed_s",
  RaceID: "session_id",
  SegmentID: "stint",
  RaceTime: "session_elapsed_s",
  LapTime: "lap_time_s",
  LaneID: "lane",
  DriverID: "driver",
  TeamID: "team_number",
  CarID: "car_model",
};

const PCLAP_SIGNATURE = ["RaceID", "SegmentID", "RaceTime", "LapTime"];
const MIN_CREDIBLE_LAP_TIME_S = 5;

interface StagedLapRow {
  staged_session_id: string;
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

function parseCSVContent(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const firstLine = content.split("\n")[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }
  return { headers, rows };
}

function getVal(row: Record<string, string>, canonical: string, aliasMap: Map<string, string>): string {
  if (row[canonical] !== undefined) return row[canonical];
  for (const [original, mapped] of aliasMap) {
    if (mapped === canonical && row[original] !== undefined) return row[original];
  }
  return "";
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

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validateDataset(laps: StagedLapRow[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (laps.length === 0) {
    errors.push("No valid lap records found in file.");
    return { errors, warnings };
  }

  // Check for missing laps (gaps in lap_number per driver)
  const driverLaps = new Map<string, number[]>();
  for (const lap of laps) {
    const key = lap.driver || "__unknown__";
    if (!driverLaps.has(key)) driverLaps.set(key, []);
    driverLaps.get(key)!.push(lap.lap_number);
  }
  for (const [driver, nums] of driverLaps) {
    const sorted = [...nums].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        warnings.push(`Missing lap(s) for driver "${driver}": gap between lap ${sorted[i - 1]} and ${sorted[i]}`);
      }
    }
  }

  // Check for duplicate driver+lap_number combos
  const seen = new Set<string>();
  let dupeCount = 0;
  for (const lap of laps) {
    const key = `${lap.driver}|${lap.stint}|${lap.lap_number}`;
    if (seen.has(key)) dupeCount++;
    seen.add(key);
  }
  if (dupeCount > 0) {
    warnings.push(`${dupeCount} duplicate driver+stint+lap_number combinations detected.`);
  }

  // Check for corrupted timestamps
  let prevElapsed: number | null = null;
  let negativeDeltas = 0;
  for (const lap of laps) {
    if (prevElapsed !== null && lap.session_elapsed_s !== null && lap.session_elapsed_s < prevElapsed) {
      negativeDeltas++;
    }
    if (lap.session_elapsed_s !== null) prevElapsed = lap.session_elapsed_s;
  }
  if (negativeDeltas > 0) {
    warnings.push(`${negativeDeltas} negative time deltas detected (non-chronological timestamps).`);
  }

  // Check for invalid lap times
  const invalidCount = laps.filter((l) => l.lap_time_s <= 0).length;
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} laps with non-positive lap times.`);
  }

  const belowMinCount = laps.filter((l) => l.lap_time_s > 0 && l.lap_time_s < MIN_CREDIBLE_LAP_TIME_S).length;
  if (belowMinCount > 0) {
    warnings.push(`${belowMinCount} laps below ${MIN_CREDIBLE_LAP_TIME_S}s minimum credible time (likely hardware artifacts).`);
  }

  // Check sector split consistency
  const sectorLaps = laps.filter((l) => l.s1_s !== null && l.s2_s !== null && l.s3_s !== null);
  let sectorMismatch = 0;
  for (const lap of sectorLaps) {
    const sectorSum = (lap.s1_s || 0) + (lap.s2_s || 0) + (lap.s3_s || 0);
    if (Math.abs(sectorSum - lap.lap_time_s) > 0.5) {
      sectorMismatch++;
    }
  }
  if (sectorMismatch > 0) {
    warnings.push(`${sectorMismatch} laps where sector splits don't sum to lap time (>0.5s difference).`);
  }

  return { errors, warnings };
}

function processRows(headers: string[], rows: Record<string, string>[], stagedSessionId: string): {
  laps: StagedLapRow[];
  meta: { track: string; car_model: string; brand: string; date: string; hasSectors: boolean; dataMode: string; total_laps: number };
} {
  const aliasMap = new Map<string, string>();
  for (const h of headers) { aliasMap.set(h, COLUMN_ALIASES[h] || h); }
  const canonicals = new Set(aliasMap.values());
  const isPclap = PCLAP_SIGNATURE.every((col) => headers.includes(col));
  const hasSectors = canonicals.has("S1_s") && canonicals.has("S2_s") && canonicals.has("S3_s");
  const laps: StagedLapRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lapTime = parseFloat(getVal(row, "lap_time_s", aliasMap)) || 0;
    const sessionElapsed = getVal(row, "session_elapsed_s", aliasMap)
      ? parseFloat(getVal(row, "session_elapsed_s", aliasMap)) || null
      : null;
    if (lapTime === 0 && sessionElapsed === null) continue;

    laps.push({
      staged_session_id: stagedSessionId,
      lap_number: parseInt(getVal(row, "lap_number", aliasMap)) || i,
      lap_time_s: lapTime,
      s1_s: hasSectors ? parseFloat(getVal(row, "S1_s", aliasMap)) || null : null,
      s2_s: hasSectors ? parseFloat(getVal(row, "S2_s", aliasMap)) || null : null,
      s3_s: hasSectors ? parseFloat(getVal(row, "S3_s", aliasMap)) || null : null,
      stint: parseInt(getVal(row, "stint", aliasMap)) || 0,
      driver: getVal(row, "driver", aliasMap).trim() || null,
      pit_type: getVal(row, "pit_type", aliasMap).trim() || null,
      pit_time_s: getVal(row, "pit_time_s", aliasMap) ? parseFloat(getVal(row, "pit_time_s", aliasMap)) || null : null,
      timestamp: getVal(row, "timestamp", aliasMap).trim() || null,
      lane: getVal(row, "lane", aliasMap) ? parseInt(getVal(row, "lane", aliasMap)) || null : null,
      driving_station: getVal(row, "driving_station", aliasMap) ? parseInt(getVal(row, "driving_station", aliasMap)) || null : null,
      team_number: getVal(row, "team_number", aliasMap).trim() || null,
      stint_elapsed_s: getVal(row, "stint_elapsed_s", aliasMap) ? parseFloat(getVal(row, "stint_elapsed_s", aliasMap)) || null : null,
      session_elapsed_s: sessionElapsed,
      lap_status: "valid",
      validation_flags: [],
      sort_key: sessionElapsed ?? i,
    });
  }

  laps.sort((a, b) => a.sort_key - b.sort_key);

  // Statistical validation
  const positiveTimes = laps.filter((l) => l.lap_time_s > 0).map((l) => l.lap_time_s);
  const bounds = computeBounds(positiveTimes);
  let prevElapsed: number | null = null;

  for (const lap of laps) {
    const flags: string[] = [];
    if (lap.lap_time_s <= 0) flags.push("non_positive_time");
    if (lap.lap_time_s > 0 && lap.lap_time_s < MIN_CREDIBLE_LAP_TIME_S) flags.push("below_minimum_threshold");
    if (bounds && lap.lap_time_s > 0 && (lap.lap_time_s < bounds.lower || lap.lap_time_s > bounds.upper))
      flags.push("statistical_outlier");
    if (prevElapsed !== null && lap.session_elapsed_s !== null && lap.session_elapsed_s < prevElapsed)
      flags.push("negative_time_delta");
    lap.validation_flags = flags;
    lap.lap_status = flags.includes("non_positive_time") ? "invalid" : flags.length > 0 ? "suspect" : "valid";
    if (lap.session_elapsed_s !== null) prevElapsed = lap.session_elapsed_s;
  }

  const first = rows[0];
  return {
    laps,
    meta: {
      track: getVal(first, "track", aliasMap).trim() || "Unknown",
      car_model: getVal(first, "car_model", aliasMap).trim() || "",
      brand: getVal(first, "brand", aliasMap).trim() || "",
      date: getVal(first, "date", aliasMap).trim() || new Date().toISOString().split("T")[0],
      hasSectors: hasSectors,
      dataMode: isPclap ? "pclap" : "generic",
      total_laps: laps.length,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let importId: string | null = null;

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

    const { file_path, event_id, data_origin } = await req.json();

    if (!file_path || !event_id) {
      return new Response(JSON.stringify({ error: "Missing file_path or event_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = data_origin || "personal_upload";

    // Create import tracking record
    const { data: importData, error: importCreateError } = await supabaseAdmin
      .from("imports")
      .insert({
        event_id,
        file_path,
        filename: file_path.split("/").pop() || file_path,
        status: "processing",
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (importCreateError) {
      console.error("Import record creation failed:", importCreateError);
    } else {
      importId = importData.id;
    }

    // Download file from storage
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from("race-files")
      .download(file_path);

    if (dlError || !fileData) {
      if (importId) {
        await supabaseAdmin.from("imports").update({
          status: "error",
          error_message: dlError?.message || "Failed to download file",
          completed_at: new Date().toISOString(),
        }).eq("id", importId);
      }
      return new Response(JSON.stringify({ error: "Failed to download file", details: dlError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = await fileData.text();

    // Compute source hash for duplicate detection
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
    const sourceHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Check for duplicate import in both sessions and staged_sessions
    const { data: existingSession } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("event_id", event_id)
      .eq("source_hash", sourceHash)
      .maybeSingle();

    if (existingSession) {
      if (importId) {
        await supabaseAdmin.from("imports").update({
          status: "skipped_duplicate",
          error_message: "Duplicate file detected — already imported",
          completed_at: new Date().toISOString(),
        }).eq("id", importId);
      }
      return new Response(JSON.stringify({ error: "Duplicate file — this data has already been imported", duplicate_session_id: existingSession.id }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { headers, rows } = parseCSVContent(content);

    if (rows.length === 0) {
      if (importId) {
        await supabaseAdmin.from("imports").update({
          status: "error",
          error_message: "No data rows found in file",
          completed_at: new Date().toISOString(),
        }).eq("id", importId);
      }
      return new Response(JSON.stringify({ error: "No data rows found in file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create staged session record
    const { data: stagedSession, error: stagedError } = await supabaseAdmin
      .from("staged_sessions")
      .insert({
        event_id,
        created_by: userId,
        filename: file_path.split("/").pop() || file_path,
        file_path,
        source_hash: sourceHash,
        data_origin: origin,
        status: "parsing",
      })
      .select("id")
      .single();

    if (stagedError || !stagedSession) {
      throw new Error(`Failed to create staged session: ${stagedError?.message}`);
    }

    const stagedId = stagedSession.id;

    // 2. Parse and process rows into staging
    const { laps, meta } = processRows(headers, rows, stagedId);

    // 3. Run validation
    const validation = validateDataset(laps);

    // 4. Store raw metadata on staged session
    await supabaseAdmin.from("staged_sessions").update({
      raw_meta: {
        name: (file_path.split("/").pop() || "Session").replace(/\.csv$/i, ""),
        track: meta.track,
        car_model: meta.car_model,
        brand: meta.brand,
        date: meta.date,
        has_sector_data: meta.hasSectors,
        total_laps: meta.total_laps,
      },
      data_mode: meta.dataMode,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      status: validation.errors.length > 0 ? "rejected" : "validated",
    }).eq("id", stagedId);

    if (validation.errors.length > 0) {
      // Rejected: don't insert laps
      if (importId) {
        await supabaseAdmin.from("imports").update({
          status: "error",
          error_message: validation.errors.join("; "),
          completed_at: new Date().toISOString(),
        }).eq("id", importId);
      }
      return new Response(JSON.stringify({
        success: false,
        staged_session_id: stagedId,
        status: "rejected",
        validation_errors: validation.errors,
        validation_warnings: validation.warnings,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Insert staged laps in batches
    const BATCH_SIZE = 500;
    let rowsProcessed = 0;
    for (let i = 0; i < laps.length; i += BATCH_SIZE) {
      const batch = laps.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabaseAdmin.from("staged_laps").insert(batch);
      if (insertError) {
        console.error("Staged lap insert error:", insertError);
        await supabaseAdmin.from("staged_sessions").update({ status: "error", validation_errors: [insertError.message] }).eq("id", stagedId);
        throw new Error(`Failed to insert staged laps: ${insertError.message}`);
      }
      rowsProcessed += batch.length;
    }

    // 6. Auto-promote if no errors (seamless UX for now)
    const { data: promotedId, error: promoteError } = await supabaseAdmin.rpc("promote_staged_session", {
      _staged_id: stagedId,
    });

    if (promoteError) {
      console.error("Promotion error:", promoteError);
      if (importId) {
        await supabaseAdmin.from("imports").update({
          status: "error",
          error_message: `Validation passed but promotion failed: ${promoteError.message}`,
          rows_processed: rowsProcessed,
          completed_at: new Date().toISOString(),
        }).eq("id", importId);
      }
      return new Response(JSON.stringify({
        success: false,
        staged_session_id: stagedId,
        status: "validated",
        validation_warnings: validation.warnings,
        error: "Auto-promotion failed: " + promoteError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update import record
    if (importId) {
      await supabaseAdmin.from("imports").update({
        status: "complete",
        session_id: promotedId,
        rows_processed: rowsProcessed,
        completed_at: new Date().toISOString(),
      }).eq("id", importId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: promotedId,
        staged_session_id: stagedId,
        import_id: importId,
        laps_processed: laps.length,
        validation_warnings: validation.warnings,
        status: "promoted",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Ingestion error:", err);
    if (importId) {
      await supabaseAdmin.from("imports").update({
        status: "error",
        error_message: String(err),
        completed_at: new Date().toISOString(),
      }).eq("id", importId).catch(() => {});
    }
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
