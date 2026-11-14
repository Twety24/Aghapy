drop trigger if exists sync_profile_age_from_birth_date on public.profiles;
create trigger sync_profile_age_from_birth_date
before insert or update of birth_date, age on public.profiles
for each row execute function public.sync_profile_age_from_birth_date();
