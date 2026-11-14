create or replace function public.sync_profile_age_from_birth_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > current_date then
    raise exception 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
  end if;

  if new.birth_date is null then
    new.age := null;
  else
    new.age := extract(year from age(current_date, new.birth_date))::integer;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_age_from_birth_date on public.profiles;
create trigger sync_profile_age_from_birth_date
before insert or update of birth_date on public.profiles
for each row execute function public.sync_profile_age_from_birth_date();

update public.profiles
set age = case
  when birth_date is not null and birth_date <= current_date
    then extract(year from age(current_date, birth_date))::integer
  else null
end
where age is distinct from case
  when birth_date is not null and birth_date <= current_date
    then extract(year from age(current_date, birth_date))::integer
  else null
end;
