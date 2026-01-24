var fs = Object.defineProperty;
var ds = (s, e, t) => e in s ? fs(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var v = (s, e, t) => ds(s, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as d, screen as be, BrowserWindow as he, app as D, desktopCapturer as ps, shell as ms, dialog as Be, nativeImage as gs, Tray as _s, Menu as ys } from "electron";
import { fileURLToPath as $t } from "node:url";
import m from "node:path";
import P from "node:fs/promises";
import { WritableStream as Wt } from "stream/web";
import ws from "events";
import Ss from "https";
import vs from "http";
import Es from "net";
import ks from "tls";
import nt from "crypto";
import ue, { Readable as bs } from "stream";
import Ts from "url";
import xs from "zlib";
import Os from "buffer";
import * as Xe from "fs";
import { createReadStream as Ps } from "fs";
import { spawn as Ds } from "child_process";
import * as jt from "path";
import * as Rs from "os";
import { createRequire as Is } from "module";
const Q = m.dirname($t(import.meta.url)), Ns = m.join(Q, ".."), $ = process.env.VITE_DEV_SERVER_URL, Re = m.join(Ns, "dist");
let X = null, N = null;
d.on("hud-overlay-hide", () => {
  X && !X.isDestroyed() && X.minimize();
});
function As() {
  const s = be.getPrimaryDisplay(), { workArea: e } = s, t = 500, r = 350, n = Math.floor(e.x + (e.width - t) / 2), i = Math.floor(e.y + e.height - r - 5), o = new he({
    width: t,
    height: r,
    minWidth: 580,
    maxWidth: 580,
    minHeight: 350,
    maxHeight: 350,
    x: n,
    y: i,
    frame: !1,
    transparent: !0,
    resizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    hasShadow: !1,
    webPreferences: {
      preload: m.join(Q, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), o.webContents.setWindowOpenHandler(({ url: a }) => a.includes("windowType=mic-settings") ? {
    action: "allow",
    overrideBrowserWindowOptions: {
      width: 340,
      height: 520,
      frame: !1,
      transparent: !0,
      resizable: !1,
      alwaysOnTop: !0,
      skipTaskbar: !0,
      parent: o,
      modal: !1,
      webPreferences: {
        preload: m.join(Q, "preload.mjs"),
        nodeIntegration: !1,
        contextIsolation: !0
      }
    }
  } : { action: "deny" }), X = o, o.on("closed", () => {
    X === o && (X = null);
  }), $ ? o.loadURL($ + "?windowType=hud-overlay") : o.loadFile(m.join(Re, "index.html"), {
    query: { windowType: "hud-overlay" }
  }), o;
}
function Ls() {
  const s = process.platform === "darwin", e = new he({
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
      preload: m.join(Q, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1,
      backgroundThrottling: !1
    }
  });
  return e.maximize(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), $ ? e.loadURL($ + "?windowType=editor") : e.loadFile(m.join(Re, "index.html"), {
    query: { windowType: "editor" }
  }), e;
}
function Us() {
  const { width: s, height: e } = be.getPrimaryDisplay().workAreaSize, t = new he({
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
      preload: m.join(Q, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  return $ ? t.loadURL($ + "?windowType=source-selector") : t.loadFile(m.join(Re, "index.html"), {
    query: { windowType: "source-selector" }
  }), t;
}
function Bs(s) {
  be.getAllDisplays();
  const e = be.getPrimaryDisplay(), { bounds: t } = e, r = 400, n = 100, i = Math.floor(t.x + (t.width - r) / 2), o = Math.floor(t.y + t.height - n - 50), a = new he({
    width: r,
    height: n,
    x: i,
    y: o,
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
      preload: m.join(Q, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return a.setIgnoreMouseEvents(!0), $ ? a.loadURL($ + "?windowType=keystroke-overlay") : a.loadFile(m.join(Re, "index.html"), {
    query: { windowType: "keystroke-overlay" }
  }), N = a, a.on("closed", () => {
    N === a && (N = null);
  }), a;
}
function Cs() {
  return N;
}
function Fs() {
  N && !N.isDestroyed() && N.hide();
}
function Ms() {
  N && !N.isDestroyed() && N.show();
}
const $s = "presets.json", Ws = 1;
function Ze() {
  return m.join(D.getPath("userData"), $s);
}
function Ce() {
  return {
    version: Ws,
    defaultPresetId: null,
    presets: []
  };
}
async function ee() {
  try {
    const s = Ze(), e = await P.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.presets || !Array.isArray(t.presets) ? (console.warn("Invalid presets file, creating new store"), Ce()) : t;
  } catch (s) {
    if (s.code === "ENOENT")
      return Ce();
    console.error("Failed to read presets file:", s);
    try {
      const e = Ze(), t = e + ".backup." + Date.now();
      await P.rename(e, t), console.log("Backed up corrupt presets file to:", t);
    } catch {
    }
    return Ce();
  }
}
async function fe(s) {
  const e = Ze();
  await P.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function js() {
  try {
    const s = await ee();
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
async function Vs(s) {
  try {
    const e = await ee(), t = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    return t.isDefault && (e.presets = e.presets.map((r) => ({ ...r, isDefault: !1 })), e.defaultPresetId = t.id), e.presets.push(t), await fe(e), { success: !0, preset: t };
  } catch (e) {
    return console.error("Failed to save preset:", e), { success: !1, error: String(e) };
  }
}
async function Gs(s, e) {
  try {
    const t = await ee(), r = t.presets.findIndex((n) => n.id === s);
    return r === -1 ? { success: !1, error: "Preset not found" } : (e.isDefault === !0 ? (t.presets = t.presets.map((n) => ({ ...n, isDefault: !1 })), t.defaultPresetId = s) : e.isDefault === !1 && t.defaultPresetId === s && (t.defaultPresetId = null), t.presets[r] = { ...t.presets[r], ...e }, await fe(t), { success: !0, preset: t.presets[r] });
  } catch (t) {
    return console.error("Failed to update preset:", t), { success: !1, error: String(t) };
  }
}
async function qs(s) {
  try {
    const e = await ee(), t = e.presets.findIndex((r) => r.id === s);
    return t === -1 ? { success: !1, error: "Preset not found" } : (e.defaultPresetId === s && (e.defaultPresetId = null), e.presets.splice(t, 1), await fe(e), { success: !0 });
  } catch (e) {
    return console.error("Failed to delete preset:", e), { success: !1, error: String(e) };
  }
}
async function Ks(s) {
  try {
    const e = await ee(), t = e.presets.find((n) => n.id === s);
    if (!t)
      return { success: !1, error: "Preset not found" };
    const r = {
      ...t,
      id: crypto.randomUUID(),
      name: `Copy of ${t.name}`,
      createdAt: Date.now(),
      isDefault: !1
      // Duplicates should never be default
    };
    return e.presets.push(r), await fe(e), { success: !0, preset: r };
  } catch (e) {
    return console.error("Failed to duplicate preset:", e), { success: !1, error: String(e) };
  }
}
async function Hs(s) {
  try {
    const e = await ee();
    if (e.presets = e.presets.map((t) => ({ ...t, isDefault: !1 })), e.defaultPresetId = null, s) {
      const t = e.presets.find((r) => r.id === s);
      if (!t)
        return { success: !1, error: "Preset not found" };
      t.isDefault = !0, e.defaultPresetId = s;
    }
    return await fe(e), { success: !0 };
  } catch (e) {
    return console.error("Failed to set default preset:", e), { success: !1, error: String(e) };
  }
}
let Fe = null;
async function zs() {
  if (!Fe)
    try {
      Fe = await import("./index-DzQEl0Co.js").then((s) => s.i);
    } catch (s) {
      throw console.error("[KeystrokeService] Failed to load uiohook-napi:", s), s;
    }
  return Fe;
}
class Js {
  constructor() {
    v(this, "running", !1);
    v(this, "eventCallback", null);
    v(this, "errorCallback", null);
    v(this, "keydownHandler", null);
    v(this, "clickHandler", null);
    v(this, "uiohook", null);
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
        this.uiohook = await zs(), this.setupEventHandlers(), this.uiohook.uIOhook.start(), this.running = !0;
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
    const t = e instanceof Error ? e : void 0, r = e instanceof Error ? e.message : String(e);
    return r.includes("Cannot find module") || r.includes("not found") || r.includes("failed to load") || r.includes("ENOENT") || r.includes("MODULE_NOT_FOUND") ? {
      code: "LIBRARY_LOAD_FAILED",
      message: "Failed to load uiohook native library. The keystroke overlay feature is unavailable.",
      originalError: t
    } : r.includes("init") || r.includes("start") || r.includes("permission") || r.includes("access") ? {
      code: "INIT_FAILED",
      message: "Failed to initialize keystroke capture. Please check system permissions.",
      originalError: t
    } : {
      code: "UNKNOWN",
      message: `Keystroke capture failed: ${r}`,
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
        const r = {
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
        this.eventCallback(r);
      }
    }, this.clickHandler = (t) => {
      if (this.eventCallback) {
        const n = {
          1: "left",
          2: "right",
          3: "middle"
        }[t.button];
        if (n) {
          const i = {
            type: "mouse",
            timestamp: Date.now(),
            button: n,
            modifiers: {
              ctrl: t.ctrlKey ?? !1,
              alt: t.altKey ?? !1,
              shift: t.shiftKey ?? !1,
              meta: t.metaKey ?? !1
            }
          };
          this.eventCallback(i);
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
const Me = new Js(), it = {
  enabled: !1,
  position: "bottom-center",
  fadeDurationMs: 1500,
  fadeDelayMs: 1e3,
  groupingThresholdMs: 100,
  showMouseClicks: !0,
  textScale: 1
}, Ys = "keystroke-settings.json", Vt = 1;
function Qe() {
  return m.join(D.getPath("userData"), Ys);
}
function $e() {
  return {
    version: Vt,
    settings: { ...it }
  };
}
async function Gt() {
  try {
    const s = Qe(), e = await P.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.settings || typeof t.settings != "object" ? (console.warn("Invalid keystroke settings file, creating new store"), $e()) : {
      version: t.version || Vt,
      settings: { ...it, ...t.settings }
    };
  } catch (s) {
    if (s.code === "ENOENT")
      return $e();
    console.error("Failed to read keystroke settings file:", s);
    try {
      const e = Qe(), t = e + ".backup." + Date.now();
      await P.rename(e, t), console.log("Backed up corrupt keystroke settings file to:", t);
    } catch {
    }
    return $e();
  }
}
async function Xs(s) {
  const e = Qe();
  await P.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function Zs() {
  try {
    return {
      success: !0,
      settings: (await Gt()).settings
    };
  } catch (s) {
    return console.error("Failed to get keystroke settings:", s), {
      success: !1,
      settings: { ...it }
    };
  }
}
async function Qs(s) {
  try {
    const e = await Gt();
    return e.settings = { ...e.settings, ...s }, await Xs(e), { success: !0, settings: e.settings };
  } catch (e) {
    return console.error("Failed to save keystroke settings:", e), { success: !1, error: String(e) };
  }
}
function er(s) {
  return s && s.__esModule && Object.prototype.hasOwnProperty.call(s, "default") ? s.default : s;
}
var Te = { exports: {} };
const qt = ["nodebuffer", "arraybuffer", "fragments"], Kt = typeof Blob < "u";
Kt && qt.push("blob");
var W = {
  BINARY_TYPES: qt,
  CLOSE_TIMEOUT: 3e4,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: Kt,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
}, tr, sr;
const { EMPTY_BUFFER: rr } = W, et = Buffer[Symbol.species];
function nr(s, e) {
  if (s.length === 0) return rr;
  if (s.length === 1) return s[0];
  const t = Buffer.allocUnsafe(e);
  let r = 0;
  for (let n = 0; n < s.length; n++) {
    const i = s[n];
    t.set(i, r), r += i.length;
  }
  return r < e ? new et(t.buffer, t.byteOffset, r) : t;
}
function Ht(s, e, t, r, n) {
  for (let i = 0; i < n; i++)
    t[r + i] = s[i] ^ e[i & 3];
}
function zt(s, e) {
  for (let t = 0; t < s.length; t++)
    s[t] ^= e[t & 3];
}
function ir(s) {
  return s.length === s.buffer.byteLength ? s.buffer : s.buffer.slice(s.byteOffset, s.byteOffset + s.length);
}
function tt(s) {
  if (tt.readOnly = !0, Buffer.isBuffer(s)) return s;
  let e;
  return s instanceof ArrayBuffer ? e = new et(s) : ArrayBuffer.isView(s) ? e = new et(s.buffer, s.byteOffset, s.byteLength) : (e = Buffer.from(s), tt.readOnly = !1), e;
}
Te.exports = {
  concat: nr,
  mask: Ht,
  toArrayBuffer: ir,
  toBuffer: tt,
  unmask: zt
};
if (!process.env.WS_NO_BUFFER_UTIL)
  try {
    const s = require("bufferutil");
    sr = Te.exports.mask = function(e, t, r, n, i) {
      i < 48 ? Ht(e, t, r, n, i) : s.mask(e, t, r, n, i);
    }, tr = Te.exports.unmask = function(e, t) {
      e.length < 32 ? zt(e, t) : s.unmask(e, t);
    };
  } catch {
  }
var Ie = Te.exports;
const ut = Symbol("kDone"), We = Symbol("kRun");
let or = class {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(e) {
    this[ut] = () => {
      this.pending--, this[We]();
    }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(e) {
    this.jobs.push(e), this[We]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [We]() {
    if (this.pending !== this.concurrency && this.jobs.length) {
      const e = this.jobs.shift();
      this.pending++, e(this[ut]);
    }
  }
};
var ar = or;
const ne = xs, ft = Ie, lr = ar, { kStatusCode: Jt } = W, cr = Buffer[Symbol.species], hr = Buffer.from([0, 0, 255, 255]), xe = Symbol("permessage-deflate"), U = Symbol("total-length"), z = Symbol("callback"), F = Symbol("buffers"), Z = Symbol("error");
let me, ur = class {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed if context takeover is disabled
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(e, t, r) {
    if (this._maxPayload = r | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!t, this._deflate = null, this._inflate = null, this.params = null, !me) {
      const n = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      me = new lr(n);
    }
  }
  /**
   * @type {String}
   */
  static get extensionName() {
    return "permessage-deflate";
  }
  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const e = {};
    return this._options.serverNoContextTakeover && (e.server_no_context_takeover = !0), this._options.clientNoContextTakeover && (e.client_no_context_takeover = !0), this._options.serverMaxWindowBits && (e.server_max_window_bits = this._options.serverMaxWindowBits), this._options.clientMaxWindowBits ? e.client_max_window_bits = this._options.clientMaxWindowBits : this._options.clientMaxWindowBits == null && (e.client_max_window_bits = !0), e;
  }
  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(e) {
    return e = this.normalizeParams(e), this.params = this._isServer ? this.acceptAsServer(e) : this.acceptAsClient(e), this.params;
  }
  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate && (this._inflate.close(), this._inflate = null), this._deflate) {
      const e = this._deflate[z];
      this._deflate.close(), this._deflate = null, e && e(
        new Error(
          "The deflate stream was closed while data was being processed"
        )
      );
    }
  }
  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(e) {
    const t = this._options, r = e.find((n) => !(t.serverNoContextTakeover === !1 && n.server_no_context_takeover || n.server_max_window_bits && (t.serverMaxWindowBits === !1 || typeof t.serverMaxWindowBits == "number" && t.serverMaxWindowBits > n.server_max_window_bits) || typeof t.clientMaxWindowBits == "number" && !n.client_max_window_bits));
    if (!r)
      throw new Error("None of the extension offers can be accepted");
    return t.serverNoContextTakeover && (r.server_no_context_takeover = !0), t.clientNoContextTakeover && (r.client_no_context_takeover = !0), typeof t.serverMaxWindowBits == "number" && (r.server_max_window_bits = t.serverMaxWindowBits), typeof t.clientMaxWindowBits == "number" ? r.client_max_window_bits = t.clientMaxWindowBits : (r.client_max_window_bits === !0 || t.clientMaxWindowBits === !1) && delete r.client_max_window_bits, r;
  }
  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(e) {
    const t = e[0];
    if (this._options.clientNoContextTakeover === !1 && t.client_no_context_takeover)
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    if (!t.client_max_window_bits)
      typeof this._options.clientMaxWindowBits == "number" && (t.client_max_window_bits = this._options.clientMaxWindowBits);
    else if (this._options.clientMaxWindowBits === !1 || typeof this._options.clientMaxWindowBits == "number" && t.client_max_window_bits > this._options.clientMaxWindowBits)
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    return t;
  }
  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(e) {
    return e.forEach((t) => {
      Object.keys(t).forEach((r) => {
        let n = t[r];
        if (n.length > 1)
          throw new Error(`Parameter "${r}" must have only a single value`);
        if (n = n[0], r === "client_max_window_bits") {
          if (n !== !0) {
            const i = +n;
            if (!Number.isInteger(i) || i < 8 || i > 15)
              throw new TypeError(
                `Invalid value for parameter "${r}": ${n}`
              );
            n = i;
          } else if (!this._isServer)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${n}`
            );
        } else if (r === "server_max_window_bits") {
          const i = +n;
          if (!Number.isInteger(i) || i < 8 || i > 15)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${n}`
            );
          n = i;
        } else if (r === "client_no_context_takeover" || r === "server_no_context_takeover") {
          if (n !== !0)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${n}`
            );
        } else
          throw new Error(`Unknown parameter "${r}"`);
        t[r] = n;
      });
    }), e;
  }
  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(e, t, r) {
    me.add((n) => {
      this._decompress(e, t, (i, o) => {
        n(), r(i, o);
      });
    });
  }
  /**
   * Compress data. Concurrency limited.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(e, t, r) {
    me.add((n) => {
      this._compress(e, t, (i, o) => {
        n(), r(i, o);
      });
    });
  }
  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(e, t, r) {
    const n = this._isServer ? "client" : "server";
    if (!this._inflate) {
      const i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
      this._inflate = ne.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits: o
      }), this._inflate[xe] = this, this._inflate[U] = 0, this._inflate[F] = [], this._inflate.on("error", dr), this._inflate.on("data", Yt);
    }
    this._inflate[z] = r, this._inflate.write(e), t && this._inflate.write(hr), this._inflate.flush(() => {
      const i = this._inflate[Z];
      if (i) {
        this._inflate.close(), this._inflate = null, r(i);
        return;
      }
      const o = ft.concat(
        this._inflate[F],
        this._inflate[U]
      );
      this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[U] = 0, this._inflate[F] = [], t && this.params[`${n}_no_context_takeover`] && this._inflate.reset()), r(null, o);
    });
  }
  /**
   * Compress data.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(e, t, r) {
    const n = this._isServer ? "server" : "client";
    if (!this._deflate) {
      const i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
      this._deflate = ne.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits: o
      }), this._deflate[U] = 0, this._deflate[F] = [], this._deflate.on("data", fr);
    }
    this._deflate[z] = r, this._deflate.write(e), this._deflate.flush(ne.Z_SYNC_FLUSH, () => {
      if (!this._deflate)
        return;
      let i = ft.concat(
        this._deflate[F],
        this._deflate[U]
      );
      t && (i = new cr(i.buffer, i.byteOffset, i.length - 4)), this._deflate[z] = null, this._deflate[U] = 0, this._deflate[F] = [], t && this.params[`${n}_no_context_takeover`] && this._deflate.reset(), r(null, i);
    });
  }
};
var ot = ur;
function fr(s) {
  this[F].push(s), this[U] += s.length;
}
function Yt(s) {
  if (this[U] += s.length, this[xe]._maxPayload < 1 || this[U] <= this[xe]._maxPayload) {
    this[F].push(s);
    return;
  }
  this[Z] = new RangeError("Max payload size exceeded"), this[Z].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[Z][Jt] = 1009, this.removeListener("data", Yt), this.reset();
}
function dr(s) {
  if (this[xe]._inflate = null, this[Z]) {
    this[z](this[Z]);
    return;
  }
  s[Jt] = 1007, this[z](s);
}
var Oe = { exports: {} }, dt;
const { isUtf8: pt } = Os, { hasBlob: pr } = W, mr = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 0 - 15
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 16 - 31
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  1,
  1,
  0,
  1,
  1,
  0,
  // 32 - 47
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  // 48 - 63
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 64 - 79
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  1,
  // 80 - 95
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 96 - 111
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  1,
  0,
  1,
  0
  // 112 - 127
];
function gr(s) {
  return s >= 1e3 && s <= 1014 && s !== 1004 && s !== 1005 && s !== 1006 || s >= 3e3 && s <= 4999;
}
function st(s) {
  const e = s.length;
  let t = 0;
  for (; t < e; )
    if (!(s[t] & 128))
      t++;
    else if ((s[t] & 224) === 192) {
      if (t + 1 === e || (s[t + 1] & 192) !== 128 || (s[t] & 254) === 192)
        return !1;
      t += 2;
    } else if ((s[t] & 240) === 224) {
      if (t + 2 >= e || (s[t + 1] & 192) !== 128 || (s[t + 2] & 192) !== 128 || s[t] === 224 && (s[t + 1] & 224) === 128 || // Overlong
      s[t] === 237 && (s[t + 1] & 224) === 160)
        return !1;
      t += 3;
    } else if ((s[t] & 248) === 240) {
      if (t + 3 >= e || (s[t + 1] & 192) !== 128 || (s[t + 2] & 192) !== 128 || (s[t + 3] & 192) !== 128 || s[t] === 240 && (s[t + 1] & 240) === 128 || // Overlong
      s[t] === 244 && s[t + 1] > 143 || s[t] > 244)
        return !1;
      t += 4;
    } else
      return !1;
  return !0;
}
function _r(s) {
  return pr && typeof s == "object" && typeof s.arrayBuffer == "function" && typeof s.type == "string" && typeof s.stream == "function" && (s[Symbol.toStringTag] === "Blob" || s[Symbol.toStringTag] === "File");
}
Oe.exports = {
  isBlob: _r,
  isValidStatusCode: gr,
  isValidUTF8: st,
  tokenChars: mr
};
if (pt)
  dt = Oe.exports.isValidUTF8 = function(s) {
    return s.length < 24 ? st(s) : pt(s);
  };
else if (!process.env.WS_NO_UTF_8_VALIDATE)
  try {
    const s = require("utf-8-validate");
    dt = Oe.exports.isValidUTF8 = function(e) {
      return e.length < 32 ? st(e) : s(e);
    };
  } catch {
  }
var de = Oe.exports;
const { Writable: yr } = ue, mt = ot, {
  BINARY_TYPES: wr,
  EMPTY_BUFFER: gt,
  kStatusCode: Sr,
  kWebSocket: vr
} = W, { concat: je, toArrayBuffer: Er, unmask: kr } = Ie, { isValidStatusCode: br, isValidUTF8: _t } = de, ge = Buffer[Symbol.species], x = 0, yt = 1, wt = 2, St = 3, Ve = 4, Ge = 5, _e = 6;
let Tr = class extends yr {
  /**
   * Creates a Receiver instance.
   *
   * @param {Object} [options] Options object
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {String} [options.binaryType=nodebuffer] The type for binary data
   * @param {Object} [options.extensions] An object containing the negotiated
   *     extensions
   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
   *     client or server mode
   * @param {Number} [options.maxPayload=0] The maximum allowed message length
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   */
  constructor(e = {}) {
    super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : !0, this._binaryType = e.binaryType || wr[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[vr] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = !1, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = !1, this._fin = !1, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = !1, this._loop = !1, this._state = x;
  }
  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(e, t, r) {
    if (this._opcode === 8 && this._state == x) return r();
    this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(r);
  }
  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(e) {
    if (this._bufferedBytes -= e, e === this._buffers[0].length) return this._buffers.shift();
    if (e < this._buffers[0].length) {
      const r = this._buffers[0];
      return this._buffers[0] = new ge(
        r.buffer,
        r.byteOffset + e,
        r.length - e
      ), new ge(r.buffer, r.byteOffset, e);
    }
    const t = Buffer.allocUnsafe(e);
    do {
      const r = this._buffers[0], n = t.length - e;
      e >= r.length ? t.set(this._buffers.shift(), n) : (t.set(new Uint8Array(r.buffer, r.byteOffset, e), n), this._buffers[0] = new ge(
        r.buffer,
        r.byteOffset + e,
        r.length - e
      )), e -= r.length;
    } while (e > 0);
    return t;
  }
  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(e) {
    this._loop = !0;
    do
      switch (this._state) {
        case x:
          this.getInfo(e);
          break;
        case yt:
          this.getPayloadLength16(e);
          break;
        case wt:
          this.getPayloadLength64(e);
          break;
        case St:
          this.getMask();
          break;
        case Ve:
          this.getData(e);
          break;
        case Ge:
        case _e:
          this._loop = !1;
          return;
      }
    while (this._loop);
    this._errored || e();
  }
  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    const t = this.consume(2);
    if (t[0] & 48) {
      const n = this.createError(
        RangeError,
        "RSV2 and RSV3 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_2_3"
      );
      e(n);
      return;
    }
    const r = (t[0] & 64) === 64;
    if (r && !this._extensions[mt.extensionName]) {
      const n = this.createError(
        RangeError,
        "RSV1 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_1"
      );
      e(n);
      return;
    }
    if (this._fin = (t[0] & 128) === 128, this._opcode = t[0] & 15, this._payloadLength = t[1] & 127, this._opcode === 0) {
      if (r) {
        const n = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(n);
        return;
      }
      if (!this._fragmented) {
        const n = this.createError(
          RangeError,
          "invalid opcode 0",
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(n);
        return;
      }
      this._opcode = this._fragmented;
    } else if (this._opcode === 1 || this._opcode === 2) {
      if (this._fragmented) {
        const n = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(n);
        return;
      }
      this._compressed = r;
    } else if (this._opcode > 7 && this._opcode < 11) {
      if (!this._fin) {
        const n = this.createError(
          RangeError,
          "FIN must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_FIN"
        );
        e(n);
        return;
      }
      if (r) {
        const n = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(n);
        return;
      }
      if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
        const n = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          !0,
          1002,
          "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
        );
        e(n);
        return;
      }
    } else {
      const n = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        !0,
        1002,
        "WS_ERR_INVALID_OPCODE"
      );
      e(n);
      return;
    }
    if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (t[1] & 128) === 128, this._isServer) {
      if (!this._masked) {
        const n = this.createError(
          RangeError,
          "MASK must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_MASK"
        );
        e(n);
        return;
      }
    } else if (this._masked) {
      const n = this.createError(
        RangeError,
        "MASK must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_MASK"
      );
      e(n);
      return;
    }
    this._payloadLength === 126 ? this._state = yt : this._payloadLength === 127 ? this._state = wt : this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    this._payloadLength = this.consume(2).readUInt16BE(0), this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(e) {
    if (this._bufferedBytes < 8) {
      this._loop = !1;
      return;
    }
    const t = this.consume(8), r = t.readUInt32BE(0);
    if (r > Math.pow(2, 21) - 1) {
      const n = this.createError(
        RangeError,
        "Unsupported WebSocket frame: payload length > 2^53 - 1",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
      );
      e(n);
      return;
    }
    this._payloadLength = r * Math.pow(2, 32) + t.readUInt32BE(4), this.haveLength(e);
  }
  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(e) {
    if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
      const t = this.createError(
        RangeError,
        "Max payload size exceeded",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
      );
      e(t);
      return;
    }
    this._masked ? this._state = St : this._state = Ve;
  }
  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = !1;
      return;
    }
    this._mask = this.consume(4), this._state = Ve;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(e) {
    let t = gt;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = !1;
        return;
      }
      t = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && kr(t, this._mask);
    }
    if (this._opcode > 7) {
      this.controlMessage(t, e);
      return;
    }
    if (this._compressed) {
      this._state = Ge, this.decompress(t, e);
      return;
    }
    t.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(t)), this.dataMessage(e);
  }
  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(e, t) {
    this._extensions[mt.extensionName].decompress(e, this._fin, (n, i) => {
      if (n) return t(n);
      if (i.length) {
        if (this._messageLength += i.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const o = this.createError(
            RangeError,
            "Max payload size exceeded",
            !1,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          t(o);
          return;
        }
        this._fragments.push(i);
      }
      this.dataMessage(t), this._state === x && this.startLoop(t);
    });
  }
  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(e) {
    if (!this._fin) {
      this._state = x;
      return;
    }
    const t = this._messageLength, r = this._fragments;
    if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
      let n;
      this._binaryType === "nodebuffer" ? n = je(r, t) : this._binaryType === "arraybuffer" ? n = Er(je(r, t)) : this._binaryType === "blob" ? n = new Blob(r) : n = r, this._allowSynchronousEvents ? (this.emit("message", n, !0), this._state = x) : (this._state = _e, setImmediate(() => {
        this.emit("message", n, !0), this._state = x, this.startLoop(e);
      }));
    } else {
      const n = je(r, t);
      if (!this._skipUTF8Validation && !_t(n)) {
        const i = this.createError(
          Error,
          "invalid UTF-8 sequence",
          !0,
          1007,
          "WS_ERR_INVALID_UTF8"
        );
        e(i);
        return;
      }
      this._state === Ge || this._allowSynchronousEvents ? (this.emit("message", n, !1), this._state = x) : (this._state = _e, setImmediate(() => {
        this.emit("message", n, !1), this._state = x, this.startLoop(e);
      }));
    }
  }
  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(e, t) {
    if (this._opcode === 8) {
      if (e.length === 0)
        this._loop = !1, this.emit("conclude", 1005, gt), this.end();
      else {
        const r = e.readUInt16BE(0);
        if (!br(r)) {
          const i = this.createError(
            RangeError,
            `invalid status code ${r}`,
            !0,
            1002,
            "WS_ERR_INVALID_CLOSE_CODE"
          );
          t(i);
          return;
        }
        const n = new ge(
          e.buffer,
          e.byteOffset + 2,
          e.length - 2
        );
        if (!this._skipUTF8Validation && !_t(n)) {
          const i = this.createError(
            Error,
            "invalid UTF-8 sequence",
            !0,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          t(i);
          return;
        }
        this._loop = !1, this.emit("conclude", r, n), this.end();
      }
      this._state = x;
      return;
    }
    this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = x) : (this._state = _e, setImmediate(() => {
      this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = x, this.startLoop(t);
    }));
  }
  /**
   * Builds an error object.
   *
   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
   * @param {String} message The error message
   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
   *     `message`
   * @param {Number} statusCode The status code
   * @param {String} errorCode The exposed error code
   * @return {(Error|RangeError)} The error
   * @private
   */
  createError(e, t, r, n, i) {
    this._loop = !1, this._errored = !0;
    const o = new e(
      r ? `Invalid WebSocket frame: ${t}` : t
    );
    return Error.captureStackTrace(o, this.createError), o.code = i, o[Sr] = n, o;
  }
};
var xr = Tr;
const { Duplex: Ei } = ue, { randomFillSync: Or } = nt, vt = ot, { EMPTY_BUFFER: Pr, kWebSocket: Dr, NOOP: Rr } = W, { isBlob: K, isValidStatusCode: Ir } = de, { mask: Et, toBuffer: j } = Ie, O = Symbol("kByteLength"), Nr = Buffer.alloc(4), Ee = 8 * 1024;
let V, H = Ee;
const R = 0, Ar = 1, Lr = 2;
let Ur = class G {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(e, t, r) {
    this._extensions = t || {}, r && (this._generateMask = r, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = !0, this._compress = !1, this._bufferedBytes = 0, this._queue = [], this._state = R, this.onerror = Rr, this[Dr] = void 0;
  }
  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {(Buffer|String)} data The data to frame
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {(Buffer|String)[]} The framed data
   * @public
   */
  static frame(e, t) {
    let r, n = !1, i = 2, o = !1;
    t.mask && (r = t.maskBuffer || Nr, t.generateMask ? t.generateMask(r) : (H === Ee && (V === void 0 && (V = Buffer.alloc(Ee)), Or(V, 0, Ee), H = 0), r[0] = V[H++], r[1] = V[H++], r[2] = V[H++], r[3] = V[H++]), o = (r[0] | r[1] | r[2] | r[3]) === 0, i = 6);
    let a;
    typeof e == "string" ? (!t.mask || o) && t[O] !== void 0 ? a = t[O] : (e = Buffer.from(e), a = e.length) : (a = e.length, n = t.mask && t.readOnly && !o);
    let c = a;
    a >= 65536 ? (i += 8, c = 127) : a > 125 && (i += 2, c = 126);
    const l = Buffer.allocUnsafe(n ? a + i : i);
    return l[0] = t.fin ? t.opcode | 128 : t.opcode, t.rsv1 && (l[0] |= 64), l[1] = c, c === 126 ? l.writeUInt16BE(a, 2) : c === 127 && (l[2] = l[3] = 0, l.writeUIntBE(a, 4, 6)), t.mask ? (l[1] |= 128, l[i - 4] = r[0], l[i - 3] = r[1], l[i - 2] = r[2], l[i - 1] = r[3], o ? [l, e] : n ? (Et(e, r, l, i, a), [l]) : (Et(e, r, e, 0, a), [l, e])) : [l, e];
  }
  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {(String|Buffer)} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(e, t, r, n) {
    let i;
    if (e === void 0)
      i = Pr;
    else {
      if (typeof e != "number" || !Ir(e))
        throw new TypeError("First argument must be a valid error code number");
      if (t === void 0 || !t.length)
        i = Buffer.allocUnsafe(2), i.writeUInt16BE(e, 0);
      else {
        const a = Buffer.byteLength(t);
        if (a > 123)
          throw new RangeError("The message must not be greater than 123 bytes");
        i = Buffer.allocUnsafe(2 + a), i.writeUInt16BE(e, 0), typeof t == "string" ? i.write(t, 2) : i.set(t, 2);
      }
    }
    const o = {
      [O]: i.length,
      fin: !0,
      generateMask: this._generateMask,
      mask: r,
      maskBuffer: this._maskBuffer,
      opcode: 8,
      readOnly: !1,
      rsv1: !1
    };
    this._state !== R ? this.enqueue([this.dispatch, i, !1, o, n]) : this.sendFrame(G.frame(i, o), n);
  }
  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(e, t, r) {
    let n, i;
    if (typeof e == "string" ? (n = Buffer.byteLength(e), i = !1) : K(e) ? (n = e.size, i = !1) : (e = j(e), n = e.length, i = j.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [O]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly: i,
      rsv1: !1
    };
    K(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== R ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(G.frame(e, o), r);
  }
  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(e, t, r) {
    let n, i;
    if (typeof e == "string" ? (n = Buffer.byteLength(e), i = !1) : K(e) ? (n = e.size, i = !1) : (e = j(e), n = e.length, i = j.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [O]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly: i,
      rsv1: !1
    };
    K(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== R ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(G.frame(e, o), r);
  }
  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(e, t, r) {
    const n = this._extensions[vt.extensionName];
    let i = t.binary ? 2 : 1, o = t.compress, a, c;
    typeof e == "string" ? (a = Buffer.byteLength(e), c = !1) : K(e) ? (a = e.size, c = !1) : (e = j(e), a = e.length, c = j.readOnly), this._firstFragment ? (this._firstFragment = !1, o && n && n.params[n._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = a >= n._threshold), this._compress = o) : (o = !1, i = 0), t.fin && (this._firstFragment = !0);
    const l = {
      [O]: a,
      fin: t.fin,
      generateMask: this._generateMask,
      mask: t.mask,
      maskBuffer: this._maskBuffer,
      opcode: i,
      readOnly: c,
      rsv1: o
    };
    K(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, this._compress, l, r]) : this.getBlobData(e, this._compress, l, r) : this._state !== R ? this.enqueue([this.dispatch, e, this._compress, l, r]) : this.dispatch(e, this._compress, l, r);
  }
  /**
   * Gets the contents of a blob as binary data.
   *
   * @param {Blob} blob The blob
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     the data
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  getBlobData(e, t, r, n) {
    this._bufferedBytes += r[O], this._state = Lr, e.arrayBuffer().then((i) => {
      if (this._socket.destroyed) {
        const a = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(rt, this, a, n);
        return;
      }
      this._bufferedBytes -= r[O];
      const o = j(i);
      t ? this.dispatch(o, t, r, n) : (this._state = R, this.sendFrame(G.frame(o, r), n), this.dequeue());
    }).catch((i) => {
      process.nextTick(Cr, this, i, n);
    });
  }
  /**
   * Dispatches a message.
   *
   * @param {(Buffer|String)} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(e, t, r, n) {
    if (!t) {
      this.sendFrame(G.frame(e, r), n);
      return;
    }
    const i = this._extensions[vt.extensionName];
    this._bufferedBytes += r[O], this._state = Ar, i.compress(e, r.fin, (o, a) => {
      if (this._socket.destroyed) {
        const c = new Error(
          "The socket was closed while data was being compressed"
        );
        rt(this, c, n);
        return;
      }
      this._bufferedBytes -= r[O], this._state = R, r.readOnly = !1, this.sendFrame(G.frame(a, r), n), this.dequeue();
    });
  }
  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    for (; this._state === R && this._queue.length; ) {
      const e = this._queue.shift();
      this._bufferedBytes -= e[3][O], Reflect.apply(e[0], this, e.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(e) {
    this._bufferedBytes += e[3][O], this._queue.push(e);
  }
  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(e, t) {
    e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], t), this._socket.uncork()) : this._socket.write(e[0], t);
  }
};
var Br = Ur;
function rt(s, e, t) {
  typeof t == "function" && t(e);
  for (let r = 0; r < s._queue.length; r++) {
    const n = s._queue[r], i = n[n.length - 1];
    typeof i == "function" && i(e);
  }
}
function Cr(s, e, t) {
  rt(s, e, t), s.onerror(e);
}
const { kForOnEventAttribute: ie, kListener: qe } = W, kt = Symbol("kCode"), bt = Symbol("kData"), Tt = Symbol("kError"), xt = Symbol("kMessage"), Ot = Symbol("kReason"), J = Symbol("kTarget"), Pt = Symbol("kType"), Dt = Symbol("kWasClean");
class te {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(e) {
    this[J] = null, this[Pt] = e;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[J];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[Pt];
  }
}
Object.defineProperty(te.prototype, "target", { enumerable: !0 });
Object.defineProperty(te.prototype, "type", { enumerable: !0 });
class Ne extends te {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {Number} [options.code=0] The status code explaining why the
   *     connection was closed
   * @param {String} [options.reason=''] A human-readable string explaining why
   *     the connection was closed
   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
   *     connection was cleanly closed
   */
  constructor(e, t = {}) {
    super(e), this[kt] = t.code === void 0 ? 0 : t.code, this[Ot] = t.reason === void 0 ? "" : t.reason, this[Dt] = t.wasClean === void 0 ? !1 : t.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[kt];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[Ot];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[Dt];
  }
}
Object.defineProperty(Ne.prototype, "code", { enumerable: !0 });
Object.defineProperty(Ne.prototype, "reason", { enumerable: !0 });
Object.defineProperty(Ne.prototype, "wasClean", { enumerable: !0 });
class at extends te {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(e, t = {}) {
    super(e), this[Tt] = t.error === void 0 ? null : t.error, this[xt] = t.message === void 0 ? "" : t.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[Tt];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[xt];
  }
}
Object.defineProperty(at.prototype, "error", { enumerable: !0 });
Object.defineProperty(at.prototype, "message", { enumerable: !0 });
class Xt extends te {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(e, t = {}) {
    super(e), this[bt] = t.data === void 0 ? null : t.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[bt];
  }
}
Object.defineProperty(Xt.prototype, "data", { enumerable: !0 });
const Fr = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {(Function|Object)} handler The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(s, e, t = {}) {
    for (const n of this.listeners(s))
      if (!t[ie] && n[qe] === e && !n[ie])
        return;
    let r;
    if (s === "message")
      r = function(i, o) {
        const a = new Xt("message", {
          data: o ? i : i.toString()
        });
        a[J] = this, ye(e, this, a);
      };
    else if (s === "close")
      r = function(i, o) {
        const a = new Ne("close", {
          code: i,
          reason: o.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        a[J] = this, ye(e, this, a);
      };
    else if (s === "error")
      r = function(i) {
        const o = new at("error", {
          error: i,
          message: i.message
        });
        o[J] = this, ye(e, this, o);
      };
    else if (s === "open")
      r = function() {
        const i = new te("open");
        i[J] = this, ye(e, this, i);
      };
    else
      return;
    r[ie] = !!t[ie], r[qe] = e, t.once ? this.once(s, r) : this.on(s, r);
  },
  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(s, e) {
    for (const t of this.listeners(s))
      if (t[qe] === e && !t[ie]) {
        this.removeListener(s, t);
        break;
      }
  }
};
var Mr = {
  EventTarget: Fr
};
function ye(s, e, t) {
  typeof s == "object" && s.handleEvent ? s.handleEvent.call(s, t) : s.call(e, t);
}
const { tokenChars: oe } = de;
function I(s, e, t) {
  s[e] === void 0 ? s[e] = [t] : s[e].push(t);
}
function $r(s) {
  const e = /* @__PURE__ */ Object.create(null);
  let t = /* @__PURE__ */ Object.create(null), r = !1, n = !1, i = !1, o, a, c = -1, l = -1, u = -1, f = 0;
  for (; f < s.length; f++)
    if (l = s.charCodeAt(f), o === void 0)
      if (u === -1 && oe[l] === 1)
        c === -1 && (c = f);
      else if (f !== 0 && (l === 32 || l === 9))
        u === -1 && c !== -1 && (u = f);
      else if (l === 59 || l === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${f}`);
        u === -1 && (u = f);
        const _ = s.slice(c, u);
        l === 44 ? (I(e, _, t), t = /* @__PURE__ */ Object.create(null)) : o = _, c = u = -1;
      } else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (a === void 0)
      if (u === -1 && oe[l] === 1)
        c === -1 && (c = f);
      else if (l === 32 || l === 9)
        u === -1 && c !== -1 && (u = f);
      else if (l === 59 || l === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${f}`);
        u === -1 && (u = f), I(t, s.slice(c, u), !0), l === 44 && (I(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), c = u = -1;
      } else if (l === 61 && c !== -1 && u === -1)
        a = s.slice(c, f), c = u = -1;
      else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (n) {
      if (oe[l] !== 1)
        throw new SyntaxError(`Unexpected character at index ${f}`);
      c === -1 ? c = f : r || (r = !0), n = !1;
    } else if (i)
      if (oe[l] === 1)
        c === -1 && (c = f);
      else if (l === 34 && c !== -1)
        i = !1, u = f;
      else if (l === 92)
        n = !0;
      else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (l === 34 && s.charCodeAt(f - 1) === 61)
      i = !0;
    else if (u === -1 && oe[l] === 1)
      c === -1 && (c = f);
    else if (c !== -1 && (l === 32 || l === 9))
      u === -1 && (u = f);
    else if (l === 59 || l === 44) {
      if (c === -1)
        throw new SyntaxError(`Unexpected character at index ${f}`);
      u === -1 && (u = f);
      let _ = s.slice(c, u);
      r && (_ = _.replace(/\\/g, ""), r = !1), I(t, a, _), l === 44 && (I(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), a = void 0, c = u = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${f}`);
  if (c === -1 || i || l === 32 || l === 9)
    throw new SyntaxError("Unexpected end of input");
  u === -1 && (u = f);
  const E = s.slice(c, u);
  return o === void 0 ? I(e, E, t) : (a === void 0 ? I(t, E, !0) : r ? I(t, a, E.replace(/\\/g, "")) : I(t, a, E), I(e, o, t)), e;
}
function Wr(s) {
  return Object.keys(s).map((e) => {
    let t = s[e];
    return Array.isArray(t) || (t = [t]), t.map((r) => [e].concat(
      Object.keys(r).map((n) => {
        let i = r[n];
        return Array.isArray(i) || (i = [i]), i.map((o) => o === !0 ? n : `${n}=${o}`).join("; ");
      })
    ).join("; ")).join(", ");
  }).join(", ");
}
var jr = { format: Wr, parse: $r };
const Vr = ws, Gr = Ss, qr = vs, Zt = Es, Kr = ks, { randomBytes: Hr, createHash: zr } = nt, { Duplex: ki, Readable: bi } = ue, { URL: Ke } = Ts, M = ot, Jr = xr, Yr = Br, { isBlob: Xr } = de, {
  BINARY_TYPES: Rt,
  CLOSE_TIMEOUT: Zr,
  EMPTY_BUFFER: we,
  GUID: Qr,
  kForOnEventAttribute: He,
  kListener: en,
  kStatusCode: tn,
  kWebSocket: w,
  NOOP: Qt
} = W, {
  EventTarget: { addEventListener: sn, removeEventListener: rn }
} = Mr, { format: nn, parse: on } = jr, { toBuffer: an } = Ie, es = Symbol("kAborted"), ze = [8, 13], B = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], ln = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
class h extends Vr {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(e, t, r) {
    super(), this._binaryType = Rt[0], this._closeCode = 1006, this._closeFrameReceived = !1, this._closeFrameSent = !1, this._closeMessage = we, this._closeTimer = null, this._errorEmitted = !1, this._extensions = {}, this._paused = !1, this._protocol = "", this._readyState = h.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = !1, this._redirects = 0, t === void 0 ? t = [] : Array.isArray(t) || (typeof t == "object" && t !== null ? (r = t, t = []) : t = [t]), ts(this, e, t, r)) : (this._autoPong = r.autoPong, this._closeTimeout = r.closeTimeout, this._isServer = !0);
  }
  /**
   * For historical reasons, the custom "nodebuffer" type is used by the default
   * instead of "blob".
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }
  set binaryType(e) {
    Rt.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
  }
  /**
   * @type {Number}
   */
  get bufferedAmount() {
    return this._socket ? this._socket._writableState.length + this._sender._bufferedBytes : this._bufferedAmount;
  }
  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }
  /**
   * @type {Boolean}
   */
  get isPaused() {
    return this._paused;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return null;
  }
  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }
  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }
  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }
  /**
   * Set up the socket and the internal resources.
   *
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Object} options Options object
   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Number} [options.maxPayload=0] The maximum allowed message size
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @private
   */
  setSocket(e, t, r) {
    const n = new Jr({
      allowSynchronousEvents: r.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: r.maxPayload,
      skipUTF8Validation: r.skipUTF8Validation
    }), i = new Yr(e, this._extensions, r.generateMask);
    this._receiver = n, this._sender = i, this._socket = e, n[w] = this, i[w] = this, e[w] = this, n.on("conclude", fn), n.on("drain", dn), n.on("error", pn), n.on("message", mn), n.on("ping", gn), n.on("pong", _n), i.onerror = yn, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), t.length > 0 && e.unshift(t), e.on("close", ns), e.on("data", Ae), e.on("end", is), e.on("error", os), this._readyState = h.OPEN, this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = h.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    this._extensions[M.extensionName] && this._extensions[M.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = h.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
  }
  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {(String|Buffer)} [data] The reason why the connection is
   *     closing
   * @public
   */
  close(e, t) {
    if (this.readyState !== h.CLOSED) {
      if (this.readyState === h.CONNECTING) {
        T(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      if (this.readyState === h.CLOSING) {
        this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
        return;
      }
      this._readyState = h.CLOSING, this._sender.close(e, t, !this._isServer, (r) => {
        r || (this._closeFrameSent = !0, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
      }), rs(this);
    }
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    this.readyState === h.CONNECTING || this.readyState === h.CLOSED || (this._paused = !0, this._socket.pause());
  }
  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(e, t, r) {
    if (this.readyState === h.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== h.OPEN) {
      Je(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.ping(e || we, t, r);
  }
  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(e, t, r) {
    if (this.readyState === h.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== h.OPEN) {
      Je(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.pong(e || we, t, r);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    this.readyState === h.CONNECTING || this.readyState === h.CLOSED || (this._paused = !1, this._receiver._writableState.needDrain || this._socket.resume());
  }
  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(e, t, r) {
    if (this.readyState === h.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof t == "function" && (r = t, t = {}), typeof e == "number" && (e = e.toString()), this.readyState !== h.OPEN) {
      Je(this, e, r);
      return;
    }
    const n = {
      binary: typeof e != "string",
      mask: !this._isServer,
      compress: !0,
      fin: !0,
      ...t
    };
    this._extensions[M.extensionName] || (n.compress = !1), this._sender.send(e || we, n, r);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState !== h.CLOSED) {
      if (this.readyState === h.CONNECTING) {
        T(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      this._socket && (this._readyState = h.CLOSING, this._socket.destroy());
    }
  }
}
Object.defineProperty(h, "CONNECTING", {
  enumerable: !0,
  value: B.indexOf("CONNECTING")
});
Object.defineProperty(h.prototype, "CONNECTING", {
  enumerable: !0,
  value: B.indexOf("CONNECTING")
});
Object.defineProperty(h, "OPEN", {
  enumerable: !0,
  value: B.indexOf("OPEN")
});
Object.defineProperty(h.prototype, "OPEN", {
  enumerable: !0,
  value: B.indexOf("OPEN")
});
Object.defineProperty(h, "CLOSING", {
  enumerable: !0,
  value: B.indexOf("CLOSING")
});
Object.defineProperty(h.prototype, "CLOSING", {
  enumerable: !0,
  value: B.indexOf("CLOSING")
});
Object.defineProperty(h, "CLOSED", {
  enumerable: !0,
  value: B.indexOf("CLOSED")
});
Object.defineProperty(h.prototype, "CLOSED", {
  enumerable: !0,
  value: B.indexOf("CLOSED")
});
[
  "binaryType",
  "bufferedAmount",
  "extensions",
  "isPaused",
  "protocol",
  "readyState",
  "url"
].forEach((s) => {
  Object.defineProperty(h.prototype, s, { enumerable: !0 });
});
["open", "error", "close", "message"].forEach((s) => {
  Object.defineProperty(h.prototype, `on${s}`, {
    enumerable: !0,
    get() {
      for (const e of this.listeners(s))
        if (e[He]) return e[en];
      return null;
    },
    set(e) {
      for (const t of this.listeners(s))
        if (t[He]) {
          this.removeListener(s, t);
          break;
        }
      typeof e == "function" && this.addEventListener(s, e, {
        [He]: !0
      });
    }
  });
});
h.prototype.addEventListener = sn;
h.prototype.removeEventListener = rn;
var cn = h;
function ts(s, e, t, r) {
  const n = {
    allowSynchronousEvents: !0,
    autoPong: !0,
    closeTimeout: Zr,
    protocolVersion: ze[1],
    maxPayload: 104857600,
    skipUTF8Validation: !1,
    perMessageDeflate: !0,
    followRedirects: !1,
    maxRedirects: 10,
    ...r,
    socketPath: void 0,
    hostname: void 0,
    protocol: void 0,
    timeout: void 0,
    method: "GET",
    host: void 0,
    path: void 0,
    port: void 0
  };
  if (s._autoPong = n.autoPong, s._closeTimeout = n.closeTimeout, !ze.includes(n.protocolVersion))
    throw new RangeError(
      `Unsupported protocol version: ${n.protocolVersion} (supported versions: ${ze.join(", ")})`
    );
  let i;
  if (e instanceof Ke)
    i = e;
  else
    try {
      i = new Ke(e);
    } catch {
      throw new SyntaxError(`Invalid URL: ${e}`);
    }
  i.protocol === "http:" ? i.protocol = "ws:" : i.protocol === "https:" && (i.protocol = "wss:"), s._url = i.href;
  const o = i.protocol === "wss:", a = i.protocol === "ws+unix:";
  let c;
  if (i.protocol !== "ws:" && !o && !a ? c = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : a && !i.pathname ? c = "The URL's pathname is empty" : i.hash && (c = "The URL contains a fragment identifier"), c) {
    const p = new SyntaxError(c);
    if (s._redirects === 0)
      throw p;
    ke(s, p);
    return;
  }
  const l = o ? 443 : 80, u = Hr(16).toString("base64"), f = o ? Gr.request : qr.request, E = /* @__PURE__ */ new Set();
  let _;
  if (n.createConnection = n.createConnection || (o ? un : hn), n.defaultPort = n.defaultPort || l, n.port = i.port || l, n.host = i.hostname.startsWith("[") ? i.hostname.slice(1, -1) : i.hostname, n.headers = {
    ...n.headers,
    "Sec-WebSocket-Version": n.protocolVersion,
    "Sec-WebSocket-Key": u,
    Connection: "Upgrade",
    Upgrade: "websocket"
  }, n.path = i.pathname + i.search, n.timeout = n.handshakeTimeout, n.perMessageDeflate && (_ = new M(
    n.perMessageDeflate !== !0 ? n.perMessageDeflate : {},
    !1,
    n.maxPayload
  ), n.headers["Sec-WebSocket-Extensions"] = nn({
    [M.extensionName]: _.offer()
  })), t.length) {
    for (const p of t) {
      if (typeof p != "string" || !ln.test(p) || E.has(p))
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      E.add(p);
    }
    n.headers["Sec-WebSocket-Protocol"] = t.join(",");
  }
  if (n.origin && (n.protocolVersion < 13 ? n.headers["Sec-WebSocket-Origin"] = n.origin : n.headers.Origin = n.origin), (i.username || i.password) && (n.auth = `${i.username}:${i.password}`), a) {
    const p = n.path.split(":");
    n.socketPath = p[0], n.path = p[1];
  }
  let g;
  if (n.followRedirects) {
    if (s._redirects === 0) {
      s._originalIpc = a, s._originalSecure = o, s._originalHostOrSocketPath = a ? n.socketPath : i.host;
      const p = r && r.headers;
      if (r = { ...r, headers: {} }, p)
        for (const [S, A] of Object.entries(p))
          r.headers[S.toLowerCase()] = A;
    } else if (s.listenerCount("redirect") === 0) {
      const p = a ? s._originalIpc ? n.socketPath === s._originalHostOrSocketPath : !1 : s._originalIpc ? !1 : i.host === s._originalHostOrSocketPath;
      (!p || s._originalSecure && !o) && (delete n.headers.authorization, delete n.headers.cookie, p || delete n.headers.host, n.auth = void 0);
    }
    n.auth && !r.headers.authorization && (r.headers.authorization = "Basic " + Buffer.from(n.auth).toString("base64")), g = s._req = f(n), s._redirects && s.emit("redirect", s.url, g);
  } else
    g = s._req = f(n);
  n.timeout && g.on("timeout", () => {
    T(s, g, "Opening handshake has timed out");
  }), g.on("error", (p) => {
    g === null || g[es] || (g = s._req = null, ke(s, p));
  }), g.on("response", (p) => {
    const S = p.headers.location, A = p.statusCode;
    if (S && n.followRedirects && A >= 300 && A < 400) {
      if (++s._redirects > n.maxRedirects) {
        T(s, g, "Maximum redirects exceeded");
        return;
      }
      g.abort();
      let C;
      try {
        C = new Ke(S, e);
      } catch {
        const L = new SyntaxError(`Invalid URL: ${S}`);
        ke(s, L);
        return;
      }
      ts(s, C, t, r);
    } else s.emit("unexpected-response", g, p) || T(
      s,
      g,
      `Unexpected server response: ${p.statusCode}`
    );
  }), g.on("upgrade", (p, S, A) => {
    if (s.emit("upgrade", p), s.readyState !== h.CONNECTING) return;
    g = s._req = null;
    const C = p.headers.upgrade;
    if (C === void 0 || C.toLowerCase() !== "websocket") {
      T(s, S, "Invalid Upgrade header");
      return;
    }
    const se = zr("sha1").update(u + Qr).digest("base64");
    if (p.headers["sec-websocket-accept"] !== se) {
      T(s, S, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const L = p.headers["sec-websocket-protocol"];
    let re;
    if (L !== void 0 ? E.size ? E.has(L) || (re = "Server sent an invalid subprotocol") : re = "Server sent a subprotocol but none was requested" : E.size && (re = "Server sent no subprotocol"), re) {
      T(s, S, re);
      return;
    }
    L && (s._protocol = L);
    const ct = p.headers["sec-websocket-extensions"];
    if (ct !== void 0) {
      if (!_) {
        T(s, S, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
        return;
      }
      let Le;
      try {
        Le = on(ct);
      } catch {
        T(s, S, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      const ht = Object.keys(Le);
      if (ht.length !== 1 || ht[0] !== M.extensionName) {
        T(s, S, "Server indicated an extension that was not requested");
        return;
      }
      try {
        _.accept(Le[M.extensionName]);
      } catch {
        T(s, S, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      s._extensions[M.extensionName] = _;
    }
    s.setSocket(S, A, {
      allowSynchronousEvents: n.allowSynchronousEvents,
      generateMask: n.generateMask,
      maxPayload: n.maxPayload,
      skipUTF8Validation: n.skipUTF8Validation
    });
  }), n.finishRequest ? n.finishRequest(g, s) : g.end();
}
function ke(s, e) {
  s._readyState = h.CLOSING, s._errorEmitted = !0, s.emit("error", e), s.emitClose();
}
function hn(s) {
  return s.path = s.socketPath, Zt.connect(s);
}
function un(s) {
  return s.path = void 0, !s.servername && s.servername !== "" && (s.servername = Zt.isIP(s.host) ? "" : s.host), Kr.connect(s);
}
function T(s, e, t) {
  s._readyState = h.CLOSING;
  const r = new Error(t);
  Error.captureStackTrace(r, T), e.setHeader ? (e[es] = !0, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(ke, s, r)) : (e.destroy(r), e.once("error", s.emit.bind(s, "error")), e.once("close", s.emitClose.bind(s)));
}
function Je(s, e, t) {
  if (e) {
    const r = Xr(e) ? e.size : an(e).length;
    s._socket ? s._sender._bufferedBytes += r : s._bufferedAmount += r;
  }
  if (t) {
    const r = new Error(
      `WebSocket is not open: readyState ${s.readyState} (${B[s.readyState]})`
    );
    process.nextTick(t, r);
  }
}
function fn(s, e) {
  const t = this[w];
  t._closeFrameReceived = !0, t._closeMessage = e, t._closeCode = s, t._socket[w] !== void 0 && (t._socket.removeListener("data", Ae), process.nextTick(ss, t._socket), s === 1005 ? t.close() : t.close(s, e));
}
function dn() {
  const s = this[w];
  s.isPaused || s._socket.resume();
}
function pn(s) {
  const e = this[w];
  e._socket[w] !== void 0 && (e._socket.removeListener("data", Ae), process.nextTick(ss, e._socket), e.close(s[tn])), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s));
}
function It() {
  this[w].emitClose();
}
function mn(s, e) {
  this[w].emit("message", s, e);
}
function gn(s) {
  const e = this[w];
  e._autoPong && e.pong(s, !this._isServer, Qt), e.emit("ping", s);
}
function _n(s) {
  this[w].emit("pong", s);
}
function ss(s) {
  s.resume();
}
function yn(s) {
  const e = this[w];
  e.readyState !== h.CLOSED && (e.readyState === h.OPEN && (e._readyState = h.CLOSING, rs(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s)));
}
function rs(s) {
  s._closeTimer = setTimeout(
    s._socket.destroy.bind(s._socket),
    s._closeTimeout
  );
}
function ns() {
  const s = this[w];
  if (this.removeListener("close", ns), this.removeListener("data", Ae), this.removeListener("end", is), s._readyState = h.CLOSING, !this._readableState.endEmitted && !s._closeFrameReceived && !s._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
    const e = this.read(this._readableState.length);
    s._receiver.write(e);
  }
  s._receiver.end(), this[w] = void 0, clearTimeout(s._closeTimer), s._receiver._writableState.finished || s._receiver._writableState.errorEmitted ? s.emitClose() : (s._receiver.on("error", It), s._receiver.on("finish", It));
}
function Ae(s) {
  this[w]._receiver.write(s) || this.pause();
}
function is() {
  const s = this[w];
  s._readyState = h.CLOSING, s._receiver.end(), this.end();
}
function os() {
  const s = this[w];
  this.removeListener("error", os), this.on("error", Qt), s && (s._readyState = h.CLOSING, this.destroy());
}
const wn = /* @__PURE__ */ er(cn), { Duplex: Ti } = ue, { tokenChars: xi } = de, { Duplex: Oi } = ue, { createHash: Pi } = nt, { CLOSE_TIMEOUT: Di, GUID: Ri, kWebSocket: Ii } = W, ae = {
  cache: "no-store"
}, Sn = (s) => ce + (s === !1 ? "" : " AssemblyAI/1.0 (" + Object.entries({ ...Pe, ...s }).map(([e, t]) => t ? `${e}=${t.name}/${t.version}` : "").join(" ") + ")");
let ce = "";
typeof navigator < "u" && navigator.userAgent && (ce += navigator.userAgent);
const Pe = {
  sdk: { name: "JavaScript", version: "4.22.1" }
};
typeof process < "u" && (process.versions.node && ce.indexOf("Node") === -1 && (Pe.runtime_env = {
  name: "Node",
  version: process.versions.node
}), process.versions.bun && ce.indexOf("Bun") === -1 && (Pe.runtime_env = {
  name: "Bun",
  version: process.versions.bun
}));
typeof Deno < "u" && process.versions.bun && ce.indexOf("Deno") === -1 && (Pe.runtime_env = { name: "Deno", version: Deno.version.deno });
class pe {
  /**
   * Create a new service.
   * @param params - The parameters to use for the service.
   */
  constructor(e) {
    this.params = e, e.userAgent === !1 ? this.userAgent = void 0 : this.userAgent = Sn(e.userAgent || {});
  }
  async fetch(e, t) {
    t = { ...ae, ...t };
    let r = {
      Authorization: this.params.apiKey,
      "Content-Type": "application/json"
    };
    ae != null && ae.headers && (r = { ...r, ...ae.headers }), t != null && t.headers && (r = { ...r, ...t.headers }), this.userAgent && (r["User-Agent"] = this.userAgent), t.headers = r, e.startsWith("http") || (e = this.params.baseUrl + e);
    const n = await fetch(e, t);
    if (n.status >= 400) {
      let i;
      const o = await n.text();
      if (o) {
        try {
          i = JSON.parse(o);
        } catch {
        }
        throw i != null && i.error ? new Error(i.error) : new Error(o);
      }
      throw new Error(`HTTP Error: ${n.status} ${n.statusText}`);
    }
    return n;
  }
  async fetchJson(e, t) {
    return (await this.fetch(e, t)).json();
  }
}
class vn extends pe {
  summary(e, t) {
    return this.fetchJson("/lemur/v3/generate/summary", {
      method: "POST",
      body: JSON.stringify(e),
      signal: t
    });
  }
  questionAnswer(e, t) {
    return this.fetchJson("/lemur/v3/generate/question-answer", {
      method: "POST",
      body: JSON.stringify(e),
      signal: t
    });
  }
  actionItems(e, t) {
    return this.fetchJson("/lemur/v3/generate/action-items", {
      method: "POST",
      body: JSON.stringify(e),
      signal: t
    });
  }
  task(e, t) {
    return this.fetchJson("/lemur/v3/generate/task", {
      method: "POST",
      body: JSON.stringify(e),
      signal: t
    });
  }
  getResponse(e, t) {
    return this.fetchJson(`/lemur/v3/${e}`, { signal: t });
  }
  /**
   * Delete the data for a previously submitted LeMUR request.
   * @param id - ID of the LeMUR request
   * @param signal - Optional AbortSignal to cancel the request
   */
  purgeRequestData(e, t) {
    return this.fetchJson(`/lemur/v3/${e}`, {
      method: "DELETE",
      signal: t
    });
  }
}
const De = (s, e) => new wn(s, e), y = {
  BadSampleRate: 4e3,
  AuthFailed: 4001,
  InsufficientFunds: 4002,
  FreeTierUser: 4003,
  NonexistentSessionId: 4004,
  SessionExpired: 4008,
  ClosedSession: 4010,
  RateLimited: 4029,
  UniqueSessionViolation: 4030,
  SessionTimeout: 4031,
  AudioTooShort: 4032,
  AudioTooLong: 4033,
  AudioTooSmallToTranscode: 4034,
  /**
   * @deprecated Don't use
   */
  BadJson: 4100,
  BadSchema: 4101,
  TooManyStreams: 4102,
  Reconnected: 4103,
  /**
   * @deprecated Don't use
   */
  ReconnectAttemptsExhausted: 1013,
  WordBoostParameterParsingFailed: 4104
}, Nt = {
  [y.BadSampleRate]: "Sample rate must be a positive integer",
  [y.AuthFailed]: "Not Authorized",
  [y.InsufficientFunds]: "Insufficient funds",
  [y.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [y.NonexistentSessionId]: "Session ID does not exist",
  [y.SessionExpired]: "Session has expired",
  [y.ClosedSession]: "Session is closed",
  [y.RateLimited]: "Rate limited",
  [y.UniqueSessionViolation]: "Unique session violation",
  [y.SessionTimeout]: "Session Timeout",
  [y.AudioTooShort]: "Audio too short",
  [y.AudioTooLong]: "Audio too long",
  [y.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [y.BadJson]: "Bad JSON",
  [y.BadSchema]: "Bad schema",
  [y.TooManyStreams]: "Too many streams",
  [y.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid.",
  [y.ReconnectAttemptsExhausted]: "Reconnect attempts exhausted",
  [y.WordBoostParameterParsingFailed]: "Could not parse word boost parameter"
};
class En extends Error {
}
const k = {
  BadSampleRate: 4e3,
  AuthFailed: 4001,
  InsufficientFunds: 4002,
  FreeTierUser: 4003,
  NonexistentSessionId: 4004,
  SessionExpired: 4008,
  ClosedSession: 4010,
  RateLimited: 4029,
  UniqueSessionViolation: 4030,
  SessionTimeout: 4031,
  AudioTooShort: 4032,
  AudioTooLong: 4033,
  AudioTooSmallToTranscode: 4034,
  BadSchema: 4101,
  TooManyStreams: 4102,
  Reconnected: 4103
}, At = {
  [k.BadSampleRate]: "Sample rate must be a positive integer",
  [k.AuthFailed]: "Not Authorized",
  [k.InsufficientFunds]: "Insufficient funds",
  [k.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [k.NonexistentSessionId]: "Session ID does not exist",
  [k.SessionExpired]: "Session has expired",
  [k.ClosedSession]: "Session is closed",
  [k.RateLimited]: "Rate limited",
  [k.UniqueSessionViolation]: "Unique session violation",
  [k.SessionTimeout]: "Session Timeout",
  [k.AudioTooShort]: "Audio too short",
  [k.AudioTooLong]: "Audio too long",
  [k.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [k.BadSchema]: "Bad schema",
  [k.TooManyStreams]: "Too many streams",
  [k.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid."
};
class kn extends Error {
}
const bn = "wss://api.assemblyai.com/v2/realtime/ws", Tn = '{"force_end_utterance":true}', Lt = '{"terminate_session":true}';
class xn {
  /**
   * Create a new RealtimeTranscriber.
   * @param params - Parameters to configure the RealtimeTranscriber
   */
  constructor(e) {
    if (this.listeners = {}, this.realtimeUrl = e.realtimeUrl ?? bn, this.sampleRate = e.sampleRate ?? 16e3, this.wordBoost = e.wordBoost, this.encoding = e.encoding, this.endUtteranceSilenceThreshold = e.endUtteranceSilenceThreshold, this.disablePartialTranscripts = e.disablePartialTranscripts, "token" in e && e.token && (this.token = e.token), "apiKey" in e && e.apiKey && (this.apiKey = e.apiKey), !(this.token || this.apiKey))
      throw new Error("API key or temporary token is required.");
  }
  connectionUrl() {
    const e = new URL(this.realtimeUrl);
    if (e.protocol !== "wss:")
      throw new Error("Invalid protocol, must be wss");
    const t = new URLSearchParams();
    return this.token && t.set("token", this.token), t.set("sample_rate", this.sampleRate.toString()), this.wordBoost && this.wordBoost.length > 0 && t.set("word_boost", JSON.stringify(this.wordBoost)), this.encoding && t.set("encoding", this.encoding), t.set("enable_extra_session_information", "true"), this.disablePartialTranscripts && t.set("disable_partial_transcripts", this.disablePartialTranscripts.toString()), e.search = t.toString(), e;
  }
  /**
   * Add a listener for an event.
   * @param event - The event to listen for.
   * @param listener - The function to call when the event is emitted.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(e, t) {
    this.listeners[e] = t;
  }
  /**
   * Connect to the server and begin a new session.
   * @returns A promise that resolves when the connection is established and the session begins.
   */
  connect() {
    return new Promise((e) => {
      if (this.socket)
        throw new Error("Already connected");
      const t = this.connectionUrl();
      this.token ? this.socket = De(t.toString()) : this.socket = De(t.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
        this.endUtteranceSilenceThreshold === void 0 || this.endUtteranceSilenceThreshold === null || this.configureEndUtteranceSilenceThreshold(this.endUtteranceSilenceThreshold);
      }, this.socket.onclose = ({ code: r, reason: n }) => {
        var i, o;
        n || r in Nt && (n = Nt[r]), (o = (i = this.listeners).close) == null || o.call(i, r, n);
      }, this.socket.onerror = (r) => {
        var n, i, o, a;
        r.error ? (i = (n = this.listeners).error) == null || i.call(n, r.error) : (a = (o = this.listeners).error) == null || a.call(o, new Error(r.message));
      }, this.socket.onmessage = ({ data: r }) => {
        var i, o, a, c, l, u, f, E, _, g, p, S, A, C, se;
        const n = JSON.parse(r.toString());
        if ("error" in n) {
          (o = (i = this.listeners).error) == null || o.call(i, new En(n.error));
          return;
        }
        switch (n.message_type) {
          case "SessionBegins": {
            const L = {
              sessionId: n.session_id,
              expiresAt: new Date(n.expires_at)
            };
            e(L), (c = (a = this.listeners).open) == null || c.call(a, L);
            break;
          }
          case "PartialTranscript": {
            n.created = new Date(n.created), (u = (l = this.listeners).transcript) == null || u.call(l, n), (E = (f = this.listeners)["transcript.partial"]) == null || E.call(f, n);
            break;
          }
          case "FinalTranscript": {
            n.created = new Date(n.created), (g = (_ = this.listeners).transcript) == null || g.call(_, n), (S = (p = this.listeners)["transcript.final"]) == null || S.call(p, n);
            break;
          }
          case "SessionInformation": {
            (C = (A = this.listeners).session_information) == null || C.call(A, n);
            break;
          }
          case "SessionTerminated": {
            (se = this.sessionTerminatedResolve) == null || se.call(this);
            break;
          }
        }
      };
    });
  }
  /**
   * Send audio data to the server.
   * @param audio - The audio data to send to the server.
   */
  sendAudio(e) {
    this.send(e);
  }
  /**
   * Create a writable stream that can be used to send audio data to the server.
   * @returns A writable stream that can be used to send audio data to the server.
   */
  stream() {
    return new Wt({
      write: (e) => {
        this.sendAudio(e);
      }
    });
  }
  /**
   * Manually end an utterance
   */
  forceEndUtterance() {
    this.send(Tn);
  }
  /**
   * Configure the threshold for how long to wait before ending an utterance. Default is 700ms.
   * @param threshold - The duration of the end utterance silence threshold in milliseconds.
   * This value must be an integer between 0 and 20_000.
   */
  configureEndUtteranceSilenceThreshold(e) {
    this.send(`{"end_utterance_silence_threshold":${e}}`);
  }
  send(e) {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN)
      throw new Error("Socket is not open for communication");
    this.socket.send(e);
  }
  /**
   * Close the connection to the server.
   * @param waitForSessionTermination - If true, the method will wait for the session to be terminated before closing the connection.
   * While waiting for the session to be terminated, you will receive the final transcript and session information.
   */
  async close(e = !0) {
    var t;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN)
        if (e) {
          const r = new Promise((n) => {
            this.sessionTerminatedResolve = n;
          });
          this.socket.send(Lt), await r;
        } else
          this.socket.send(Lt);
      (t = this.socket) != null && t.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class On extends pe {
  constructor(e) {
    super(e), this.rtFactoryParams = e;
  }
  /**
   * @deprecated Use transcriber(...) instead
   */
  createService(e) {
    return this.transcriber(e);
  }
  transcriber(e) {
    const t = { ...e };
    return !t.token && !t.apiKey && (t.apiKey = this.rtFactoryParams.apiKey), new xn(t);
  }
  async createTemporaryToken(e) {
    return (await this.fetchJson("/v2/realtime/token", {
      method: "POST",
      body: JSON.stringify(e)
    })).token;
  }
}
function Ut(s) {
  return s.startsWith("http") || s.startsWith("https") || s.startsWith("data:") ? null : s.startsWith("file://") ? s.substring(7) : s.startsWith("file:") ? s.substring(5) : s;
}
class Pn extends pe {
  constructor(e, t) {
    super(e), this.files = t;
  }
  /**
   * Transcribe an audio file. This will create a transcript and wait until the transcript status is "completed" or "error".
   * @param params - The parameters to transcribe an audio file.
   * @param options - The options to transcribe an audio file.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async transcribe(e, t) {
    const r = await this.submit(e);
    return await this.waitUntilReady(r.id, t);
  }
  /**
   * Submits a transcription job for an audio file. This will not wait until the transcript status is "completed" or "error".
   * @param params - The parameters to start the transcription of an audio file.
   * @returns A promise that resolves to the queued transcript.
   */
  async submit(e) {
    let t, r;
    if ("audio" in e) {
      const { audio: i, ...o } = e;
      if (typeof i == "string") {
        const a = Ut(i);
        a !== null ? t = await this.files.upload(a) : i.startsWith("data:") ? t = await this.files.upload(i) : t = i;
      } else
        t = await this.files.upload(i);
      r = { ...o, audio_url: t };
    } else
      r = e;
    return await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(r)
    });
  }
  /**
   * Create a transcript.
   * @param params - The parameters to create a transcript.
   * @param options - The options used for creating the new transcript.
   * @returns A promise that resolves to the transcript.
   * @deprecated Use `transcribe` instead to transcribe a audio file that includes polling, or `submit` to transcribe a audio file without polling.
   */
  async create(e, t) {
    const r = Ut(e.audio_url);
    if (r !== null) {
      const i = await this.files.upload(r);
      e.audio_url = i;
    }
    const n = await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(e)
    });
    return (t == null ? void 0 : t.poll) ?? !0 ? await this.waitUntilReady(n.id, t) : n;
  }
  /**
   * Wait until the transcript ready, either the status is "completed" or "error".
   * @param transcriptId - The ID of the transcript.
   * @param options - The options to wait until the transcript is ready.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async waitUntilReady(e, t) {
    const r = (t == null ? void 0 : t.pollingInterval) ?? 3e3, n = (t == null ? void 0 : t.pollingTimeout) ?? -1, i = Date.now();
    for (; ; ) {
      const o = await this.get(e);
      if (o.status === "completed" || o.status === "error")
        return o;
      if (n > 0 && Date.now() - i > n)
        throw new Error("Polling timeout");
      await new Promise((a) => setTimeout(a, r));
    }
  }
  /**
   * Retrieve a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the transcript.
   */
  get(e) {
    return this.fetchJson(`/v2/transcript/${e}`);
  }
  /**
   * Retrieves a page of transcript listings.
   * @param params - The parameters to filter the transcript list by, or the URL to retrieve the transcript list from.
   */
  async list(e) {
    let t = "/v2/transcript";
    typeof e == "string" ? t = e : e && (t = `${t}?${new URLSearchParams(Object.keys(e).map((n) => {
      var i;
      return [
        n,
        ((i = e[n]) == null ? void 0 : i.toString()) || ""
      ];
    }))}`);
    const r = await this.fetchJson(t);
    for (const n of r.transcripts)
      n.created = new Date(n.created), n.completed && (n.completed = new Date(n.completed));
    return r;
  }
  /**
   * Delete a transcript
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the transcript.
   */
  delete(e) {
    return this.fetchJson(`/v2/transcript/${e}`, { method: "DELETE" });
  }
  /**
   * Search through the transcript for a specific set of keywords.
   * You can search for individual words, numbers, or phrases containing up to five words or numbers.
   * @param id - The identifier of the transcript.
   * @param words - Keywords to search for.
   * @returns A promise that resolves to the sentences.
   */
  wordSearch(e, t) {
    const r = new URLSearchParams({ words: t.join(",") });
    return this.fetchJson(`/v2/transcript/${e}/word-search?${r.toString()}`);
  }
  /**
   * Retrieve all sentences of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the sentences.
   */
  sentences(e) {
    return this.fetchJson(`/v2/transcript/${e}/sentences`);
  }
  /**
   * Retrieve all paragraphs of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the paragraphs.
   */
  paragraphs(e) {
    return this.fetchJson(`/v2/transcript/${e}/paragraphs`);
  }
  /**
   * Retrieve subtitles of a transcript.
   * @param id - The identifier of the transcript.
   * @param format - The format of the subtitles.
   * @param chars_per_caption - The maximum number of characters per caption.
   * @returns A promise that resolves to the subtitles text.
   */
  async subtitles(e, t = "srt", r) {
    let n = `/v2/transcript/${e}/${t}`;
    if (r) {
      const o = new URLSearchParams();
      o.set("chars_per_caption", r.toString()), n += `?${o.toString()}`;
    }
    return await (await this.fetch(n)).text();
  }
  /**
   * Retrieve the redacted audio URL of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the details of the redacted audio.
   * @deprecated Use `redactedAudio` instead.
   */
  redactions(e) {
    return this.redactedAudio(e);
  }
  /**
   * Retrieve the redacted audio URL of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the details of the redacted audio.
   */
  redactedAudio(e) {
    return this.fetchJson(`/v2/transcript/${e}/redacted-audio`);
  }
  /**
   * Retrieve the redacted audio file of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the fetch HTTP response of the redacted audio file.
   */
  async redactedAudioFile(e) {
    const { redacted_audio_url: t, status: r } = await this.redactedAudio(e);
    if (r !== "redacted_audio_ready")
      throw new Error(`Redacted audio status is ${r}`);
    const n = await fetch(t);
    if (!n.ok)
      throw new Error(`Failed to fetch redacted audio: ${n.statusText}`);
    return {
      arrayBuffer: n.arrayBuffer.bind(n),
      blob: n.blob.bind(n),
      body: n.body,
      bodyUsed: n.bodyUsed
    };
  }
}
const Dn = async (s) => bs.toWeb(Ps(s));
class Rn extends pe {
  /**
   * Upload a local file to AssemblyAI.
   * @param input - The local file path to upload, or a stream or buffer of the file to upload.
   * @returns A promise that resolves to the uploaded file URL.
   */
  async upload(e) {
    let t;
    return typeof e == "string" ? e.startsWith("data:") ? t = In(e) : t = await Dn(e) : t = e, (await this.fetchJson("/v2/upload", {
      method: "POST",
      body: t,
      headers: {
        "Content-Type": "application/octet-stream"
      },
      duplex: "half"
    })).upload_url;
  }
}
function In(s) {
  const e = s.split(","), t = e[0].match(/:(.*?);/)[1], r = atob(e[1]);
  let n = r.length;
  const i = new Uint8Array(n);
  for (; n--; )
    i[n] = r.charCodeAt(n);
  return new Blob([i], { type: t });
}
const Nn = "wss://streaming.assemblyai.com/v3/ws", Bt = '{"type":"Terminate"}';
class An {
  constructor(e) {
    if (this.listeners = {}, this.params = {
      ...e,
      websocketBaseUrl: e.websocketBaseUrl || Nn
    }, "token" in e && e.token && (this.token = e.token), "apiKey" in e && e.apiKey && (this.apiKey = e.apiKey), !(this.token || this.apiKey))
      throw new Error("API key or temporary token is required.");
  }
  connectionUrl() {
    const e = new URL(this.params.websocketBaseUrl ?? "");
    if (e.protocol !== "wss:")
      throw new Error("Invalid protocol, must be wss");
    const t = new URLSearchParams();
    return this.token && t.set("token", this.token), t.set("sample_rate", this.params.sampleRate.toString()), this.params.endOfTurnConfidenceThreshold && t.set("end_of_turn_confidence_threshold", this.params.endOfTurnConfidenceThreshold.toString()), this.params.minEndOfTurnSilenceWhenConfident && t.set("min_end_of_turn_silence_when_confident", this.params.minEndOfTurnSilenceWhenConfident.toString()), this.params.maxTurnSilence && t.set("max_turn_silence", this.params.maxTurnSilence.toString()), this.params.vadThreshold !== void 0 && t.set("vad_threshold", this.params.vadThreshold.toString()), this.params.formatTurns && t.set("format_turns", this.params.formatTurns.toString()), this.params.encoding && t.set("encoding", this.params.encoding.toString()), this.params.keytermsPrompt ? t.set("keyterms_prompt", JSON.stringify(this.params.keytermsPrompt)) : this.params.keyterms && (console.warn("[Deprecation Warning] `keyterms` is deprecated and will be removed in a future release. Please use `keytermsPrompt` instead."), t.set("keyterms_prompt", JSON.stringify(this.params.keyterms))), this.params.filterProfanity && t.set("filter_profanity", this.params.filterProfanity.toString()), this.params.speechModel && t.set("speech_model", this.params.speechModel.toString()), this.params.languageDetection !== void 0 && t.set("language_detection", this.params.languageDetection.toString()), this.params.inactivityTimeout !== void 0 && t.set("inactivity_timeout", this.params.inactivityTimeout.toString()), e.search = t.toString(), e;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(e, t) {
    this.listeners[e] = t;
  }
  connect() {
    return new Promise((e) => {
      if (this.socket)
        throw new Error("Already connected");
      const t = this.connectionUrl();
      this.token ? this.socket = De(t.toString()) : this.socket = De(t.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
      }, this.socket.onclose = ({ code: r, reason: n }) => {
        var i, o;
        n || r in At && (n = At[r]), (o = (i = this.listeners).close) == null || o.call(i, r, n);
      }, this.socket.onerror = (r) => {
        var n, i, o, a;
        r.error ? (i = (n = this.listeners).error) == null || i.call(n, r.error) : (a = (o = this.listeners).error) == null || a.call(o, new Error(r.message));
      }, this.socket.onmessage = ({ data: r }) => {
        var i, o, a, c, l, u, f;
        const n = JSON.parse(r.toString());
        if ("error" in n) {
          (o = (i = this.listeners).error) == null || o.call(i, new kn(n.error));
          return;
        }
        switch (n.type) {
          case "Begin": {
            e(n), (c = (a = this.listeners).open) == null || c.call(a, n);
            break;
          }
          case "Turn": {
            (u = (l = this.listeners).turn) == null || u.call(l, n);
            break;
          }
          case "Termination": {
            (f = this.sessionTerminatedResolve) == null || f.call(this);
            break;
          }
        }
      };
    });
  }
  stream() {
    return new Wt({
      write: (e) => {
        this.sendAudio(e);
      }
    });
  }
  sendAudio(e) {
    this.send(e);
  }
  send(e) {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN)
      throw new Error("Socket is not open for communication");
    this.socket.send(e);
  }
  async close(e = !0) {
    var t;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN)
        if (e) {
          const r = new Promise((n) => {
            this.sessionTerminatedResolve = n;
          });
          this.socket.send(Bt), await r;
        } else
          this.socket.send(Bt);
      (t = this.socket) != null && t.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class Ln extends pe {
  constructor(e) {
    super(e), this.baseServiceParams = e;
  }
  transcriber(e) {
    const t = { ...e };
    return !t.token && !t.apiKey && (t.apiKey = this.baseServiceParams.apiKey), new An(t);
  }
  async createTemporaryToken(e) {
    const t = new URLSearchParams();
    Object.entries(e).forEach(([o, a]) => {
      a != null && t.append(o, String(a));
    });
    const r = t.toString(), n = r ? `/v3/token?${r}` : "/v3/token";
    return (await this.fetchJson(n, {
      method: "GET"
    })).token;
  }
}
const Un = "https://api.assemblyai.com", Bn = "https://streaming.assemblyai.com";
class Cn {
  /**
   * Create a new AssemblyAI client.
   * @param params - The parameters for the service, including the API key and base URL, if any.
   */
  constructor(e) {
    e.baseUrl = e.baseUrl || Un, e.baseUrl && e.baseUrl.endsWith("/") && (e.baseUrl = e.baseUrl.slice(0, -1)), this.files = new Rn(e), this.transcripts = new Pn(e, this.files), this.lemur = new vn(e), this.realtime = new On(e), this.streaming = new Ln({
      ...e,
      baseUrl: e.streamingBaseUrl || Bn
    });
  }
}
function Fn() {
  const { app: s } = require("electron");
  if (s.isPackaged) {
    const t = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", r = jt.join(process.resourcesPath, "bin", t);
    if (Xe.existsSync(r))
      return r;
  }
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}
async function Mn(s) {
  const e = Rs.tmpdir(), t = jt.join(e, `audio-${Date.now()}.wav`), r = Fn();
  return new Promise((n, i) => {
    const o = Ds(r, [
      "-i",
      s,
      "-vn",
      // No video
      "-acodec",
      "pcm_s16le",
      // WAV format
      "-ar",
      "16000",
      // 16kHz sample rate (optimal for speech recognition)
      "-ac",
      "1",
      // Mono audio
      "-y",
      // Overwrite output file
      t
    ]);
    let a = "";
    o.stderr.on("data", (c) => {
      a += c.toString();
    }), o.on("close", (c) => {
      c === 0 ? n(t) : i(new Error(`FFmpeg exited with code ${c}: ${a}`));
    }), o.on("error", (c) => {
      i(new Error(`Failed to spawn ffmpeg: ${c.message}. Make sure ffmpeg is installed and in PATH.`));
    });
  });
}
async function $n(s, e) {
  try {
    if (!s.videoPath)
      return { success: !1, error: "Video path is required" };
    if (!s.apiKey)
      return { success: !1, error: "AssemblyAI API key is required" };
    if (!Xe.existsSync(s.videoPath))
      return { success: !1, error: `Video file not found: ${s.videoPath}` };
    e == null || e({
      status: "extracting",
      progress: 10,
      message: "Extracting audio from video..."
    });
    let t;
    try {
      t = await Mn(s.videoPath);
    } catch (a) {
      return {
        success: !1,
        error: `Failed to extract audio: ${a instanceof Error ? a.message : String(a)}`
      };
    }
    e == null || e({
      status: "uploading",
      progress: 20,
      message: "Uploading audio to AssemblyAI..."
    });
    const r = new Cn({ apiKey: s.apiKey });
    e == null || e({
      status: "transcribing",
      progress: 30,
      message: "Transcribing audio (this may take a few minutes)..."
    });
    const n = {
      audio: t
    };
    s.language && s.language !== "auto" && (n.language_code = s.language);
    const i = await r.transcripts.transcribe(n);
    e == null || e({
      status: "processing",
      progress: 90,
      message: "Processing transcription results..."
    });
    try {
      Xe.unlinkSync(t);
    } catch {
      console.warn("Failed to cleanup temp audio file:", t);
    }
    if (i.status === "error")
      return {
        success: !1,
        error: i.error || "Transcription failed"
      };
    const o = (i.words || []).map((a) => ({
      text: a.text,
      startMs: a.start,
      endMs: a.end,
      confidence: a.confidence
    }));
    return e == null || e({
      status: "complete",
      progress: 100,
      message: `Transcription complete! ${o.length} words detected.`
    }), {
      success: !0,
      words: o
    };
  } catch (t) {
    return console.error("Transcription error:", t), {
      success: !1,
      error: t instanceof Error ? t.message : "Unknown transcription error"
    };
  }
}
const Se = Is(import.meta.url), Wn = 100, Ct = 5, jn = 16, Vn = 1, Gn = 2, qn = 4;
class Kn {
  constructor() {
    v(this, "running", !1);
    v(this, "recordingId", "");
    v(this, "screenBounds", { width: 1920, height: 1080 });
    v(this, "recordingStartTime", 0);
    v(this, "events", []);
    v(this, "pendingDrag", null);
    v(this, "mouseHookAvailable", !1);
    v(this, "pollInterval", null);
    v(this, "windowsApi", null);
    v(this, "lastButtonState", { left: !1, right: !1, middle: !1 });
    this.initializeWindowsApi();
  }
  /**
   * Initialize Windows API bindings using koffi
   */
  initializeWindowsApi() {
    try {
      const e = Se("koffi");
      console.log("MouseEventDetector: koffi loaded successfully");
      const t = e.load("user32.dll");
      console.log("MouseEventDetector: user32.dll loaded"), e.struct("POINT", {
        x: "long",
        y: "long"
      });
      const r = t.func("short __stdcall GetAsyncKeyState(int vKey)"), n = t.func("bool __stdcall GetCursorPos(_Out_ POINT *lpPoint)");
      this.windowsApi = {
        GetAsyncKeyState: (i) => r(i),
        GetCursorPos: (i) => {
          const o = { x: 0, y: 0 }, a = n(o);
          return i[0] = o.x, i[1] = o.y, a;
        }
      }, this.mouseHookAvailable = !0, console.log("MouseEventDetector: Windows API initialized via koffi (no native compilation required)");
    } catch (e) {
      console.warn("MouseEventDetector: koffi not available, trying global-mouse-events fallback"), console.warn("MouseEventDetector: koffi error:", e), this.tryGlobalMouseEventsFallback();
    }
  }
  /**
   * Try to use global-mouse-events as fallback (requires native compilation)
   */
  tryGlobalMouseEventsFallback() {
    try {
      Se("global-mouse-events"), this.mouseHookAvailable = !0, console.log("MouseEventDetector: Using global-mouse-events fallback");
    } catch {
      console.warn("MouseEventDetector: No mouse detection available"), console.warn("MouseEventDetector: Install koffi (npm install koffi) for mouse detection without Visual Studio Build Tools"), this.mouseHookAvailable = !1;
    }
  }
  /**
   * Start capturing mouse events
   * @param recordingId - Unique identifier for the recording
   * @param screenBounds - Screen dimensions for coordinate validation
   */
  start(e, t) {
    if (this.running) {
      console.warn("MouseEventDetector: Already running");
      return;
    }
    this.recordingId = e, this.screenBounds = t, this.recordingStartTime = Date.now(), this.events = [], this.pendingDrag = null, this.running = !0, this.lastButtonState = { left: !1, right: !1, middle: !1 }, this.windowsApi ? this.startPolling() : this.initializeGlobalMouseEventsHook();
  }
  /**
   * Start polling Windows API for mouse state
   */
  startPolling() {
    this.windowsApi && (this.pollInterval = setInterval(() => {
      if (!this.running || !this.windowsApi) return;
      const e = [0, 0];
      this.windowsApi.GetCursorPos(e);
      const t = e[0], r = e[1], n = (this.windowsApi.GetAsyncKeyState(Vn) & 32768) !== 0, i = (this.windowsApi.GetAsyncKeyState(Gn) & 32768) !== 0, o = (this.windowsApi.GetAsyncKeyState(qn) & 32768) !== 0;
      n && !this.lastButtonState.left && this.onMouseDown(t, r, "left"), i && !this.lastButtonState.right && this.onMouseDown(t, r, "right"), o && !this.lastButtonState.middle && this.onMouseDown(t, r, "middle"), !n && this.lastButtonState.left && this.onMouseUp(t, r, "left"), !i && this.lastButtonState.right && this.onMouseUp(t, r, "right"), !o && this.lastButtonState.middle && this.onMouseUp(t, r, "middle"), this.lastButtonState = { left: n, right: i, middle: o };
    }, jn), console.log("MouseEventDetector: Polling started"));
  }
  /**
   * Handle mouse button down event
   */
  onMouseDown(e, t, r) {
    this.running && (this.pendingDrag && this.pendingDrag.button !== r && this.completePendingAsClick(), this.pendingDrag = {
      startTimestamp: this.getRelativeTimestamp(),
      startX: e,
      startY: t,
      button: r
    });
  }
  /**
   * Handle mouse button up event
   */
  onMouseUp(e, t, r) {
    if (!this.running || !this.pendingDrag || this.pendingDrag.button !== r) return;
    const n = this.getRelativeTimestamp(), i = n - this.pendingDrag.startTimestamp, o = Math.abs(e - this.pendingDrag.startX) > Ct || Math.abs(t - this.pendingDrag.startY) > Ct;
    if (i > Wn && o) {
      const a = {
        type: "drag",
        startTimestamp: this.pendingDrag.startTimestamp,
        endTimestamp: n,
        startX: this.pendingDrag.startX,
        startY: this.pendingDrag.startY,
        endX: e,
        endY: t
      };
      this.events.push(a);
    } else {
      const a = {
        type: "click",
        timestamp: this.pendingDrag.startTimestamp,
        x: this.pendingDrag.startX,
        y: this.pendingDrag.startY,
        button: r
      };
      this.events.push(a);
    }
    this.pendingDrag = null;
  }
  /**
   * Complete pending drag as a click (used when another button is pressed)
   */
  completePendingAsClick() {
    if (!this.pendingDrag) return;
    const e = {
      type: "click",
      timestamp: this.pendingDrag.startTimestamp,
      x: this.pendingDrag.startX,
      y: this.pendingDrag.startY,
      button: this.pendingDrag.button
    };
    this.events.push(e), this.pendingDrag = null;
  }
  /**
   * Initialize global-mouse-events hook (fallback for non-koffi systems)
   */
  initializeGlobalMouseEventsHook() {
    try {
      const e = Se("global-mouse-events");
      e.on("mousedown", (t) => {
        if (!this.running) return;
        const r = this.mapButton(t.button);
        this.onMouseDown(t.x, t.y, r);
      }), e.on("mouseup", (t) => {
        if (!this.running) return;
        const r = this.mapButton(t.button);
        this.onMouseUp(t.x, t.y, r);
      }), console.log("MouseEventDetector: global-mouse-events hook initialized");
    } catch {
      console.warn("MouseEventDetector: Failed to initialize global-mouse-events");
    }
  }
  /**
   * Stop capturing and return collected events
   */
  stop() {
    if (!this.running)
      return console.warn("MouseEventDetector: Not running"), this.createEmptyEventData();
    this.pollInterval && (clearInterval(this.pollInterval), this.pollInterval = null), this.cleanupGlobalMouseEvents(), this.running = !1, this.pendingDrag = null;
    const e = {
      version: 1,
      recordingId: this.recordingId,
      screenWidth: this.screenBounds.width,
      screenHeight: this.screenBounds.height,
      events: [...this.events]
    };
    return this.events = [], this.recordingId = "", console.log(`MouseEventDetector: Stopped, captured ${e.events.length} events`), e;
  }
  /**
   * Cleanup global-mouse-events listeners
   */
  cleanupGlobalMouseEvents() {
    try {
      const e = Se("global-mouse-events");
      e.removeAllListeners("mousedown"), e.removeAllListeners("mouseup");
    } catch {
    }
  }
  /**
   * Check if detector is currently running
   */
  isRunning() {
    return this.running;
  }
  /**
   * Check if mouse hook is available
   */
  isMouseHookAvailable() {
    return this.mouseHookAvailable;
  }
  /**
   * Get current timestamp relative to recording start
   */
  getRelativeTimestamp() {
    return Date.now() - this.recordingStartTime;
  }
  /**
   * Map button number to button name
   */
  mapButton(e) {
    switch (e) {
      case 1:
        return "left";
      case 2:
        return "right";
      case 3:
        return "middle";
      default:
        return "left";
    }
  }
  /**
   * Create empty event data structure
   */
  createEmptyEventData() {
    return {
      version: 1,
      recordingId: this.recordingId || "unknown",
      screenWidth: this.screenBounds.width,
      screenHeight: this.screenBounds.height,
      events: []
    };
  }
  /**
   * Manually add a click event (for testing or alternative input methods)
   */
  addClickEvent(e, t, r = "left") {
    if (!this.running) return;
    const n = {
      type: "click",
      timestamp: this.getRelativeTimestamp(),
      x: e,
      y: t,
      button: r
    };
    this.events.push(n);
  }
  /**
   * Manually add a drag event (for testing or alternative input methods)
   */
  addDragEvent(e, t, r, n, i = 200) {
    if (!this.running) return;
    const o = this.getRelativeTimestamp(), a = {
      type: "drag",
      startTimestamp: o,
      endTimestamp: o + i,
      startX: e,
      startY: t,
      endX: r,
      endY: n
    };
    this.events.push(a);
  }
}
const Ye = new Kn();
let ve = null;
function Hn(s, e, t, r, n) {
  d.handle("get-sources", async (o, a) => (await ps.getSources(a)).map((l) => ({
    id: l.id,
    name: l.name,
    display_id: l.display_id,
    thumbnail: l.thumbnail ? l.thumbnail.toDataURL() : null,
    appIcon: l.appIcon ? l.appIcon.toDataURL() : null
  }))), d.handle("select-source", (o, a) => {
    ve = a;
    const c = r();
    return c && c.close(), ve;
  }), d.handle("get-selected-source", () => ve), d.handle("open-source-selector", () => {
    const o = r();
    if (o) {
      o.focus();
      return;
    }
    e();
  }), d.handle("switch-to-editor", () => {
    const o = t();
    o && o.close(), s();
  }), d.handle("store-recorded-video", async (o, a, c) => {
    try {
      const l = m.join(q, c);
      return await P.writeFile(l, Buffer.from(a)), i = l, {
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
  }), d.handle("get-recorded-video-path", async () => {
    try {
      const a = (await P.readdir(q)).filter((u) => u.endsWith(".webm"));
      if (a.length === 0)
        return { success: !1, message: "No recorded video found" };
      const c = a.sort().reverse()[0];
      return { success: !0, path: m.join(q, c) };
    } catch (o) {
      return console.error("Failed to get video path:", o), { success: !1, message: "Failed to get video path", error: String(o) };
    }
  }), d.handle("set-recording-state", (o, a) => {
    n && n(a, (ve || { name: "Screen" }).name);
  }), d.handle("open-external-url", async (o, a) => {
    try {
      return await ms.openExternal(a), { success: !0 };
    } catch (c) {
      return console.error("Failed to open URL:", c), { success: !1, error: String(c) };
    }
  }), d.handle("get-asset-base-path", () => {
    try {
      return D.isPackaged ? m.join(process.resourcesPath, "assets") : m.join(D.getAppPath(), "public", "assets");
    } catch (o) {
      return console.error("Failed to resolve asset base path:", o), null;
    }
  }), d.handle("save-exported-video", async (o, a, c) => {
    try {
      const l = t(), u = c.toLowerCase().endsWith(".gif"), f = u ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }], E = {
        title: u ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: m.join(D.getPath("downloads"), c),
        filters: f,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      }, _ = l ? await Be.showSaveDialog(l, E) : await Be.showSaveDialog(E);
      return _.canceled || !_.filePath ? {
        success: !1,
        cancelled: !0,
        message: "Export cancelled"
      } : (await P.writeFile(_.filePath, Buffer.from(a)), {
        success: !0,
        path: _.filePath,
        message: "Video exported successfully"
      });
    } catch (l) {
      return console.error("Failed to save exported video:", l), {
        success: !1,
        message: "Failed to save exported video",
        error: String(l)
      };
    }
  }), d.handle("open-video-file-picker", async () => {
    try {
      const o = await Be.showOpenDialog({
        title: "Select Video File",
        defaultPath: q,
        filters: [
          { name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      return o.canceled || o.filePaths.length === 0 ? { success: !1, cancelled: !0 } : {
        success: !0,
        path: o.filePaths[0]
      };
    } catch (o) {
      return console.error("Failed to open file picker:", o), {
        success: !1,
        message: "Failed to open file picker",
        error: String(o)
      };
    }
  });
  let i = null;
  d.handle("set-current-video-path", (o, a) => (i = a, { success: !0 })), d.handle("get-current-video-path", () => i ? { success: !0, path: i } : { success: !1 }), d.handle("clear-current-video-path", () => (i = null, { success: !0 })), d.handle("get-platform", () => process.platform), d.handle("presets:get", async () => await js()), d.handle("presets:save", async (o, a) => await Vs(a)), d.handle("presets:update", async (o, a, c) => await Gs(a, c)), d.handle("presets:delete", async (o, a) => await qs(a)), d.handle("presets:duplicate", async (o, a) => await Ks(a)), d.handle("presets:setDefault", async (o, a) => await Hs(a)), d.handle("keystroke:start", async () => {
    try {
      return await Me.start(), { success: !0 };
    } catch (o) {
      return console.error("Failed to start keystroke service:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:stop", () => {
    try {
      return Me.stop(), { success: !0 };
    } catch (o) {
      return console.error("Failed to stop keystroke service:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:get-settings", async () => await Zs()), d.handle("keystroke:set-settings", async (o, a) => await Qs(a)), d.handle("keystroke:show-overlay", async () => {
    try {
      let o = Cs();
      return !o || o.isDestroyed() ? (o = Bs(), Me.onEvent((a) => {
        o && !o.isDestroyed() && o.webContents.send("keystroke:event", a);
      })) : Ms(), { success: !0 };
    } catch (o) {
      return console.error("Failed to show keystroke overlay:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:hide-overlay", async () => {
    try {
      return Fs(), { success: !0 };
    } catch (o) {
      return console.error("Failed to hide keystroke overlay:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("transcribe-video", async (o, a) => await $n(a, (c) => {
    const l = t();
    l && !l.isDestroyed() && l.webContents.send("transcription-progress", c);
  })), d.handle("auto-zoom:start-detection", async (o, a, c) => {
    try {
      return Ye.start(a, c), { success: !0 };
    } catch (l) {
      return console.error("Failed to start mouse event detection:", l), { success: !1, error: String(l) };
    }
  }), d.handle("auto-zoom:stop-detection", async () => {
    try {
      return { success: !0, data: Ye.stop() };
    } catch (o) {
      return console.error("Failed to stop mouse event detection:", o), { success: !1, error: String(o) };
    }
  }), d.handle("auto-zoom:save-events", async (o, a, c) => {
    try {
      const l = m.join(q, c);
      return await P.writeFile(l, JSON.stringify(a, null, 2)), { success: !0, path: l };
    } catch (l) {
      return console.error("Failed to save mouse events:", l), { success: !1, error: String(l) };
    }
  }), d.handle("auto-zoom:get-events", async (o, a) => {
    try {
      const c = a.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".events.json");
      try {
        const l = await P.readFile(c, "utf-8");
        return { success: !0, data: JSON.parse(l) };
      } catch (l) {
        if (l.code === "ENOENT")
          return { success: !1, notFound: !0 };
        throw l;
      }
    } catch (c) {
      return console.error("Failed to get mouse events:", c), { success: !1, error: String(c) };
    }
  }), d.handle("auto-zoom:is-running", () => Ye.isRunning());
}
const zn = m.dirname($t(import.meta.url)), q = m.join(D.getPath("userData"), "recordings");
async function Jn() {
  try {
    await P.mkdir(q, { recursive: !0 }), console.log("RECORDINGS_DIR:", q), console.log("User Data Path:", D.getPath("userData"));
  } catch (s) {
    console.error("Failed to create recordings directory:", s);
  }
}
process.env.APP_ROOT = m.join(zn, "..");
const Yn = process.env.VITE_DEV_SERVER_URL, Ni = m.join(process.env.APP_ROOT, "dist-electron"), as = m.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Yn ? m.join(process.env.APP_ROOT, "public") : as;
let b = null, le = null, Y = null, ls = "";
const cs = hs("openscreen.png"), Xn = hs("rec-button.png");
function lt() {
  b = As();
}
function Ft() {
  Y = new _s(cs);
}
function hs(s) {
  return gs.createFromPath(m.join(process.env.VITE_PUBLIC || as, s)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function Mt(s = !1) {
  if (!Y) return;
  const e = s ? Xn : cs, t = s ? `Recording: ${ls}` : "OpenScreen", r = s ? [
    {
      label: "Stop Recording",
      click: () => {
        b && !b.isDestroyed() && b.webContents.send("stop-recording-from-tray");
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        b && !b.isDestroyed() ? b.isMinimized() && b.restore() : lt();
      }
    },
    {
      label: "Quit",
      click: () => {
        D.quit();
      }
    }
  ];
  Y.setImage(e), Y.setToolTip(t), Y.setContextMenu(ys.buildFromTemplate(r));
}
function Zn() {
  b && (b.close(), b = null), b = Ls();
}
function Qn() {
  return le = Us(), le.on("closed", () => {
    le = null;
  }), le;
}
D.on("window-all-closed", () => {
});
D.on("activate", () => {
  he.getAllWindows().length === 0 && lt();
});
D.whenReady().then(async () => {
  const { ipcMain: s } = await import("electron");
  s.on("hud-overlay-close", () => {
    D.quit();
  }), Ft(), Mt(), await Jn(), Hn(
    Zn,
    Qn,
    () => b,
    () => le,
    (e, t) => {
      ls = t, Y || Ft(), Mt(e), e || b && b.restore();
    }
  ), lt();
});
export {
  Ni as M,
  q as R,
  Yn as V,
  as as a,
  er as g
};
