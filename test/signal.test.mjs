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
  decl("RADAR_RINGS"), decl("RADAR_DOMS"), func("radarChart"), func("lvl"),
  decl("LABEL_F"), decl("OPT_PREFIX"), func("optL"),
  decl("DIAG_RANK"), decl("DIAG_DEAD"), func("strategiesOfDiagnosis"), func("diagnosisOf"),
  func("liveStrategy"), func("strategiesWithoutDiagnosis"), func("diagnosesUnanswered"),
  func("diagnosesVoided"), func("strategiesOnVoidDiagnosis"), func("diagnosisWeak"),
  decl("NEED_SRC"), decl("NEED_RANK"), oneLine(/const NEED_STALE_DAYS\s*=/),
  func("outcomesOfNeed"), func("needOf"), func("outcomesWithoutNeed"), func("needsUnserved"),
  func("needsAssumedButLoadBearing"), func("needStale"), func("needsStale"),
  func("needWeak"), func("needSrcCounts"),
  decl("CV_KINDS"), decl("CV_COLL"), decl("CV_GLYPH"), decl("CV_W"), decl("COLLS"),
  decl("CV_TOKEN"), decl("CV_GROUPS"), decl("CV_QUICK"),
  decl("COMMIT"), decl("COMMIT_W"), oneLine(/const COMMIT_STALE_REVIEWS\s*=/),
  func("liveBets"), func("betsUnfunded"), func("betsFundedBroken"), func("betMovedIn"),
  func("recentReviews"), func("betFundedStuck"), func("betsFundedStuck"),
  func("nothingStarved"), func("commitCounts"),
  decl("OUT_CATS"), func("outcomesOfGoal"), func("goalsProductOnly"),
  func("outcomesUncategorised"), func("outcomeCatCounts"),
  func("valuesOf"), func("outcomesWithoutValue"), func("valueGap"),
  func("valueWeak"), func("valueChain"), decl("VAL_SCOPE_RANK"),
  func("valuesOfGoal"), func("outcomesUnvaluedOfGoal"),
  func("valuesOfStrategy"), func("outcomesUnvaluedFor"),
  func("rightHolder"), func("rightVetoHolder"), func("rightsDrift"),
  func("decisionsOfRight"), oneLine(/const RIGHT_STALE_DAYS\s*=/), func("rightUnexercised"),
  func("nameMatches"), func("decisionMandate"), func("rightsOrphans"),
  func("rightsOutside"), func("rightsDrifted"), func("rightWeak"), decl("RIGHT_RANK"),
  decl("RADAR_KEYS"), decl("RADAR_VALS"),
  func("radarMapValue"), func("radarKeyFor"), func("parseRadarText"),
  decl("STRAT_FW"), decl("LENSES"), decl("LENSES_NO"),
  func("lensNO"), func("lensWhen"), func("lensAnatomy"), func("lensSmells"), func("smellsFlagged"),
  func("lensFields"), func("lensDerive"), func("lensVal"), func("artifactEmpty"),
  func("routeLens"), decl("KEEP_KEYS"), func("premortemCandidates"),
  func("buildSharePayload"), func("shareUrl"),
  "let REVIEW_SESSION=null;", "let stratF='*';",
  func("reviewSessionStart"), func("reviewNoteSignal"), func("reviewNoteBet"),
  func("reviewChanged"), func("closeReview"), func("reviewNoteValue"),
  func("strategiesOfValue"), func("valuesDue"), func("valueGapInView"),
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
  "reviewNoteSignal,reviewNoteBet,reviewChanged,closeReview,reviewNoteValue," +
  "strategiesOfValue,valuesDue,valueGapInView,setStratF:v=>{stratF=v}," +
  "radarStatus,radarWeight,radarThreatening,RADAR_DUE," +
  "radarChart,RADAR_RINGS,RADAR_DOMS,parseRadarText,radarMapValue," +
  "LABEL_F,OPT_PREFIX,optL," +
  "DIAG_RANK,DIAG_DEAD,strategiesOfDiagnosis,diagnosisOf,liveStrategy," +
  "strategiesWithoutDiagnosis,diagnosesUnanswered,diagnosesVoided," +
  "strategiesOnVoidDiagnosis,diagnosisWeak," +
  "NEED_SRC,NEED_RANK,NEED_STALE_DAYS,outcomesOfNeed,needOf,outcomesWithoutNeed," +
  "needsUnserved,needsAssumedButLoadBearing,needStale,needsStale,needWeak,needSrcCounts," +
  "CV_KINDS,CV_COLL,CV_GLYPH,CV_W,COLLS,CV_TOKEN,CV_GROUPS,CV_QUICK," +
  "COMMIT,COMMIT_STALE_REVIEWS,liveBets,betsUnfunded,betsFundedBroken,betMovedIn," +
  "recentReviews,betFundedStuck,betsFundedStuck,nothingStarved,commitCounts," +
  "OUT_CATS,outcomesOfGoal,goalsProductOnly,outcomesUncategorised,outcomeCatCounts," +
  "valuesOf,outcomesWithoutValue,valueGap,valueWeak,valueChain," +
  "valuesOfGoal,outcomesUnvaluedOfGoal,valuesOfStrategy,outcomesUnvaluedFor," +
  "rightHolder,rightVetoHolder,rightsDrift,decisionsOfRight,rightUnexercised," +
  "nameMatches,decisionMandate,rightsOrphans,rightsOutside,rightsDrifted,rightWeak," +
  "RIGHT_RANK,RIGHT_STALE_DAYS," +
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
  reviewNoteValue, strategiesOfValue, valuesDue, valueGapInView, setStratF,
  radarStatus, radarWeight, radarThreatening, RADAR_DUE,
  radarChart, RADAR_RINGS, RADAR_DOMS, parseRadarText, radarMapValue,
  LABEL_F, OPT_PREFIX, optL,
  DIAG_RANK, DIAG_DEAD, strategiesOfDiagnosis, diagnosisOf, liveStrategy,
  strategiesWithoutDiagnosis, diagnosesUnanswered, diagnosesVoided,
  strategiesOnVoidDiagnosis, diagnosisWeak,
  NEED_SRC, NEED_RANK, NEED_STALE_DAYS, outcomesOfNeed, needOf, outcomesWithoutNeed,
  needsUnserved, needsAssumedButLoadBearing, needStale, needsStale, needWeak, needSrcCounts,
  CV_KINDS, CV_COLL, CV_GLYPH, CV_W, COLLS, CV_TOKEN, CV_GROUPS, CV_QUICK,
  COMMIT, COMMIT_STALE_REVIEWS, liveBets, betsUnfunded, betsFundedBroken, betMovedIn,
  recentReviews, betFundedStuck, betsFundedStuck, nothingStarved, commitCounts,
  OUT_CATS, outcomesOfGoal, goalsProductOnly, outcomesUncategorised, outcomeCatCounts,
  valuesOf, outcomesWithoutValue, valueGap, valueWeak, valueChain,
  valuesOfGoal, outcomesUnvaluedOfGoal, valuesOfStrategy, outcomesUnvaluedFor,
  rightHolder, rightVetoHolder, rightsDrift, decisionsOfRight, rightUnexercised,
  nameMatches, decisionMandate, rightsOrphans, rightsOutside, rightsDrifted, rightWeak,
  RIGHT_RANK, RIGHT_STALE_DAYS,
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

group("horisontvisualisering");
const chart = radarChart(SEED.radar);
ok(chart.includes("<svg"), "grafen tegnes");
ok(radarChart([]) === "", "tom radar gir ingen graf, ikke en tom ramme");
ok(radarChart([SEED.radar[0]]).includes("<svg"), "én kraft tegner fortsatt");
// Hver kraft må få nøyaktig ett punkt — ingen som forsvinner i en bøtte.
const dots = (chart.match(/class="rc-dot"/g) || []).length;
ok(dots === SEED.radar.length, `alle ${SEED.radar.length} kreftene får et punkt (fikk ${dots})`);
ok(!/NaN|undefined/.test(chart), "ingen NaN eller undefined i SVG-en");

// Geometri: alt innenfor viewBox, og radius følger horisonten.
const rcPts = [...chart.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="var\(--(bad|warn|good)\)"/g)]
  .map(m => ({ x:+m[1], y:+m[2], r:+m[3], col:m[4] }));
ok(rcPts.length === SEED.radar.length, "fant alle datapunktene i markup-en");
ok(rcPts.every(c => c.x >= 0 && c.x <= 460 && c.y >= 0 && c.y <= 460), "alle punkter innenfor viewBox");
ok(rcPts.every(c => c.r * 2 >= 8), "hvert punkt er minst 8px i diameter");
const dist = c => Math.hypot(c.x - 230, c.y - 230);
ok(rcPts.every(c => dist(c) <= 190), "ingen punkter utenfor ytterste ring");

