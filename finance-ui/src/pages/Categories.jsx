import React, { useEffect, useState } from "react";
import { categoriesApi } from "../services/api";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form, setForm] = useState({ name: "", isActive: true });
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const r = await categoriesApi.list(includeInactive);
      setItems(r.data || []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, [includeInactive]);

  const openNew = () => { setEditing(null); setForm({ name: "", isActive: true }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ name: c.name, isActive: c.isActive }); setShowModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await categoriesApi.update(editing, { name: form.name, isActive: form.isActive });
      else await categoriesApi.create({ name: form.name });
      setShowModal(false); load();
    } catch (err) { alert(err?.response?.data?.error || "Save failed"); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this category?")) return;
    try { await categoriesApi.remove(id); load(); } catch (err) { alert(err?.response?.data?.error || "Cannot delete"); }
  };

  return (
    <div>
      <h2>Expense Categories</h2>
      <div className="toolbar">
        <button onClick={openNew}><Plus size={16}/> Add Category</button>
        <label style={{display:"flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)} style={{width:"auto"}}/> Show inactive
        </label>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Default</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length===0 && <tr><td colSpan="4" className="empty">No categories.</td></tr>}
            {items.map(c=>(
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.isDefault ? "Yes" : "No"}</td>
                <td>{c.isActive ? "Active" : "Inactive"}</td>
                <td className="actions">
                  <button className="secondary" onClick={()=>openEdit(c)}><Edit2 size={14}/></button>
                  {!c.isDefault && <button className="danger" onClick={()=>remove(c.id)}><Trash2 size={14}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{editing ? "Edit Category" : "Add Category"}</h3>
            <form onSubmit={submit} className="form-grid">
              <div className="full"><label>Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
              {editing && (
                <div className="full"><label><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})} style={{width:"auto"}}/> Active</label></div>
              )}
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