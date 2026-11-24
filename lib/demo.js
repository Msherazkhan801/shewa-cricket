// Sirf demo ke liye — jab firebase-config.js set nahi hoti tab sample match dikhata hai.
import * as S from "./scoring";

export function demoState() {
  const team = (name, p) => ({ name, players: Array.from({ length: 11 }, (_, i) => `${p} Player ${i + 1}`) });
  let s = S.newMatch({ title: "Match 2", a: team("Shewa Lions", "Lions"), b: team("Swabi Kings", "Kings"),
    overs: 10, batFirst: "a", striker: "Lions Player 1", nonStriker: "Lions Player 2", bowler: "Kings Player 11" });
  const plan = [4, 1, 0, 6, "wd", 1, 2, "W", 0, 1, 4, 1, "nb", 6, 0, 2, 1, 1, "W", 4, 6];
  const bowlers = ["Kings Player 10", "Kings Player 9", "Kings Player 11", "Kings Player 8"];
  let bi = 0;
  for (const x of plan) {
    if (x === "W") s = S.wicket(s, "striker", "Caught");
    else if (x === "wd") s = S.ball(s, "wd", 0);
    else if (x === "nb") s = S.ball(s, "nb", 2);
    else s = S.ball(s, "run", x);
    if (s.needBatter) s = S.setNewBatter(s, S.yetToBat(s)[0]);
    if (s.needBowler) s = S.setBowler(s, bowlers[bi++ % bowlers.length]);
  }
  return s;
}