group("horisontvisualisering — kanalene koder riktig");
const one = (horizon, exposure, movement, checked) =>
  radarChart([{ id:"x", force:"f", domain:"regulatory", horizon, exposure, movement, checked }]);
const posOf = svg => {
  const m = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="var\(--(bad|warn|good)\)"/.exec(svg);
  return { x:+m[1], y:+m[2], r:+m[3], col:m[4] };
};
const dNow = posOf(one("already","high","steady",daysAgo(1)));
const dFar = posOf(one(">3y","high","steady",daysAgo(1)));
ok(Math.hypot(dNow.x-230,dNow.y-230) < Math.hypot(dFar.x-230,dFar.y-230),
   "det som biter allerede ligger nærmere sentrum enn det som ligger etter 3 år");
ok(posOf(one("<1y","high","steady",daysAgo(1))).r > posOf(one("<1y","low","steady",daysAgo(1))).r,
   "høy eksponering gir større punkt");
ok(posOf(one("<1y","high","steady","")).col === "bad", "aldri sett på farges rødt");
ok(posOf(one("<1y","high","steady",daysAgo(1))).col === "good", "nylig sett på farges grønt");
// Bare inne i <svg> — legenden har sitt eget pil-ikon som alltid er der.
const svgOf = h => h.slice(h.indexOf("<svg"), h.indexOf("</svg>"));
ok(/<path d="M[\d.]+,[\d.]+ L/.test(svgOf(one("<1y","high","accelerating",daysAgo(1)))),
   "akselererende kraft får pil — sekundær koding, ikke bare farge");
ok(!/<path d="M[\d.]+,[\d.]+ L/.test(svgOf(one("<1y","high","steady",daysAgo(1)))),
   "jevn bevegelse får ingen pil i grafen");

group("horisontvisualisering — sammenfall og tilgjengelighet");
// Fire krefter i samme område og horisont skal spres, ikke stables oppå hverandre.
const same = ["a","b","c","d"].map(id =>
  ({ id, force:id, domain:"market", horizon:"<1y", exposure:"medium", movement:"steady", checked:daysAgo(1) }));
const spread = [...radarChart(same).matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="6.5"/g)]
  .map(m => `${m[1]},${m[2]}`);
ok(new Set(spread).size === 4, "fire krefter i samme bøtte får fire ulike posisjoner");
ok(chart.includes('role="img"'), "grafen er merket som bilde");
ok(/aria-label="[^"]{40,}"/.test(chart), "aria-label beskriver innholdet, ikke bare «radar»");
ok(chart.includes("<title>"), "hvert punkt har en tittel for hover");
ok(chart.includes('tabindex="0"'), "punktene kan nås med tastatur");
ok(RADAR_DOMS.every(d => chart.includes(">" + T.en["radar.dom." + d] + "<")),
   "alle seks områdene er merket rundt kanten");
ok(RADAR_RINGS.slice(1).every(r => chart.includes(">" + T.en["radar.hz." + r] + "<")),
   "de tre ytre ringene er merket i plottet");
ok(!chart.includes(">" + T.en["radar.hz.already"] + "<"),
   "innerste ring merkes ikke i plottet — legenden sier det, og etiketten kolliderte");
ok(chart.includes(T.en["radar.lg.centre"]), "legenden forklarer hva sentrum betyr");
setLang("no");
ok(radarChart(SEED.radar).includes("Regulatorisk"), "grafen bytter språk");
setLang("en");

group("import av krefter — punktliste");
const P1 = parseRadarText(`
- EU-forordningen om KI tolkes av nasjonale tilsyn
- Leverandøren har signalisert slutt på vedlikehold
* Rekruttering strammer seg til
• Kommunereform er på trappene
`);
ok(P1.length === 4, "fire punkter blir fire krefter uansett kulepunkt-tegn");
ok(P1[0].force.startsWith("EU-forordningen"), "teksten beholdes som den står");
ok(P1.every(r => r.checked === ""), "importerte krefter er aldri 'sett på' — de er røde fra start");
ok(parseRadarText("") .length === 0, "tom tekst gir ingen krefter");
ok(parseRadarText("   \n\n  ").length === 0, "bare blanke linjer gir ingen krefter");
ok(parseRadarText("En enkelt linje uten kulepunkt").length === 1, "en naken linje blir også en kraft");

group("import av krefter — strukturerte blokker");
const P2 = parseRadarText(`
## EU-forordningen om KI tolkes av nasjonale tilsyn
område: regulatorisk
horisont: <1 år
eksponering: høy
bevegelse: akselererer
kilde: Datatilsynets veiledningsrunde
notat: Kan kreve samsvarsvurdering.

## Leverandøren har signalisert slutt på vedlikehold
domain: supplier
horizon: 1-3y
exposure: high
movement: unclear
`);
ok(P2.length === 2, "to overskrifter blir to krefter");
ok(P2[0].domain === "regulatory", "norsk «regulatorisk» mappes til regulatory");
ok(P2[0].horizon === "<1y", "«<1 år» mappes til <1y");
ok(P2[0].exposure === "high", "«høy» mappes til high");
ok(P2[0].movement === "accelerating", "«akselererer» mappes til accelerating");
ok(P2[0].source === "Datatilsynets veiledningsrunde", "kilde beholdes ordrett");
ok(P2[0].note === "Kan kreve samsvarsvurdering.", "notat beholdes ordrett");
ok(P2[1].domain === "supplier" && P2[1].horizon === "1-3y", "engelske nøkler og verdier virker også");
ok(P2[1].movement === "unclear", "unclear mappes");

group("import av krefter — tolerant, men gjetter ikke");
ok(radarMapValue("domain", "tullball") === "", "ukjent verdi gir tomt felt, ikke en gjetning");
ok(radarMapValue("domain", "") === "", "tom verdi gir tomt felt");
ok(radarMapValue("exposure", "HØY") === "high", "store bokstaver spiller ingen rolle");
ok(radarMapValue("horizon", "allerede") === "already", "«allerede» mappes");
ok(radarMapValue("horizon", "Innen et år") === "<1y", "hel frase mappes");
ok(radarMapValue("domain", "Leverandør") === "supplier", "æøå i verdien håndteres");
const P3 = parseRadarText("## En kraft\nområde: vetikke\neksponering: høy");
ok(P3[0].domain === "" && P3[0].exposure === "high",
   "ugyldig felt tømmes uten å ødelegge de gyldige på samme kraft");

group("import av krefter — rare inndata");
ok(parseRadarText("område: regulatorisk\neksponering: høy").length === 0,
   "metadata uten en kraft over seg gir ingen kraft");
const P4 = parseRadarText("## Kraft\nEn løs linje under overskriften\nog enda en");
ok(P4.length === 1, "løse linjer starter ikke nye krefter under en overskrift");
ok(P4[0].note === "En løs linje under overskriften og enda en", "de samles i notatet");
const P5 = parseRadarText("- Kraft A\n  - område: teknologi\n- Kraft B");
ok(P5.length === 2, "et punkt som er nøkkel:verdi teller ikke som ny kraft");
ok(P5[0].domain === "technology", "innrykket nøkkel:verdi treffer riktig kraft");
ok(parseRadarText("###### Dyp overskrift")[0].force === "Dyp overskrift", "h1–h6 fungerer alle");
ok(parseRadarText("## \n- ekte kraft").length === 1, "tom overskrift forkastes");
ok(parseRadarText("---\n***\n- ekte kraft").length === 1, "skillelinjer forkastes");
ok(parseRadarText("- \n- ekte kraft").length === 1, "tomt kulepunkt forkastes");
ok(parseRadarText(null).length === 0 && parseRadarText(undefined).length === 0, "null/undefined krasjer ikke");
ok(parseRadarText("- A\r\n- B").length === 2, "CRLF-linjeskift håndteres");

group("import av krefter — treffer datamodellen");
const felt = new Set(FIELDS.radar.map(f => f.k));
ok(P2.every(r => Object.keys(r).every(k => felt.has(k))),
   "parseren produserer bare felt som finnes i FIELDS.radar");
const segOpts = Object.fromEntries(FIELDS.radar.filter(f => f.t === "seg").map(f => [f.k, f.opts]));
ok(P2.every(r => ["domain","horizon","exposure","movement"]
   .every(k => !r[k] || segOpts[k].includes(r[k]))),
   "hver mappet verdi er en gyldig opsjon i skjemaet");

