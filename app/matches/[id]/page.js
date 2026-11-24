"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LeagueBrand from "@/app/components/league-brand";
import * as S from "@/lib/scoring";
import { listenMatch } from "@/lib/store";

export default function MatchDetailPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(undefined);
  const [error, setError] = useState("");

  useEffect(() => listenMatch(id, (value) => {
    setMatch(value ? S.normalize(value) : null);
  }, (e) => {
    setError(e.message || "Match load nahi hua.");
    setMatch(null);
  }), [id]);

  return (
    <main className="pub">
      <header><LeagueBrand subtitle="Match scorecard" /></header>
      <Link className="archive-back" href="/matches">← Match history</Link>
      {match === undefined ? <section className="board"><p>Loading match...</p></section> : error ? <section className="board"><p>{error}</p></section> : !match ? <section className="board"><p>Match nahi mila.</p></section> : (
        <>
          <section className="board">
            <div className="mtitle">{match.overs} overs · {match.status}</div>
            <div className="vs">{match.a?.name || "Team A"}<b>vs</b>{match.b?.name || "Team B"}</div>
            {match.result && <div className="result">{match.result}</div>}
            <div className="archive-meta">Started {match.createdAt ? new Date(match.createdAt).toLocaleString() : "date unavailable"}</div>
            {match.updatedAt && <div className="archive-meta">Last updated {new Date(match.updatedAt).toLocaleString()}</div>}
          </section>
          {["a", "b"].map((side) => (
            <section className="sec" key={side}>
              <h2>{match[side]?.name} squad</h2>
              <div>{match[side]?.players?.join(" · ") || "No player list"}</div>
            </section>
          ))}
          {match.inns?.map((inn, index) => (
            <section className="sec" key={index}>
              <h2>{match[inn.bat]?.name || "Team"} innings · {inn.runs}/{inn.wkts} ({S.oversText(inn.balls)} overs)</h2>
              <div className="archive-meta">Extras {inn.extras} · {inn.balls} legal balls</div>
              <table>
                <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
                <tbody>{inn.batters?.map((player, i) => (
                  <tr key={i}><td>{player.name}<span className="how">{player.out || "not out"}</span></td><td><b>{player.r}</b></td><td>{player.b}</td><td>{player.f}</td><td>{player.s}</td><td>{player.b ? ((player.r * 100) / player.b).toFixed(1) : "0.0"}</td></tr>
                ))}</tbody>
              </table>
              <table>
                <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
                <tbody>{inn.bowlers?.map((bowler, i) => (
                  <tr key={i}><td>{bowler.name}</td><td>{S.oversText(bowler.balls)}</td><td>{bowler.r}</td><td><b>{bowler.w}</b></td><td>{S.rate(bowler.r, bowler.balls)}</td></tr>
                ))}</tbody>
              </table>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
