import React, { useEffect, useState } from "react";
import { money, isoDate, displayDate, today, startOfMonth } from "../utils/format";
import { incomesApi } from "../services/api";
import { Plus, Edit2, Trash2, Search } from "lucide-react";

const emptyForm = { incomeType: "Salary", description: "", amount: "", receivedDate: today(), entryDate: today(), notes: "" };

export default function Income() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [types, setTypes] = useState(["Salary","Rent Received","Borrow Return / Money Returned"]);
  const [filters, setFilters] = useState({ search: "", incomeType: "", receivedFrom: startOfMonth(), receivedTo: today(), minAmount: "", maxAmount: "", sortBy: "receivedDate", sortDir: "desc" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTypes = async () => { try { const r = await incomesApi.types(); setTypes(r.data || types); } catch {} };
  const load = async (p=page) => {
    setLoading(true);
    try {
      const params = {
        page: p, pageSize,
        sortBy: filters.sortBy, sortDir: filters.sortDir,
        search: filters.search || undefined,
        incomeType: filters.incomeType || undefined,
        receivedFrom: filters.receivedFrom || undefined,
        receivedTo: filters.receivedTo || undefined,
        minAmount: filters.minAmount || undefined,
        maxAmount: filters.maxAmount || undefined,
      };
      const r = await incomesApi.list(params);
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
      setPage(r.data.page || p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ loadTypes(); load(1); },[]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (i) => {
    setEditing(i.id);
    setForm({ incomeType: i.incomeType, description: i.description||"", amount: i.amount, receivedDate: isoDate(i.receivedDate), entryDate: isoDate(i.entryDate), notes: i.notes||"" });
    setShowModal(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      incomeType: form.incomeType.trim(),
      description: form.description || null,
      amount: Number(form.amount),
      receivedDate: form.receivedDate,
      entryDate: form.entryDate || undefined,
      notes: form.notes || null,
    };
    try {
      if (editing) await incomesApi.update(editing, payload); else await incomesApi.create(payload);
      setShowModal(false); load(page);
    } catch (e) { alert(e?.response?.data?.error || "Save failed"); }
  };
  const remove = async (id) => { if(!confirm("Delete this income?")) return; try { await incomesApi.remove(id); load(page);}catch{alert("Delete failed");} };

  const totalPages = Math.max(1, Math.ceil(total/pageSize));
  return (
    <div>
      <h2>Income</h2>
      <div className="toolbar">
        <button onClick={openNew}><Plus size={16}/> Add Income</button>
        <input placeholder="Search" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} style={{maxWidth:180}}/>
        <select value={filters.incomeType} onChange={e=>setFilters({...filters,incomeType:e.target.value})} style={{maxWidth:180}}>
          <option value="">All Types</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={filters.receivedFrom} onChange={e=>setFilters({...filters,receivedFrom:e.target.value})} title="Received from"/>
        <input type="date" value={filters.receivedTo} onChange={e=>setFilters({...filters,receivedTo:e.target.value})} title="Received to"/>
        <input type="number" placeholder="Min" value={filters.minAmount} onChange={e=>setFilters({...filters,minAmount:e.target.value})} style={{maxWidth:90}}/>
        <input type="number" placeholder="Max" value={filters.maxAmount} onChange={e=>setFilters({...filters,maxAmount:e.target.value})} style={{maxWidth:90}}/>
        <select value={filters.sortBy} onChange={e=>setFilters({...filters,sortBy:e.target.value})}>
          <option value="receivedDate">Received Date</option>
          <option value="entryDate">Entry Date</option>
          <option value="amount">Amount</option>
        </select>
        <select value={filters.sortDir} onChange={e=>setFilters({...filters,sortDir:e.target.value})}>
          <option value="desc">Desc</option><option value="asc">Asc</option>
        </select>
        <button onClick={()=>load(1)}><Search size={16}/> Apply</button>
      </div>
      {loading ? <div className="loading">Loading...</div> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Received Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length===0 && <tr><td colSpan="5" className="empty">No income found.</td></tr>}
              {items.map(i=>(
                <tr key={i.id}>
                  <td>{displayDate(i.receivedDate)}</td>
                  <td>{i.incomeType}</td>
                  <td>{i.description}</td>
                  <td className="income">{money(i.amount)}</td>
                  <td className="actions">
                    <button className="secondary" onClick={()=>openEdit(i)}><Edit2 size={14}/></button>
                    <button className="danger" onClick={()=>remove(i.id)}><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8}}>
            <span>Total: {total}</span>
            <div style={{display:"flex",gap:8}}>
              <button className="secondary" disabled={page<=1} onClick={()=>{const p=page-1; load(p);}}>Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="secondary" disabled={page>=totalPages} onClick={()=>{const p=page+1; load(p);}}>Next</button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{editing?"Edit Income":"Add Income"}</h3>
            <form onSubmit={submit} className="form-grid">
              <div className="full"><label>Income Type *</label>
                <input list="incomeTypes" value={form.incomeType} onChange={e=>setForm({...form,incomeType:e.target.value})} required/>
                <datalist id="incomeTypes">{types.map(t=><option key={t} value={t}/>)}</datalist>
              </div>
              <div><label>Amount *</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></div>
              <div><label>Received Date *</label><input type="date" value={form.receivedDate} onChange={e=>setForm({...form,receivedDate:e.target.value})} required/></div>
              <div><label>Entry Date</label><input type="date" value={form.entryDate} onChange={e=>setForm({...form,entryDate:e.target.value})}/></div>
              <div className="full"><label>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div className="full"><label>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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