import React, { useEffect, useState } from "react";
import { remindersApi } from "../services/api";
import { Bell, Plus, Edit2, Trash2, Check, Clock } from "lucide-react";
import { isoDate, today } from "../utils/format";

const REC = [
  {v:0,l:"Once"},{v:1,l:"Daily"},{v:2,l:"Monthly"},{v:3,l:"Yearly"},{v:4,l:"Every X Days"},{v:5,l:"Every X Months"}
];

const emptyForm = { name:"", description:"", startDate: today(), reminderTime:"09:00", recurrence:1, interval:"", endDate:"", isEnabled:true };

export default function Reminders() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await remindersApi.list(true); setItems(r.data || []); }
    catch(e){console.error(e);} finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  // Browser notifications polling
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(()=>{});
    }
    const poll = async () => {
      try {
        const r = await remindersApi.due();
        (r.data || []).forEach(async (rem) => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(rem.name, { body: rem.description || "Reminder due" });
          }
          await remindersApi.complete(rem.id).catch(()=>{});
        });
      } catch {}
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (r) => {
    setEditing(r.id);
    setForm({
      name: r.name, description: r.description||"",
      startDate: isoDate(r.startDate),
      reminderTime: (r.reminderTime||"09:00:00").slice(0,5),
      recurrence: r.recurrence,
      interval: r.recurrenceInterval || "",
      endDate: r.endDate ? isoDate(r.endDate) : "",
      isEnabled: r.isEnabled
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      startDate: form.startDate,
      reminderTime: form.reminderTime.length===5 ? form.reminderTime+":00" : form.reminderTime,
      recurrence: Number(form.recurrence),
      recurrenceInterval: (form.recurrence==4||form.recurrence==5) && form.interval ? Number(form.interval) : null,
      endDate: form.endDate || null,
      isEnabled: form.isEnabled,
    };
    try {
      if (editing) await remindersApi.update(editing, payload); else await remindersApi.create(payload);
      setShowModal(false); load();
    } catch (err) { alert(err?.response?.data?.error || "Save failed"); }
  };

  const remove = async (id) => { if(!confirm("Delete this reminder?")) return; try { await remindersApi.remove(id); load(); } catch { alert("Delete failed"); } };
  const complete = async (id) => { try { await remindersApi.complete(id); load(); } catch { alert("Failed"); } };
  const snooze = async (id) => {
    const m = prompt("Snooze for how many minutes?", "10");
    if (!m) return;
    try { await remindersApi.snooze(id, Number(m)); load(); } catch { alert("Failed"); }
  };

  return (
    <div>
      <h2>Reminders</h2>
      <div className="toolbar">
        <button onClick={openNew}><Plus size={16}/> Create Reminder</button>
      </div>
      {loading ? <div className="loading">Loading...</div> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Next Occurrence</th><th>Recurrence</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length===0 && <tr><td colSpan="5" className="empty">No reminders.</td></tr>}
              {items.map(r=>(
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.nextOccurrence && r.nextOccurrence !== "9999-12-31T00:00:00" ? new Date(r.nextOccurrence).toLocaleString() : "Completed/Disabled"}</td>
                  <td>{REC.find(x=>x.v===r.recurrence)?.l}{r.recurrenceInterval?` (${r.recurrenceInterval})`:""}</td>
                  <td>{r.isEnabled ? "Enabled" : "Disabled"}</td>
                  <td className="actions">
                    <button className="secondary" onClick={()=>complete(r.id)} title="Complete"><Check size={14}/></button>
                    <button className="secondary" onClick={()=>snooze(r.id)} title="Snooze"><Clock size={14}/></button>
                    <button className="secondary" onClick={()=>openEdit(r)} title="Edit"><Edit2 size={14}/></button>
                    <button className="danger" onClick={()=>remove(r.id)} title="Delete"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{editing?"Edit Reminder":"Create Reminder"}</h3>
            <form onSubmit={submit} className="form-grid">
              <div className="full"><label>Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
              <div className="full"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label>Start Date *</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/></div>
              <div><label>Time *</label><input type="time" value={form.reminderTime} onChange={e=>setForm({...form,reminderTime:e.target.value})} required/></div>
              <div><label>Recurrence *</label>
                <select value={form.recurrence} onChange={e=>setForm({...form,recurrence:e.target.value})}>
                  {REC.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select></div>
              {(form.recurrence==4||form.recurrence==5) && (
                <div><label>Interval *</label><input type="number" min="1" value={form.interval} onChange={e=>setForm({...form,interval:e.target.value})} required/></div>
              )}
              <div><label>End Date (optional)</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              <div><label><input type="checkbox" checked={form.isEnabled} onChange={e=>setForm({...form,isEnabled:e.target.checked})} style={{width:"auto"}}/> Enabled</label></div>
              <div className="full" style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button type="button" className="secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}