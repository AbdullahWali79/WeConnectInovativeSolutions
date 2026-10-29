-- Fix: 42P17 "infinite recursion detected in policy for relation sm_campaign_members"
--
-- The two policies below referenced each other, so Postgres aborted every
-- student-scoped read of the campaign tables with a 500:
--
--   sm_campaigns."Members read joined campaigns"      -> reads sm_campaign_members
--   sm_campaign_members."Teachers read own campaign members" -> reads sm_campaigns
--
-- Result: a student could not read their own membership (or their campaign, or
-- its days) through RLS at all, which is what locked them out of the portal.
--
-- Fix: move both lookups into SECURITY DEFINER helpers. They run with the
-- definer's rights, so they do not re-enter RLS and the cycle is broken.

create or replace function public.sm_is_campaign_member(p_campaign_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sm_campaign_members m
    where m.campaign_id = p_campaign_id
      and m.student_id = p_user_id
      and m.status = 'active'
  );
$$;

create or replace function public.sm_is_campaign_teacher(p_campaign_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sm_campaigns c
    where c.id = p_campaign_id
      and c.teacher_id = p_user_id
  );
$$;

revoke all on function public.sm_is_campaign_member(uuid, uuid) from public;
revoke all on function public.sm_is_campaign_teacher(uuid, uuid) from public;
grant execute on function public.sm_is_campaign_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.sm_is_campaign_teacher(uuid, uuid) to authenticated, service_role;

-- sm_campaigns ---------------------------------------------------------------
drop policy if exists "Members read joined campaigns" on public.sm_campaigns;
create policy "Members read joined campaigns" on public.sm_campaigns
  for select using (public.sm_is_campaign_member(id, auth.uid()));

-- sm_campaign_members --------------------------------------------------------
drop policy if exists "Teachers read own campaign members" on public.sm_campaign_members;
create policy "Teachers read own campaign members" on public.sm_campaign_members
  for select using (public.sm_is_campaign_teacher(campaign_id, auth.uid()));

-- sm_campaign_days -----------------------------------------------------------
drop policy if exists "Members read own campaign days" on public.sm_campaign_days;
create policy "Members read own campaign days" on public.sm_campaign_days
  for select using (public.sm_is_campaign_member(campaign_id, auth.uid()));

drop policy if exists "Teachers read own campaign days" on public.sm_campaign_days;
create policy "Teachers read own campaign days" on public.sm_campaign_days
  for select using (public.sm_is_campaign_teacher(campaign_id, auth.uid()));

drop policy if exists "Teachers update own campaign day status" on public.sm_campaign_days;
create policy "Teachers update own campaign day status" on public.sm_campaign_days
  for update using (public.sm_is_campaign_teacher(campaign_id, auth.uid()))
  with check (public.sm_is_campaign_teacher(campaign_id, auth.uid()));
