import React, { useEffect, useState } from "react";
import { money, today, startOfMonth } from "../utils/format";
import { reportsApi } from "../services/api";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#dc2626","#f59e0b","#7c3aed","#0891b2","#9ca3af"];

export default function Reports() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [year, setYear] = useState(new Date().getFullYear());
  const [granularity, setGranularity] = useState("monthly");
  const [summary, setSummary] = useState(null);
  const [cats, setCats] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [trend, setTrend] = useState([]);
  const [ive, setIve] = useState(null);

  const load = async () => {
    try {
      const params = { from: from || undefined, to: to || undefined };
      const [s, c, m, t, i] = await Promise.all([
        reportsApi.summary(params),
        reportsApi.categories(params),
        reportsApi.monthly(year),
        reportsApi.expenses({ ...params, granularity }),
        reportsApi.incomeVsExpense(params),
      ]);
      setSummary(s.data);
      setCats(c.data || []);
      setMonthly((m.data || []).map(x=>({name:new Date(2020,x.month-1).toLocaleString("default",{month:"short"}), income:x.income, expenses:x.expenses})));
      setTrend(t.data.trend || []);
      setIve(i.data);
    } catch (e) { console.error(e); }
  };
  useEffect(()=>{ load(); },[]);

  const download = async (type) => {
    try {
      const res = await reportsApi.export(type, { from: from || undefined, to: to || undefined });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${type}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Export failed"); }
  };

  return (
    <div>
      <h2>Reports</h2>
      <div className="toolbar">
        <label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <label>Year <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{maxWidth:90}}/></label>
        <select value={granularity} onChange={e=>setGranularity(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <button onClick={load}>Apply</button>
        <button className="secondary" onClick={()=>download("expenses")}><Download size={16}/> Export Expenses CSV</button>
        <button className="secondary" onClick={()=>download("income")}><Download size={16}/> Export Income CSV</button>
      </div>

      <div className="card-grid">
        <div className="card stat"><div><div className="muted">Income</div><div className="value income">{money(ive?.income ?? summary?.totalIncome)}</div></div></div>
        <div className="card stat"><div><div className="muted">Expenses</div><div className="value expense">{money(ive?.expenses ?? summary?.totalExpenses)}</div></div></div>
        <div className="card stat"><div><div className="muted">Net</div><div className={`value ${(ive?.net ?? summary?.netBalance)>=0?"income":"expense"}`}>{money(ive?.net ?? summary?.netBalance)}</div></div></div>
      </div>

      <div className="card-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div className="card">
          <h3>Category-wise Expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={cats} dataKey="total" nameKey="category" outerRadius={90}>
                {cats.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v)=>money(v)}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Income vs Expense by Month ({year})</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <XAxis dataKey="name"/><YAxis/><Tooltip formatter={(v)=>money(v)}/><Legend/>
              <Bar dataKey="income" fill="#16a34a"/><Bar dataKey="expenses" fill="#dc2626"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Expense Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <XAxis dataKey="label"/><YAxis/><Tooltip formatter={(v)=>money(v)}/>
            <Line type="monotone" dataKey="total" stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
