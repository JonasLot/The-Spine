# Språkvelger — i18n status
> Relatert: [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · `app.html`
> Norsk + engelsk, kun UI-tekst. Språkvalg lagres på Supabase-profilen (user-metadata) og følger deg på tvers av enheter. Ingen skjemaendring.

## Hvordan det virker
- `LANG` + ordbok `T = { en:{…}, no:{…} }` + `t("nøkkel")`-oppslag (øverst i script-blokken, ~linje 613).
- Velger i topplinjen (globus-ikon, `#langSel`) → `setLang()` → oppdaterer chrome, kjører `render()`, lagrer til profil.
- `applyChrome()` oppdaterer alt utenfor `#root` (nav, grupper, brand, søk, filter). View-innhold oppdateres av `render()`.
- Lagring: `saveProfile()` skriver `lang` inn i `SB.auth.updateUser({data:{…}})`. Leses ved `boot()`.
- **Utvid:** legg til nøkkel i både `T.en` og `T.no`, bruk `t("nøkkel")` der strengen står. Manglende norsk nøkkel faller trygt tilbake til engelsk.

## Oversatt nå (fase 1 + 2) ✅
Fase 1 — skallet:
- Navigasjon (alle 11 punkter), nav-grupper, brand-eyebrow + tagline, topplinje, «Ny …»-knapp, «Logg ut», alle elleve view-overskrifter, «Eksporter .md».

Fase 2 — dyp UI-tekst:
- Delte etiketter rutet via `t()`: tilstander (holding/shaky/drifting/disagreeing …), statuser, rammeverk, konfidens/konsekvens-nivåer, sync-status, dør-type.
- Dashboard: KPI-kort, seksjonsoverskrifter, ryggrad-flyt, «trenger oppmerksomhet»-tabell + tomtilstand.
- Register-tabeller: alle kolonneoverskrifter og tomtilstander (innsikter, beslutninger, antakelser, signaler).
- Strategidetalj: knapper, kanonisk-linje, énsides-seksjoner, påvirkningskart-/hviler-på-overskrifter, mini-lister.
- Matrise (konfidens × konsekvens), driftsrytme-stegene, gjennomgangsradar.
- Detalj-drawere (åpnes fra kart/tabeller): eyebrows, felt-etiketter, seksjoner, lenke-tokens.

### Demo-strategiene på norsk ✅
- `SEED_NO` + `L(obj,felt)`-overlegg: seed-strategiene (st1/st2/st3) vises på norsk når norsk er valgt.
- Trygt: viser norsk **kun** når feltet fortsatt er den opprinnelige seed-teksten. Redigerer du en strategi, vises din egen tekst uendret på begge språk. Ingen datamodell-endring.

### Verifisert (kjørt 2026-07-07)
- `node --check`: OK. 160 `t()`-nøkler i bruk, alle definert. Full paritet: 196 nøkler i hvert språk.
- Runtime-test med stubbet DOM: `t()` bytter EN↔NO korrekt; ukjent nøkkel faller tilbake til nøkkelen; `L()` gir norsk for uredigert st1, men bevarer brukerens tekst etter redigering.

## Gjenstår (fase 2b — mindre restlomme)
- Redigerings-modalen (`FIELDS`/`buildForm`): feltnavn + hjelpetekst (placeholders) og seg-valg. Statisk `FIELDS`-objekt må rutes via `t()` — en egen, avgrenset pass.
- «Connect your backend»-oppsettskjermen (vises bare før Supabase er konfigurert).
- Flywheel/Standing Systems-kortinnhold (lange forklaringer i `SYSTEMS`/`FAM`).
- Evt. dato-/tallformat (no-NO vs en-GB).

Alt følger samme mønster: legg nøkkel i `T.en` + `T.no`, bytt streng med `t()`.

## Test
- [ ] Bytt til Norsk i topplinjen → nav, overskrifter og knapper bytter umiddelbart.
- [ ] Last siden på nytt → språket huskes (lest fra profil).
- [ ] Logg inn på annen enhet → samme språk følger med.
- [ ] Bytt til English → alt tilbake til engelsk.
