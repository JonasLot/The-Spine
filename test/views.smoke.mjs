#!/usr/bin/env node
// Røyktest for visningene i app.html.
//
//   node test/views.smoke.mjs
//
// Hvorfor denne finnes: signal.test.mjs tester rene funksjoner, og
// `node --check` fanger bare syntaksfeil. Ingen av dem fanget at vReview
// leste `asmp` før deklarasjonen — en temporal dead zone som fikk hele
// Driftsrytme-visningen til å kaste og rendre tomt. Denne testen kjører
// hver visning mot en minimal DOM-stub, så den slags oppdages med én gang.
//
// Den beviser ikke at visningen SER riktig ut. Den beviser at den kjører,
// produserer noe innhold, og ikke kaster.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "app.html"), "utf8");
const src = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).sort((a, b) => b.length - a.length)[0];
if (!src) throw new Error("Fant ingen inline-script i app.html");

// ── minimal DOM ──────────────────────────────────────────────────────────
class El {
  constructor(tag){
    this.tagName=(tag||"div").toUpperCase(); this.children=[];
    this.style={ setProperty(k,v){ this[k]=v; }, removeProperty(k){ delete this[k]; },
                 getPropertyValue(k){ return this[k]||""; } };
    this.dataset={}; this._html=""; this._text=""; this._attrs={};
    this.classList={
      _s:new Set(),
      add:(...c)=>c.forEach(x=>this.classList._s.add(x)),
      remove:(...c)=>c.forEach(x=>this.classList._s.delete(x)),
      toggle:(c,on)=>{ on ? this.classList._s.add(c) : this.classList._s.delete(c); },
      contains:c=>this.classList._s.has(c),
    };
  }
  set className(v){ this.classList._s=new Set(String(v||"").split(/\s+/).filter(Boolean)); }
  get className(){ return [...this.classList._s].join(" "); }
  set innerHTML(v){ this._html=String(v==null?"":v); }
  get innerHTML(){ return this._html; }
  set textContent(v){ this._text=String(v==null?"":v); }
  get textContent(){ return this._text; }
  appendChild(c){ this.children.push(c); return c; }
  setAttribute(k,v){ this._attrs[k]=v; }
  getAttribute(k){ return this._attrs[k]; }
  removeAttribute(k){ delete this._attrs[k]; }
  addEventListener(){} removeEventListener(){}
  // Returnerer en stub framfor null: visningene bruker querySelector til å
  // finne noder de nettopp la inn, og en null her ville gitt falske feil.
  querySelector(sel){ return (this._q = this._q || {})[sel] || (this._q[sel] = new El("div")); }
  querySelectorAll(){ return []; }
  insertBefore(n){ this.children.unshift(n); return n; }
  getBoundingClientRect(){ return {width:800,height:400,top:0,left:0,right:800,bottom:400,x:0,y:0}; }
  focus(){} select(){} remove(){}
  // Alt innhold i treet, for å skille "rendret noe" fra "rendret tomt".
  get deepText(){
    return this._html + this._text + this.children.map(c=>c.deepText).join("");
  }
}
const stubs = {};
const pick = sel => (stubs[sel] = stubs[sel] || new El("div"));
global.document = {
  createElement: t => new El(t),
  createElementNS: (ns,t) => new El(t),
  createTextNode: t => { const n=new El("#text"); n.textContent=t; return n; },
  querySelector: pick,
  querySelectorAll: () => [],
  getElementById: id => pick("#"+id),
  documentElement: new El("html"),
  body: new El("body"),
  head: new El("head"),
  addEventListener(){}, removeEventListener(){},
};
global.window = { SPINE_CONFIG:{}, addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){}}) };
global.location = { href:"https://spine.example/app.html", replace(){}, hash:"" };
Object.defineProperty(global, "navigator", {
  value: { clipboard:{ writeText:async()=>{} } }, configurable:true, writable:true,
});
global.requestAnimationFrame = fn => fn();
global.getComputedStyle = () => ({ getPropertyValue: () => "", });
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.setTimeout = (fn)=>{ return 0; };          // ingen forsinkede kall i testen
global.clearTimeout = ()=>{};
if (!global.crypto) Object.defineProperty(global, "crypto", {
  value: { randomUUID:()=>"test-uuid" }, configurable:true, writable:true,
});
global.d3 = undefined;                            // kartet skal degradere pent

