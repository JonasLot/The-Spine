# Plan — Signalhistorikk & tilstandsforslag

> Relatert: [[Plan — Goals & Outcomes]] · [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · [[Språkvelger — i18n status]] · `app.html`
> Status: **Ikke startet** (2026-09-08). Utløst av konkurranseanalyse mot StrategyOS.

## Hvorfor

Landingssiden lover: *«Track → reality disagrees → back to Understand.»* Appen kan ikke oppdage at virkeligheten er uenig. Den venter på at brukeren skal si det.

Konkret i dagens kode:

- `expected_shape` er prosa: `"≥80% self-onboard by week 4."` — lesbart for mennesker, ugjennomtrengelig for appen.
- `log:[{d,t}]` finnes allerede (seedet, rendret i `openSignal`, skrevet av `reviewSignalCard`, eksportert av `mdSignal`) — men `t` er fritekst. Ingen verdi, ingen enhet, ingen sammenlignbarhet.
- `state` settes utelukkende manuelt, av mennesket, i review-kortet.
- Null treff på `chart`, `trend`, `history`, `sparkline` i `app.html`.

Signal s4 illustrerer hullet perfekt. Loggen sier `71 % ved uke 2` → `62 % ved uke 4`, forventet form er `≥80 %`. Appen har all informasjon som skal til for å si «dette driver nedover og under terskel» — og sier ingenting. Et menneske måtte lese to logglinjer og huske terskelen.

**Dette er det største gapet mellom løfte og produkt.** Det er også det billigste å lukke, fordi logg-strukturen allerede er der. Dette er en utvidelse, ikke et nytt lag.

## Designprinsipp — foreslå, aldri overstyr

Appen skal aldri sette `state` selv. Den skal si *«jeg tror denne har gått fra agreeing til drifting — er du enig?»* og la mennesket bekrefte.

Tre grunner:
1. Et signal kan bryte terskel av en grunn som ikke betyr noe (ferie, målefeil, én dårlig uke).
2. Automatisk state-endring uten menneskelig blikk gjenoppfinner nettopp KPI-dashboardet produktet er imot.
3. Bekreftelsen *er* review-arbeidet. Å fjerne den fjerner ritualet.

Forslaget er en **prompt**, ikke en **beslutning**. Det er hele skillet mot StrategyOS.

## Datamodell

### Utvidet logg-oppføring — bakoverkompatibel

```js
// I dag
{d:"2026-06-12", t:"62% at week 4. Drifting below the ≥80% expected shape."}

// Etter
{d:"2026-06-12", t:"62 % ved uke 4.", v:62}
```

`v` er valgfri. Oppføringer uten `v` er fortsatt gyldige og rendres som i dag — kvalitative signaler (DPIA godkjent / ikke godkjent) skal fortsatt kunne logges som ren tekst. Ingen migrering nødvendig; seed-loggene kan få `v` lagt til der det gir mening (s4: 71, 62 — s1: 90).

### Nye felt på signal-objektet

```js
{
  // ...eksisterende
  unit:   "%",          // valgfri: "%", "dager", "saker", "" (fritt)
  dir:    "up",         // up | down | flat  — hvilken vei er bra
  thresh: 80,           // valgfri tallterskel utledet av / satt ved siden av expected_shape
  band:   5,            // valgfri toleranse — innenfor ±band regnes som "på formen"
}
```

`expected_shape` **beholdes som prosa** og forblir det autoritative. `thresh`/`dir`/`band` er den maskinlesbare skyggen av den. Prosaen er det mennesker leser i det kanoniske artefaktet; tallene er det appen regner på. De skal ikke slås sammen.

Signaler uten `thresh` får ingen forslag — de oppfører seg nøyaktig som i dag. Dette er en opt-in-mekanikk per signal.

### `FIELDS.signals` — nye felt

```js
{k:"unit",   l:"Enhet",              t:"text", ph:"f.eks. %, dager, saker"},
{k:"dir",    l:"God retning",        t:"seg",  opts:["up","down","flat"]},
{k:"thresh", l:"Terskel (tall)",     t:"text", ph:"f.eks. 80 — tomt = ingen automatisk vurdering"},
{k:"band",   l:"Toleranse (±)",      t:"text", ph:"f.eks. 5"},
```

⚠️ `normalizeEntity` lagrer alt ikke-`lines`/`seg`/`ref` som `String(v)`. `thresh` og `band` må derfor parses med `Number()` ved bruk, ikke antas å være tall. Alternativt: legg til en `num`-felttype i `buildForm`/`normalizeEntity`. **Anbefaling: legg til `num`-typen** — den vil trengs igjen (outcomes har `target` og `baseline` med samme problem).

## Vurderingsregelen

```js
// Foreslår en state basert på de siste avlesningene. Returnerer null når
// den ikke har grunnlag — det er det vanligste og helt akseptable utfallet.
function suggestSignalState(s){
  const th = Number(s.thresh);
  if(!s.thresh || Number.isNaN(th)) return null;        // ingen terskel → ingen mening
  const pts = (s.log||[]).filter(r=>typeof r.v==="number")
                         .slice(0,3);                    // log er nyest-først (unshift)
  if(pts.length < 2) return null;                        // for lite historikk
  if(s.state === "retired") return null;                 // pensjonert = fredet

  const band = Number(s.band) || 0;
  const ok = v => s.dir === "down" ? v <= th + band
           : s.dir === "flat"      ? Math.abs(v - th) <= band
           :                         v >= th - band;

  const breaches = pts.filter(p => !ok(p.v)).length;

  // trend på tvers av de to nyeste
  const worse = s.dir === "down" ? pts[0].v > pts[1].v
              : s.dir === "flat" ? Math.abs(pts[0].v-th) > Math.abs(pts[1].v-th)
              :                    pts[0].v < pts[1].v;

  if(breaches >= 2)            return "disagreeing";     // brutt to ganger på rad
  if(breaches === 1 && worse)  return "drifting";        // brutt og på vei feil vei
  if(breaches === 0 && !worse) return "agreeing";
  return null;                                            // tvetydig — ikke mas
}
```

Regelen er bevisst konservativ. Den foreslår `disagreeing` bare ved to brudd på rad. Ett dårlig datapunkt gir maks `drifting`, og bare hvis trenden også peker feil vei. Falske positiver er dyrere enn falske negativer her — et forslag som viser seg feil to ganger, blir ignorert for alltid.

## Smitte til antakelsen (punkt 3 i analysen)

Når et signal bekreftes til `disagreeing`, er den antakelsen det overvåker per definisjon mistenkt. I dag må brukeren huske den koblingen selv — men koblingen er hele grunnen til at appen finnes.

```js
// Kjøres etter at brukeren har BEKREFTET en signal-state i reviewSignalCard.
function assumptionFollowUp(sig){
  if(!sig.watches) return null;
  const a = byId("assumptions", sig.watches);
  if(!a || a.state === "retired") return null;
  const want = sig.state === "disagreeing" ? "broken"
             : sig.state === "drifting"    ? "shaky"
             : null;
  if(!want) return null;
  const rank = {holding:0, shaky:1, broken:2};
  if((rank[a.state] ?? 0) >= rank[want]) return null;   // aldri nedgrader automatisk
  return {assumption:a, suggested:want};
}
```

Samme prinsipp: dette produserer et **kort i review-flyten**, ikke en skrivning. `vReview` steg 2 får antakelsen løftet inn med et forklarende bånd: *«Foreslått shaky fordi signalet «…» nå driver.»*

Merk `rank`-sjekken: smitten kan bare gjøre en antakelse mer usikker, aldri mindre. Et signal som går tilbake til `agreeing` reparerer ikke automatisk en `broken` bet — den vurderingen tilhører mennesket, og det er riktig.

## Sparkline

Ren inline-SVG, ingen bibliotek (`app.html` er én fil, og skal forbli det). ~25 linjer.

```js
function sparkline(s, w=120, h=28){
  const pts=(s.log||[]).filter(r=>typeof r.v==="number").slice(0,8).reverse();
  if(pts.length<2) return "";
  const vs=pts.map(p=>p.v), th=Number(s.thresh);
  const lo=Math.min(...vs, ...(Number.isNaN(th)?[]:[th]));
  const hi=Math.max(...vs, ...(Number.isNaN(th)?[]:[th]));
  const span=(hi-lo)||1;
  const x=i=>(i/(pts.length-1))*(w-2)+1;
  const y=v=>h-1-((v-lo)/span)*(h-2);
  const d=pts.map((p,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const thL=Number.isNaN(th)?"":
    `<line x1="0" y1="${y(th).toFixed(1)}" x2="${w}" y2="${y(th).toFixed(1)}"
           stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3" opacity=".55"/>`;
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
            role="img" aria-label="${esc(pts.length)} avlesninger, siste ${esc(vs[vs.length-1])}${esc(s.unit||"")}">
    ${thL}<path d="${d}" fill="none" stroke="${stateColor(s.state)}" stroke-width="1.75"
      stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x(pts.length-1).toFixed(1)}" cy="${y(vs[vs.length-1]).toFixed(1)}" r="2.5"
      fill="${stateColor(s.state)}"/></svg>`;
}
```

