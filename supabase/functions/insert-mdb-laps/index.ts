import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function computeBounds(times: number[], k = 4): { lower: number; upper: number } | null {
  if (times.length < 5) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map((t) => Math.abs(t - median));
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] || 1;
  return { lower: median - k * mad, upper: median + k * mad };
}

/**
 * Lightweight edge function that receives pre-parsed, filtered lap data
 * from client-side MDB parsing. No MDB file handling — just creates
 * a session and inserts laps.
 *
 * Expects: { event_id, race_meta: { name, date, track, has_sectors, filename }, laps: [...] }
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

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event_id, race_meta, laps } = await req.json();

    if (!event_id || !laps || !Array.isArray(laps) || laps.length === 0) {
      return new Response(JSON.stringify({ error: "Missing event_id or laps" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = race_meta || { name: "Imported Race", date: "", track: "" };
    console.log(`Inserting ${laps.length} laps for "${meta.name}"`);

    // Create session
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        event_id,
        name: meta.name || "Imported Race",
        display_name: meta.name,
        track: meta.track || "Unknown",
        date: meta.date ? String(meta.date).split("T")[0] : new Date().toISOString().split("T")[0],
        data_mode: "pclap",
        has_sector_data: meta.has_sectors || false,
        total_laps: laps.length,
        status: "processing",
        created_by: userId,
        filename: meta.filename || `${meta.name || "race"}.mdb`,
      })
      .select("id")
      .single();

    if (sessionErr || !sessionData) {
      console.error("Session create error:", sessionErr);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = sessionData.id;

    // Prepare rows with session_id
    const rows = laps.map((lap: Record<string, unknown>, i: number) => ({
      session_id: sessionId,
      lap_number: (lap.lap_number as number) ?? i + 1,
      lap_time_s: (lap.lap_time_s as number) ?? 0,
      s1_s: null,
      s2_s: null,
      s3_s: null,
      stint: (lap.stint as number) ?? 0,
      driver: (lap.driver as string) || null,
      pit_type: (lap.pit_type as string) || null,
      pit_time_s: (lap.pit_time_s as number) || null,
      timestamp: (lap.timestamp as string) || null,
      lane: lap.lane != null ? Number(lap.lane) : null,
      driving_station: null,
      team_number: (lap.team_number as string) || null,
      stint_elapsed_s: null,
      session_elapsed_s: lap.session_elapsed_s != null ? Number(lap.session_elapsed_s) : null,
      lap_status: "valid" as string,
      validation_flags: [] as string[],
      sort_key: lap.session_elapsed_s != null ? Number(lap.session_elapsed_s) : i,
    }));

    // Sort chronologically
    rows.sort((a, b) => a.sort_key - b.sort_key);

    // Validate
    const positiveTimes = rows.filter((l) => l.lap_time_s > 0).map((l) => l.lap_time_s);
    const bounds = computeBounds(positiveTimes);
    let prevElapsed: number | null = null;

    for (const row of rows) {
      const flags: string[] = [];
      if (row.lap_time_s <= 0) flags.push("non_positive_time");
      if (bounds && row.lap_time_s > 0 && (row.lap_time_s < bounds.lower || row.lap_time_s > bounds.upper))
        flags.push("statistical_outlier");
      if (prevElapsed !== null && row.session_elapsed_s !== null && row.session_elapsed_s < prevElapsed)
        flags.push("negative_time_delta");
      row.validation_flags = flags;
      row.lap_status = flags.includes("non_positive_time") ? "invalid" : flags.length > 0 ? "suspect" : "valid";
      if (row.session_elapsed_s !== null) prevElapsed = row.session_elapsed_s;
    }

    // Insert in batches
    const BATCH_SIZE = 500;
    let failed = false;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error } = await supabaseAdmin.from("laps").insert(rows.slice(i, i + BATCH_SIZE));
      if (error) {
        console.error("Lap insert error:", error);
        await supabaseAdmin.from("sessions").update({ status: "error" }).eq("id", sessionId);
        failed = true;
        break;
      }
    }

    if (!failed) {
      await supabaseAdmin.from("sessions").update({ status: "ready" }).eq("id", sessionId);
    }

    return new Response(
      JSON.stringify({
        success: !failed,
        session_id: sessionId,
        laps_count: rows.length,
        name: meta.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("insert-mdb-laps error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
