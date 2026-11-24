/* Automatische Sicherung als Markdown-Logbuch außerhalb des Browserspeichers.
   Bevorzugt: eine selbst gewählte Datei, die bei jeder Sicherung überschrieben wird (File System Access API,
   z. B. Chrome und Edge am Rechner). Der Zugriff auf die Datei wird in IndexedDB gemerkt; die Datei selbst
   überlebt das Löschen der Browserdaten. Wo das fehlt (die meisten Handys): Download mit festem Namen.
   Ein Browser kann eine Datei im Download-Ordner nicht überschreiben, er hängt dann (1), (2) … an. */
import type { AppState } from "./types";
import { toMarkdown } from "./engine/logbook";

export type AutoBackup = "off" | "session";
export const AUTO_FILE = "anima-logbuch.md";
/** Downloads lassen sich nicht überschreiben, deshalb trägt jede Sicherung Datum und Uhrzeit im Namen. */
export const stamped = (d = new Date()) => `anima-logbuch-${d.toISOString().slice(0, 10)}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.md`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handle = any;

export const canPickFile = () => typeof window !== "undefined" && "showSaveFilePicker" in window;

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("anima-backup", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(key: string): Promise<Handle | undefined> {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction("kv").objectStore("kv").get(key);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(undefined);
    });
  } catch { return undefined; }
}
async function idbSet(key: string, v: Handle | null): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((res) => {
      const tx = d.transaction("kv", "readwrite");
      if (v == null) tx.objectStore("kv").delete(key); else tx.objectStore("kv").put(v, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* egal */ }
}

export const backupFile = () => idbGet("file");
export const forgetBackupFile = () => idbSet("file", null);

const md = (s: AppState, today: string) => toMarkdown(s, today);

async function writeTo(h: Handle, s: AppState, today: string): Promise<boolean> {
  try {
    let perm = await h.queryPermission?.({ mode: "readwrite" });
    if (perm !== "granted") perm = await h.requestPermission?.({ mode: "readwrite" });
    if (perm !== "granted") return false;
    const w = await h.createWritable();
    await w.write(md(s, today));
    await w.close();
    return true;
  } catch { return false; }
}

/** Datei wählen und sofort hineinsichern. Gibt den Dateinamen zurück. */
export async function chooseBackupFile(s: AppState, today: string): Promise<string | null> {
  try {
    const h = await (window as any).showSaveFilePicker({ suggestedName: AUTO_FILE, types: [{ description: "Anima-Logbuch", accept: { "text/markdown": [".md"] } }] });
    await idbSet("file", h);
    return (await writeTo(h, s, today)) ? h.name : null;
  } catch { return null; }
}

export function download(s: AppState, name: string, today: string): void {
  const blob = new Blob([md(s, today)], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Nach einer abgeschlossenen Einheit sichern. Gibt "file", "download" oder null zurück. */
export async function autoBackup(s: AppState, today: string): Promise<"file" | "download" | null> {
  if ((s.autoBackup ?? "session") === "off") return null;
  const h = await backupFile();
  // Eigene Datei: wird überschrieben
  if (h && (await writeTo(h, s, today))) return "file";
  download(s, stamped(), today);
  return "download";
}
