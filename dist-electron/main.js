var Q = Object.defineProperty;
var X = (s, e, t) => e in s ? Q(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var w = (s, e, t) => X(s, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as a, screen as F, BrowserWindow as S, app as f, desktopCapturer as Z, shell as ee, dialog as O, nativeImage as te, Tray as re, Menu as se } from "electron";
import { fileURLToPath as A } from "node:url";
import i from "node:path";
import p from "node:fs/promises";
const I = i.dirname(A(import.meta.url)), oe = i.join(I, ".."), g = process.env.VITE_DEV_SERVER_URL, R = i.join(oe, "dist");
let v = null, y = null;
a.on("hud-overlay-hide", () => {
  v && !v.isDestroyed() && v.minimize();
});
function ne() {
  const s = F.getPrimaryDisplay(), { workArea: e } = s, t = 500, o = 100, c = Math.floor(e.x + (e.width - t) / 2), h = Math.floor(e.y + e.height - o - 5), r = new S({
    width: t,
    height: o,
    minWidth: 500,
    maxWidth: 500,
    minHeight: 100,
    maxHeight: 100,
    x: c,
    y: h,
    frame: !1,
    transparent: !0,
    resizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    hasShadow: !1,
    webPreferences: {
      preload: i.join(I, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return r.webContents.on("did-finish-load", () => {
    r == null || r.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), v = r, r.on("closed", () => {
    v === r && (v = null);
  }), g ? r.loadURL(g + "?windowType=hud-overlay") : r.loadFile(i.join(R, "index.html"), {
    query: { windowType: "hud-overlay" }
  }), r;
}
function ae() {
  const s = process.platform === "darwin", e = new S({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...s && {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 12, y: 12 }
    },
    transparent: !1,
    resizable: !0,
    alwaysOnTop: !1,
    skipTaskbar: !1,
    title: "OpenScreen",
    backgroundColor: "#000000",
    webPreferences: {
      preload: i.join(I, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1,
      backgroundThrottling: !1
    }
  });
  return e.maximize(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), g ? e.loadURL(g + "?windowType=editor") : e.loadFile(i.join(R, "index.html"), {
    query: { windowType: "editor" }
  }), e;
}
function ie() {
  const { width: s, height: e } = F.getPrimaryDisplay().workAreaSize, t = new S({
    width: 620,
    height: 420,
    minHeight: 350,
    maxHeight: 500,
    x: Math.round((s - 620) / 2),
    y: Math.round((e - 420) / 2),
    frame: !1,
    resizable: !1,
    alwaysOnTop: !0,
    transparent: !0,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: i.join(I, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  return g ? t.loadURL(g + "?windowType=source-selector") : t.loadFile(i.join(R, "index.html"), {
    query: { windowType: "source-selector" }
  }), t;
}
function le(s) {
  F.getAllDisplays();
  const e = F.getPrimaryDisplay(), { bounds: t } = e, o = 400, c = 100, h = Math.floor(t.x + (t.width - o) / 2), r = Math.floor(t.y + t.height - c - 50), n = new S({
    width: o,
    height: c,
    x: h,
    y: r,
    frame: !1,
    // 2.1: No window frame
    transparent: !0,
    // 2.1: Transparent background
    resizable: !1,
    alwaysOnTop: !0,
    // 2.2: Always on top
    skipTaskbar: !0,
    // 2.4: Excluded from taskbar
    hasShadow: !1,
    focusable: !1,
    // Don't steal focus
    webPreferences: {
      preload: i.join(I, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return n.setIgnoreMouseEvents(!0), g ? n.loadURL(g + "?windowType=keystroke-overlay") : n.loadFile(i.join(R, "index.html"), {
    query: { windowType: "keystroke-overlay" }
  }), y = n, n.on("closed", () => {
    y === n && (y = null);
  }), n;
}
function ce() {
  return y;
}
function ue() {
  y && !y.isDestroyed() && y.hide();
}
function de() {
  y && !y.isDestroyed() && y.show();
}
const fe = "presets.json", he = 1;
function W() {
  return i.join(f.getPath("userData"), fe);
}
function x() {
  return {
    version: he,
    defaultPresetId: null,
    presets: []
  };
}
async function E() {
  try {
    const s = W(), e = await p.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.presets || !Array.isArray(t.presets) ? (console.warn("Invalid presets file, creating new store"), x()) : t;
  } catch (s) {
    if (s.code === "ENOENT")
      return x();
    console.error("Failed to read presets file:", s);
    try {
      const e = W(), t = e + ".backup." + Date.now();
      await p.rename(e, t), console.log("Backed up corrupt presets file to:", t);
    } catch {
    }
    return x();
  }
}
async function D(s) {
  const e = W();
  await p.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function pe() {
  try {
    const s = await E();
    return {
      success: !0,
      presets: s.presets,
      defaultPresetId: s.defaultPresetId
    };
  } catch (s) {
    return console.error("Failed to get presets:", s), {
      success: !1,
      presets: [],
      defaultPresetId: null
    };
  }
}
async function ye(s) {
  try {
    const e = await E(), t = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    return t.isDefault && (e.presets = e.presets.map((o) => ({ ...o, isDefault: !1 })), e.defaultPresetId = t.id), e.presets.push(t), await D(e), { success: !0, preset: t };
  } catch (e) {
    return console.error("Failed to save preset:", e), { success: !1, error: String(e) };
  }
}
async function ge(s, e) {
  try {
    const t = await E(), o = t.presets.findIndex((c) => c.id === s);
    return o === -1 ? { success: !1, error: "Preset not found" } : (e.isDefault === !0 ? (t.presets = t.presets.map((c) => ({ ...c, isDefault: !1 })), t.defaultPresetId = s) : e.isDefault === !1 && t.defaultPresetId === s && (t.defaultPresetId = null), t.presets[o] = { ...t.presets[o], ...e }, await D(t), { success: !0, preset: t.presets[o] });
  } catch (t) {
    return console.error("Failed to update preset:", t), { success: !1, error: String(t) };
  }
}
async function we(s) {
  try {
    const e = await E(), t = e.presets.findIndex((o) => o.id === s);
    return t === -1 ? { success: !1, error: "Preset not found" } : (e.defaultPresetId === s && (e.defaultPresetId = null), e.presets.splice(t, 1), await D(e), { success: !0 });
  } catch (e) {
    return console.error("Failed to delete preset:", e), { success: !1, error: String(e) };
  }
}
async function ke(s) {
  try {
    const e = await E(), t = e.presets.find((c) => c.id === s);
    if (!t)
      return { success: !1, error: "Preset not found" };
    const o = {
      ...t,
      id: crypto.randomUUID(),
      name: `Copy of ${t.name}`,
      createdAt: Date.now(),
      isDefault: !1
      // Duplicates should never be default
    };
    return e.presets.push(o), await D(e), { success: !0, preset: o };
  } catch (e) {
    return console.error("Failed to duplicate preset:", e), { success: !1, error: String(e) };
  }
}
async function me(s) {
  try {
    const e = await E();
    if (e.presets = e.presets.map((t) => ({ ...t, isDefault: !1 })), e.defaultPresetId = null, s) {
      const t = e.presets.find((o) => o.id === s);
      if (!t)
        return { success: !1, error: "Preset not found" };
      t.isDefault = !0, e.defaultPresetId = s;
    }
    return await D(e), { success: !0 };
  } catch (e) {
    return console.error("Failed to set default preset:", e), { success: !1, error: String(e) };
  }
}
let C = null;
async function ve() {
  if (!C)
    try {
      C = await import("./index-CB8lGVYZ.js").then((s) => s.i);
    } catch (s) {
      throw console.error("[KeystrokeService] Failed to load uiohook-napi:", s), s;
    }
  return C;
}
class Ee {
  constructor() {
    w(this, "running", !1);
    w(this, "eventCallback", null);
    w(this, "errorCallback", null);
    w(this, "keydownHandler", null);
    w(this, "clickHandler", null);
    w(this, "uiohook", null);
  }
  /**
   * Start the keystroke capture service
   * Initializes uiohook and begins listening for keyboard and mouse events
   * 
   * Requirements:
   * - 6.7: Logs error and notifies user if initialization fails
   * - 10.1: Emits error event so UI can disable toggle and show error message
   * 
   * @throws Error if uiohook fails to initialize
   */
  async start() {
    if (!this.running)
      try {
        this.uiohook = await ve(), this.setupEventHandlers(), this.uiohook.uIOhook.start(), this.running = !0;
      } catch (e) {
        this.running = !1, this.removeEventHandlers();
        const t = this.createServiceError(e);
        throw console.error("[KeystrokeService] Failed to initialize uiohook:", {
          code: t.code,
          message: t.message,
          originalError: e instanceof Error ? e.stack : e
        }), this.emitError(t), e;
      }
  }
  /**
   * Create a structured error object from a caught error
   * 
   * @param error The caught error
   * @returns Structured KeystrokeServiceError
   */
  createServiceError(e) {
    const t = e instanceof Error ? e : void 0, o = e instanceof Error ? e.message : String(e);
    return o.includes("Cannot find module") || o.includes("not found") || o.includes("failed to load") || o.includes("ENOENT") || o.includes("MODULE_NOT_FOUND") ? {
      code: "LIBRARY_LOAD_FAILED",
      message: "Failed to load uiohook native library. The keystroke overlay feature is unavailable.",
      originalError: t
    } : o.includes("init") || o.includes("start") || o.includes("permission") || o.includes("access") ? {
      code: "INIT_FAILED",
      message: "Failed to initialize keystroke capture. Please check system permissions.",
      originalError: t
    } : {
      code: "UNKNOWN",
      message: `Keystroke capture failed: ${o}`,
      originalError: t
    };
  }
  /**
   * Emit an error to the registered error callback
   * 
   * @param error The error to emit
   */
  emitError(e) {
    this.errorCallback && this.errorCallback(e);
  }
  /**
   * Stop the keystroke capture service
   * Cleans up uiohook listener and removes event handlers
   */
  stop() {
    if (this.running)
      try {
        this.uiohook && this.uiohook.uIOhook.stop(), this.removeEventHandlers(), this.running = !1;
      } catch (e) {
        this.running = !1, console.error("Error stopping keystroke service:", e);
      }
  }
  /**
   * Check if the service is currently running
   * 
   * @returns true if the service is capturing events, false otherwise
   */
  isRunning() {
    return this.running;
  }
  /**
   * Register a callback to receive input events
   * Only one callback can be registered at a time
   * 
   * @param callback Function to call when an input event is captured
   */
  onEvent(e) {
    this.eventCallback = e;
  }
  /**
   * Register a callback to receive error notifications
   * Only one callback can be registered at a time
   * 
   * Requirements:
   * - 6.7: Enables notification to user on initialization failure
   * - 10.1: Enables UI to disable toggle and show error message
   * 
   * @param callback Function to call when an error occurs
   */
  onError(e) {
    this.errorCallback = e;
  }
  /**
   * Remove the registered event callback
   */
  removeEventListener() {
    this.eventCallback = null;
  }
  /**
   * Remove the registered error callback
   */
  removeErrorListener() {
    this.errorCallback = null;
  }
  /**
   * Setup uiohook event handlers for keyboard and mouse events
   * Event handling logic will be implemented in tasks 2.2 and 2.3
   */
  setupEventHandlers() {
    if (!this.uiohook)
      throw new Error("uiohook module not loaded");
    const { uIOhook: e } = this.uiohook;
    this.keydownHandler = (t) => {
      if (this.eventCallback) {
        const o = {
          type: "keystroke",
          timestamp: Date.now(),
          key: String(t.keycode),
          // Use keycode as string for now; proper mapping in task 6
          keyCode: t.keycode,
          modifiers: {
            ctrl: t.ctrlKey ?? !1,
            alt: t.altKey ?? !1,
            shift: t.shiftKey ?? !1,
            meta: t.metaKey ?? !1
          }
        };
        this.eventCallback(o);
      }
    }, this.clickHandler = (t) => {
      if (this.eventCallback) {
        const c = {
          1: "left",
          2: "right",
          3: "middle"
        }[t.button];
        if (c) {
          const h = {
            type: "mouse",
            timestamp: Date.now(),
            button: c,
            modifiers: {
              ctrl: t.ctrlKey ?? !1,
              alt: t.altKey ?? !1,
              shift: t.shiftKey ?? !1,
              meta: t.metaKey ?? !1
            }
          };
          this.eventCallback(h);
        }
      }
    }, e.on("keydown", this.keydownHandler), e.on("click", this.clickHandler);
  }
  /**
   * Remove uiohook event handlers
   */
  removeEventHandlers() {
    if (!this.uiohook)
      return;
    const { uIOhook: e } = this.uiohook;
    this.keydownHandler && (e.off("keydown", this.keydownHandler), this.keydownHandler = null), this.clickHandler && (e.off("click", this.clickHandler), this.clickHandler = null);
  }
}
const j = new Ee(), H = {
  enabled: !1,
  position: "bottom-center",
  fadeDurationMs: 1500,
  fadeDelayMs: 1e3,
  groupingThresholdMs: 100,
  showMouseClicks: !0,
  textScale: 1
}, Pe = "keystroke-settings.json", z = 1;
function L() {
  return i.join(f.getPath("userData"), Pe);
}
function N() {
  return {
    version: z,
    settings: { ...H }
  };
}
async function B() {
  try {
    const s = L(), e = await p.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.settings || typeof t.settings != "object" ? (console.warn("Invalid keystroke settings file, creating new store"), N()) : {
      version: t.version || z,
      settings: { ...H, ...t.settings }
    };
  } catch (s) {
    if (s.code === "ENOENT")
      return N();
    console.error("Failed to read keystroke settings file:", s);
    try {
      const e = L(), t = e + ".backup." + Date.now();
      await p.rename(e, t), console.log("Backed up corrupt keystroke settings file to:", t);
    } catch {
    }
    return N();
  }
}
async function Se(s) {
  const e = L();
  await p.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function Ie() {
  try {
    return {
      success: !0,
      settings: (await B()).settings
    };
  } catch (s) {
    return console.error("Failed to get keystroke settings:", s), {
      success: !1,
      settings: { ...H }
    };
  }
}
async function De(s) {
  try {
    const e = await B();
    return e.settings = { ...e.settings, ...s }, await Se(e), { success: !0, settings: e.settings };
  } catch (e) {
    return console.error("Failed to save keystroke settings:", e), { success: !1, error: String(e) };
  }
}
let _ = null;
function be(s, e, t, o, c) {
  a.handle("get-sources", async (r, n) => (await Z.getSources(n)).map((l) => ({
    id: l.id,
    name: l.name,
    display_id: l.display_id,
    thumbnail: l.thumbnail ? l.thumbnail.toDataURL() : null,
    appIcon: l.appIcon ? l.appIcon.toDataURL() : null
  }))), a.handle("select-source", (r, n) => {
    _ = n;
    const u = o();
    return u && u.close(), _;
  }), a.handle("get-selected-source", () => _), a.handle("open-source-selector", () => {
    const r = o();
    if (r) {
      r.focus();
      return;
    }
    e();
  }), a.handle("switch-to-editor", () => {
    const r = t();
    r && r.close(), s();
  }), a.handle("store-recorded-video", async (r, n, u) => {
    try {
      const l = i.join(k, u);
      return await p.writeFile(l, Buffer.from(n)), h = l, {
        success: !0,
        path: l,
        message: "Video stored successfully"
      };
    } catch (l) {
      return console.error("Failed to store video:", l), {
        success: !1,
        message: "Failed to store video",
        error: String(l)
      };
    }
  }), a.handle("get-recorded-video-path", async () => {
    try {
      const n = (await p.readdir(k)).filter((b) => b.endsWith(".webm"));
      if (n.length === 0)
        return { success: !1, message: "No recorded video found" };
      const u = n.sort().reverse()[0];
      return { success: !0, path: i.join(k, u) };
    } catch (r) {
      return console.error("Failed to get video path:", r), { success: !1, message: "Failed to get video path", error: String(r) };
    }
  }), a.handle("set-recording-state", (r, n) => {
    c && c(n, (_ || { name: "Screen" }).name);
  }), a.handle("open-external-url", async (r, n) => {
    try {
      return await ee.openExternal(n), { success: !0 };
    } catch (u) {
      return console.error("Failed to open URL:", u), { success: !1, error: String(u) };
    }
  }), a.handle("get-asset-base-path", () => {
    try {
      return f.isPackaged ? i.join(process.resourcesPath, "assets") : i.join(f.getAppPath(), "public", "assets");
    } catch (r) {
      return console.error("Failed to resolve asset base path:", r), null;
    }
  }), a.handle("save-exported-video", async (r, n, u) => {
    try {
      const l = t(), b = u.toLowerCase().endsWith(".gif"), Y = b ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }], M = {
        title: b ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: i.join(f.getPath("downloads"), u),
        filters: Y,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      }, T = l ? await O.showSaveDialog(l, M) : await O.showSaveDialog(M);
      return T.canceled || !T.filePath ? {
        success: !1,
        cancelled: !0,
        message: "Export cancelled"
      } : (await p.writeFile(T.filePath, Buffer.from(n)), {
        success: !0,
        path: T.filePath,
        message: "Video exported successfully"
      });
    } catch (l) {
      return console.error("Failed to save exported video:", l), {
        success: !1,
        message: "Failed to save exported video",
        error: String(l)
      };
    }
  }), a.handle("open-video-file-picker", async () => {
    try {
      const r = await O.showOpenDialog({
        title: "Select Video File",
        defaultPath: k,
        filters: [
          { name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      return r.canceled || r.filePaths.length === 0 ? { success: !1, cancelled: !0 } : {
        success: !0,
        path: r.filePaths[0]
      };
    } catch (r) {
      return console.error("Failed to open file picker:", r), {
        success: !1,
        message: "Failed to open file picker",
        error: String(r)
      };
    }
  });
  let h = null;
  a.handle("set-current-video-path", (r, n) => (h = n, { success: !0 })), a.handle("get-current-video-path", () => h ? { success: !0, path: h } : { success: !1 }), a.handle("clear-current-video-path", () => (h = null, { success: !0 })), a.handle("get-platform", () => process.platform), a.handle("presets:get", async () => await pe()), a.handle("presets:save", async (r, n) => await ye(n)), a.handle("presets:update", async (r, n, u) => await ge(n, u)), a.handle("presets:delete", async (r, n) => await we(n)), a.handle("presets:duplicate", async (r, n) => await ke(n)), a.handle("presets:setDefault", async (r, n) => await me(n)), a.handle("keystroke:start", async () => {
    try {
      return await j.start(), { success: !0 };
    } catch (r) {
      return console.error("Failed to start keystroke service:", r), {
        success: !1,
        error: r instanceof Error ? r.message : String(r)
      };
    }
  }), a.handle("keystroke:stop", () => {
    try {
      return j.stop(), { success: !0 };
    } catch (r) {
      return console.error("Failed to stop keystroke service:", r), {
        success: !1,
        error: r instanceof Error ? r.message : String(r)
      };
    }
  }), a.handle("keystroke:get-settings", async () => await Ie()), a.handle("keystroke:set-settings", async (r, n) => await De(n)), a.handle("keystroke:show-overlay", async () => {
    try {
      let r = ce();
      return !r || r.isDestroyed() ? (r = le(), j.onEvent((n) => {
        r && !r.isDestroyed() && r.webContents.send("keystroke:event", n);
      })) : de(), { success: !0 };
    } catch (r) {
      return console.error("Failed to show keystroke overlay:", r), {
        success: !1,
        error: r instanceof Error ? r.message : String(r)
      };
    }
  }), a.handle("keystroke:hide-overlay", async () => {
    try {
      return ue(), { success: !0 };
    } catch (r) {
      return console.error("Failed to hide keystroke overlay:", r), {
        success: !1,
        error: r instanceof Error ? r.message : String(r)
      };
    }
  });
}
const Te = i.dirname(A(import.meta.url)), k = i.join(f.getPath("userData"), "recordings");
async function _e() {
  try {
    await p.mkdir(k, { recursive: !0 }), console.log("RECORDINGS_DIR:", k), console.log("User Data Path:", f.getPath("userData"));
  } catch (s) {
    console.error("Failed to create recordings directory:", s);
  }
}
process.env.APP_ROOT = i.join(Te, "..");
const Fe = process.env.VITE_DEV_SERVER_URL, He = i.join(process.env.APP_ROOT, "dist-electron"), q = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Fe ? i.join(process.env.APP_ROOT, "public") : q;
let d = null, P = null, m = null, G = "";
const $ = J("openscreen.png"), Re = J("rec-button.png");
function K() {
  d = ne();
}
function U() {
  m = new re($);
}
function J(s) {
  return te.createFromPath(i.join(process.env.VITE_PUBLIC || q, s)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function V(s = !1) {
  if (!m) return;
  const e = s ? Re : $, t = s ? `Recording: ${G}` : "OpenScreen", o = s ? [
    {
      label: "Stop Recording",
      click: () => {
        d && !d.isDestroyed() && d.webContents.send("stop-recording-from-tray");
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        d && !d.isDestroyed() ? d.isMinimized() && d.restore() : K();
      }
    },
    {
      label: "Quit",
      click: () => {
        f.quit();
      }
    }
  ];
  m.setImage(e), m.setToolTip(t), m.setContextMenu(se.buildFromTemplate(o));
}
function Oe() {
  d && (d.close(), d = null), d = ae();
}
function xe() {
  return P = ie(), P.on("closed", () => {
    P = null;
  }), P;
}
f.on("window-all-closed", () => {
});
f.on("activate", () => {
  S.getAllWindows().length === 0 && K();
});
f.whenReady().then(async () => {
  const { ipcMain: s } = await import("electron");
  s.on("hud-overlay-close", () => {
    f.quit();
  }), U(), V(), await _e(), be(
    Oe,
    xe,
    () => d,
    () => P,
    (e, t) => {
      G = t, m || U(), V(e), e || d && d.restore();
    }
  ), K();
});
export {
  He as MAIN_DIST,
  k as RECORDINGS_DIR,
  q as RENDERER_DIST,
  Fe as VITE_DEV_SERVER_URL
};
