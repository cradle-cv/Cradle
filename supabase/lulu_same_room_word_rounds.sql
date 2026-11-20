alter table public.word_lab_sessions add column layout_round integer not null default 0 check (layout_round >= 0);
alter table public.lulu_file_submissions add column submission_phase text;