group("verdi — kjeden mellom utfall og gevinst");
const fullDB = () => setDB({
  strategies:SEED.strategies, assumptions:SEED.assumptions, signals:SEED.signals,
  goals:SEED.goals, outcomes:SEED.outcomes, values:SEED.values,
  decisions:SEED.decisions, radar:SEED.radar, reviews:[] });
fullDB();
ok(valuesOf("o4").length === 2, "o4 bærer to verdipåstander — ett utfall, flere gevinster");
ok(valuesOf("o3").length === 1, "o3 bærer driftsbesparelsen");
ok(valuesOf("finnes-ikke").length === 0, "ukjent utfall gir tom liste");
const ch = valueChain(SEED.values.find(v => v.id === "v1"));
ok(ch.outcome && ch.outcome.id === "o4", "kjeden finner utfallet");
ok(ch.goal && ch.goal.id === "g3", "kjeden går videre til målet gjennom utfallet");
ok(ch.signal && ch.signal.id === "s4", "kjeden finner signalet som måler utfallet");
ok(valueChain(null) === null, "tom verdi gir ingen kjede");
ok(valueChain({claim:"løs"}).outcome === null, "verdi uten utfall gir kjede uten utfall, ikke krasj");

group("verdi — de to svikttilstandene");
// Den viktige: utfallet er på sporet, men gevinsten uteble.
setDB({ outcomes:[{id:"oX", statement:"nådd", state:"on-track"}],
        values:[{id:"vX", claim:"gevinst", fromOutcome:"oX", state:"not-materialised"}],
        goals:[], signals:[] });
ok(valueGap().length === 1, "utfall på sporet + gevinst uteble = gap");
setDB({ outcomes:[{id:"oX", state:"on-track"}],
        values:[{id:"vX", fromOutcome:"oX", state:"partial"}], goals:[], signals:[] });
ok(valueGap().length === 1, "delvis realisert på et utfall på sporet teller også");
setDB({ outcomes:[{id:"oX", state:"on-track"}],
        values:[{id:"vX", fromOutcome:"oX", state:"realised"}], goals:[], signals:[] });
ok(valueGap().length === 0, "realisert gevinst er ikke et gap");
setDB({ outcomes:[{id:"oX", state:"off-track"}],
        values:[{id:"vX", fromOutcome:"oX", state:"not-materialised"}], goals:[], signals:[] });
ok(valueGap().length === 0,
   "gevinst som uteble mens utfallet IKKE er nådd er ikke gapet — da er årsaken kjent");
setDB({ outcomes:[], values:[{id:"vX", state:"not-materialised"}], goals:[], signals:[] });
ok(valueGap().length === 0, "verdi uten utfall kan ikke være et gap");

// Den andre enden: et utfall ingen har begrunnet.
fullDB();
ok(outcomesWithoutValue().length === 0, "hvert utfall i seed har minst én verdipåstand");
ok(valueGap().length === 1, "seed viser gapet: ett utfall på sporet der gevinsten ikke landet");
ok(valueGap()[0].id === "v5", "det er driftsbesparelsen på TØFF-migreringen");
setDB({ outcomes:SEED.outcomes, values:[], goals:[], signals:[] });
ok(outcomesWithoutValue().length === SEED.outcomes.length, "uten verdier er alle utfall ubegrunnet");

group("verdi — når påstanden ikke kan etterprøves");
ok(valueWeak({mechanism:"a", evidence:"b", fromOutcome:"o1"}).length === 0, "komplett påstand er ikke svak");
ok(valueWeak({evidence:"b", fromOutcome:"o1"}).includes("mechanism"), "mangler «slik at»");
ok(valueWeak({mechanism:"a", fromOutcome:"o1"}).includes("evidence"), "mangler bevis");
ok(valueWeak({mechanism:"a", evidence:"b"}).includes("outcome"), "mangler utfall");
ok(valueWeak({mechanism:"   ", evidence:"b", fromOutcome:"o1"}).includes("mechanism"),
   "bare blanke teller som manglende mekanisme");
ok(valueWeak({}).length === 3 && valueWeak(null).length === 3, "tomt input gir alle tre, ikke krasj");

group("verdi — treffer datamodellen");
fullDB();
const vfelt = new Set(FIELDS.values.map(f => f.k));
ok(SEED.values.every(v => Object.keys(v).every(k => k === "id" || vfelt.has(k))),
   "seed bruker bare felt som finnes i FIELDS.values");
const vseg = Object.fromEntries(FIELDS.values.filter(f => f.t === "seg").map(f => [f.k, f.opts]));
ok(SEED.values.every(v => ["currency","scope","state"].every(k => !v[k] || vseg[k].includes(v[k]))),
   "alle seed-verdier bruker gyldige opsjoner");
ok(SEED.values.every(v => !v.fromOutcome || SEED.outcomes.some(o => o.id === v.fromOutcome)),
   "hver kobling peker på et utfall som finnes");
ok(FIELDS.values.some(f => f.k === "mechanism"), "mekanismen er et eget felt, ikke gjemt i et notat");
["claimed","partial","realised","not-materialised"].forEach(st =>
  ok(T.en["state." + st] !== undefined && T.no["state." + st] !== undefined,
     "state." + st + " finnes i begge språk"));
ok(SEED.values.some(v => v.scope === "societal"), "seed viser samfunnsverdi-nivået");

group("beslutningsrettigheter — hvem holder retten");
setDB({ signals: SEED.signals, assumptions: SEED.assumptions,
        decisions: SEED.decisions, rights: SEED.rights, outcomes: SEED.outcomes, values: SEED.values });
const R = id => SEED.rights.find(x => x.id === id);
const D = id => SEED.decisions.find(x => x.id === id);

ok(rightHolder(R("dr1")) === "Jonas, confirmed afterwards", "praksis slår mandatet når den er fylt ut");
ok(rightHolder(R("dr2")) === "Architecture forum", "mandatet gjelder når praksis står tom");
ok(rightVetoHolder(R("dr3")) === "Each owner, by not turning up", "skjult veto leses fra praksis-kolonnen");
ok(rightHolder({}) === "", "tom klasse gir tom innehaver, ikke undefined");

group("beslutningsrettigheter — avdrift");
ok(rightsDrift(R("dr1")).join() === "decides", "r1 har flyttet seg på ja-en, ikke på nei-en");
ok(rightsDrift(R("dr3")).join() === "veto", "r3 har flyttet seg på nei-en");
ok(rightsDrift(R("dr2")).length === 0, "tom praksis-kolonne er ikke avdrift");
ok(rightsDrift(R("dr5")).length === 0, "et mandat som følges gir ingen avdrift");
ok(rightsDrift({decides:"X", decidesReal:"X"}).length === 0, "identisk praksis er ikke avdrift");
ok(rightsDrift({decides:"", decidesReal:"Noen"}).join() === "decides", "praksis uten mandat er også avdrift");
ok(rightsDrifted().length === 2, "to klasser er i utakt med mandatet (r1 avdrift, r3 omstridt)");

group("beslutningsrettigheter — utøvelse");
ok(decisionsOfRight("dr1").length === 1 && decisionsOfRight("dr1")[0].id === "d3", "d3 ligger under milepælsporten");
ok(decisionsOfRight("dr2")[0].id === "d2", "d2 ligger under arkitekturklassen");
ok(decisionsOfRight("dr4").length === 0, "ingen loggført beslutning under personvernklassen");
ok(rightUnexercised(R("dr3")) === true, "en rett uten dato og uten beslutning er aldri utøvd");
ok(rightUnexercised(R("dr4")) === false, "sist utøvd-datoen alene er nok til å telle som utøvd");
ok(rightUnexercised(R("dr1")) === false, "en loggført beslutning teller som utøvelse");
ok(rightUnexercised({id:"x", lastUsed:"1990-01-01"}) === true, "en utøvelse eldre enn terskelen teller ikke lenger");
ok(RIGHT_STALE_DAYS === 365, "terskelen for foreldet utøvelse er ett år");

group("beslutningsrettigheter — navnematching er et spørsmål, ikke en dom");
ok(nameMatches("Jonas, confirmed afterwards", "Jonas") === true, "personen finnes i praksis-strengen");
ok(nameMatches("Product lead (Jonas)", "Jonas") === true, "rollen navngir innehaveren");
ok(nameMatches("Architecture forum", "Jonas") === false, "et organ som ikke navngir personen matcher ikke");
ok(nameMatches("", "Jonas") === true, "uten mandat stilles ingen spørsmål");
ok(nameMatches("Arkitekturforum", "") === true, "uten eier stilles ingen spørsmål");

