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
  decl("RADAR_DUE"), decl("RADAR_H"), decl("RADAR_E"),
  func("radarStatus"), func("radarWeight"), func("radarThreatening"),
  decl("STRAT_FW"), decl("LENSES"), decl("LENSES_NO"),
  func("lensNO"), func("lensWhen"), func("lensAnatomy"), func("lensSmells"), func("smellsFlagged"),
  func("lensFields"), func("lensDerive"), func("lensVal"), func("artifactEmpty"),
  func("routeLens"), decl("KEEP_KEYS"), func("premortemCandidates"),
  func("buildSharePayload"), func("shareUrl"),
  "let REVIEW_SESSION=null;", "let stratF='*';",
  func("reviewSessionStart"), func("reviewNoteSignal"), func("reviewNoteBet"),
  func("reviewChanged"), func("closeReview"),
  "function uid(p){return p+Math.random().toString(36).slice(2,8)}",
  "function save(){}",
  "let SHARES=[];", func("shareOf"), func("shareStale"),
  "function byId(c,i){return (DB[c]||[]).find(x=>x.id===i)}",
  // shareUrl leser location; stubbes saa lenkeformatet kan testes utenfor nettleser.
  "const location={href:'https://spine.example/app.html'};",
  // assumptionFollowUp slår opp i DB og L(); begge stubbes her.
  "let DB={signals:[],assumptions:[]};",
  "function L(o,f){return o?o[f]:undefined}",
  "return {SEED,SEED_NO,T,numOrBlank,readings,sparkline,sparkBlock," +
  "suggestSignalState,suggestionText,assumptionFollowUp,followUpText," +
  "FIELDS,SING,SING_NO,FLD_NO,fldL,fldPh,singL," +
  "STRAT_FW,LENSES,LENSES_NO,lensWhen,lensAnatomy,lensSmells,smellsFlagged," +
  "lensFields,lensDerive,lensVal,artifactEmpty,routeLens,KEEP_KEYS,premortemCandidates," +
  "buildSharePayload,shareUrl,shareStale,setShares:v=>{SHARES=v}," +
  "reviewNoteSignal,reviewNoteBet,reviewChanged,closeReview," +
  "radarStatus,radarWeight,radarThreatening,RADAR_DUE," +
  "resetReview:()=>{REVIEW_SESSION=null}," +
  "setLang:v=>{LANG=v},setDB:v=>{DB=v}};",
].join("\n");

