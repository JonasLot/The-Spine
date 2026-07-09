-- ════════════════════════════════════════════════════════════════
--  One-time seed — Goals & Outcomes for Jonas
--  Relatert: Plan — Goals & Outcomes.md · app.html · supabase-schema.sql
--
--  Run AFTER supabase-schema.sql (which creates the goals/outcomes tables).
--  Supabase → SQL Editor → New query → paste all → Run.
--  Safe to re-run: on conflict (id) updates the same rows.
--
--  SQL Editor runs as admin, so auth.uid() is null here — we look up
--  your user id by email instead. Same ids as the app seed (g1–g3,
--  o1–o4), so the Norwegian overlay shows automatically in the app.
-- ════════════════════════════════════════════════════════════════

-- ---- 3 goals ----
insert into public.goals (id, user_id, data) values
('g1', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"g1","title":"O1 — one platform, many users, same experience","type":"company","horizon":"2026","owner":"Jonas","statement":"One shared multi-tenant platform serves every municipality with the same experience — the company-level bet the whole programme ladders up to.","note":""}'::jsonb),
('g2', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"g2","title":"Lawful, automated casework","type":"product","horizon":"2027","owner":"Jonas","statement":"Ordinary school-transport cases are decided automatically at sufficient quality, on a traceable basis — trustworthy enough to defend on appeal.","note":""}'::jsonb),
('g3', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"g3","title":"Self-serve scaling of on-demand planning","type":"product","horizon":"2026","owner":"Jonas","statement":"New school admins reach first value without a support call, so on-demand planning scales without scaling the support team.","note":""}'::jsonb)
on conflict (id) do update set data = excluded.data, user_id = excluded.user_id, updated_at = now();

-- ---- 4 outcomes ----
insert into public.outcomes (id, user_id, data) values
('o1', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"o1","goalId":"g2","statement":"Appeal-overturn rate on school-transport decisions falls","baseline":"~90% overturned","target":"materially lower","by":"2027-Q2","measuredBy":"s1","state":"off-track","note":"Cause not yet understood (M0). The signal currently disagrees."}'::jsonb),
('o2', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"o2","goalId":"g2","statement":"≥60% of ordinary cases fully automated at quality","baseline":"0%","target":"60%","by":"2027-Q2","measuredBy":"","state":"not-measured","note":"The M3 ambition the business case rests on. No live signal yet — a1 is the underlying bet."}'::jsonb),
('o3', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"o3","goalId":"g1","statement":"No measurable service interruption during the TØFF migration window","baseline":"clean baseline","target":"0 interruptions","by":"2026-12-31","measuredBy":"s3","state":"on-track","note":"Migration not started; baseline clean."}'::jsonb),
('o4', (select id from auth.users where email='lotherington@gmail.com'),
 '{"id":"o4","goalId":"g3","statement":"≥80% of admins self-onboard by week 4","baseline":"62% at week 4","target":"≥80%","by":"2026-Q3","measuredBy":"s4","state":"at-risk","note":"Drifting below target — the signal is watching a6."}'::jsonb)
on conflict (id) do update set data = excluded.data, user_id = excluded.user_id, updated_at = now();

-- ---- OPTIONAL: wire your existing strategies to the goals ----
-- Only touches st1/st2/st3 if they exist on your account. Without this,
-- the goals show as "uncovered" and no serves-edges appear on the map.
update public.strategies set data = jsonb_set(data, '{serves}', '["g1","g2"]'::jsonb), updated_at = now()
  where id = 'st1' and user_id = (select id from auth.users where email='lotherington@gmail.com');
update public.strategies set data = jsonb_set(data, '{serves}', '["g1"]'::jsonb), updated_at = now()
  where id = 'st2' and user_id = (select id from auth.users where email='lotherington@gmail.com');
update public.strategies set data = jsonb_set(data, '{serves}', '["g3"]'::jsonb), updated_at = now()
  where id = 'st3' and user_id = (select id from auth.users where email='lotherington@gmail.com');

-- Done. Reload the app → Direction → Goals.
