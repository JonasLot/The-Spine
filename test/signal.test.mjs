#!/usr/bin/env node
// Tester for signalhistorikk, sparkline og tilstandsforslag.
//
//   node test/signal.test.mjs
//
// app.html er én fil uten byggsteg, så testene trekker de rene funksjonene
// (og seed-dataene) rett ut av <script>-blokken og kjører dem isolert.
// Ingen avhengigheter, ingen DOM.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "app.html"), "utf8");

// Største inline-script uten src= er applikasjonen.
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = blocks.sort((a, b) => b.length - a.length)[0];
if (!src) throw new Error("Fant ingen inline-script i app.html");

// Balansert uttrekk fra første { eller [ etter posisjon.
function balancedEnd(from) {
  let k = from;
  while (k < src.length && src[k] !== "{" && src[k] !== "[") k++;
  let depth = 0;
  for (let e = k; e < src.length; e++) {
    const c = src[e];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
    if (depth === 0) return e;
  }
  throw new Error("Ubalanserte klammer fra posisjon " + from);
}
function decl(name) {
  const m = new RegExp(`const\\s+${name}\\s*=`).exec(src);
  if (!m) throw new Error(`Fant ikke const ${name} — er app.html endret?`);
  return src.slice(m.index, balancedEnd(m.index + m[0].length) + 1);
}
function func(name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(src);
  if (!m) throw new Error(`Fant ikke function ${name} — er app.html endret?`);
  return src.slice(m.index, balancedEnd(m.index + m[0].length - 1) + 1);
}
function oneLine(re) {
  const m = re.exec(src);
  if (!m) throw new Error(`Fant ikke ${re} — er app.html endret?`);
  return src.slice(m.index, src.indexOf("\n", m.index));
}

const harness = [
  "let LANG='en';",
  decl("SEED"), decl("SEED_NO"), decl("STATE_MAP"), decl("T"),
  oneLine(/const esc\s*=/), oneLine(/function t\(k\)/),
  func("numOrBlank"), func("readings"), func("sparkline"), func("sparkBlock"),
  func("stateColor"), func("suggestSignalState"), func("suggestionText"),
  func("trunc"), decl("ASM_RANK"), func("assumptionFollowUp"), func("followUpText"),
  // assumptionFollowUp slår opp i DB og L(); begge stubbes her.
  "let DB={signals:[],assumptions:[]};",
  "function L(o,f){return o?o[f]:undefined}",
  "return {SEED,SEED_NO,T,numOrBlank,readings,sparkline,sparkBlock," +
  "suggestSignalState,suggestionText,assumptionFollowUp,followUpText," +
  "setLang:v=>{LANG=v},setDB:v=>{DB=v}};",
].join("\n");

const {
  SEED, SEED_NO, T, numOrBlank, readings, sparkline, sparkBlock,
  suggestSignalState, suggestionText, assumptionFollowUp, followUpText,
  setLang, setDB,
} = new Function(harness)();

setDB({ signals: SEED.signals, assumptions: SEED.assumptions });

// ── mini-testrunner ──────────────────────────────────────────────────────
let pass = 0; const failures = [];
const ok = (cond, msg) => cond ? pass++ : failures.push(msg);
const group = name => console.log("\n" + name);

const S = id => SEED.signals.find(x => x.id === id);
// sig(tilstand, retning, terskel, ...verdier eldst→nyest)
const sig = (state, dir, thresh, ...vs) => ({
  state, dir, thresh, band: "", unit: "%",
  log: vs.slice().reverse().map((v, i) => ({ d: `2026-0${i + 1}-01`, t: "", v })),
});
const band = (b, ...vs) => ({
  state: "agreeing", dir: "up", thresh: 80, band: b, unit: "%",
  log: vs.slice().reverse().map(v => ({ d: "x", t: "", v })),
});

group("num-felttypen");
ok(numOrBlank("80") === 80, '"80" → 80');
ok(numOrBlank("62,5") === 62.5, 'norsk desimalkomma "62,5" → 62.5');
ok(numOrBlank("") === "", 'tom streng → ""');
ok(numOrBlank("   ") === "", 'bare blanke → ""');
ok(numOrBlank("tull") === "", 'ikke-tall → "" (aldri NaN)');
ok(numOrBlank(0) === 0, "0 bevares som tall, ikke tomt");
ok(numOrBlank(null) === "", 'null → ""');
ok(numOrBlank(Infinity) === "", 'Infinity → "" (Number.isFinite-vakt)');

group("avlesningshistorikk");
ok(readings(S("s4")).map(r => r.v).join() === "78,71,62", "s4 kommer kronologisk ut");
ok(readings(S("s2")).length === 0, "s2 (DPIA) har ingen tallavlesninger");
ok(readings({ log: [{ d: "a", t: "x" }, { d: "b", v: 5, t: "y" }] }).length === 1,
   "logg som blander tekst og tall filtreres riktig");

