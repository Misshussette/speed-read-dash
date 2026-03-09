import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for the caller (to check permissions)
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for user creation
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller roles
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const callerIsPlatformAdmin = callerRoles?.some((r) => r.role === "platform_admin") ?? false;
    const callerIsClubAdmin = callerRoles?.some((r) => r.role === "club_admin") ?? false;

    if (!callerIsPlatformAdmin && !callerIsClubAdmin) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { email, password, display_name, role, club_id, skip_email_confirmation } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetRole = role || "user";

    // ── Permission checks ──

    // club_admin cannot create platform_admin
    if (callerIsClubAdmin && !callerIsPlatformAdmin) {
      if (targetRole === "platform_admin") {
        return new Response(
          JSON.stringify({ error: "Club admins cannot create platform admins" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // club_admin can only assign users to their own clubs
      if (club_id) {
        const { data: callerMembership } = await adminClient
          .from("club_members")
          .select("role")
          .eq("club_id", club_id)
          .eq("user_id", caller.id)
          .single();

        if (!callerMembership || callerMembership.role !== "organizer") {
          return new Response(
            JSON.stringify({ error: "You can only create users in your own club" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Enforce max 2 club_admin per club
      if (targetRole === "club_admin" && club_id) {
        const { count } = await adminClient
          .from("club_members")
          .select("id", { count: "exact", head: true })
          .eq("club_id", club_id)
          .eq("role", "organizer");

        // We consider organizer = club admin at club level
        // Also check user_roles for club_admin count in this club
        const { data: clubMembers } = await adminClient
          .from("club_members")
          .select("user_id")
          .eq("club_id", club_id);

        if (clubMembers) {
          const memberIds = clubMembers.map((m) => m.user_id);
          const { data: adminRoles } = await adminClient
            .from("user_roles")
            .select("user_id")
            .eq("role", "club_admin")
            .in("user_id", memberIds);

          if (adminRoles && adminRoles.length >= 2) {
            return new Response(
              JSON.stringify({ error: "Maximum 2 club admins per club reached" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // ── Create auth user ──
    const createUserOptions: Record<string, unknown> = {
      email,
      email_confirm: !!skip_email_confirmation,
      user_metadata: { display_name: display_name || email },
    };

    if (password) {
      createUserOptions.password = password;
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser(
      createUserOptions as any
    );

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // The handle_new_user trigger creates profile + user role + onboarding automatically.
    // But we may need to update the role if it's not 'user'.
    if (targetRole !== "user") {
      // Update the auto-created role
      await adminClient
        .from("user_roles")
        .update({ role: targetRole })
        .eq("user_id", userId);
    }

    // Update display_name if provided (trigger uses email as fallback)
    if (display_name) {
      await adminClient
        .from("profiles")
        .update({ display_name })
        .eq("user_id", userId);
    }

    // ── Assign to club if specified ──
    if (club_id) {
      const clubRole = targetRole === "club_admin" ? "organizer" : "member";
      await adminClient.from("club_members").insert({
        club_id,
        user_id: userId,
        role: clubRole,
        invited_by: caller.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: newUser.user.email,
        role: targetRole,
        club_id: club_id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
