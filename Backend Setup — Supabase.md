# Backend Setup — Supabase

Slik kobler du **The Strategy Spine** til en Supabase-backend og publiserer den.
Appen er ren statisk HTML/JS — ingen byggesteg. Du trenger bare et Supabase-prosjekt
og en stad å serve filene fra over `http(s)`.

> Anon/public-nøkkelen er trygg å ha i nettleseren. Det er **Row-Level Security**
> (satt opp i `supabase-schema.sql`) som sørger for at hver bruker kun ser sine egne data.

---

## 1. Opprett Supabase-prosjekt
1. Gå til [supabase.com](https://supabase.com) → logg inn → **New project**.
2. Navn: f.eks. `the-spine`. Sett et database-passord (lagre det). Region: EU (f.eks. Frankfurt).
3. Vent til prosjektet er ferdig provisjonert.

## 2. Kjør databaseskjemaet
1. **SQL Editor** → **New query**.
2. Kopier **hele** innholdet i `supabase-schema.sql`, lim inn, trykk **Run**.
3. Skal kjøre uten feil. Skriptet er idempotent — trygt å kjøre på nytt.
4. Det oppretter 5 tabeller med RLS: `strategies`, `insights`, `decisions`,
   `assumptions`, `signals`.

## 3. Slå på e-post-innlogging (magic link)
1. **Authentication → Providers** → bekreft at **Email** er på.
2. Magic link logger deg inn direkte via en engangslenke — du trenger ikke passord.

## 4. Sett auth-URL-er
**Authentication → URL Configuration**:
- **Site URL**: din host-URL, f.eks. `https://jonaslot.github.io/The-Spine/`
- **Redirect URLs** → legg til: `https://jonaslot.github.io/The-Spine/login.html`

`login.html` sender magic link tilbake til seg selv, så denne redirect-URL-en
**må** stå på lista, ellers feiler innloggingen.

## 5. Fyll inn `spine-config.js`
1. **Project Settings → API** → kopier **Project URL** og **anon / public key**.
2. Lim inn i `spine-config.js`:
```js
   window.SPINE_CONFIG = {
     SUPABASE_URL: "https://DITT-PROSJEKT.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGci...din-anon-key"
   };
```
  - **Pass på:** ikke la placeholder-teksten `YOUR-PROJECT` eller `YOUR-ANON`
     bli stående noe sted. Appen sjekker etter disse strengene og nekter å koble
     til hvis de finnes. Nøkkelen skal begynne på `eyJ...`.

## 6. Publiser (GitHub Pages)
1. Commit + push `spine-config.js`.
2. GitHub → **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, mappe **/ (root)** → **Save**.
3. Vent 1–2 min. Appen ligger på `https://jonaslot.github.io/The-Spine/`.

> Alternativ host: Netlify/Vercel (dra-og-slipp mappen). Bytt da URL-ene i steg 4
> med den URL-en hosten gir deg.

## 7. Test
1. Åpne `.../The-Spine/login.html`.
2. Skriv inn e-posten din → **Send me a magic link**.
3. Åpne lenken i e-posten **på samme enhet** → du sendes til `app.html`.
4. Opprett en strategi for å bekrefte at lagring til Supabase virker.

---

## Feilsøking
| Symptom | Sannsynlig årsak |
| --- | --- |
| «Backend not connected» / «Connect your backend» | `spine-config.js` har fortsatt `YOUR-PROJECT`/`YOUR-ANON` i seg, eller tomme verdier |
| Magic link feiler eller redirect-feil | Redirect URL i steg 4 matcher ikke eksakt (må inkludere `/login.html`) |
| 404 på GitHub Pages | Pages ikke ferdig bygd ennå, eller peker ikke på `main` + root |
| Data lagres ikke | Skjemaet (steg 2) ble ikke kjørt, eller du er ikke innlogget |

## Sikkerhetssjekk (valgfritt)
Logg inn med en annen e-post i en annen nettleser → du skal **ikke** se den første
brukerens data. Bekrefter at Row-Level Security virker.
