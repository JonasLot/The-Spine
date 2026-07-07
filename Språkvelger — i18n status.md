# Språkvelger — i18n status
> Relatert: [[Plan — Interaktivt strategikart]] · [[Backend Setup — Supabase]] · `app.html`
> Norsk + engelsk, kun UI-tekst. Språkvalg lagres på Supabase-profilen (user-metadata) og følger deg på tvers av enheter. Ingen skjemaendring.

## Hvordan det virker
- `LANG` + ordbok `T = { en:{…}, no:{…} }` + `t("nøkkel")`-oppslag (øverst i script-blokken, ~linje 613).
- Velger i topplinjen (globus-ikon, `#langSel`) → `setLang()` → oppdaterer chrome, kjører `render()`, lagrer til profil.
- `applyChrome()` oppdaterer alt utenfor `#root` (nav, grupper, brand, søk, filter). View-innhold oppdateres av `render()`.
- Lagring: `saveProfile()` skriver `lang` inn i `SB.auth.updateUser({data:{…}})`. Leses ved `boot()`.
- **Utvid:** legg til nøkkel i både `T.en` og `T.no`, bruk `t("nøkkel")` der strengen står. Manglende norsk nøkkel faller trygt tilbake til engelsk.

## Oversatt nå (fase 1) ✅
- Navigasjon (alle 11 punkter), nav-grupper (Registre/Apparat/Konto), brand-eyebrow + tagline.
- Topplinje: brødsmule, «Alle strategier», søke-placeholder, «Ny …»-knapp (kontekstuell), «Logg ut».
- Alle elleve view-overskrifter (h1 + ingress): dashbord, strategier, kart, driftsrytme, svinghjul, systemer, profil, og de fire registrene.
- «Eksporter .md»-knapp.
- Verifisert: `node --check` OK, 42 nøkler i hvert språk, full paritet.

## Gjenstår (fase 2 — dyp UI-tekst, fortsatt engelsk)
Disse er bevisst ikke oversatt ennå, så UI-et er delvis tospråklig i dyplagene:
- Dashboard-kort, KPI-labels og «what disagrees»-liste.
- Register-tabeller: kolonneoverskrifter, badges/tilstander (holding, shaky, drifting, disagreeing …), tomtilstander.
- Strategidetalj: seksjonsoverskrifter («What rests on it», kernel-felt osv.), mini-lister.
- Skjema/drawer: feltnavn, hjelpetekst, knapper i `buildForm`/modal.
- Kart-legend og tooltips, review-flyt-tekst, flywheel/systems-kortinnhold.
- Datofmt./tallformat (no-NO vs en-GB) hvis ønskelig.

Alt følger samme mønster: legg nøkkel i `T`, bytt streng med `t()`. Ingen ny infrastruktur trengs.

## Test
- [ ] Bytt til Norsk i topplinjen → nav, overskrifter og knapper bytter umiddelbart.
- [ ] Last siden på nytt → språket huskes (lest fra profil).
- [ ] Logg inn på annen enhet → samme språk følger med.
- [ ] Bytt til English → alt tilbake til engelsk.
