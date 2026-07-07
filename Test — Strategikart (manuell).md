# Test — Strategikart (manuell)
> Relatert: [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · `app.html`
> Kjør i nettleser etter innlogging. Bygger på seed-dataene (st1 Tet Vedtak, st2 TØFF, st3 On-Demand). Huk av underveis.

## 1. Porteføljemodus (nav → Strategy Map)
- [ ] Tre strateginoder vises: **Tet Vedtak**, **TØFF Migration**, **On-Demand Transit Planning**.
- [ ] Én heltrukket kant med pilhode fra **TØFF → Tet Vedtak**, label «enables».
- [ ] Ingen stiplede «shares N»-kanter (seed deler ingen objekter).
- [ ] Tet Vedtak har flashing-ring (2 flashing signaler); On-Demand har flashing-ring (1); TØFF har ingen.
- [ ] Nodestørrelse: Tet Vedtak størst (flest tilknyttede objekter).

## 2. Interaksjon i porteføljemodus
- [ ] **Hover** node → naboer uthevet, resten dimmes; forlat → alt tilbake til normal.
- [ ] **Dra** en node → den flytter seg, simulering roer seg og fryser.
- [ ] **Zoom/pan** (scroll + dra bakgrunn) → grafen skalerer/panorerer; dobbeltklikk zoomer *ikke*.
- [ ] **Klikk** Tet Vedtak-node → bytter til fokusmodus for den strategien.
- [ ] Legend synlig i hjørnet (strategy, declared relation, shared underpinnings, flashing).

## 3. Fokusmodus (etter klikk på Tet Vedtak)
- [ ] Sentrumsnode = Tet Vedtak, låst i midten.
- [ ] Ringer rundt: **4 assumptions** (A), **4 insights** (I), **3 decisions** (D), **3 signals** (S).
- [ ] Kausalkjede synlig: insight → assumption a1 → signal s1 (rød/disagreeing-kant) → decision d1 som hviler på a1.
- [ ] Kantfarge følger tilstand: s1 (disagreeing) og s2 (drifting) skiller seg ut med farge.
- [ ] TØFF vises som dimmet nabo-node med «enables»-kant (avledet fra relasjonen).
- [ ] **Klikk** en insight/decision/assumption/signal → riktig modal åpnes (`openInsight` osv.).
- [ ] **«Portfolio map»**-knapp → tilbake til porteføljen.
- [ ] **«Open strategy»**-knapp → åpner strategidetaljen.

## 4. Mini-kart i strategidetaljen (Strategies → Tet Vedtak)
- [ ] Fokusgraf vises i panelet (samme form som fokusmodus), ~380px høyt, ingen zoom.
- [ ] Hover fungerer; klikk node → modal åpnes.
- [ ] «Open»/expand-knapp → hopper til Map-visningen i fokusmodus for samme strategi.

## 5. Relasjonsredigering (Strategies → rediger TØFF)
- [ ] Feltet «Relates to other strategies» viser eksisterende relasjon: enables → Tet Vedtak.
- [ ] Legg til ny relasjon (velg strategi + type) → lagres; vises på kartet ved neste render.
- [ ] Fjern-knapp fjerner relasjonen.
- [ ] Slett en strategi → relasjoner som pekte på den forsvinner (ingen døde kanter på kartet).

## 6. Filter, søk og tomtilstander
- [ ] Sett `stratF`-filter til én strategi → ikke-treff dimmes på kartet.
- [ ] Ny/ren konto uten relasjoner → map-hint «No connections yet …» vises.
- [ ] Ingen strategier → «Nothing to map yet»-tomtilstand.
- [ ] D3 blokkert (offline) → «Map unavailable»-melding i stedet for tom skjerm.

## 7. Tastatur/tilgjengelighet
- [ ] Tab til en node → fokusring; **Enter/Space** aktiverer samme handling som klikk.
- [ ] Nodene har `aria-label` med type + navn.

---
Feil å notere: skriv linjenr./funksjon (`vMap`, `renderGraph`, `buildGraph`) ved siden av avkrysningen som feiler.