// ── last appen ───────────────────────────────────────────────────────────
const VIEWS = ["vDashboard","vStrategies","vMap","vNeeds","vGoals","vOutcomes","vValues","vRadar","vRights","vDiagnoses","vInsights",
               "vDecisions","vAssumptions","vSignals","vReview","vShares",
               "vFlywheel","vSystems","vProfile"];
let app;
try {
  app = new Function(src + `
    ;DB = structuredClone(SEED);
    ;SHARES = []; SHARES_OK = true; USER = {id:"u1"}; SB = null;
    ;PROFILE = {full_name:"Test", organizations:[], lang:"en"};
    ;view = "dashboard"; stratF = "*"; q = ""; currentStrategy = null;
    ;return {ctx:{${VIEWS.join(",")}}, setLang:v=>{LANG=v}, setStrat:v=>{stratF=v},
             setDB:v=>{DB=v}, setCur:v=>{currentStrategy=v},
             vStrategyDetail:typeof vStrategyDetail==="function"?vStrategyDetail:null,
             SEED, SYSTEMS, T, FIELDS, FORM_TABS, buildForm, saveForm,
             setEditing:v=>{editing=v}, getEditing:()=>editing,
             drawerBody:()=>document.querySelector("#drawerB"),
             CV_LINKS, CV_COLL, CV_KINDS, cvRelations};
  `)();
} catch (err) {
  console.log("  ✗ app.html lastet ikke i det hele tatt");
  console.log("    " + err.message);
  process.exit(1);
}

let pass = 0; const failures = [];
const ok = (c, m) => c ? pass++ : failures.push(m);

function runView(name, fn, label){
  try {
    const node = fn();
    if (!node) { failures.push(`${label}: returnerte ingenting`); return; }
    const content = node.deepText || "";
    if (!content.trim()) { failures.push(`${label}: rendret tomt`); return; }
    pass++;
  } catch (err) {
    failures.push(`${label}: kastet ${err.constructor.name} — ${err.message}`);
  }
}

console.log("visninger — engelsk, seedet data");
for (const [name, fn] of Object.entries(app.ctx)) runView(name, fn, name);

console.log("visninger — norsk");
app.setLang("no");
for (const [name, fn] of Object.entries(app.ctx)) runView(name, fn, name + " (no)");
app.setLang("en");

console.log("visninger — tom database");
app.setDB({strategies:[],insights:[],decisions:[],assumptions:[],signals:[],goals:[],outcomes:[]});
for (const [name, fn] of Object.entries(app.ctx)) runView(name, fn, name + " (tom)");
app.setDB(structuredClone(app.SEED));

console.log("visninger — filtrert på én strategi");
app.setStrat(app.SEED.strategies[0].name);
for (const [name, fn] of Object.entries(app.ctx)) runView(name, fn, name + " (filtrert)");
app.setStrat("*");

console.log("strategi-detaljvisning");
if (app.vStrategyDetail) {
  for (const s of app.SEED.strategies) {
    runView("vStrategyDetail", () => app.vStrategyDetail(s.id), `vStrategyDetail(${s.id})`);
  }
  runView("vStrategyDetail", () => app.vStrategyDetail("finnes-ikke"), "vStrategyDetail(ukjent id)");
} else {
  failures.push("vStrategyDetail ble ikke funnet i app.html");
}

