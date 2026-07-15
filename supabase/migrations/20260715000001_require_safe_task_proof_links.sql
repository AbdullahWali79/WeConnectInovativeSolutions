create or replace function public.validate_task_submission_proof_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  link_value text;
  blocked_domain_pattern text := '(^|[.-])(adult|escort|hentai|nude|nudity|onlyfans|porn|pornhub|porno|pornography|redtube|sex|sexy|xnxx|xvideos|xxx)([.:-]|$)';
begin
  -- Only validate new submissions or a resubmission that changes its proof.
  if tg_op = 'UPDATE'
    and new.proof_url is not distinct from old.proof_url
    and new.proof_links is not distinct from old.proof_links then
    return new;
  end if;

  link_value := trim(coalesce(new.proof_url, ''));
  if link_value = '' then
    raise exception 'Proof link is required';
  end if;

  if link_value !~* '^https?://[^[:space:]]+$' then
    raise exception 'Enter a valid proof link starting with http:// or https://';
  end if;

  if split_part(split_part(regexp_replace(lower(link_value), '^https?://', ''), '/', 1), '@', -1)
    ~ blocked_domain_pattern then
    raise exception 'Adult or vulgar website links are not allowed';
  end if;

  if new.proof_links is not null then
    if jsonb_typeof(new.proof_links) <> 'array' then
      raise exception 'Additional proof links must be a list';
    end if;

    for link_value in select trim(value) from jsonb_array_elements_text(new.proof_links)
    loop
      if link_value = '' then
        continue;
      end if;
      if link_value !~* '^https?://[^[:space:]]+$' then
        raise exception 'Enter valid additional proof links starting with http:// or https://';
      end if;
      if split_part(split_part(regexp_replace(lower(link_value), '^https?://', ''), '/', 1), '@', -1)
        ~ blocked_domain_pattern then
        raise exception 'Adult or vulgar website links are not allowed';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_task_submission_proof_links on public.submissions;
create trigger validate_task_submission_proof_links
before insert or update of proof_url, proof_links on public.submissions
for each row execute function public.validate_task_submission_proof_links();
