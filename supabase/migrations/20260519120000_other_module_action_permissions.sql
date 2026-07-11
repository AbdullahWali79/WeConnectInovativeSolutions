drop policy if exists "Public can read active promotional popups" on public.promotional_popups;
drop policy if exists "Public or permitted users can read promotional popups" on public.promotional_popups;
drop policy if exists "Admins can manage promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can create promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can edit promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can delete promotional popups" on public.promotional_popups;

create policy "Public or permitted users can read promotional popups" on public.promotional_popups
  for select using (is_active = true or public.has_permission(auth.uid(), 'promotional_popups.view'));

create policy "Admins can manage promotional popups" on public.promotional_popups
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create promotional popups" on public.promotional_popups
  for insert with check (public.has_permission(auth.uid(), 'promotional_popups.create'));

create policy "Permitted users can edit promotional popups" on public.promotional_popups
  for update using (public.has_permission(auth.uid(), 'promotional_popups.edit')) with check (public.has_permission(auth.uid(), 'promotional_popups.edit'));

create policy "Permitted users can delete promotional popups" on public.promotional_popups
  for delete using (public.has_permission(auth.uid(), 'promotional_popups.delete'));

drop policy if exists "Public can read active team members" on public.team_members;
drop policy if exists "Public or permitted users can read active team members" on public.team_members;
drop policy if exists "Admins can manage team members" on public.team_members;
drop policy if exists "Permitted users can create team members" on public.team_members;
drop policy if exists "Permitted users can edit team members" on public.team_members;
drop policy if exists "Permitted users can delete team members" on public.team_members;

create policy "Public or permitted users can read active team members" on public.team_members
  for select using (status = 'active' or public.has_permission(auth.uid(), 'team_members.view'));

create policy "Admins can manage team members" on public.team_members
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create team members" on public.team_members
  for insert with check (public.has_permission(auth.uid(), 'team_members.create'));

create policy "Permitted users can edit team members" on public.team_members
  for update using (public.has_permission(auth.uid(), 'team_members.edit')) with check (public.has_permission(auth.uid(), 'team_members.edit'));

create policy "Permitted users can delete team members" on public.team_members
  for delete using (public.has_permission(auth.uid(), 'team_members.delete'));

drop policy if exists "Public can read active products" on public.products;
drop policy if exists "Public or permitted users can read active products" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Permitted users can create products" on public.products;
drop policy if exists "Permitted users can edit products" on public.products;
drop policy if exists "Permitted users can delete products" on public.products;

create policy "Public or permitted users can read active products" on public.products
  for select using (status = 'active' or public.has_permission(auth.uid(), 'products.view'));

create policy "Admins can manage products" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create products" on public.products
  for insert with check (public.has_permission(auth.uid(), 'products.create'));

create policy "Permitted users can edit products" on public.products
  for update using (public.has_permission(auth.uid(), 'products.edit')) with check (public.has_permission(auth.uid(), 'products.edit'));

create policy "Permitted users can delete products" on public.products
  for delete using (public.has_permission(auth.uid(), 'products.delete'));

drop policy if exists "Authenticated can read trainees" on public.trainees;
drop policy if exists "Permitted users can read trainees" on public.trainees;
drop policy if exists "Admins can manage trainees" on public.trainees;
drop policy if exists "Permitted users can create trainees" on public.trainees;
drop policy if exists "Permitted users can edit trainees" on public.trainees;
drop policy if exists "Permitted users can delete trainees" on public.trainees;

create policy "Permitted users can read trainees" on public.trainees
  for select using (public.has_permission(auth.uid(), 'trainees.view'));

create policy "Admins can manage trainees" on public.trainees
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create trainees" on public.trainees
  for insert with check (public.has_permission(auth.uid(), 'trainees.create'));

create policy "Permitted users can edit trainees" on public.trainees
  for update using (public.has_permission(auth.uid(), 'trainees.edit')) with check (public.has_permission(auth.uid(), 'trainees.edit'));

create policy "Permitted users can delete trainees" on public.trainees
  for delete using (public.has_permission(auth.uid(), 'trainees.delete'));
