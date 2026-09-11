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
             SEED, SYSTEMS, T};
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
