import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, Receipt, Plus, Download } from "lucide-react";
import { money, displayDate as isoDate, formatKolkataDateTime } from "../utils/format";
import { reportsApi, expensesApi, remindersApi } from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";

const COLORS = ["#2563eb","#16a34a","#dc2626","#f59e0b","#7c3aed","#0891b2","#9ca3af"];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [s, e, c, m, r] = await Promise.all([
          reportsApi.summary(),
          expensesApi.list({ page:1, pageSize:5, sortBy:"paymentDate", sortDir:"desc" }),
          reportsApi.categories(),
          reportsApi.monthly(new Date().getFullYear()),
          remindersApi.list(false),
        ]);
        setSummary(s.data);
        setRecent(e.data.items || []);
        setCategories(c.data || []);
        setMonthly((m.data || []).map(x => ({ name: new Date(2020, x.month-1).toLocaleString("default",{month:"short"}), income: x.income, expenses: x.expenses })));
        setReminders((r.data || []).filter(x=>x.isEnabled).sort((a,b)=> new Date(a.nextOccurrence)-new Date(b.nextOccurrence)).slice(0,5));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(()=>{});
    setInstallEvent(null);
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  return (
    <div>
      {installEvent && (
        <div className="install-banner">
          <div><strong>Install the app</strong> for quick access and offline use.</div>
          <button onClick={installApp}><Download size={16}/> Install</button>
        </div>
      )}
      <h2>Dashboard</h2>
      <div className="card-grid">
        <div className="card stat"><div><div className="muted">Total Income</div><div className="value income">{money(summary?.totalIncome)}</div></div><TrendingUp color="#16a34a"/></div>
        <div className="card stat"><div><div className="muted">Total Expenses</div><div className="value expense">{money(summary?.totalExpenses)}</div></div><TrendingDown color="#dc2626"/></div>
        <div className="card stat"><div><div className="muted">Net Balance</div><div className={`value ${summary?.netBalance>=0?"income":"expense"}`}>{money(summary?.netBalance)}</div></div><Wallet/></div>
        <div className="card stat"><div><div className="muted">This Month Income</div><div className="value income">{money(summary?.currentMonthIncome)}</div></div></div>
        <div className="card stat"><div><div className="muted">This Month Expenses</div><div className="value expense">{money(summary?.currentMonthExpenses)}</div></div></div>
      </div>

      <div className="toolbar">
        <Link to="/expenses"><button><Plus size={16}/> Add Expense</button></Link>
        <Link to="/income"><button className="secondary"><Plus size={16}/> Add Income</button></Link>
        <Link to="/reminders"><button className="secondary"><Plus size={16}/> Create Reminder</button></Link>
      </div>

      <div className="card-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div className="card">
          <h3>Category Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categories} dataKey="total" nameKey="category" outerRadius={90}>
                {categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v)=>money(v)}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Monthly Income vs Expense</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <XAxis dataKey="name"/><YAxis/><Tooltip formatter={(v)=>money(v)}/><Legend/>
              <Bar dataKey="income" fill="#16a34a"/><Bar dataKey="expenses" fill="#dc2626"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div className="card">
          <h3>Recent Transactions</h3>
          {recent.length===0 ? <div className="empty">No expenses yet.</div> : (
            <table><thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead>
            <tbody>{recent.map(e=>(
              <tr key={e.id}><td>{isoDate(e.paymentDate)}</td><td>{e.categoryName}</td><td className="expense">{money(e.amount)}</td></tr>
            ))}</tbody></table>
          )}
        </div>
        <div className="card">
          <h3>Upcoming Reminders</h3>
          {reminders.length===0 ? <div className="empty">No active reminders.</div> : (
            <ul style={{listStyle:"none",padding:0}}>{reminders.map(r=>(
              <li key={r.id} style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <strong>{r.name}</strong> - {formatKolkataDateTime(r.nextOccurrence)}
              </li>
            ))}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
