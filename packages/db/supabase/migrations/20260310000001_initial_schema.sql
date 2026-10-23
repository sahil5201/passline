-- Passline initial schema
-- Tables: resumes, jobs, ats_results, application_tracking, api_tokens
-- All user-owned rows reference auth.users(id) ON DELETE CASCADE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------------

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  original_file_url text,
  file_type text not null
    check (file_type in ('pdf', 'doc', 'docx', 'md', 'txt', 'paste')),
  extracted_text text not null default '',
  is_active boolean not null default false,
  version_number integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_version_number_positive check (version_number > 0),
  constraint resumes_label_not_blank check (char_length(trim(label)) > 0)
);

create index resumes_user_id_idx on public.resumes (user_id);
create index resumes_user_id_updated_at_idx on public.resumes (user_id, updated_at desc);

-- Exactly one active resume per user
create unique index resumes_one_active_per_user
  on public.resumes (user_id)
  where is_active = true;

-- Unique version numbers per user (monotonic labels for history)
create unique index resumes_user_version_unique
  on public.resumes (user_id, version_number);

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

alter table public.resumes enable row level security;

create policy "resumes_select_own"
  on public.resumes for select
  using (auth.uid() = user_id);

create policy "resumes_insert_own"
  on public.resumes for insert
  with check (auth.uid() = user_id);

create policy "resumes_update_own"
  on public.resumes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resumes_delete_own"
  on public.resumes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  company text,
  job_url text,
  date_added date not null default (timezone('utc', now()))::date,
  date_applied date,
  jd_text text not null,
  role text,
  industry text,
  status text not null default 'saved'
    check (status in ('saved', 'queued', 'analyzed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_title_not_blank check (char_length(trim(title)) > 0),
  constraint jobs_jd_text_not_blank check (char_length(trim(jd_text)) > 0)
);

create index jobs_user_id_idx on public.jobs (user_id);
create index jobs_user_id_status_idx on public.jobs (user_id, status);
create index jobs_user_id_date_added_idx on public.jobs (user_id, date_added desc);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

create policy "jobs_select_own"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "jobs_insert_own"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ats_results
-- ---------------------------------------------------------------------------

create table public.ats_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  resume_id uuid not null references public.resumes (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  score numeric(5, 2) not null
    check (score >= 0 and score <= 100),
  matched_keywords jsonb not null default '[]'::jsonb,
  missing_keywords jsonb not null default '[]'::jsonb,
  section_feedback jsonb not null default '{}'::jsonb,
  formatting_issues jsonb not null default '[]'::jsonb,
  suggested_changes jsonb not null default '[]'::jsonb,
  rubric_version text not null,
  model_used text,
  created_at timestamptz not null default now()
);

create index ats_results_job_id_idx on public.ats_results (job_id, created_at desc);
create index ats_results_resume_id_idx on public.ats_results (resume_id);
create index ats_results_user_id_idx on public.ats_results (user_id, created_at desc);

alter table public.ats_results enable row level security;

create policy "ats_results_select_own"
  on public.ats_results for select
  using (auth.uid() = user_id);

create policy "ats_results_insert_own"
  on public.ats_results for insert
  with check (auth.uid() = user_id);

create policy "ats_results_update_own"
  on public.ats_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ats_results_delete_own"
  on public.ats_results for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- application_tracking
-- ---------------------------------------------------------------------------

create table public.application_tracking (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  applied_with_ats_changes boolean,
  heard_back text not null default 'none'
    check (heard_back in ('none', 'no_response', 'interview', 'offer', 'rejected')),
  updated_at timestamptz not null default now()
);

create index application_tracking_user_id_idx on public.application_tracking (user_id);

create trigger application_tracking_set_updated_at
  before update on public.application_tracking
  for each row execute function public.set_updated_at();

alter table public.application_tracking enable row level security;

create policy "application_tracking_select_own"
  on public.application_tracking for select
  using (auth.uid() = user_id);

create policy "application_tracking_insert_own"
  on public.application_tracking for insert
  with check (auth.uid() = user_id);

create policy "application_tracking_update_own"
  on public.application_tracking for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "application_tracking_delete_own"
  on public.application_tracking for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- api_tokens (MCP personal access tokens; store hash only)
-- ---------------------------------------------------------------------------

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  token_hash text not null,
  prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint api_tokens_name_not_blank check (char_length(trim(name)) > 0),
  constraint api_tokens_prefix_not_blank check (char_length(trim(prefix)) > 0),
  constraint api_tokens_hash_not_blank check (char_length(token_hash) > 0)
);

create unique index api_tokens_token_hash_unique on public.api_tokens (token_hash);
create index api_tokens_user_id_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

create policy "api_tokens_select_own"
  on public.api_tokens for select
  using (auth.uid() = user_id);

create policy "api_tokens_insert_own"
  on public.api_tokens for insert
  with check (auth.uid() = user_id);

create policy "api_tokens_update_own"
  on public.api_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "api_tokens_delete_own"
  on public.api_tokens for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Future billing-ready usage placeholder (no billing yet)
-- Soft-reserved so a later plan/usage table can join without schema churn.
-- ---------------------------------------------------------------------------

comment on table public.api_tokens is
  'Personal API tokens for MCP auth. Raw token never stored; only SHA-256 hash.';

comment on table public.resumes is
  'Resume versions. Exactly one is_active=true per user (partial unique index).';

comment on table public.jobs is
  'Saved job descriptions. status: saved | queued | analyzed.';

comment on table public.ats_results is
  'ATS analysis results produced by the user AI via MCP save_ats_result.';
