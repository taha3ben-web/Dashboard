const INSTALLATION_KEY = "nova_browser_installation_id";
const DEVICE_KEY = "nova_browser_device_key";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function remember(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = randomId();
  window.localStorage.setItem(key, created);
  return created;
}

export function getBrowserDeviceContext() {
  if (typeof window === "undefined") {
    return { platform: "web", hardwareBacked: false };
  }
  return {
    platform: "web",
    deviceKey: remember(DEVICE_KEY),
    installationId: remember(INSTALLATION_KEY),
    hardwareBacked: false,
    deviceName: navigator.platform || "web",
    appVersion: navigator.userAgent.slice(0, 120),
  };
}
