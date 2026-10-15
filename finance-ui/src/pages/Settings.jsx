import React from "react";
import { exportLocalBackup } from "../services/localData";
import { remindersApi } from "../services/api";
import { disablePush, enablePush, isPushEnabled } from "../services/pushClient";

export default function Settings() {
  const [pushEnabled, setPushEnabled] = React.useState(isPushEnabled);
  const [pushBusy, setPushBusy] = React.useState(false);
  const [pushMessage, setPushMessage] = React.useState("");
  const [pushMessageType, setPushMessageType] = React.useState("success");
  const togglePush = async () => {
    setPushBusy(true);
    setPushMessage("");
    try {
      if (pushEnabled) {
        await disablePush();
        setPushEnabled(false);
        setPushMessageType("success");
        setPushMessage("Background reminder notifications are disabled on this device.");
      } else {
        const result = await remindersApi.list(true);
        await enablePush(result.data || []);
        setPushEnabled(true);
        setPushMessageType("success");
        setPushMessage("Background alerts are enabled for this device.");
      }
    } catch (error) {
      setPushMessageType("error");
      setPushMessage(error.message || "Could not configure background notifications.");
    } finally {
      setPushBusy(false);
    }
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
        <p>Receive reminder alerts when this app is minimized or closed. Install the app on each device and enable notifications separately on that device.</p>
        <button onClick={togglePush} disabled={pushBusy}>{pushBusy ? "Please wait…" : pushEnabled ? "Disable background alerts" : "Enable background alerts"}</button>
        {pushMessage && <p role="status" style={{marginTop:8,padding:10,borderRadius:6,color:pushMessageType==="error"?"#b91c1c":"#166534",background:pushMessageType==="error"?"#fee2e2":"#dcfce7"}}>{pushMessage}</p>}
        <p style={{color:"var(--muted)",fontSize:".9rem",marginTop:8}}>
          While the app is open, its alarm screen is used. When it is closed, your device shows a notification; tap it to open the reminder. Delivery needs internet access and can be delayed by browser or device power settings.
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
