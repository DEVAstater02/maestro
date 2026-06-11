create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'maestro-landing',
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create unique index if not exists waitlist_email_unique
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;

create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (
    source = 'maestro-landing'
    and email = lower(email)
  );
