import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X, Home, Receipt, Tags, Wallet, Bell, BarChart2, Settings } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/categories", label: "Expense Categories", icon: Tags },
  { to: "/income", label: "Income", icon: Wallet },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <h1>Finance Manager</h1>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20}/></button>
        </div>
        <nav>
          {NAV.map(n => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.to==="/"} onClick={() => setOpen(false)} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Icon size={18}/><span>{n.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={22}/></button>
          <span className="topbar-title">Personal Finance Management</span>
        </header>
        <main className="content"><Outlet/></main>
      </div>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}