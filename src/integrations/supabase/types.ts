export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          active: boolean
          channel: string
          created_at: string
          id: string
          release_notes_short: string | null
          released_at: string
          version: string
        }
        Insert: {
          active?: boolean
          channel?: string
          created_at?: string
          id?: string
          release_notes_short?: string | null
          released_at?: string
          version: string
        }
        Update: {
          active?: boolean
          channel?: string
          created_at?: string
          id?: string
          release_notes_short?: string | null
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          club_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          event_id: string | null
          file_path: string
          filename: string | null
          id: string
          race_catalog: Json | null
          rows_processed: number | null
          session_id: string | null
          source_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          event_id?: string | null
          file_path: string
          filename?: string | null
          id?: string
          race_catalog?: Json | null
          rows_processed?: number | null
          session_id?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_id?: string | null
          file_path?: string
          filename?: string | null
          id?: string
          race_catalog?: Json | null
          rows_processed?: number | null
          session_id?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          admin_comment: string | null
          created_at: string
          current_page: string | null
          description: string
          id: string
          release_id: string | null
          screenshot_url: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          current_page?: string | null
          description: string
          id?: string
          release_id?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          current_page?: string | null
          description?: string
          id?: string
          release_id?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "app_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      laps: {
        Row: {
          driver: string | null
          driving_station: number | null
          id: string
          lane: number | null
          lap_number: number
          lap_status: string
          lap_time_s: number
          pit_time_s: number | null
          pit_type: string | null
          s1_s: number | null
          s2_s: number | null
          s3_s: number | null
          session_elapsed_s: number | null
          session_id: string
          sort_key: number
          stint: number
          stint_elapsed_s: number | null
          team_number: string | null
          timestamp: string | null
          validation_flags: string[] | null
        }
        Insert: {
          driver?: string | null
          driving_station?: number | null
          id?: string
          lane?: number | null
          lap_number: number
          lap_status?: string
          lap_time_s?: number
          pit_time_s?: number | null
          pit_type?: string | null
          s1_s?: number | null
          s2_s?: number | null
          s3_s?: number | null
          session_elapsed_s?: number | null
          session_id: string
          sort_key?: number
          stint?: number
          stint_elapsed_s?: number | null
          team_number?: string | null
          timestamp?: string | null
          validation_flags?: string[] | null
        }
        Update: {
          driver?: string | null
          driving_station?: number | null
          id?: string
          lane?: number | null
          lap_number?: number
          lap_status?: string
          lap_time_s?: number
          pit_time_s?: number | null
          pit_type?: string | null
          s1_s?: number | null
          s2_s?: number | null
          s3_s?: number | null
          session_elapsed_s?: number | null
          session_id?: string
          sort_key?: number
          stint?: number
          stint_elapsed_s?: number | null
          team_number?: string | null
          timestamp?: string | null
          validation_flags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "laps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beta_opt_in: boolean
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          beta_opt_in?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          beta_opt_in?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          brand: string | null
          car_model: string | null
          created_at: string
          created_by: string
          data_mode: string
          date: string | null
          display_name: string | null
          event_id: string
          event_type: string | null
          filename: string | null
          has_sector_data: boolean
          id: string
          name: string
          notes: string | null
          status: string
          tags: string[] | null
          total_laps: number
          track: string | null
        }
        Insert: {
          brand?: string | null
          car_model?: string | null
          created_at?: string
          created_by: string
          data_mode?: string
          date?: string | null
          display_name?: string | null
          event_id: string
          event_type?: string | null
          filename?: string | null
          has_sector_data?: boolean
          id?: string
          name: string
          notes?: string | null
          status?: string
          tags?: string[] | null
          total_laps?: number
          track?: string | null
        }
        Update: {
          brand?: string | null
          car_model?: string | null
          created_at?: string
          created_by?: string
          data_mode?: string
          date?: string | null
          display_name?: string | null
          event_id?: string
          event_type?: string | null
          filename?: string | null
          has_sector_data?: boolean
          id?: string
          name?: string
          notes?: string | null
          status?: string
          tags?: string[] | null
          total_laps?: number
          track?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      setups: {
        Row: {
          car_brand: string | null
          car_model: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          event_id: string
          id: string
          label: string | null
          notes: string | null
          parameters: Json | null
          session_id: string | null
          tags: string[] | null
        }
        Insert: {
          car_brand?: string | null
          car_model?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          event_id: string
          id?: string
          label?: string | null
          notes?: string | null
          parameters?: Json | null
          session_id?: string | null
          tags?: string[] | null
        }
        Update: {
          car_brand?: string | null
          car_model?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          event_id?: string
          id?: string
          label?: string | null
          notes?: string | null
          parameters?: Json | null
          session_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "setups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          club_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_member: { Args: { _club_id: string }; Returns: boolean }
      is_club_owner: { Args: { _club_id: string }; Returns: boolean }
      is_event_member: { Args: { _event_id: string }; Returns: boolean }
      is_event_owner: { Args: { _event_id: string }; Returns: boolean }
      is_lap_accessible: { Args: { _session_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      platform_role: "platform_admin" | "club_admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      platform_role: ["platform_admin", "club_admin", "user"],
    },
  },
} as const
