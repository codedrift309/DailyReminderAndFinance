import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { remindersApi } from "../services/api";
import { BellRing, Check, Clock, X } from "lucide-react";

export const AlarmContext = createContext(null);

export default function AlarmProvider({ children }) {
  const [alarms, setAlarms] = useState([]);
  const [countdown, setCountdown] = useState(60);
  const [snoozeChoices, setSnoozeChoices] = useState({});
  const audioRef = useRef(null);
  const activeIdsRef = useRef(new Set());

  const beep = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      const play = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      };
      if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
      else play();
    } catch {}
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
        if (audioRef.current.state === "suspended") audioRef.current.resume().catch(() => {});
      } catch {}
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const checkDue = useCallback(async () => {
    try {
      const r = await remindersApi.due();
      const due = r.data || [];
      const added = due.filter(d => !activeIdsRef.current.has(d.id));
      if (!added.length) return;
      added.forEach(d => activeIdsRef.current.add(d.id));
      setAlarms(prev => [...prev, ...added]);
      beep();
      if ("Notification" in window && Notification.permission === "granted") {
        added.forEach(d => {
          try { new Notification(d.name, { body: d.description || "Reminder due" }); } catch {}
        });
      }
    } catch {}
  }, [beep]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    checkDue();
    const id = setInterval(checkDue, 10000);
    return () => clearInterval(id);
  }, [checkDue]);

  useEffect(() => {
    if (!alarms.length) return;
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        beep();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [alarms.map(a => a.id).join(","), beep]);

  const dismissAll = async () => {
    const completed = [];
    await Promise.all(alarms.map(async alarm => {
      try {
        await remindersApi.complete(alarm.id);
        completed.push(alarm.id);
        activeIdsRef.current.delete(alarm.id);
      } catch {}
    }));
    setAlarms(current => current.filter(alarm => !completed.includes(alarm.id)));
  };
  const snooze = async (id, option = "10m") => {
    try {
      await remindersApi.snooze(id, option);
      activeIdsRef.current.delete(id);
      setAlarms(a => a.filter(x => x.id !== id));
    } catch (error) {
      console.error("Could not snooze reminder", error);
    }
  };

  return (
    <AlarmContext.Provider value={{ alarms, dismiss: dismissAll, snooze }}>
      {children}
      {alarms.length > 0 && (
        <div className="alarm-overlay" role="alertdialog" aria-live="assertive">
          <BellRing size={64} />
          <div className="alarm-title">{alarms.length === 1 ? alarms[0].name : `${alarms.length} reminders due`}</div>
          <div className="alarm-message">{alarms.length === 1 ? (alarms[0].description || "") : alarms.map(a=>a.name).join(", ")}</div>
          <div className="alarm-countdown">{countdown}s</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            {alarms.map(a => (
              <React.Fragment key={a.id}>
                <label style={{display:"flex",alignItems:"center",gap:8}}>
                  Snooze
                  <select value={snoozeChoices[a.id] || "10m"} onChange={e=>setSnoozeChoices(current=>({...current,[a.id]:e.target.value}))}>
                    <option value="2m">2 minutes</option>
                    <option value="10m">10 minutes</option>
                    <option value="tomorrow">Tomorrow, same time</option>
                    <option value="1month">Next month, same time</option>
                    <option value="3months">3 months, same time</option>
                    <option value="4months">4 months, same time</option>
                    <option value="1year">1 year, same time</option>
                  </select>
                  <button className="secondary" onClick={() => snooze(a.id, snoozeChoices[a.id] || "10m")}><Clock size={16}/> Submit</button>
                </label>
              </React.Fragment>
            ))}
            <button onClick={dismissAll}><Check size={16}/> Dismiss</button>
          </div>
          <button onClick={dismissAll} style={{background:"transparent",border:"1px solid #fff",position:"absolute",top:16,right:16}}><X size={20}/></button>
        </div>
      )}
    </AlarmContext.Provider>
  );
}
