# Plan — Goals & Outcomes

> Relatert: [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · `app.html` · `supabase-schema.sql`
> Status: **Ferdig bygget og verifisert** (2026-07-08). Goals + Outcomes lever i `app.html`; schema oppdatert i `supabase-schema.sql`.

## Levert (2026-07-08)
- Nytt nav-lag **Retning** med Goals og Outcomes, over Registers.
- To nye entiteter (`goals`, `outcomes`) + `serves[]` på strategien — samme JSONB-mønster, lagt i `COLLS`, seed (EN + NO-overlay), og `supabase-schema.sql`.
- Views, redigeringsskjema (`FIELDS`), og drawere for begge; kryssref-opprydding ved sletting.
- `buildGraph`: goals som rot-noder over strategiene (portefølje) og i strategi-fokus; `serves`-kanter; **gul stiplet ring** flagger udekte mål og foreldreløse strategier.
- Verifisert i Node mot seed: 3 mål, 3 strategier, 4 serves-kanter, 0 foreldreløse/udekte; opprulling g1=on-track, g2=off-track, g3=at-risk; norsk overlay OK.
- **Migreringsnote:** `howKnow`-strengene står fortsatt på strategiene (bakoverkompat). Outcomes er seedet parallelt; neste steg er å droppe `howKnow` når du er trygg. Eksisterende backend-brukere må kjøre `supabase-schema.sql` på nytt for å få `goals`/`outcomes`-tabellene, og får ikke seed-mål automatisk (kun ferske innlogginger seedes).



## Hvorfor
Spinen svarer i dag skarpt på om en strategi *holder* — kjeden **Innsikt → Assumption → Strategi**, med **Decisions** som hviler på assumptions og **Signals** som overvåker dem. Men modellen har ingen topp. Den svarer ikke på **hvorfor** en strategi finnes, eller **hva** verden skal se ut som når den lykkes.

Tydeligste beviset på hullet: dashboardet heter «Beveger jeg meg mot målet?» (`vh.dashboard`, ~linje 654/708) — men det finnes ikke noe *mål*-objekt i datamodellen. Mål lever i dag som løs prosa inne i strategiene (`reasoning`: «Knyttet til selskapets O1», «målet om 60 % automatisering», ~linje 548/811). De er referert ved navn, ikke førsteklasses. Derfor kan man ikke spørre «hvilke strategier tjener O1?» eller «hvilke mål er dekket / foreldreløse?».

To ting dette laget skal svare på:
1. **Retning:** Hvorfor finnes denne strategien — hvilket mål tjener den, og er målet dekket av minst én strategi?
2. **Ambisjon:** Hva er den målbare endringen som forteller at målet nås, og hvilket signal måler den?

## Kjernedistinksjon (den eneste fellen å unngå)
- **Goal** = destinasjonen / hvorfor. **Genuint fraværende** i dag. Strategier skal peke *opp* til goals, slik assumptions peker opp til strategier.
- **Outcome** = den målbare endringen som definerer at et goal nås. **Finnes nesten allerede:** feltet `howKnow` på strategien («omgjøringsraten faller», «≥60 % automatisert», ~linje 524/790) *er* i praksis outcome-definisjoner, og `signals` er det som måler.

⚠️ Fellen: lager man et outcome-register ved siden av, dupliserer man `howKnow`. Den rene løsningen er å **promotere `howKnow`-strengene til førsteklasses outcomes** som signaler kan overvåke — ikke legge et nytt lag ved siden av.

## Målmodell — den hele kjeden
```
Goal → Outcome → Strategi (leverer) → Assumption → Signal
 ▲        ▲            ▲                   ▲           │
 └── outcome.measures  └── strategy.serves └── assumption.strategy
          (goalId)          (goalId[])         (navn, finnes)
                                          signal.watches ──────┘
                        signal.measures → outcome (nytt, valgfritt)
```
- Et **Goal** er en destinasjon; kan ha flere outcomes og tjenes av flere strategier.
- Et **Outcome** er en målbar endring knyttet til ett goal; overvåkes av ett eller flere signaler.
- En **Strategi** får et nytt felt `serves: [goalId]` — den leverer mot ett eller flere mål.
- `howKnow`-strengene migreres til outcome-records (se Fase 3).

## Datamodell (JSONB — ingen schemaendring i mønster)
Samme mønster som eksisterende entiteter: én tabell per entitet, hele objektet som JSONB, RLS per bruker. I `supabase-schema.sql` legges `goals` og `outcomes` inn i entitets-arrayen (~linje 15, `array['strategies','insights',...]` → legg til `'goals','outcomes'`).

**Goal-objekt:**
```js
{ id:"g1", title:"O1 — én plattform, mange brukere, samme opplevelse",
  type:"company",            // company | product | team
  horizon:"2026",
  owner:"Jonas",
  statement:"...",           // hva målet betyr i klartekst
  note:"..." }
```

**Outcome-objekt:**
```js
{ id:"o1", goalId:"g1",
  statement:"≥60 % av ordinære saker fullautomatisert med kvalitet",
  baseline:"0 % (2026-05)",
  target:"60 %",
  by:"2027-Q2",
  measuredBy:"s?",           // signal-id (valgfritt) — kobler til eksisterende signal
  state:"on-track" }         // on-track | at-risk | off-track | not-measured
```

**Strategi-objekt — nytt felt:**
```js
serves:["g1"]                // valgfritt array av goalId — redigeres i editEntry-modal
```

## Grafintegrasjon — plugg rett inn i strategikartet
`buildGraph(mode, focusId)` (~linje 1492) avleder allerede kanter fra felt-referanser. Nye nodetyper og kanter følger samme mønster:

| Kant | Kilde i data | Analog til |
|---|---|---|
| strategy → goal | `strategy.serves[]` | `assumption.strategy` |
| outcome → goal | `outcome.goalId` | `signal.watches` |
| signal → outcome | `signal.measures` (valgfritt) el. `outcome.measuredBy` | `insight.feeds` |

- **Porteføljemodus:** goals som nye rot-noder over strategiene; en strategi uten `serves` flagges «foreldreløs» (mangler retning). Et goal uten strategi flagges «udekket».
- **Fokusmodus (på et goal):** sentrum = goal; ring med outcomes (farge etter `state`) og de strategiene som tjener det.
- Nodefarge/flashing gjenbruker `stateColor` (~linje 1475) — outcome-state mapper til samme paletten som signal/assumption-state.

## Byggerekkefølge (foreslått)
1. **Datamodell + seed:** legg `goals`+`outcomes` i begge seed-blokkene (~linje 518 og ~1896), med `serves` på st1–st3. Fyll fra Tet Vedtak: g1 = O1/automatisering, outcomes fra `howKnow`.
2. **Schema:** legg `'goals','outcomes'` i entitets-arrayen i `supabase-schema.sql`. Idempotent — trygt å re-kjøre.
3. **`howKnow`-migrering:** konverter hver `howKnow`-streng til et outcome-record (behold `howKnow` som visning i første omgang for bakoverkompat, dropp senere).
4. **Nav + views:** nye nav-items `data-view="goals"` / `"outcomes"` (~linje 419-450) + `vGoals()`/`vOutcomes()` i view-mapen (~linje 957). Liste + `editEntry`-modal (form-type for `serves`-velger, jf. `rels`-mønsteret i strategikart-planen).
5. **Graf:** utvid `buildGraph` med goal/outcome-noder og de tre kantene over; flagg foreldreløse strategier og udekte goals.
6. **Dashboard:** «Beveger jeg meg mot målet?» får endelig et *mål* å rulle opp mot — vis goal-dekning og outcome-state øverst.
7. **Verifisering mot seed:** samme disiplin som strategikart-planen — kjør `buildGraph`-logikk i Node mot seed, bekreft at hver strategi ruller opp til rett goal og hvert outcome til rett signal.

## Åpne spørsmål
- Skal `serves` være på strategien eller en egen koblingstabell? (Anbefaling: felt på strategien, symmetrisk med hvordan `assumption.strategy` allerede fungerer.)
- Skal `outcome.state` beregnes fra det koblede signalet, eller settes manuelt? (Anbefaling: avled fra signal når `measuredBy` finnes, ellers manuelt — samme hybrid som resten av Spinen.)
- Trenger vi et nivå mellom company-goal og produkt-outcome (f.eks. OKR-«objective»)? Vurder å utsette til modellen er i bruk.
