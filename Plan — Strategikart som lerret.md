# Plan — Strategikart som lerret
> Relatert: [[Plan — Interaktivt strategikart]] · [[Plan — Goals & Outcomes]] · [[Plan — Rammeverk-router & lenser]] · [[Backend Setup — Supabase]] · `canvas-prototype.html` · `app.html`
> Status: **Prototype bygget** (2026-09-09). Ikke i `app.html` ennå.

## Hvorfor
Dagens `vMap()` er et *diagram*: D3-force plasserer nodene, du kan se på det og klikke deg videre, men du kan ikke jobbe i det. Kartet er heller ikke ett kart — det er to moduser (portefølje / fokus) som du hopper mellom, og du mister konteksten hver gang.

Ønsket: **ett lerret** som holder elementer fra Retning (mål, utfall) og Registrene (innsikter, antakelser, signaler, beslutninger) sammen med strategiene, der du selv bestemmer hva som ligger der og hvor.

## Tre skiftene
| Fra | Til |
|---|---|
| Force-simulering plasserer nodene | **Du** plasserer dem; posisjonen huskes |
| Kartet viser alt som finnes | Kartet viser **det du har lagt inn** — lerretet er kuratert |
| Portefølje-modus / fokus-modus | Ett lerret + lagbrytere per elementtype |

## Prototypen — `canvas-prototype.html`
Egen fil, samme designtokens som `app.html`, ekte `SEED`-data (30 elementer, 31 relasjoner) spleiset inn direkte fra `app.html` så den ikke driver fra sannheten.

**Det som virker:**
- **Skuffen** til høyre: alt som ikke ligger på lerretet, gruppert i Retning / Strategier / Registre, med søk. Dra ut på lerretet, eller klikk for å plassere ved siden av naboen sin.
- **Foreslått** øverst i skuffen: elementer som kobler til noe som allerede ligger der, sortert etter antall koblinger. Dette er lerretets viktigste enkeltmekanisme — den gjør *hva mangler her* til en liste i stedet for et minnespill.
- **Lagbrytere** i toppen: Mål · Utfall | Strategi | Innsikt · Antakelse · Signal · Beslutning. Slipper du inn et element i et slukket lag, tenner laget seg.
- **Koblingene tegner seg selv** når to elementer som hører sammen ligger på lerretet: `tjener`, `hører til`, `måler`, `bærer`, `mater`, `overvåker`, `hviler på`. Kantfarge = tilstand (samme `stateColor`-logikk som i dag). Heltrukket = erklært, stiplet = avledet.
- **Rydd opp**: legger alt i lag (Mål → Utfall → Strategier → Antakelser → Innsikt/Signal/Beslutning), sorterer hvert lag etter naboens x for færre kryssende linjer, brekker og sentrerer brede rader.
- **Hent naboer**: trekker inn alt som henger direkte sammen med det som ligger der — én knapp fra «tre strategier» til «hele bildet».
- Klikk en node → naboene beholder full farge, resten toner ned. Panorer, zoom, tilpass til vindu. Posisjon, lag og zoom huskes i `localStorage` (i appen: `pos` på entiteten).

**Det som ikke er med (bevisst, første runde):**
- Dra-for-å-koble (erklære relasjoner ved å trekke en linje)
- Sidepanel-inspektør (redigere uten å forlate lerretet)
- Opprette nye entiteter fra lerretet

## Datamodell for veien inn i `app.html`
Ingen schemaendring i Supabase — samme triks som `relations`:
```js
pos: { x: 420, y: 300 }   // valgfritt felt på alle entiteter; «ligger på lerretet» = har pos
```
Alternativ som bør vurderes: ett `canvas`-objekt per bruker (`{placed:{id:{x,y}}, layers:{}}`) i stedet for `pos` per entitet. Fordelen er at man senere kan ha **flere lerret** (ett per gjennomgang, ett per eierforum) uten at entitetene drar posisjon med seg. Anbefaling: gå for `canvas`-objektet.

## Byggerekkefølge inn i `app.html`
1. `canvas`-modell + lagring gjennom eksisterende write-through (`save()`)
2. `vMap()` skrives om: HTML-kort i et transformert `.world` + SVG-kantlag under (erstatter D3-force; D3-avhengigheten i linje 8 kan da fjernes hvis ingen andre bruker den)
3. Skuffen med Foreslått-gruppen
4. Lagbrytere + Rydd opp + Hent naboer
5. Mini-kartet i `vStrategyDetail` → et *utsnitt* av lerretet (strategien + naboene), samme kodebane
6. i18n: alle nye strenger inn i `EN`/`NO`-tabellene

## Åpne spørsmål
- Skal fokusmodus overleve som *filter* i samme lerret, eller helt forsvinne? (Prototypen har den ikke.)
- Ett lerret per bruker, eller flere navngitte lerret? Se datamodell over.
- Mini-kartet i strategidetaljen: utsnitt av lerretet, eller fortsatt auto-layout?
