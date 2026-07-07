# Plan — Interaktivt strategikart

> Relatert: [[Backend Setup — Supabase]] · `app.html` · `supabase-schema.sql`

## Mål

To ting kartet skal svare på:

1. **Portefølje:** Hvordan forholder strategiene seg til hverandre — avhengigheter, muliggjøring, spenninger, og delte bets/innsikter.
2. **Fokus:** For én strategi — hvilke innsikter, beslutninger, assumptions og signaler påvirker den, og hvor det brenner (shaky bets, disagreeing signals).

Valgt løsning: egen **Map-visning** i nav (portefølje + fokus-modus) **og** et mini-kart i strategidetaljen. D3-force via CDN. Relasjoner både eksplisitte og avledede.

## Nøkkelinnsikt: grafen finnes allerede

Nesten alle kanter kan avledes fra eksisterende data — ingen migrering nødvendig:

| Kant | Kilde i data |
|---|---|
| insight → assumption | `insight.feeds` |
| assumption → strategy | `assumption.strategy` (navn) |
| signal → assumption | `signal.watches` |
| decision → assumption(er) | `decision.rests[]` |
| decision → strategy | `decision.strategy` |
| strategy ↔ strategy (avledet) | to strategier deler en insight (via feeds→assumption) eller en decision |

Det eneste nye er **eksplisitte strategi-relasjoner**.

## Fase 1 — Datamodell (liten)

Nytt valgfritt felt på strategy-objektet (JSONB — ingen schemaendring i Supabase):

```js
relations: [
  { to: "st2", type: "depends-on" },   // depends-on | enables | tension | related
]
```

- Redigeres i eksisterende `editEntry`-modal for strategies: en liste med (strategi-velger + type-velger + fjern-knapp).
- `depends-on` og `enables` er retningsbestemte; `tension` og `related` er symmetriske.
- Rydding: når en strategi slettes, fjern relasjoner som peker på den (samme mønster som dagens navnereferanser).

## Fase 2 — Grafbygger (ren funksjon)

`buildGraph(mode, strategyId?)` → `{ nodes, links }` fra `DB`. Ingen rendering — testbar isolert.

**Porteføljemodus:** noder = strategier. Kanter = eksplisitte relasjoner (heltrukket, med pilhode og type-label) + avledede delinger (stiplet, «shares 2 insights»). Nodestørrelse ∝ antall tilknyttede objekter; node-farge/ring etter helse (gjenbruk `flashing`-logikken: drifting/disagreeing signals + broken/shaky bets).

**Fokusmodus:** sentrum = strategien. Ringer rundt: assumptions (koblet direkte), insights (via feeds), decisions (via rests/strategy), signals (via watches). Kantfarge etter tilstand — f.eks. rød kant fra et disagreeing signal, oransje fra shaky assumption. Da *ser* man kausalkjeden: insight i1 → bet a1 → signal s1 som disagreer → decision d1 som hviler på a1 og bør revurderes.

## Fase 3 — Map-visningen

- Nytt nav-item `data-view="map"` + `vMap()` i view-routeren (linje ~671), crumb «Strategy Map».
- D3 v7 fra cdnjs (kun `d3-force`-delen brukes; full bundle er greit): `<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js">`.
- SVG-rendering med appens eksisterende CSS-variabler (`--ink`, `--acc`, state-farger) så kartet matcher resten.
- Interaksjon:
  - **Klikk node (portefølje)** → bytt til fokusmodus for den strategien.
  - **Klikk node (fokus)** → åpne eksisterende modal (`openInsight`/`openDecision`/`openAssumption`/`openSignal`) — gjenbruk, ikke nybygg.
  - **Hover** → tooltip + dim alt som ikke er naboer (nabolagshighlight).
  - **Dra** noder, zoom/pan (`d3.zoom`), «tilbake til portefølje»-knapp i fokus.
  - Respekter global `stratF`-filter og søk `q` (dim ikke-treff).
- Tegnforklaring (legend) i hjørnet: nodetyper, kanttyper, helsefarger.

## Fase 4 — Mini-kart i strategidetaljen

- I `vStrategyDetail`, over/ved siden av «What rests on it»: samme fokusmodus-graf i et panel (~340px høyt), forenklet — ingen zoom, kun hover + klikk-til-modal.
- Samme `buildGraph("focus", id)` og rendering-funksjon — én kodebane, to steder.
- «Expand»-knapp → hopper til Map-visningen i fokusmodus.

## Fase 5 — Polish og verifisering

- Tom-tilstander («No relations yet — add one from the strategy editor»).
- Ytelse er uproblematisk på denne datamengden; frys simuleringen etter stabilisering (`simulation.stop()` etter ~300 ticks) for ro i bildet.
- Tastaturnavigasjon: noder som fokuserbare elementer (appen har allerede `clickable()`-mønsteret med aria).
- Verifiser mot seed-data: st1 skal vise 3 assumptions, 3 decisions, 4 insights, 3 signaler; delt-innsikt-kant st1↔st2 skal *ikke* finnes (ingen deling i seed), eksplisitt relasjon st2 → st1 («TØFF enables Tet Vedtak»?) legges som eksempel.
- Sync: relasjoner lagres via eksisterende write-through-lag — ingen backend-endring.

## Byggerekkefølge

1. `relations`-felt + redigering i strategy-modal
2. `buildGraph()` med avledede kanter
3. `vMap()` porteføljemodus
4. Fokusmodus + klikk-til-modal
5. Mini-kart i `vStrategyDetail`
6. Legend, tomtilstander, verifisering mot seed

Estimat: alt lever i `app.html`, ~400–500 nye linjer totalt. Punkt 1–2 kan verifiseres i konsollen før noe tegnes.
