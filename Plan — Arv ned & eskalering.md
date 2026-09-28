# Plan — Arv ned & eskalering

> Relatert: [[Plan — Goals & Outcomes]] · [[Plan — Signalhistorikk & tilstandsforslag]] · [[Beslutningsrettigheter — tre klasser]] · [[Backend Setup — Supabase]] · [[Språkvelger — i18n status]] · `app.html`
> Rammeverk: [[Product Layer Nesting]] · [[Inheritance Schema]] · [[Backbrief]] · [[Signal Card]]
> Status: **Bygget og testet** (2026-09-27) på branch `arv-og-eskalering`. 1075 enhetstester og 362 visninger grønne.

## Hvorfor

The Spine var bygget for én strategi om gangen. Høydestigen (`alt`: team → product → portfolio → company → owner) og `rungBreaks()` visste allerede at strategier står på ulike nivåer, men ingenting koblet et produkt til strategien over det. Da får vi to kjente svikter:

1. **Arven er implisitt.** Produktteamet antar at de vet hva porteføljen vil, og ingen skriver ned hva som er valgt bort.
2. **Læring går ikke opp.** Produktløkken går i uker, porteføljeløkken i kvartaler. Det produktet lærer om porteføljens diagnose, forsvinner i en statusrapport.

## Designvalg

**Arven utledes, den skrives ikke av.** Fire av seks felt står allerede på forelderen:

| Felt | Kilde |
|---|---|
| 1 · Retning | forelderens `approach` |
| 2 · Utfall | målene forelderen tjener **og** barnet har tatt på seg (`serves` ∩ `serves`) |
| 3 · Ikke-valg | forelderens `notDoing` |
| 4 · Rammer | `constraints` — skrives på barnet |
| 5 · Frihetsgrader | `freedoms` — skrives på barnet |
| 6 · Antakelser på vakt | `watches` — barnet peker på forelderens antakelser |

Endrer forelderen seg, endres arven uten at barnet redigeres. Et tomt felt vises som et **funn**, med knapp for å eskalere.

**«Eskalering», ikke «signal».** `Signals` er allerede Signals Ledger (målinger som overvåker et bet). Kortet som går oppover heter derfor `escalations` i appen. I vaulten heter konseptet fortsatt [[Signal Card]].

**Mottakeren utledes.** En eskalering har bare avsender (`fromStrategy`). Mottakeren er avsenderens forelder. Mangler forelderen, flagges eskaleringen som «ingen skylder et svar».

**Terskelen foreslår, den stopper ikke.** Samme prinsipp som [[Plan — Signalhistorikk & tilstandsforslag]]: appen sier «under terskel», men lar mennesket sende likevel.

- Type 1 (antakelse brutt): alltid over terskel.
- Type 2 og 3 (ramme blokkerer, ikke-valg koster): krever `loops ≥ 2`.
- Type 4 (mønster på tvers): krever at et annet barn av samme forelder har meldt om samme felt.

**Svarplikten bor i Driftsrytme.** Nytt steg 4 i gjennomgangen: *Svar på det som ble sendt opp*. Svaret er tatt inn / parkert / avvist, og det kan ikke lagres uten begrunnelse. Parkert krever dato, og kommer tilbake på gjennomgangen når datoen er nådd. Svaret teller som en endring i `reviewChanged()` og arkiveres i `reviews[].escalations`.

## Levert

- **Strategi:** nye felt `parentId`, `constraints`, `freedoms`, `watches`, med egen fane «Arver» i skjemaet. En strategi kan ikke velge seg selv som forelder.
- **Strategikortet:** panelet *Arver fra* (seks felt, kilde merket, tomme felt som funn) og *Det strategiene under sender opp* på forelderen. Produktstrategier med noe over seg men uten forelder får «Ingen forelder satt».
- **Register:** `Eskaleringer` under Apparat, med banner, tabell, skuff og md-eksport. Eksporten lenker til avsender og mottaker med `mdLink`, og til rammeverksnotatene med `VAULT_NOTE`.
- **Strategieksport:** seksjonen `## Inherits from` når strategien har forelder.
- **Stående systemer:** Escalations lagt til blant registrene rammeverket ikke navnga.
- **Seed:** TØFF Migration arver fra Tet Vedtak, med rammer, frihetsgrader og a3 på vakt. Eskaleringen `e1` (DPIA-porten blokkerer skyggekjøringen) er åpen. On-Demand Transit Planning står bevisst uten forelder som eksempel på funnet.
- **i18n:** alle nye nøkler på begge språk. Seed-teksten er oversatt i `SEED_NO`.

## Tilbakebrief (lagt til 2026-09-28)

Arven leser det som står ovenfra. Tilbakebriefen tester om det ble forstått slik det var ment (Bungay, *The Art of Action*). Den står på strategikortet rett under *Arver fra*, og skrives inline som linsens arbeidsflate.

- **Fire felt:** intensjonen med egne ord, hva vi derfor gjør, hva vi derfor ikke gjør, og tolkningene der strategien er vag («vi leser X som Y»).
- **Hørt av nivået over:** ikke sendt / sendt, ikke svart / kjent igjen / korrigert, pluss hvem som hørte den. Er den korrigert, vises feltet *Hva de korrigerte*. Det er selve oversettelsesfeilen.
- **Utdatert:** dato og forelderens versjon stemples når den merkes som hørt. Får forelderen en ny versjon, blir tilbakebriefen *utdatert*.
- **Kopier som melding:** lager en ferdig tekst å sende, fordi tilbakebriefen er en samtale og ikke et skjema.
- **Forelderen** ser status per barn i *Det strategiene under sender opp*.
- **Lagring:** på strategien (`st.backbrief`), ikke i egen tabell. Ingen ny SQL. `KEEP_KEYS` beholder den ved import.
- **Eksport:** `## Backbrief` i strategieksporten, med lenke til [[Backbrief]].
- **Seed:** TØFF er korrigert av Partnerforums arbeidsutvalg. «Samme opplevelse» gjelder også skjermbildene, ikke bare beslutningslogikken.

## Må gjøres før bruk

**Kjør `supabase-schema.sql` på nytt** (versjon 15.0). Den oppretter tabellen `escalations`. Til det er gjort, lagres ikke eskaleringer, og synk-merket står på feil. De andre tabellene påvirkes ikke, siden lagringen er isolert per tabell.

## Gjenstår

- Eskaleringer ligger ikke på strategikartet (`CV_KINDS`). Naturlig neste steg, fordi kanten barn → forelder er selve poenget.
- Mellomlag: skal et produktområde (f.eks. Skoleskyss + Spesialskyss + TT) være et eget trinn med eget arveskjema? Stigen støtter det allerede. Spørsmålet er om det skal brukes.
- Eskalering mellom søsken (produkt A → produkt B) er bevisst utelatt. Alt går opp.
- Delt styring: hvem eier svaret når forelderen styres av et forum der ingen alene kan beslutte? Kobles naturlig til [[Beslutningsrettigheter — tre klasser]].
