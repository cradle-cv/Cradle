create table public.lulu_teacher_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.lulu_teacher_accounts enable row level security;
revoke all on public.lulu_teacher_accounts from public, anon, authenticated;
grant select on public.lulu_teacher_accounts to authenticated;
create policy lulu_teacher_read_self on public.lulu_teacher_accounts
  for select to authenticated using (user_id = (select auth.uid()));

insert into public.lulu_teacher_accounts (user_id)
select distinct u.auth_id::uuid from public.users u
join auth.users a on a.id = u.auth_id::uuid
where u.role = 'admin';

create table public.lulu_teacher_bank_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.lulu_teacher_accounts(user_id) on delete cascade,
  kind text not null check (kind in ('quiz','discussion')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) between 3 and 32768),
  fingerprint text generated always as (md5(content::text)) stored,
  created_at timestamptz not null default now(),
  unique(owner_id,kind,fingerprint)
);
alter table public.lulu_teacher_bank_items enable row level security;
revoke all on public.lulu_teacher_bank_items from public, anon, authenticated;
grant select, delete on public.lulu_teacher_bank_items to authenticated;
grant insert (kind,content) on public.lulu_teacher_bank_items to authenticated;
grant update (content) on public.lulu_teacher_bank_items to authenticated;
create policy lulu_teacher_own_bank on public.lulu_teacher_bank_items
  for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.lulu_teacher_accounts t where t.user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.lulu_teacher_accounts t where t.user_id = (select auth.uid())));