const {
  SEED, SEED_NO, T, numOrBlank, readings, sparkline, sparkBlock,
  suggestSignalState, suggestionText, assumptionFollowUp, followUpText,
  FIELDS, SING, SING_NO, FLD_NO, fldL, fldPh, singL,
  STRAT_FW, LENSES, LENSES_NO, lensWhen, lensAnatomy, lensSmells, smellsFlagged,
  lensFields, lensDerive, lensVal, artifactEmpty, routeLens, KEEP_KEYS, premortemCandidates,
  buildSharePayload, shareUrl, shareStale, setShares,
  reviewNoteSignal, reviewNoteBet, reviewChanged, closeReview, resetReview,
  radarStatus, radarWeight, radarThreatening, RADAR_DUE,
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
  for (const f of LENSES[fw].fields || []) {
    const tr = n.fields && n.fields[f.k];
    if (!tr) { lmangler.push(`${fw}.${f.k} (ingen norsk arbeidsfelt)`); continue; }
    if (!tr[0]) lmangler.push(`${fw}.${f.k} (tom etikett)`);
    if (f.ph && !tr[1]) lmangler.push(`${fw}.${f.k} (tom plassholder)`);
  }
  for (const k of Object.keys(n.fields || {}))
    if (!(LENSES[fw].fields || []).some(f => f.k === k)) lmangler.push(`${fw}.${k} (dødt norsk arbeidsfelt)`);
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

group("linsens arbeidsflate");
setLang("en");
ok(lensFields("kernel").length === 3, "kernel har tre arbeidsfelt");
ok(lensFields("one-pager").length === 0, "one-pager har ingen — det er å hoppe over linsen");
ok(lensFields("wardley").every(f => f.l && f.t), "hvert felt har etikett og type");
ok(lensFields("kernel").every(f => ["textarea", "lines"].includes(f.t)),
   "kun typer arbeidsflaten faktisk kan rendre");
setLang("no");
ok(lensFields("kernel")[0].l === "Diagnose", "arbeidsfelt oversettes");
ok(lensFields("kernel")[0].ph.includes("hindringen"), "plassholder oversettes");
setLang("en");

group("derive — fyller bare tomt");
// Hvert derive-mål må finnes i artefaktet, og typene må stemme.
const dfeil = [];
for (const fw of Object.keys(LENSES)) {
  const der = lensDerive(fw), flds = Object.fromEntries(lensFields(fw).map(f => [f.k, f.t]));
  for (const [from, to] of Object.entries(der)) {
    const art = FIELDS.strategies.find(f => f.k === to);
    if (!art) { dfeil.push(`${fw}: ${to} finnes ikke i artefaktet`); continue; }
    if (!flds[from]) { dfeil.push(`${fw}: ${from} finnes ikke som arbeidsfelt`); continue; }
    const lensArr = flds[from] === "lines", artArr = art.t === "lines";
    if (lensArr !== artArr) dfeil.push(`${fw}: ${from}(${flds[from]}) → ${to}(${art.t}) typemismatch`);
  }
}
ok(dfeil.length === 0, "derive-koblingene er typeriktige: " + dfeil.join(", "));
ok(Object.keys(lensDerive("one-pager")).length === 0, "one-pager deriverer ingenting");
ok(artifactEmpty({ challenge: "" }, "challenge"), "tom streng er tom");
ok(artifactEmpty({ challenge: "   " }, "challenge"), "bare blanke er tomt");
ok(artifactEmpty({ moves: [] }, "moves"), "tom liste er tom");
ok(!artifactEmpty({ moves: ["a"] }, "moves"), "liste med innhold er ikke tom");
ok(!artifactEmpty({ challenge: "x" }, "challenge"), "tekst er ikke tom");
ok(artifactEmpty({}, "challenge"), "manglende felt er tomt");
ok(lensVal({}, "diagnosis") === "", "lensVal på strategi uten linse gir tom");
ok(lensVal({ lens: { fields: { diagnosis: "x" } } }, "diagnosis") === "x", "lensVal leser ut");

group("routeren");
ok(routeLens({ q1: "unclear-problem" }) === "kernel", "vet ikke hva → kernel");
ok(routeLens({ q1: "unclear-where" }) === "wardley", "vet ikke hvor → wardley");
ok(routeLens({ q1: "choosing-between" }) === "cascade", "velger mellom veier → cascade");
ok(routeLens({ q1: "decided", q2: "risky" }) === "premortem", "tatt valg + risiko → premortem");
ok(routeLens({ q1: "decided", q2: "calm" }) === "one-pager", "tatt valg + rolig → one-pager");
ok(routeLens({}) === "one-pager", "tomt svar faller til one-pager, ikke undefined");
ok(LENSES[routeLens({ q1: "tull" })], "ukjent svar gir alltid en gyldig linse");
const alleRuter = new Set([
  routeLens({ q1: "unclear-problem" }), routeLens({ q1: "unclear-where" }),
  routeLens({ q1: "choosing-between" }), routeLens({ q1: "decided", q2: "risky" }),
  routeLens({ q1: "decided", q2: "calm" })]);
ok(alleRuter.size === 5, "de fem svarene treffer fem ulike linser — ingen er uoppnåelig");

group("pre-mortem til registrene");
const pm = (causes, earliest) => premortemCandidates({ lens: { fields: { causes, earliest } } });
ok(pm(["a", "b"], ["x", "y"]).length === 2, "to årsaker + to varsler gir to par");
ok(pm(["a", "b"], ["x", "y"])[0].cause === "a" && pm(["a", "b"], ["x", "y"])[0].signal === "x",
   "paret er årsak i mot varsel i");
ok(pm(["a", "b", "c"], ["x"]).length === 3, "flere årsaker enn varsler: alle årsaker med");
ok(pm(["a"], ["x", "y", "z"]).length === 3, "flere varsler enn årsaker: alle varsler med");
ok(pm(["a", "b"], ["x"])[1].signal === "", "årsak uten varsel får tomt signal, ikke undefined");
ok(pm([], []).length === 0, "tom pre-mortem gir ingen kandidater");
ok(premortemCandidates({}).length === 0, "strategi uten linse krasjer ikke");
ok(pm(["a"], ["x"]).every(c => c.on === true), "alt er huket av som utgangspunkt");

group("import bevarer lens og flagg");
ok(KEEP_KEYS.strategies.includes("lens"), "lens overlever import");
ok(KEEP_KEYS.strategies.includes("smellFlags"), "smellFlags overlever import");
ok(KEEP_KEYS.strategies.includes("smellChecked"), "smellChecked overlever import");
ok(KEEP_KEYS.signals.includes("log"), "avlesningsloggen overlever import");

group("delt artefakt — hva payloaden inneholder");
setDB({
  signals: SEED.signals, assumptions: SEED.assumptions,
  goals: SEED.goals, decisions: SEED.decisions, strategies: SEED.strategies,
});
const st1 = SEED.strategies.find(x => x.id === "st1");
const pay = buildSharePayload(st1, {});
ok(pay.v === 1, "payload er versjonert for framtidig lesing");
ok(pay.strategy.name === st1.name, "artefaktet er med");
ok(Array.isArray(pay.strategy.moves), "moves er en liste, ikke undefined");
ok(pay.bets.length > 0, "bettene er med");
ok(pay.signals.length > 0, "signalene er med");
ok(pay.lang === "en" || pay.lang === "no", "publisererens språk følger med");

group("delt artefakt — hva den IKKE lekker");
ok(pay.decisions === undefined, "beslutningsloggen er AV som standard");
ok(buildSharePayload(st1, { decisions: true }).decisions !== undefined,
   "beslutningsloggen kan slås på bevisst");
ok(pay.bets.every(b => b.owner === undefined), "eiernavn på bets er ikke med");
ok(pay.signals.every(s => s.owner === undefined), "eiernavn på signaler er ikke med");
ok(pay.signals.every(s => s.log === undefined), "avlesningshistorikken er internt arbeid");
ok(pay.insights === undefined, "innsikter med kilder er ikke med");
ok(pay.bets.every(b => b.note === undefined), "interne notater på bets er ikke med");
const flat = JSON.stringify(pay);
ok(!flat.includes("user_id") && !flat.includes("@"), "ingen bruker-id eller e-post i payloaden");

group("delt artefakt — retired filtreres bort");
setDB({
  signals: [{ id: "s9", strategy: st1.name, signal: "pensjonert", state: "retired", watches: "" }],
  assumptions: [{ id: "a9", strategy: st1.name, statement: "pensjonert", state: "retired" }],
  goals: [], decisions: [], strategies: SEED.strategies,
});
const p2 = buildSharePayload(st1, {});
ok(p2.bets.length === 0, "pensjonerte bets er ikke med");
ok(p2.signals.length === 0, "pensjonerte signaler er ikke med");
setDB({
  signals: SEED.signals, assumptions: SEED.assumptions,
  goals: SEED.goals, decisions: SEED.decisions, strategies: SEED.strategies,
});

group("delt artefakt — versjonssporing");
setShares([{ token: "abc", strategy_id: "st1", version: "3" }]);
ok(shareStale({ id: "st1", version: 3 }) === false, "samme versjon er ikke utdatert");
ok(shareStale({ id: "st1", version: 4 }) === true, "ny versjon gjør delingen utdatert");
ok(shareStale({ id: "st2", version: 1 }) === false, "strategi uten deling er ikke utdatert");
setShares([]);
ok(shareStale({ id: "st1", version: 3 }) === false, "ingen delinger: ingenting er utdatert");

group("delt artefakt — lenkeformat");
const u = shareUrl("tok-123");
ok(u.includes("s.html#"), "tokenet står i fragmentet, ikke i query");
ok(!u.includes("?"), "ingen query-parametre — tokenet havner ikke i serverlogger");
ok(shareUrl("a b&c").includes(encodeURIComponent("a b&c")), "tokenet URL-kodes");

group("gjennomgangsøkten");
const freshDB = () => { setDB({ signals:[], assumptions:[], goals:[], decisions:[],
  strategies:SEED.strategies, reviews:[] }); resetReview(); };
freshDB();
ok(reviewChanged() === 0, "ingen økt: ingenting endret");
reviewNoteSignal({ id:"s1", signal:"x", state:"drifting" }, "drifting", "");
ok(reviewChanged() === 0, "signal lagret uten endring og uten avlesning teller ikke");
reviewNoteSignal({ id:"s2", signal:"y", state:"disagreeing" }, "drifting", "");
ok(reviewChanged() === 1, "tilstandsendring teller");
reviewNoteSignal({ id:"s3", signal:"z", state:"agreeing" }, "agreeing", "62%");
ok(reviewChanged() === 2, "ny avlesning teller selv uten tilstandsendring");
reviewNoteBet({ id:"a1", statement:"b", state:"broken", confidence:"low" }, "shaky", "low");
ok(reviewChanged() === 3, "bet som flyttet tilstand teller");
reviewNoteBet({ id:"a2", statement:"c", state:"holding", confidence:"medium" }, "holding", "low");
ok(reviewChanged() === 4, "bet som bare endret konfidens teller");
reviewNoteBet({ id:"a2", statement:"c", state:"shaky", confidence:"high" }, "holding", "low");
ok(reviewChanged() === 4, "samme bet igjen oppdaterer, dobbelttelles ikke");

group("arkivering");
freshDB();
reviewNoteSignal({ id:"s1", signal:"x", state:"disagreeing" }, "drifting", "12");
reviewNoteBet({ id:"a1", statement:"b", state:"broken", confidence:"low" }, "shaky", "low");
reviewNoteBet({ id:"a2", statement:"c", state:"holding", confidence:"low" }, "holding", "low");
const rec = closeReview("");
ok(rec !== null, "gjennomgangen arkiveres");
ok(/^\d{4}-\d{2}-\d{2}$/.test(rec.date), "datoen er en ren dato");
ok(rec.signals.length === 1 && rec.bets.length === 2, "både signaler og bets følger med");
ok(rec.betsBroken === 1, "teller bets som faktisk brakk");
ok(rec.signals[0].from === "drifting" && rec.signals[0].to === "disagreeing",
   "arkivet husker hva tilstanden var før");
ok(reviewChanged() === 0, "økten nullstilles etter avslutning");
ok(closeReview("") === null, "avslutte to ganger arkiverer ikke tomt");

group("arkivering — bet som ikke brakk");
freshDB();
reviewNoteBet({ id:"a1", statement:"b", state:"broken", confidence:"low" }, "broken", "low");
ok(closeReview("").betsBroken === 0, "et bet som allerede var brutt telles ikke som nytt brudd");
freshDB();
reviewNoteSignal({ id:"s1", signal:"x", state:"agreeing" }, "disagreeing", "");
const r2 = closeReview("d1");
ok(r2.decision === "d1", "beslutningen kobles til gjennomgangen");
ok(r2.bets.length === 0, "en gjennomgang uten bet-endringer arkiveres likevel");

group("omgivelsesradar — foreldelse er alarmen");
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const force = (horizon, checked) => ({ horizon, checked, exposure:"high", movement:"steady" });
ok(radarStatus(force("already", "")).stale === true, "aldri sett på er alltid foreldet");
ok(radarStatus(force("already", "")).key === "radar.never", "og sier at den aldri er sett på");
ok(radarStatus(force("already", daysAgo(5))).stale === false, "nylig sett på: fersk");
ok(radarStatus(force("already", daysAgo(40))).stale === true,
   "kraft som biter allerede forfaller etter 30 dager");
ok(radarStatus(force(">3y", daysAgo(40))).stale === false,
   "samme alder, fjern horisont: ikke forfalt");
ok(radarStatus(force(">3y", daysAgo(200))).stale === true, "men 200 dager er forfalt selv på >3y");
ok(radarStatus(force("already", daysAgo(25))).cls === "b-warn",
   "nærmer seg forfall gir advarsel før den bikker");
ok(radarStatus(null).stale === true, "tomt input er foreldet, ikke krasj");
ok(radarStatus({ horizon:"tull", checked:daysAgo(200) }).stale === true,
   "ukjent horisont faller til 90 dager");
// Jo nærmere det biter, jo oftere må du se på det.
ok(RADAR_DUE["already"] < RADAR_DUE["<1y"], "already forfaller før <1y");
ok(RADAR_DUE["<1y"] < RADAR_DUE["1-3y"], "<1y forfaller før 1-3y");
ok(RADAR_DUE["1-3y"] < RADAR_DUE[">3y"], "1-3y forfaller før >3y");

group("omgivelsesradar — vekting");
const wf = (exposure, horizon, movement) => radarWeight({ exposure, horizon, movement });
ok(wf("high","already","steady") > wf("low","already","steady"), "høy eksponering veier tyngre");
ok(wf("high","already","steady") > wf("high",">3y","steady"), "nært veier tyngre enn fjernt");
ok(wf("high","already","accelerating") > wf("high","already","steady"),
   "akselererende bevegelse løfter vekten");
ok(wf("low",">3y","stalling") >= 1, "svakeste kraft har fortsatt en vekt, ikke null");
ok(radarWeight({}) >= 1, "tomt objekt krasjer ikke");

group("omgivelsesradar — kobling til bettene");
setDB({ radar:SEED.radar, assumptions:SEED.assumptions, signals:SEED.signals,
        insights:SEED.insights, goals:SEED.goals, decisions:SEED.decisions,
        strategies:SEED.strategies, reviews:[] });
ok(radarThreatening("a1").length === 2, "a1 trues av to krefter i seed");
ok(radarThreatening("a3").length === 1, "a3 trues av én");
ok(radarThreatening("a5").length === 0, "a5 trues ikke av noen");
ok(radarThreatening("finnes-ikke").length === 0, "ukjent bet gir tom liste");
ok(SEED.radar.every(r => (r.threatens||[]).every(id => SEED.assumptions.some(a => a.id === id))),
   "hver kobling i seed peker på et bet som faktisk finnes");
ok(SEED.radar.some(r => !r.checked), "seed har en kraft som aldri er sett på — demoen viser alarmen");

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
