"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listenMatches } from "@/lib/store";
import { oversText } from "@/lib/scoring";

export default function MatchesPage() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => listenMatches((items) => {
    setMatches(items.sort((a, b) => b.createdAt - a.createdAt));
  }, (e) => {
    setError(e.message || "Match history load nahi hui.");
    setMatches([]);
  }), []);

  return (
    <main className="pub">
      <header><h1>Shewa Super League<small>Match history</small></h1></header>
      <Link className="archive-back" href="/">← Live scoreboard</Link>
      <section className="sec">
        <h2>Matches</h2>
        {matches === null ? <p>Loading matches...</p> : error ? <p>{error}</p> : matches.length === 0 ? <p>No matches saved yet.</p> : (
          <ul className="archive-list">
            {matches.map((match) => {
              const innings = match.inns || [];
              const matchId = match.id || match.matchId;
              return (
                <li key={matchId}>
                  <Link href={`/matches/${matchId}`}>
                    <strong>{match.title || "Match"}</strong>
                    <span>{match.a?.name || "Team A"} vs {match.b?.name || "Team B"} · {match.overs} overs</span>
                    <span className="archive-score">{innings.map((inn) => `${match[inn.bat]?.name || "Team"} ${inn.runs}/${inn.wkts} (${oversText(inn.balls)})`).join(" · ") || "Score not started"}</span>
                    <span className="archive-status">{match.status || "saved"}{match.result ? ` · ${match.result}` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
