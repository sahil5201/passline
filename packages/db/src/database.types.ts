/**
 * Hand-written Supabase Database types matching packages/db/supabase/migrations.
 * Regenerate with the Supabase CLI once a project is linked:
 *   supabase gen types typescript --local > packages/db/src/database.types.ts
 * Keep this file in sync when migrations change until codegen is wired.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ResumeFileType = "pdf" | "doc" | "docx" | "md" | "txt" | "paste"
export type JobStatus = "saved" | "queued" | "analyzed"
export type HeardBackStatus =
  | "none"
  | "no_response"
  | "interview"
  | "offer"
  | "rejected"

export type Database = {
  public: {
    Tables: {
      resumes: {
        Row: {
          id: string
          user_id: string
          label: string
          original_file_url: string | null
          file_type: ResumeFileType
          extracted_text: string
          is_active: boolean
          version_number: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          original_file_url?: string | null
          file_type: ResumeFileType
          extracted_text?: string
          is_active?: boolean
          version_number: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          original_file_url?: string | null
          file_type?: ResumeFileType
          extracted_text?: string
          is_active?: boolean
          version_number?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          title: string
          company: string | null
          job_url: string | null
          date_added: string
          date_applied: string | null
          jd_text: string
          role: string | null
          industry: string | null
          status: JobStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          company?: string | null
          job_url?: string | null
          date_added?: string
          date_applied?: string | null
          jd_text: string
          role?: string | null
          industry?: string | null
          status?: JobStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          company?: string | null
          job_url?: string | null
          date_added?: string
          date_applied?: string | null
          jd_text?: string
          role?: string | null
          industry?: string | null
          status?: JobStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_results: {
        Row: {
          id: string
          job_id: string
          resume_id: string
          user_id: string
          score: number
          matched_keywords: Json
          missing_keywords: Json
          section_feedback: Json
          formatting_issues: Json
          suggested_changes: Json
          rubric_version: string
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          resume_id: string
          user_id: string
          score: number
          matched_keywords?: Json
          missing_keywords?: Json
          section_feedback?: Json
          formatting_issues?: Json
          suggested_changes?: Json
          rubric_version: string
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          resume_id?: string
          user_id?: string
          score?: number
          matched_keywords?: Json
          missing_keywords?: Json
          section_feedback?: Json
          formatting_issues?: Json
          suggested_changes?: Json
          rubric_version?: string
          model_used?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_results_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_tracking: {
        Row: {
          job_id: string
          user_id: string
          applied_with_ats_changes: boolean | null
          heard_back: HeardBackStatus
          updated_at: string
        }
        Insert: {
          job_id: string
          user_id: string
          applied_with_ats_changes?: boolean | null
          heard_back?: HeardBackStatus
          updated_at?: string
        }
        Update: {
          job_id?: string
          user_id?: string
          applied_with_ats_changes?: boolean | null
          heard_back?: HeardBackStatus
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          id: string
          user_id: string
          name: string
          token_hash: string
          prefix: string
          last_used_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          token_hash: string
          prefix: string
          last_used_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          token_hash?: string
          prefix?: string
          last_used_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
