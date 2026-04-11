export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string;
          role: "member" | "admin" | "test" | "pending" | "withdrawn";
          profile_image_url: string | null;
          security_question: string | null;
          security_answer: string | null;
          joined_at: string;
          last_login_at: string | null;
          menu_order: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          role?: "member" | "admin" | "test" | "pending" | "withdrawn";
          profile_image_url?: string | null;
          security_question?: string | null;
          security_answer?: string | null;
          joined_at?: string;
          last_login_at?: string | null;
          menu_order?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          role?: "member" | "admin" | "test" | "pending" | "withdrawn";
          profile_image_url?: string | null;
          security_question?: string | null;
          security_answer?: string | null;
          joined_at?: string;
          last_login_at?: string | null;
          menu_order?: Json;
          created_at?: string;
        };
      };
      weeks: {
        Row: {
          id: string;
          title: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          aggregated_at: string | null;
          aggregated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          aggregated_at?: string | null;
          aggregated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          aggregated_at?: string | null;
          aggregated_by?: string | null;
          created_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          week_id: string;
          day_of_week: number;
          status: "O" | "△" | "X" | "☆" | null;
          image_url: string | null;
          is_public: boolean;
          post_content: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reject_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_id: string;
          day_of_week: number;
          status?: "O" | "△" | "X" | "☆" | null;
          image_url?: string | null;
          is_public?: boolean;
          post_content?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_id?: string;
          day_of_week?: number;
          status?: "O" | "△" | "X" | "☆" | null;
          image_url?: string | null;
          is_public?: boolean;
          post_content?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          created_at?: string;
        };
      };
      fines: {
        Row: {
          id: string;
          user_id: string;
          week_id: string;
          workout_count: number;
          fine_amount: number;
          is_paid: boolean;
          paid_at: string | null;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_id: string;
          workout_count?: number;
          fine_amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_id?: string;
          workout_count?: number;
          fine_amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          description: string;
          income: number;
          expense: number;
          balance: number;
          transacted_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          description: string;
          income?: number;
          expense?: number;
          balance?: number;
          transacted_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          description?: string;
          income?: number;
          expense?: number;
          balance?: number;
          transacted_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
      };
      exemptions: {
        Row: {
          id: string;
          user_id: string;
          dates: string;
          reason: string;
          status: "pending" | "approved" | "rejected";
          notified: boolean;
          processed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dates: string;
          reason: string;
          status?: "pending" | "approved" | "rejected";
          notified?: boolean;
          processed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dates?: string;
          reason?: string;
          status?: "pending" | "approved" | "rejected";
          notified?: boolean;
          processed_by?: string | null;
          created_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          check_in_id: string;
          emoji_type: "fire" | "muscle" | "chili";
          reactor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          check_in_id: string;
          emoji_type: "fire" | "muscle" | "chili";
          reactor_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          check_in_id?: string;
          emoji_type?: "fire" | "muscle" | "chili";
          reactor_id?: string;
          created_at?: string;
        };
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          start_date: string;
          end_date: string;
          target_count: number;
          reward: string | null;
          description: string | null;
          banner_image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          start_date: string;
          end_date: string;
          target_count: number;
          reward?: string | null;
          description?: string | null;
          banner_image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          start_date?: string;
          end_date?: string;
          target_count?: number;
          reward?: string | null;
          description?: string | null;
          banner_image_url?: string | null;
          created_at?: string;
        };
      };
      notices: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      ai_logs: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          answer: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          answer: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question?: string;
          answer?: string;
          created_at?: string;
        };
      };
      semi_annual_reports: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          mon_count: number;
          tue_count: number;
          wed_count: number;
          thu_count: number;
          fri_count: number;
          sat_count: number;
          sun_count: number;
          current_streak: number;
          max_streak: number;
          current_miss_streak: number;
          max_miss_streak: number;
          total_exemptions: number;
          reactions_received: number;
          reactions_sent: number;
          gallery_shares: number;
          total_fines_paid: number;
          posts_written: number;
          ai_coach_uses: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period: string;
          mon_count?: number;
          tue_count?: number;
          wed_count?: number;
          thu_count?: number;
          fri_count?: number;
          sat_count?: number;
          sun_count?: number;
          current_streak?: number;
          max_streak?: number;
          current_miss_streak?: number;
          max_miss_streak?: number;
          total_exemptions?: number;
          reactions_received?: number;
          reactions_sent?: number;
          gallery_shares?: number;
          total_fines_paid?: number;
          posts_written?: number;
          ai_coach_uses?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period?: string;
          mon_count?: number;
          tue_count?: number;
          wed_count?: number;
          thu_count?: number;
          fri_count?: number;
          sat_count?: number;
          sun_count?: number;
          current_streak?: number;
          max_streak?: number;
          current_miss_streak?: number;
          max_miss_streak?: number;
          total_exemptions?: number;
          reactions_received?: number;
          reactions_sent?: number;
          gallery_shares?: number;
          total_fines_paid?: number;
          posts_written?: number;
          ai_coach_uses?: number;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Week = Database["public"]["Tables"]["weeks"]["Row"];
export type CheckIn = Database["public"]["Tables"]["check_ins"]["Row"];
export type Fine = Database["public"]["Tables"]["fines"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Exemption = Database["public"]["Tables"]["exemptions"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
export type Notice = Database["public"]["Tables"]["notices"]["Row"];
export type AiLog = Database["public"]["Tables"]["ai_logs"]["Row"];
export type SemiAnnualReport = Database["public"]["Tables"]["semi_annual_reports"]["Row"];
