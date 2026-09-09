# Plan — Delbar kanonisk strategi

> Relatert: [[Backend Setup — Supabase]] · [[Plan — Rammeverk-router & lenser]] · [[Plan — Goals & Outcomes]] · `app.html` · `login.html` · `supabase-schema.sql`
> Status: **Bygget** (2026-09-09). Fase 1–4 lever i `supabase-schema.sql`, `s.html` og `app.html`.
> ⚠️ **Krever ett manuelt steg:** kjør `supabase-schema.sql` på nytt i Supabase SQL-editoren. Til det er gjort viser appen et dempet bånd i stedet for delefunksjonen.

## Levert (2026-09-09)
- **Fase 1** — `shares`-tabell med RLS som kun gir eieren tilgang, og `get_share(token)` som `security definer`. Anon kan kalle funksjonen, men har ingen `select` på tabellen — den kan ikke enumereres. Kommentaren i SQL-fila advarer eksplisitt mot `for select using (true)`, som ville latt anon-nøkkelen laste ned samtlige delinger.
- **Fase 2** — `s.html`: frittstående leserside, tokenet i fragmentet (aldri i query, så det havner ikke i serverlogger eller Referer). Egne tokens fra `index.html`, ikke appens sidebar-CSS — den skal se ut som et dokument. `@media print` gir PDF via nettleserens utskrift, uten bibliotek.
- **Fase 3** — publisering fra `vStrategyDetail`: øyeblikksbilde, ikke levende vindu. Kopier lenke, publiser på nytt, opphev deling. Utdatert-bånd når `version` har flyttet seg siden publisering.
- **Fase 4** — `vShares` under Apparatus. `SYSTEMS[4]` gikk fra `reg:""` til `reg:"Shares"` — Canonical Artifact er nå et live register, og «four live registers» er blitt fem.

**Åpne spørsmål avgjort:**
- Beslutningsloggen deles ikke som standard, men kan hukes av per publisering.
- Utløp settes til 90 dager som standard, med «uten utløp» som bevisst valg. Produktets eget standpunkt mot drivende kopier er dermed standardinnstillingen.
- Ikke passord. Tokenet er 122 bits fra `crypto.randomUUID()`.

**Payloaden utelater bevisst:** beslutninger (med mindre huket av), innsikter, eiernavn på bets og signaler, interne notater, og avlesningshistorikken. Tester verifiserer hver utelatelse, at pensjonerte bets og signaler filtreres bort, og at ingen bruker-id eller e-post havner i payloaden.

**Gjenstår:** `s.html` på penere sti enn `#token` krever en rewrite-regel hos verten. Landingssidens «One canonical artifact everyone points to» er nå sann i appen, men lenken må testes i produksjon før teksten kan stå uimotsagt.

## Hvorfor

Produktet selger alignment til én bruker.

`supabase-schema.sql` gir `own_select` / `own_write` med `auth.uid() = user_id` på alle syv tabellene. `boot()` sender deg til `login.html` uten sesjon. Det finnes ingen deling, ingen invitasjon, ingen roller, ingen kommentarer.

Samtidig sier landingssiden:

> «One canonical artifact everyone points to. No drifting copies.»
> «Communication gets equal weight … carries it to behaviour — one canonical artifact, kept true, **that people can actually hold in their heads**.»

Tre av de ti standing systems heter *Canonical Strategy Artifact*, *Operating Rhythm* og *Decision Rights*. `SYSTEMS[4].dies` sier det selv: *«Five versions of the strategy, all slightly wrong.»* Men i dag er den eneste måten å gi noen strategien på, å eksportere Markdown og sende den — altså å lage nøyaktig den kopien systemet advarer mot.

**Dette er den skarpeste motsigelsen mellom løfte og produkt.** Ikke fordi produktet mangler multiplayer — det skal det ikke ha — men fordi «det ene stedet alle peker på» ikke kan pekes på.

## Omfangsavgrensning

Dette er **ikke** samarbeid. Ingen redigering, ingen kommentarer, ingen invitasjoner, ingen kontoer for leseren, ingen roller. Alt det er et annet produkt.