group("sparkline");
const sv4 = sparkline(S("s4"));
ok(sv4.startsWith("<svg"), "s4 tegnes");
ok((sv4.match(/L[\d.]/g) || []).length === 2, "s4 har tre punkter (M + 2×L)");
ok(sv4.includes("stroke-dasharray"), "terskellinjen tegnes stiplet");
ok(sv4.includes("var(--warn)"), "kurven farges av tilstanden");
ok(sparkline(S("s1")) === "", "s1: ett datapunkt → ingen sparkline");
ok(sparkline(S("s2")) === "", "s2: kvalitativt → ingen sparkline");
ok(sparkline(S("s3")) === "", "s3: ett datapunkt → ingen sparkline");
ok(sparkline({ state: "agreeing", thresh: "", log: [{ d: "a", v: 5 }, { d: "b", v: 5 }] }).includes("<svg"),
   "flat serie (span 0) gir ikke divisjon på null");
ok(!sparkline({ state: "agreeing", thresh: "", log: [{ d: "a", v: 1 }, { d: "b", v: 2 }] }).includes("dasharray"),
   "uten terskel tegnes ingen stiplet linje");
ok(sparkline({ state: "agreeing", thresh: 0, log: [{ d: "a", v: 0 }, { d: "b", v: 0 }] }).includes("dasharray"),
   "thresh:0 teller som terskel (ikke falsy-felle)");
