export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      wardrobe_items: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          subcategory: string | null
          brand: string | null
          color: string[]
          size: string | null
          image_url: string | null
          notes: string | null
          favorite: boolean
          worn_count: number
          last_worn_at: string | null
          style: string | null
          formality_level: number | null
          season: string | null
          material: string | null
          pattern: string | null
          ai_analysis: Json | null
          ai_confidence: number | null
          ai_analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          subcategory?: string | null
          brand?: string | null
          color?: string[]
          size?: string | null
          image_url?: string | null
          notes?: string | null
          favorite?: boolean
          worn_count?: number
          last_worn_at?: string | null
          style?: string | null
          formality_level?: number | null
          season?: string | null
          material?: string | null
          pattern?: string | null
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          category?: string
          subcategory?: string | null
          brand?: string | null
          color?: string[]
          size?: string | null
          image_url?: string | null
          notes?: string | null
          favorite?: boolean
          worn_count?: number
          last_worn_at?: string | null
          style?: string | null
          formality_level?: number | null
          season?: string | null
          material?: string | null
          pattern?: string | null
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_analyzed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          height_cm: number | null
          weight_kg: number | null
          age: number | null
          style_preferences: string[] | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          age?: number | null
          style_preferences?: string[] | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string | null
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          age?: number | null
          style_preferences?: string[] | null
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      outfits: {
        Row: {
          id: string
          user_id: string
          name: string
          occasion: string | null
          season: string | null
          notes: string | null
          image_url: string | null
          favorite: boolean
          worn_count: number
          last_worn_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          occasion?: string | null
          season?: string | null
          notes?: string | null
          image_url?: string | null
          favorite?: boolean
          worn_count?: number
          last_worn_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          occasion?: string | null
          season?: string | null
          notes?: string | null
          image_url?: string | null
          favorite?: boolean
          worn_count?: number
          last_worn_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outfit_items: {
        Row: {
          id: string
          outfit_id: string
          wardrobe_item_id: string
          slot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          outfit_id: string
          wardrobe_item_id: string
          slot?: string | null
          created_at?: string
        }
        Update: {
          slot?: string | null
        }
        Relationships: []
      }
      style_profiles: {
        Row: {
          id: string
          user_id: string
          // legacy columns (initial schema)
          preferred_styles: string[] | null
          preferred_colors: string[] | null
          avoided_colors: string[] | null
          favorite_brands: string[] | null
          occasions: string[] | null
          budget_level: string | null
          fit_preference: string | null
          notes: string | null
          // personal
          height_cm: number | null
          body_type: string | null
          skin_tone: string | null
          hair_color: string | null
          // work / lifestyle
          profession: string | null
          work_environment: string | null
          field_work_frequency: string | null
          office_work_frequency: string | null
          typical_day_types: string[] | null
          // style preferences
          preferred_style: string | null
          preferred_formality: number | null
          wants_premium_look: boolean | null
          wants_effortless_look: boolean | null
          wants_head_turning_look: boolean | null
          favorite_colors: string[] | null
          avoid_colors: string[] | null
          preferred_brands: string[] | null
          disliked_styles: string[] | null
          // fit preferences
          shirt_fit_preference: string | null
          pants_fit_preference: string | null
          shoe_style_preference: string | null
          tuck_preference: string | null
          cuffing_preference: string | null
          // context
          climate_sensitivity: string | null
          fragrance_preference: string | null
          accessory_preference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_styles?: string[] | null
          preferred_colors?: string[] | null
          avoided_colors?: string[] | null
          favorite_brands?: string[] | null
          occasions?: string[] | null
          budget_level?: string | null
          fit_preference?: string | null
          notes?: string | null
          height_cm?: number | null
          body_type?: string | null
          skin_tone?: string | null
          hair_color?: string | null
          profession?: string | null
          work_environment?: string | null
          field_work_frequency?: string | null
          office_work_frequency?: string | null
          typical_day_types?: string[] | null
          preferred_style?: string | null
          preferred_formality?: number | null
          wants_premium_look?: boolean | null
          wants_effortless_look?: boolean | null
          wants_head_turning_look?: boolean | null
          favorite_colors?: string[] | null
          avoid_colors?: string[] | null
          preferred_brands?: string[] | null
          disliked_styles?: string[] | null
          shirt_fit_preference?: string | null
          pants_fit_preference?: string | null
          shoe_style_preference?: string | null
          tuck_preference?: string | null
          cuffing_preference?: string | null
          climate_sensitivity?: string | null
          fragrance_preference?: string | null
          accessory_preference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          preferred_styles?: string[] | null
          preferred_colors?: string[] | null
          avoided_colors?: string[] | null
          favorite_brands?: string[] | null
          occasions?: string[] | null
          budget_level?: string | null
          fit_preference?: string | null
          notes?: string | null
          height_cm?: number | null
          body_type?: string | null
          skin_tone?: string | null
          hair_color?: string | null
          profession?: string | null
          work_environment?: string | null
          field_work_frequency?: string | null
          office_work_frequency?: string | null
          typical_day_types?: string[] | null
          preferred_style?: string | null
          preferred_formality?: number | null
          wants_premium_look?: boolean | null
          wants_effortless_look?: boolean | null
          wants_head_turning_look?: boolean | null
          favorite_colors?: string[] | null
          avoid_colors?: string[] | null
          preferred_brands?: string[] | null
          disliked_styles?: string[] | null
          shirt_fit_preference?: string | null
          pants_fit_preference?: string | null
          shoe_style_preference?: string | null
          tuck_preference?: string | null
          cuffing_preference?: string | null
          climate_sensitivity?: string | null
          fragrance_preference?: string | null
          accessory_preference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fit_checks: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          outfit_id: string | null
          occasion: string | null
          desired_style: string | null
          weather: Json | null
          result: Json | null
          overall_score: number | null
          final_verdict: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          outfit_id?: string | null
          occasion?: string | null
          desired_style?: string | null
          weather?: Json | null
          result?: Json | null
          overall_score?: number | null
          final_verdict?: string | null
          created_at?: string
        }
        Update: {
          photo_url?: string
          outfit_id?: string | null
          occasion?: string | null
          desired_style?: string | null
          weather?: Json | null
          result?: Json | null
          overall_score?: number | null
          final_verdict?: string | null
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          id: string
          user_id: string
          start_date: string
          mode: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          mode?: string
          created_at?: string
        }
        Update: {
          start_date?: string
          mode?: string
        }
        Relationships: []
      }
      style_memory: {
        Row: {
          id: string
          user_id: string
          favorite_styles: string[]
          favorite_colors: string[]
          favorite_brands: string[]
          favorite_fragrances: string[]
          favorite_watches: string[]
          favorite_accessories: string[]
          preferred_formality: number | null
          preferred_fits: Json
          learned_avoids: string[]
          learned_preferences: string[]
          confidence: number
          feedback_counts: Json
          saved_recommendations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          favorite_styles?: string[]
          favorite_colors?: string[]
          favorite_brands?: string[]
          favorite_fragrances?: string[]
          favorite_watches?: string[]
          favorite_accessories?: string[]
          preferred_formality?: number | null
          preferred_fits?: Json
          learned_avoids?: string[]
          learned_preferences?: string[]
          confidence?: number
          feedback_counts?: Json
          saved_recommendations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          favorite_styles?: string[]
          favorite_colors?: string[]
          favorite_brands?: string[]
          favorite_fragrances?: string[]
          favorite_watches?: string[]
          favorite_accessories?: string[]
          preferred_formality?: number | null
          preferred_fits?: Json
          learned_avoids?: string[]
          learned_preferences?: string[]
          confidence?: number
          feedback_counts?: Json
          saved_recommendations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      weekly_plan_days: {
        Row: {
          id: string
          plan_id: string
          user_id: string
          day: string
          day_index: number
          occasion: string | null
          location_type: string | null
          formality_level: number | null
          weather_snapshot: Json | null
          outfit_id: string | null
          notes: string | null
          worn_at: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          user_id: string
          day: string
          day_index?: number
          occasion?: string | null
          location_type?: string | null
          formality_level?: number | null
          weather_snapshot?: Json | null
          outfit_id?: string | null
          notes?: string | null
          worn_at?: string | null
          generated_at?: string
        }
        Update: {
          occasion?: string | null
          location_type?: string | null
          formality_level?: number | null
          weather_snapshot?: Json | null
          outfit_id?: string | null
          notes?: string | null
          worn_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
