-- Add phone number to member profiles and persist signup metadata.
alter table public.profiles add column if not exists phone text;
create index if not exists profiles_phone_idx on public.profiles (phone) where phone is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, phone, age, stage, department)
  values (
    new.id,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(m->>'phone'), ''),
    case when m->>'age' ~ '^[0-9]{1,2}$' then case when (m->>'age')::int between 5 and 99 then (m->>'age')::int end end,
    case when m->>'stage' in ('prep','secondary','university','working') then m->>'stage' end,
    case when m->>'department' in ('acting','lighting','music','decor','mime') then m->>'department' end
  );
  return new;
end $$;