group("beslutningsrettigheter — loggen mot registeret");
ok(decisionMandate(D("d1")).status === "no-class", "d1 er den store døren uten mandat");
ok(decisionMandate(D("d2")).status === "outside", "d2 ble tatt utenfor arkitekturmandatet");
ok(decisionMandate(D("d2")).holder === "Architecture forum", "avviket navngir hvem klassen peker på");
ok(decisionMandate(D("d3")).status === "ok", "d3 stemmer med praksis, selv om klassen har avdrift");
ok(decisionMandate(D("d4")).status === "ok", "d4 er innenfor produktlederens delegasjon");
ok(decisionMandate({rightId:"finnes-ikke"}).status === "no-class", "en peker til en slettet klasse er ingen klasse");
ok(rightsOrphans().length === 1 && rightsOrphans()[0].id === "d1", "nøyaktig én beslutning står uten klasse");
ok(rightsOutside().length === 1 && rightsOutside()[0].id === "d2", "nøyaktig én beslutning er utenfor mandatet");

group("beslutningsrettigheter — hva som mangler");
ok(rightWeak(R("dr3")).length === 0, "«ingenting skrevet» er et svar, ikke et tomt felt");
ok(rightWeak({}).join() === "decides,applies,basis", "en tom klasse mangler alle tre");
ok(rightWeak(R("dr1")).length === 0, "en utfylt klasse flagges ikke");
ok(rightWeak({decides:"", decidesReal:"Noen", applies:"x", basis:"y"}).length === 0,
   "praksis alene er nok til at noen holder ja-en");
ok(RIGHT_RANK.contested < RIGHT_RANK.aligned, "omstridte klasser sorteres foran de som holder");

group("beslutningsrettigheter — språk og skjema");
["aligned","drifted","unwritten","contested"].forEach(st =>
  ok(T.en["state." + st] !== undefined && T.no["state." + st] !== undefined,
     "state." + st + " finnes i begge språk"));
ok(FIELDS.rights.some(f => f.k === "decidesReal") && FIELDS.rights.some(f => f.k === "vetoReal"),
   "skjemaet har begge praksis-feltene");
ok(FIELDS.decisions.some(f => f.k === "rightId" && f.ref === "rights"),
   "beslutningen kan peke på en klasse");
FIELDS.rights.forEach(f =>
  ok(FLD_NO.rights[f.k] !== undefined, "FLD_NO.rights dekker " + f.k));
Object.keys(FLD_NO.rights).forEach(k =>
  ok(FIELDS.rights.some(f => f.k === k), "FLD_NO.rights." + k + " peker på et felt som finnes"));
ok(SING_NO.rights !== undefined, "klassen har et norsk entallsnavn");
ok(SEED.rights.some(r => r.state === "contested") && SEED.rights.some(r => r.state === "aligned"),
   "seed viser både en omstridt og en fungerende rett");
setDB({ signals: SEED.signals, assumptions: SEED.assumptions });

group("diagnose — den kan endelig tas feil");
setDB({ strategies: SEED.strategies, diagnoses: SEED.diagnoses, insights: SEED.insights,
        outcomes: SEED.outcomes, needs: SEED.needs, assumptions: SEED.assumptions });
const G = id => SEED.diagnoses.find(x => x.id === id);
const ST = id => SEED.strategies.find(x => x.id === id);

ok(SEED.diagnoses.length === 4, "fire diagnoser i seed");
ok(diagnosisOf(ST("st1")).id === "dg1", "st1 svarer på plattformdiagnosen");
ok(strategiesOfDiagnosis("dg1").length === 1, "én strategi svarer på dg1");
ok(strategiesWithoutDiagnosis().length === 0, "alle tre seed-strategier har sagt hva de svarer på");
ok(diagnosesUnanswered().length === 1 && diagnosesUnanswered()[0].id === "dg4",
   "omgjøringsraten er splittet ut og ingen strategi svarer på den");
ok(G("dg4").state === "shaky", "den usvarte diagnosen er også den vaklende");

group("diagnose — den dyre alarmen");
ok(diagnosesVoided().length === 0, "ingen feil diagnose i seed, så alarmen tier");
{
  setDB({ strategies:[{id:"sx", name:"X", status:"committed", diagnosisId:"dx"}],
          diagnoses:[{id:"dx", state:"wrong"}] });
  ok(diagnosesVoided().length === 1, "en feil diagnose med en levende strategi på seg");
  ok(strategiesOnVoidDiagnosis()[0].id === "sx", "strategien som står på den navngis");
  setDB({ strategies:[{id:"sx", name:"X", status:"archived", diagnosisId:"dx"}],
          diagnoses:[{id:"dx", state:"wrong"}] });
  ok(diagnosesVoided().length === 0, "en arkivert strategi utløser ikke alarmen");
  setDB({ strategies:[{id:"sx", name:"X", status:"committed", diagnosisId:"dx"}],
          diagnoses:[{id:"dx", state:"resolved"}] });
  ok(diagnosesVoided().length === 1, "«ikke lenger vanskeligheten» teller like mye som «feil»");
  setDB({ strategies:[], diagnoses:[{id:"dx", state:"wrong"}] });
  ok(diagnosesVoided().length === 0 && diagnosesUnanswered().length === 0,
     "en feil diagnose uten strategier er verken ugyldiggjørende eller usvart");
}
setDB({ strategies: SEED.strategies, diagnoses: SEED.diagnoses, insights: SEED.insights,
        outcomes: SEED.outcomes, needs: SEED.needs });

group("diagnose — hva som mangler");
ok(diagnosisWeak(G("dg1")).length === 0, "en utfylt diagnose flagges ikke");
ok(diagnosisWeak(G("dg2")).join() === "insights", "dg2 mangler innsikt bak seg, men har evidens");
ok(diagnosisWeak({}).join() === "evidence,insights,area", "en tom diagnose mangler alle tre");
["holding","shaky","wrong","resolved"].forEach(st =>
  ok(T.en["state." + st] !== undefined && T.no["state." + st] !== undefined,
     "state." + st + " finnes i begge språk"));
ok(DIAG_DEAD.join() === "wrong,resolved", "to tilstander ugyldiggjør det som hviler på diagnosen");
FIELDS.diagnoses.forEach(f =>
  ok(FLD_NO.diagnoses[f.k] !== undefined, "FLD_NO.diagnoses dekker " + f.k));
ok(FIELDS.strategies.some(f => f.k === "diagnosisId" && f.ref === "diagnoses"),
   "strategien kan peke på en diagnose");
ok(SEED.strategies.every(s => s.challenge), "challenge-teksten er ikke revet ut av artefaktet");

group("behov — hvor du vet det fra");
ok(NEED_SRC.join() === "assumed,heard,verified", "tre kilder, fra svakest til sterkest");
ok(SEED.needs.length === 5, "fem behov i seed");
ok(needSrcCounts().assumed === 2 && needSrcCounts().heard === 2 && needSrcCounts().verified === 1,
   "seed dekker alle tre kildene");
ok(outcomesOfNeed("nb3").length === 1, "ett utfall tjener administratorbehovet");
ok(needOf(SEED.outcomes.find(o => o.id === "o1")).id === "nb2", "o1 tjener saksbehandlerbehovet");

group("behov — antatt og bærende");
ok(needsAssumedButLoadBearing().length === 1 && needsAssumedButLoadBearing()[0].id === "nb3",
   "nb3 er antatt, og et utfall hviler allerede på det");
ok(!needsAssumedButLoadBearing().some(n => n.id === "nb4"),
   "et antatt behov uten utfall er ikke bærende — bare uprøvd");
{
  setDB({ needs:[{id:"n1"}], outcomes:[{id:"ox", servesNeed:"n1"}] });
  ok(needsAssumedButLoadBearing().length === 1, "manglende kilde teller som antatt");
}
setDB({ strategies: SEED.strategies, diagnoses: SEED.diagnoses, insights: SEED.insights,
        outcomes: SEED.outcomes, needs: SEED.needs });

group("behov — de tre andre alarmene");
ok(needsUnserved().length === 2, "to behov har ingenting som jobber mot seg");
ok(needsUnserved().some(n => n.id === "nb5"), "fortrolig adresse har et trekk, men intet utfall");
ok(outcomesWithoutNeed().length === 1 && outcomesWithoutNeed()[0].id === "o3",
   "virksomhetsutfallet om tjenesteavbrudd tjener ikke noe oppgitt behov");
ok(needStale({source:"heard", lastHeard:"2000-01-01"}) === true, "hørt for lenge siden er foreldet");
ok(needStale({source:"assumed", lastHeard:""}) === false, "en antakelse kan ikke bli foreldet — den er aldri hørt");
ok(needStale({source:"verified"}) === true, "verifisert uten dato er foreldet til det motsatte er vist");
ok(NEED_STALE_DAYS === 365, "grensen for «sist hørt» er ett år");
ok(needsStale().length === 1 && needsStale()[0].id === "nb5",
   "fortrolig adresse ble hørt for halvannet år siden og aldri fulgt opp");