console.log("skjemaet bygger for hver kollesjon");
// buildForm flyttet fra modal til skuff. Ingen visningstest rørte den, og
// et skjema som kaster er usynlig til noen prøver å opprette noe.
for (const lang of ["en","no"]) {
  app.setLang(lang);
  for (const coll of Object.keys(app.FIELDS)) {
    const seed = (app.SEED[coll] || [])[0];
    // nytt
    try {
      app.setEditing({coll, id:null, data:{}});
      app.buildForm();
      const body = app.drawerBody();
      ok((body.deepText || body.children.length) ? true : false,
         `buildForm(${coll}, nytt, ${lang}) rendret noe`);
    } catch (err) {
      failures.push(`buildForm(${coll}, nytt, ${lang}): kastet ${err.constructor.name} — ${err.message}`);
    }
    // redigering av en seed-rad
    if (seed) {
      try {
        app.setEditing({coll, id:seed.id, data:structuredClone(seed)});
        app.buildForm();
        pass++;
      } catch (err) {
        failures.push(`buildForm(${coll}, rediger, ${lang}): kastet ${err.constructor.name} — ${err.message}`);
      }
    }
  }
  // hver fane i et faneskjema
  for (const coll of Object.keys(app.FORM_TABS)) {
    app.FORM_TABS[coll].forEach((tb, i) => {
      try {
        app.setEditing({coll, id:null, data:{}});
        app.buildForm(i);
        pass++;
      } catch (err) {
        failures.push(`buildForm(${coll}, fane ${tb.k}, ${lang}): kastet ${err.message}`);
      }
    });
  }
}
app.setLang("en");
{
  // Hvert felt må ligge i nøyaktig én fane — ellers blir det usynlig eller dobbelt.
  for (const coll of Object.keys(app.FORM_TABS)) {
    const inTabs = app.FORM_TABS[coll].flatMap(tb => tb.keys);
    const all = app.FIELDS[coll].map(f => f.k);
    const missing = all.filter(k => !inTabs.includes(k));
    const extra = inTabs.filter(k => !all.includes(k));
    const dupes = inTabs.filter((k,i) => inTabs.indexOf(k) !== i);
    ok(missing.length === 0, `${coll}: hvert felt ligger i en fane` + (missing.length ? ": mangler " + missing.join(", ") : ""));
    ok(extra.length === 0, `${coll}: ingen fane peker på et felt som ikke finnes` + (extra.length ? ": " + extra.join(", ") : ""));
    ok(dupes.length === 0, `${coll}: ingen felt i to faner` + (dupes.length ? ": " + dupes.join(", ") : ""));
  }
}

console.log("hver koblingsregel tegner faktisk en kant");
// CV_LINKS sier hvilke par som KAN kobles. cvRelations() tegner kantene.
// De var to uavhengige lister, og seks regler — verdi→utfall blant dem —
// fantes i den første og manglet i den andre: du kunne lage koblingen,
// men den ble aldri synlig. Denne testen setter hver kobling gjennom
// regelens egen set() og krever at cvRelations() finner den igjen.
{
  const mk = (kind, i) => {
    const o = { id: `${kind}-${i}` };
    if (kind === "strategy") o.name = `S${i}`;
    return o;
  };
  for (const key of Object.keys(app.CV_LINKS)) {
    const r = app.CV_LINKS[key];
    const a = mk(r.from, 1), b = mk(r.to, 2);
    const db = {};
    for (const k of app.CV_KINDS) db[app.CV_COLL[k]] = [];
    db[app.CV_COLL[r.from]].push(a);
    if (r.from === r.to) db[app.CV_COLL[r.to]].push(b);
    else db[app.CV_COLL[r.to]].push(b);
    db.reviews = []; db.rights = db.rights || [];
    app.setDB(db);
    try {
      r.set(a, b, "related");
      const rels = app.cvRelations();
      const hit = rels.some(e => e.rule === key);
      ok(hit, `koblingsregelen «${key}» (${r.from} → ${r.to}) tegner en kant`);
    } catch (err) {
      failures.push(`koblingsregelen «${key}»: kastet ${err.message}`);
    }
  }
  app.setDB(structuredClone(app.SEED));
}

console.log("stående systemer peker på visninger som finnes");
{
  const views = new Set(Object.keys(app.ctx).map(n => n.slice(1).toLowerCase()));
  for (const s of app.SYSTEMS) {
    if (!s.reg) continue;
    const v = s.reg.toLowerCase();
    ok(views.has(v), `SYSTEMS "${s.name}" peker på visningen ${v}, som må finnes`);
    ok(app.T.en["nav." + v] !== undefined && app.T.no["nav." + v] !== undefined,
       `SYSTEMS "${s.name}" trenger nav.${v} på begge språk`);
  }
}

if (failures.length) {
  console.log(`\n${failures.length} FEILET av ${pass + failures.length}:`);
  failures.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log(`\nALLE ${pass} VISNINGER RENDRER`);
