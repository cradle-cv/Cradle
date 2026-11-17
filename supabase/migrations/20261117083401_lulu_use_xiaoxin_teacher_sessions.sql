create schema if not exists lulu_private;
revoke all on schema lulu_private from public;
grant usage on schema lulu_private to anon, authenticated;

create table lulu_private.xiaoxin_bank_items (
  id uuid primary key default gen_random_uuid(),
  owner text not null references public.aistudy_admins(username) on delete cascade on update cascade,
  kind text not null check (kind in ('quiz','discussion')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) between 3 and 32768),
  fingerprint text generated always as (md5(content::text)) stored,
  created_at timestamptz not null default now(),
  unique(owner,kind,fingerprint)
);
alter table lulu_private.xiaoxin_bank_items enable row level security;
revoke all on lulu_private.xiaoxin_bank_items from public, anon, authenticated;

create function lulu_private.bank_request(p_token text, p_op text, p_kind text, p_id uuid, p_content jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner text; v_result jsonb;
begin
  select s.username into v_owner
  from public.aistudy_admin_sessions s join public.aistudy_admins a on a.username=s.username
  where s.token=p_token and s.expires_at>now() and a.demo is false;
  if v_owner is null then raise exception 'Lulu teacher authorization required' using errcode='42501'; end if;

  case p_op
    when 'verify' then return 'true'::jsonb;
    when 'list' then
      return (select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'kind',b.kind,'content',b.content) order by b.created_at,b.id),'[]'::jsonb)
        from lulu_private.xiaoxin_bank_items b where b.owner=v_owner);
    when 'save' then
      if p_id is null then
        insert into lulu_private.xiaoxin_bank_items as b(owner,kind,content)
        values(v_owner,p_kind,p_content)
        returning jsonb_build_object('id',b.id,'kind',b.kind,'content',b.content) into v_result;
      else
        update lulu_private.xiaoxin_bank_items b set content=p_content
        where b.owner=v_owner and b.kind=p_kind and b.id=p_id
        returning jsonb_build_object('id',b.id,'kind',b.kind,'content',b.content) into v_result;
      end if;
    when 'remove' then
      delete from lulu_private.xiaoxin_bank_items where owner=v_owner and id=p_id
      returning to_jsonb(id) into v_result;
    when 'import' then
      if jsonb_typeof(p_content) is distinct from 'array' or jsonb_array_length(p_content)>100 then raise exception 'Invalid bank batch'; end if;
      with added as (
        insert into lulu_private.xiaoxin_bank_items(owner,kind,content)
        select v_owner,p_kind,item from jsonb_array_elements(p_content) as item
        on conflict(owner,kind,fingerprint) do nothing returning id,kind,content
      )
      select coalesce(jsonb_agg(to_jsonb(added)),'[]'::jsonb) into v_result from added;
    else raise exception 'Invalid bank operation';
  end case;
  if v_result is null then raise exception 'Bank item not found' using errcode='P0002'; end if;
  return v_result;
end $$;
revoke all on function lulu_private.bank_request(text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function lulu_private.bank_request(text,text,text,uuid,jsonb) to anon, authenticated;
create function public.lulu_xiaoxin_bank(p_token text,p_op text,p_kind text default null,p_id uuid default null,p_content jsonb default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select lulu_private.bank_request(p_token,p_op,p_kind,p_id,p_content)
$$;
revoke all on function public.lulu_xiaoxin_bank(text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.lulu_xiaoxin_bank(text,text,text,uuid,jsonb) to anon, authenticated;
