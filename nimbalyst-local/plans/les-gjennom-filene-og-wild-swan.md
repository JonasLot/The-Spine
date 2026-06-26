# Oppsett av The Strategy Spine (Supabase + GitHub Pages)

## Kontekst

`The-Spine` er en frittstående statisk webapp (ingen byggesteg) som lagrer
strategidata i Supabase. Repoet inneholder allerede all koden — det som
mangler er å koble på en backend (Supabase) og publisere mappen på en
host. Du valgte **gratis statisk host**, og siden repoet allerede ligger på
`github.com/JonasLot/The-Spine` er **GitHub Pages** den enkleste veien.

Filene og hva de gjør:
- `index.html` — landingsside
- `login.html` — innlogging via magic link (passordløs e-post)
- `app.html` — selve appen (leser/skriver dine data til Supabase)
- `spine-config.js` — her limer du inn Supabase-URL + anon key (har placeholders nå)
- `supabase-schema.sql` — kjøres én gang i Supabase; lager 5 tabeller med
  row-level security (`strategies`, `insights`, `decisions`, `assumptions`, `signals`)

Sluttresultat: appen er tilgjengelig på `https://jonaslot.github.io/The-Spine/`,
du logger inn med e-post (magic link), og dataene dine ligger trygt i Supabase
(RLS sørger for at kun du ser dine egne rader).

---

## Steg-for-steg

### 1. Opprett Supabase-prosjekt
1. Gå til **supabase.com** → logg inn / lag konto → **New project**.
2. Velg navn (f.eks. `the-spine`), sett et database-passord (lagre det), velg region (EU, f.eks. Frankfurt).
3. Vent til prosjektet er ferdig provisjonert.

### 2. Kjør databaseskjemaet
1. I Supabase: **SQL Editor** → **New query**.
2. Åpne `supabase-schema.sql`, kopier **hele** innholdet, lim inn, trykk **Run**.
3. Skal gå uten feil (skriptet er idempotent — trygt å kjøre flere ganger).

### 3. Slå på e-post-innlogging (magic link)
1. **Authentication → Providers** → bekreft at **Email** er på.
2. (Anbefalt for enkel egenbruk) Under Email-provideren: skru **av** "Confirm email"
   er ikke nødvendig for magic link — magic link logger deg inn direkte.

### 4. Sett auth-URL-er (viktig for at magic link skal virke på hosten)
1. **Authentication → URL Configuration**.
2. **Site URL**: `https://jonaslot.github.io/The-Spine/`
3. **Redirect URLs** → legg til: `https://jonaslot.github.io/The-Spine/login.html`
   - (login.html sender magic link tilbake til seg selv, så denne må stå på lista.)

### 5. Hent nøklene og fyll inn `spine-config.js`
1. I Supabase: **Project Settings → API**.
2. Kopier **Project URL** og **anon / public key**.
3. Åpne `spine-config.js` og erstatt placeholders:
   ```js
   window.SPINE_CONFIG = {
     SUPABASE_URL: "https://DITT-PROSJEKT.supabase.co",
     SUPABASE_ANON_KEY: "din-anon-public-key"
   };
   ```
   - Anon key er trygg å ha i nettleseren/offentlig — RLS i skjemaet beskytter dataene.

### 6. Publiser på GitHub Pages
1. Commit og push endringen i `spine-config.js`:
   - `git add spine-config.js && git commit -m "Add Supabase config" && git push`
2. På GitHub: **Settings → Pages** → **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: **main**, mappe: **/ (root)** → **Save**.
4. Vent 1–2 min. Siden blir tilgjengelig på `https://jonaslot.github.io/The-Spine/`.

### 7. Test
1. Gå til `https://jonaslot.github.io/The-Spine/login.html`.
2. Skriv inn e-posten din → "Send me a magic link".
3. Åpne lenken i e-posten **på samme enhet** → du sendes til `app.html`.
4. Opprett en strategi for å bekrefte at lagring til Supabase virker.

---

## Verifisering
- **Innlogging:** Magic link åpner og lander deg på app.html uten feil.
- **Lagring:** Nye rader dukker opp i Supabase under **Table Editor** (f.eks. `strategies`).
- **Sikkerhet (valgfritt):** Logg inn med en annen e-post → du skal ikke se den
  første brukerens data (RLS fungerer).
- **Feilsøking:**
  - "Backend not connected" → `spine-config.js` har fortsatt placeholders eller feil verdier.
  - Magic link feiler / redirect-feil → sjekk at Redirect URL i steg 4 stemmer eksakt
    (inkl. `/The-Spine/login.html`).
  - 404 på Pages → vent litt til, eller sjekk at Pages peker på main + root.

---

## Merknad
- Appen refererer til en `Backend Setup — Supabase.md` som ikke finnes i repoet.
  Denne planen dekker de samme stegene; ingen handling nødvendig med mindre du
  vil legge til den fila som dokumentasjon.
- Alternativ host (hvis du heller vil): Netlify/Vercel — dra-og-slipp mappen,
  bytt da ut URL-ene i steg 4 med den URL-en hosten gir deg.