Dette er én ting: **en lenke som viser det kanoniske artefaktet, som ikke krever innlogging, og som ikke er en kopi.**

Det dekker det faktiske bruksmønsteret — du limer lenken i et møtereferat, en Slack-melding, en styresak — og lar `Canonical Artifact` gå fra prosa til register uten å bygge et samarbeidsprodukt.

## Den arkitektoniske avgjørelsen: øyeblikksbilde, ikke vindu

To måter å gjøre dette på:

**A. Levende vindu.** Lenken viser strategien slik den er akkurat nå. Krever at anon-rollen kan lese ut av `strategies`, `assumptions`, `signals` — dvs. å åpne produksjonstabellene for uautentisert lesing under en eller annen betingelse. Vanskelig å få riktig i RLS, og feil her lekker alt.

**B. Publisert versjon.** «Del» tar et øyeblikksbilde av strategien + dens registre og skriver det som én rad i en egen `shares`-tabell. Lenken leser bare den raden. Produksjonstabellene forblir helt lukket for anon.

**Anbefaling: B — og ikke bare av sikkerhetsgrunner.**

Strategien har allerede `version` og `status: draft | reviewed | committed`. Et kanonisk artefakt er ikke «hva jeg holder på med akkurat nå» — det er «versjon 3, committed, det vi ble enige om». En delt lenke som endrer seg under føttene på leseren mens du redigerer et utkast, er ikke kanonisk. Den er ustabil.

Publisering er dessuten en **handling**, og handlinger kan logges. *«v3 publisert 2026-09-08»* hører hjemme i beslutningsloggen.

Trade-offen: en publisert lenke kan bli utdatert. Det løses med en synlig `Publisert v3 · 8. sep 2026`-linje i artefaktet, og et bånd i appen når den levende strategien har endret seg siden siste publisering: *«Delt versjon er v3. Gjeldende er v4.»*

## Schema

Legges til i `supabase-schema.sql`, **utenfor** den eksisterende `foreach t in array[...]`-løkken — den har andre policyer.