ok(!needsStale().some(x => x.id === "nb3"), "et antatt behov havner ikke i foreldet-bøtta");

group("behov — hva som mangler");
ok(needWeak({who:"Foresatte", source:"heard", evidence:"x"}).length === 0, "et utfylt behov flagges ikke");
ok(needWeak({source:"heard", evidence:"x"}).join() === "who", "et behov uten hvem er en observasjon");
ok(needWeak({who:"X", source:"assumed"}).length === 0, "en antakelse trenger ikke evidens — tomt er ærlig");
ok(needWeak({who:"X", source:"verified"}).join() === "evidence", "verifisert uten evidens er et hull");
NEED_SRC.concat("unset").forEach(c =>
  ok(T.en["nd.src." + c] !== undefined && T.no["nd.src." + c] !== undefined,
     "nd.src." + c + " finnes i begge språk"));
ok(T.no["nd.src.assumed"] === "Antatt" && T.no["nd.src.heard"] === "Hørt" &&
   T.no["nd.src.verified"] === "Verifisert", "de norske kildenavnene");
FIELDS.needs.forEach(f =>
  ok(FLD_NO.needs[f.k] !== undefined, "FLD_NO.needs dekker " + f.k));
ok(FIELDS.outcomes.some(f => f.k === "servesNeed" && f.ref === "needs"),
   "utfallet kan peke på et behov");

group("sletting etterlater ingen døde pekere");
// Hver kobling et register legger til må også ryddes når målet slettes.
// Ellers peker et utfall videre på et behov som ikke finnes.
{
  const src = readFileSync(join(root, "app.html"), "utf8");
  const del = src.slice(src.indexOf("function delEntry"), src.indexOf("function delEntry")+2600);
  const refs = [];
  for (const coll of Object.keys(FIELDS)) {
    for (const f of FIELDS[coll]) {
      if (f.t === "ref" || f.t === "multiref") refs.push({coll, k:f.k});
    }
  }
  const unclean = refs.filter(r => !del.includes("."+r.k));
  ok(unclean.length === 0,
     "delEntry rydder hver ref-kobling" +
     (unclean.length ? ": " + unclean.map(r=>r.coll+"."+r.k).join(", ") : ""));
}

group("skjemaet snakker begge språk");
// Denne finnes fordi nedtrekket for «tjener behov» viste rå ID-er, og fordi
// segmentknappene sto på engelsk midt i en norsk modal. Begge slapp gjennom
// alt annet: de er data, ikke kode, og ingen visning kastet.
{
  const segMiss = [], refMiss = [], labelMiss = [];
  for (const coll of Object.keys(FIELDS)) {
    for (const f of FIELDS[coll]) {
      if (f.t === "seg") {
        const p = OPT_PREFIX[f.k];
        if (!p) { segMiss.push(`${coll}.${f.k} (ingen prefiks)`); continue; }
        for (const o of f.opts) {
          if (T.en[p + o] === undefined || T.no[p + o] === undefined)
            segMiss.push(`${coll}.${f.k}=${o}`);
        }
      }
      if (f.t === "ref" || f.t === "multiref") {
        if (!LABEL_F[f.ref]) { refMiss.push(`${coll}.${f.k} → ${f.ref}`); continue; }
        const target = FIELDS[f.ref];
        if (target && !target.some(x => x.k === LABEL_F[f.ref]))
          labelMiss.push(`${f.ref}.${LABEL_F[f.ref]}`);
      }
    }
  }
  ok(segMiss.length === 0,
     "hvert segmentvalg har en etikett på begge språk" + (segMiss.length ? ": " + segMiss.join(", ") : ""));
  ok(refMiss.length === 0,
     "hver ref-kollesjon har et tittelfelt, ellers viser nedtrekket rå ID-er" +
     (refMiss.length ? ": " + refMiss.join(", ") : ""));
  ok(labelMiss.length === 0,
     "tittelfeltet finnes faktisk i målkollesjonen" + (labelMiss.length ? ": " + labelMiss.join(", ") : ""));
}
ok(optL("state","holding") !== "holding" || T.no["state.holding"] === "holding",
   "optL slår opp tilstander");
setLang("no");
ok(optL("source","assumed") === "Antatt", "optL oversetter behovskilden");
ok(optL("category","user") === "Brukerutfall", "optL oversetter utfallskategorien");
ok(optL("commitment","heavy") === "Mye", "optL oversetter innsatsbåndet");
ok(optL("finnesikke","xyz") === "xyz", "en ukjent nøkkel gir verdien tilbake, ikke tomt");
setLang("en");
// Faste nøkler som skjemaet, skuffen og hurtigtastene skriver ut direkte.
// btn.cancel manglet i begge språk og viste seg som teksten «btn.cancel» på
// knappen, fordi de gamle kallstedene hadde en ||"Cancel"-fallback som skjulte det.
["btn.cancel","btn.edit","btn.delete","form.save","form.new","form.edit","form.none",
 "form.savename","form.rel.add","form.rel.del","form.rel.none","form.rel.empty",
 "form.delconfirm","form.oneperline","form.tab.card","form.tab.artifact","form.tab.links"
].forEach(k => ok(T.en[k] !== undefined && T.no[k] !== undefined, k + " finnes i begge språk"));
Object.keys(LABEL_F).forEach(c =>
  ok(COLLS.includes(c), "LABEL_F." + c + " er en kollesjon som finnes"));

group("navigasjonen og lerretet står i samme rekkefølge");
// Registrene står i ryggradens rekkefølge — Forstå, Utvikle, Kommuniser,
// Spor. To steder holder den lista: sidemenyen (HTML) og lagbaren (JS).
// Denne testen leser begge og krever at de er identiske, så en omstokking
// ett sted ikke stilltiende etterlater det andre.
{
  const src = readFileSync(join(root, "app.html"), "utf8");
  const navOrder = grp => {
    const i = src.indexOf(`data-grp="${grp}"`);
    const j = src.indexOf("nav-grp", i + 10);
    return [...src.slice(i, j < 0 ? src.length : j).matchAll(/data-view="(\w+)"/g)].map(m => m[1]);
  };
  const cvOrder = lbl => {
    const g = CV_GROUPS.find(x => x.lbl === lbl);
    return g ? g.kinds.map(k => CV_COLL[k]) : [];
  };
  ok(navOrder("direction").join() === cvOrder("grp.direction").join(),
     "Retning: " + navOrder("direction").join(" → ") + "  vs  " + cvOrder("grp.direction").join(" → "));
  ok(navOrder("registers").join() === cvOrder("grp.registers").join(),
     "Registre: " + navOrder("registers").join(" → ") + "  vs  " + cvOrder("grp.registers").join(" → "));
  // Ryggradens logikk, eksplisitt: forstå før du utvikler, utvikle før du
  // kommuniserer, kommuniser før du sporer.
  const reg = navOrder("registers");
  const pos = v => reg.indexOf(v);
  ok(pos("insights") < pos("diagnoses"), "innsikt kommer før diagnosen den mater");
  ok(pos("radar") < pos("diagnoses"), "radaren kommer før diagnosen den mater");
  ok(pos("diagnoses") < pos("assumptions"), "diagnosen kommer før bettene den produserer");
  ok(pos("assumptions") < pos("decisions"), "bettene kommer før beslutningene som hviler på dem");
  ok(pos("decisions") < pos("rights"), "beslutningen kommer før retten som skulle dekket den");
  ok(pos("signals") === reg.length - 1, "signalene står sist — det er der virkeligheten svarer");
}

