# Plan — Import & opplasting

> Relatert: [[Plan — Goals & Outcomes]] · [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · `app.html` · `supabase-schema.sql`
> Status: **Fase 0 + 1 levert** (2026-07-09) — strukturert import for `strategies` lever i `app.html`, verifisert i Node (21/21). Fase 2–4 (AI-spor + generalisering) gjenstår.

## Kort oppsummert
Spinen kan i dag bare *eksportere* (`.md` via Blob, `exportRegister` ~linje 1835, `exportStrategy` ~linje 1277). Alt innhold må skrives inn manuelt gjennom `saveForm` (~linje 2217). Denne planen legger til motsatt vei: **få eksisterende materiale inn** — enten som strukturert fil, eller som fritekst en modell tolker til ferdige entiteter du godkjenner før lagring.

To spor, samme mål:

1. **Strukturert import** — ren klientjobb. En `.json`-fil (eller den `.md`-en Spinen selv eksporterer) mappes direkte til entitetsmodellen, valideres mot `FIELDS`, og skyves gjennom eksisterende `save()`.
2. **AI-tolkning av fritekst** — du limer inn et notat, referat eller PDF-utdrag. En modell trekker ut kandidat-entiteter i Spinens JSON-form. Du får dem opp i et gjennomsyn (samme skjema som `saveForm`) og bekrefter før noe lagres.

**Pilot:** vi bygger begge spor for **én entitet** først, verifiserer hele kjeden (fil/tekst → parse → gjennomsyn → `save()` → `render()`), og generaliserer deretter til resten via `FIELDS`-drevet kode.

## Hvorfor
Terskelen for å ta Spinen i bruk er i dag «skriv alt på nytt». De fleste har allerede strategier, antagelser og beslutninger — i dokumenter, referater, gamle verktøy. Uten en vei inn står hele grafen tom til noen har tastet den manuelt, og hver ny strategi betyr fem–ti skjemaer fylt for hånd.

Import løser to distinkte behov som er lette å blande sammen:

- **Migrering / backup-retur:** flytte kjent, strukturert data inn uten tap (strukturert spor). Dette er en round-trip mot eksporten som allerede finnes.
- **Fangst fra prosa:** gjøre ustrukturert tekst du *har* til førsteklasses entiteter uten å tolke og taste selv (AI-spor). Dette er den egentlige tidsbesparelsen.

De to sporene deler samme bakre halvdel (gjennomsyn + lagring), men har helt ulik front. Derfor bygges den delte kjernen først.

## Kjernebeslutning — hvorfor AI-sporet trenger backend
Strukturert import er trygt i nettleseren: den leser en fil brukeren selv velger, og skriver bare til brukerens egne rader (RLS beskytter alt, jf. `supabase-schema.sql`).

AI-sporet kan **ikke** kalle en LLM direkte fra `app.html`. En provider-nøkkel i nettleseren er eksponert for alle. Den rene løsningen er en **Supabase Edge Function** som holder nøkkelen server-side: klienten sender råtekst + hvilken entitet, funksjonen kaller modellen og returnerer validert JSON. Dette holder samme sikkerhetsmodell som resten av appen (ingen hemmeligheter i klienten) og gir ett sted å håndheve skjema, rate-limiting og kost.

⚠️ Fellen å unngå: å haste ut AI-sporet med nøkkel i `spine-config.js` «bare for å teste». Det lekker nøkkelen til enhver som åpner appen. Strukturert spor kan piloteres helt uten backend; AI-sporet venter på Edge Function.

## Omfang — pilot på Strategi
**Anbefalt pilot: `strategies`.** Begrunnelse:

- Det er flaggskip-entiteten — den folk faktisk «har» skrevet et annet sted og vil ha inn.
- Eksport finnes allerede for den (`exportStrategy`), så round-trip for det strukturerte sporet er trivielt å bevise: eksporter → importer → identisk objekt.
- Den er den vanskeligste (`moves`/`notDoing`/`howKnow` som lister, `relations` og `serves` som referanser). Løser vi den, generaliserer lærdommen nedover til de enklere entitetene.

Bytt til **`assumptions`** som pilot hvis du heller vil ha lavest mulig risiko først: kortere skjema, ingen liste-felt, og AI-uttrekk av «hva må være sant» fra et notat er en ren og lett demonstrerbar oppgave. Kryssref (`strategy`, `watchedBy`) kan da stå tomt i v1 og kobles manuelt.

Alt utenfor piloten (de andre seks entitetene, bulk-import av flere entiteter i én fil, auto-kobling av kryssreferanser på import) er **ikke** med i første versjon. Se «Senere».

## Datamodell — ingen schemaendring
Import produserer akkurat de samme objektene som `saveForm` lager i dag. Ingen ny tabell, ingen endring i `supabase-schema.sql`, ingen endring i `COLLS`.

En importert strategi er et vanlig strategi-objekt:

```js
{ id:"s3f2a",              // uid("s") — generert på import, aldri fra fil
  name:"…", framework:"kernel", status:"draft", owner:"…",
  challenge:"…", approach:"…",
  moves:["…","…"], notDoing:["…"], howKnow:["…"],
  relations:[], serves:[] }
```

Regler som holder modellen ren:

- **Id-er genereres alltid lokalt** med `uid(coll[0])` (~linje 2237). En `id` i en importfil ignoreres — ellers risikerer man kollisjon eller å overskrive en annen brukers referanser. (Unntak: bevisst «gjenopprett backup»-modus, som ikke er med i piloten.)
- **Kryssreferanser importeres tomme i v1.** `relations`, `serves`, `strategy`, `watchedBy` osv. settes til `[]`/`""`. Å matche en referanse i fila mot en eksisterende entitet er en egen, senere jobb — å gjette feil er verre enn å la brukeren koble selv.
- **Ukjente felt forkastes**, ikke lagres. Kun nøkler som finnes i `FIELDS[coll]` slipper gjennom.
- **Enum-felt valideres** mot `opts` (f.eks. `status` ∈ draft/reviewed/committed/archived). Ugyldig verdi → felt tømmes og flagges i gjennomsyn, ikke stille lagret.

## Arkitektur
```
                 ┌────────────────────────────────────────┐
  Strukturert →  │  parseFile(text, coll)                 │
   (.json/.md)   │   → normaliserer mot FIELDS[coll]      │──┐
                 └────────────────────────────────────────┘  │
                                                              ▼
                 ┌────────────────────────────────────────┐  ┌───────────────┐
  Fritekst    →  │  Edge Function: /extract               │  │ reviewImport()│
   (paste/PDF)   │   provider-nøkkel server-side,         │─▶│  samme skjema │
                 │   returnerer kandidat-objekter (JSON)  │  │  som saveForm │
                 └────────────────────────────────────────┘  └──────┬────────┘
                                                                     │ bekreft
                                                                     ▼
                                              DB[coll].push(...) → save() → render()
```

Begge spor ender i **ett felles gjennomsyn** (`reviewImport`) som gjenbruker skjema-renderingen fra `buildForm`/`saveForm`. Ingenting skrives til `DB` før brukeren trykker bekreft. Lagring er den eksisterende debouncede write-through (`save()` → `pushAll`, ~linje 950/952) — importkoden rører aldri Supabase direkte.

## Faser

### Fase 0 — Felles kjerne (delt av begge spor)
- `normalizeEntity(coll, raw)`: tar et løst objekt, beholder kun `FIELDS[coll]`-nøkler, tvinger liste-felt (`t:"lines"`/`"multiref"`) til arrays, validerer `seg`-enums mot `opts`, tømmer alle referansefelt. Returnerer `{clean, warnings[]}`.
- `reviewImport(coll, candidates[])`: modal som viser hvert kandidatobjekt i det redigerbare skjemaet (gjenbruk `buildForm`), med advarsler synlige. Bekreft → `candidates.forEach(c=>{ c.id=uid(coll[0]); DB[coll].push(c); }); save(); render();`.
- Enhetstest `normalizeEntity` i Node mot seed-objekter (samme mønster som verifiseringen i [[Plan — Goals & Outcomes]]).

### Fase 1 — Strukturert spor (ingen backend)
- «Import»-knapp i register-headeren ved siden av eksport (`exportRegister`, ~linje 1835) — skjult `<input type="file" accept=".json,.md">`, `readAsText`.
- `.json`: `JSON.parse` → objekt eller array → `normalizeEntity` per objekt → `reviewImport`.
- `.md`: parser som speiler `exportStrategy`-formatet (round-trip). Start strengt: bare filer Spinen selv har eksportert.
- **Verifisering:** eksporter pilot-entiteten, importer den tilbake, bekreft identisk objekt (minus `id` og tomme referanser). Round-trip-test i Node.

### Fase 2 — Edge Function for AI-uttrekk
- `supabase/functions/extract/index.ts`: tar `{coll, text}`, henter `FIELDS[coll]`-skjema (delt konstant), ber modellen returnere et array av objekter som matcher skjemaet, validerer serverside med samme regler som `normalizeEntity`, returnerer JSON. Provider-nøkkel i Supabase-secrets, aldri i klienten.
- Auth: funksjonen krever brukerens Supabase-JWT (samme sesjon som `SB`), så bare innloggede brukere kan kalle den.
- Rate-limit + maks tekstlengde for å holde kost forutsigbar.

### Fase 3 — AI-spor front
- «Lim inn tekst»-modus: tekstområde + valgt entitet → kall `/extract` → `reviewImport` med kandidatene.
- PDF: hent ut ren tekst i klienten (pdf.js) og send teksten — ikke fila — til funksjonen.
- Tydelig merking i gjennomsyn av at feltene er AI-foreslått, så terskelen for å rette er lav.

### Fase 4 — Generaliser
- Fjern alt pilot-spesifikt; driv import for alle `COLLS` fra `FIELDS`. Én kodebane, syv entiteter.
- Vurder bulk: én fil med flere entitetstyper (krever da kontrollert kryssref-oppløsning — egen beslutning).

## Verifisering (må passere før «ferdig»)
- **Round-trip:** eksport → import av pilot-entiteten gir identisk objekt (minus generert `id`).
- **Skjemadisiplin:** importfil med ukjente felt, feil enum-verdi og fylt `id` → ukjente felt borte, enum tømt+flagget, ny `id` generert.
- **Ingen direkte skriv:** import rører aldri `SB` direkte; all lagring går via `save()`/`pushAll`. Bekreftet ved kodegjennomgang.
- **Sikkerhet:** ingen provider-nøkkel i `app.html`/`spine-config.js`; `/extract` avviser kall uten gyldig JWT.
- **RLS:** importerte rader får `user_id = auth.uid()` som alt annet (arves fra `pushAll`).
- **Avbryt = ingen endring:** lukker man gjennomsyn uten å bekrefte, er `DB` uendret.

## Senere (utenfor piloten)
- Kryssref-oppløsning på import (matche `serves`/`strategy` mot eksisterende entiteter, med bekreftelse).
- Bulk-import av flere entitetstyper i én fil.
- Backup/gjenopprett-modus som bevarer id-er bevisst.
- Dra-og-slipp av flere filer samtidig.

## Åpne valg for deg
1. **Pilot-entitet:** `strategies` (flaggskip, round-trip finnes — anbefalt) eller `assumptions` (lavest risiko).
2. **Rekkefølge:** strukturert spor først (raskt, ingen backend), eller sette opp Edge Function tidlig så AI-sporet ikke blokkerer senere?
3. **PDF i v1?** Eller starte AI-sporet med ren innliming og legge til PDF i Fase 3.
