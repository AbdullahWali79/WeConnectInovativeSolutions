create or replace function public.bulk_approve_client_hunt_leads(target_lead_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can approve client hunt leads';
  end if;

  update public.client_hunt_leads
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = any(target_lead_ids)
    and status = 'pending';

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.bulk_approve_client_hunt_leads(uuid[]) to authenticated;