ok(!/NaN|undefined/.test(sv4), "ingen NaN eller undefined i SVG-output");
const coords = [...sv4.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
ok(coords.length === 3 && coords.every(([x, y]) => x >= 0 && x <= 104 && y >= 0 && y <= 26),
   "alle punkter ligger innenfor viewBox 104×26");
ok(coords[0][1] < coords[2][1], "fallende serie tegnes nedover");
ok(sparkBlock(S("s4")).includes("62%"), "blokken viser siste verdi med enhet");
ok(sparkBlock(S("s4")).includes("target 80%"), "blokken viser terskelen");
ok(sparkBlock(S("s2")) === "", "kvalitativt signal gir tom blokk, ikke tom ramme");
ok(!/undefined|NaN/.test(sparkBlock(S("s4"))), "ingen NaN eller undefined i blokken");

group("tilstandsforslag — når regelen uttaler seg");
ok(suggestSignalState(sig("agreeing", "up", 80, 78, 71, 62)).state === "disagreeing",
   "to brudd på rad → disagreeing");
ok(suggestSignalState(sig("agreeing", "up", 80, 85, 88, 62)).state === "drifting",
   "ett brudd og på vei feil vei → drifting");
ok(suggestSignalState(sig("disagreeing", "up", 80, 60, 85, 88)).state === "agreeing",
   "to gode på rad med bedring → agreeing");
ok(suggestSignalState(sig("agreeing", "down", 0, 0, 2, 5)).state === "disagreeing",
   "dir=down: stigende over terskel → disagreeing");
ok(suggestSignalState(band(0, 77, 76)).state === "disagreeing", "uten toleranse slår 76–77 ut mot 80");

group("tilstandsforslag — når regelen holder kjeft");
ok(suggestSignalState(sig("agreeing", "up", "", 78, 62)) === null, "ingen terskel → null");
ok(suggestSignalState(sig("agreeing", "up", 80, 62)) === null, "ett datapunkt → null");
ok(suggestSignalState(sig("retired", "up", 80, 62, 55)) === null, "pensjonert signal er fredet");
ok(suggestSignalState(sig("drifting", "up", 80, 85, 62)) === null, "ett brudd men bedring → tvetydig");
ok(suggestSignalState(sig("disagreeing", "up", 80, 62, 55)) === null, "allerede i foreslått tilstand → null");
ok(suggestSignalState(band(5, 77, 76)) === null, "76–77 innenfor ±5 av 80 → ingen alarm");
ok(suggestSignalState(S("s1")) === null, "s1 (kvalitativ forventning) → null");
ok(suggestSignalState(S("s2")) === null, "s2 (DPIA) → null");
ok(suggestSignalState(S("s3")) === null, "s3 (ett datapunkt) → null");
ok(suggestSignalState(null) === null && suggestSignalState({}) === null, "tomt input krasjer ikke");

group("begrunnelsen");
const g4 = suggestSignalState(S("s4"));
ok(g4 && g4.state === "disagreeing", "seed s4 (78→71→62 mot 80) foreslås disagreeing");
ok(g4.latest === 62 && g4.thresh === 80 && g4.unit === "%", "forslaget bærer tallene for teksten");
ok(suggestionText(g4) === "62% against 80% — second breach in a row.", "engelsk begrunnelse");
setLang("no");
ok(suggestionText(g4) === "62% mot 80% — andre brudd på rad.", "norsk begrunnelse");
ok(sparkBlock(S("s4")).includes("mål 80%"), "sparkline-blokken bytter språk");
setLang("en");
ok(!/\{v\}|\{th\}/.test(suggestionText(g4)), "ingen uerstattede plassholdere");

group("smitte til antakelsen");
const A = id => SEED.assumptions.find(x => x.id === id);
// Hjelper som bygger et isolert par: ett signal som overvåker én antakelse.
const pair = (sigState, asmState, extraSignals = []) => {
  const a = { id: "aX", state: asmState, statement: "test-bet" };
  const s = { id: "sX", watches: "aX", state: sigState, signal: "test-signal" };
  setDB({ signals: [s, ...extraSignals], assumptions: [a] });
  const r = assumptionFollowUp(a);
  setDB({ signals: SEED.signals, assumptions: SEED.assumptions });
  return r;
};

ok(pair("disagreeing", "holding").suggested === "broken", "uenig signal → holding blir broken");
ok(pair("drifting", "holding").suggested === "shaky", "drivende signal → holding blir shaky");
ok(pair("disagreeing", "shaky").suggested === "broken", "uenig signal → shaky blir broken");
ok(pair("drifting", "shaky") === null, "drivende signal → shaky er allerede der");
ok(pair("disagreeing", "broken") === null, "uenig signal → broken er allerede der");
ok(pair("agreeing", "holding") === null, "enig signal smitter ikke");
ok(pair("agreeing", "broken") === null, "enig signal reparerer ALDRI et brutt bet automatisk");
ok(pair("drifting", "broken") === null, "smitten nedgraderer aldri");
ok(pair("disagreeing", "retired") === null, "pensjonert antakelse er fredet");
ok(pair("retired", "holding") === null, "pensjonert signal smitter ikke");
ok(assumptionFollowUp(null) === null && assumptionFollowUp({}) === null, "tomt input krasjer ikke");
ok(pair("agreeing", "holding", [{ id: "sY", watches: "aX", state: "disagreeing", signal: "verre" }])
   .suggested === "broken", "flere overvåkere: det verste signalet vinner");
ok(pair("drifting", "holding", [{ id: "sY", watches: "aZ", state: "disagreeing", signal: "annet bet" }])
   .suggested === "shaky", "signal som overvåker et annet bet smitter ikke hit");

group("smitte i seed-eksempelet");
const f1 = assumptionFollowUp(A("a1"));
ok(f1 && f1.suggested === "broken", "a1 (shaky) ← s1 (uenig) → broken");
ok(f1.signal.id === "s1", "a1 peker tilbake på signalet som utløste det");
const f6 = assumptionFollowUp(A("a6"));
ok(f6 && f6.suggested === "shaky", "a6 (holding) ← s4 (driver) → shaky");
ok(assumptionFollowUp(A("a2")) === null, "a2 er allerede shaky — ingen mas");
ok(assumptionFollowUp(A("a4")) === null, "a4 ← s3 (enig) → ingen smitte");
ok(assumptionFollowUp(A("a3")) === null, "a3 er uovervåket → ingen smitte");
ok(assumptionFollowUp(A("a5")) === null,
   "a5 har watchedBy:s1, men s1 overvåker a1 — grafen leses fra signalets watches");

group("smittens begrunnelse");
ok(followUpText(f1) === 'the signal “Appeal-overturn rate on school-transport de…” is now disagreeing.',
   "engelsk begrunnelse: " + followUpText(f1));
ok(followUpText(f1).length < 100, "signalnavnet kuttes så båndet ikke sprenger kortet");
setLang("no");
ok(followUpText(f6).startsWith("signalet «") && followUpText(f6).endsWith("driver."),
   "norsk begrunnelse: " + followUpText(f6));
setLang("en");
ok(!/\{s\}|\{state\}/.test(followUpText(f1)), "ingen uerstattede plassholdere");

group("i18n-dekning");
for (const k of ["th.trend", "rev.value", "spark.target", "spark.aria", "sug.prefix", "sug.hint",
                 "sug.why.breach2", "sug.why.breach1", "sug.why.steady",
                 "sug.hint.asm", "sug.why.signal",
                 "state.agreeing", "state.drifting", "state.disagreeing", "state.retired",
                 "state.holding", "state.shaky", "state.broken"]) {
  ok(T.en[k] !== undefined && T.no[k] !== undefined, `${k} finnes i både en og no`);
}

group("bakoverkompatibilitet");
ok(S("s2").unit === undefined && S("s2").thresh === undefined,
   "kvalitative signaler har ikke fått påtvunget nye felt");
ok(SEED.signals.every(s => (s.log || []).every(r => r.d && r.t !== undefined)),
   "alle loggoppføringer har fortsatt d og t");
ok(SEED_NO.s4.log.length === S("s4").log.length, "NO-overlay for s4 har like mange avlesninger som EN");
ok(SEED_NO.s4.log.every(r => typeof r.v === "number"), "NO-overlay for s4 har tallverdier");
ok(SEED_NO.s1.log[0].v === 90 && SEED_NO.s3.log[0].v === 0, "NO-overlay for s1 og s3 har tallverdier");

if (failures.length) {
  console.log(`\n${failures.length} FEILET av ${pass + failures.length}:`);
  failures.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log(`\nALLE ${pass} TESTER OK`);
