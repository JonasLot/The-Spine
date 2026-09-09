# Plan — Strategikart som lerret
> Relatert: [[Plan — Interaktivt strategikart]] · [[Plan — Goals & Outcomes]] · [[Plan — Rammeverk-router & lenser]] · [[Plan — Delbar kanonisk strategi]] · [[Backend Setup — Supabase]] · `app.html` · `canvas-prototype.html`
> Status: **Bygget og verifisert i `app.html`** (2026-09-09), inkludert dra-for-å-koble. Prototypen ligger igjen som `canvas-prototype.html`.

## Hvorfor
Det gamle `vMap()` var et *diagram*: D3-force plasserte nodene, du kunne se på det og klikke deg videre, men ikke jobbe i det. Og det var ikke ett kart — det var to moduser (portefølje / fokus) du hoppet mellom, og mistet konteksten hver gang.

Nå er det **ett lerret** som holder Retning (mål, utfall), strategiene og Registrene (innsikt, antakelse, signal, beslutning) samtidig, der du selv bestemmer hva som ligger der og hvor.

## Tre skiftene
| Fra | Til |
|---|---|
| Force-simulering plasserte nodene | Du plasserer dem; posisjonen huskes |
| Kartet viste alt som fantes | Lerretet viser **det du har lagt inn** — det er kuratert |
| Portefølje-modus / fokus-modus | Ett lerret + lagbrytere per elementtype |

## Datamodell — ingen schemaendring i Supabase
```js
pos: { x: 420, y: 300 }   // valgfritt felt på ALLE entiteter
```
- **Å ha en `pos` er det samme som å ligge på lerretet.** Å ta noe av lerretet er å slette `pos` — oppføringen selv røres ikke.
- Posisjonen ligger på objektet, som er delt i organisasjonen. Altså: **ett lerret per organisasjon**, ett oppsett alle ser. Det er hele grunnen til at ett `pos`-felt holder — det finnes aldri to lerret som slåss om samme entitet.
- `PROFILE.canvas = {layers:{...}}` — hvilke lag som er tent. Lagres på kontoen (Supabase user-metadata) gjennom `saveProfile()`, debounced.
- Utsnittet (pan/zoom) er *personlig*, ikke delt, og ligger i `localStorage` under `spine.canvas.view`.

## Hva som lever i `app.html`
**Lerretet (`renderCanvas`, ~linje 2390):** én kodebane, to bruksmåter — full visning og utsnitt.
- **Skuffen** til høyre: alt som ikke ligger på lerretet, gruppert i Retning / Strategier / Registre, med søk. Dra ut, eller klikk for å plassere ved siden av naboen.
- **Foreslått** øverst i skuffen: elementer som kobler til noe som allerede ligger der, sortert etter antall koblinger. Lerretets viktigste enkeltmekanisme — den gjør «hva mangler her» til en liste i stedet for et minnespill.
- **Lagbrytere** i toppen. Slipper du inn et element i et slukket lag, tenner laget seg.
- **Koblingene tegner seg selv** fra dataene: `tjener`, `hører til`, `måler`, `bærer`, `mater`, `overvåker`, `hviler på`, pluss den avledede «deler N» mellom strategier som deler underlag. Kantfarge = tilstand (samme `stateColor` som før). Heltrukket = erklært, stiplet = avledet.
- **Rydd opp**: lag på lag (Mål → Utfall → Strategier → Antakelser → Innsikt/Signal/Beslutning), hvert lag sortert etter naboens x, brede rader brekkes og sentreres.
- **Hent naboer**: trekker inn alt som henger direkte sammen med det som ligger der.
- Klikk en node → naboene beholder farge, resten toner ned. Hover gir «åpne» og «ta av lerretet». Det globale strategifilteret demper det som hører til en annen strategi.
- Panorer, zoom (hjul eller knapper), tilpass til vindu.

**Mini-kartet i `vStrategyDetail`:** samme `renderCanvas`, men `{readonly:true, only:<strategien + naboene>}` — et *utsnitt av lerretet*, ikke en egen layout. Ligger ingenting av det på lerretet ennå, sier den det og tilbyr å legge det dit.

**Ryddet bort:** `buildGraph`, `renderGraph`, `mapLegend`, `openFromMap`, `KIND_COLOR`, den døde kart-CSS-en, `vh.map`/`map.nod3`/`map.empty`-nøklene — og **D3-avhengigheten** (`cdnjs`-script-tagget i `<head>`). Lerretet tegner selv, så appen har én CDN mindre å være avhengig av.

**i18n:** alle nye strenger i både `T.en` og `T.no` (`cv.*` og `rel.*`).

