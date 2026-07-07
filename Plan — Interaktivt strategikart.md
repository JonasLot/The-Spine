# Plan — Interaktivt strategikart
> Relatert: [[Backend Setup — Supabase]] · `app.html` · `supabase-schema.sql`
> Status: **Ferdig bygget og verifisert** (2026-07-07). Alle seks punkter i byggerekkefølgen lever i `app.html`.

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

## Fase 1 — Datamodell (liten) ✅
Nytt valgfritt felt på strategy-objektet (JSONB — ingen schemaendring i Supabase):
```js
relations: [
  { to: "st2", type: "depends-on" },   // depends-on | enables | tension | related
]
```
- Redigeres i eksisterende `editEntry`-modal for strategies (form-type `rels`, `buildForm` ~linje 1740): strategi-velger + type-velger + fjern-knapp.
- `depends-on` og `enables` er retningsbestemte; `tension` og `related` er symmetriske (`REL_TYPES` ~linje 1201).
- Rydding ved sletting: `DB.strategies.forEach(s=>{ if(s.relations) s.relations=s.relations.filter(r=>r.to!==id); })` (~linje 1813).

## Fase 2 — Grafbygger (ren funksjon) ✅
`buildGraph(mode, focusId)` → `{ nodes, links }` fra `DB` (~linje 1231). Ingen rendering — testbar isolert.
- **Porteføljemodus:** noder = strategier; eksplisitte relasjoner (heltrukket, pilhode, type-label) + avledede delinger (stiplet, «shares N») via `stratObjectSet()`. Nodestørrelse ∝ tilknyttede objekter; flashing-ring etter helse.
- **Fokusmodus:** sentrum = strategien; ringer med assumptions/insights/decisions/signals. Kantfarge etter tilstand (`stateColor`).

## Fase 3 — Map-visningen ✅
- Nav-item `data-view="map"` + `vMap()` (~linje 1383), crumb «Strategy Map».
- D3 v7 fra cdnjs (`app.html` linje 8).
- SVG med appens CSS-variabler. Zoom/pan, dra, hover-nabolagshighlight, klikk node (portefølje → fokus), «tilbake til portefølje»-knapp, legend i hjørnet.

## Fase 4 — Mini-kart i strategidetaljen ✅
- `vStrategyDetail` (~linje 919): samme `buildGraph("focus", id)` + `renderGraph(..., {mini:true})` — én kodebane, to steder. «Open strategy»/expand hopper til Map-visningen i fokusmodus.

## Fase 5 — Polish og verifisering ✅
- Tom-tilstander og map-hint på plass; simuleringen fryses (`sim.stop()` etter ~4s).
- Tastaturnavigasjon: noder er `role=button`, `tabindex=0`, Enter/Space aktiverer.

### Verifisering mot seed (kjørt 2026-07-07, ekte `buildGraph`-logikk i Node)
| Sjekk | Forventet (plan) | Faktisk | Merknad |
|---|---|---|---|
| st1 fokus — assumptions | 4 | 4 | ✓ (planens opprinnelige «3» var utdatert — a5 lagt til i seed senere) |
| st1 fokus — decisions | 3 | 3 | ✓ |
| st1 fokus — insights | 4 | 4 | ✓ |
| st1 fokus — signals | 3 | 3 | ✓ |
| Avledet kant st1↔st2 | finnes ikke | 0 avledede kanter | ✓ ingen deling i seed |
| Eksplisitt st2 → st1 «enables» | eksempel | finnes | ✓ |
| Flashing per strategi | — | st1:2, st2:0, st3:1 | s1 disagreeing + s2 drifting (st1), s4 drifting (st3) |

Konklusjon: implementasjonen matcher planen fullt ut. Tallet er rettet fra planens opprinnelige «3 assumptions» til 4 (st1 har fire assumptions siden `a5` ble lagt til i seed).

## Byggerekkefølge (alle utført)
1. ✅ `relations`-felt + redigering i strategy-modal
2. ✅ `buildGraph()` med avledede kanter
3. ✅ `vMap()` porteføljemodus
4. ✅ Fokusmodus + klikk-til-modal
5. ✅ Mini-kart i `vStrategyDetail`
6. ✅ Legend, tomtilstander, verifisering mot seed

Alt lever i `app.html`. Sync via eksisterende write-through-lag — ingen backend-endring.
