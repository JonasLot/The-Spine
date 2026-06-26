-- ════════════════════════════════════════════════════════════════
--  Strategy Spine OS — Supabase schema
--  Run once: Supabase → SQL Editor → New query → paste all → Run.
--  Safe to re-run (idempotent).
--
--  One table per entity. Each row belongs to a user and stores the
--  entity as JSONB (the app reads/writes whole objects). Row-Level
--  Security guarantees a user only ever sees and edits their OWN rows.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

do $$
declare t text;
begin
  foreach t in array array['strategies','insights','decisions','assumptions','signals']
  loop
    -- table
    execute format($f$
      create table if not exists public.%I (
        id         text primary key,
        user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
        data       jsonb not null,
        updated_at timestamptz not null default now()
      );$f$, t);

    -- per-user index + row-level security
    execute format('create index if not exists %I on public.%I (user_id);', t || '_user_idx', t);
    execute format('alter table public.%I enable row level security;', t);

    -- policies (drop first so the script is re-runnable)
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_write"  on public.%I;', t);
    execute format(
      'create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_write" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Done. Next: copy your Project URL + anon key into spine-config.js,
-- keep Email auth (magic link) enabled under Authentication → Providers,
-- and add your site URL to Authentication → URL Configuration.
