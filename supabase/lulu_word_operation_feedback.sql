alter table public.word_lab_sessions add column if not exists word_feedback_open boolean not null default true;
alter table public.word_lab_submissions add column if not exists correction_html text, add column if not exists correction_score integer;
