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
  decl("FIELDS"), decl("SING"), decl("SING_NO"), decl("FLD_NO"),
  func("fldTr"), func("fldL"), func("fldPh"), func("singL"),
  decl("STRAT_FW"), decl("LENSES"), decl("LENSES_NO"),
  func("lensNO"), func("lensWhen"), func("lensAnatomy"), func("lensSmells"), func("smellsFlagged"),
  // assumptionFollowUp slår opp i DB og L(); begge stubbes her.
  "let DB={signals:[],assumptions:[]};",
  "function L(o,f){return o?o[f]:undefined}",
  "return {SEED,SEED_NO,T,numOrBlank,readings,sparkline,sparkBlock," +
  "suggestSignalState,suggestionText,assumptionFollowUp,followUpText," +
  "FIELDS,SING,SING_NO,FLD_NO,fldL,fldPh,singL," +
  "STRAT_FW,LENSES,LENSES_NO,lensWhen,lensAnatomy,lensSmells,smellsFlagged," +
  "setLang:v=>{LANG=v},setDB:v=>{DB=v}};",
].join("\n");

const {
  SEED, SEED_NO, T, numOrBlank, readings, sparkline, sparkBlock,
  suggestSignalState, suggestionText, assumptionFollowUp, followUpText,
  FIELDS, SING, SING_NO, FLD_NO, fldL, fldPh, singL,
  STRAT_FW, LENSES, LENSES_NO, lensWhen, lensAnatomy, lensSmells, smellsFlagged,
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

group("i18n — skjemafelt");
// Hver eneste etikett og plassholder i FIELDS må ha norsk. Denne testen er
// grunnen til at ny gjeld ikke kan snike seg inn: legger du til et felt uten
// å oversette det, feiler den her med feltets navn.
setLang("no");
// Sjekker at oppføringen FINNES, ikke at strengen er ulik — «Signal» og
// «Kill-signal» heter det samme på begge språk, og det er ikke manglende arbeid.
const mangler = [];
for (const coll of Object.keys(FIELDS)) {
  for (const f of FIELDS[coll]) {
    const e = FLD_NO[coll] && FLD_NO[coll][f.k];
    if (!e) { mangler.push(`${coll}.${f.k} (ingen oppføring)`); continue; }
    if (typeof e[0] !== "string" || !e[0]) mangler.push(`${coll}.${f.k} (tom etikett)`);
    if (f.ph && !e[1]) mangler.push(`${coll}.${f.k} (tom plassholder)`);
  }
}
ok(mangler.length === 0, "alle FIELDS-felt har norsk oppføring: mangler " + mangler.join(", "));
// Og motsatt: ingen døde oppføringer i overlayet etter at et felt fjernes.
const doede = [];
for (const coll of Object.keys(FLD_NO)) {
  const kjente = new Set((FIELDS[coll] || []).map(f => f.k));
  for (const k of Object.keys(FLD_NO[coll])) if (!kjente.has(k)) doede.push(`${coll}.${k}`);
}
ok(doede.length === 0, "ingen døde oppføringer i FLD_NO: " + doede.join(", "));
ok(Object.keys(SING).every(k => SING_NO[k] !== undefined), "alle entitetsnavn har norsk");
ok(singL("assumptions") === "Antakelse", "singL bytter språk");
ok(fldL("signals", { k: "thresh", l: "Threshold (number)" }) === "Terskel (tall)", "fldL slår opp riktig");
ok(fldPh("goals", { k: "horizon", ph: "e.g. 2026" }) === "f.eks. 2026", "fldPh slår opp riktig");
setLang("en");
ok(fldL("signals", { k: "thresh", l: "Threshold (number)" }) === "Threshold (number)",
   "engelsk kommer fra FIELDS, ikke fra overlayet");
ok(fldL("signals", { k: "finnesikke", l: "Fallback" }) === "Fallback",
   "ukjent felt faller tilbake til engelsk, ikke til en rå nøkkel");
setLang("no");
ok(fldL("signals", { k: "finnesikke", l: "Fallback" }) === "Fallback",
   "ukjent felt på norsk faller også tilbake, aldri tom streng");
setLang("en");

group("i18n — paritet mellom språkene");
// Enhver nøkkel i det ene språket må finnes i det andre.
const bareEn = Object.keys(T.en).filter(k => T.no[k] === undefined);
const bareNo = Object.keys(T.no).filter(k => T.en[k] === undefined);
ok(bareEn.length === 0, "nøkler som kun finnes på engelsk: " + bareEn.join(", "));
ok(bareNo.length === 0, "nøkler som kun finnes på norsk: " + bareNo.join(", "));
const tomme = Object.keys(T.no).filter(k => T.no[k] === "" || T.no[k] === T.en[k] && /^(rev|sug|form|map|org)\./.test(k));
ok(tomme.length === 0, "norske nøkler som er tomme eller uoversatt: " + tomme.join(", "));

group("linser og failure smells");
ok(Object.keys(LENSES).length === Object.keys(STRAT_FW).length,
   "hvert rammeverk i STRAT_FW har en linse");
ok(Object.keys(STRAT_FW).every(k => LENSES[k]), "ingen rammeverk mangler linse");
ok(Object.keys(LENSES).every(k => STRAT_FW[k]), "ingen linse uten rammeverk");
ok(Object.keys(LENSES).every(k => LENSES[k].smells.length > 0), "hver linse har minst én lukt");
const alleK = Object.values(LENSES).flatMap(l => l.smells.map(s => s.k));
ok(new Set(alleK).size === alleK.length, "luktnøkler er unike på tvers av linser");
ok(Object.values(LENSES).every(l => l.when && l.anatomy), "hver linse har when og anatomy");

group("linser — norsk paritet");
const lmangler = [];
for (const fw of Object.keys(LENSES)) {
  const n = LENSES_NO[fw];
  if (!n) { lmangler.push(`${fw} (ingen norsk linse)`); continue; }
  if (!n.when) lmangler.push(`${fw}.when`);
  if (!n.anatomy) lmangler.push(`${fw}.anatomy`);
  for (const sm of LENSES[fw].smells) {
    const tr = n.smells && n.smells[sm.k];
    if (!tr) { lmangler.push(`${fw}.${sm.k} (ingen norsk lukt)`); continue; }
    if (!tr[0] || !tr[1]) lmangler.push(`${fw}.${sm.k} (tomt spørsmål eller begrunnelse)`);
  }
}
ok(lmangler.length === 0, "alle linser og lukter har norsk: mangler " + lmangler.join(", "));
const ldoede = Object.keys(LENSES_NO).filter(k => !LENSES[k]);
ok(ldoede.length === 0, "ingen døde norske linser: " + ldoede.join(", "));

group("linse-oppslag");
setLang("en");
ok(lensSmells("kernel").length === 3, "kernel har tre lukter");
ok(lensSmells("kernel")[0].q.startsWith("Is the diagnosis"), "engelsk lukt");
ok(lensAnatomy("wardley").startsWith("User →"), "engelsk anatomi");
setLang("no");
ok(lensSmells("kernel")[0].q.startsWith("Er diagnosen"), "norsk lukt");
ok(lensAnatomy("wardley").startsWith("Bruker →"), "norsk anatomi");
ok(lensWhen("premortem").startsWith("Beslutningen er tatt"), "norsk when");
setLang("en");
ok(lensSmells("finnesikke").length === 3, "ukjent rammeverk faller tilbake til kernel");
ok(lensAnatomy("finnesikke") === LENSES.kernel.anatomy, "fallback-anatomi er kernels");
ok(smellsFlagged({}).length === 0 && smellsFlagged(null).length === 0,
   "strategi uten smellFlags gir tom liste, ikke krasj");
ok(smellsFlagged({ smellFlags: ["a", "b"] }).length === 2, "flagg leses ut");
// Luktene må matche artefaktets faktiske felt — ellers spør selvtesten om noe
// som ikke finnes i skjemaet.
const kernelQ = lensSmells("kernel").map(s => s.k);
ok(kernelQ.includes("no-tradeoff"), "kernel spør om notDoing, som finnes i FIELDS");
ok(FIELDS.strategies.some(f => f.k === "notDoing"), "notDoing finnes faktisk i artefaktet");

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
