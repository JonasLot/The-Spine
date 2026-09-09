# Plan — Rammeverk-router & lenser

> Relatert: [[Plan — Signalhistorikk & tilstandsforslag]] · [[Plan — Goals & Outcomes]] · [[Plan — Import & opplasting]] · `app.html` · `index.html`
> Status: **Ikke startet** (2026-09-08). Utløst av konkurranseanalyse mot StrategyOS.

## Hvorfor

Landingssiden lover to ting appen ikke leverer:

> «One spine and **a router that sends you to the one framework the problem needs** — not all seven.»
> «Each lens reduced to its operative anatomy, each with **a 'failure smell'** that tells you when you're doing it wrong.»

I `app.html`:
- `STRAT_FW` har fem rammeverk. Den brukes to steder — begge er `fwL()`, som kun rendrer et navn i en chip.
- `FIELDS.strategies` gir **samme fem seksjoner uansett valg**: challenge / approach / moves / notDoing / howKnow. Det er Kernel-formet.
- `exportStrategy` skriver de samme fem overskriftene uansett `framework`.
- Ordet `smell` finnes 0 ganger i filen. Ordet `router` finnes 0 ganger.

Velger du «Wardley Map» får du Rumelts kernel-skjema med en annen etikett på. Det er nøyaktig samme svakhet som StrategyOS' «Strategy Card», der Framework er en dropdown som ikke endrer noen felt — bare mindre, fordi du har færre rammeverk.

**Dette er det billigste troverdighetstapet i produktet.** Alt annet holder det siden lover. Dette gjør det ikke, og en kjøper som prøver appen før han kjøper, oppdager det i løpet av femten sekunder.

## Den arkitektoniske avgjørelsen

Den åpenbare fiksen — «bytt feltene ut når rammeverket endres» — er feil, av tre grunner:

1. **Den ødelegger nedstrøms.** `exportStrategy`, `parseOneStrategyMd`, `vStrategyDetail`, `spineFlow` og grafen leser alle `challenge`/`approach`/`moves`/`notDoing`/`howKnow`. Å gjøre kroppen rammeverk-avhengig river opp import/eksport, som nettopp er ferdigstilt i [[Plan — Import & opplasting]].
2. **Den ødelegger det kanoniske artefaktet.** Hvis en Wardley-strategi og en Kernel-strategi har ulik form, finnes det ikke lenger «one canonical artifact everyone points to». Da har du en mappe med ulike dokumenter — som er det siden anklager alle andre for.
3. **Den er feil metodisk.** Wardley Map er ikke en *strategi*. Det er en måte å se situasjonen på. Pre-mortem er ikke en strategi — det er en stresstest av en. De er **linser du bruker for å komme frem til** kernelen, ikke alternative former for den.

### Løsningen: lensen mater artefaktet

```
     LENS                          ARTEFAKTET
  (arbeidsflaten)                (det kanoniske)
                                       
  Wardley-kartlegging  ─┐
  Pre-mortem           ─┼──► challenge · approach · moves
  P2W-kaskade          ─┤     notDoing · howKnow
  Kernel-diagnose      ─┘
                              (uendret — én form, alltid)
```

- **Artefaktet** — de fem seksjonene — er uendret. Én form for alle strategier. Eksport, import, graf, detaljvisning: null endring.
- **Lensen** er en ny, valgfri arbeidsflate på strategien. Rammeverk-spesifikke felt, rammeverk-spesifikke spørsmål, og en **failure smell** som selvtest.
- **Routeren** er en kort diagnostisk flyt som velger lensen ut fra problemet — ikke ut fra hvilket rammeverk du liker best.

Dette leverer begge løftene på siden bokstavelig, uten å røre en eneste eksisterende kodesti. `framework` går fra å være en etikett til å være en peker inn i `LENSES`.

## Datamodell

`framework` beholdes på strategien (bakoverkompatibel, import fungerer). Ny valgfri nøkkel:

