-- Require a real member address without fabricating values for existing profiles.
-- Existing rows with a missing address remain temporarily grandfathered.
-- New inserts and updates must contain a non-empty address of at least five characters.
alter table public.profiles
  add constraint profiles_address_required_check
  check (address is not null and char_length(btrim(address)) >= 5)
  not valid;