group("strategikartet — nodetypene henger sammen");
{
  ok(CV_KINDS.includes("value") && CV_KINDS.includes("right") && CV_KINDS.includes("force"),
     "verdi, beslutningsklasse og kraft kan ligge på lerretet");
  CV_KINDS.forEach(k => {
    ok(CV_COLL[k] !== undefined, "CV_COLL dekker " + k);
    ok(COLLS.includes(CV_COLL[k]), "CV_COLL." + k + " peker på en kollesjon som synkes");
    ok(CV_GLYPH[k] !== undefined, "CV_GLYPH dekker " + k);
    ok(typeof CV_W[k] === "number", "CV_W dekker " + k);
    ok(T.en["cv.k." + k] !== undefined && T.no["cv.k." + k] !== undefined,
       "cv.k." + k + " finnes i begge språk");
  });
  const glyphs = CV_KINDS.map(k => CV_GLYPH[k]);
  ok(new Set(glyphs).size === glyphs.length, "hver nodetype har sin egen bokstav: " + glyphs.join(""));
  const colls = CV_KINDS.map(k => CV_COLL[k]);
  ok(new Set(colls).size === colls.length, "to nodetyper deler ikke kollesjon");

  // Lagbaren og ryddefunksjonen var to håndholdte lister. Begge gikk ut av
  // takt hver gang en nodetype kom til — lagbaren viste sju av tolv.
  const inGroups = CV_GROUPS.flatMap(g => g.kinds);
  const ugroup = CV_KINDS.filter(k => !inGroups.includes(k));
  const ghost = inGroups.filter(k => !CV_KINDS.includes(k));
  const twice = inGroups.filter((k,i) => inGroups.indexOf(k) !== i);
  ok(ugroup.length === 0, "hver nodetype har en chip i lagbaren" + (ugroup.length ? ": mangler " + ugroup.join(", ") : ""));
  ok(ghost.length === 0, "lagbaren viser ingen type som ikke finnes" + (ghost.length ? ": " + ghost.join(", ") : ""));
  ok(twice.length === 0, "ingen type står i to grupper" + (twice.length ? ": " + twice.join(", ") : ""));
  CV_KINDS.forEach(k => ok(CV_TOKEN[k] !== undefined, "CV_TOKEN dekker " + k));

  // Skuffen grupperte etter en tredje håndholdt liste. Fem typer havnet i
  // ingen gruppe og var dermed umulige å dra inn på lerretet i det hele tatt.
  // Nå leser den CV_GROUPS, og denne testen holder den der.
  CV_KINDS.forEach(k => {
    ok(CV_QUICK[k] !== undefined, "inspektøren har hurtigfelt for " + k);
    const bad = (CV_QUICK[k] || []).filter(fk => !(FIELDS[CV_COLL[k]] || []).some(f => f.k === fk));
    ok(bad.length === 0, `CV_QUICK.${k} peker bare på felt som finnes` + (bad.length ? ": " + bad.join(", ") : ""));
  });
  ok(LABEL_F[CV_COLL["need"]] === "need", "skuffens tittelfelt utledes fra LABEL_F");

  const src = readFileSync(join(root, "app.html"), "utf8");
  const rows = /const rows=\[([\s\S]*?)\];/.exec(src);
  ok(!!rows, "ryddefunksjonens rader ble funnet");
  if (rows) {
    const inRows = [...rows[1].matchAll(/"(\w+)"/g)].map(m => m[1]);
    const urow = CV_KINDS.filter(k => !inRows.includes(k));
    ok(urow.length === 0, "«rydd opp» plasserer hver nodetype" + (urow.length ? ": mangler " + urow.join(", ") : ""));
  }
}

group("ressursallokering — båndet, ikke timene");
setDB({ assumptions: SEED.assumptions, reviews: SEED.reviews, signals: SEED.signals,
        goals: SEED.goals, outcomes: SEED.outcomes, decisions: SEED.decisions });

ok(COMMIT.join() === "none,some,heavy", "tre grove bånd, ingen timer");
ok(SEED.assumptions.every(a => COMMIT.includes(a.commitment)), "alle seed-bets har et bånd");
ok(!FIELDS.assumptions.some(f => f.k === "commitment" && f.t === "num"),
   "båndet er ikke et tall — Spine holder ikke kapasitet");
ok(commitCounts().none === 1 && commitCounts().heavy === 3 && commitCounts().some === 2,
   "fordelingen over seed: ett sultet, tre tunge, to lette");

group("ressursallokering — ufinansiert risiko");
ok(betsUnfunded().length === 1 && betsUnfunded()[0].id === "a6",
   "a6 er lav × høy med ingenting bak seg");
ok(!betsUnfunded().some(x => x.id === "a1"), "a1 er lav × høy, men har litt bak seg");
ok(!betsUnfunded().some(x => x.id === "a4"), "a4 er lav × høy og tungt finansiert");
{
  setDB({ assumptions: [{id:"u1", confidence:"low", consequence:"high"}], reviews: [] });
  ok(betsUnfunded().length === 1, "et bet uten bånd i det hele tatt teller som ufinansiert");
  setDB({ assumptions: [{id:"u1", confidence:"low", consequence:"high", state:"retired", commitment:"none"}], reviews: [] });
  ok(betsUnfunded().length === 0, "et pensjonert bet er ikke ufinansiert risiko");
}

group("ressursallokering — betaler for en tapt posisjon");
setDB({ assumptions: SEED.assumptions, reviews: SEED.reviews });
ok(betsFundedBroken().length === 0, "ingen brutte bets i seed, så alarmen tier");
{
  setDB({ assumptions: [{id:"b1", state:"broken", commitment:"heavy"},
                        {id:"b2", state:"broken", commitment:"none"}], reviews: [] });
  ok(betsFundedBroken().length === 1 && betsFundedBroken()[0].id === "b1",
     "bare det brutte bettet med tung innsats flagges");
}

group("ressursallokering — gjennomgangsarkivet som motpart");
setDB({ assumptions: SEED.assumptions, reviews: SEED.reviews });
ok(SEED.reviews.length === 3, "seed har tre gjennomganger å lese mot");
ok(recentReviews(3)[0].id === "rv3", "nyeste gjennomgang først");
ok(betMovedIn(SEED.reviews[0], "a4") === true, "a4 flyttet tilstand i rv1");
ok(betMovedIn(SEED.reviews[1], "a4") === false, "a4 er ikke med i rv2");
ok(betMovedIn({bets:[{id:"x", from:"holding", to:"holding", confFrom:"low", confTo:"low"}]}, "x") === false,
   "et bet som ble sett på uten å endre seg har ikke flyttet seg");
ok(betMovedIn({bets:[{id:"x", from:"holding", to:"holding", confFrom:"medium", confTo:"low"}]}, "x") === true,
   "endret konfidens teller som bevegelse selv om tilstanden står");
ok(betsFundedStuck().length === 1 && betsFundedStuck()[0].id === "a3",
   "a3 er tungt finansiert, holder, og har ikke vært rørt på tre runder");
ok(!betsFundedStuck().some(x => x.id === "a2"), "a2 flyttet seg i rv2 og er ikke fastlåst");
{
  setDB({ assumptions: [{id:"h1", commitment:"heavy", state:"holding"}], reviews: SEED.reviews.slice(0,2) });
  ok(betsFundedStuck().length === 0, "under tre gjennomganger tier sjekken framfor å gjette");
  setDB({ assumptions: [{id:"h1", commitment:"some", state:"holding"}], reviews: SEED.reviews });
  ok(betsFundedStuck().length === 0, "bare tung innsats kan være fastlåst");
}

group("ressursallokering — allokering er bare ekte hvis noe sultes");
setDB({ assumptions: SEED.assumptions, reviews: SEED.reviews });
ok(nothingStarved() === false, "seed sulter faktisk noe (a6), så alarmen tier");
{
  const heavy = n => Array.from({length:n}, (_,i) => ({id:"x"+i, commitment:"heavy", state:"holding"}));
  setDB({ assumptions: heavy(4), reviews: [] });
  ok(nothingStarved() === true, "fire tunge bets og ingenting sultet er en liste, ikke en allokering");
  setDB({ assumptions: heavy(2), reviews: [] });
  ok(nothingStarved() === false, "under tre vurderte bets sier fordelingen ingenting");
  setDB({ assumptions: heavy(3).concat([{id:"y", commitment:"none", state:"holding"}]), reviews: [] });
  ok(nothingStarved() === false, "ett sultet bet er nok");
  setDB({ assumptions: heavy(3).concat([{id:"y", state:"holding"}]), reviews: [] });
  ok(nothingStarved() === true, "et bet uten bånd er ikke sultet — det er uvurdert");
}
setDB({ assumptions: SEED.assumptions, reviews: SEED.reviews });

group("ressursallokering — språk og skjema");
COMMIT.concat("unset").forEach(c =>
  ok(T.en["cm." + c] !== undefined && T.no["cm." + c] !== undefined,
     "cm." + c + " finnes i begge språk"));
ok(T.no["cm.none"] === "Ingenting" && T.no["cm.some"] === "Litt" && T.no["cm.heavy"] === "Mye",
   "de norske båndnavnene er de grove");
ok(T.en["sect.allbets"] !== undefined && T.no["sect.allbets"] !== undefined,
   "«Alle bets»-overskriften er ikke lenger hardkodet engelsk");
FIELDS.assumptions.forEach(f =>
  ok(FLD_NO.assumptions[f.k] !== undefined, "FLD_NO.assumptions dekker " + f.k));

group("utfallskategori — hva slags endring måles");
setDB({ goals: SEED.goals, outcomes: SEED.outcomes, signals: SEED.signals, assumptions: SEED.assumptions });
const O = id => SEED.outcomes.find(x => x.id === id);

