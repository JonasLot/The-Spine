# Verdiregister — eksempeldataene

De fem verdikravene som ligger i seed-en til [[The Strategy Spine]], skrevet ut felt for felt så de kan legges inn manuelt. De demonstrerer alle fire tilstandene og alle tre omfangene — det er derfor de er valgt.

Relatert: [[Verdiregnskap]] · [[VFV]] · [[Skoleskyss]] · [[TØFF]] · [[Plan — Signalhistorikk & tilstandsforslag]]

---

## Utfallene de henger på

Verdi uten utfall er en påstand uten årsak. Hvert krav under peker på ett av disse:

| ID | Utfall | Tilstand |
|----|--------|----------|
| o1 | Omgjøringsraten for skoleskyss-klager faller | Ute av kurs |
| o2 | ≥60 % av ordinære saker fullautomatisert med kvalitet | Ikke målt |
| o3 | Ingen målbart tjenesteavbrudd i migreringsvinduet | På sporet |
| o4 | ≥80 % av administratorer selvbetjener innen uke 4 | I faresonen |

---

## v1 — Foresatte sparer tid

- **Verdikrav:** Foresatte bruker mindre tid på å søke, og slipper å søke om igjen.
- **Mottaker:** Foresatte
- **Valuta:** Tid
- **Omfang:** Direkte
- **Fra utfall:** o4 — ≥80 % av administratorer selvbetjener innen uke 4
- **Mekanisme:** Flere klarer å søke riktig på første forsøk, **slik at** de slipper avslag, retting og en ny runde.
- **Tilstand:** Delvis
- **Evidens:** Færre gjentatte søknader fra samme husstand, og kortere tid fra påbegynt til innsendt søknad.
- **Størrelse:** ~15 min spart per søknad
- **Eier:** Jonas
- **Notat:** Delvis: selvbetjeningen har steget, men gjentatte søknader er ikke målt ennå.

## v2 — Færre henvendelser til saksbehandlerne

- **Verdikrav:** Saksbehandlerne får færre henvendelser om status og feil i søknaden.
- **Mottaker:** Saksbehandlere i PTA-ene
- **Valuta:** Kostnad
- **Omfang:** Organisatorisk
- **Fra utfall:** o4 — ≥80 % av administratorer selvbetjener innen uke 4
- **Mekanisme:** Riktig søknad på første forsøk fjerner hele klassen henvendelser som handler om å rette opp.
- **Tilstand:** Hevdet
- **Evidens:** Volum av henvendelser merket «søknadshjelp» per hundre søknader.
- **Størrelse:** *(tom)*
- **Eier:** *(tom)*
- **Notat:** Talt i business-casen. Ingen baseline hentet ennå.

## v3 — Raskere avklaring for eleven

- **Verdikrav:** Eleven får raskere avklaring på om skyss er innvilget.
- **Mottaker:** Eleven og familien
- **Valuta:** Kvalitet
- **Omfang:** Direkte
- **Fra utfall:** o2 — ≥60 % av ordinære saker fullautomatisert med kvalitet
- **Mekanisme:** Automatisert behandling av ordinære saker gjør at kø for de kompliserte sakene kortes ned, **slik at** alle får svar raskere.
- **Tilstand:** Hevdet
- **Evidens:** Median dager fra innsendt til vedtak, delt på ordinære og skjønnsbaserte saker.
- **Størrelse:** *(tom)*
- **Eier:** Jonas
- **Notat:** *(tom)*

## v5 — Frigjorte driftsmidler *(dette er gapet)*

- **Verdikrav:** Programmet frigjør driftsmidler når de gamle systemene kan slås av.
- **Mottaker:** Eierne (PTA-ene)
- **Valuta:** Kostnad
- **Omfang:** Organisatorisk
- **Fra utfall:** o3 — Ingen målbart tjenesteavbrudd i migreringsvinduet **(på sporet)**
- **Mekanisme:** Migreringen fullføres uten avbrudd, **slik at** FSkyss/Voyager kan avvikles og lisens- og driftskostnaden faller bort.
- **Tilstand:** Uteble
- **Evidens:** Faktisk bortfall av lisens- og driftskostnad på de gamle systemene, ikke bare at migreringen er ferdig.
- **Størrelse:** ~2,4 MNOK i året
- **Eier:** Jonas
- **Notat:** Utfallet er på sporet, men gevinsten har ikke landet: begge systemene kjører fortsatt parallelt. Klassisk gevinstrealiseringssvikt — migreringen teller som ferdig, besparelsen gjør ikke det.

> Denne er den ene som utløser **verdigapet**: utfallet er på sporet, gevinsten uteble. Legg den inn hvis du vil se alarmen virke.

## v4 — Likeverdig tilbud på tvers av kommunegrenser

- **Verdikrav:** Flere elever får et forutsigbart og likeverdig skysstilbud på tvers av kommunegrenser.
- **Mottaker:** Elever i alle eierkommuner
- **Valuta:** Likeverd
- **Omfang:** Samfunn
- **Fra utfall:** o1 — Omgjøringsraten for skoleskyss-klager faller
- **Mekanisme:** Når omgjøringsraten faller fordi regelanvendelsen er lik, avhenger ikke utfallet lenger av hvilken kommune du bor i.
- **Tilstand:** Hevdet
- **Evidens:** Spredning i innvilgelsesrate mellom kommuner, ikke bare snittet.
- **Størrelse:** *(tom)*
- **Eier:** *(tom)*
- **Notat:** Samfunnsverdien hele programmet til slutt måles på.

---

## Hva settet demonstrerer

**Ett utfall, flere verdier i ulik valuta.** o4 bærer både v1 (tid, for foresatte) og v2 (kostnad, for saksbehandlerne). Det er hele grunnen til at Verdi er et eget register og ikke et felt på utfallet.

**Alle fire tilstandene er i bruk.** Hevdet (v2, v3, v4), delvis (v1), uteble (v5). *Realisert* mangler bevisst — ingen av gevinstene har landet ennå, og en seed som lot som noe var realisert ville løyet om hvor programmet står.

**Tomme felt er tillatt og informative.** v2 og v4 mangler størrelse og eier. `valueWeak()` flagger krav som mangler mekanisme, evidens eller utfall — men ikke størrelse. Et verdikrav uten tallfestet størrelse er fortsatt styrbart; ett uten mekanisme er det ikke.

**Kjeden går hele veien.** v4 er den eneste som er merket *samfunn*: Tiltak → Output → Outcome → Value → Samfunnsverdi. De andre stopper på direkte eller organisatorisk nivå, som de skal.
