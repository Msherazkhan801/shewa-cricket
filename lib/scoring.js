// Cricket scoring logic — pure functions on a plain state object.
// Shared by admin.html (writes) and index.html (reads / formats).

export const clone = (o) => JSON.parse(JSON.stringify(o));
const arr = (a) => (Array.isArray(a) ? a : a ? Object.values(a) : []);

export function normalize(s) {
  if (!s) return null;
  s.inns = arr(s.inns).map((i) => ({
    ...i,
    batters: arr(i.batters),
    bowlers: arr(i.bowlers),
    thisOver: arr(i.thisOver),
  }));
  for (const k of ["a", "b"]) if (s[k]) s[k].players = arr(s[k].players);
  return s;
}

export const oversText = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
export const rate = (runs, balls) => (balls ? ((runs * 6) / balls).toFixed(2) : "0.00");
export const squad = (team) => Math.max(2, (team?.players || []).length || 11);

export function newInnings(bat, bowl) {
  return { bat, bowl, runs: 0, wkts: 0, balls: 0, extras: 0, batters: [], bowlers: [],
    striker: -1, nonStriker: -1, bowler: -1, lastBowler: -1, thisOver: [] };
}

export function newMatch({ title, a, b, overs, batFirst, striker, nonStriker, bowler }) {
  const bowlFirst = batFirst === "a" ? "b" : "a";
  const s = { status: "live", title, a, b, overs: Number(overs) || 20, cur: 0, result: "",
    needBowler: false, inns: [newInnings(batFirst, bowlFirst)], updated: Date.now() };
  const inn = s.inns[0];
  inn.striker = addBatter(inn, striker);
  inn.nonStriker = addBatter(inn, nonStriker);
  inn.bowler = addBowler(inn, bowler);
  return s;
}

export function addBatter(inn, name) {
  const i = inn.batters.findIndex((p) => p.name === name && !p.out);
  if (i >= 0) return i;
  inn.batters.push({ name, r: 0, b: 0, f: 0, s: 0, out: "" });
  return inn.batters.length - 1;
}

export function addBowler(inn, name) {
  const i = inn.bowlers.findIndex((p) => p.name === name);
  if (i >= 0) return i;
  inn.bowlers.push({ name, balls: 0, r: 0, w: 0 });
  return inn.bowlers.length - 1;
}

const swap = (inn) => { [inn.striker, inn.nonStriker] = [inn.nonStriker, inn.striker]; };

// kind: "run" | "wd" | "nb" | "bye"; runs: runs run / hit
export function ball(state, kind, runs) {
  const s = clone(state);
  const inn = s.inns[s.cur];
  if (s.status !== "live" || s.needBowler || s.needBatter) return state;
  const bat = inn.batters[inn.striker];
  const bowl = inn.bowlers[inn.bowler];
  let legal = true, total = runs, label = String(runs);

  if (kind === "run") {
    bat.r += runs; bat.b += 1; bowl.r += runs;
    if (runs === 4) bat.f += 1;
    if (runs === 6) bat.s += 1;
    label = runs === 0 ? "•" : String(runs);
  } else if (kind === "wd") {
    legal = false; total = runs + 1; inn.extras += total; bowl.r += total;
    label = `${total}wd`;
  } else if (kind === "nb") {
    legal = false; total = runs + 1; inn.extras += 1; bowl.r += total;
    bat.r += runs; bat.b += 1;
    if (runs === 4) bat.f += 1;
    if (runs === 6) bat.s += 1;
    label = `${total}nb`;
  } else if (kind === "bye") {
    inn.extras += runs; bat.b += 1;
    label = `${runs}b`;
  }

  inn.runs += total;
  if (legal) { inn.balls += 1; bowl.balls += 1; }
  inn.thisOver.push(label);
  if (runs % 2 === 1) swap(inn);
  return afterBall(s, legal);
}

// who: "striker" | "nonStriker"; how: dismissal text
export function wicket(state, who, how) {
  const s = clone(state);
  const inn = s.inns[s.cur];
  if (s.status !== "live" || s.needBowler || s.needBatter) return state;
  const outIdx = inn[who];
  const p = inn.batters[outIdx];
  const bowl = inn.bowlers[inn.bowler];
  p.out = how === "Run out" ? "run out" : `${how.toLowerCase()} b ${bowl.name}`;
  if (who === "striker") p.b += 1;
  if (how !== "Run out") bowl.w += 1;
  inn.wkts += 1; inn.balls += 1; bowl.balls += 1;
  inn.thisOver.push("W");
  s.needBatter = who; // slot to fill
  return afterBall(s, true);
}

export function setNewBatter(state, name) {
  const s = clone(state);
  const inn = s.inns[s.cur];
  const slot = s.needBatter;
  if (!slot) return state;
  inn[slot] = addBatter(inn, name);
  s.needBatter = false;
  s.updated = Date.now();
  return s;
}

export function setBowler(state, name) {
  const s = clone(state);
  const inn = s.inns[s.cur];
  inn.bowler = addBowler(inn, name);
  inn.thisOver = [];
  s.needBowler = false;
  s.updated = Date.now();
  return s;
}

export function swapStrike(state) {
  const s = clone(state);
  swap(s.inns[s.cur]);
  s.updated = Date.now();
  return s;
}

function afterBall(s, legal) {
  const inn = s.inns[s.cur];
  s.updated = Date.now();
  const batTeam = s[inn.bat];
  const allOut = inn.wkts >= squad(batTeam) - 1;
  const oversDone = inn.balls >= s.overs * 6;
  const chased = s.cur === 1 && inn.runs > s.inns[0].runs;

  if (allOut || oversDone || chased) return finish(s);
  if (legal && inn.balls % 6 === 0) {
    swap(inn);
    inn.lastBowler = inn.bowler;
    s.needBowler = true;
    if (s.needBatter) s.needBatter = s.needBatter === "striker" ? "nonStriker" : "striker";
  }
  return s;
}

export const endInnings = (state) => finish(clone(state));

function finish(s) {
  s.needBowler = false; s.needBatter = false;
  if (s.cur === 0) { s.status = "break"; }
  else { s.status = "done"; s.result = resultText(s); }
  s.updated = Date.now();
  return s;
}

export function startSecond(state, { striker, nonStriker, bowler }) {
  const s = clone(state);
  const first = s.inns[0];
  const inn = newInnings(first.bowl, first.bat);
  inn.striker = addBatter(inn, striker);
  inn.nonStriker = addBatter(inn, nonStriker);
  inn.bowler = addBowler(inn, bowler);
  s.inns.push(inn);
  s.cur = 1; s.status = "live"; s.updated = Date.now();
  return s;
}

export function resultText(s) {
  const [i1, i2] = s.inns;
  if (!i2) return "";
  const t1 = s[i1.bat].name, t2 = s[i2.bat].name;
  if (i2.runs > i1.runs) {
    const w = squad(s[i2.bat]) - 1 - i2.wkts;
    return `${t2} won by ${w} wicket${w === 1 ? "" : "s"}`;
  }
  if (i2.runs < i1.runs) {
    const r = i1.runs - i2.runs;
    return `${t1} won by ${r} run${r === 1 ? "" : "s"}`;
  }
  return "Match tied";
}

// Players of the batting team who have not batted yet in this innings
export function yetToBat(s) {
  const inn = s.inns[s.cur];
  const used = new Set(inn.batters.map((p) => p.name));
  return s[inn.bat].players.filter((n) => !used.has(n));
}
