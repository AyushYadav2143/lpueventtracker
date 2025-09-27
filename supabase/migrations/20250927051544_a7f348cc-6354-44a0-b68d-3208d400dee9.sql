-- RPCs for admin-managed events with SECURITY DEFINER and credential check

-- List events by status for admin
create or replace function public.admin_list_events(
  _status text,
  _email text,
  _password text
)
returns setof public.events
language sql
security definer
set search_path = public
as $$
  select e.*
  from public.events e
  where e.status = _status
    and public.verify_admin_credentials(_email, _password);
$$;

-- Update event status (approve/reject)
create or replace function public.admin_update_event_status(
  _event_id uuid,
  _new_status text,
  _email text,
  _password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_admin_credentials(_email, _password) then
    raise exception 'Invalid admin credentials';
  end if;

  update public.events
  set status = _new_status
  where id = _event_id;
end;
$$;

-- Delete an event (reject and remove)
create or replace function public.admin_delete_event(
  _event_id uuid,
  _email text,
  _password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_admin_credentials(_email, _password) then
    raise exception 'Invalid admin credentials';
  end if;

  delete from public.events where id = _event_id;
end;
$$;