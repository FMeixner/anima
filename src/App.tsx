import { useEffect, useState } from "react";
import { autoBackup } from "./backup";
import { addExtra, setCore } from "./engine/actions";
import { todayISO } from "./engine/dates";
import { baselineDue, protocolDue, weekNo } from "./engine/week";
import { useAppState } from "./store";
import { GuidedSession } from "./ui/GuidedSession";
import { Onboarding } from "./ui/Onboarding";
import { Protocol } from "./ui/Protocol";
import { Setup } from "./ui/Setup";
import { Today, type Launch } from "./ui/Today";
import { WeekView } from "./ui/WeekView";

type Tab = "heute" | "woche" | "protokoll";

export default function App() {
  const [state, update, replace] = useAppState();
  const [tab, setTab] = useState<Tab>("heute");
  const [setup, setSetup] = useState(false);
  const [guide, setGuide] = useState<Launch | null>(null);
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
    if (!state.sessions.length) return;
    void autoBackup(state, today).then((r) => { if (r) update((s) => ({ ...s, lastBackup: today })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessions.length]);

  if (!state.onboarded) return <Onboarding update={update} />;

  if (guide) {
    return (
      <GuidedSession ex={guide.ex} minutes={guide.minutes} settings={state.settings}
        onCancel={() => setGuide(null)}
        onFinish={(m) => {
          update((s) => (guide.slot ? setCore(s, guide.date, guide.slot, "done", m) : addExtra(s, guide.date, guide.ex.id, m)));
          setGuide(null);
        }} />
    );
  }

  const dueAny = baselineDue(state) || Array.from({ length: week }, (_, i) => i + 1).some((w) => protocolDue(state, w, today));
  const goProtocol = (w: number) => { setSelWeek(w); setTab("protokoll"); };

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">Anima</span>
        <button className="btn small ghost" onClick={() => setSetup(true)} aria-label="Einstellungen">⚙</button>
      </div>
      <main className="main">
        {setup ? <Setup state={state} update={update} replace={replace} today={today} onClose={() => setSetup(false)} /> : (
          <>
            {tab === "heute" && <Today state={state} update={update} today={today} week={week} onStart={setGuide} onProtocol={goProtocol} />}
            {tab === "woche" && <WeekView state={state} update={update} today={today} week={viewWeek} onWeek={setViewWeek} />}
            {tab === "protokoll" && <Protocol state={state} update={update} today={today} week={week} selected={Math.min(selWeek, Math.max(week, 0))} onSelect={setSelWeek} />}
          </>
        )}
      </main>
      <nav className="tabbar">
        {([["heute", "Heute"], ["woche", "Woche"], ["protokoll", "Protokoll"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={tab === k && !setup ? "on" : ""} onClick={() => { setSetup(false); setTab(k); if (k === "woche") setViewWeek(Math.max(week, 1)); }}>
            {label}{k === "protokoll" && dueAny && <span className="dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
