import React, { useEffect, useState } from "react";
import { money, isoDate, displayDate, today, startOfMonth } from "../utils/format";
import { expensesApi, categoriesApi } from "../services/api";
import { Plus, Edit2, Trash2, Search } from "lucide-react";

const emptyForm = { categoryId: "", description: "", amount: "", paymentDate: today(), entryDate: today(), paymentMethod: "", notes: "" };

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", categoryId: "", paymentFrom: startOfMonth(), paymentTo: today(), minAmount: "", maxAmount: "", sortBy: "paymentDate", sortDir: "desc" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCats = async () => { const r = await categoriesApi.list(false); setCategories(r.data || []); };

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = {
        page: p, pageSize,
        sortBy: filters.sortBy, sortDir: filters.sortDir,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        paymentFrom: filters.paymentFrom || undefined,
        paymentTo: filters.paymentTo || undefined,
        minAmount: filters.minAmount || undefined,
        maxAmount: filters.maxAmount || undefined,
      };
      const r = await expensesApi.list(params);
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
      setPage(r.data.page || p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCats(); }, []);
  useEffect(() => { load(1); }, []); // initial

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (e) => {
    setEditing(e.id);
    setForm({
      categoryId: e.categoryId,
      description: e.description || "",
      amount: e.amount,
      paymentDate: isoDate(e.paymentDate),
      entryDate: isoDate(e.entryDate),
      paymentMethod: e.paymentMethod || "",
      notes: e.notes || "",
    });
    setShowModal(true);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const payload = {
      categoryId: Number(form.categoryId),
      description: form.description || null,
      amount: Number(form.amount),
      paymentDate: form.paymentDate,
      entryDate: form.entryDate || undefined,
      paymentMethod: form.paymentMethod || null,
      notes: form.notes || null,
    };
    try {
      if (editing) await expensesApi.update(editing, payload);
      else await expensesApi.create(payload);
      setShowModal(false);
      load(page);
    } catch (e) { alert(e?.response?.data?.error || "Save failed"); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try { await expensesApi.remove(id); load(page); } catch (e) { alert("Delete failed"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2>Expenses</h2>
      <div className="toolbar">
        <button onClick={openNew}><Plus size={16}/> Add Expense</button>
        <input placeholder="Search" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} style={{maxWidth:180}}/>
        <select value={filters.categoryId} onChange={e=>setFilters({...filters,categoryId:e.target.value})} style={{maxWidth:180}}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={filters.paymentFrom} onChange={e=>setFilters({...filters,paymentFrom:e.target.value})} title="Payment from"/>
        <input type="date" value={filters.paymentTo} onChange={e=>setFilters({...filters,paymentTo:e.target.value})} title="Payment to"/>
        <input type="number" placeholder="Min" value={filters.minAmount} onChange={e=>setFilters({...filters,minAmount:e.target.value})} style={{maxWidth:90}}/>
        <input type="number" placeholder="Max" value={filters.maxAmount} onChange={e=>setFilters({...filters,maxAmount:e.target.value})} style={{maxWidth:90}}/>
        <select value={filters.sortBy} onChange={e=>setFilters({...filters,sortBy:e.target.value})}>
          <option value="paymentDate">Payment Date</option>
          <option value="entryDate">Entry Date</option>
          <option value="amount">Amount</option>
        </select>
        <select value={filters.sortDir} onChange={e=>setFilters({...filters,sortDir:e.target.value})}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button onClick={()=>load(1)}><Search size={16}/> Apply</button>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Payment Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length===0 && <tr><td colSpan="6" className="empty">No expenses found.</td></tr>}
              {items.map(e=>(
                <tr key={e.id}>
                  <td>{displayDate(e.paymentDate)}</td>
                  <td>{e.categoryName}</td>
                  <td>{e.description}</td>
                  <td className="expense">{money(e.amount)}</td>
                  <td>{e.paymentMethod}</td>
                  <td className="actions">
                    <button className="secondary" onClick={()=>openEdit(e)}><Edit2 size={14}/></button>
                    <button className="danger" onClick={()=>remove(e.id)}><Trash2 size={14}/></button>
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
            <h3>{editing ? "Edit Expense" : "Add Expense"}</h3>
            <form onSubmit={submit} className="form-grid">
              <div><label>Category *</label>
                <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} required>
                  <option value="">Select</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label>Amount *</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></div>
              <div><label>Payment Date *</label><input type="date" value={form.paymentDate} onChange={e=>setForm({...form,paymentDate:e.target.value})} required/></div>
              <div><label>Entry Date</label><input type="date" value={form.entryDate} onChange={e=>setForm({...form,entryDate:e.target.value})}/></div>
              <div className="full"><label>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label>Payment Method</label><input value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}/></div>
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