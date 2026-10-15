import React from "react";
import { exportLocalBackup } from "../services/localData";

export default function Settings() {
  const enableNotifications = async () => {
    if (!("Notification" in window)) { alert("Notifications not supported"); return; }
    const p = await Notification.requestPermission();
    alert("Permission: " + p);
  };
  const downloadBackup = () => {
    const blob = new Blob([exportLocalBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personal-finance-device-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <h2>Settings</h2>
      <div className="card" style={{maxWidth:600}}>
        <h3>Notifications</h3>
        <p>Enable browser notifications for reminders.</p>
        <button onClick={enableNotifications}>Enable Notifications</button>
        <p style={{color:"var(--muted)",fontSize:".9rem",marginTop:8}}>
          Reminder alarms run while this app is open. Your browser may pause alarms if the app is in the background or the device is asleep.
        </p>
      </div>
      <div className="card" style={{maxWidth:600,marginTop:12}}>
        <h3>Currency</h3>
        <p>Default currency: Indian Rupee (INR, ₹).</p>
      </div>
      <div className="card" style={{maxWidth:600,marginTop:12}}>
        <h3>Data Backup</h3>
        <p>Finance data is stored in this device’s browser storage. It does not sync with your other devices. Clearing this site’s browser data can erase it, so download a backup regularly.</p>
        <button className="secondary" onClick={downloadBackup}>Download device backup</button>
      </div>
    </div>
  );
}
