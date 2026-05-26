export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          client_name: string | null;
          client_email: string | null;
          billing_address: string | null;
          hourly_rate: number;
          currency: string;
          last_logged_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          client_name?: string | null;
          client_email?: string | null;
          billing_address?: string | null;
          hourly_rate?: number;
          currency?: string;
          last_logged_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          client_name?: string | null;
          client_email?: string | null;
          billing_address?: string | null;
          hourly_rate?: number;
          currency?: string;
          last_logged_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          description: string;
          billing_status: "unbilled" | "billed";
          invoice_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          description?: string;
          billing_status?: "unbilled" | "billed";
          invoice_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          started_at?: string;
          ended_at?: string;
          duration_seconds?: number;
          description?: string;
          billing_status?: "unbilled" | "billed";
          invoice_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          invoice_number: number;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          invoice_number: number;
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          invoice_number?: number;
          total_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          session_id: string;
          hours: number;
          rate: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          session_id: string;
          hours: number;
          rate: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          session_id?: string;
          hours?: number;
          rate?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      finalize_invoice: {
        Args: { p_project_id: string; p_session_ids: string[] };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
