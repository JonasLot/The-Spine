-- ════════════════════════════════════════════════════════════════
--  Strategy Spine OS — Supabase schema
--  Run once: Supabase → SQL Editor → New query → paste all → Run.
--  Safe to re-run (idempotent).
--
--  One table per entity. Each row belongs to a user and stores the
--  entity as JSONB (the app reads/writes whole objects). Row-Level
--  Security guarantees a user only ever sees and edits their OWN rows.
--  Version 10.0
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

do $$
declare t text;
begin
  foreach t in array array['strategies','insights','decisions','assumptions','signals','goals','outcomes','values','reviews','radar','rights','diagnoses','needs']
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

-- ════════════════════════════════════════════════════════════════
--  Delbar kanonisk strategi (shares)
--  Kjør dette på nytt i Supabase → SQL Editor etter oppdatering.
--  Safe å re-kjøre.
--
--  Modell: et share er et ØYEBLIKKSBILDE, ikke et vindu inn i levende
--  data. "Publiser" skriver hele artefaktet som JSONB i én rad. Da er
--  produksjonstabellene aldri eksponert for anon, og en delt lenke er
--  stabil — den endrer seg ikke mens leseren ser på den.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.shares (
  token       text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  strategy_id text not null,
  version     text,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

create index if not exists shares_user_idx on public.shares (user_id);

alter table public.shares enable row level security;

-- Eieren styrer sine egne delinger. Anon har INGEN direkte tilgang til tabellen.
--
-- ⚠️ IKKE legg til en "for select using (true)"-policy her. Anon-nøkkelen
-- ligger åpent i spine-config.js, så en slik policy ville latt hvem som helst
-- kjøre "select * from shares" og laste ned samtlige delte strategier fra
-- alle brukere. Tokenet ville ikke beskyttet noe. Oppslag skjer utelukkende
-- gjennom get_share() under, som ikke kan enumereres.
drop policy if exists "own_shares" on public.shares;
create policy "own_shares" on public.shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Eneste vei inn for en uinnlogget leser: nøyaktig ett token om gangen.
-- Feil token gir null — ikke en feilmelding som avslører at raden finnes.
create or replace function public.get_share(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select payload
  from public.shares
  where token = p_token
    and (expires_at is null or expires_at > now());
$$;

revoke all on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;

-- Done. s.html kaller get_share(); appen skriver til shares som innlogget bruker.