Terskelen tegnes som stiplet linje. Det er hele poenget med grafen: du ser linjen krysse.

`stateColor()` finnes allerede. Aksefri, tekstfri, ingen tooltip — dette er en sparkline, ikke et diagram. Tallene står i tabellen ved siden av.

## Faser

**Fase 1 — datamodell + manuell verdi**
`num`-felttype i `buildForm` og `normalizeEntity`. Nye felt i `FIELDS.signals`. `v` på loggoppføringer. Utvid `reviewSignalCard` med et smalt tallfelt ved siden av tekstfeltet. Seed får `v` der det finnes tall (s1: 90, s4: 71/62).
*Etter fase 1: ingenting ser annerledes ut, men dataene finnes.*

**Fase 2 — sparkline**
`sparkline()` inn i `vSignals`-tabellen (ny kolonne mellom «State» og «Latest»), i `openSignal`-drawer over reading log, og i `reviewSignalCard`. Ingen logikk, bare synlighet.
*Etter fase 2: du ser drift. Appen sier fortsatt ingenting.*

**Fase 3 — forslaget**
`suggestSignalState()`. I `reviewSignalCard`: når forslaget ≠ nåværende state, forhåndsvelg den foreslåtte knappen i `seg` og vis en linje over kontrollen: *«Foreslått: driver — 62 % mot forventet ≥80 %, andre brudd på rad.»* Brukeren kan overstyre med ett klikk før lagring. På `vDashboard`: en fjerde KPI-boks eller et bånd som teller signaler med et ubehandlet forslag.
*Etter fase 3: virkeligheten kan være uenig.*

