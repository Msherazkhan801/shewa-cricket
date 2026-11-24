"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as S from "@/lib/scoring";
import * as store from "@/lib/store";
import LeagueBrand from "@/app/components/league-brand";

const UNDO_KEY = "ssl-undo";
const toArr = (a) => (Array.isArray(a) ? a : Object.values(a || {}));

export default function AdminPage() {
  const [user, setUser] = useState(undefined);
  useEffect(() => store.onAuth((u) => setUser(u || null)), []);

  return (
    <main className="adm">
      <div className="top">
        <LeagueBrand subtitle="Admin" compact />
        {user && !store.isDemo && <button className="ghost" type="button" onClick={store.logout}>Logout</button>}
      </div>
      {store.isDemo && <div className="demo">Demo mode — Firebase set nahi, data sirf is browser mein save ho raha hai.</div>}
      {user === undefined ? null : user ? <Dashboard /> : <Login />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault(); setErr("");
    try { await store.login(email.trim(), pw); } catch { setErr("Email ya password ghalat hai."); }
  }
  return (
    <section className="card">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label htmlFor="em">Email</label>
        <input id="em" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="pri" type="submit">Login</button>
        <div className="err">{err}</div>
      </form>
    </section>
  );
}

function Dashboard() {
  const [tab, setTab] = useState("score");
  const [teams, setTeams] = useState({});
  const [live, setLive] = useState(null);
  const [undoCount, setUndoCount] = useState(0);
  const undo = useRef([]);
  const busy = useRef(false);
  const liveRef = useRef(null);

  useEffect(() => {
    try { undo.current = JSON.parse(localStorage.getItem(UNDO_KEY)) || []; } catch {}
    setUndoCount(undo.current.length);
    const a = store.listenTeams((t) => setTeams(t || {}));
    const b = store.listenLive((v) => { const s = S.normalize(v); liveRef.current = s; setLive(s); });
    return () => { a?.(); b?.(); };
  }, []);

  const saveUndo = () => {
    undo.current = undo.current.slice(-50);
    try { localStorage.setItem(UNDO_KEY, JSON.stringify(undo.current)); } catch {}
    setUndoCount(undo.current.length);
  };

  async function commit(next) {
    const cur = liveRef.current;
    if (busy.current || next === cur) return false;
    busy.current = true;
    undo.current.push(JSON.stringify(cur ?? null)); saveUndo();
    try {
      const saved = await store.setLive(next);
      liveRef.current = saved;
      setLive(saved);
      return true;
    } catch (e) {
      alert("Save nahi hua: " + e.message);
      undo.current.pop(); saveUndo();
      return false;
    } finally { busy.current = false; }
  }
  async function doUndo() {
    if (!undo.current.length || busy.current) return;
    busy.current = true;
    const prev = JSON.parse(undo.current.pop()); saveUndo();
    try { await store.setLive(prev); } catch (e) { alert("Undo nahi hua: " + e.message); }
    busy.current = false;
  }

  const teamList = useMemo(
    () => Object.entries(teams).map(([id, t]) => ({ id, name: t.name, players: toArr(t.players) })),
    [teams]
  );

  return (
    <>
      <nav className="tabs">
        {[["score", "Scoring"], ["setup", "New match"], ["teams", "Teams"]].map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      {tab === "score" && <Scoring live={live} commit={commit} undo={doUndo} undoCount={undoCount} goSetup={() => setTab("setup")} />}
      {tab === "setup" && <Setup teams={teamList} live={live} onStart={async (s) => { if (await commit(s)) setTab("score"); }} />}
      {tab === "teams" && <Teams teams={teamList} />}
    </>
  );
}

/* ---------------- scoring ---------------- */
function Scoring({ live, commit, undo, undoCount, goSetup }) {
  const [mode, setMode] = useState("run");
  const [pending, setPending] = useState(null); // wicket in progress

  if (!live) {
    return (
      <>
        <div className="card sum"><h2>Koi match live nahi</h2><div className="t">&quot;New match&quot; tab se match start karein.</div></div>
        {undoCount > 0 && <button type="button" className="full" onClick={undo}>↶ Undo (pichla state wapas)</button>}
      </>
    );
  }
  const s = live, inn = s.inns[s.cur];
  const need = s.inns[0].runs + 1 - inn.runs, left = s.overs * 6 - inn.balls;

  let panel;
  if (s.status === "done") panel = <Done s={s} commit={commit} undo={undo} goSetup={goSetup} />;
  else if (s.status === "break") panel = <Break s={s} commit={commit} undo={undo} />;
  else if (s.needBatter) panel = <Pick key={"bt" + inn.balls + "-" + inn.wkts} kind="batter" s={s} commit={commit} undo={undo} />;
  else if (pending) panel = <Wicket s={s} pending={pending} setPending={setPending} commit={commit} />;
  else if (s.needBowler) panel = <Pick key={"bw" + inn.balls} kind="bowler" s={s} commit={commit} />;
  else panel = <Pad s={s} mode={mode} setMode={setMode} commit={commit} undo={undo} undoCount={undoCount} onWicket={() => setPending({ who: "striker", how: "" })} />;

  return (
    <>
      <div className="card sum">
        <div className="t">{s.title} · {s[inn.bat].name} batting</div>
        <div><span className="sc">{inn.runs}/{inn.wkts}</span> <span className="ov">({S.oversText(inn.balls)}/{s.overs})</span></div>
        <div className="t">CRR {S.rate(inn.runs, inn.balls)} · Extras {inn.extras}</div>
        {s.cur === 1 && s.status === "live" && <div className="chase">Need {need} off {left} balls · RRR {S.rate(need, left)}</div>}
        {inn.thisOver.length > 0 && (
          <div className="chips">{inn.thisOver.map((t, i) => <span key={i} className={"chip " + (t === "W" ? "w" : "")}>{t}</span>)}</div>
        )}
      </div>
      <div className="card">{panel}</div>
      {s.status !== "done" && (
        <div className="row">
          <button className="ghost" type="button" onClick={() => confirm("Is innings ko abhi khatam karna hai?") && commit(S.endInnings(s))}>Innings khatam</button>
          <button className="ghost" type="button" onClick={() => confirm("Match cancel karein? Live score hat jayega.") && commit(null)}>Match cancel</button>
        </div>
      )}
    </>
  );
}

function Pad({ s, mode, setMode, commit, undo, undoCount, onWicket }) {
  const inn = s.inns[s.cur];
  const st = inn.batters[inn.striker], ns = inn.batters[inn.nonStriker], bw = inn.bowlers[inn.bowler];
  const runs = mode === "wd" ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 6, 5];
  const hint = { run: "Bat se runs", wd: "Wide: 1 run khud lagega + jo runs bhaage", nb: "No ball: 1 run khud lagega + bat se runs", bye: "Bye/Leg bye: runs extras mein" }[mode];
  return (
    <>
      <div className="who">
        <div>
          <span className="dot">●</span> {st?.name} {st && `${st.r} (${st.b})`}<br />
          &nbsp;&nbsp;&nbsp;{ns?.name} {ns && `${ns.r} (${ns.b})`}
        </div>
        <button type="button" onClick={() => commit(S.swapStrike(s))}>⇄ Strike</button>
      </div>
      <div className="hint">Bowler: <b>{bw?.name}</b> {bw && `${S.oversText(bw.balls)}-${bw.r}-${bw.w}`}</div>
      <div className="mode">
        {[["run", "Normal"], ["wd", "Wide"], ["nb", "No ball"], ["bye", "Bye/LB"]].map(([k, l]) => (
          <button key={k} type="button" className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      <div className="hint">{hint}</div>
      <div className="pad">
        {runs.map((r) => (
          <button key={r} type="button" className={r === 4 ? "b4" : r === 6 ? "b6" : ""} onClick={() => { setMode("run"); commit(S.ball(s, mode, r)); }}>{r}</button>
        ))}
        <button type="button" className="wk" onClick={onWicket}>W</button>
      </div>
      <button type="button" className="full" disabled={!undoCount} onClick={undo}>↶ Undo last ball</button>
    </>
  );
}

function Wicket({ s, pending, setPending, commit }) {
  const inn = s.inns[s.cur];
  const hows = pending.who === "striker" ? ["Bowled", "Caught", "LBW", "Run out", "Stumped", "Hit wicket"] : ["Run out"];
  const how = hows.includes(pending.how) ? pending.how : pending.who === "striker" ? "" : "Run out";
  return (
    <>
      <h2>Wicket</h2>
      <label>Kaun out hua?</label>
      <div className="opts">
        {["striker", "nonStriker"].map((w) => (
          <button key={w} type="button" className={pending.who === w ? "on" : ""} onClick={() => setPending({ ...pending, who: w })}>{inn.batters[inn[w]]?.name}</button>
        ))}
      </div>
      <label>Kaise?</label>
      <div className="opts">
        {hows.map((h) => <button key={h} type="button" className={how === h ? "on" : ""} onClick={() => setPending({ ...pending, how: h })}>{h}</button>)}
      </div>
      <div className="row">
        <button type="button" onClick={() => setPending(null)}>Wapas</button>
        <button type="button" className="red" disabled={!how} onClick={() => { setPending(null); commit(S.wicket(s, pending.who, how)); }}>Out confirm</button>
      </div>
    </>
  );
}

function Pick({ kind, s, commit, undo }) {
  const inn = s.inns[s.cur];
  const list = kind === "batter" ? S.yetToBat(s) : s[inn.bowl].players.filter((n) => n !== inn.bowlers[inn.lastBowler]?.name);
  const [sel, setSel] = useState(list[0] || "");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState("");
  function ok() {
    const name = typed.trim() || sel;
    if (!name) return setErr("Naam chunein ya likhein.");
    commit(kind === "batter" ? S.setNewBatter(s, name) : S.setBowler(s, name));
  }
  return (
    <>
      <h2>{kind === "batter" ? "Naya batter" : "Next over ka bowler"}</h2>
      {list.length > 0 && (
        <>
          <label htmlFor="pk">List se chunein</label>
          <select id="pk" value={sel} onChange={(e) => setSel(e.target.value)}>{list.map((n) => <option key={n}>{n}</option>)}</select>
        </>
      )}
      <label htmlFor="pkName">Ya naam likhein</label>
      <input id="pkName" placeholder="Naam (optional)" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <button className="pri" type="button" onClick={ok}>{kind === "batter" ? "Batter set karein" : "Bowler set karein"}</button>
      {kind === "batter" && <button type="button" className="full" onClick={undo}>↶ Undo wicket</button>}
      <div className="err">{err}</div>
    </>
  );
}

function Break({ s, commit, undo }) {
  const first = s.inns[0];
  const bat = s[first.bowl].players, bowl = s[first.bat].players;
  const [st, setSt] = useState(bat[0] || "");
  const [ns, setNs] = useState(bat[1] || "");
  const [bw, setBw] = useState(bowl.at(-1) || "");
  const [err, setErr] = useState("");
  return (
    <>
      <h2>Innings break</h2>
      <div className="hint">{s[first.bowl].name} ko {first.runs + 1} runs chahiye.</div>
      <label htmlFor="bS">Striker</label>
      <select id="bS" value={st} onChange={(e) => setSt(e.target.value)}>{bat.map((n) => <option key={n}>{n}</option>)}</select>
      <label htmlFor="bN">Non-striker</label>
      <select id="bN" value={ns} onChange={(e) => setNs(e.target.value)}>{bat.map((n) => <option key={n}>{n}</option>)}</select>
      <label htmlFor="bB">Pehla bowler</label>
      <select id="bB" value={bw} onChange={(e) => setBw(e.target.value)}>{bowl.map((n) => <option key={n}>{n}</option>)}</select>
      <button className="pri" type="button" onClick={() => (st === ns ? setErr("Striker aur non-striker alag hone chahiye.") : commit(S.startSecond(s, { striker: st, nonStriker: ns, bowler: bw })))}>2nd innings start</button>
      <button type="button" className="full" onClick={undo}>↶ Undo</button>
      <div className="err">{err}</div>
    </>
  );
}

function Done({ s, commit, undo, goSetup }) {
  async function save() {
    const summary = s.inns.map((i) => `${s[i.bat].name} ${i.runs}/${i.wkts}`).join(" · ");
    try {
      await store.pushResult({ matchId: s.matchId, title: s.title, result: s.result || "", summary, date: Date.now() });
      await commit(null); goSetup();
    } catch (e) { alert("Save nahi hua: " + e.message); }
  }
  return (
    <>
      <h2>{s.result || "Match khatam"}</h2>
      <div className="hint">Result save karne se ye &quot;Recent results&quot; mein chala jayega aur live board khaali ho jayega.</div>
      <button className="pri" type="button" onClick={save}>Result save karein</button>
      <button type="button" className="full" onClick={undo}>↶ Undo last ball</button>
    </>
  );
}

/* ---------------- new match ---------------- */
function Setup({ teams, live, onStart }) {
  const [title, setTitle] = useState("");
  const [aId, setA] = useState(teams[0]?.id || "");
  const [bId, setB] = useState(teams[1]?.id || "");
  const [overs, setOvers] = useState(10);
  const [batFirst, setBatFirst] = useState("a");
  const [st, setSt] = useState("");
  const [ns, setNs] = useState("");
  const [bw, setBw] = useState("");
  const [err, setErr] = useState("");

  const A = teams.find((t) => t.id === aId), B = teams.find((t) => t.id === bId);
  const batT = batFirst === "a" ? A : B, bowlT = batFirst === "a" ? B : A;
  const batP = batT?.players || [], bowlP = bowlT?.players || [];

  // reset player picks when teams / batting side change
  useEffect(() => { setSt(batP[0] || ""); setNs(batP[1] || ""); setBw(bowlP.at(-1) || ""); }, [aId, bId, batFirst, teams]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!aId && teams[0]) setA(teams[0].id); if (!bId && teams[1]) setB(teams[1].id); }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    if (!A || !B || A.id === B.id) return setErr("Do alag teams chunein.");
    if (st === ns) return setErr("Striker aur non-striker alag hone chahiye.");
    if (live && live.status !== "done" && !confirm("Ek match pehle se live hai. Usay replace karna hai?")) return;
    setErr("");
    onStart(S.newMatch({ title: title.trim() || "Match", a: { name: A.name, players: A.players }, b: { name: B.name, players: B.players },
      overs: Number(overs) || 10, batFirst, striker: st, nonStriker: ns, bowler: bw }));
  }

  if (teams.length < 2) return <div className="card"><h2>Naya match</h2><div className="hint">Pehle &quot;Teams&quot; tab mein kam az kam 2 teams add karein.</div></div>;

  const teamOpts = teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>);
  return (
    <div className="card">
      <h2>Naya match</h2>
      <label htmlFor="mTitle">Match ka naam</label>
      <input id="mTitle" placeholder="Match 1" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row">
        <div><label htmlFor="mA">Team A</label><select id="mA" value={aId} onChange={(e) => setA(e.target.value)}>{teamOpts}</select></div>
        <div><label htmlFor="mB">Team B</label><select id="mB" value={bId} onChange={(e) => setB(e.target.value)}>{teamOpts}</select></div>
      </div>
      <div className="row">
        <div><label htmlFor="mOv">Overs</label><input id="mOv" type="number" min="1" max="50" inputMode="numeric" value={overs} onChange={(e) => setOvers(e.target.value)} /></div>
        <div>
          <label htmlFor="mBat">Pehle batting</label>
          <select id="mBat" value={batFirst} onChange={(e) => setBatFirst(e.target.value)}>
            <option value="a">{A?.name || "Team A"}</option><option value="b">{B?.name || "Team B"}</option>
          </select>
        </div>
      </div>
      <label htmlFor="mS">Striker</label>
      <select id="mS" value={st} onChange={(e) => setSt(e.target.value)}>{batP.map((n) => <option key={n}>{n}</option>)}</select>
      <label htmlFor="mN">Non-striker</label>
      <select id="mN" value={ns} onChange={(e) => setNs(e.target.value)}>{batP.map((n) => <option key={n}>{n}</option>)}</select>
      <label htmlFor="mBw">Pehla bowler</label>
      <select id="mBw" value={bw} onChange={(e) => setBw(e.target.value)}>{bowlP.map((n) => <option key={n}>{n}</option>)}</select>
      <button className="pri" id="start" type="button" onClick={start}>Match start karein</button>
      <div className="err">{err}</div>
    </div>
  );
}

/* ---------------- teams ---------------- */
function Teams({ teams }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [players, setPlayers] = useState("");
  const [err, setErr] = useState("");

  const clear = () => { setEditing(null); setName(""); setPlayers(""); };
  async function save() {
    const n = name.trim();
    const list = [...new Set(players.split("\n").map((x) => x.trim()).filter(Boolean))];
    if (!n || list.length < 2) return setErr("Team ka naam aur kam az kam 2 players likhein.");
    const id = editing || n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
    try { await store.saveTeam(id, { name: n, players: list }); setErr(""); clear(); }
    catch (e) { setErr("Save nahi hua: " + e.message); }
  }

  return (
    <>
      <div className="card">
        <h2>{editing ? "Team edit karein" : "Team add karein"}</h2>
        <label htmlFor="tName">Team ka naam</label>
        <input id="tName" placeholder="Shewa Lions" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="tPlayers">Players (har line pe ek naam)</label>
        <textarea id="tPlayers" placeholder={"Player 1\nPlayer 2\nPlayer 3"} value={players} onChange={(e) => setPlayers(e.target.value)} />
        <button className="pri" id="tSave" type="button" onClick={save}>Team save karein</button>
        {editing && <button type="button" className="full" onClick={clear}>Naya team (form clear)</button>}
        <div className="err">{err}</div>
      </div>
      <div className="card">
        <h2>Teams</h2>
        {teams.length === 0 && <div className="hint">Abhi koi team nahi.</div>}
        {teams.map((t) => (
          <div className="team" key={t.id}>
            <div><b>{t.name}</b><span>{t.players.length} players</span></div>
            <div className="acts">
              <button type="button" onClick={() => { setEditing(t.id); setName(t.name); setPlayers(t.players.join("\n")); window.scrollTo(0, 0); }}>Edit</button>
              <button type="button" onClick={() => confirm("Team delete karein?") && store.delTeam(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
