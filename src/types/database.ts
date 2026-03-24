export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      day_templates: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          is_default: boolean;
          name: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          is_default?: boolean;
          name: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "day_templates_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      day_template_blocks: {
        Row: {
          block_type: "school" | "home" | "transport" | "club" | "daycare" | "free_time" | "other";
          child_time_block_id: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          created_at: string;
          day_template_id: string;
          end_time: string;
          id: string;
          label: string | null;
          sort_order: number;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          block_type: "school" | "home" | "transport" | "club" | "daycare" | "free_time" | "other";
          child_time_block_id?: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          created_at?: string;
          day_template_id: string;
          end_time: string;
          id?: string;
          label?: string | null;
          sort_order?: number;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          block_type?: "school" | "home" | "transport" | "club" | "daycare" | "free_time" | "other";
          child_time_block_id?: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          created_at?: string;
          day_template_id?: string;
          end_time?: string;
          id?: string;
          label?: string | null;
          sort_order?: number;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "day_template_blocks_day_template_id_fkey";
            columns: ["day_template_id"];
            isOneToOne: false;
            referencedRelation: "day_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      families: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          family_id: string;
          id: string;
          pin_hash: string | null;
          role: Database["public"]["Enums"]["profile_role"];
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          family_id: string;
          id: string;
          pin_hash?: string | null;
          role: Database["public"]["Enums"]["profile_role"];
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          family_id?: string;
          id?: string;
          pin_hash?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
        };
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_cards: {
        Row: {
          content: Json;
          content_json: Json;
          created_at: string;
          created_by_profile_id: string | null;
          family_id: string;
          goal: string | null;
          id: string;
          level: string | null;
          status: "draft" | "published";
          subject: string;
          tags: string[];
          title: string;
          type: "concept" | "procedure" | "vocab" | "comprehension";
          updated_at: string;
        };
        Insert: {
          content?: Json;
          content_json?: Json;
          created_at?: string;
          created_by_profile_id?: string | null;
          family_id: string;
          goal?: string | null;
          id?: string;
          level?: string | null;
          status?: "draft" | "published";
          subject: string;
          tags?: string[];
          title: string;
          type?: "concept" | "procedure" | "vocab" | "comprehension";
          updated_at?: string;
        };
        Update: {
          content?: Json;
          content_json?: Json;
          created_at?: string;
          created_by_profile_id?: string | null;
          family_id?: string;
          goal?: string | null;
          id?: string;
          level?: string | null;
          status?: "draft" | "published";
          subject?: string;
          tags?: string[];
          title?: string;
          type?: "concept" | "procedure" | "vocab" | "comprehension";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_cards_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_cards_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_books: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          error_message: string | null;
          family_id: string;
          file_name: string;
          file_path: string;
          id: string;
          indexed_text: string | null;
          level: string;
          school_year: string | null;
          status: "uploaded" | "indexing" | "indexed" | "error";
          subject: "french" | "maths" | "german";
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          error_message?: string | null;
          family_id: string;
          file_name: string;
          file_path: string;
          id?: string;
          indexed_text?: string | null;
          level: string;
          school_year?: string | null;
          status?: "uploaded" | "indexing" | "indexed" | "error";
          subject: "french" | "maths" | "german";
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          error_message?: string | null;
          family_id?: string;
          file_name?: string;
          file_path?: string;
          id?: string;
          indexed_text?: string | null;
          level?: string;
          school_year?: string | null;
          status?: "uploaded" | "indexing" | "indexed" | "error";
          subject?: "french" | "maths" | "german";
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_books_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_books_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_card_links: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          family_id: string;
          id: string;
          revision_card_id: string;
          template_task_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          family_id: string;
          id?: string;
          revision_card_id: string;
          template_task_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          family_id?: string;
          id?: string;
          revision_card_id?: string;
          template_task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_card_links_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_card_links_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_card_links_revision_card_id_fkey";
            columns: ["revision_card_id"];
            isOneToOne: false;
            referencedRelation: "revision_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_card_links_template_task_id_fkey";
            columns: ["template_task_id"];
            isOneToOne: false;
            referencedRelation: "template_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_progress: {
        Row: {
          child_profile_id: string;
          completed_count: number;
          confidence_score: number | null;
          created_at: string;
          family_id: string;
          id: string;
          last_seen_at: string | null;
          revision_card_id: string;
          status: "not_started" | "in_progress" | "completed";
          success_streak: number;
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          completed_count?: number;
          confidence_score?: number | null;
          created_at?: string;
          family_id: string;
          id?: string;
          last_seen_at?: string | null;
          revision_card_id: string;
          status?: "not_started" | "in_progress" | "completed";
          success_streak?: number;
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          completed_count?: number;
          confidence_score?: number | null;
          created_at?: string;
          family_id?: string;
          id?: string;
          last_seen_at?: string | null;
          revision_card_id?: string;
          status?: "not_started" | "in_progress" | "completed";
          success_streak?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_progress_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_progress_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_progress_revision_card_id_fkey";
            columns: ["revision_card_id"];
            isOneToOne: false;
            referencedRelation: "revision_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      user_revision_state: {
        Row: {
          attempts: number;
          card_id: string;
          created_at: string;
          family_id: string;
          last_quiz_score: number | null;
          last_reviewed_at: string | null;
          stars: number;
          status: "unseen" | "in_progress" | "mastered";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          card_id: string;
          created_at?: string;
          family_id: string;
          last_quiz_score?: number | null;
          last_reviewed_at?: string | null;
          stars?: number;
          status: "unseen" | "in_progress" | "mastered";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          card_id?: string;
          created_at?: string;
          family_id?: string;
          last_quiz_score?: number | null;
          last_reviewed_at?: string | null;
          stars?: number;
          status?: "unseen" | "in_progress" | "mastered";
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_revision_state_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "revision_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_revision_state_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_revision_state_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_categories: {
        Row: {
          code: "homework" | "revision" | "training" | "activity" | "routine" | "leisure";
          color_key: string;
          created_at: string;
          default_item_kind: "activity" | "mission" | "leisure" | null;
          family_id: string;
          icon: string;
          id: string;
          name: string;
        };
        Insert: {
          code: "homework" | "revision" | "training" | "activity" | "routine" | "leisure";
          color_key: string;
          created_at?: string;
          default_item_kind?: "activity" | "mission" | "leisure" | null;
          family_id: string;
          icon: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: "homework" | "revision" | "training" | "activity" | "routine" | "leisure";
          color_key?: string;
          created_at?: string;
          default_item_kind?: "activity" | "mission" | "leisure" | null;
          family_id?: string;
          icon?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_categories_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      task_instances: {
        Row: {
          assigned_profile_id: string | null;
          child_profile_id: string;
          created_at: string;
          date: string;
          end_time: string;
          family_id: string;
          id: string;
          item_kind: "activity" | "mission" | "leisure";
          item_subkind: string | null;
          points_base: number;
          points_earned: number;
          start_time: string;
          status: "a_faire" | "en_cours" | "termine" | "en_retard" | "ignore";
          template_task_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_profile_id?: string | null;
          child_profile_id: string;
          created_at?: string;
          date: string;
          end_time: string;
          family_id: string;
          id?: string;
          item_kind?: "activity" | "mission" | "leisure";
          item_subkind?: string | null;
          points_base?: number;
          points_earned?: number;
          start_time: string;
          status: "a_faire" | "en_cours" | "termine" | "en_retard" | "ignore";
          template_task_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_profile_id?: string | null;
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          end_time?: string;
          family_id?: string;
          id?: string;
          item_kind?: "activity" | "mission" | "leisure";
          item_subkind?: string | null;
          points_base?: number;
          points_earned?: number;
          start_time?: string;
          status?: "a_faire" | "en_cours" | "termine" | "en_retard" | "ignore";
          template_task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_instances_assigned_profile_id_fkey";
            columns: ["assigned_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_template_task_id_fkey";
            columns: ["template_task_id"];
            isOneToOne: false;
            referencedRelation: "template_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_points: {
        Row: {
          child_profile_id: string;
          created_at: string;
          date: string;
          family_id: string;
          id: string;
          points_total: number;
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          date: string;
          family_id: string;
          id?: string;
          points_total?: number;
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          family_id?: string;
          id?: string;
          points_total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_points_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_points_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      alarm_rules: {
        Row: {
          child_profile_id: string;
          created_at: string;
          days_mask: number;
          enabled: boolean;
          family_id: string;
          id: string;
          label: string;
          message: string;
          mode: "ponctuelle" | "semaine_travail" | "semaine_complete" | "personnalise";
          one_shot_at: string | null;
          sound_key: string;
          time_of_day: string | null;
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          days_mask?: number;
          enabled?: boolean;
          family_id: string;
          id?: string;
          label: string;
          message: string;
          mode: "ponctuelle" | "semaine_travail" | "semaine_complete" | "personnalise";
          one_shot_at?: string | null;
          sound_key?: string;
          time_of_day?: string | null;
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          days_mask?: number;
          enabled?: boolean;
          family_id?: string;
          id?: string;
          label?: string;
          message?: string;
          mode?: "ponctuelle" | "semaine_travail" | "semaine_complete" | "personnalise";
          one_shot_at?: string | null;
          sound_key?: string;
          time_of_day?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alarm_rules_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarm_rules_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      alarm_events: {
        Row: {
          acknowledged_at: string | null;
          alarm_rule_id: string;
          child_profile_id: string;
          created_at: string;
          due_at: string;
          family_id: string;
          id: string;
          status: "declenchee" | "acknowledged";
          triggered_at: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          alarm_rule_id: string;
          child_profile_id: string;
          created_at?: string;
          due_at: string;
          family_id: string;
          id?: string;
          status?: "declenchee" | "acknowledged";
          triggered_at?: string;
        };
        Update: {
          acknowledged_at?: string | null;
          alarm_rule_id?: string;
          child_profile_id?: string;
          created_at?: string;
          due_at?: string;
          family_id?: string;
          id?: string;
          status?: "declenchee" | "acknowledged";
          triggered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alarm_events_alarm_rule_id_fkey";
            columns: ["alarm_rule_id"];
            isOneToOne: false;
            referencedRelation: "alarm_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarm_events_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarm_events_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      achievement_categories: {
        Row: {
          code: string;
          color_key: string;
          created_at: string;
          family_id: string;
          id: string;
          label: string;
        };
        Insert: {
          code: string;
          color_key: string;
          created_at?: string;
          family_id: string;
          id?: string;
          label: string;
        };
        Update: {
          code?: string;
          color_key?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievement_categories_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      achievements: {
        Row: {
          auto_trigger: boolean;
          category_id: string;
          code: string;
          condition: Json;
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          label: string;
        };
        Insert: {
          auto_trigger?: boolean;
          category_id: string;
          code: string;
          condition: Json;
          created_at?: string;
          description?: string | null;
          icon: string;
          id?: string;
          label: string;
        };
        Update: {
          auto_trigger?: boolean;
          category_id?: string;
          code?: string;
          condition?: Json;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "achievement_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      achievement_instances: {
        Row: {
          achievement_id: string;
          child_profile_id: string;
          id: string;
          unlocked_at: string;
        };
        Insert: {
          achievement_id: string;
          child_profile_id: string;
          id?: string;
          unlocked_at?: string;
        };
        Update: {
          achievement_id?: string;
          child_profile_id?: string;
          id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievement_instances_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achievement_instances_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_subjects: {
        Row: {
          code: string;
          created_at: string;
          family_id: string;
          id: string;
          label: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          family_id: string;
          id?: string;
          label: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_subjects_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_categories: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          subject_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          subject_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_categories_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_cards: {
        Row: {
          category_id: string;
          content: Json;
          created_at: string;
          difficulty: string | null;
          id: string;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          content: Json;
          created_at?: string;
          difficulty?: string | null;
          id?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          content?: Json;
          created_at?: string;
          difficulty?: string | null;
          id?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_cards_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_favorites: {
        Row: {
          card_id: string;
          child_profile_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          card_id: string;
          child_profile_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          card_id?: string;
          child_profile_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_favorites_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_favorites_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      school_diary_entries: {
        Row: {
          child_profile_id: string;
          created_at: string;
          date: string;
          description: string | null;
          family_id: string;
          id: string;
          recurrence_group_id: string | null;
          recurrence_pattern: "none" | "weekly" | "biweekly" | "monthly";
          recurrence_until_date: string | null;
          subject: string | null;
          title: string;
          type: "devoir" | "evaluation" | "sortie" | "piscine" | "info";
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          date: string;
          description?: string | null;
          family_id: string;
          id?: string;
          recurrence_group_id?: string | null;
          recurrence_pattern?: "none" | "weekly" | "biweekly" | "monthly";
          recurrence_until_date?: string | null;
          subject?: string | null;
          title: string;
          type: "devoir" | "evaluation" | "sortie" | "piscine" | "info";
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          recurrence_group_id?: string | null;
          recurrence_pattern?: "none" | "weekly" | "biweekly" | "monthly";
          recurrence_until_date?: string | null;
          subject?: string | null;
          title?: string;
          type?: "devoir" | "evaluation" | "sortie" | "piscine" | "info";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_diary_entries_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_diary_entries_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      school_periods: {
        Row: {
          created_at: string;
          end_date: string;
          family_id: string;
          id: string;
          label: string;
          period_type: "vacances" | "jour_special";
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          family_id: string;
          id?: string;
          label: string;
          period_type: "vacances" | "jour_special";
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          family_id?: string;
          id?: string;
          label?: string;
          period_type?: "vacances" | "jour_special";
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_periods_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_templates: {
        Row: {
          created_at: string;
          description: string | null;
          family_id: string;
          id: string;
          is_default: boolean;
          label: string;
          recurrence_days: number[] | null;
          recurrence_end_date: string | null;
          recurrence_rule: "none" | "daily" | "weekdays" | "school_days" | "weekly_days";
          recurrence_start_date: string | null;
          type: "piscine" | "sortie" | "evaluation" | "quotidien" | "routine" | "autre";
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          family_id: string;
          id?: string;
          is_default?: boolean;
          label: string;
          recurrence_days?: number[] | null;
          recurrence_end_date?: string | null;
          recurrence_rule?: "none" | "daily" | "weekdays" | "school_days" | "weekly_days";
          recurrence_start_date?: string | null;
          type: "piscine" | "sortie" | "evaluation" | "quotidien" | "routine" | "autre";
        };
        Update: {
          created_at?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          recurrence_days?: number[] | null;
          recurrence_end_date?: string | null;
          recurrence_rule?: "none" | "daily" | "weekdays" | "school_days" | "weekly_days";
          recurrence_start_date?: string | null;
          type?: "piscine" | "sortie" | "evaluation" | "quotidien" | "routine" | "autre";
        };
        Relationships: [
          {
            foreignKeyName: "checklist_templates_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          template_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          template_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_instances: {
        Row: {
          child_profile_id: string;
          created_at: string;
          date: string;
          diary_entry_id: string | null;
          family_id: string;
          id: string;
          label: string;
          source_template_id: string | null;
          type: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          date: string;
          diary_entry_id?: string | null;
          family_id: string;
          id?: string;
          label: string;
          source_template_id?: string | null;
          type: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          diary_entry_id?: string | null;
          family_id?: string;
          id?: string;
          label?: string;
          source_template_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_instances_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_instances_diary_entry_id_fkey";
            columns: ["diary_entry_id"];
            isOneToOne: false;
            referencedRelation: "school_diary_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_instances_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_instances_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_instance_items: {
        Row: {
          checklist_instance_id: string;
          created_at: string;
          id: string;
          is_checked: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          checklist_instance_id: string;
          created_at?: string;
          id?: string;
          is_checked?: boolean;
          label: string;
          sort_order?: number;
        };
        Update: {
          checklist_instance_id?: string;
          created_at?: string;
          id?: string;
          is_checked?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_instance_items_checklist_instance_id_fkey";
            columns: ["checklist_instance_id"];
            isOneToOne: false;
            referencedRelation: "checklist_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_sessions: {
        Row: {
          chosen_option_id: string | null;
          created_at: string;
          date: string;
          family_id: string;
          id: string;
          picker_profile_id: string | null;
          proposer_profile_id: string | null;
          status: "planifiee" | "choisie" | "terminee";
          time: string | null;
        };
        Insert: {
          chosen_option_id?: string | null;
          created_at?: string;
          date: string;
          family_id: string;
          id?: string;
          picker_profile_id?: string | null;
          proposer_profile_id?: string | null;
          status?: "planifiee" | "choisie" | "terminee";
          time?: string | null;
        };
        Update: {
          chosen_option_id?: string | null;
          created_at?: string;
          date?: string;
          family_id?: string;
          id?: string;
          picker_profile_id?: string | null;
          proposer_profile_id?: string | null;
          status?: "planifiee" | "choisie" | "terminee";
          time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movie_sessions_chosen_option_id_fkey";
            columns: ["chosen_option_id"];
            isOneToOne: false;
            referencedRelation: "movie_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_sessions_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_sessions_picker_profile_id_fkey";
            columns: ["picker_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_sessions_proposer_profile_id_fkey";
            columns: ["proposer_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_options: {
        Row: {
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          platform: string | null;
          session_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          platform?: string | null;
          session_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          platform?: string | null;
          session_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_options_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "movie_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_votes: {
        Row: {
          created_at: string;
          id: string;
          movie_option_id: string;
          profile_id: string;
          session_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          movie_option_id: string;
          profile_id: string;
          session_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          movie_option_id?: string;
          profile_id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_votes_movie_option_id_fkey";
            columns: ["movie_option_id"];
            isOneToOne: false;
            referencedRelation: "movie_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_votes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_votes_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "movie_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          created_at: string;
          default_unit: string | null;
          emoji: string;
          family_id: string;
          id: string;
          label: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_unit?: string | null;
          emoji?: string;
          family_id: string;
          id?: string;
          label: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_unit?: string | null;
          emoji?: string;
          family_id?: string;
          id?: string;
          label?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingredients_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          created_at: string;
          description: string | null;
          family_id: string;
          id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          family_id: string;
          id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_ingredients: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string;
          quantity: number | null;
          recipe_id: string;
          sort_order: number;
          unit: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id: string;
          quantity?: number | null;
          recipe_id: string;
          sort_order?: number;
          unit?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient_id?: string;
          quantity?: number | null;
          recipe_id?: string;
          sort_order?: number;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_ingredients: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string;
          meal_id: string;
          note: string | null;
          quantity: number | null;
          sort_order: number;
          unit: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id: string;
          meal_id: string;
          note?: string | null;
          quantity?: number | null;
          sort_order?: number;
          unit?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient_id?: string;
          meal_id?: string;
          note?: string | null;
          quantity?: number | null;
          sort_order?: number;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_ingredients_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      meals: {
        Row: {
          child_profile_id: string;
          created_at: string;
          date: string;
          description: string;
          family_id: string;
          id: string;
          meal_type: "petit_dejeuner" | "dejeuner" | "diner" | "collation";
          prepared_by_label: string | null;
          prepared_by_profile_id: string | null;
          recipe_id: string | null;
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          date: string;
          description: string;
          family_id: string;
          id?: string;
          meal_type: "petit_dejeuner" | "dejeuner" | "diner" | "collation";
          prepared_by_label?: string | null;
          prepared_by_profile_id?: string | null;
          recipe_id?: string | null;
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          description?: string;
          family_id?: string;
          id?: string;
          meal_type?: "petit_dejeuner" | "dejeuner" | "diner" | "collation";
          prepared_by_label?: string | null;
          prepared_by_profile_id?: string | null;
          recipe_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meals_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meals_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meals_prepared_by_profile_id_fkey";
            columns: ["prepared_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meals_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_ratings: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          meal_id: string;
          rating: number;
          updated_at: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          meal_id: string;
          rating: number;
          updated_at?: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          meal_id?: string;
          rating?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_ratings_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      emotion_logs: {
        Row: {
          child_profile_id: string;
          created_at: string;
          date: string;
          emotion: "tres_content" | "content" | "neutre" | "triste" | "tres_triste";
          family_id: string;
          id: string;
          moment: "matin" | "soir";
          note: string | null;
          updated_at: string;
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          date: string;
          emotion: "tres_content" | "content" | "neutre" | "triste" | "tres_triste";
          family_id: string;
          id?: string;
          moment: "matin" | "soir";
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          date?: string;
          emotion?: "tres_content" | "content" | "neutre" | "triste" | "tres_triste";
          family_id?: string;
          id?: string;
          moment?: "matin" | "soir";
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emotion_logs_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emotion_logs_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_rules: {
        Row: {
          channel: "in_app" | "push" | "both";
          child_profile_id: string;
          created_at: string;
          enabled: boolean;
          family_id: string;
          id: string;
          time_of_day: string;
          type: "rappel_devoir" | "rappel_checklist" | "rappel_journee";
          updated_at: string;
        };
        Insert: {
          channel: "in_app" | "push" | "both";
          child_profile_id: string;
          created_at?: string;
          enabled?: boolean;
          family_id: string;
          id?: string;
          time_of_day: string;
          type: "rappel_devoir" | "rappel_checklist" | "rappel_journee";
          updated_at?: string;
        };
        Update: {
          channel?: "in_app" | "push" | "both";
          child_profile_id?: string;
          created_at?: string;
          enabled?: boolean;
          family_id?: string;
          id?: string;
          time_of_day?: string;
          type?: "rappel_devoir" | "rappel_checklist" | "rappel_journee";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_rules_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_rules_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          child_profile_id: string;
          created_at: string;
          endpoint: string;
          family_id: string;
          id: string;
          p256dh: string;
          profile_id: string;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          child_profile_id: string;
          created_at?: string;
          endpoint: string;
          family_id: string;
          id?: string;
          p256dh: string;
          profile_id: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          child_profile_id?: string;
          created_at?: string;
          endpoint?: string;
          family_id?: string;
          id?: string;
          p256dh?: string;
          profile_id?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_subscriptions_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      in_app_notifications: {
        Row: {
          child_profile_id: string;
          created_at: string;
          family_id: string;
          id: string;
          is_read: boolean;
          link_url: string | null;
          message: string;
          title: string;
          type: "rappel_devoir" | "rappel_checklist" | "rappel_journee" | "systeme";
        };
        Insert: {
          child_profile_id: string;
          created_at?: string;
          family_id: string;
          id?: string;
          is_read?: boolean;
          link_url?: string | null;
          message: string;
          title: string;
          type: "rappel_devoir" | "rappel_checklist" | "rappel_journee" | "systeme";
        };
        Update: {
          child_profile_id?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          is_read?: boolean;
          link_url?: string | null;
          message?: string;
          title?: string;
          type?: "rappel_devoir" | "rappel_checklist" | "rappel_journee" | "systeme";
        };
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "in_app_notifications_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_claims: {
        Row: {
          claim_date: string;
          claimed_at: string;
          child_profile_id: string;
          family_id: string;
          id: string;
          points_spent: number;
          reward_tier_id: string;
        };
        Insert: {
          claim_date?: string;
          claimed_at?: string;
          child_profile_id: string;
          family_id: string;
          id?: string;
          points_spent: number;
          reward_tier_id: string;
        };
        Update: {
          claim_date?: string;
          claimed_at?: string;
          child_profile_id?: string;
          family_id?: string;
          id?: string;
          points_spent?: number;
          reward_tier_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_claims_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reward_claims_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reward_claims_reward_tier_id_fkey";
            columns: ["reward_tier_id"];
            isOneToOne: false;
            referencedRelation: "reward_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_tiers: {
        Row: {
          created_at: string;
          description: string | null;
          family_id: string;
          id: string;
          label: string;
          points_required: number;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          family_id: string;
          id?: string;
          label: string;
          points_required: number;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          label?: string;
          points_required?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reward_tiers_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      template_tasks: {
        Row: {
          assigned_profile_id: string | null;
          category_id: string;
          created_at: string;
          description: string | null;
          end_time: string;
          id: string;
          item_kind: "activity" | "mission" | "leisure";
          item_subkind: string | null;
          instructions_html: string | null;
          knowledge_card_id: string | null;
          points_base: number;
          recommended_child_time_block_id: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          scheduled_date: string | null;
          sort_order: number;
          start_time: string;
          template_id: string;
          title: string;
        };
        Insert: {
          assigned_profile_id?: string | null;
          category_id: string;
          created_at?: string;
          description?: string | null;
          end_time: string;
          id?: string;
          item_kind?: "activity" | "mission" | "leisure";
          item_subkind?: string | null;
          instructions_html?: string | null;
          knowledge_card_id?: string | null;
          points_base?: number;
          recommended_child_time_block_id?: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          scheduled_date?: string | null;
          sort_order?: number;
          start_time: string;
          template_id: string;
          title: string;
        };
        Update: {
          assigned_profile_id?: string | null;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          end_time?: string;
          id?: string;
          item_kind?: "activity" | "mission" | "leisure";
          item_subkind?: string | null;
          instructions_html?: string | null;
          knowledge_card_id?: string | null;
          points_base?: number;
          recommended_child_time_block_id?: "morning" | "noon" | "afternoon" | "home" | "evening" | null;
          scheduled_date?: string | null;
          sort_order?: number;
          start_time?: string;
          template_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_tasks_assigned_profile_id_fkey";
            columns: ["assigned_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_tasks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "task_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_tasks_knowledge_card_id_fkey";
            columns: ["knowledge_card_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "day_templates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      profile_role: "parent" | "child" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
