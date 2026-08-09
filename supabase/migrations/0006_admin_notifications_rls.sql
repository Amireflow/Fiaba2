-- ============================================================================
-- 0006_admin_notifications_rls.sql
-- Allow admin to read all notifications (for admin console)
-- ============================================================================

-- Admin can select all notifications
create policy "notifications_select_admin" on public.notifications
  for select using (public.is_admin());

-- Admin can insert notifications (for system alerts)
create policy "notifications_insert_admin" on public.notifications
  for insert with check (public.is_admin());

-- Admin can delete any notification
create policy "notifications_delete_admin" on public.notifications
  for delete using (public.is_admin());

-- Admin can update any notification
create policy "notifications_update_admin" on public.notifications
  for update using (public.is_admin());