```sql
create table if not exists public.shares (
  token       text primary key,          -- unguessable, generert i klienten
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  strategy_id text not null,
  version     text,
  payload     jsonb not null,            -- øyeblikksbildet
  created_at  timestamptz not null default now(),
  expires_at  timestamptz                -- null = ingen utløp
);

create index if not exists shares_user_idx on public.shares (user_id);

alter table public.shares enable row level security;

-- Eieren styrer sine egne delinger. Anon har INGEN direkte tilgang.
drop policy if exists "own_shares" on public.shares;
create policy "own_shares" on public.shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### ⚠️ Den kritiske detaljen

Det er fristende å skrive `create policy "public_read" on shares for select using (true)`. **Ikke gjør det.** Med den policyen kan hvem som helst kjøre `select * from shares` mot anon-nøkkelen — som ligger åpent i `spine-config.js` — og laste ned samtlige delte strategier fra alle brukere. Tokenet ville ikke beskyttet noe.

Riktig mønster er en `security definer`-funksjon som slår opp nøyaktig ett token og ikke kan enumereres:

```sql
create or replace function public.get_share(p_token text)
returns jsonb
language sql
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
```

Anon kan kalle `get_share('abc123…')` og få én payload. Anon kan ikke liste, telle eller søke. Tokenet er den eneste veien inn, og et feil token gir `null` — ikke en feilmelding som avslører at raden finnes.

Token genereres med `crypto.randomUUID()` (tilgjengelig i alle relevante nettlesere, ingen avhengighet). 122 bits entropi er rikelig; ingen grunn til å finne på noe eget.

## Payload

Øyeblikksbildet skal inneholde nok til at artefaktet står på egne ben, og ikke ett felt mer.

```js
function buildSharePayload(strategy){
  const name = strategy.name;
  const asmp = DB.assumptions.filter(a => a.strategy === name && a.state !== "retired");
  const sigs = DB.signals.filter(s => s.strategy === name && s.state !== "retired");
  const gIds = strategy.serves || [];
  return {
    v: 1,                                     // payload-skjemaversjon, for fremtidig lesing
    published: new Date().toISOString(),
    lang: LANG,
    strategy: {
      name, version: strategy.version, status: strategy.status,
      owner: strategy.owner, review: strategy.review,
      framework: strategy.framework,
      challenge: L(strategy,"challenge"), approach: L(strategy,"approach"),
      moves: L(strategy,"moves"), notDoing: L(strategy,"notDoing"),
      howKnow: L(strategy,"howKnow"),
    },
    goals: DB.goals.filter(g => gIds.includes(g.id))
                   .map(g => ({title:L(g,"title"), statement:L(g,"statement"), horizon:g.horizon})),
    bets: asmp.map(a => ({
      statement: L(a,"statement"), state: a.state,
      confidence: a.confidence, consequence: a.consequence,
      kill_signal: L(a,"kill_signal"),
    })),
    signals: sigs.map(s => ({
      signal: L(s,"signal"), state: s.state,
      expected_shape: L(s,"expected_shape"), last_reading: L(s,"last_reading"),
      watches: s.watches ? (byId("assumptions", s.watches)||{}).statement : null,
    })),
  };
}
```

**Bevisst utelatt:**

- `decisions` — beslutningsloggen inneholder forkastede alternativer og resonnement som ikke nødvendigvis skal ut av huset. Skal dette deles, må det være et eget avkrysningsvalg ved publisering, ikke default.
- `insights` — kildehenvisninger og rådata. Samme begrunnelse.
- `owner`-navn på antakelser og signaler — de er i praksis personopplysninger i en offentlig lenke. `strategy.owner` beholdes fordi artefaktet trenger en avsender; vurder å gjøre også den valgfri.
- `log` på signalene — historikken er internt arbeid.

⚠️ **Merk `L()`-bruken.** Uten den blir en delt norsk strategi publisert på engelsk, fordi NO-overlayet i `SEED_NO` bare virker gjennom `L()`/`trView()` og ikke er lagret på objektet. `lang` i payloaden gjør at leseren får riktig språk uansett hva hans egen nettleser sier — det er publisererens valg, ikke leserens.

## Leserside — `s.html`

Ny fil ved siden av `index.html`, `login.html` og `app.html`. Lenkeformat: `…/s.html#<token>` — **tokenet i fragmentet, ikke i query-strengen**, slik at det ikke havner i serverlogger eller Referer-headere.

Filen er liten: den lager en Supabase-klient med anon-nøkkelen fra `spine-config.js`, kaller `SB.rpc('get_share', {p_token: location.hash.slice(1)})`, og rendrer payloaden.

Struktur, i denne rekkefølgen:

1. **Artefaktet** — de fem seksjonene, satt i Instrument Serif som i `vStrategyDetail`. Dette er hovedsaken og skal fylle første skjerm.
2. **Målene den tjener** — hvis `serves` er satt.
3. **Bettene** — hver med state-badge, `confidence × consequence`, og kill-signalet. Dette er det som skiller artefaktet fra et hvilket som helst strategidokument: leseren ser hva som må være sant.
4. **Signalene** — hva som overvåker hvilken bet, og siste avlesning.
5. **Bunnlinje** — `Publisert v3 · 8. september 2026 · Jonas` og en dempet «Laget med The Strategy Spine»-lenke tilbake til `index.html`.

Stilarket er en trimmet kopi av tokenene fra `index.html` (`--bg`, `--ink`, `--accent`, Instrument Serif + Plus Jakarta Sans). Ikke importer `app.html`s CSS — den er bygget for et applikasjonsskall med sidebar, og siden skal se ut som et *dokument*, ikke som en app noen har logget seg ut av.

**Punkt 7 fra analysen løses her gratis:** legg inn et `@media print`-blokk. Da er det kanoniske artefaktet også en PDF, via nettleserens egen utskrift, uten et eneste bibliotek. Det er den billigste funksjonen i hele planen.

## Appside

**I `vStrategyDetail`**, ved siden av eksisterende eksport-knapper:

