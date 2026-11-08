-- Run once in Supabase > SQL Editor (after 001, 002)

-- ============ profile fields ============
alter table public.profiles
  add column avatar_url text,
  add column age int check (age between 5 and 99),
  add column stage text check (stage in ('prep','secondary','university','working')),
  add column department text check (department in ('acting','lighting','music','decor','mime')),
  add column is_root boolean not null default false;   -- the main admin: only he can add/remove admins

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, age, stage, department)
  values (new.id,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when m->>'age' ~ '^\d{1,2}$' then case when (m->>'age')::int between 5 and 99 then (m->>'age')::int end end,
    case when m->>'stage' in ('prep','secondary','university','working') then m->>'stage' end,
    case when m->>'department' in ('acting','lighting','music','decor','mime') then m->>'department' end);
  return new;
end $$;

create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.id := old.id; new.email := old.email; new.is_root := old.is_root;
    if not public.is_admin() then new.role := old.role; new.is_active := old.is_active; end if;
  end if;
  return new;
end $$;

-- only the root admin may promote/demote admins (or suspend an admin)
create or replace function public.protect_role_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.is_admin()
     and (new.role is distinct from old.role or (old.role = 'admin' and new.is_active is distinct from old.is_active))
     and not exists (select 1 from public.profiles where id = auth.uid() and is_root) then
    raise exception 'بس الأدمن الأساسي يقدر يضيف أو يشيل أدمن';
  end if;
  return new;
end $$;
create trigger protect_role_changes before update on public.profiles
  for each row execute function public.protect_role_changes();

-- =========== excuses =========
create table public.excuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meeting_date date not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now(),
  unique (user_id, meeting_date)
);
alter table public.excuses enable row level security;
create policy "excuses read" on public.excuses for select using (user_id = auth.uid() or public.is_admin());
create policy "excuses insert" on public.excuses for insert to authenticated with check (user_id = auth.uid());
create policy "excuses update" on public.excuses for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ photo albums (one album per show / event) ===========
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 80),
  created_at timestamptz not null default now()
);
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  path text not null,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now()
);alter table public.albums enable row level security;
alter table public.photos enable row level security;
create policy "albums read" on public.albums for select to authenticated using (true);
create policy "albums admin" on public.albums for all using (public.is_admin()) with check (public.is_admin());
create policy "photos read" on public.photos for select using (status = 'approved' or uploaded_by = auth.uid() or public.is_admin());
create policy "photos insert" on public.photos for insert to authenticated
  with check (uploaded_by = auth.uid() and (status = 'pending' or public.is_admin()));
create policy "photos update" on public.photos for update using (public.is_admin()) with check (public.is_admin());
create policy "photos delete" on public.photos for delete using (public.is_admin() or (uploaded_by = auth.uid() and status = 'pending'));

-- feed with the uploader's name (hidden when the photo was sent anonymously); members can't read other profiles directly
create or replace function public.get_photos(p_album uuid)
returns table (id uuid, path text, status text, created_at timestamptz, uploader_name text, mine boolean)
language sql security definer stable set search_path = public as $$
  select p.id, p.path, p.status, p.created_at,
         case when p.is_anonymous or p.uploaded_by is null then null else pr.full_name end,
         coalesce(p.uploaded_by = auth.uid(), false)
  from public.photos p left join public.profiles pr on pr.id = p.uploaded_by
  where p.album_id = p_album and (p.status = 'approved' or p.uploaded_by = auth.uid() or public.is_admin())
  order by p.created_at desc
$$;
revoke all on function public.get_photos(uuid) from public, anon;
grant execute on function public.get_photos(uuid) to authenticated;

-- ============ groups + group chat ============
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index group_messages_group_idx on public.group_messages (group_id, created_at);

create or replace function public.is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid())
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
create policy "groups read" on public.groups for select using (public.is_admin() or public.is_group_member(id));
create policy "groups admin" on public.groups for all using (public.is_admin()) with check (public.is_admin());
create policy "gm read" on public.group_members for select using (user_id = auth.uid() or public.is_admin());
create policy "gm admin" on public.group_members for all using (public.is_admin()) with check (public.is_admin());
create policy "gmsg read" on public.group_messages for select using (public.is_admin() or public.is_group_member(group_id));
create policy "gmsg insert" on public.group_messages for insert to authenticated
  with check (sender_id = auth.uid() and (public.is_admin() or public.is_group_member(group_id)));
create policy "gmsg admin delete" on public.group_messages for delete using (public.is_admin());

create or replace function public.group_chat(p_group uuid)
returns table (id uuid, body text, created_at timestamptz, sender_name text, mine boolean)
language sql security definer stable set search_path = public as $$
  select * from (
    select m.id, m.body, m.created_at, pr.full_name, coalesce(m.sender_id = auth.uid(), false) as mine
    from public.group_messages m left join public.profiles pr on pr.id = m.sender_id
    where m.group_id = p_group and (public.is_admin() or public.is_group_member(p_group))
    order by m.created_at desc limit 200
  ) x order by x.created_at asc
$$;
revoke all on function public.group_chat(uuid) from public, anon;
grant execute on function public.group_chat(uuid) to authenticated;

-- ============ meeting page content (single row, edited by admins) ============
create table public.meeting_content (
  id int primary key default 1 check (id = 1),
  hymns text not null default '',
  word_title text not null default '',
  word_summary text not null default '',
  image_path text,
  updated_at timestamptz not null default now()
);
insert into public.meeting_content (id) values (1);
alter table public.meeting_content enable row level security;
create policy "meeting read" on public.meeting_content for select to authenticated using (true);
create policy "meeting admin" on public.meeting_content for all using (public.is_admin()) with check (public.is_admin());

-- ============ storage: avatars, gallery, meeting image ============
insert into storage.buckets (id, name, public) values ('avatars','avatars',true), ('gallery','gallery',true), ('meeting','meeting',true)
  on conflict (id) do update set public = true;
create policy "team files read" on storage.objects for select using (bucket_id in ('avatars','gallery','meeting'));
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "gallery own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "gallery delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "meeting admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'meeting' and public.is_admin());
create policy "meeting admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'meeting' and public.is_admin());
