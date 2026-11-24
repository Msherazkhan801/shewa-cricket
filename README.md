# Shewa Super League — Live Score (Next.js + Firebase)

- `/` → public live score page (yehi link FB pe share karna hai)
- `/admin` → aapka scoring panel (mobile pe login karke score update karein)

Firebase env variables ke baghair app **demo mode** mein chalti hai (data sirf browser mein), taake pehle test kar sakein.

## Local chalana
```bash
npm install
npm run dev      # http://localhost:3000  aur  http://localhost:3000/admin
```

## Setup (ek dafa, sab free)

### 1. Firebase
1. https://console.firebase.google.com → **Add project** → `shewa-super-league`.
2. **Build → Realtime Database → Create database** → **Singapore (asia-southeast1)** → **Locked mode**.
3. **Build → Authentication → Email/Password** enable → **Users → Add user** (apna email/password) → **User UID** copy karein.
4. **Realtime Database → Rules** mein `database.rules.json` paste karein, `PASTE_YOUR_ADMIN_UID` ki jagah apna UID → **Publish**.
   (Sab log score dekh sakte hain, update sirf aap.)
5. **Project settings → Your apps → Web (`</>`)** → app register → config values note karein.

### 2. Env variables
`.env.local.example` ko copy karke `.env.local` banayein aur values bharein:

| Variable | Firebase config mein |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | `databaseURL` (Realtime Database page ke upar wala URL) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

### 3. Vercel deploy
1. Code GitHub pe push karein → https://vercel.com/new → repo import (Next.js auto detect hoga).
2. **Environment Variables** mein upar wale 5 variables daalein → **Deploy**.
3. Link milega jaise `https://shewa-super-league.vercel.app`. FB share preview image (`/og.png`) khud sahi URL use karegi.

## Match day
1. `/admin` → login.
2. **Teams** → naam + players (har line pe ek) → Save.
3. **New match** → teams, overs, pehle batting, openers, bowler → Start.
4. **Scoring**: runs ke buttons; Wide/No ball/Bye ke liye pehle mode, phir runs; **W** → kaun/kaise → naya batter; over ke baad naya bowler; ghalti pe **Undo**.
5. Match khatam → **Result save karein** → "Recent results" mein chala jayega.

## Files
- `app/page.js` — public scoreboard
- `app/admin/page.js` — admin panel
- `lib/scoring.js` — cricket scoring logic
- `lib/store.js` — Firebase / demo data layer
