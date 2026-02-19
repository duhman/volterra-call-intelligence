export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  call_intelligence: {
    Tables: {
      blocked_numbers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          phone_number: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_number: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_number?: string
          reason?: string | null
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          hubspot_contact_id: string | null
          hubspot_deal_id: string | null
          id: string
          initiated_at: string
          session_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          id?: string
          initiated_at?: string
          session_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          id?: string
          initiated_at?: string
          session_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          agent_email: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          error_message: string | null
          from_number: string
          hubspot_call_id: string | null
          hubspot_contact_id: string | null
          hubspot_synced_at: string | null
          id: string
          is_hubspot_contact: boolean | null
          skip_reason: string | null
          status: Database["call_intelligence"]["Enums"]["call_status"]
          telavox_recording_id: string | null
          to_number: string
          updated_at: string
          webhook_timestamp: string
        }
        Insert: {
          agent_email?: string | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          error_message?: string | null
          from_number: string
          hubspot_call_id?: string | null
          hubspot_contact_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          is_hubspot_contact?: boolean | null
          skip_reason?: string | null
          status?: Database["call_intelligence"]["Enums"]["call_status"]
          telavox_recording_id?: string | null
          to_number: string
          updated_at?: string
          webhook_timestamp: string
        }
        Update: {
          agent_email?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          error_message?: string | null
          from_number?: string
          hubspot_call_id?: string | null
          hubspot_contact_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          is_hubspot_contact?: boolean | null
          skip_reason?: string | null
          status?: Database["call_intelligence"]["Enums"]["call_status"]
          telavox_recording_id?: string | null
          to_number?: string
          updated_at?: string
          webhook_timestamp?: string
        }
        Relationships: []
      }
      conversation_hubspot_associations: {
        Row: {
          association_type: string | null
          conversation_id: string
          created_at: string
          hubspot_object_id: string
          hubspot_object_type: string
          id: string
        }
        Insert: {
          association_type?: string | null
          conversation_id: string
          created_at?: string
          hubspot_object_id: string
          hubspot_object_type: string
          id?: string
        }
        Update: {
          association_type?: string | null
          conversation_id?: string
          created_at?: string
          hubspot_object_id?: string
          hubspot_object_type?: string
          id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      telavox_api_keys: {
        Row: {
          agent_email: string
          api_key: string
          created_at: string
          display_name: string | null
          hubspot_user_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          agent_email: string
          api_key: string
          created_at?: string
          display_name?: string | null
          hubspot_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          agent_email?: string
          api_key?: string
          created_at?: string
          display_name?: string | null
          hubspot_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      telavox_call_sessions: {
        Row: {
          agent_user_id: string | null
          answered_at: string | null
          created_at: string
          direction: string | null
          elevenlabs_job_id: string | null
          ended_at: string | null
          from_number: string | null
          hubspot_contact_id: string | null
          hubspot_deal_id: string | null
          hubspot_engagement_id: string | null
          hubspot_portal_id: string | null
          id: string
          insights_json: Json | null
          last_error: string | null
          recording_status: string
          recording_url: string | null
          sentiment: string | null
          started_at: string | null
          summary: string | null
          telavox_call_id: string
          telavox_org_id: string
          to_number: string | null
          transcript: string | null
          transcription_status: string
          updated_at: string
        }
        Insert: {
          agent_user_id?: string | null
          answered_at?: string | null
          created_at?: string
          direction?: string | null
          elevenlabs_job_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          hubspot_engagement_id?: string | null
          hubspot_portal_id?: string | null
          id?: string
          insights_json?: Json | null
          last_error?: string | null
          recording_status?: string
          recording_url?: string | null
          sentiment?: string | null
          started_at?: string | null
          summary?: string | null
          telavox_call_id: string
          telavox_org_id: string
          to_number?: string | null
          transcript?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string | null
          answered_at?: string | null
          created_at?: string
          direction?: string | null
          elevenlabs_job_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          hubspot_engagement_id?: string | null
          hubspot_portal_id?: string | null
          id?: string
          insights_json?: Json | null
          last_error?: string | null
          recording_status?: string
          recording_url?: string | null
          sentiment?: string | null
          started_at?: string | null
          summary?: string | null
          telavox_call_id?: string
          telavox_org_id?: string
          to_number?: string | null
          transcript?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      telavox_job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_data: Json | null
          job_type: string
          max_attempts: number
          scheduled_at: string
          started_at: string | null
          status: string
          telavox_call_id: string
          telavox_org_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_data?: Json | null
          job_type: string
          max_attempts?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          telavox_call_id: string
          telavox_org_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_data?: Json | null
          job_type?: string
          max_attempts?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          telavox_call_id?: string
          telavox_org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      telavox_org_configs: {
        Row: {
          access_token: string | null
          api_client_id: string | null
          api_client_secret: string | null
          created_at: string
          hubspot_portal_id: string
          id: string
          refresh_token: string | null
          telavox_org_id: string
          token_expires_at: string | null
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          access_token?: string | null
          api_client_id?: string | null
          api_client_secret?: string | null
          created_at?: string
          hubspot_portal_id: string
          id?: string
          refresh_token?: string | null
          telavox_org_id: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret: string
        }
        Update: {
          access_token?: string | null
          api_client_id?: string | null
          api_client_secret?: string | null
          created_at?: string
          hubspot_portal_id?: string
          id?: string
          refresh_token?: string | null
          telavox_org_id?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          call_id: string
          created_at: string
          elevenlabs_request_id: string | null
          full_text: string
          id: string
          speaker_labels: Json | null
          summary: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          elevenlabs_request_id?: string | null
          full_text: string
          id?: string
          speaker_labels?: Json | null
          summary?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          elevenlabs_request_id?: string | null
          full_text?: string
          id?: string
          speaker_labels?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          source_ip: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          source_ip?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          source_ip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_call_sessions: { Args: never; Returns: undefined }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      cleanup_sync_history: { Args: never; Returns: undefined }
    }
    Enums: {
      call_status: "pending" | "processing" | "completed" | "failed" | "skipped"
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
  call_intelligence: {
    Enums: {
      call_status: ["pending", "processing", "completed", "failed", "skipped"],
    },
  },
} as const

