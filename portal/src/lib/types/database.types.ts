export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
        }
        Relationships: []
      }
      admin_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          engagement_id: string | null
          filename: string
          id: string
          org_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          engagement_id?: string | null
          filename: string
          id?: string
          org_id: string
          size_bytes?: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string | null
          filename?: string
          id?: string
          org_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          lead_id: string | null
          org_id: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["engagement_status"]
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          lead_id?: string | null
          org_id: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          id: string
          org_id: string
          redeemed_by: string | null
          token: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          org_id: string
          redeemed_by?: string | null
          token: string
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          redeemed_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          number: string
          org_id: string
          paid_at: string | null
          pdf_path: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_session_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          number: string
          org_id: string
          paid_at?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          number?: string
          org_id?: string
          paid_at?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          engagement_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          engagement_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          engagement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          due_date: string | null
          engagement_id: string
          id: string
          sort: number
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
        }
        Insert: {
          due_date?: string | null
          engagement_id: string
          id?: string
          sort?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
        }
        Update: {
          due_date?: string | null
          engagement_id?: string
          id?: string
          sort?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          org_id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          org_id: string
          profile_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          org_id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          verified_domains: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          verified_domains?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          verified_domains?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          org_id: string | null
          role: Database["public"]["Enums"]["profile_role"]
          status: Database["public"]["Enums"]["profile_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_profile: {
        Args: { p_id: string; p_org?: string }
        Returns: undefined
      }
      auth_is_active: { Args: never; Returns: boolean }
      auth_is_staff: { Args: never; Returns: boolean }
      auth_org_id: { Args: never; Returns: string }
      create_invite: {
        Args: { p_days?: number; p_email?: string; p_org: string }
        Returns: string
      }
      engagement_messages: {
        Args: { p_engagement: string }
        Returns: {
          author_id: string
          author_name: string
          author_role: Database["public"]["Enums"]["profile_role"]
          body: string
          created_at: string
          id: string
        }[]
      }
      log_admin_action: {
        Args: { p_action: string; p_detail?: Json; p_target?: string }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: { Args: { p_id: string }; Returns: undefined }
      post_message: {
        Args: { p_body: string; p_engagement: string }
        Returns: string
      }
      redeem_invite: { Args: { p_token: string }; Returns: undefined }
      reject_profile: { Args: { p_id: string }; Returns: undefined }
      unread_notification_count: { Args: never; Returns: number }
    }
    Enums: {
      engagement_status: "active" | "on_hold" | "closed"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      milestone_status: "todo" | "in_progress" | "done"
      profile_role: "client" | "staff" | "admin"
      profile_status: "pending" | "active" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      engagement_status: ["active", "on_hold", "closed"],
      invoice_status: ["draft", "sent", "paid", "overdue"],
      milestone_status: ["todo", "in_progress", "done"],
      profile_role: ["client", "staff", "admin"],
      profile_status: ["pending", "active", "rejected"],
    },
  },
} as const