- Ikke delt: knappen **«Publiser og del»**. Ett klikk → `crypto.randomUUID()`, `buildSharePayload()`, upsert til `shares`, kopier lenken til utklippstavlen, vis den.
- Allerede delt: linjen *«Delt · v3 · publisert 8. sep»* med **Kopier lenke**, **Publiser på nytt** og **Opphev deling**.
- Når `strategy.version` eller innholdet har endret seg siden publisering: et dempet bånd — *«Delt versjon er v3. Gjeldende er v4.»* med publiser-på-nytt som handling. Sammenligning kan gjøres billig ved å lagre en hash av payloaden i `shares`, eller bare ved å sammenligne `version` (enklest, holder).

**Ny visning `vShares`** under *Apparatus* — dette er `Canonical Artifact`-registeret. Én tabell: strategi, versjon, publisert dato, utløp, status (gjeldende / utdatert), handlinger. Med den går `SYSTEMS[4]` fra `reg:""` til `reg:"Shares"`, og landingssidens «Four live registers» blir fem.

**Opphev deling** = `delete from shares where token = …`. Lenken dør umiddelbart. Det bør stå eksplisitt i UI-et, fordi det er det eneste tilbakekallet som finnes.

## Faser

**Fase 1 — schema og funksjon.** `shares`-tabell, RLS-policy, `get_share`-funksjon. Kjør `supabase-schema.sql` på nytt. Verifiser i SQL-editoren at anon *ikke* kan `select * from shares`.

**Fase 2 — `s.html`.** Leserside mot en håndlaget test-rad. Ingen appendringer ennå. Inkluder `@media print` fra start.

**Fase 3 — publiser fra appen.** `buildSharePayload()`, knapp i `vStrategyDetail`, kopier-til-utklippstavle.

**Fase 4 — registeret.** `vShares`, utdatert-bånd, opphev deling, `SYSTEMS`-oppdatering.

Fase 1–3 er en delbar lenke. Fase 4 gjør den til et system.

## Verifisering

Sikkerhet først — dette er den ene planen der en feil er dyr:

1. Med **kun** anon-nøkkelen (nytt privat nettleservindu, ikke innlogget): `select * from shares` skal returnere tom/feil. Test dette eksplisitt, ikke anta det.
2. `get_share` med gyldig token → payload. Med tullete token → `null`. Med utløpt token → `null`.
3. `get_share` skal ikke kunne nå `strategies`, `assumptions` eller noe annet. Bekreft at `security definer` ikke har utvidet mer enn den ene funksjonen.
4. Slett en share-rad → lenken gir `null` umiddelbart.
5. Slett brukeren → `on delete cascade` fjerner delingene.

Funksjonelt:

- Publiser st1 på norsk, åpne lenken i et vindu med engelsk nettleserspråk → innholdet skal være norsk.
- Publiser st2, endre `challenge` i appen, last lenken på nytt → **uendret** innhold (det er hele poenget med øyeblikksbildet), og båndet «utdatert» skal vises i appen.
- Retired antakelser og signaler skal ikke være med i payloaden.
- Skriv ut lenken til PDF → artefaktet skal være lesbart, uten navigasjon eller avkuttede kolonner.
- Payload uten `goals` (strategi uten `serves`) skal ikke etterlate en tom seksjon.

## Åpne spørsmål

1. **Skal beslutninger kunne deles?** Argumentet for: *Decision Rights* er et av systemene, og «hvorfor vi valgte bort X» er ofte det leseren mest trenger. Argumentet mot: forkastede alternativer og resonnement er internt. **Anbefaling: avkrysning ved publisering, av som default.**
2. **Utløp som default?** En lenke uten utløp lever evig og blir en drivende kopi — presis det systemet advarer mot. **Vurder 90 dager som default**, med «ingen utløp» som bevisst valg. Det gjør produktets eget standpunkt til en standardinnstilling, som er en fin ting for et produkt med et standpunkt.
3. **Passord på lenken?** Trolig unødvendig — dette er strategidokumenter, ikke hemmeligheter, og et token er allerede uangripelig ved gjetting. Men hvis det skal legges til, hører det hjemme i `get_share` (som et andre argument sammenlignet mot en hash), ikke i klienten.
4. **`s.html` på egen sti?** `…/s.html#token` er stygt. `…/s/<token>` krever en rewrite-regel hos verten. Kosmetisk, men lenken er selve produktet her — det er verdt en linje i hosting-konfigurasjonen.
