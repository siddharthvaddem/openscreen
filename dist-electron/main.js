var ws = Object.defineProperty;
var Es = (s, e, t) => e in s ? ws(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var g = (s, e, t) => Es(s, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as d, screen as Te, BrowserWindow as de, app as O, desktopCapturer as ks, shell as bs, dialog as Ue, nativeImage as Ts, Tray as xs, Menu as Os } from "electron";
import { fileURLToPath as Ht } from "node:url";
import p from "node:path";
import E from "node:fs/promises";
import { WritableStream as zt } from "stream/web";
import Ps from "events";
import Ds from "https";
import Rs from "http";
import Ns from "net";
import Is from "tls";
import at from "crypto";
import fe, { Readable as As } from "stream";
import Ls from "url";
import Fs from "zlib";
import Cs from "buffer";
import * as Qe from "fs";
import { createReadStream as Us } from "fs";
import { spawn as Bs } from "child_process";
import * as Jt from "path";
import * as Ms from "os";
import { createRequire as $s } from "module";
const ee = p.dirname(Ht(import.meta.url)), Ks = p.join(ee, ".."), K = process.env.VITE_DEV_SERVER_URL, Ne = p.join(Ks, "dist");
let Z = null, I = null;
d.on("hud-overlay-hide", () => {
  Z && !Z.isDestroyed() && Z.minimize();
});
function Ws() {
  const s = Te.getPrimaryDisplay(), { workArea: e } = s, t = 500, r = 350, n = Math.floor(e.x + (e.width - t) / 2), i = Math.floor(e.y + e.height - r - 5), o = new de({
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
      preload: p.join(ee, "preload.mjs"),
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
        preload: p.join(ee, "preload.mjs"),
        nodeIntegration: !1,
        contextIsolation: !0
      }
    }
  } : { action: "deny" }), Z = o, o.on("closed", () => {
    Z === o && (Z = null);
  }), K ? o.loadURL(K + "?windowType=hud-overlay") : o.loadFile(p.join(Ne, "index.html"), {
    query: { windowType: "hud-overlay" }
  }), o;
}
function js() {
  const s = process.platform === "darwin", e = new de({
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
      preload: p.join(ee, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1,
      backgroundThrottling: !1
    }
  });
  return e.maximize(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), K ? e.loadURL(K + "?windowType=editor") : e.loadFile(p.join(Ne, "index.html"), {
    query: { windowType: "editor" }
  }), e;
}
function Vs() {
  const { width: s, height: e } = Te.getPrimaryDisplay().workAreaSize, t = new de({
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
      preload: p.join(ee, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  return K ? t.loadURL(K + "?windowType=source-selector") : t.loadFile(p.join(Ne, "index.html"), {
    query: { windowType: "source-selector" }
  }), t;
}
function Gs(s) {
  Te.getAllDisplays();
  const e = Te.getPrimaryDisplay(), { bounds: t } = e, r = 400, n = 100, i = Math.floor(t.x + (t.width - r) / 2), o = Math.floor(t.y + t.height - n - 50), a = new de({
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
      preload: p.join(ee, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return a.setIgnoreMouseEvents(!0), K ? a.loadURL(K + "?windowType=keystroke-overlay") : a.loadFile(p.join(Ne, "index.html"), {
    query: { windowType: "keystroke-overlay" }
  }), I = a, a.on("closed", () => {
    I === a && (I = null);
  }), a;
}
function qs() {
  return I;
}
function Hs() {
  I && !I.isDestroyed() && I.hide();
}
function zs() {
  I && !I.isDestroyed() && I.show();
}
const Js = "presets.json", Ys = 1;
function et() {
  return p.join(O.getPath("userData"), Js);
}
function Be() {
  return {
    version: Ys,
    defaultPresetId: null,
    presets: []
  };
}
async function te() {
  try {
    const s = et(), e = await E.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.presets || !Array.isArray(t.presets) ? (console.warn("Invalid presets file, creating new store"), Be()) : t;
  } catch (s) {
    if (s.code === "ENOENT")
      return Be();
    console.error("Failed to read presets file:", s);
    try {
      const e = et(), t = e + ".backup." + Date.now();
      await E.rename(e, t), console.log("Backed up corrupt presets file to:", t);
    } catch {
    }
    return Be();
  }
}
async function he(s) {
  const e = et();
  await E.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function Xs() {
  try {
    const s = await te();
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
async function Zs(s) {
  try {
    const e = await te(), t = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    return t.isDefault && (e.presets = e.presets.map((r) => ({ ...r, isDefault: !1 })), e.defaultPresetId = t.id), e.presets.push(t), await he(e), { success: !0, preset: t };
  } catch (e) {
    return console.error("Failed to save preset:", e), { success: !1, error: String(e) };
  }
}
async function Qs(s, e) {
  try {
    const t = await te(), r = t.presets.findIndex((n) => n.id === s);
    return r === -1 ? { success: !1, error: "Preset not found" } : (e.isDefault === !0 ? (t.presets = t.presets.map((n) => ({ ...n, isDefault: !1 })), t.defaultPresetId = s) : e.isDefault === !1 && t.defaultPresetId === s && (t.defaultPresetId = null), t.presets[r] = { ...t.presets[r], ...e }, await he(t), { success: !0, preset: t.presets[r] });
  } catch (t) {
    return console.error("Failed to update preset:", t), { success: !1, error: String(t) };
  }
}
async function er(s) {
  try {
    const e = await te(), t = e.presets.findIndex((r) => r.id === s);
    return t === -1 ? { success: !1, error: "Preset not found" } : (e.defaultPresetId === s && (e.defaultPresetId = null), e.presets.splice(t, 1), await he(e), { success: !0 });
  } catch (e) {
    return console.error("Failed to delete preset:", e), { success: !1, error: String(e) };
  }
}
async function tr(s) {
  try {
    const e = await te(), t = e.presets.find((n) => n.id === s);
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
    return e.presets.push(r), await he(e), { success: !0, preset: r };
  } catch (e) {
    return console.error("Failed to duplicate preset:", e), { success: !1, error: String(e) };
  }
}
async function sr(s) {
  try {
    const e = await te();
    if (e.presets = e.presets.map((t) => ({ ...t, isDefault: !1 })), e.defaultPresetId = null, s) {
      const t = e.presets.find((r) => r.id === s);
      if (!t)
        return { success: !1, error: "Preset not found" };
      t.isDefault = !0, e.defaultPresetId = s;
    }
    return await he(e), { success: !0 };
  } catch (e) {
    return console.error("Failed to set default preset:", e), { success: !1, error: String(e) };
  }
}
let Me = null;
async function rr() {
  if (!Me)
    try {
      Me = await import("uiohook-napi");
    } catch (s) {
      throw console.error("[KeystrokeService] Failed to load uiohook-napi:", s), s;
    }
  return Me;
}
class nr {
  constructor() {
    g(this, "running", !1);
    g(this, "eventCallback", null);
    g(this, "errorCallback", null);
    g(this, "keydownHandler", null);
    g(this, "clickHandler", null);
    g(this, "uiohook", null);
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
        this.uiohook = await rr(), this.setupEventHandlers(), this.uiohook.uIOhook.start(), this.running = !0;
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
        const r = {
          1: "left",
          2: "right",
          3: "middle"
        }, n = t.button, i = r[n];
        if (i) {
          const o = {
            type: "mouse",
            timestamp: Date.now(),
            button: i,
            modifiers: {
              ctrl: t.ctrlKey ?? !1,
              alt: t.altKey ?? !1,
              shift: t.shiftKey ?? !1,
              meta: t.metaKey ?? !1
            }
          };
          this.eventCallback(o);
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
const q = new nr(), lt = {
  enabled: !1,
  position: "bottom-center",
  fadeDurationMs: 1500,
  fadeDelayMs: 1e3,
  groupingThresholdMs: 100,
  showMouseClicks: !0,
  textScale: 1
}, ir = "keystroke-settings.json", Yt = 1;
function tt() {
  return p.join(O.getPath("userData"), ir);
}
function $e() {
  return {
    version: Yt,
    settings: { ...lt }
  };
}
async function Xt() {
  try {
    const s = tt(), e = await E.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.settings || typeof t.settings != "object" ? (console.warn("Invalid keystroke settings file, creating new store"), $e()) : {
      version: t.version || Yt,
      settings: { ...lt, ...t.settings }
    };
  } catch (s) {
    if (s instanceof Error && "code" in s && s.code === "ENOENT")
      return $e();
    console.error("Failed to read keystroke settings file:", s);
    try {
      const e = tt(), t = e + ".backup." + Date.now();
      await E.rename(e, t), console.log("Backed up corrupt keystroke settings file to:", t);
    } catch {
    }
    return $e();
  }
}
async function or(s) {
  const e = tt();
  await E.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function ar() {
  try {
    return {
      success: !0,
      settings: (await Xt()).settings
    };
  } catch (s) {
    return console.error("Failed to get keystroke settings:", s), {
      success: !1,
      settings: { ...lt }
    };
  }
}
async function lr(s) {
  try {
    const e = await Xt();
    return e.settings = { ...e.settings, ...s }, await or(e), { success: !0, settings: e.settings };
  } catch (e) {
    return console.error("Failed to save keystroke settings:", e), { success: !1, error: String(e) };
  }
}
function cr(s) {
  return s && s.__esModule && Object.prototype.hasOwnProperty.call(s, "default") ? s.default : s;
}
var xe = { exports: {} };
const Zt = ["nodebuffer", "arraybuffer", "fragments"], Qt = typeof Blob < "u";
Qt && Zt.push("blob");
var W = {
  BINARY_TYPES: Zt,
  CLOSE_TIMEOUT: 3e4,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: Qt,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
}, ur, dr;
const { EMPTY_BUFFER: fr } = W, st = Buffer[Symbol.species];
function hr(s, e) {
  if (s.length === 0) return fr;
  if (s.length === 1) return s[0];
  const t = Buffer.allocUnsafe(e);
  let r = 0;
  for (let n = 0; n < s.length; n++) {
    const i = s[n];
    t.set(i, r), r += i.length;
  }
  return r < e ? new st(t.buffer, t.byteOffset, r) : t;
}
function es(s, e, t, r, n) {
  for (let i = 0; i < n; i++)
    t[r + i] = s[i] ^ e[i & 3];
}
function ts(s, e) {
  for (let t = 0; t < s.length; t++)
    s[t] ^= e[t & 3];
}
function mr(s) {
  return s.length === s.buffer.byteLength ? s.buffer : s.buffer.slice(s.byteOffset, s.byteOffset + s.length);
}
function rt(s) {
  if (rt.readOnly = !0, Buffer.isBuffer(s)) return s;
  let e;
  return s instanceof ArrayBuffer ? e = new st(s) : ArrayBuffer.isView(s) ? e = new st(s.buffer, s.byteOffset, s.byteLength) : (e = Buffer.from(s), rt.readOnly = !1), e;
}
xe.exports = {
  concat: hr,
  mask: es,
  toArrayBuffer: mr,
  toBuffer: rt,
  unmask: ts
};
if (!process.env.WS_NO_BUFFER_UTIL)
  try {
    const s = require("bufferutil");
    dr = xe.exports.mask = function(e, t, r, n, i) {
      i < 48 ? es(e, t, r, n, i) : s.mask(e, t, r, n, i);
    }, ur = xe.exports.unmask = function(e, t) {
      e.length < 32 ? ts(e, t) : s.unmask(e, t);
    };
  } catch {
  }
var Ie = xe.exports;
const pt = Symbol("kDone"), Ke = Symbol("kRun");
let pr = class {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(e) {
    this[pt] = () => {
      this.pending--, this[Ke]();
    }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(e) {
    this.jobs.push(e), this[Ke]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [Ke]() {
    if (this.pending !== this.concurrency && this.jobs.length) {
      const e = this.jobs.shift();
      this.pending++, e(this[pt]);
    }
  }
};
var gr = pr;
const ie = Fs, gt = Ie, yr = gr, { kStatusCode: ss } = W, _r = Buffer[Symbol.species], Sr = Buffer.from([0, 0, 255, 255]), Oe = Symbol("permessage-deflate"), F = Symbol("total-length"), J = Symbol("callback"), B = Symbol("buffers"), Q = Symbol("error");
let ge, vr = class {
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
    if (this._maxPayload = r | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!t, this._deflate = null, this._inflate = null, this.params = null, !ge) {
      const n = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      ge = new yr(n);
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
      const e = this._deflate[J];
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
    ge.add((n) => {
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
    ge.add((n) => {
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
      const i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ie.Z_DEFAULT_WINDOWBITS : this.params[i];
      this._inflate = ie.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits: o
      }), this._inflate[Oe] = this, this._inflate[F] = 0, this._inflate[B] = [], this._inflate.on("error", Er), this._inflate.on("data", rs);
    }
    this._inflate[J] = r, this._inflate.write(e), t && this._inflate.write(Sr), this._inflate.flush(() => {
      const i = this._inflate[Q];
      if (i) {
        this._inflate.close(), this._inflate = null, r(i);
        return;
      }
      const o = gt.concat(
        this._inflate[B],
        this._inflate[F]
      );
      this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[F] = 0, this._inflate[B] = [], t && this.params[`${n}_no_context_takeover`] && this._inflate.reset()), r(null, o);
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
      const i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ie.Z_DEFAULT_WINDOWBITS : this.params[i];
      this._deflate = ie.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits: o
      }), this._deflate[F] = 0, this._deflate[B] = [], this._deflate.on("data", wr);
    }
    this._deflate[J] = r, this._deflate.write(e), this._deflate.flush(ie.Z_SYNC_FLUSH, () => {
      if (!this._deflate)
        return;
      let i = gt.concat(
        this._deflate[B],
        this._deflate[F]
      );
      t && (i = new _r(i.buffer, i.byteOffset, i.length - 4)), this._deflate[J] = null, this._deflate[F] = 0, this._deflate[B] = [], t && this.params[`${n}_no_context_takeover`] && this._deflate.reset(), r(null, i);
    });
  }
};
var ct = vr;
function wr(s) {
  this[B].push(s), this[F] += s.length;
}
function rs(s) {
  if (this[F] += s.length, this[Oe]._maxPayload < 1 || this[F] <= this[Oe]._maxPayload) {
    this[B].push(s);
    return;
  }
  this[Q] = new RangeError("Max payload size exceeded"), this[Q].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[Q][ss] = 1009, this.removeListener("data", rs), this.reset();
}
function Er(s) {
  if (this[Oe]._inflate = null, this[Q]) {
    this[J](this[Q]);
    return;
  }
  s[ss] = 1007, this[J](s);
}
var Pe = { exports: {} }, yt;
const { isUtf8: _t } = Cs, { hasBlob: kr } = W, br = [
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
function Tr(s) {
  return s >= 1e3 && s <= 1014 && s !== 1004 && s !== 1005 && s !== 1006 || s >= 3e3 && s <= 4999;
}
function nt(s) {
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
function xr(s) {
  return kr && typeof s == "object" && typeof s.arrayBuffer == "function" && typeof s.type == "string" && typeof s.stream == "function" && (s[Symbol.toStringTag] === "Blob" || s[Symbol.toStringTag] === "File");
}
Pe.exports = {
  isBlob: xr,
  isValidStatusCode: Tr,
  isValidUTF8: nt,
  tokenChars: br
};
if (_t)
  yt = Pe.exports.isValidUTF8 = function(s) {
    return s.length < 24 ? nt(s) : _t(s);
  };
else if (!process.env.WS_NO_UTF_8_VALIDATE)
  try {
    const s = require("utf-8-validate");
    yt = Pe.exports.isValidUTF8 = function(e) {
      return e.length < 32 ? nt(e) : s(e);
    };
  } catch {
  }
var me = Pe.exports;
const { Writable: Or } = fe, St = ct, {
  BINARY_TYPES: Pr,
  EMPTY_BUFFER: vt,
  kStatusCode: Dr,
  kWebSocket: Rr
} = W, { concat: We, toArrayBuffer: Nr, unmask: Ir } = Ie, { isValidStatusCode: Ar, isValidUTF8: wt } = me, ye = Buffer[Symbol.species], P = 0, Et = 1, kt = 2, bt = 3, je = 4, Ve = 5, _e = 6;
let Lr = class extends Or {
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
    super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : !0, this._binaryType = e.binaryType || Pr[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[Rr] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = !1, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = !1, this._fin = !1, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = !1, this._loop = !1, this._state = P;
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
    if (this._opcode === 8 && this._state == P) return r();
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
      return this._buffers[0] = new ye(
        r.buffer,
        r.byteOffset + e,
        r.length - e
      ), new ye(r.buffer, r.byteOffset, e);
    }
    const t = Buffer.allocUnsafe(e);
    do {
      const r = this._buffers[0], n = t.length - e;
      e >= r.length ? t.set(this._buffers.shift(), n) : (t.set(new Uint8Array(r.buffer, r.byteOffset, e), n), this._buffers[0] = new ye(
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
        case P:
          this.getInfo(e);
          break;
        case Et:
          this.getPayloadLength16(e);
          break;
        case kt:
          this.getPayloadLength64(e);
          break;
        case bt:
          this.getMask();
          break;
        case je:
          this.getData(e);
          break;
        case Ve:
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
    if (r && !this._extensions[St.extensionName]) {
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
    this._payloadLength === 126 ? this._state = Et : this._payloadLength === 127 ? this._state = kt : this.haveLength(e);
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
    this._masked ? this._state = bt : this._state = je;
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
    this._mask = this.consume(4), this._state = je;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(e) {
    let t = vt;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = !1;
        return;
      }
      t = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && Ir(t, this._mask);
    }
    if (this._opcode > 7) {
      this.controlMessage(t, e);
      return;
    }
    if (this._compressed) {
      this._state = Ve, this.decompress(t, e);
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
    this._extensions[St.extensionName].decompress(e, this._fin, (n, i) => {
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
      this.dataMessage(t), this._state === P && this.startLoop(t);
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
      this._state = P;
      return;
    }
    const t = this._messageLength, r = this._fragments;
    if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
      let n;
      this._binaryType === "nodebuffer" ? n = We(r, t) : this._binaryType === "arraybuffer" ? n = Nr(We(r, t)) : this._binaryType === "blob" ? n = new Blob(r) : n = r, this._allowSynchronousEvents ? (this.emit("message", n, !0), this._state = P) : (this._state = _e, setImmediate(() => {
        this.emit("message", n, !0), this._state = P, this.startLoop(e);
      }));
    } else {
      const n = We(r, t);
      if (!this._skipUTF8Validation && !wt(n)) {
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
      this._state === Ve || this._allowSynchronousEvents ? (this.emit("message", n, !1), this._state = P) : (this._state = _e, setImmediate(() => {
        this.emit("message", n, !1), this._state = P, this.startLoop(e);
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
        this._loop = !1, this.emit("conclude", 1005, vt), this.end();
      else {
        const r = e.readUInt16BE(0);
        if (!Ar(r)) {
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
        const n = new ye(
          e.buffer,
          e.byteOffset + 2,
          e.length - 2
        );
        if (!this._skipUTF8Validation && !wt(n)) {
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
      this._state = P;
      return;
    }
    this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = P) : (this._state = _e, setImmediate(() => {
      this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = P, this.startLoop(t);
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
    return Error.captureStackTrace(o, this.createError), o.code = i, o[Dr] = n, o;
  }
};
var Fr = Lr;
const { Duplex: qi } = fe, { randomFillSync: Cr } = at, Tt = ct, { EMPTY_BUFFER: Ur, kWebSocket: Br, NOOP: Mr } = W, { isBlob: H, isValidStatusCode: $r } = me, { mask: xt, toBuffer: j } = Ie, D = Symbol("kByteLength"), Kr = Buffer.alloc(4), ke = 8 * 1024;
let V, z = ke;
const R = 0, Wr = 1, jr = 2;
let Vr = class G {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(e, t, r) {
    this._extensions = t || {}, r && (this._generateMask = r, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = !0, this._compress = !1, this._bufferedBytes = 0, this._queue = [], this._state = R, this.onerror = Mr, this[Br] = void 0;
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
    t.mask && (r = t.maskBuffer || Kr, t.generateMask ? t.generateMask(r) : (z === ke && (V === void 0 && (V = Buffer.alloc(ke)), Cr(V, 0, ke), z = 0), r[0] = V[z++], r[1] = V[z++], r[2] = V[z++], r[3] = V[z++]), o = (r[0] | r[1] | r[2] | r[3]) === 0, i = 6);
    let a;
    typeof e == "string" ? (!t.mask || o) && t[D] !== void 0 ? a = t[D] : (e = Buffer.from(e), a = e.length) : (a = e.length, n = t.mask && t.readOnly && !o);
    let c = a;
    a >= 65536 ? (i += 8, c = 127) : a > 125 && (i += 2, c = 126);
    const l = Buffer.allocUnsafe(n ? a + i : i);
    return l[0] = t.fin ? t.opcode | 128 : t.opcode, t.rsv1 && (l[0] |= 64), l[1] = c, c === 126 ? l.writeUInt16BE(a, 2) : c === 127 && (l[2] = l[3] = 0, l.writeUIntBE(a, 4, 6)), t.mask ? (l[1] |= 128, l[i - 4] = r[0], l[i - 3] = r[1], l[i - 2] = r[2], l[i - 1] = r[3], o ? [l, e] : n ? (xt(e, r, l, i, a), [l]) : (xt(e, r, e, 0, a), [l, e])) : [l, e];
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
      i = Ur;
    else {
      if (typeof e != "number" || !$r(e))
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
      [D]: i.length,
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
    if (typeof e == "string" ? (n = Buffer.byteLength(e), i = !1) : H(e) ? (n = e.size, i = !1) : (e = j(e), n = e.length, i = j.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [D]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly: i,
      rsv1: !1
    };
    H(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== R ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(G.frame(e, o), r);
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
    if (typeof e == "string" ? (n = Buffer.byteLength(e), i = !1) : H(e) ? (n = e.size, i = !1) : (e = j(e), n = e.length, i = j.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [D]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly: i,
      rsv1: !1
    };
    H(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== R ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(G.frame(e, o), r);
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
    const n = this._extensions[Tt.extensionName];
    let i = t.binary ? 2 : 1, o = t.compress, a, c;
    typeof e == "string" ? (a = Buffer.byteLength(e), c = !1) : H(e) ? (a = e.size, c = !1) : (e = j(e), a = e.length, c = j.readOnly), this._firstFragment ? (this._firstFragment = !1, o && n && n.params[n._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = a >= n._threshold), this._compress = o) : (o = !1, i = 0), t.fin && (this._firstFragment = !0);
    const l = {
      [D]: a,
      fin: t.fin,
      generateMask: this._generateMask,
      mask: t.mask,
      maskBuffer: this._maskBuffer,
      opcode: i,
      readOnly: c,
      rsv1: o
    };
    H(e) ? this._state !== R ? this.enqueue([this.getBlobData, e, this._compress, l, r]) : this.getBlobData(e, this._compress, l, r) : this._state !== R ? this.enqueue([this.dispatch, e, this._compress, l, r]) : this.dispatch(e, this._compress, l, r);
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
    this._bufferedBytes += r[D], this._state = jr, e.arrayBuffer().then((i) => {
      if (this._socket.destroyed) {
        const a = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(it, this, a, n);
        return;
      }
      this._bufferedBytes -= r[D];
      const o = j(i);
      t ? this.dispatch(o, t, r, n) : (this._state = R, this.sendFrame(G.frame(o, r), n), this.dequeue());
    }).catch((i) => {
      process.nextTick(qr, this, i, n);
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
    const i = this._extensions[Tt.extensionName];
    this._bufferedBytes += r[D], this._state = Wr, i.compress(e, r.fin, (o, a) => {
      if (this._socket.destroyed) {
        const c = new Error(
          "The socket was closed while data was being compressed"
        );
        it(this, c, n);
        return;
      }
      this._bufferedBytes -= r[D], this._state = R, r.readOnly = !1, this.sendFrame(G.frame(a, r), n), this.dequeue();
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
      this._bufferedBytes -= e[3][D], Reflect.apply(e[0], this, e.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(e) {
    this._bufferedBytes += e[3][D], this._queue.push(e);
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
var Gr = Vr;
function it(s, e, t) {
  typeof t == "function" && t(e);
  for (let r = 0; r < s._queue.length; r++) {
    const n = s._queue[r], i = n[n.length - 1];
    typeof i == "function" && i(e);
  }
}
function qr(s, e, t) {
  it(s, e, t), s.onerror(e);
}
const { kForOnEventAttribute: oe, kListener: Ge } = W, Ot = Symbol("kCode"), Pt = Symbol("kData"), Dt = Symbol("kError"), Rt = Symbol("kMessage"), Nt = Symbol("kReason"), Y = Symbol("kTarget"), It = Symbol("kType"), At = Symbol("kWasClean");
class se {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(e) {
    this[Y] = null, this[It] = e;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[Y];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[It];
  }
}
Object.defineProperty(se.prototype, "target", { enumerable: !0 });
Object.defineProperty(se.prototype, "type", { enumerable: !0 });
class Ae extends se {
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
    super(e), this[Ot] = t.code === void 0 ? 0 : t.code, this[Nt] = t.reason === void 0 ? "" : t.reason, this[At] = t.wasClean === void 0 ? !1 : t.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[Ot];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[Nt];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[At];
  }
}
Object.defineProperty(Ae.prototype, "code", { enumerable: !0 });
Object.defineProperty(Ae.prototype, "reason", { enumerable: !0 });
Object.defineProperty(Ae.prototype, "wasClean", { enumerable: !0 });
class ut extends se {
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
    super(e), this[Dt] = t.error === void 0 ? null : t.error, this[Rt] = t.message === void 0 ? "" : t.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[Dt];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[Rt];
  }
}
Object.defineProperty(ut.prototype, "error", { enumerable: !0 });
Object.defineProperty(ut.prototype, "message", { enumerable: !0 });
class ns extends se {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(e, t = {}) {
    super(e), this[Pt] = t.data === void 0 ? null : t.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[Pt];
  }
}
Object.defineProperty(ns.prototype, "data", { enumerable: !0 });
const Hr = {
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
      if (!t[oe] && n[Ge] === e && !n[oe])
        return;
    let r;
    if (s === "message")
      r = function(i, o) {
        const a = new ns("message", {
          data: o ? i : i.toString()
        });
        a[Y] = this, Se(e, this, a);
      };
    else if (s === "close")
      r = function(i, o) {
        const a = new Ae("close", {
          code: i,
          reason: o.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        a[Y] = this, Se(e, this, a);
      };
    else if (s === "error")
      r = function(i) {
        const o = new ut("error", {
          error: i,
          message: i.message
        });
        o[Y] = this, Se(e, this, o);
      };
    else if (s === "open")
      r = function() {
        const i = new se("open");
        i[Y] = this, Se(e, this, i);
      };
    else
      return;
    r[oe] = !!t[oe], r[Ge] = e, t.once ? this.once(s, r) : this.on(s, r);
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
      if (t[Ge] === e && !t[oe]) {
        this.removeListener(s, t);
        break;
      }
  }
};
var zr = {
  EventTarget: Hr
};
function Se(s, e, t) {
  typeof s == "object" && s.handleEvent ? s.handleEvent.call(s, t) : s.call(e, t);
}
const { tokenChars: ae } = me;
function N(s, e, t) {
  s[e] === void 0 ? s[e] = [t] : s[e].push(t);
}
function Jr(s) {
  const e = /* @__PURE__ */ Object.create(null);
  let t = /* @__PURE__ */ Object.create(null), r = !1, n = !1, i = !1, o, a, c = -1, l = -1, f = -1, h = 0;
  for (; h < s.length; h++)
    if (l = s.charCodeAt(h), o === void 0)
      if (f === -1 && ae[l] === 1)
        c === -1 && (c = h);
      else if (h !== 0 && (l === 32 || l === 9))
        f === -1 && c !== -1 && (f = h);
      else if (l === 59 || l === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${h}`);
        f === -1 && (f = h);
        const _ = s.slice(c, f);
        l === 44 ? (N(e, _, t), t = /* @__PURE__ */ Object.create(null)) : o = _, c = f = -1;
      } else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (a === void 0)
      if (f === -1 && ae[l] === 1)
        c === -1 && (c = h);
      else if (l === 32 || l === 9)
        f === -1 && c !== -1 && (f = h);
      else if (l === 59 || l === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${h}`);
        f === -1 && (f = h), N(t, s.slice(c, f), !0), l === 44 && (N(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), c = f = -1;
      } else if (l === 61 && c !== -1 && f === -1)
        a = s.slice(c, h), c = f = -1;
      else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (n) {
      if (ae[l] !== 1)
        throw new SyntaxError(`Unexpected character at index ${h}`);
      c === -1 ? c = h : r || (r = !0), n = !1;
    } else if (i)
      if (ae[l] === 1)
        c === -1 && (c = h);
      else if (l === 34 && c !== -1)
        i = !1, f = h;
      else if (l === 92)
        n = !0;
      else
        throw new SyntaxError(`Unexpected character at index ${h}`);
    else if (l === 34 && s.charCodeAt(h - 1) === 61)
      i = !0;
    else if (f === -1 && ae[l] === 1)
      c === -1 && (c = h);
    else if (c !== -1 && (l === 32 || l === 9))
      f === -1 && (f = h);
    else if (l === 59 || l === 44) {
      if (c === -1)
        throw new SyntaxError(`Unexpected character at index ${h}`);
      f === -1 && (f = h);
      let _ = s.slice(c, f);
      r && (_ = _.replace(/\\/g, ""), r = !1), N(t, a, _), l === 44 && (N(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), a = void 0, c = f = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${h}`);
  if (c === -1 || i || l === 32 || l === 9)
    throw new SyntaxError("Unexpected end of input");
  f === -1 && (f = h);
  const k = s.slice(c, f);
  return o === void 0 ? N(e, k, t) : (a === void 0 ? N(t, k, !0) : r ? N(t, a, k.replace(/\\/g, "")) : N(t, a, k), N(e, o, t)), e;
}
function Yr(s) {
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
var Xr = { format: Yr, parse: Jr };
const Zr = Ps, Qr = Ds, en = Rs, is = Ns, tn = Is, { randomBytes: sn, createHash: rn } = at, { Duplex: Hi, Readable: zi } = fe, { URL: qe } = Ls, M = ct, nn = Fr, on = Gr, { isBlob: an } = me, {
  BINARY_TYPES: Lt,
  CLOSE_TIMEOUT: ln,
  EMPTY_BUFFER: ve,
  GUID: cn,
  kForOnEventAttribute: He,
  kListener: un,
  kStatusCode: dn,
  kWebSocket: v,
  NOOP: os
} = W, {
  EventTarget: { addEventListener: fn, removeEventListener: hn }
} = zr, { format: mn, parse: pn } = Xr, { toBuffer: gn } = Ie, as = Symbol("kAborted"), ze = [8, 13], C = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], yn = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
class u extends Zr {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(e, t, r) {
    super(), this._binaryType = Lt[0], this._closeCode = 1006, this._closeFrameReceived = !1, this._closeFrameSent = !1, this._closeMessage = ve, this._closeTimer = null, this._errorEmitted = !1, this._extensions = {}, this._paused = !1, this._protocol = "", this._readyState = u.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = !1, this._redirects = 0, t === void 0 ? t = [] : Array.isArray(t) || (typeof t == "object" && t !== null ? (r = t, t = []) : t = [t]), ls(this, e, t, r)) : (this._autoPong = r.autoPong, this._closeTimeout = r.closeTimeout, this._isServer = !0);
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
    Lt.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
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
    const n = new nn({
      allowSynchronousEvents: r.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: r.maxPayload,
      skipUTF8Validation: r.skipUTF8Validation
    }), i = new on(e, this._extensions, r.generateMask);
    this._receiver = n, this._sender = i, this._socket = e, n[v] = this, i[v] = this, e[v] = this, n.on("conclude", wn), n.on("drain", En), n.on("error", kn), n.on("message", bn), n.on("ping", Tn), n.on("pong", xn), i.onerror = On, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), t.length > 0 && e.unshift(t), e.on("close", ds), e.on("data", Le), e.on("end", fs), e.on("error", hs), this._readyState = u.OPEN, this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = u.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    this._extensions[M.extensionName] && this._extensions[M.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = u.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
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
    if (this.readyState !== u.CLOSED) {
      if (this.readyState === u.CONNECTING) {
        x(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      if (this.readyState === u.CLOSING) {
        this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
        return;
      }
      this._readyState = u.CLOSING, this._sender.close(e, t, !this._isServer, (r) => {
        r || (this._closeFrameSent = !0, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
      }), us(this);
    }
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    this.readyState === u.CONNECTING || this.readyState === u.CLOSED || (this._paused = !0, this._socket.pause());
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
    if (this.readyState === u.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== u.OPEN) {
      Je(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.ping(e || ve, t, r);
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
    if (this.readyState === u.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== u.OPEN) {
      Je(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.pong(e || ve, t, r);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    this.readyState === u.CONNECTING || this.readyState === u.CLOSED || (this._paused = !1, this._receiver._writableState.needDrain || this._socket.resume());
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
    if (this.readyState === u.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof t == "function" && (r = t, t = {}), typeof e == "number" && (e = e.toString()), this.readyState !== u.OPEN) {
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
    this._extensions[M.extensionName] || (n.compress = !1), this._sender.send(e || ve, n, r);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState !== u.CLOSED) {
      if (this.readyState === u.CONNECTING) {
        x(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      this._socket && (this._readyState = u.CLOSING, this._socket.destroy());
    }
  }
}
Object.defineProperty(u, "CONNECTING", {
  enumerable: !0,
  value: C.indexOf("CONNECTING")
});
Object.defineProperty(u.prototype, "CONNECTING", {
  enumerable: !0,
  value: C.indexOf("CONNECTING")
});
Object.defineProperty(u, "OPEN", {
  enumerable: !0,
  value: C.indexOf("OPEN")
});
Object.defineProperty(u.prototype, "OPEN", {
  enumerable: !0,
  value: C.indexOf("OPEN")
});
Object.defineProperty(u, "CLOSING", {
  enumerable: !0,
  value: C.indexOf("CLOSING")
});
Object.defineProperty(u.prototype, "CLOSING", {
  enumerable: !0,
  value: C.indexOf("CLOSING")
});
Object.defineProperty(u, "CLOSED", {
  enumerable: !0,
  value: C.indexOf("CLOSED")
});
Object.defineProperty(u.prototype, "CLOSED", {
  enumerable: !0,
  value: C.indexOf("CLOSED")
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
  Object.defineProperty(u.prototype, s, { enumerable: !0 });
});
["open", "error", "close", "message"].forEach((s) => {
  Object.defineProperty(u.prototype, `on${s}`, {
    enumerable: !0,
    get() {
      for (const e of this.listeners(s))
        if (e[He]) return e[un];
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
u.prototype.addEventListener = fn;
u.prototype.removeEventListener = hn;
var _n = u;
function ls(s, e, t, r) {
  const n = {
    allowSynchronousEvents: !0,
    autoPong: !0,
    closeTimeout: ln,
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
  if (e instanceof qe)
    i = e;
  else
    try {
      i = new qe(e);
    } catch {
      throw new SyntaxError(`Invalid URL: ${e}`);
    }
  i.protocol === "http:" ? i.protocol = "ws:" : i.protocol === "https:" && (i.protocol = "wss:"), s._url = i.href;
  const o = i.protocol === "wss:", a = i.protocol === "ws+unix:";
  let c;
  if (i.protocol !== "ws:" && !o && !a ? c = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : a && !i.pathname ? c = "The URL's pathname is empty" : i.hash && (c = "The URL contains a fragment identifier"), c) {
    const m = new SyntaxError(c);
    if (s._redirects === 0)
      throw m;
    be(s, m);
    return;
  }
  const l = o ? 443 : 80, f = sn(16).toString("base64"), h = o ? Qr.request : en.request, k = /* @__PURE__ */ new Set();
  let _;
  if (n.createConnection = n.createConnection || (o ? vn : Sn), n.defaultPort = n.defaultPort || l, n.port = i.port || l, n.host = i.hostname.startsWith("[") ? i.hostname.slice(1, -1) : i.hostname, n.headers = {
    ...n.headers,
    "Sec-WebSocket-Version": n.protocolVersion,
    "Sec-WebSocket-Key": f,
    Connection: "Upgrade",
    Upgrade: "websocket"
  }, n.path = i.pathname + i.search, n.timeout = n.handshakeTimeout, n.perMessageDeflate && (_ = new M(
    n.perMessageDeflate !== !0 ? n.perMessageDeflate : {},
    !1,
    n.maxPayload
  ), n.headers["Sec-WebSocket-Extensions"] = mn({
    [M.extensionName]: _.offer()
  })), t.length) {
    for (const m of t) {
      if (typeof m != "string" || !yn.test(m) || k.has(m))
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      k.add(m);
    }
    n.headers["Sec-WebSocket-Protocol"] = t.join(",");
  }
  if (n.origin && (n.protocolVersion < 13 ? n.headers["Sec-WebSocket-Origin"] = n.origin : n.headers.Origin = n.origin), (i.username || i.password) && (n.auth = `${i.username}:${i.password}`), a) {
    const m = n.path.split(":");
    n.socketPath = m[0], n.path = m[1];
  }
  let y;
  if (n.followRedirects) {
    if (s._redirects === 0) {
      s._originalIpc = a, s._originalSecure = o, s._originalHostOrSocketPath = a ? n.socketPath : i.host;
      const m = r && r.headers;
      if (r = { ...r, headers: {} }, m)
        for (const [w, A] of Object.entries(m))
          r.headers[w.toLowerCase()] = A;
    } else if (s.listenerCount("redirect") === 0) {
      const m = a ? s._originalIpc ? n.socketPath === s._originalHostOrSocketPath : !1 : s._originalIpc ? !1 : i.host === s._originalHostOrSocketPath;
      (!m || s._originalSecure && !o) && (delete n.headers.authorization, delete n.headers.cookie, m || delete n.headers.host, n.auth = void 0);
    }
    n.auth && !r.headers.authorization && (r.headers.authorization = "Basic " + Buffer.from(n.auth).toString("base64")), y = s._req = h(n), s._redirects && s.emit("redirect", s.url, y);
  } else
    y = s._req = h(n);
  n.timeout && y.on("timeout", () => {
    x(s, y, "Opening handshake has timed out");
  }), y.on("error", (m) => {
    y === null || y[as] || (y = s._req = null, be(s, m));
  }), y.on("response", (m) => {
    const w = m.headers.location, A = m.statusCode;
    if (w && n.followRedirects && A >= 300 && A < 400) {
      if (++s._redirects > n.maxRedirects) {
        x(s, y, "Maximum redirects exceeded");
        return;
      }
      y.abort();
      let U;
      try {
        U = new qe(w, e);
      } catch {
        const L = new SyntaxError(`Invalid URL: ${w}`);
        be(s, L);
        return;
      }
      ls(s, U, t, r);
    } else s.emit("unexpected-response", y, m) || x(
      s,
      y,
      `Unexpected server response: ${m.statusCode}`
    );
  }), y.on("upgrade", (m, w, A) => {
    if (s.emit("upgrade", m), s.readyState !== u.CONNECTING) return;
    y = s._req = null;
    const U = m.headers.upgrade;
    if (U === void 0 || U.toLowerCase() !== "websocket") {
      x(s, w, "Invalid Upgrade header");
      return;
    }
    const re = rn("sha1").update(f + cn).digest("base64");
    if (m.headers["sec-websocket-accept"] !== re) {
      x(s, w, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const L = m.headers["sec-websocket-protocol"];
    let ne;
    if (L !== void 0 ? k.size ? k.has(L) || (ne = "Server sent an invalid subprotocol") : ne = "Server sent a subprotocol but none was requested" : k.size && (ne = "Server sent no subprotocol"), ne) {
      x(s, w, ne);
      return;
    }
    L && (s._protocol = L);
    const ht = m.headers["sec-websocket-extensions"];
    if (ht !== void 0) {
      if (!_) {
        x(s, w, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
        return;
      }
      let Fe;
      try {
        Fe = pn(ht);
      } catch {
        x(s, w, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      const mt = Object.keys(Fe);
      if (mt.length !== 1 || mt[0] !== M.extensionName) {
        x(s, w, "Server indicated an extension that was not requested");
        return;
      }
      try {
        _.accept(Fe[M.extensionName]);
      } catch {
        x(s, w, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      s._extensions[M.extensionName] = _;
    }
    s.setSocket(w, A, {
      allowSynchronousEvents: n.allowSynchronousEvents,
      generateMask: n.generateMask,
      maxPayload: n.maxPayload,
      skipUTF8Validation: n.skipUTF8Validation
    });
  }), n.finishRequest ? n.finishRequest(y, s) : y.end();
}
function be(s, e) {
  s._readyState = u.CLOSING, s._errorEmitted = !0, s.emit("error", e), s.emitClose();
}
function Sn(s) {
  return s.path = s.socketPath, is.connect(s);
}
function vn(s) {
  return s.path = void 0, !s.servername && s.servername !== "" && (s.servername = is.isIP(s.host) ? "" : s.host), tn.connect(s);
}
function x(s, e, t) {
  s._readyState = u.CLOSING;
  const r = new Error(t);
  Error.captureStackTrace(r, x), e.setHeader ? (e[as] = !0, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(be, s, r)) : (e.destroy(r), e.once("error", s.emit.bind(s, "error")), e.once("close", s.emitClose.bind(s)));
}
function Je(s, e, t) {
  if (e) {
    const r = an(e) ? e.size : gn(e).length;
    s._socket ? s._sender._bufferedBytes += r : s._bufferedAmount += r;
  }
  if (t) {
    const r = new Error(
      `WebSocket is not open: readyState ${s.readyState} (${C[s.readyState]})`
    );
    process.nextTick(t, r);
  }
}
function wn(s, e) {
  const t = this[v];
  t._closeFrameReceived = !0, t._closeMessage = e, t._closeCode = s, t._socket[v] !== void 0 && (t._socket.removeListener("data", Le), process.nextTick(cs, t._socket), s === 1005 ? t.close() : t.close(s, e));
}
function En() {
  const s = this[v];
  s.isPaused || s._socket.resume();
}
function kn(s) {
  const e = this[v];
  e._socket[v] !== void 0 && (e._socket.removeListener("data", Le), process.nextTick(cs, e._socket), e.close(s[dn])), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s));
}
function Ft() {
  this[v].emitClose();
}
function bn(s, e) {
  this[v].emit("message", s, e);
}
function Tn(s) {
  const e = this[v];
  e._autoPong && e.pong(s, !this._isServer, os), e.emit("ping", s);
}
function xn(s) {
  this[v].emit("pong", s);
}
function cs(s) {
  s.resume();
}
function On(s) {
  const e = this[v];
  e.readyState !== u.CLOSED && (e.readyState === u.OPEN && (e._readyState = u.CLOSING, us(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s)));
}
function us(s) {
  s._closeTimer = setTimeout(
    s._socket.destroy.bind(s._socket),
    s._closeTimeout
  );
}
function ds() {
  const s = this[v];
  if (this.removeListener("close", ds), this.removeListener("data", Le), this.removeListener("end", fs), s._readyState = u.CLOSING, !this._readableState.endEmitted && !s._closeFrameReceived && !s._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
    const e = this.read(this._readableState.length);
    s._receiver.write(e);
  }
  s._receiver.end(), this[v] = void 0, clearTimeout(s._closeTimer), s._receiver._writableState.finished || s._receiver._writableState.errorEmitted ? s.emitClose() : (s._receiver.on("error", Ft), s._receiver.on("finish", Ft));
}
function Le(s) {
  this[v]._receiver.write(s) || this.pause();
}
function fs() {
  const s = this[v];
  s._readyState = u.CLOSING, s._receiver.end(), this.end();
}
function hs() {
  const s = this[v];
  this.removeListener("error", hs), this.on("error", os), s && (s._readyState = u.CLOSING, this.destroy());
}
const Pn = /* @__PURE__ */ cr(_n), { Duplex: Ji } = fe, { tokenChars: Yi } = me, { Duplex: Xi } = fe, { createHash: Zi } = at, { CLOSE_TIMEOUT: Qi, GUID: eo, kWebSocket: to } = W, le = {
  cache: "no-store"
}, Dn = (s) => ue + (s === !1 ? "" : " AssemblyAI/1.0 (" + Object.entries({ ...De, ...s }).map(([e, t]) => t ? `${e}=${t.name}/${t.version}` : "").join(" ") + ")");
let ue = "";
typeof navigator < "u" && navigator.userAgent && (ue += navigator.userAgent);
const De = {
  sdk: { name: "JavaScript", version: "4.22.1" }
};
typeof process < "u" && (process.versions.node && ue.indexOf("Node") === -1 && (De.runtime_env = {
  name: "Node",
  version: process.versions.node
}), process.versions.bun && ue.indexOf("Bun") === -1 && (De.runtime_env = {
  name: "Bun",
  version: process.versions.bun
}));
typeof Deno < "u" && process.versions.bun && ue.indexOf("Deno") === -1 && (De.runtime_env = { name: "Deno", version: Deno.version.deno });
class pe {
  /**
   * Create a new service.
   * @param params - The parameters to use for the service.
   */
  constructor(e) {
    this.params = e, e.userAgent === !1 ? this.userAgent = void 0 : this.userAgent = Dn(e.userAgent || {});
  }
  async fetch(e, t) {
    t = { ...le, ...t };
    let r = {
      Authorization: this.params.apiKey,
      "Content-Type": "application/json"
    };
    le != null && le.headers && (r = { ...r, ...le.headers }), t != null && t.headers && (r = { ...r, ...t.headers }), this.userAgent && (r["User-Agent"] = this.userAgent), t.headers = r, e.startsWith("http") || (e = this.params.baseUrl + e);
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
class Rn extends pe {
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
const Re = (s, e) => new Pn(s, e), S = {
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
}, Ct = {
  [S.BadSampleRate]: "Sample rate must be a positive integer",
  [S.AuthFailed]: "Not Authorized",
  [S.InsufficientFunds]: "Insufficient funds",
  [S.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [S.NonexistentSessionId]: "Session ID does not exist",
  [S.SessionExpired]: "Session has expired",
  [S.ClosedSession]: "Session is closed",
  [S.RateLimited]: "Rate limited",
  [S.UniqueSessionViolation]: "Unique session violation",
  [S.SessionTimeout]: "Session Timeout",
  [S.AudioTooShort]: "Audio too short",
  [S.AudioTooLong]: "Audio too long",
  [S.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [S.BadJson]: "Bad JSON",
  [S.BadSchema]: "Bad schema",
  [S.TooManyStreams]: "Too many streams",
  [S.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid.",
  [S.ReconnectAttemptsExhausted]: "Reconnect attempts exhausted",
  [S.WordBoostParameterParsingFailed]: "Could not parse word boost parameter"
};
class Nn extends Error {
}
const b = {
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
}, Ut = {
  [b.BadSampleRate]: "Sample rate must be a positive integer",
  [b.AuthFailed]: "Not Authorized",
  [b.InsufficientFunds]: "Insufficient funds",
  [b.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [b.NonexistentSessionId]: "Session ID does not exist",
  [b.SessionExpired]: "Session has expired",
  [b.ClosedSession]: "Session is closed",
  [b.RateLimited]: "Rate limited",
  [b.UniqueSessionViolation]: "Unique session violation",
  [b.SessionTimeout]: "Session Timeout",
  [b.AudioTooShort]: "Audio too short",
  [b.AudioTooLong]: "Audio too long",
  [b.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [b.BadSchema]: "Bad schema",
  [b.TooManyStreams]: "Too many streams",
  [b.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid."
};
class In extends Error {
}
const An = "wss://api.assemblyai.com/v2/realtime/ws", Ln = '{"force_end_utterance":true}', Bt = '{"terminate_session":true}';
class Fn {
  /**
   * Create a new RealtimeTranscriber.
   * @param params - Parameters to configure the RealtimeTranscriber
   */
  constructor(e) {
    if (this.listeners = {}, this.realtimeUrl = e.realtimeUrl ?? An, this.sampleRate = e.sampleRate ?? 16e3, this.wordBoost = e.wordBoost, this.encoding = e.encoding, this.endUtteranceSilenceThreshold = e.endUtteranceSilenceThreshold, this.disablePartialTranscripts = e.disablePartialTranscripts, "token" in e && e.token && (this.token = e.token), "apiKey" in e && e.apiKey && (this.apiKey = e.apiKey), !(this.token || this.apiKey))
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
      this.token ? this.socket = Re(t.toString()) : this.socket = Re(t.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
        this.endUtteranceSilenceThreshold === void 0 || this.endUtteranceSilenceThreshold === null || this.configureEndUtteranceSilenceThreshold(this.endUtteranceSilenceThreshold);
      }, this.socket.onclose = ({ code: r, reason: n }) => {
        var i, o;
        n || r in Ct && (n = Ct[r]), (o = (i = this.listeners).close) == null || o.call(i, r, n);
      }, this.socket.onerror = (r) => {
        var n, i, o, a;
        r.error ? (i = (n = this.listeners).error) == null || i.call(n, r.error) : (a = (o = this.listeners).error) == null || a.call(o, new Error(r.message));
      }, this.socket.onmessage = ({ data: r }) => {
        var i, o, a, c, l, f, h, k, _, y, m, w, A, U, re;
        const n = JSON.parse(r.toString());
        if ("error" in n) {
          (o = (i = this.listeners).error) == null || o.call(i, new Nn(n.error));
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
            n.created = new Date(n.created), (f = (l = this.listeners).transcript) == null || f.call(l, n), (k = (h = this.listeners)["transcript.partial"]) == null || k.call(h, n);
            break;
          }
          case "FinalTranscript": {
            n.created = new Date(n.created), (y = (_ = this.listeners).transcript) == null || y.call(_, n), (w = (m = this.listeners)["transcript.final"]) == null || w.call(m, n);
            break;
          }
          case "SessionInformation": {
            (U = (A = this.listeners).session_information) == null || U.call(A, n);
            break;
          }
          case "SessionTerminated": {
            (re = this.sessionTerminatedResolve) == null || re.call(this);
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
    return new zt({
      write: (e) => {
        this.sendAudio(e);
      }
    });
  }
  /**
   * Manually end an utterance
   */
  forceEndUtterance() {
    this.send(Ln);
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
          this.socket.send(Bt), await r;
        } else
          this.socket.send(Bt);
      (t = this.socket) != null && t.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class Cn extends pe {
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
    return !t.token && !t.apiKey && (t.apiKey = this.rtFactoryParams.apiKey), new Fn(t);
  }
  async createTemporaryToken(e) {
    return (await this.fetchJson("/v2/realtime/token", {
      method: "POST",
      body: JSON.stringify(e)
    })).token;
  }
}
function Mt(s) {
  return s.startsWith("http") || s.startsWith("https") || s.startsWith("data:") ? null : s.startsWith("file://") ? s.substring(7) : s.startsWith("file:") ? s.substring(5) : s;
}
class Un extends pe {
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
        const a = Mt(i);
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
    const r = Mt(e.audio_url);
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
const Bn = async (s) => As.toWeb(Us(s));
class Mn extends pe {
  /**
   * Upload a local file to AssemblyAI.
   * @param input - The local file path to upload, or a stream or buffer of the file to upload.
   * @returns A promise that resolves to the uploaded file URL.
   */
  async upload(e) {
    let t;
    return typeof e == "string" ? e.startsWith("data:") ? t = $n(e) : t = await Bn(e) : t = e, (await this.fetchJson("/v2/upload", {
      method: "POST",
      body: t,
      headers: {
        "Content-Type": "application/octet-stream"
      },
      duplex: "half"
    })).upload_url;
  }
}
function $n(s) {
  const e = s.split(","), t = e[0].match(/:(.*?);/)[1], r = atob(e[1]);
  let n = r.length;
  const i = new Uint8Array(n);
  for (; n--; )
    i[n] = r.charCodeAt(n);
  return new Blob([i], { type: t });
}
const Kn = "wss://streaming.assemblyai.com/v3/ws", $t = '{"type":"Terminate"}';
class Wn {
  constructor(e) {
    if (this.listeners = {}, this.params = {
      ...e,
      websocketBaseUrl: e.websocketBaseUrl || Kn
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
      this.token ? this.socket = Re(t.toString()) : this.socket = Re(t.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
      }, this.socket.onclose = ({ code: r, reason: n }) => {
        var i, o;
        n || r in Ut && (n = Ut[r]), (o = (i = this.listeners).close) == null || o.call(i, r, n);
      }, this.socket.onerror = (r) => {
        var n, i, o, a;
        r.error ? (i = (n = this.listeners).error) == null || i.call(n, r.error) : (a = (o = this.listeners).error) == null || a.call(o, new Error(r.message));
      }, this.socket.onmessage = ({ data: r }) => {
        var i, o, a, c, l, f, h;
        const n = JSON.parse(r.toString());
        if ("error" in n) {
          (o = (i = this.listeners).error) == null || o.call(i, new In(n.error));
          return;
        }
        switch (n.type) {
          case "Begin": {
            e(n), (c = (a = this.listeners).open) == null || c.call(a, n);
            break;
          }
          case "Turn": {
            (f = (l = this.listeners).turn) == null || f.call(l, n);
            break;
          }
          case "Termination": {
            (h = this.sessionTerminatedResolve) == null || h.call(this);
            break;
          }
        }
      };
    });
  }
  stream() {
    return new zt({
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
          this.socket.send($t), await r;
        } else
          this.socket.send($t);
      (t = this.socket) != null && t.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class jn extends pe {
  constructor(e) {
    super(e), this.baseServiceParams = e;
  }
  transcriber(e) {
    const t = { ...e };
    return !t.token && !t.apiKey && (t.apiKey = this.baseServiceParams.apiKey), new Wn(t);
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
const Vn = "https://api.assemblyai.com", Gn = "https://streaming.assemblyai.com";
class qn {
  /**
   * Create a new AssemblyAI client.
   * @param params - The parameters for the service, including the API key and base URL, if any.
   */
  constructor(e) {
    e.baseUrl = e.baseUrl || Vn, e.baseUrl && e.baseUrl.endsWith("/") && (e.baseUrl = e.baseUrl.slice(0, -1)), this.files = new Mn(e), this.transcripts = new Un(e, this.files), this.lemur = new Rn(e), this.realtime = new Cn(e), this.streaming = new jn({
      ...e,
      baseUrl: e.streamingBaseUrl || Gn
    });
  }
}
function Hn() {
  const { app: s } = require("electron");
  if (s.isPackaged) {
    const t = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", r = Jt.join(process.resourcesPath, "bin", t);
    if (Qe.existsSync(r))
      return r;
  }
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}
async function zn(s) {
  const e = Ms.tmpdir(), t = Jt.join(e, `audio-${Date.now()}.wav`), r = Hn();
  return new Promise((n, i) => {
    const o = Bs(r, [
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
async function Jn(s, e) {
  try {
    if (!s.videoPath)
      return { success: !1, error: "Video path is required" };
    if (!s.apiKey)
      return { success: !1, error: "AssemblyAI API key is required" };
    if (!Qe.existsSync(s.videoPath))
      return { success: !1, error: `Video file not found: ${s.videoPath}` };
    e == null || e({
      status: "extracting",
      progress: 10,
      message: "Extracting audio from video..."
    });
    let t;
    try {
      t = await zn(s.videoPath);
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
    const r = new qn({ apiKey: s.apiKey });
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
      Qe.unlinkSync(t);
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
const we = $s(import.meta.url), Yn = 100, Kt = 5, Xn = 16, Zn = 1, Qn = 2, ei = 4;
class ti {
  constructor() {
    g(this, "running", !1);
    g(this, "recordingId", "");
    g(this, "screenBounds", { width: 1920, height: 1080 });
    g(this, "recordingStartTime", 0);
    g(this, "events", []);
    g(this, "pendingDrag", null);
    g(this, "mouseHookAvailable", !1);
    g(this, "pollInterval", null);
    g(this, "windowsApi", null);
    g(this, "lastButtonState", { left: !1, right: !1, middle: !1 });
    this.initializeWindowsApi();
  }
  /**
   * Initialize Windows API bindings using koffi
   */
  initializeWindowsApi() {
    try {
      const e = we("koffi");
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
      we("global-mouse-events"), this.mouseHookAvailable = !0, console.log("MouseEventDetector: Using global-mouse-events fallback");
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
      const t = e[0], r = e[1], n = (this.windowsApi.GetAsyncKeyState(Zn) & 32768) !== 0, i = (this.windowsApi.GetAsyncKeyState(Qn) & 32768) !== 0, o = (this.windowsApi.GetAsyncKeyState(ei) & 32768) !== 0;
      n && !this.lastButtonState.left && this.onMouseDown(t, r, "left"), i && !this.lastButtonState.right && this.onMouseDown(t, r, "right"), o && !this.lastButtonState.middle && this.onMouseDown(t, r, "middle"), !n && this.lastButtonState.left && this.onMouseUp(t, r, "left"), !i && this.lastButtonState.right && this.onMouseUp(t, r, "right"), !o && this.lastButtonState.middle && this.onMouseUp(t, r, "middle"), this.lastButtonState = { left: n, right: i, middle: o };
    }, Xn), console.log("MouseEventDetector: Polling started"));
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
    const n = this.getRelativeTimestamp(), i = n - this.pendingDrag.startTimestamp, o = Math.abs(e - this.pendingDrag.startX) > Kt || Math.abs(t - this.pendingDrag.startY) > Kt;
    if (i > Yn && o) {
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
      const e = we("global-mouse-events");
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
      const e = we("global-mouse-events");
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
const Ye = new ti();
let Ee = null;
function si(s, e, t, r, n) {
  d.handle("get-sources", async (o, a) => (await ks.getSources(a)).map((l) => ({
    id: l.id,
    name: l.name,
    display_id: l.display_id,
    thumbnail: l.thumbnail ? l.thumbnail.toDataURL() : null,
    appIcon: l.appIcon ? l.appIcon.toDataURL() : null
  }))), d.handle("select-source", (o, a) => {
    Ee = a;
    const c = r();
    return c && c.close(), Ee;
  }), d.handle("get-selected-source", () => Ee), d.handle("open-source-selector", () => {
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
      const l = p.join($, c);
      return await E.writeFile(l, Buffer.from(a)), i = l, {
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
      const a = (await E.readdir($)).filter((f) => f.endsWith(".webm"));
      if (a.length === 0)
        return { success: !1, message: "No recorded video found" };
      const c = a.sort().reverse()[0];
      return { success: !0, path: p.join($, c) };
    } catch (o) {
      return console.error("Failed to get video path:", o), { success: !1, message: "Failed to get video path", error: String(o) };
    }
  }), d.handle("set-recording-state", (o, a) => {
    n && n(a, (Ee || { name: "Screen" }).name);
  }), d.handle("open-external-url", async (o, a) => {
    try {
      return await bs.openExternal(a), { success: !0 };
    } catch (c) {
      return console.error("Failed to open URL:", c), { success: !1, error: String(c) };
    }
  }), d.handle("get-asset-base-path", () => {
    try {
      return O.isPackaged ? p.join(process.resourcesPath, "assets") : p.join(O.getAppPath(), "public", "assets");
    } catch (o) {
      return console.error("Failed to resolve asset base path:", o), null;
    }
  }), d.handle("save-exported-video", async (o, a, c) => {
    try {
      const l = t(), f = c.toLowerCase().endsWith(".gif"), h = f ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }], k = {
        title: f ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: p.join(O.getPath("downloads"), c),
        filters: h,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      }, _ = l ? await Ue.showSaveDialog(l, k) : await Ue.showSaveDialog(k);
      return _.canceled || !_.filePath ? {
        success: !1,
        cancelled: !0,
        message: "Export cancelled"
      } : (await E.writeFile(_.filePath, Buffer.from(a)), {
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
      const o = await Ue.showOpenDialog({
        title: "Select Video File",
        defaultPath: $,
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
  d.handle("set-current-video-path", (o, a) => (i = a, { success: !0 })), d.handle("get-current-video-path", () => i ? { success: !0, path: i } : { success: !1 }), d.handle("clear-current-video-path", () => (i = null, { success: !0 })), d.handle("get-platform", () => process.platform), d.handle("presets:get", async () => await Xs()), d.handle("presets:save", async (o, a) => await Zs(a)), d.handle("presets:update", async (o, a, c) => await Qs(a, c)), d.handle("presets:delete", async (o, a) => await er(a)), d.handle("presets:duplicate", async (o, a) => await tr(a)), d.handle("presets:setDefault", async (o, a) => await sr(a)), d.handle("keystroke:start", async () => {
    try {
      return await q.start(), { success: !0 };
    } catch (o) {
      return console.error("Failed to start keystroke service:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:stop", () => {
    try {
      return q.stop(), { success: !0 };
    } catch (o) {
      return console.error("Failed to stop keystroke service:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:get-settings", async () => await ar()), d.handle("keystroke:set-settings", async (o, a) => await lr(a)), d.handle("keystroke:show-overlay", async () => {
    try {
      let o = qs();
      return !o || o.isDestroyed() ? (o = Gs(), q.onEvent((a) => {
        o && !o.isDestroyed() && o.webContents.send("keystroke:event", a);
      })) : zs(), { success: !0 };
    } catch (o) {
      return console.error("Failed to show keystroke overlay:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("keystroke:hide-overlay", async () => {
    try {
      return Hs(), { success: !0 };
    } catch (o) {
      return console.error("Failed to hide keystroke overlay:", o), {
        success: !1,
        error: o instanceof Error ? o.message : String(o)
      };
    }
  }), d.handle("transcribe-video", async (o, a) => await Jn(a, (c) => {
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
      const l = p.join($, c);
      return await E.writeFile(l, JSON.stringify(a, null, 2)), { success: !0, path: l };
    } catch (l) {
      return console.error("Failed to save mouse events:", l), { success: !1, error: String(l) };
    }
  }), d.handle("auto-zoom:get-events", async (o, a) => {
    try {
      const c = a.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".events.json");
      try {
        const l = await E.readFile(c, "utf-8");
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
const Wt = {
  // Function keys
  59: "F1",
  60: "F2",
  61: "F3",
  62: "F4",
  63: "F5",
  64: "F6",
  65: "F7",
  66: "F8",
  67: "F9",
  68: "F10",
  87: "F11",
  88: "F12",
  // Navigation keys
  28: "Enter",
  14: "Backspace",
  15: "Tab",
  57: "Space",
  1: "Escape",
  // Arrow keys
  57416: "Up",
  57424: "Down",
  57419: "Left",
  57421: "Right",
  // Editing keys
  57426: "Insert",
  57427: "Delete",
  57415: "Home",
  57423: "End",
  57417: "Page Up",
  57425: "Page Down",
  // Lock keys
  58: "Caps Lock",
  69: "Num Lock",
  70: "Scroll Lock",
  // Modifier keys (standalone display)
  29: "Ctrl",
  57373: "Ctrl",
  56: "Alt",
  57400: "Alt",
  42: "Shift",
  54: "Shift",
  57435: "Meta",
  57436: "Meta",
  // Misc keys
  57399: "Print Screen",
  3653: "Pause",
  // Numpad
  82: "Num 0",
  79: "Num 1",
  80: "Num 2",
  81: "Num 3",
  75: "Num 4",
  76: "Num 5",
  77: "Num 6",
  71: "Num 7",
  72: "Num 8",
  73: "Num 9",
  83: "Num .",
  57397: "Num /",
  55: "Num *",
  74: "Num -",
  78: "Num +",
  57372: "Num Enter"
}, jt = {
  // Letters A-Z
  30: "A",
  48: "B",
  46: "C",
  32: "D",
  18: "E",
  33: "F",
  34: "G",
  35: "H",
  23: "I",
  36: "J",
  37: "K",
  38: "L",
  50: "M",
  49: "N",
  24: "O",
  25: "P",
  16: "Q",
  19: "R",
  31: "S",
  20: "T",
  22: "U",
  47: "V",
  17: "W",
  45: "X",
  21: "Y",
  44: "Z",
  // Numbers 0-9 (top row)
  11: "0",
  2: "1",
  3: "2",
  4: "3",
  5: "4",
  6: "5",
  7: "6",
  8: "7",
  9: "8",
  10: "9"
}, Vt = {
  41: "`",
  12: "-",
  13: "=",
  26: "[",
  27: "]",
  43: "\\",
  39: ";",
  40: "'",
  51: ",",
  52: ".",
  53: "/"
};
function ri(s) {
  return Wt[s] ? Wt[s] : jt[s] ? jt[s] : Vt[s] ? Vt[s] : `Key(0x${s.toString(16).toUpperCase().padStart(4, "0")})`;
}
class ni {
  constructor() {
    g(this, "running", !1);
    g(this, "recordingId", "");
    g(this, "recordingStartTime", 0);
    g(this, "events", []);
    g(this, "eventHandler", null);
  }
  /**
   * Start recording keystroke and mouse events
   * 
   * @param recordingId Unique identifier for this recording session
   * 
   * Requirements:
   * - 2.1: Start capturing keyboard events
   * - 2.2: Start capturing mouse events
   * - 2.3: Initialize recording start time for relative timestamps
   */
  start(e) {
    if (this.running) {
      console.warn("[KeystrokeEventRecorder] Already recording, ignoring start call");
      return;
    }
    this.recordingId = e, this.recordingStartTime = Date.now(), this.events = [], this.running = !0, this.eventHandler = (t) => {
      this.handleEvent(t);
    }, q.onEvent(this.eventHandler), q.isRunning() || q.start().catch((t) => {
      console.error("[KeystrokeEventRecorder] Failed to start keystroke service:", t), this.running = !1, this.eventHandler = null;
    }), console.log(`[KeystrokeEventRecorder] Started recording: ${e}`);
  }
  /**
   * Stop recording and return the captured event data
   * 
   * @returns KeystrokeEventData containing all captured events
   * 
   * Requirements:
   * - 3.3: Return data with version metadata
   */
  stop() {
    if (!this.running)
      return console.warn("[KeystrokeEventRecorder] Not recording, returning empty data"), {
        version: 1,
        recordingId: "",
        events: []
      };
    q.removeEventListener(), this.eventHandler = null;
    const e = {
      version: 1,
      recordingId: this.recordingId,
      events: [...this.events]
    };
    return this.running = !1, this.recordingId = "", this.recordingStartTime = 0, this.events = [], console.log(`[KeystrokeEventRecorder] Stopped recording, captured ${e.events.length} events`), e;
  }
  /**
   * Check if the recorder is currently running
   * 
   * @returns true if recording is in progress
   */
  isRunning() {
    return this.running;
  }
  /**
   * Get the current list of recorded events
   * 
   * @returns Copy of the recorded events array
   */
  getEvents() {
    return [...this.events];
  }
  /**
   * Handle an incoming input event from the keystroke service
   * Transforms the event to RecordedInputEvent format with relative timestamp
   * 
   * @param event The input event from keystroke service
   * 
   * Requirements:
   * - 2.3: Calculate timestamp relative to recording start
   * - 2.4: Record key code, key name, and modifier state for keyboard events
   * - 2.5: Record button type and modifier state for mouse events
   * - 2.6: Use key name mapping for display names
   */
  handleEvent(e) {
    if (!this.running)
      return;
    const t = e.timestamp - this.recordingStartTime, r = Math.max(0, t);
    if (e.type === "keystroke") {
      const n = {
        type: "keystroke",
        timestamp: r,
        keyCode: e.keyCode,
        keyName: ri(e.keyCode),
        modifiers: {
          ctrl: e.modifiers.ctrl,
          alt: e.modifiers.alt,
          shift: e.modifiers.shift,
          meta: e.modifiers.meta
        }
      };
      this.events.push(n);
    } else if (e.type === "mouse") {
      const n = {
        type: "mouse",
        timestamp: r,
        button: e.button,
        modifiers: {
          ctrl: e.modifiers.ctrl,
          alt: e.modifiers.alt,
          shift: e.modifiers.shift,
          meta: e.modifiers.meta
        }
      };
      this.events.push(n);
    }
  }
}
const Xe = new ni();
function ii(s) {
  return s.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".keystroke.json");
}
async function oi(s, e) {
  try {
    if (!s || typeof s.version != "number" || !Array.isArray(s.events))
      return console.error("[KeystrokeEventRecorder] Invalid event data: missing required fields"), {
        success: !1,
        error: "Invalid event data: missing required fields"
      };
    const t = JSON.stringify(s, null, 2);
    return await E.writeFile(e, t, "utf-8"), console.log(`[KeystrokeEventRecorder] Saved ${s.events.length} events to ${e}`), {
      success: !0,
      path: e
    };
  } catch (t) {
    const r = t instanceof Error ? t.message : String(t);
    return console.error(`[KeystrokeEventRecorder] Failed to save events to ${e}:`, r), {
      success: !1,
      error: r
    };
  }
}
async function ai(s) {
  try {
    const e = await E.readFile(s, "utf-8");
    let t;
    try {
      t = JSON.parse(e);
    } catch (r) {
      const n = r instanceof Error ? r.message : String(r);
      return console.error(`[KeystrokeEventRecorder] Corrupt JSON in ${s}:`, n), {
        success: !1,
        error: "Invalid JSON format in keystroke event file"
      };
    }
    return li(t) ? (console.log(`[KeystrokeEventRecorder] Loaded ${t.events.length} events from ${s}`), {
      success: !0,
      data: t
    }) : (console.error(`[KeystrokeEventRecorder] Invalid keystroke event file format in ${s}`), {
      success: !1,
      error: "Invalid keystroke event file format"
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT")
      return {
        success: !1,
        notFound: !0
      };
    const t = e instanceof Error ? e.message : String(e);
    return console.error(`[KeystrokeEventRecorder] Failed to load events from ${s}:`, t), {
      success: !1,
      error: t
    };
  }
}
function li(s) {
  if (!s || typeof s != "object")
    return !1;
  const e = s;
  if (e.version !== 1 || typeof e.recordingId != "string" || !Array.isArray(e.events))
    return !1;
  for (const t of e.events)
    if (!ci(t))
      return !1;
  return !0;
}
function ci(s) {
  if (!s || typeof s != "object")
    return !1;
  const e = s;
  return typeof e.timestamp != "number" || e.timestamp < 0 || !ui(e.modifiers) ? !1 : e.type === "keystroke" ? typeof e.keyCode == "number" && typeof e.keyName == "string" && e.keyName.length > 0 : e.type === "mouse" ? e.button === "left" || e.button === "right" || e.button === "middle" : !1;
}
function ui(s) {
  if (!s || typeof s != "object")
    return !1;
  const e = s;
  return typeof e.ctrl == "boolean" && typeof e.alt == "boolean" && typeof e.shift == "boolean" && typeof e.meta == "boolean";
}
const di = {
  textColor: "#FFFFFF",
  backgroundColor: "#000000CC",
  modifierColor: "#34B27B",
  textScale: 1,
  borderRadius: 8,
  fadeDurationMs: 300,
  lingerDurationMs: 1500,
  animationIn: "fade",
  animationOut: "fade",
  showOnlyHotkeys: !1
}, dt = {
  captureEnabled: !1,
  defaultStyle: di,
  defaultPosition: "bottom-center"
}, fi = "keystroke-editor-settings.json", ms = 1;
function ot() {
  return p.join(O.getPath("userData"), fi);
}
function Ze() {
  return {
    version: ms,
    settings: { ...dt }
  };
}
async function ps() {
  try {
    const s = ot(), e = await E.readFile(s, "utf-8"), t = JSON.parse(e);
    return !t.settings || typeof t.settings != "object" ? (console.warn("[KeystrokeEditor] Invalid settings file, creating new store"), Ze()) : {
      version: t.version || ms,
      settings: { ...dt, ...t.settings }
    };
  } catch (s) {
    if (s instanceof Error && "code" in s && s.code === "ENOENT")
      return Ze();
    console.error("[KeystrokeEditor] Failed to read settings file:", s);
    try {
      const e = ot(), t = e + ".backup." + Date.now();
      await E.rename(e, t), console.log("[KeystrokeEditor] Backed up corrupt settings file to:", t);
    } catch {
    }
    return Ze();
  }
}
async function hi(s) {
  const e = ot();
  await E.writeFile(e, JSON.stringify(s, null, 2), "utf-8");
}
async function mi() {
  try {
    return {
      success: !0,
      settings: (await ps()).settings
    };
  } catch (s) {
    return console.error("[KeystrokeEditor] Failed to get settings:", s), {
      success: !1,
      settings: { ...dt }
    };
  }
}
async function pi(s) {
  try {
    const e = await ps();
    return e.settings = { ...e.settings, ...s }, await hi(e), { success: !0, settings: e.settings };
  } catch (e) {
    return console.error("[KeystrokeEditor] Failed to save settings:", e), { success: !1, error: String(e) };
  }
}
async function gi() {
  try {
    return await import("uiohook-napi"), { available: !0 };
  } catch (s) {
    const e = s instanceof Error ? s.message : String(s);
    return console.error("[KeystrokeEditor] Keystroke service not available:", e), {
      available: !1,
      error: "Keystroke capture is not available on this system. The native library could not be loaded."
    };
  }
}
function yi(s) {
  d.handle("keystroke-editor:check-availability", async () => await gi()), d.handle("keystroke-editor:start-capture", async (e, t) => {
    try {
      return Xe.start(t), { success: !0 };
    } catch (r) {
      return console.error("[KeystrokeEditor] Failed to start capture:", r), {
        success: !1,
        error: r instanceof Error ? r.message : String(r)
      };
    }
  }), d.handle("keystroke-editor:stop-capture", async () => {
    try {
      return { success: !0, data: Xe.stop() };
    } catch (e) {
      return console.error("[KeystrokeEditor] Failed to stop capture:", e), {
        success: !1,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }), d.handle("keystroke-editor:is-capturing", () => Xe.isRunning()), d.handle(
    "keystroke-editor:save-events",
    async (e, t, r) => {
      try {
        const n = p.join(s, r), i = await oi(t, n);
        return i.success || console.error("[KeystrokeEditor] Failed to save events:", i.error), i;
      } catch (n) {
        const i = n instanceof Error ? n.message : String(n);
        return console.error("[KeystrokeEditor] Failed to save events:", i), {
          success: !1,
          error: i
        };
      }
    }
  ), d.handle("keystroke-editor:load-events", async (e, t) => {
    try {
      const r = ii(t), n = await ai(r);
      return !n.success && !n.notFound && n.error && console.error("[KeystrokeEditor] Failed to load events (corrupt file):", n.error), n;
    } catch (r) {
      const n = r instanceof Error ? r.message : String(r);
      return console.error("[KeystrokeEditor] Failed to load events:", n), {
        success: !1,
        error: n
      };
    }
  }), d.handle("keystroke-editor:get-settings", async () => await mi()), d.handle(
    "keystroke-editor:set-settings",
    async (e, t) => await pi(t)
  ), console.log("[KeystrokeEditor] IPC handlers registered");
}
const _i = p.dirname(Ht(import.meta.url)), $ = p.join(O.getPath("userData"), "recordings");
async function Si() {
  try {
    await E.mkdir($, { recursive: !0 }), console.log("RECORDINGS_DIR:", $), console.log("User Data Path:", O.getPath("userData"));
  } catch (s) {
    console.error("Failed to create recordings directory:", s);
  }
}
process.env.APP_ROOT = p.join(_i, "..");
const vi = process.env.VITE_DEV_SERVER_URL, so = p.join(process.env.APP_ROOT, "dist-electron"), gs = p.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = vi ? p.join(process.env.APP_ROOT, "public") : gs;
let T = null, ce = null, X = null, ys = "";
const _s = Ss("openscreen.png"), wi = Ss("rec-button.png");
function ft() {
  T = Ws();
}
function Gt() {
  X = new xs(_s);
}
function Ss(s) {
  return Ts.createFromPath(p.join(process.env.VITE_PUBLIC || gs, s)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function qt(s = !1) {
  if (!X) return;
  const e = s ? wi : _s, t = s ? `Recording: ${ys}` : "OpenScreen", r = s ? [
    {
      label: "Stop Recording",
      click: () => {
        T && !T.isDestroyed() && T.webContents.send("stop-recording-from-tray");
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        T && !T.isDestroyed() ? T.isMinimized() && T.restore() : ft();
      }
    },
    {
      label: "Quit",
      click: () => {
        O.quit();
      }
    }
  ];
  X.setImage(e), X.setToolTip(t), X.setContextMenu(Os.buildFromTemplate(r));
}
function Ei() {
  T && (T.close(), T = null), T = js();
}
function ki() {
  return ce = Vs(), ce.on("closed", () => {
    ce = null;
  }), ce;
}
O.on("window-all-closed", () => {
});
O.on("activate", () => {
  de.getAllWindows().length === 0 && ft();
});
O.whenReady().then(async () => {
  const { ipcMain: s } = await import("electron");
  s.on("hud-overlay-close", () => {
    O.quit();
  }), Gt(), qt(), await Si(), si(
    Ei,
    ki,
    () => T,
    () => ce,
    (e, t) => {
      ys = t, X || Gt(), qt(e), e || T && T.restore();
    }
  ), yi($), ft();
});
export {
  so as MAIN_DIST,
  $ as RECORDINGS_DIR,
  gs as RENDERER_DIST,
  vi as VITE_DEV_SERVER_URL
};