ok(OUT_CATS.join() === "user,product,business", "tre kategorier, i rekkefølgen bruker → produkt → virksomhet");
ok(SEED.outcomes.every(o => OUT_CATS.includes(o.category)), "alle seed-utfall er kategorisert");
ok(O("o1").category === "user" && O("o2").category === "product" &&
   O("o3").category === "business" && O("o4").category === "product",
   "seed dekker alle tre kategoriene");
ok(outcomesUncategorised().length === 0, "seed har ingen ukategoriserte utfall");
ok(outcomesOfGoal("g2").length === 2, "g2 bærer to utfall");
ok(outcomesOfGoal("finnes-ikke").length === 0, "et mål uten utfall gir tom liste, ikke feil");

group("utfallskategori — alarmen for bare produktutfall");
ok(goalsProductOnly().length === 1 && goalsProductOnly()[0].id === "g3",
   "g3 måles utelukkende på adopsjon — det er hele poenget med sjekken");
ok(!goalsProductOnly().some(g => g.id === "g2"), "et mål med både bruker- og produktutfall flagges ikke");
ok(!goalsProductOnly().some(g => g.id === "g1"), "et mål med bare et virksomhetsutfall flagges ikke");
{
  // Konservativ med vilje: ett ukategorisert utfall skal få sjekken til å tie.
  const g = [{id:"gx"}];
  setDB({ goals: g, outcomes: [{id:"ox1", goalId:"gx", category:"product"}] });
  ok(goalsProductOnly().length === 1, "ett produktutfall alene utløser alarmen");
  setDB({ goals: g, outcomes: [{id:"ox1", goalId:"gx", category:"product"}, {id:"ox2", goalId:"gx"}] });
  ok(goalsProductOnly().length === 0, "ett ukategorisert utfall gjør at sjekken tier");
  ok(outcomesUncategorised().length === 1, "det ukategoriserte utfallet fanges av den andre alarmen");
  setDB({ goals: g, outcomes: [] });
  ok(goalsProductOnly().length === 0, "et mål uten utfall er ikke et produktmål");
  setDB({ goals: g, outcomes: [{id:"ox1", goalId:"gx", category:"product"}, {id:"ox3", goalId:"gx", category:"user"}] });
  ok(goalsProductOnly().length === 0, "ett brukerutfall er nok til å frikjenne målet");
}
setDB({ goals: SEED.goals, outcomes: SEED.outcomes, signals: SEED.signals, assumptions: SEED.assumptions });

group("utfallskategori — telling og skjema");
{
  const c = outcomeCatCounts();
  ok(c.user === 1 && c.product === 2 && c.business === 1 && c.none === 0,
     "fordelingen telles riktig over seed");
  setDB({ goals: SEED.goals, outcomes: [{id:"z1"}, {id:"z2", category:"tull"}] });
  ok(outcomeCatCounts().none === 2, "en ukjent kategori telles som ukategorisert, ikke som sin egen bøtte");
}
setDB({ goals: SEED.goals, outcomes: SEED.outcomes, signals: SEED.signals, assumptions: SEED.assumptions });
{
  const fld = FIELDS.outcomes.find(f => f.k === "category");
  ok(fld && fld.t === "seg", "kategorien er et segmentvalg i skjemaet");
  ok(fld && fld.opts.join() === OUT_CATS.join(), "skjemaets valg følger OUT_CATS");
  ok(fld && fld.noDefault === 1, "nytt utfall starter ukategorisert framfor å gjette «bruker»");
}
OUT_CATS.concat("none").forEach(c =>
  ok(T.en["out.cat." + c] !== undefined && T.no["out.cat." + c] !== undefined,
     "out.cat." + c + " finnes i begge språk"));
ok(T.no["out.cat.user"] === "Brukerutfall" && T.no["out.cat.product"] === "Produktutfall" &&
   T.no["out.cat.business"] === "Virksomhetsutfall", "de norske navnene er de du ba om");
FIELDS.outcomes.forEach(f =>
  ok(FLD_NO.outcomes[f.k] !== undefined, "FLD_NO.outcomes dekker " + f.k));

group("seed-ider er globalt unike");
{
  const seen = new Map();
  const dupes = [];
  for (const coll of Object.keys(SEED)) {
    if (!Array.isArray(SEED[coll])) continue;
    for (const o of SEED[coll]) {
      if (!o || !o.id) continue;
      if (seen.has(o.id)) dupes.push(`${o.id} (${seen.get(o.id)} og ${coll})`);
      else seen.set(o.id, coll);
    }
  }
  ok(dupes.length === 0,
     "ingen seed-id går igjen i to kollesjoner — seedById() og SEED_NO slår opp globalt" +
     (dupes.length ? ": " + dupes.join(", ") : ""));
  const orphanNO = Object.keys(SEED_NO).filter(id => !seen.has(id));
  ok(orphanNO.length === 0, "hver SEED_NO-nøkkel peker på en entitet som finnes" +
     (orphanNO.length ? ": " + orphanNO.join(", ") : ""));
}

group("verdikjede pa strategikortet - utledet, ikke erklaert");
// Strategi -> verdi finnes ikke som kobling. Kjeden leses: strategien tjener
// mal, malene baerer utfall, utfallene baerer verdi.
fullDB();
{
  const st1 = SEED.strategies.find(s => s.id === "st1");   // tjener g1 og g2
  const rows = valuesOfStrategy(st1);
  const ids = rows.map(r => r.value.id).sort().join(",");
  ok(ids === "v3,v4,v5",
     "st1 arver gevinstene som folger av utfallene under g1 og g2, ikke flere (fikk " + ids + ")");
  ok(rows.every(r => r.outcome.goalId === r.goal.id),
     "hver rad baerer malet utfallet faktisk horer til");
  ok(rows.every(r => (st1.serves || []).includes(r.goal.id)),
     "ingen rad smugler inn et mal strategien ikke tjener");
  ok(rows.every(r => r.value.fromOutcome === r.outcome.id),
     "hver gevinst peker tilbake pa utfallet den folger av");

  const st3 = SEED.strategies.find(s => s.id === "st3");   // tjener g3 -> o4 -> v1, v2
  const r3 = valuesOfStrategy(st3);
  ok(r3.map(r => r.value.id).sort().join(",") === "v1,v2",
     "ett utfall kan baere to gevinster i ulik valuta - begge folger med");
  ok(new Set(r3.map(r => r.outcome.id)).size === 1,
     "og begge kommer gjennom det samme utfallet");
}
// Utledningen ma forbli utledet: ingen strategi far et verdifelt a erklaere i.
ok(!FIELDS.strategies.some(f => f.ref === "values" || /value/i.test(f.k)),
   "strategiskjemaet har ingen verdikobling - utfallet er den kausale broen");
ok(SEED.strategies.every(s => s.values === undefined),
   "ingen strategi i seed baerer et verdifelt");

ok(valuesOfStrategy(null).length === 0, "ingen strategi gir ingen kjede");
ok(valuesOfStrategy({}).length === 0, "strategi uten serves-felt krasjer ikke");
ok(valuesOfStrategy({serves:[]}).length === 0, "strategi uten mal gir ingen kjede");
ok(valuesOfStrategy({serves:["finnes-ikke"]}).length === 0,
   "mal som ikke finnes gir ingen kjede, ikke krasj");
ok(valuesOfStrategy({serves:["g2","g2"]}).length === valuesOfStrategy({serves:["g2"]}).length,
   "samme mal to ganger i serves dobler ikke gevinstene");

// Den andre enden: utfall strategien jobber mot som ingen har verdsatt.
setDB({ goals:[{id:"gA"}], strategies:[], signals:[],
        outcomes:[{id:"oA", goalId:"gA"}, {id:"oB", goalId:"gA"}],
        values:[{id:"vA", fromOutcome:"oA"}] });
ok(outcomesUnvaluedFor({serves:["gA"]}).map(o => o.id).join() === "oB",
   "utfallet ingen har verdsatt er det eneste som flagges");
ok(valuesOfStrategy({serves:["gA"]}).length === 1,
   "og det verdsatte utfallet baerer sin ene gevinst");
fullDB();
ok(outcomesUnvaluedFor(SEED.strategies.find(s => s.id === "st1")).length === 0,
   "i seed er hvert utfall verdsatt, sa strategiene har ingenting a flagge");
ok(outcomesUnvaluedFor(null).length === 0, "ingen strategi gir ingen flagg");
["sv.head","sv.hint","sv.count.one","sv.count.many","sv.nogoal.t","sv.nogoal.d",
 "sv.none.t","sv.none.d","sv.unval.one","sv.unval.many"].forEach(k =>
  ok(T.en[k] !== undefined && T.no[k] !== undefined, k + " finnes i begge sprak"));

