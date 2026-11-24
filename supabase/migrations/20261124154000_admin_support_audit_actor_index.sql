create index if not exists admin_support_audit_actor_idx
  on public.admin_support_audit(actor_id, created_at desc);
