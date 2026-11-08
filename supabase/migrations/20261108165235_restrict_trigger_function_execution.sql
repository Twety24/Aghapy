-- Trigger-only functions must not be callable directly through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_last_admin() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.protect_role_changes() from public, anon, authenticated;