group("verdikjede pa malkortet - samme kjede, ett ledd hoyere");
fullDB();
ok(valuesOfGoal("g2").map(r => r.value.id).sort().join(",") === "v3,v4",
   "g2 baerer gevinstene som folger av utfallene sine");
ok(valuesOfGoal("g3").map(r => r.value.id).sort().join(",") === "v1,v2",
   "g3 baerer begge gevinstene fra det ene utfallet sitt");
ok(valuesOfGoal("g2").every(r => r.goal.id === "g2" && r.outcome.goalId === "g2"),
   "hver rad horer til malet den ble lest fra");
ok(valuesOfGoal("finnes-ikke").length === 0, "ukjent mal gir ingen kjede");
ok(outcomesUnvaluedOfGoal("finnes-ikke").length === 0, "ukjent mal gir ingen flagg");
// Malkortet og strategikortet ma lese SAMME kjede - ellers driver de fra hverandre.
{
  const st1 = SEED.strategies.find(s => s.id === "st1");
  const fraMal = (st1.serves || []).flatMap(g => valuesOfGoal(g).map(r => r.value.id)).sort().join(",");
  ok(fraMal === valuesOfStrategy(st1).map(r => r.value.id).sort().join(","),
     "strategien arver nøyaktig malenes kjede - ingen egen utledning");
}
setDB({ goals:[{id:"gA"}], strategies:[], signals:[], values:[{id:"vA", fromOutcome:"oA"}],
        outcomes:[{id:"oA", goalId:"gA"}, {id:"oB", goalId:"gA"}] });
ok(outcomesUnvaluedOfGoal("gA").map(o => o.id).join() === "oB",
   "utfallet ingen har verdsatt flagges pa malet det horer til");
["gv.head","gv.via","gv.none","gv.unval.one","gv.unval.many"].forEach(k =>
  ok(T.en[k] !== undefined && T.no[k] !== undefined, k + " finnes i begge sprak"));

group("gevinsten i gjennomgangen - hvilke sporsmal som stilles");
fullDB(); setStratF("*");
// Seed: bare o3 er pa sporet, og v5 henger pa den og har ikke landet.
ok(valuesDue().map(v => v.id).join() === "v5",
   "gjennomgangen spor om driftsbesparelsen - den ene gevinsten som skulle vist seg");
setDB({ goals:[], signals:[], strategies:[],
        outcomes:[{id:"oA", state:"on-track"}],
        values:[{id:"vA", fromOutcome:"oA", state:"realised"}] });
ok(valuesDue().length === 0, "en gevinst som allerede er realisert spores ikke igjen");
setDB({ goals:[], signals:[], strategies:[],
        outcomes:[{id:"oA", state:"off-track"}],
        values:[{id:"vA", fromOutcome:"oA", state:"claimed"}] });
ok(valuesDue().length === 0,
   "utfallet er ikke naadd - da er det for tidlig a spore om gevinsten kom");
setDB({ goals:[], signals:[], strategies:[], outcomes:[],
        values:[{id:"vA", state:"claimed"}] });
ok(valuesDue().length === 0, "gevinst uten utfall har ingen bro a spore over");
// Sporsmalet folger strategifilteret, akkurat som signalene og bettene.
fullDB();
setStratF(SEED.strategies.find(s => s.id === "st2").name);   // tjener g1 -> o3 -> v5
ok(valuesDue().map(v => v.id).join() === "v5", "filtrert pa TOFF star gevinsten igjen");
setStratF(SEED.strategies.find(s => s.id === "st3").name);   // tjener g3, ikke o3
ok(valuesDue().length === 0, "filtrert pa en annen strategi faller den bort");
setStratF("*");
ok(strategiesOfValue(SEED.values.find(v => v.id === "v5")).map(s => s.id).sort().join(",") === "st1,st2",
   "v5 baeres av begge strategiene som tjener g1");
ok(strategiesOfValue({}).length === 0, "verdi uten utfall baeres av ingen strategi");
["rev.v","rev.v.h","rev.v.saw","rev.v.log","rev.b.val","rev.b.vals",
 "rev.empty.val.t","rev.empty.val.d","rev.arch.missed","val.obs","val.noobs"].forEach(k =>
  ok(T.en[k] !== undefined && T.no[k] !== undefined, k + " finnes i begge sprak"));
ok(FIELDS.values.some(f => f.k === "observed") && FLD_NO.values.observed !== undefined,
   "«hva vi faktisk sa» finnes i skjemaet pa begge sprak");

group("gevinsten i gjennomgangen - okten og arkivet");
{
  const fresh = () => { setDB({ signals:[], assumptions:[], goals:[], decisions:[],
    values:[], strategies:SEED.strategies, reviews:[] }); resetReview(); };
  fresh();
  reviewNoteValue({ id:"vA", claim:"gevinst", state:"claimed" }, "claimed", "");
  ok(reviewChanged() === 0, "gevinst lagret uten endring og uten observasjon teller ikke");
  reviewNoteValue({ id:"vB", claim:"b", state:"not-materialised" }, "claimed", "");
  ok(reviewChanged() === 1, "gevinst som flyttet tilstand teller");
  reviewNoteValue({ id:"vC", claim:"c", state:"claimed" }, "claimed", "lisensen loper fortsatt");
  ok(reviewChanged() === 2, "observasjon teller selv uten tilstandsendring");
  reviewNoteValue({ id:"vC", claim:"c", state:"partial" }, "claimed", "");
  ok(reviewChanged() === 2, "samme gevinst igjen oppdaterer, dobbelttelles ikke");
  const rec = closeReview("");
  ok((rec.values || []).length === 3, "arkivet husker alle tre gevinstene okten ror ved");
  ok(rec.gainsMissed === 1, "arkivet teller gevinsten som uteble");
  ok(rec.values.find(v => v.id === "vC").to === "partial",
     "siste tilstand vinner, ikke den forste");
  fresh();
  reviewNoteSignal({ id:"s1", signal:"x", state:"disagreeing" }, "drifting", "12");
  ok(closeReview("").gainsMissed === 0,
     "en gjennomgang uten gevinster rort gir null uteblitte, ikke undefined");
}

group("verdigapet pa dashbordet");
fullDB(); setStratF("*");
ok(valueGapInView().map(v => v.id).join() === "v5",
   "dashbordet ser det ene gapet i seed");
setStratF(SEED.strategies.find(s => s.id === "st2").name);
ok(valueGapInView().map(v => v.id).join() === "v5",
   "filtrert pa TOFF star gapet igjen - det er den strategien som baerer det");
setStratF(SEED.strategies.find(s => s.id === "st3").name);
ok(valueGapInView().length === 0,
   "filtrert pa en strategi som ikke baerer det, teller dashbordet det ikke");
setStratF("*");
ok(valueGapInView().length <= valueGap().length,
   "filteret kan aldri finne opp gap som ikke finnes i registeret");
["kpi.gap","kpi.gap.s","th.value"].forEach(k =>
  ok(T.en[k] !== undefined && T.no[k] !== undefined, k + " finnes i begge sprak"));

group("delt artefakt - verdikjeden folger med");
setDB({ signals:SEED.signals, assumptions:SEED.assumptions, goals:SEED.goals,
        outcomes:SEED.outcomes, values:SEED.values, decisions:SEED.decisions,
        strategies:SEED.strategies });
{
  const p1 = buildSharePayload(SEED.strategies.find(x => x.id === "st1"), {});
  ok(Array.isArray(p1.value) && p1.value.length === 3,
     "de tre gevinstene under st1 sine mal folger med");
  ok(p1.value.every(r => r.outcome && r.outcomeState),
     "hver gevinst kommer med utfallet den folger av - broen, ikke bare pastanden");
  ok(p1.value.some(r => r.state === "not-materialised"),
     "gevinsten som uteble deles ogsa - et artefakt som bare viser seier er markedsforing");
  ok(p1.value.every(r => r.owner === undefined && r.note === undefined && r.evidence === undefined),
     "eier, interne notater og den interne bevistesten folger ikke med");
  const p3 = buildSharePayload(SEED.strategies.find(x => x.id === "st3"), {});
  ok(p3.value.length === 2 && new Set(p3.value.map(r => r.outcome)).size === 1,
     "st3 deler begge gevinstene fra det ene utfallet sitt");
  const pX = buildSharePayload({name:"uten mal", serves:[]}, {});
  ok(Array.isArray(pX.value) && pX.value.length === 0,
     "strategi uten mal gir tom liste, ikke undefined");
  ok(!JSON.stringify(p1).includes("user_id"), "fortsatt ingen bruker-id i payloaden");
}
fullDB();

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