```js
{
  // ...eksisterende strategi-felt uendret
  framework: "wardley",
  lens: {
    type: "wardley",
    fields: {                       // rammeverk-spesifikke, fri form per lens
      users:   ["Saksbehandler i PTA", "Foresatt"],
      needs:   ["Vedtak innen frist", "Forutsigbar skoleskyss"],
      chain:   "…",
      evolution: "…"
    },
    smellChecked: "2026-09-08",     // dato brukeren sist kjørte selvtesten
    smellFlags:  ["no-movement"]    // hvilke lukter som slo ut
  }
}
```

`lens` er valgfri. Strategier uten den oppfører seg nøyaktig som i dag. Ingen migrering, ingen schemaendring — `strategies` er allerede JSONB.

## `LENSES` — den nye konstanten

Erstatter `STRAT_FW` (behold `STRAT_FW` som avledet map for `fwL()`, så ingenting knekker).

```js
const LENSES = {
  kernel: {
    label:  "Strategy Kernel",
    when:   "Du vet at noe er galt, men ikke hva. Start her når diagnosen mangler.",
    anatomy:"Diagnose → guiding policy → koherente handlinger.",
    fields: [
      {k:"diagnosis", l:"Diagnose", t:"textarea",
       ph:"Hva er den kritiske vanskeligheten? Ikke målet — hindringen."},
      {k:"policy", l:"Guiding policy", t:"textarea",
       ph:"Den generelle tilnærmingen som møter diagnosen."},
      {k:"actions", l:"Koherente handlinger", t:"lines",
       ph:"Én per linje. De må støtte hverandre, ikke bare policyen."},
    ],
    smells: [
      {k:"goal-as-diagnosis", q:"Er diagnosen egentlig et mål i forkledning?",
       why:"«Vi må bli mer datadrevne» er en ambisjon, ikke en vanskelighet."},
      {k:"incoherent", q:"Trekker to av handlingene i hver sin retning?",
       why:"Koherens er hele poenget. Ellers er det en liste, ikke en strategi."},
      {k:"no-tradeoff", q:"Er det noe du velger bort?",
       why:"En strategi uten avkall er et budsjett."},
    ],
    // hvordan lensen mater artefaktet
    derive: L => ({challenge:L.diagnosis, approach:L.policy, moves:L.actions}),
  },

  wardley: {
    label:  "Wardley Map",
    when:   "Du vet hva som er galt, men ikke hvor i kjeden du skal handle.",
    anatomy:"Bruker → behov → verdikjede → evolusjonsstadium.",
    fields: [
      {k:"users",     l:"Brukere",       t:"lines"},
      {k:"needs",     l:"Behov",         t:"lines"},
      {k:"chain",     l:"Verdikjede",    t:"textarea", ph:"Komponent → hva den hviler på"},
      {k:"evolution", l:"Evolusjon",     t:"textarea", ph:"Genesis / custom / product / commodity — hvor står hver komponent?"},
      {k:"movement",  l:"Bevegelse",     t:"textarea", ph:"Hva flytter seg, og hvor fort?"},
    ],
    smells: [
      {k:"no-movement", q:"Har du sagt noe om bevegelse?",
       why:"Et kart uten evolusjon er et arkitekturdiagram."},
      {k:"no-user", q:"Er brukeren en ekte person, ikke «virksomheten»?",
       why:"Ankeret er en bruker med et behov. Uten det flyter kartet."},
    ],
    derive: L => ({challenge:L.chain, approach:L.movement}),
  },

  cascade: {
    label:  "Playing-to-Win Cascade",
    when:   "Diagnosen er klar, og valget står mellom flere veier.",
    anatomy:"Vinnende ambisjon → hvor → hvordan → evner → systemer.",
    fields: [
      {k:"ambition",   l:"Vinnende ambisjon", t:"textarea"},
      {k:"where",      l:"Hvor spiller vi",   t:"lines"},
      {k:"how",        l:"Hvordan vinner vi", t:"textarea"},
      {k:"capability", l:"Nødvendige evner",  t:"lines"},
      {k:"systems",    l:"Styringssystemer",  t:"lines"},
    ],
    smells: [
      {k:"where-is-everywhere", q:"Er «hvor» alle steder?",
       why:"Hvis du spiller overalt, har du ikke valgt."},
      {k:"how-is-better", q:"Er «hvordan» bare «bedre enn de andre»?",
       why:"Det er en ambisjon. Hvordan er en mekanisme."},
    ],
    derive: L => ({approach:L.how, moves:L.where}),
  },

  premortem: {
    label:  "Pre-mortem",
    when:   "Beslutningen er tatt. Du vil vite hvordan den dør før den gjør det.",
    anatomy:"Anta fiasko → forklar hvorfor → gjør de forklaringene til antakelser.",
    fields: [
      {k:"failure", l:"Det er 12 måneder frem. Det gikk galt. Hva skjedde?", t:"textarea"},
      {k:"causes",  l:"Årsaker",   t:"lines", ph:"Én per linje — hver blir en kandidat til antakelsesregisteret"},
      {k:"earliest",l:"Tidligste varsel", t:"lines", ph:"Hva ville du sett først? Hver blir et signal."},
    ],
    smells: [
      {k:"external-only", q:"Er alle årsakene utenfor din kontroll?",
       why:"Da har du skrevet en unnskyldning, ikke en pre-mortem."},
      {k:"no-signal", q:"Har hver årsak et tidligste varsel?",
       why:"En årsak uten varsel kan ikke overvåkes. Da er den pynt."},
    ],
    derive: L => ({notDoing:[], howKnow:L.earliest}),
    // Spesialtilfelle: se «Pre-mortem → registre» under.
  },

  "one-pager": {
    label:  "One-Page Strategy",
    when:   "Tenkningen er ferdig. Du skal bare skrive den ned.",
    anatomy:"Ingen lens — du skriver artefaktet direkte.",
    fields: [],
    smells: [
      {k:"adjectives", q:"Inneholder noen av de store trekkene et adjektiv som «bedre» eller «mer effektiv»?",
       why:"«Goals with adjectives» — det er det vi står imot."},
    ],
    derive: () => ({}),
  },
};
```

