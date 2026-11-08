-- These helpers are used by authenticated RLS checks and the member UI, not anonymous visitors.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke execute on function public.mark_message_read(uuid) from public, anon;
grant execute on function public.mark_message_read(uuid) to authenticated;