## Verifisering (Playwright mot seed, 2026-09-09)
| Sjekk | Resultat |
|---|---|
| Elementer tilgjengelig i skuffen | 30 (3 mål, 4 utfall, 3 strategier, 5 innsikter, 6 antakelser, 5 signaler, 4 beslutninger) |
| Koblinger når alt ligger på lerretet | 31, ingen hengende referanser |
| Lagbryter av/på (Innsikt) | 30 → 25 → 30 |
| Velg node | 1 valgt, 22 dempet |
| Ta av lerretet | 30 → 29, oppføringen beholdt |
| Åpne fra lerretet | registerskuffen åpner |
| Strategifilter | 9 kort dempet |
| Mini-kart i strategidetaljen | 8 noder, tilpasset innenfor rammen |
| JS-feil | ingen, i både norsk og engelsk |

Feil som ble funnet og rettet underveis: kortene ble målt før verten var i DOM-en (`offsetHeight` 0), så `fit()` regnet med kort uten høyde og kuttet nederste rad — nå måles de på nytt når scenen faktisk har fått en bredde (`ResizeObserver`).

## Runde 2 — dra for å koble
Lerretet er nå et sted du *bygger* strategien, ikke bare ordner den.

**Én tabell styrer alt.** `CV_LINKS` sier hvilke par som kan kobles, hvilken vei pilen går, og hvilket felt koblingen faktisk bor i. Både dra-for-å-koble, saksa på kanten og kanttegningen leser fra den samme tabellen — så det finnes ingen kobling du kan se men ikke lage, eller lage men ikke fjerne.

| Par | Bor i | Merknad |
|---|---|---|
| strategi → mål | `s.serves[]` | flere |
| utfall → mål | `o.goalId` | én |
| signal → utfall | `o.measuredBy` | én |
| antakelse → strategi | `a.strategy` | én |
| innsikt → antakelse | `i.feeds` | én |
| signal → antakelse | `s.watches` + `a.watchedBy` | speilet skrives bare når det står tomt — flere signaler kan overvåke samme bet |
| beslutning → antakelse | `d.rests[]` | flere |
| beslutning → strategi | `d.strategy` | eierskap; sperret når `rests` finnes |
| signal → strategi | `s.strategy` | eierskap; sperret når `watches` finnes |
| strategi ↔ strategi | `s.relations[]` | krever et typevalg |

**Interaksjonen:**
- Hvert kort får en prikk under seg når du holder over det. Dra fra den. Eget håndtak, ikke hele kortet, så det å flytte et kort og det å koble aldri kan forveksles.
- Mens du drar dempes alt som ikke kan ta imot koblingen. Du ser svaret *før* du slipper, ikke etterpå. Allerede koblede kort vises stiplet.
- Dra-retningen spiller ingen rolle. Pilen peker alltid dit datamodellen sier den skal.
- Strategi ↔ strategi åpner en liten velger — avhenger av / muliggjør / i spenning med / beslektet med. Den kan ingen gjette.
- Erstatter koblingen en enkeltverdi, står det i meldingen hva som ble erstattet. Ingen stille overskriving.
- **Angre** på hver kobling og hver klipp, i ni sekunder.
- Hold over en kant → en saks dukker opp på midten. Den er et HTML-element i scenens koordinater, ikke en SVG-form inne i lerretet — ellers ville den krympe med zoomen og bli umulig å treffe. Avledede kanter («deler N») har ingen saks; de er regnet ut, ikke erklært.

### Verifisering (Playwright mot seed)
| Sjekk | Resultat |
|---|---|
| Innsikt → antakelse | `feeds` satt, kant 31 → 32 |
| Angre | `feeds` tømt, kant 32 → 31 |
| Ulovlig par (innsikt → mål) | ingen gyldige mål, ingen skriving |
| Gyldige mål under draget | 6 av 29 (antakelsene), 23 dempet |
| Strategi ↔ strategi | velger med fire typer, `relations` skrevet |
| Erstatning av enkeltverdi | `o1.measuredBy` s1 → s3, meldingen navnga s1 |
| Klipp kobling | kant 31 → 30, angre gjenopprettet |
| Zoom, lagbrytere, filter, mini-kart | uendret |
| JS-feil | ingen |

**To ekte feil ble funnet og rettet:** panoreringen fanget pekeren på alt som ikke var et kort, så angre-knappen, zoom-knappene og saksa aldri fikk klikket sitt — nå slipper kontrollene unna eksplisitt. Og gummistrikken lå i et eget SVG-lag uten egen `viewBox`, altså usynlig; den tegnes nå rett inn i kantlaget som allerede har riktig koordinatsystem.

## Ikke med — bevisst
- **Sidepanel-inspektør** (redigere uten å forlate lerretet — i dag åpner registerskuffen)
- **Opprette nye entiteter fra lerretet**

## Avgjort
- **`pos` forkastes ved import.** `REF_FIELD_TYPES` og `normalizeEntity` tar den ikke med, så et importert element havner i skuffen og må plasseres bevisst. Det er riktig: en posisjon fra et annet lerret betyr ingenting på dette.

## Åpent
- Delt strategi (`s.html`): skal lerretsutsnittet være med i øyeblikksbildet?
