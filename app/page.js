"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LeagueBrand from "@/app/components/league-brand";
import { normalize, oversText, rate } from "@/lib/scoring";
import { demoState } from "@/lib/demo";
import { isDemo, listenLive, listenResults } from "@/lib/store";

const chipClass = (t) => (t === "W" ? "w" : t === "4" ? "b4" : t === "6" ? "b6" : /wd|nb|b$/.test(t) ? "x" : "");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Ball() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r="19" fill="#d7263d" />
      <path d="M10 9c6 7 6 17 0 24M32 9c-6 7-6 17 0 24" stroke="#f6f1e4" strokeWidth="1.6" fill="none" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

export default function LivePage() {
  const [live, setLiveState] = useState(undefined); // undefined = loading
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLiveState((v) => (v === undefined ? null : v)), 10000);
    const offLive = listenLive(
      (v) => {
        clearTimeout(timer);
        // demo mode with nothing scored yet: show a sample match
        setLiveState(normalize(v ?? (isDemo ? demoState() : null)));
      },
      () => setLiveState(null)
    );
    const offRes = listenResults((r) => {
      const list = Object.values(r || {}).sort((a, b) => b.date - a.date);
      setResults(list.length || !isDemo ? list : [{ result: "Shewa Lions won by 12 runs", title: "Match 1", summary: "Shewa Lions 142/6 · Swabi Kings 130/9", date: 1 }]);
    });
    return () => { clearTimeout(timer); offLive?.(); offRes?.(); };
  }, []);

  async function share() {
    try { await navigator.clipboard.writeText(location.href.split("#")[0]); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  const isLive = live?.status === "live";

  return (
    <main className="pub">
      <header>
        <Ball />
          <h1>Shewa Super League<small>Live cricket score</small></h1>
        <LeagueBrand subtitle="Live cricket score" />
        {isLive && <span className="pill"><i />LIVE</span>}
      </header>
      {isDemo && <div className="demo">Demo data — Firebase env variables abhi set nahi hue.</div>}

      <section className="board">
        {live === undefined ? (
          <div className="idle"><div className="big">Score load ho raha hai…</div></div>
        ) : !live || !live.inns?.length ? (
          <div className="idle">
            <div className="mtitle">Shewa Super League</div>
            <div className="big">Abhi koi match live nahi</div>
            <div className="mtitle">Match shuru hote hi score yahan nazar aayega.</div>
          </div>
        ) : (
          <Board s={live} />
        )}
      </section>

      {isLive && <Crease s={live} />}

      {live?.inns?.map((inn, n) => <Scorecard key={n} s={live} inn={inn} open={!isLive && n === live.cur} />)}

      {results.length > 0 && (
        <section className="sec res">
          <h2>Recent results</h2>
          <ul>{results.map((r, i) => <li key={i}>
            {r.matchId ? <Link className="archive-link" href={`/matches/${r.matchId}`}><b>{r.result}</b><span>{r.title} · {r.summary}</span></Link> : <><b>{r.result}</b><span>{r.title} · {r.summary}</span></>}
          </li>)}</ul>
        </section>
      )}

      <footer>
        <span>{live?.updated ? "Updated " + new Date(live.updated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : " "}</span>
        <Link className="archive-nav" href="/matches">Match history</Link>
        <button className="share" type="button" onClick={share}>{copied ? "Copied!" : "Link copy karein"}</button>
      </footer>
    </main>
  );
}

function Board({ s }) {
  const inn = s.inns[s.cur];
  const batT = s[inn.bat], bowlT = s[inn.bowl];
  const first = s.inns[0];
  const need = first.runs + 1 - inn.runs, left = s.overs * 6 - inn.balls;
  return (
    <>
      <div className="mtitle">{s.title} · {s.overs} overs</div>
      <div className="vs">{s.a.name}<b>vs</b>{s.b.name}</div>
      <div className="batting">{batT.name}{s.status === "done" ? "" : " batting"}</div>
      <div className="score"><span className="big">{inn.runs}/{inn.wkts}</span><span className="ov">({oversText(inn.balls)}/{s.overs})</span></div>
      <div className="stats">
        <span>CRR <b>{rate(inn.runs, inn.balls)}</b></span>
        <span>Extras <b>{inn.extras}</b></span>
        {s.cur === 1 && <span>{s[first.bat].name} <b>{first.runs}/{first.wkts}</b> ({oversText(first.balls)})</span>}
      </div>
      {s.status === "live" && s.cur === 1 && (
        <div className="chase">Target {first.runs + 1} · {batT.name} need {plural(need, "run")} off {plural(left, "ball")} · RRR {rate(need, left)}</div>
      )}
      {s.status === "break" && <div className="chase">Innings break — {bowlT.name} ko jeetne ke liye {inn.runs + 1} runs chahiye</div>}
      {s.status === "done" && s.result && <div className="result">{s.result}</div>}
      {s.status === "live" && inn.thisOver.length > 0 && (
        <div className="over">
          <span className="l">This over</span>
          <div className="chips">{inn.thisOver.map((t, i) => <span key={i} className={"chip " + chipClass(t)}>{t}</span>)}</div>
        </div>
      )}
    </>
  );
}

function Crease({ s }) {
  const inn = s.inns[s.cur];
  const bw = inn.bowlers[s.needBowler ? inn.lastBowler : inn.bowler];
  return (
    <section className="sec">
      <h2>At the crease</h2>
      <table>
        <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
        <tbody>
          {[inn.striker, inn.nonStriker].filter((i) => i >= 0 && inn.batters[i]).map((i) => {
            const p = inn.batters[i];
            return (
              <tr key={i}>
                <td className={i === inn.striker ? "str" : ""}>{p.name}</td>
                <td><b>{p.r}</b></td><td>{p.b}</td><td>{p.f}</td><td>{p.s}</td>
                <td>{p.b ? ((p.r * 100) / p.b).toFixed(1) : "0.0"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {bw && (
        <table style={{ marginTop: 6 }}>
          <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
          <tbody><tr><td>{bw.name}</td><td>{oversText(bw.balls)}</td><td>{bw.r}</td><td><b>{bw.w}</b></td><td>{rate(bw.r, bw.balls)}</td></tr></tbody>
        </table>
      )}
    </section>
  );
}

function Scorecard({ s, inn, open }) {
  return (
    <details open={open}>
      <summary>{s[inn.bat].name} innings — {inn.runs}/{inn.wkts} ({oversText(inn.balls)})</summary>
      <table>
        <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead>
        <tbody>
          {inn.batters.map((p, i) => (
            <tr key={i}><td>{p.name}<span className="how">{p.out || "not out"}</span></td><td><b>{p.r}</b></td><td>{p.b}</td><td>{p.f}</td><td>{p.s}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="ex">Extras {inn.extras} · Total {inn.runs}/{inn.wkts} in {oversText(inn.balls)} overs</div>
      <table>
        <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
        <tbody>
          {inn.bowlers.map((b, i) => (
            <tr key={i}><td>{b.name}</td><td>{oversText(b.balls)}</td><td>{b.r}</td><td><b>{b.w}</b></td><td>{rate(b.r, b.balls)}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