**Fase 4 — smitte til antakelser**
`assumptionFollowUp()`. Antakelser med forslag løftes øverst i `vReview` steg 2 med forklarende bånd. `reviewDueCount` utvides til å telle disse.
*Etter fase 4: sløyfen lukker seg selv.*

Fase 1–2 er trygge og kan gå rett i produksjon. Fase 3 er den som endrer produktløftet. Fase 4 er den som gjør det til et instrument.

## Verifisering

Kjør i Node mot `SEED`, samme mønster som i [[Plan — Goals & Outcomes]]:

| Case | Signal | Forventet forslag |
|---|---|---|
| To brudd på rad, fallende | s4 (`71 → 62`, th 80, dir up) | `disagreeing` |
| Ett brudd, fallende | s4 med kun `62` | `drifting` |
| Ingen terskel | s2 (DPIA, kvalitativ) | `null` |
| Kun ett datapunkt | s3 | `null` |
| Pensjonert signal | hvilket som helst med `state:"retired"` | `null` |
| Smitte oppover | s4 → a6 `holding` | `{suggested:"shaky"}` |
| Smitte nedover blokkert | s4 satt `agreeing`, a6 `broken` | `null` |

Manuell test, i tillegg (jf. [[Test — Strategikart (manuell)]]):
- Logg en avlesning uten tall → ingen sparkline, ingen forslag, alt som før.
- Bytt til norsk → alle nye strenger oversatt, ingen `t()`-nøkler lekker rått.
- `expected_shape` som prosa uten `thresh` → signalet oppfører seg 100 % som i dag.

## i18n

Nye `T.en`/`T.no`-nøkler: `sig.unit`, `sig.dir`, `sig.thresh`, `sig.band`, `dir.up/down/flat`, `sug.prefix` («Foreslått»), `sug.reason.breach2`, `sug.reason.breach1`, `sug.reason.steady`, `sug.assumption` («Foreslått {state} fordi signalet driver»), `th.trend`, `kpi.pending` («Ubehandlede forslag»).

Merk at `L()`/`trView()` bare oversetter *seed*-felt som er urørt. Nye numeriske felt trenger ingen NO-overlay — tall er tall. Men `unit` bør inn i `SEED_NO` for s1/s4 hvis du bruker «saker»/«dager».

## Åpne spørsmål

1. Skal `thresh` kunne utledes automatisk fra `expected_shape` med et regex (`/([≥≤<>]=?)\s*(\d+([.,]\d+)?)\s*(%|dager|saker)?/`)? Fristende, men gjetting på prosa er nøyaktig den slags magi som gjør at folk slutter å stole på verktøyet. **Anbefaling: nei — men foreslå verdien i skjemaet når regexet treffer, med brukeren som bekrefter.** Samme prinsipp som resten av planen.
2. Skal loggen kunne redigeres/slettes? I dag kan den bare vokse. En feilført avlesning er ikke rettbar. Trolig ja, i `openSignal`-draweren, men det er en egen liten oppgave.
3. Bør `dir` default være `up`? De fleste signaler i seed er «høyere er bedre», men s1 (omgjøringsrate) og s3 (avbrudd) er motsatt. Default `up` vil gi feil forslag hvis brukeren ikke tenker seg om. **Vurder å gjøre `dir` obligatorisk når `thresh` er satt.**
