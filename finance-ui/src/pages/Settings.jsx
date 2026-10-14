import React from "react";

export default function Settings() {
  const enableNotifications = async () => {
    if (!("Notification" in window)) { alert("Notifications not supported"); return; }
    const p = await Notification.requestPermission();
    alert("Permission: " + p);
  };
  return (
    <div>
      <h2>Settings</h2>
      <div className="card" style={{maxWidth:600}}>
        <h3>Notifications</h3>
        <p>Enable browser notifications for reminders.</p>
        <button onClick={enableNotifications}>Enable Notifications</button>
        <p style={{color:"var(--muted)",fontSize:".9rem",marginTop:8}}>
          Note: browser notifications work while the app/browser is open. When the browser or PWA is closed on this computer,
          the backend hosted scheduler still shows a Windows toast at the scheduled time, as long as the backend is running
          (optionally configure Windows Task Scheduler to start it automatically). Mobile background push requires a
          separate cloud push service and is not included in this local build.
        </p>
      </div>
      <div className="card" style={{maxWidth:600,marginTop:12}}>
        <h3>Currency</h3>
        <p>Default currency: Indian Rupee (INR, ₹). Monetary values use decimal-safe storage on the server.</p>
      </div>
      <div className="card" style={{maxWidth:600,marginTop:12}}>
        <h3>Data Backup</h3>
        <p>Database file: <code>finance.db</code> in the backend folder. Copy it while the app is stopped to back up.</p>
      </div>
    </div>
  );
}