Merk at `one-pager` bevisst har tom `fields`. Det er ikke en lens — det er å hoppe over lensen, og det skal være et legitimt valg for målgruppen som «already knows the theory».

## Routeren

Tre spørsmål, ikke en wizard. Vises når en ny strategi opprettes, med en synlig «hopp over — jeg vet hvilken jeg vil ha»-utgang.

```js
function routeLens(a){
  if(a.q1 === "unclear-problem")               return "kernel";
  if(a.q1 === "unclear-where")                 return "wardley";
  if(a.q1 === "choosing-between")              return "cascade";
  if(a.q1 === "decided" && a.q2 === "risky")   return "premortem";
  return "one-pager";
}
```

**Spørsmål 1 — Hvor står du?**
- Jeg vet at noe er galt, men ikke hva → *Kernel*
- Jeg vet hva som er galt, men ikke hvor jeg skal handle → *Wardley*
- Jeg står mellom flere veier → *Cascade*
- Valget er tatt → spørsmål 2

**Spørsmål 2 — Hva står på spill?**
- Mye, og jeg er ikke trygg → *Pre-mortem*
- Det er greit — jeg skal bare skrive det ned → *One-pager*

Resultatskjermen sier hvilken lens, **hvorfor** (`when`-teksten), og hva den består av (`anatomy`) — og lar deg overstyre. Routeren skal aldri føles som en port. Den skal føles som en kollega som sier «prøv denne».

## Failure smells — selvtesten

Dette er den delen som gir mest troverdighet per kodelinje, og den er nesten gratis.

I `vStrategyDetail`, under artefaktet: et panel *«Selvtest — [lens-navn]»* med lensens `smells` som avkrysningsspørsmål. Ikke en score. Ikke en blokkering. Bare spørsmålene, med `why` som utfellbar begrunnelse.

