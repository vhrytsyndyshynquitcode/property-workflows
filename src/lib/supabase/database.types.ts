// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або npm run db:types після npx supabase link на ваш проєкт.
// Ця версія написана вручну за міграціями 20261012000000_profiles_and_roles.sql і 20261020073540_workflow_runs.sql.

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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      template_sections: {
        Row: { id: string; template_id: string; name: string; position: number };
        Insert: { id?: string; template_id: string; name: string; position?: number };
        Update: { id?: string; template_id?: string; name?: string; position?: number };
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      template_tasks: {
        Row: {
          id: string;
          template_id: string;
          section_id: string;
          name: string;
          is_required: boolean;
          position: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          section_id: string;
          name: string;
          is_required?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          section_id?: string;
          name?: string;
          is_required?: boolean;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "template_tasks_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "template_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          id: string;
          template_id: string | null;
          template_name: string;
          case_name: string;
          run_manager_id: string;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          template_name: string;
          case_name: string;
          run_manager_id: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string | null;
          template_name?: string;
          case_name?: string;
          run_manager_id?: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runs_run_manager_id_fkey";
            columns: ["run_manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      run_tasks: {
        Row: {
          id: string;
          run_id: string;
          section_name: string;
          name: string;
          is_required: boolean;
          position: number;
          assignee_id: string;
          status: string;
          done_at: string | null;
          done_by: string | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          section_name: string;
          name: string;
          is_required: boolean;
          position: number;
          assignee_id: string;
          status?: string;
          done_at?: string | null;
          done_by?: string | null;
        };
        Update: {
          id?: string;
          run_id?: string;
          section_name?: string;
          name?: string;
          is_required?: boolean;
          position?: number;
          assignee_id?: string;
          status?: string;
          done_at?: string | null;
          done_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "run_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_tasks_done_by_fkey";
            columns: ["done_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_tasks_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      launch_run: {
        Args: { p_template_id: string; p_case_name: string; p_assignments?: Json };
        Returns: string;
      };
      list_assignable_users: {
        Args: Record<PropertyKey, never>;
        Returns: { id: string; email: string | null }[];
      };
      mark_task_done: {
        Args: { p_task_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
