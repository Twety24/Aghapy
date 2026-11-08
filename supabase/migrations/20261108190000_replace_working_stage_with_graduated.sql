alter table public.profiles drop constraint if exists profiles_stage_check;
update public.profiles set stage = 'graduated' where stage = 'working';
alter table public.profiles add constraint profiles_stage_check check (stage is null or stage in ('prep','secondary','university','graduated'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, phone, age, birth_date, stage, department)
  values (
    new.id,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(m->>'phone'), ''),
    case when m->>'age' ~ '^\d{1,2}$' then case when (m->>'age')::int between 5 and 99 then (m->>'age')::int end end,
    case when m->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end,
    case when m->>'stage' in ('prep','secondary','university','graduated') then m->>'stage' end,
    case when m->>'department' in ('acting','scenography','media','music_prep','other') then m->>'department' end
  );
  return new;
end $$;