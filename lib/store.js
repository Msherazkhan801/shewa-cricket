"use client";
// Data layer: Firebase when env vars are set, otherwise demo mode (this browser's localStorage).
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, remove, push, query, limitToLast } from "firebase/database";
import { getFirestore, collection, doc, onSnapshot, orderBy, query as firestoreQuery, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isDemo = !config.apiKey || !config.databaseURL;

let fb;
function getFb() {
  if (!fb) {
    const app = getApps()[0] || initializeApp(config);
    fb = { db: getDatabase(app), auth: getAuth(app), firestore: getFirestore(app) };
  }
  return fb;
}

// ---------- demo (localStorage) ----------
const L = {
  get(k) { try { return JSON.parse(localStorage.getItem("ssl-" + k)); } catch { return null; } },
  put(k, v) {
    try { v == null ? localStorage.removeItem("ssl-" + k) : localStorage.setItem("ssl-" + k, JSON.stringify(v)); } catch {}
    window.dispatchEvent(new Event("ssl-change"));
  },
};
function demoListen(key, cb) {
  const fire = () => cb(L.get(key));
  fire();
  window.addEventListener("ssl-change", fire);
  window.addEventListener("storage", fire); // other tabs
  return () => { window.removeEventListener("ssl-change", fire); window.removeEventListener("storage", fire); };
}

// ---------- API ----------
export function listenLive(cb, onError) {
  if (isDemo) return demoListen("live", cb);
  return onValue(ref(getFb().db, "live"), (s) => cb(s.val()), onError);
}
export function listenResults(cb) {
  if (isDemo) return demoListen("results", cb);
  return onValue(query(ref(getFb().db, "results"), limitToLast(10)), (s) => cb(s.val()));
}
export function listenTeams(cb) {
  if (isDemo) return demoListen("teams", cb);
  return onValue(ref(getFb().db, "teams"), (s) => cb(s.val()));
}
export async function setLive(v) {
  if (isDemo) {
    if (!v) { L.put("live", null); return null; }
    const matchId = v.matchId || `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const next = { ...v, matchId, createdAt: v.createdAt || Date.now(), updatedAt: Date.now() };
    const matches = L.get("matches") || {};
    matches[matchId] = next;
    L.put("matches", matches);
    L.put("live", next);
    return next;
  }

  const { db, firestore } = getFb();
  if (!v) { await remove(ref(db, "live")); return null; }
  const matchId = v.matchId || doc(collection(firestore, "matches")).id;
  const next = { ...v, matchId, createdAt: v.createdAt || Date.now(), updatedAt: Date.now() };
  await setDoc(doc(firestore, "matches", matchId), next);
  await set(ref(db, "live"), next);
  return next;
}
export function listenMatches(cb, onError) {
  if (isDemo) return demoListen("matches", (matches) => cb(Object.values(matches || {})));
  const matches = collection(getFb().firestore, "matches");
  return onSnapshot(firestoreQuery(matches, orderBy("createdAt", "desc")), (snapshot) => {
    cb(snapshot.docs.map((match) => ({ ...match.data(), id: match.id })));
  }, onError);
}
export function listenMatch(matchId, cb, onError) {
  if (isDemo) return demoListen("matches", (matches) => cb(matches?.[matchId] || null));
  return onSnapshot(doc(getFb().firestore, "matches", matchId), (snapshot) => {
    cb(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null);
  }, onError);
}
export async function saveTeam(id, t) {
  if (isDemo) { const all = L.get("teams") || {}; all[id] = t; return L.put("teams", all); }
  return set(ref(getFb().db, "teams/" + id), t);
}
export async function delTeam(id) {
  if (isDemo) { const all = L.get("teams") || {}; delete all[id]; return L.put("teams", all); }
  return remove(ref(getFb().db, "teams/" + id));
}
export async function pushResult(r) {
  if (isDemo) { const all = L.get("results") || {}; all["r" + Date.now()] = r; return L.put("results", all); }
  return push(ref(getFb().db, "results"), r);
}

export function onAuth(cb) {
  if (isDemo) { cb({ demo: true }); return () => {}; }
  return onAuthStateChanged(getFb().auth, cb);
}
export const login = (email, pw) => signInWithEmailAndPassword(getFb().auth, email, pw);
export const logout = () => (isDemo ? null : signOut(getFb().auth));
