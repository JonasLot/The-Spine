# Designsystem — Studio Operator
> Relatert: [[Plan — Strategikart som lerret]] · [[Plan — Interaktivt strategikart]] · [[Språkvelger — i18n status]] · [[Test — Strategikart (manuell)]] · [[Backend Setup — Supabase]]
> Rolige verktøy for studioer som leverer. Varmt papir, nesten svart blekk, og én oransje som viser hvor du er.

## Hvor det bor
- **`spine-tokens.css`** — tokens (lyst og mørkt lag) for `index.html`, `login.html` og `s.html`.
- **`app.html`** — samme `:root`-blokk limt inn i `<style>`, fordi appen er én fil uten byggsteg.
- `test/signal.test.mjs` feiler hvis de to blokkene (lys `:root` og mørkt lag) ikke er identiske, eller hvis et mørkt token mangler lyst motstykke. Endre token ett sted, kopier til det andre.
- Gamle navn (`--bg`, `--panel`, `--accent-soft`, `--good` …) er beholdt som aliaser nederst i `:root`. Ikke bruk dem i nytt arbeid.
- `canvas-prototype.html` er det opprinnelige lerretsprototypet (lerretet er nå bygget i `app.html`). Det er ikke flyttet over til systemet.

## Farge
| Token | Verdi | Brukes til |
|---|---|---|
| `canvas` | `#F6F3EC` | siden, rad-hover |
| `surface` | `#FDFCFA` | kort, felt, tabeller, 1px `line` |
| `line` | `#E4DFD3` | kanter |
| `subtle` | `#E9E4D8` | 3px fokusring |
| `well` | `#EDE9E0` | tellechip, innfelte flater |
| `ink` → `ink-4` | `#1C1917` `#44403C` `#55504A` `#6B655B` | overskrifter og verdier · nav og brødtekst · sekundær og tabellhoder · bildetekster |
| `ink-5` | `#A39C90` | kun plassholdere og fokuskant |
| `action` | `#1C1917` | eneste knappefyll. Ett primærvalg per skjerm |
| `accent` / `accent-tint` | `#B03E07` / `#FCEBDD` | sted, aldri handling: aktiv nav og logomerket |
| `danger` `warning` `success` `info` | mørk tone + `-tint` | fremhevinger: tint som bakgrunn, mørk tone som tekst |
| `st-*` | tolv stadiefarger | kun merker: 6px prikker, 2–3px streker |

Kontrast sjekket: `ink-4` på `canvas` 5,2:1, `accent` på `accent-tint` 5,1:1, `danger` på `danger-tint` 6,0:1.

## Typografi
Inter overalt, tette bokstavavstander på store størrelser (`-.025em` til `-.04em`), tabellsiffer på alle tall i kolonner. Versaler med bokstavavstand brukes bare i tabellhoder og sidebar-grupper.

## Rom, radius, dybde
4px-rutenett. 16 inni kort, 24 mellom relaterte blokker, 48 mellom seksjoner. Radius vokser med beholderen: chip 4, knapp og nav 8, kort og tabell 12, composer 16. Høyde er en hårstrek (`0 1px 2px rgba(28,25,23,.04)`); ekte skygge bare for skuff, modal, meldinger og menyer.

## Komponenter
- **Knapper** — `.btn` (secondary), `.btn.pri` (ink), `.btn.quiet`, `.btn.danger`. Høyder `.sm` 28 · standard 36 · `.lg` 44.
- **Felt** — 36px, `line`-kant. Fokus: `ink-5`-kant og 3px `subtle`-ring. Feil: `.is-error` (danger-kant, `danger-tint`-ring) pluss `.field-msg` som sier hva du gjør.
- **Status** — `.badge`: prikk og etikett, ingen fyll. **Tellechip** — `.chip`: `well`, `ink-4`, radius 4.
- **Nøkkeltall** — `.metrics`: `.metric-lead` for det som krever handling, stort; resten i `.dl` som definisjonsliste. Ikke like fliser.
- **Tabeller** — store bokstaver i topprad, 60px rader, tall høyrejustert (`.r`), hover = `canvas`.

## Bevegelse
Fargeoverganger 150 ms. Trykk gir `scale(.97)` på 150 ms med `cubic-bezier(0.23, 1, 0.32, 1)`. Egenskaper navngis; aldri `transition: all` (testet).

## Stemme
Rolig, konkret, på studioets side. Si hva som skjer videre («Ingenting krever handling. Signaler og antakelser står som du har satt dem.»), navngi grensene til et tall (hver nøkkelrad forteller hva den ikke teller), betrygg én gang og stille. Ingen utropstegn, ingen emoji.

## Mørkt papir
Samme roller, varm stein i stedet for papir: `canvas #171513`, `surface #1F1C19`, `ink #F4F1EA`, `accent #F59A62`. `action` snur til lys fyll med mørk tekst, så ink fortsatt er eneste knappefyll. Tinter er dype og varme; tekst på tint holder 6:1 eller mer.
- Laget ligger bak `@media screen`, slik at utskrift av delingssiden alltid blir lys.
- Tema velges før CSS lastes: lagret valg (`spine.theme`), ellers systemets `prefers-color-scheme`. Bryter i appens topplinje, forsiden og innloggingen. `s.html` følger bare valget.

## Bevisste valg
- Stadiefarger er merker. De gamle tonede flatene og fargede etikettene på lerret, familiekort og chips er byttet mot prikk eller strek med nøytral tekst.
- Segmentvalg og valgte noder bruker blekk (kant), ikke oransje. Oransje står kun for sted: aktiv nav, aktiv fane og logomerket.
