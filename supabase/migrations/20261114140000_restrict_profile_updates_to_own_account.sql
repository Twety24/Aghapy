drop policy if exists "profiles update" on public.profiles;
create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
