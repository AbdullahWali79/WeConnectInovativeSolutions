-- Store the reusable Head / CEO signature selected in Software Houses.
-- This was previously present only in the manual simple-certificates setup SQL,
-- so deployed databases that rely on migrations did not receive the column.
alter table public.software_houses
  add column if not exists head_signature_url text;

-- Ask PostgREST to reload its schema immediately after the migration.
notify pgrst, 'reload schema';
