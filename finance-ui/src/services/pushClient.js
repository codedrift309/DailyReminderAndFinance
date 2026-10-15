const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5139").replace(/\/$/, "");
const DEVICE_KEY = "personal-finance-push-device-v1";
const ENABLED_KEY = "personal-finance-push-enabled-v1";

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function decodeBase64Url(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Push service returned ${response.status}.`);
  }
  return response.status === 204 ? null : response.json();
}

function schedulePayload(reminder) {
  return {
    name: reminder.name,
    startDate: reminder.startDate,
    nextOccurrence: reminder.nextOccurrence,
    reminderTime: reminder.reminderTime || "09:00:00",
    recurrence: Number(reminder.recurrence || 0),
    recurrenceInterval: Number(reminder.recurrenceInterval || 1),
    endDate: reminder.endDate || null,
    isEnabled: reminder.isEnabled !== false,
  };
}

export function isPushEnabled() {
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export async function enablePush(reminders) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("This browser does not support installed-app push notifications. Try installing the app in Chrome or Edge.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in your browser settings to enable background alerts.");

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await request("/api/push/public-key");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });
  }

  const json = subscription.toJSON();
  await request(`/api/push/devices/${deviceId()}/subscription`, {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
  });
  localStorage.setItem(ENABLED_KEY, "true");
  try {
    await Promise.all(reminders.map(reminder => syncPushReminder(reminder)));
  } catch (error) {
    localStorage.removeItem(ENABLED_KEY);
    throw error;
  }
}

export async function disablePush() {
  const id = localStorage.getItem(DEVICE_KEY);
  if (id) await request(`/api/push/devices/${id}/subscription`, { method: "DELETE" });
  const registration = await navigator.serviceWorker?.ready;
  const subscription = await registration?.pushManager?.getSubscription();
  await subscription?.unsubscribe();
  localStorage.removeItem(ENABLED_KEY);
}

export async function syncPushReminder(reminder) {
  if (!isPushEnabled()) return;
  await request(`/api/push/devices/${deviceId()}/reminders/${reminder.id}`, {
    method: "PUT",
    body: JSON.stringify(schedulePayload(reminder)),
  });
}

export async function removePushReminder(reminderId) {
  if (!isPushEnabled()) return;
  await request(`/api/push/devices/${deviceId()}/reminders/${reminderId}`, { method: "DELETE" });
}
