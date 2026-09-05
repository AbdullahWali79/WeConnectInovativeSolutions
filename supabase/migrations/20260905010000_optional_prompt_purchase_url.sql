-- Purchase/contact links are optional, including for paid prompts.
begin;
alter table public.prompt_library
  drop constraint if exists prompt_library_check;
alter table public.prompt_library
  add constraint prompt_library_purchase_url_optional_check
  check (purchase_url = '' or purchase_url like 'https://%') not valid;
-- NOT VALID preserves legacy rows; new and updated rows enforce this rule.
commit;