- Krysser du av på en lukt, lagres den i `lens.smellFlags` og vises som en dempet advarsel på strategikortet i `vStrategies`.
- `lens.smellChecked` gir en dato: *«Selvtestet 2026-09-08»* — eller *«Aldri selvtestet»*, som i seg selv er informasjon.
- På `vDashboard`: strategier med uadresserte lukter kan telles i review-radaren ved siden av forfalte reviews.

Dette er det ene stedet der produktet kan si noe ubehagelig til brukeren om hans egen tenkning. Det er verdt mye. StrategyOS har ingenting i nærheten.

## Pre-mortem → registre (spesialtilfellet)

Pre-mortem-lensen produserer naturlig det som skal inn i to registre:
- hver `causes`-linje er en kandidat-**antakelse** (invertert: «X vil ikke skje»)
- hver `earliest`-linje er et kandidat-**signal**

En knapp *«Send til registrene»* som åpner en gjennomgangsliste (samme mønster som `startImportReview` i [[Plan — Import & opplasting]] — den mekanikken finnes allerede) der brukeren huker av hva som skal opprettes, og signalene automatisk kobles til antakelsene de kom fra.

Det er sløyfen som lukker seg på den mest synlige måten produktet har: en times pre-mortem blir et bemannet antakelsesregister. **Dette alene er verdt en seksjon på landingssiden.**

## Faser

**Fase 1 — `LENSES` + selvtest.** Konstanten, `smells`-panelet i `vStrategyDetail`, `smellFlags`/`smellChecked` på strategien. Ingen routing, ingen nye redigeringsfelt. Leverer «failure smell»-løftet alene.
*Minst risiko, mest troverdighet per time.*

**Fase 2 — lens-arbeidsflate.** Ny fane/seksjon i `vStrategyDetail` som rendrer `LENSES[fw].fields` via en gjenbrukt `buildForm`-variant, lagret i `lens.fields`. `derive`-knapp som fyller tomme artefakt-seksjoner (**aldri overskriv utfylt tekst** — vis en diff-lignende bekreftelse hvis feltet har innhold).

**Fase 3 — routeren.** Tre-spørsmålsflyten ved ny strategi, med skip.

**Fase 4 — pre-mortem → registre.** Gjenbruk av import-gjennomgangen.

## Verifisering

- Eksisterende seed-strategier (`st1` kernel, `st2` premortem, `st3` one-pager) må rendre **identisk** før og etter fase 1 og 2, bortsett fra det nye selvtest-panelet.
- `exportStrategy` og `parseOneStrategyMd` round-trip: eksporter st2, importer den igjen, sammenlign. `lens` skal enten følge med i frontmatter eller falle rent bort — bestem hvilken, ikke la det være tilfeldig.
- `normalizeEntity` forkaster i dag ukjente felt med en advarsel. `lens` er ikke i `FIELDS.strategies` og vil bli forkastet ved import. **Må håndteres eksplisitt** — enten som et unntak i `normalizeEntity`, eller ved å legge `lens` inn som en egen felttype.
- Norsk: alle `when`/`anatomy`/`smells`-tekster må inn i `T.no`. Dette er den største oversettelsesjobben i planen — vurder å legge lens-tekstene i egne `LENSES_NO`-overlays fremfor flate `t()`-nøkler, siden de er lange og strukturerte (samme mønster som `SYS_NO`/`FAM_NO`).

## Konsekvens for landingssiden

Uansett om alle fasene bygges: **siden må stemme med appen fra dag én.** I dag lover den «seven frameworks» og en router; appen har fem etiketter og ingen router.

Etter fase 1 kan siden ærlig si «fem linser, hver med sin failure smell». Etter fase 3 kan den si «en router som sender deg til den ene». Før det bør formuleringen flyttes til å beskrive vaulten eksplisitt («vaulten har syv rammeverk; appen har fem linser»), ikke appen.

Det er den eneste delen av dette som haster.
