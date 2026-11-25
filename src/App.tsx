import { useEffect, useState } from "react";
import { autoBackup } from "./backup";
import { addFree, setSlot } from "./engine/actions";
import { todayISO } from "./engine/dates";
import { baselineDue, protocolDue, weekNo } from "./engine/week";
import { useAppState } from "./store";
import { Library } from "./ui/Library";
import { Onboarding } from "./ui/Onboarding";
import { Protocol } from "./ui/Protocol";
import { SessionRunner, type Launch } from "./ui/SessionRunner";
import { Setup } from "./ui/Setup";
import { Today } from "./ui/Today";
import { WeekView } from "./ui/WeekView";
import { Wave } from "./ui/common";

type Tab = "heute" | "woche" | "ueben" | "protokoll";
const TABS: [Tab, string][] = [["heute", "Heute"], ["woche", "Woche"], ["ueben", "Bibliothek"], ["protokoll", "Protokoll"]];

export default function App() {
  const [state, update, replace] = useAppState();
  const [tab, setTab] = useState<Tab>("heute");
  const [setup, setSetup] = useState(false);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [today, setToday] = useState(todayISO());
  const week = weekNo(state, today);
  const [viewWeek, setViewWeek] = useState(Math.max(week, 1));
  const [selWeek, setSelWeek] = useState(0);

  useEffect(() => { document.documentElement.dataset.theme = state.theme ?? ""; }, [state.theme]);
  // Datum nachziehen, wenn die App über Nacht offen bleibt
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60000);
    const vis = () => { if (document.visibilityState === "visible") setToday(todayISO()); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);
  // Sicherung nach einer abgeschlossenen Einheit
  useEffect(() => {
    if (!state.sessions.length && !state.logs.length) return;
    void autoBackup(state, today).then((r) => { if (r) update((s) => ({ ...s, lastBackup: today })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessions.length, state.logs]);

  if (!state.onboarded) return <Onboarding update={update} />;

  if (launch) {
    return (
      <SessionRunner launch={launch} settings={state.settings} texts={state.texts}
        onCancel={() => setLaunch(null)}
        onFinish={(m, ids) => {
          update((s) => (launch.slot ? setSlot(s, launch.date, launch.slot, "done", m, ids) : addFree(s, launch.date, ids, m)));
          setLaunch(null);
        }} />
    );
  }

  const dueAny = baselineDue(state) || Array.from({ length: week }, (_, i) => i + 1).some((w) => protocolDue(state, w, today));
  const goProtocol = (w: number) => { setSelWeek(w); setTab("protokoll"); };

  return (
    <div className="app">
      <header className="topbar">
        <div><span className="brand serif">anima</span><Wave className="small" /></div>
        <button className="btn quiet round" onClick={() => setSetup(true)} aria-label="Einstellungen">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="8.2" strokeDasharray="2 3.4" /></svg>
        </button>
      </header>
      <main className="main">
        {setup ? <Setup state={state} update={update} replace={replace} today={today} onClose={() => setSetup(false)} /> : (
          <>
            {tab === "heute" && <Today state={state} update={update} today={today} week={week} onStart={setLaunch} onProtocol={goProtocol} />}
            {tab === "woche" && <WeekView state={state} update={update} today={today} week={viewWeek} onWeek={setViewWeek} />}
            {tab === "ueben" && <Library state={state} update={update} today={today} onStart={setLaunch} />}
            {tab === "protokoll" && <Protocol state={state} update={update} today={today} week={week} selected={Math.min(selWeek, Math.max(week, 0))} onSelect={setSelWeek} />}
          </>
        )}
      </main>
      <nav className="tabbar" aria-label="Bereiche">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k && !setup ? "on" : ""} onClick={() => { setSetup(false); setTab(k); if (k === "woche") setViewWeek(Math.max(week, 1)); }}>
            {label}{k === "protokoll" && dueAny && <span className="dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
