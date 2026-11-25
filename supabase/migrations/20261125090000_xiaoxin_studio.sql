create table public.xx_studio_items(id uuid primary key default gen_random_uuid(),owner_name text not null,kind text not null,title text not null,body text not null,answer jsonb,created_at timestamptz default now());
create table public.xx_studio_work(id uuid primary key default gen_random_uuid(),task uuid references public.xx_studio_items(id),student_name text not null,document text not null,result jsonb not null,created_at timestamptz default now());
alter table public.xx_studio_items enable row level security;
alter table public.xx_studio_work enable row level security;
revoke all on public.xx_studio_items,public.xx_studio_work from public,anon,authenticated;
grant select,insert on public.xx_studio_items,public.xx_studio_work to service_role;
create function public.xx_studio_teacher(p_token text,p_op text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u text; v jsonb;
begin
select s.username into u from public.aistudy_admin_sessions s join public.aistudy_admins a using(username) where s.token=p_token and s.expires_at>now() and a.demo is false;
if u is null then raise exception '请先登录小信教师账号'; end if;
if p_op='list' then select coalesce(jsonb_agg(to_jsonb(i)-'owner_name'-'answer' order by created_at desc),'[]') into v from public.xx_studio_items i where owner_name=u;
elsif p_op='save' then
if p_data->>'kind' not in ('教案','题目','知识','作业') or length(trim(p_data->>'title')) not between 1 and 120 or length(p_data::text)>500000 then raise exception '内容超出限制';end if;
insert into public.xx_studio_items(owner_name,kind,title,body,answer) values(u,p_data->>'kind',p_data->>'title',p_data->>'body',p_data->'answer') returning to_jsonb(id) into v;
elsif p_op='results' then select coalesce(jsonb_agg(to_jsonb(w)-'document' order by w.created_at desc),'[]') into v from public.xx_studio_work w join public.xx_studio_items i on i.id=w.task where i.owner_name=u and i.id=(p_data->>'id')::uuid;
elsif p_op='download' then select to_jsonb(w.document) into v from public.xx_studio_work w join public.xx_studio_items i on i.id=w.task where i.owner_name=u and w.id=(p_data->>'id')::uuid;
else raise exception '未知操作'; end if;return v;end $$;
revoke all on function public.xx_studio_teacher(text,text,jsonb) from public;
grant execute on function public.xx_studio_teacher(text,text,jsonb) to anon,authenticated;
