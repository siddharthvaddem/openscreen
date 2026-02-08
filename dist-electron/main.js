var Qh = Object.defineProperty;
var rl = (t) => {
  throw TypeError(t);
};
var em = (t, e, r) => e in t ? Qh(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r;
var de = (t, e, r) => em(t, typeof e != "symbol" ? e + "" : e, r), Fo = (t, e, r) => e.has(t) || rl("Cannot " + r);
var Y = (t, e, r) => (Fo(t, e, "read from private field"), r ? r.call(t) : e.get(t)), pt = (t, e, r) => e.has(t) ? rl("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), He = (t, e, r, s) => (Fo(t, e, "write to private field"), s ? s.call(t, r) : e.set(t, r), r), Pt = (t, e, r) => (Fo(t, e, "access private method"), r);
import hd, { ipcMain as Z, screen as md, BrowserWindow as fo, app as Be, safeStorage as Bs, desktopCapturer as tm, shell as rm, dialog as sl, nativeImage as sm, globalShortcut as pd, Tray as nm, Menu as om } from "electron";
import { fileURLToPath as Wi } from "node:url";
import C from "node:path";
import xe from "node:fs/promises";
import { WritableStream as yd } from "stream/web";
import im from "events";
import am from "https";
import cm from "http";
import lm from "net";
import um from "tls";
import Ji from "crypto";
import Xs, { Readable as dm } from "stream";
import fm from "url";
import hm from "zlib";
import mm from "buffer";
import * as Ei from "fs";
import { createReadStream as pm } from "fs";
import { spawn as ym } from "child_process";
import * as $d from "path";
import * as $m from "os";
import { createRequire as gm } from "module";
import pe from "node:process";
import { promisify as Oe, isDeepStrictEqual as nl } from "node:util";
import Q from "node:fs";
import yr from "node:crypto";
import ol from "node:assert";
import gd from "node:os";
import "node:events";
import "node:stream";
const Gs = C.dirname(Wi(import.meta.url)), _d = C.join(Gs, ".."), Xt = process.env.VITE_DEV_SERVER_URL, Xi = C.join(_d, "dist");
function _m(t, e) {
  const r = C.resolve(t), s = C.resolve(e);
  return r === s || r.startsWith(s + C.sep);
}
let Xr = null;
Z.on("hud-overlay-hide", () => {
  Xr && !Xr.isDestroyed() && Xr.minimize();
});
function vm() {
  const t = md.getPrimaryDisplay(), { workArea: e } = t, r = 500, s = 350, n = Math.floor(e.x + (e.width - r) / 2), o = Math.floor(e.y + e.height - s - 5), i = new fo({
    width: r,
    height: s,
    minWidth: 580,
    maxWidth: 580,
    minHeight: 350,
    maxHeight: 350,
    x: n,
    y: o,
    frame: !1,
    transparent: !0,
    resizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    hasShadow: !1,
    webPreferences: {
      preload: C.join(Gs, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return i.webContents.on("did-finish-load", () => {
    i == null || i.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), i.webContents.setWindowOpenHandler(({ url: a }) => {
    try {
      const c = new URL(a);
      if (c.searchParams.get("windowType") !== "mic-settings")
        return { action: "deny" };
      const d = Xt ? new URL(Xt).origin : null, u = d !== null && c.origin === d, f = c.protocol === "file:" && _m(Wi(c), _d);
      return !u && !f ? (console.warn("[Security] Blocked window.open from untrusted origin:", a), { action: "deny" }) : {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 340,
          height: 520,
          frame: !1,
          transparent: !0,
          resizable: !1,
          alwaysOnTop: !0,
          skipTaskbar: !0,
          parent: i,
          modal: !1,
          webPreferences: {
            preload: C.join(Gs, "preload.mjs"),
            nodeIntegration: !1,
            contextIsolation: !0
          }
        }
      };
    } catch {
      return { action: "deny" };
    }
  }), Xr = i, i.on("closed", () => {
    Xr === i && (Xr = null);
  }), Xt ? i.loadURL(Xt + "?windowType=hud-overlay") : i.loadFile(C.join(Xi, "index.html"), {
    query: { windowType: "hud-overlay" }
  }), i;
}
function wm() {
  const t = process.platform === "darwin", e = new fo({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...t && {
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
      preload: C.join(Gs, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return e.maximize(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Xt ? e.loadURL(Xt + "?windowType=editor") : e.loadFile(C.join(Xi, "index.html"), {
    query: { windowType: "editor" }
  }), e;
}
function Em() {
  const { width: t, height: e } = md.getPrimaryDisplay().workAreaSize, r = new fo({
    width: 620,
    height: 420,
    minHeight: 350,
    maxHeight: 500,
    x: Math.round((t - 620) / 2),
    y: Math.round((e - 420) / 2),
    frame: !1,
    resizable: !1,
    alwaysOnTop: !0,
    transparent: !0,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: C.join(Gs, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  return Xt ? r.loadURL(Xt + "?windowType=source-selector") : r.loadFile(C.join(Xi, "index.html"), {
    query: { windowType: "source-selector" }
  }), r;
}
const Sm = "presets.json", bm = 1;
function Si() {
  return C.join(Be.getPath("userData"), Sm);
}
function Uo() {
  return {
    version: bm,
    defaultPresetId: null,
    presets: []
  };
}
async function cs() {
  try {
    const t = Si(), e = await xe.readFile(t, "utf-8"), r = JSON.parse(e);
    return !r.presets || !Array.isArray(r.presets) ? (console.warn("Invalid presets file, creating new store"), Uo()) : r;
  } catch (t) {
    if (t instanceof Error && "code" in t && t.code === "ENOENT")
      return Uo();
    console.error("Failed to read presets file:", t);
    try {
      const e = Si(), r = e + ".backup." + Date.now();
      await xe.rename(e, r), console.log("Backed up corrupt presets file to:", r);
    } catch {
    }
    return Uo();
  }
}
async function Ys(t) {
  const e = Si();
  await xe.writeFile(e, JSON.stringify(t, null, 2), "utf-8");
}
async function Pm() {
  try {
    const t = await cs();
    return {
      success: !0,
      presets: t.presets,
      defaultPresetId: t.defaultPresetId
    };
  } catch (t) {
    return console.error("Failed to get presets:", t), {
      success: !1,
      presets: [],
      defaultPresetId: null
    };
  }
}
async function km(t) {
  try {
    const e = await cs(), r = {
      ...t,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    return r.isDefault && (e.presets = e.presets.map((s) => ({ ...s, isDefault: !1 })), e.defaultPresetId = r.id), e.presets.push(r), await Ys(e), { success: !0, preset: r };
  } catch (e) {
    return console.error("Failed to save preset:", e), { success: !1, error: String(e) };
  }
}
async function Tm(t, e) {
  try {
    const r = await cs(), s = r.presets.findIndex((n) => n.id === t);
    return s === -1 ? { success: !1, error: "Preset not found" } : (e.isDefault === !0 ? (r.presets = r.presets.map((n) => ({ ...n, isDefault: !1 })), r.defaultPresetId = t) : e.isDefault === !1 && r.defaultPresetId === t && (r.defaultPresetId = null), r.presets[s] = { ...r.presets[s], ...e }, await Ys(r), { success: !0, preset: r.presets[s] });
  } catch (r) {
    return console.error("Failed to update preset:", r), { success: !1, error: String(r) };
  }
}
async function Nm(t) {
  try {
    const e = await cs(), r = e.presets.findIndex((s) => s.id === t);
    return r === -1 ? { success: !1, error: "Preset not found" } : (e.defaultPresetId === t && (e.defaultPresetId = null), e.presets.splice(r, 1), await Ys(e), { success: !0 });
  } catch (e) {
    return console.error("Failed to delete preset:", e), { success: !1, error: String(e) };
  }
}
async function Om(t) {
  try {
    const e = await cs(), r = e.presets.find((n) => n.id === t);
    if (!r)
      return { success: !1, error: "Preset not found" };
    const s = {
      ...r,
      id: crypto.randomUUID(),
      name: `Copy of ${r.name}`,
      createdAt: Date.now(),
      isDefault: !1
      // Duplicates should never be default
    };
    return e.presets.push(s), await Ys(e), { success: !0, preset: s };
  } catch (e) {
    return console.error("Failed to duplicate preset:", e), { success: !1, error: String(e) };
  }
}
async function Rm(t) {
  try {
    const e = await cs();
    if (e.presets = e.presets.map((r) => ({ ...r, isDefault: !1 })), e.defaultPresetId = null, t) {
      const r = e.presets.find((s) => s.id === t);
      if (!r)
        return { success: !1, error: "Preset not found" };
      r.isDefault = !0, e.defaultPresetId = t;
    }
    return await Ys(e), { success: !0 };
  } catch (e) {
    return console.error("Failed to set default preset:", e), { success: !1, error: String(e) };
  }
}
function Yi(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Jn = { exports: {} };
const vd = ["nodebuffer", "arraybuffer", "fragments"], wd = typeof Blob < "u";
wd && vd.push("blob");
var tr = {
  BINARY_TYPES: vd,
  CLOSE_TIMEOUT: 3e4,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: wd,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
}, Im, Am;
const { EMPTY_BUFFER: jm } = tr, bi = Buffer[Symbol.species];
function Cm(t, e) {
  if (t.length === 0) return jm;
  if (t.length === 1) return t[0];
  const r = Buffer.allocUnsafe(e);
  let s = 0;
  for (let n = 0; n < t.length; n++) {
    const o = t[n];
    r.set(o, s), s += o.length;
  }
  return s < e ? new bi(r.buffer, r.byteOffset, s) : r;
}
function Ed(t, e, r, s, n) {
  for (let o = 0; o < n; o++)
    r[s + o] = t[o] ^ e[o & 3];
}
function Sd(t, e) {
  for (let r = 0; r < t.length; r++)
    t[r] ^= e[r & 3];
}
function Dm(t) {
  return t.length === t.buffer.byteLength ? t.buffer : t.buffer.slice(t.byteOffset, t.byteOffset + t.length);
}
function Pi(t) {
  if (Pi.readOnly = !0, Buffer.isBuffer(t)) return t;
  let e;
  return t instanceof ArrayBuffer ? e = new bi(t) : ArrayBuffer.isView(t) ? e = new bi(t.buffer, t.byteOffset, t.byteLength) : (e = Buffer.from(t), Pi.readOnly = !1), e;
}
Jn.exports = {
  concat: Cm,
  mask: Ed,
  toArrayBuffer: Dm,
  toBuffer: Pi,
  unmask: Sd
};
if (!process.env.WS_NO_BUFFER_UTIL)
  try {
    const t = require("bufferutil");
    Am = Jn.exports.mask = function(e, r, s, n, o) {
      o < 48 ? Ed(e, r, s, n, o) : t.mask(e, r, s, n, o);
    }, Im = Jn.exports.unmask = function(e, r) {
      e.length < 32 ? Sd(e, r) : t.unmask(e, r);
    };
  } catch {
  }
var ho = Jn.exports;
const il = Symbol("kDone"), Vo = Symbol("kRun");
let Mm = class {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(e) {
    this[il] = () => {
      this.pending--, this[Vo]();
    }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(e) {
    this.jobs.push(e), this[Vo]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [Vo]() {
    if (this.pending !== this.concurrency && this.jobs.length) {
      const e = this.jobs.shift();
      this.pending++, e(this[il]);
    }
  }
};
var Lm = Mm;
const vs = hm, al = ho, Fm = Lm, { kStatusCode: bd } = tr, Um = Buffer[Symbol.species], Vm = Buffer.from([0, 0, 255, 255]), Xn = Symbol("permessage-deflate"), Tt = Symbol("total-length"), Br = Symbol("callback"), Gt = Symbol("buffers"), Yr = Symbol("error");
let an, zm = class {
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
  constructor(e, r, s) {
    if (this._maxPayload = s | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!r, this._deflate = null, this._inflate = null, this.params = null, !an) {
      const n = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      an = new Fm(n);
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
      const e = this._deflate[Br];
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
    const r = this._options, s = e.find((n) => !(r.serverNoContextTakeover === !1 && n.server_no_context_takeover || n.server_max_window_bits && (r.serverMaxWindowBits === !1 || typeof r.serverMaxWindowBits == "number" && r.serverMaxWindowBits > n.server_max_window_bits) || typeof r.clientMaxWindowBits == "number" && !n.client_max_window_bits));
    if (!s)
      throw new Error("None of the extension offers can be accepted");
    return r.serverNoContextTakeover && (s.server_no_context_takeover = !0), r.clientNoContextTakeover && (s.client_no_context_takeover = !0), typeof r.serverMaxWindowBits == "number" && (s.server_max_window_bits = r.serverMaxWindowBits), typeof r.clientMaxWindowBits == "number" ? s.client_max_window_bits = r.clientMaxWindowBits : (s.client_max_window_bits === !0 || r.clientMaxWindowBits === !1) && delete s.client_max_window_bits, s;
  }
  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(e) {
    const r = e[0];
    if (this._options.clientNoContextTakeover === !1 && r.client_no_context_takeover)
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    if (!r.client_max_window_bits)
      typeof this._options.clientMaxWindowBits == "number" && (r.client_max_window_bits = this._options.clientMaxWindowBits);
    else if (this._options.clientMaxWindowBits === !1 || typeof this._options.clientMaxWindowBits == "number" && r.client_max_window_bits > this._options.clientMaxWindowBits)
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    return r;
  }
  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(e) {
    return e.forEach((r) => {
      Object.keys(r).forEach((s) => {
        let n = r[s];
        if (n.length > 1)
          throw new Error(`Parameter "${s}" must have only a single value`);
        if (n = n[0], s === "client_max_window_bits") {
          if (n !== !0) {
            const o = +n;
            if (!Number.isInteger(o) || o < 8 || o > 15)
              throw new TypeError(
                `Invalid value for parameter "${s}": ${n}`
              );
            n = o;
          } else if (!this._isServer)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${n}`
            );
        } else if (s === "server_max_window_bits") {
          const o = +n;
          if (!Number.isInteger(o) || o < 8 || o > 15)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${n}`
            );
          n = o;
        } else if (s === "client_no_context_takeover" || s === "server_no_context_takeover") {
          if (n !== !0)
            throw new TypeError(
              `Invalid value for parameter "${s}": ${n}`
            );
        } else
          throw new Error(`Unknown parameter "${s}"`);
        r[s] = n;
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
  decompress(e, r, s) {
    an.add((n) => {
      this._decompress(e, r, (o, i) => {
        n(), s(o, i);
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
  compress(e, r, s) {
    an.add((n) => {
      this._compress(e, r, (o, i) => {
        n(), s(o, i);
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
  _decompress(e, r, s) {
    const n = this._isServer ? "client" : "server";
    if (!this._inflate) {
      const o = `${n}_max_window_bits`, i = typeof this.params[o] != "number" ? vs.Z_DEFAULT_WINDOWBITS : this.params[o];
      this._inflate = vs.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits: i
      }), this._inflate[Xn] = this, this._inflate[Tt] = 0, this._inflate[Gt] = [], this._inflate.on("error", xm), this._inflate.on("data", Pd);
    }
    this._inflate[Br] = s, this._inflate.write(e), r && this._inflate.write(Vm), this._inflate.flush(() => {
      const o = this._inflate[Yr];
      if (o) {
        this._inflate.close(), this._inflate = null, s(o);
        return;
      }
      const i = al.concat(
        this._inflate[Gt],
        this._inflate[Tt]
      );
      this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[Tt] = 0, this._inflate[Gt] = [], r && this.params[`${n}_no_context_takeover`] && this._inflate.reset()), s(null, i);
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
  _compress(e, r, s) {
    const n = this._isServer ? "server" : "client";
    if (!this._deflate) {
      const o = `${n}_max_window_bits`, i = typeof this.params[o] != "number" ? vs.Z_DEFAULT_WINDOWBITS : this.params[o];
      this._deflate = vs.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits: i
      }), this._deflate[Tt] = 0, this._deflate[Gt] = [], this._deflate.on("data", Km);
    }
    this._deflate[Br] = s, this._deflate.write(e), this._deflate.flush(vs.Z_SYNC_FLUSH, () => {
      if (!this._deflate)
        return;
      let o = al.concat(
        this._deflate[Gt],
        this._deflate[Tt]
      );
      r && (o = new Um(o.buffer, o.byteOffset, o.length - 4)), this._deflate[Br] = null, this._deflate[Tt] = 0, this._deflate[Gt] = [], r && this.params[`${n}_no_context_takeover`] && this._deflate.reset(), s(null, o);
    });
  }
};
var Zi = zm;
function Km(t) {
  this[Gt].push(t), this[Tt] += t.length;
}
function Pd(t) {
  if (this[Tt] += t.length, this[Xn]._maxPayload < 1 || this[Tt] <= this[Xn]._maxPayload) {
    this[Gt].push(t);
    return;
  }
  this[Yr] = new RangeError("Max payload size exceeded"), this[Yr].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[Yr][bd] = 1009, this.removeListener("data", Pd), this.reset();
}
function xm(t) {
  if (this[Xn]._inflate = null, this[Yr]) {
    this[Br](this[Yr]);
    return;
  }
  t[bd] = 1007, this[Br](t);
}
var Yn = { exports: {} }, cl;
const { isUtf8: ll } = mm, { hasBlob: qm } = tr, Bm = [
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
function Gm(t) {
  return t >= 1e3 && t <= 1014 && t !== 1004 && t !== 1005 && t !== 1006 || t >= 3e3 && t <= 4999;
}
function ki(t) {
  const e = t.length;
  let r = 0;
  for (; r < e; )
    if (!(t[r] & 128))
      r++;
    else if ((t[r] & 224) === 192) {
      if (r + 1 === e || (t[r + 1] & 192) !== 128 || (t[r] & 254) === 192)
        return !1;
      r += 2;
    } else if ((t[r] & 240) === 224) {
      if (r + 2 >= e || (t[r + 1] & 192) !== 128 || (t[r + 2] & 192) !== 128 || t[r] === 224 && (t[r + 1] & 224) === 128 || // Overlong
      t[r] === 237 && (t[r + 1] & 224) === 160)
        return !1;
      r += 3;
    } else if ((t[r] & 248) === 240) {
      if (r + 3 >= e || (t[r + 1] & 192) !== 128 || (t[r + 2] & 192) !== 128 || (t[r + 3] & 192) !== 128 || t[r] === 240 && (t[r + 1] & 240) === 128 || // Overlong
      t[r] === 244 && t[r + 1] > 143 || t[r] > 244)
        return !1;
      r += 4;
    } else
      return !1;
  return !0;
}
function Hm(t) {
  return qm && typeof t == "object" && typeof t.arrayBuffer == "function" && typeof t.type == "string" && typeof t.stream == "function" && (t[Symbol.toStringTag] === "Blob" || t[Symbol.toStringTag] === "File");
}
Yn.exports = {
  isBlob: Hm,
  isValidStatusCode: Gm,
  isValidUTF8: ki,
  tokenChars: Bm
};
if (ll)
  cl = Yn.exports.isValidUTF8 = function(t) {
    return t.length < 24 ? ki(t) : ll(t);
  };
else if (!process.env.WS_NO_UTF_8_VALIDATE)
  try {
    const t = require("utf-8-validate");
    cl = Yn.exports.isValidUTF8 = function(e) {
      return e.length < 32 ? ki(e) : t(e);
    };
  } catch {
  }
var Zs = Yn.exports;
const { Writable: Wm } = Xs, ul = Zi, {
  BINARY_TYPES: Jm,
  EMPTY_BUFFER: dl,
  kStatusCode: Xm,
  kWebSocket: Ym
} = tr, { concat: zo, toArrayBuffer: Zm, unmask: Qm } = ho, { isValidStatusCode: ep, isValidUTF8: fl } = Zs, cn = Buffer[Symbol.species], Ye = 0, hl = 1, ml = 2, pl = 3, Ko = 4, xo = 5, ln = 6;
let tp = class extends Wm {
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
    super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : !0, this._binaryType = e.binaryType || Jm[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[Ym] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = !1, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = !1, this._fin = !1, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = !1, this._loop = !1, this._state = Ye;
  }
  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(e, r, s) {
    if (this._opcode === 8 && this._state == Ye) return s();
    this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(s);
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
      const s = this._buffers[0];
      return this._buffers[0] = new cn(
        s.buffer,
        s.byteOffset + e,
        s.length - e
      ), new cn(s.buffer, s.byteOffset, e);
    }
    const r = Buffer.allocUnsafe(e);
    do {
      const s = this._buffers[0], n = r.length - e;
      e >= s.length ? r.set(this._buffers.shift(), n) : (r.set(new Uint8Array(s.buffer, s.byteOffset, e), n), this._buffers[0] = new cn(
        s.buffer,
        s.byteOffset + e,
        s.length - e
      )), e -= s.length;
    } while (e > 0);
    return r;
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
        case Ye:
          this.getInfo(e);
          break;
        case hl:
          this.getPayloadLength16(e);
          break;
        case ml:
          this.getPayloadLength64(e);
          break;
        case pl:
          this.getMask();
          break;
        case Ko:
          this.getData(e);
          break;
        case xo:
        case ln:
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
    const r = this.consume(2);
    if (r[0] & 48) {
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
    const s = (r[0] & 64) === 64;
    if (s && !this._extensions[ul.extensionName]) {
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
    if (this._fin = (r[0] & 128) === 128, this._opcode = r[0] & 15, this._payloadLength = r[1] & 127, this._opcode === 0) {
      if (s) {
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
      this._compressed = s;
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
      if (s) {
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
    if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (r[1] & 128) === 128, this._isServer) {
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
    this._payloadLength === 126 ? this._state = hl : this._payloadLength === 127 ? this._state = ml : this.haveLength(e);
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
    const r = this.consume(8), s = r.readUInt32BE(0);
    if (s > Math.pow(2, 21) - 1) {
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
    this._payloadLength = s * Math.pow(2, 32) + r.readUInt32BE(4), this.haveLength(e);
  }
  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(e) {
    if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
      const r = this.createError(
        RangeError,
        "Max payload size exceeded",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
      );
      e(r);
      return;
    }
    this._masked ? this._state = pl : this._state = Ko;
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
    this._mask = this.consume(4), this._state = Ko;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(e) {
    let r = dl;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = !1;
        return;
      }
      r = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && Qm(r, this._mask);
    }
    if (this._opcode > 7) {
      this.controlMessage(r, e);
      return;
    }
    if (this._compressed) {
      this._state = xo, this.decompress(r, e);
      return;
    }
    r.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(r)), this.dataMessage(e);
  }
  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(e, r) {
    this._extensions[ul.extensionName].decompress(e, this._fin, (n, o) => {
      if (n) return r(n);
      if (o.length) {
        if (this._messageLength += o.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const i = this.createError(
            RangeError,
            "Max payload size exceeded",
            !1,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          r(i);
          return;
        }
        this._fragments.push(o);
      }
      this.dataMessage(r), this._state === Ye && this.startLoop(r);
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
      this._state = Ye;
      return;
    }
    const r = this._messageLength, s = this._fragments;
    if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
      let n;
      this._binaryType === "nodebuffer" ? n = zo(s, r) : this._binaryType === "arraybuffer" ? n = Zm(zo(s, r)) : this._binaryType === "blob" ? n = new Blob(s) : n = s, this._allowSynchronousEvents ? (this.emit("message", n, !0), this._state = Ye) : (this._state = ln, setImmediate(() => {
        this.emit("message", n, !0), this._state = Ye, this.startLoop(e);
      }));
    } else {
      const n = zo(s, r);
      if (!this._skipUTF8Validation && !fl(n)) {
        const o = this.createError(
          Error,
          "invalid UTF-8 sequence",
          !0,
          1007,
          "WS_ERR_INVALID_UTF8"
        );
        e(o);
        return;
      }
      this._state === xo || this._allowSynchronousEvents ? (this.emit("message", n, !1), this._state = Ye) : (this._state = ln, setImmediate(() => {
        this.emit("message", n, !1), this._state = Ye, this.startLoop(e);
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
  controlMessage(e, r) {
    if (this._opcode === 8) {
      if (e.length === 0)
        this._loop = !1, this.emit("conclude", 1005, dl), this.end();
      else {
        const s = e.readUInt16BE(0);
        if (!ep(s)) {
          const o = this.createError(
            RangeError,
            `invalid status code ${s}`,
            !0,
            1002,
            "WS_ERR_INVALID_CLOSE_CODE"
          );
          r(o);
          return;
        }
        const n = new cn(
          e.buffer,
          e.byteOffset + 2,
          e.length - 2
        );
        if (!this._skipUTF8Validation && !fl(n)) {
          const o = this.createError(
            Error,
            "invalid UTF-8 sequence",
            !0,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          r(o);
          return;
        }
        this._loop = !1, this.emit("conclude", s, n), this.end();
      }
      this._state = Ye;
      return;
    }
    this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = Ye) : (this._state = ln, setImmediate(() => {
      this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = Ye, this.startLoop(r);
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
  createError(e, r, s, n, o) {
    this._loop = !1, this._errored = !0;
    const i = new e(
      s ? `Invalid WebSocket frame: ${r}` : r
    );
    return Error.captureStackTrace(i, this.createError), i.code = o, i[Xm] = n, i;
  }
};
var rp = tp;
const { Duplex: lR } = Xs, { randomFillSync: sp } = Ji, yl = Zi, { EMPTY_BUFFER: np, kWebSocket: op, NOOP: ip } = tr, { isBlob: Dr, isValidStatusCode: ap } = Zs, { mask: $l, toBuffer: $r } = ho, Ze = Symbol("kByteLength"), cp = Buffer.alloc(4), Ln = 8 * 1024;
let gr, Mr = Ln;
const st = 0, lp = 1, up = 2;
let dp = class wr {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(e, r, s) {
    this._extensions = r || {}, s && (this._generateMask = s, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = !0, this._compress = !1, this._bufferedBytes = 0, this._queue = [], this._state = st, this.onerror = ip, this[op] = void 0;
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
  static frame(e, r) {
    let s, n = !1, o = 2, i = !1;
    r.mask && (s = r.maskBuffer || cp, r.generateMask ? r.generateMask(s) : (Mr === Ln && (gr === void 0 && (gr = Buffer.alloc(Ln)), sp(gr, 0, Ln), Mr = 0), s[0] = gr[Mr++], s[1] = gr[Mr++], s[2] = gr[Mr++], s[3] = gr[Mr++]), i = (s[0] | s[1] | s[2] | s[3]) === 0, o = 6);
    let a;
    typeof e == "string" ? (!r.mask || i) && r[Ze] !== void 0 ? a = r[Ze] : (e = Buffer.from(e), a = e.length) : (a = e.length, n = r.mask && r.readOnly && !i);
    let c = a;
    a >= 65536 ? (o += 8, c = 127) : a > 125 && (o += 2, c = 126);
    const d = Buffer.allocUnsafe(n ? a + o : o);
    return d[0] = r.fin ? r.opcode | 128 : r.opcode, r.rsv1 && (d[0] |= 64), d[1] = c, c === 126 ? d.writeUInt16BE(a, 2) : c === 127 && (d[2] = d[3] = 0, d.writeUIntBE(a, 4, 6)), r.mask ? (d[1] |= 128, d[o - 4] = s[0], d[o - 3] = s[1], d[o - 2] = s[2], d[o - 1] = s[3], i ? [d, e] : n ? ($l(e, s, d, o, a), [d]) : ($l(e, s, e, 0, a), [d, e])) : [d, e];
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
  close(e, r, s, n) {
    let o;
    if (e === void 0)
      o = np;
    else {
      if (typeof e != "number" || !ap(e))
        throw new TypeError("First argument must be a valid error code number");
      if (r === void 0 || !r.length)
        o = Buffer.allocUnsafe(2), o.writeUInt16BE(e, 0);
      else {
        const a = Buffer.byteLength(r);
        if (a > 123)
          throw new RangeError("The message must not be greater than 123 bytes");
        o = Buffer.allocUnsafe(2 + a), o.writeUInt16BE(e, 0), typeof r == "string" ? o.write(r, 2) : o.set(r, 2);
      }
    }
    const i = {
      [Ze]: o.length,
      fin: !0,
      generateMask: this._generateMask,
      mask: s,
      maskBuffer: this._maskBuffer,
      opcode: 8,
      readOnly: !1,
      rsv1: !1
    };
    this._state !== st ? this.enqueue([this.dispatch, o, !1, i, n]) : this.sendFrame(wr.frame(o, i), n);
  }
  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(e, r, s) {
    let n, o;
    if (typeof e == "string" ? (n = Buffer.byteLength(e), o = !1) : Dr(e) ? (n = e.size, o = !1) : (e = $r(e), n = e.length, o = $r.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const i = {
      [Ze]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: r,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly: o,
      rsv1: !1
    };
    Dr(e) ? this._state !== st ? this.enqueue([this.getBlobData, e, !1, i, s]) : this.getBlobData(e, !1, i, s) : this._state !== st ? this.enqueue([this.dispatch, e, !1, i, s]) : this.sendFrame(wr.frame(e, i), s);
  }
  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(e, r, s) {
    let n, o;
    if (typeof e == "string" ? (n = Buffer.byteLength(e), o = !1) : Dr(e) ? (n = e.size, o = !1) : (e = $r(e), n = e.length, o = $r.readOnly), n > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const i = {
      [Ze]: n,
      fin: !0,
      generateMask: this._generateMask,
      mask: r,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly: o,
      rsv1: !1
    };
    Dr(e) ? this._state !== st ? this.enqueue([this.getBlobData, e, !1, i, s]) : this.getBlobData(e, !1, i, s) : this._state !== st ? this.enqueue([this.dispatch, e, !1, i, s]) : this.sendFrame(wr.frame(e, i), s);
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
  send(e, r, s) {
    const n = this._extensions[yl.extensionName];
    let o = r.binary ? 2 : 1, i = r.compress, a, c;
    typeof e == "string" ? (a = Buffer.byteLength(e), c = !1) : Dr(e) ? (a = e.size, c = !1) : (e = $r(e), a = e.length, c = $r.readOnly), this._firstFragment ? (this._firstFragment = !1, i && n && n.params[n._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (i = a >= n._threshold), this._compress = i) : (i = !1, o = 0), r.fin && (this._firstFragment = !0);
    const d = {
      [Ze]: a,
      fin: r.fin,
      generateMask: this._generateMask,
      mask: r.mask,
      maskBuffer: this._maskBuffer,
      opcode: o,
      readOnly: c,
      rsv1: i
    };
    Dr(e) ? this._state !== st ? this.enqueue([this.getBlobData, e, this._compress, d, s]) : this.getBlobData(e, this._compress, d, s) : this._state !== st ? this.enqueue([this.dispatch, e, this._compress, d, s]) : this.dispatch(e, this._compress, d, s);
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
  getBlobData(e, r, s, n) {
    this._bufferedBytes += s[Ze], this._state = up, e.arrayBuffer().then((o) => {
      if (this._socket.destroyed) {
        const a = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(Ti, this, a, n);
        return;
      }
      this._bufferedBytes -= s[Ze];
      const i = $r(o);
      r ? this.dispatch(i, r, s, n) : (this._state = st, this.sendFrame(wr.frame(i, s), n), this.dequeue());
    }).catch((o) => {
      process.nextTick(hp, this, o, n);
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
  dispatch(e, r, s, n) {
    if (!r) {
      this.sendFrame(wr.frame(e, s), n);
      return;
    }
    const o = this._extensions[yl.extensionName];
    this._bufferedBytes += s[Ze], this._state = lp, o.compress(e, s.fin, (i, a) => {
      if (this._socket.destroyed) {
        const c = new Error(
          "The socket was closed while data was being compressed"
        );
        Ti(this, c, n);
        return;
      }
      this._bufferedBytes -= s[Ze], this._state = st, s.readOnly = !1, this.sendFrame(wr.frame(a, s), n), this.dequeue();
    });
  }
  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    for (; this._state === st && this._queue.length; ) {
      const e = this._queue.shift();
      this._bufferedBytes -= e[3][Ze], Reflect.apply(e[0], this, e.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(e) {
    this._bufferedBytes += e[3][Ze], this._queue.push(e);
  }
  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(e, r) {
    e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], r), this._socket.uncork()) : this._socket.write(e[0], r);
  }
};
var fp = dp;
function Ti(t, e, r) {
  typeof r == "function" && r(e);
  for (let s = 0; s < t._queue.length; s++) {
    const n = t._queue[s], o = n[n.length - 1];
    typeof o == "function" && o(e);
  }
}
function hp(t, e, r) {
  Ti(t, e, r), t.onerror(e);
}
const { kForOnEventAttribute: ws, kListener: qo } = tr, gl = Symbol("kCode"), _l = Symbol("kData"), vl = Symbol("kError"), wl = Symbol("kMessage"), El = Symbol("kReason"), Gr = Symbol("kTarget"), Sl = Symbol("kType"), bl = Symbol("kWasClean");
let ls = class {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(e) {
    this[Gr] = null, this[Sl] = e;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[Gr];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[Sl];
  }
};
Object.defineProperty(ls.prototype, "target", { enumerable: !0 });
Object.defineProperty(ls.prototype, "type", { enumerable: !0 });
class mo extends ls {
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
  constructor(e, r = {}) {
    super(e), this[gl] = r.code === void 0 ? 0 : r.code, this[El] = r.reason === void 0 ? "" : r.reason, this[bl] = r.wasClean === void 0 ? !1 : r.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[gl];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[El];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[bl];
  }
}
Object.defineProperty(mo.prototype, "code", { enumerable: !0 });
Object.defineProperty(mo.prototype, "reason", { enumerable: !0 });
Object.defineProperty(mo.prototype, "wasClean", { enumerable: !0 });
class Qi extends ls {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(e, r = {}) {
    super(e), this[vl] = r.error === void 0 ? null : r.error, this[wl] = r.message === void 0 ? "" : r.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[vl];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[wl];
  }
}
Object.defineProperty(Qi.prototype, "error", { enumerable: !0 });
Object.defineProperty(Qi.prototype, "message", { enumerable: !0 });
class kd extends ls {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(e, r = {}) {
    super(e), this[_l] = r.data === void 0 ? null : r.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[_l];
  }
}
Object.defineProperty(kd.prototype, "data", { enumerable: !0 });
const mp = {
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
  addEventListener(t, e, r = {}) {
    for (const n of this.listeners(t))
      if (!r[ws] && n[qo] === e && !n[ws])
        return;
    let s;
    if (t === "message")
      s = function(o, i) {
        const a = new kd("message", {
          data: i ? o : o.toString()
        });
        a[Gr] = this, un(e, this, a);
      };
    else if (t === "close")
      s = function(o, i) {
        const a = new mo("close", {
          code: o,
          reason: i.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        a[Gr] = this, un(e, this, a);
      };
    else if (t === "error")
      s = function(o) {
        const i = new Qi("error", {
          error: o,
          message: o.message
        });
        i[Gr] = this, un(e, this, i);
      };
    else if (t === "open")
      s = function() {
        const o = new ls("open");
        o[Gr] = this, un(e, this, o);
      };
    else
      return;
    s[ws] = !!r[ws], s[qo] = e, r.once ? this.once(t, s) : this.on(t, s);
  },
  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(t, e) {
    for (const r of this.listeners(t))
      if (r[qo] === e && !r[ws]) {
        this.removeListener(t, r);
        break;
      }
  }
};
var pp = {
  EventTarget: mp
};
function un(t, e, r) {
  typeof t == "object" && t.handleEvent ? t.handleEvent.call(t, r) : t.call(e, r);
}
const { tokenChars: Es } = Zs;
function yt(t, e, r) {
  t[e] === void 0 ? t[e] = [r] : t[e].push(r);
}
function yp(t) {
  const e = /* @__PURE__ */ Object.create(null);
  let r = /* @__PURE__ */ Object.create(null), s = !1, n = !1, o = !1, i, a, c = -1, d = -1, u = -1, f = 0;
  for (; f < t.length; f++)
    if (d = t.charCodeAt(f), i === void 0)
      if (u === -1 && Es[d] === 1)
        c === -1 && (c = f);
      else if (f !== 0 && (d === 32 || d === 9))
        u === -1 && c !== -1 && (u = f);
      else if (d === 59 || d === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${f}`);
        u === -1 && (u = f);
        const _ = t.slice(c, u);
        d === 44 ? (yt(e, _, r), r = /* @__PURE__ */ Object.create(null)) : i = _, c = u = -1;
      } else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (a === void 0)
      if (u === -1 && Es[d] === 1)
        c === -1 && (c = f);
      else if (d === 32 || d === 9)
        u === -1 && c !== -1 && (u = f);
      else if (d === 59 || d === 44) {
        if (c === -1)
          throw new SyntaxError(`Unexpected character at index ${f}`);
        u === -1 && (u = f), yt(r, t.slice(c, u), !0), d === 44 && (yt(e, i, r), r = /* @__PURE__ */ Object.create(null), i = void 0), c = u = -1;
      } else if (d === 61 && c !== -1 && u === -1)
        a = t.slice(c, f), c = u = -1;
      else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (n) {
      if (Es[d] !== 1)
        throw new SyntaxError(`Unexpected character at index ${f}`);
      c === -1 ? c = f : s || (s = !0), n = !1;
    } else if (o)
      if (Es[d] === 1)
        c === -1 && (c = f);
      else if (d === 34 && c !== -1)
        o = !1, u = f;
      else if (d === 92)
        n = !0;
      else
        throw new SyntaxError(`Unexpected character at index ${f}`);
    else if (d === 34 && t.charCodeAt(f - 1) === 61)
      o = !0;
    else if (u === -1 && Es[d] === 1)
      c === -1 && (c = f);
    else if (c !== -1 && (d === 32 || d === 9))
      u === -1 && (u = f);
    else if (d === 59 || d === 44) {
      if (c === -1)
        throw new SyntaxError(`Unexpected character at index ${f}`);
      u === -1 && (u = f);
      let _ = t.slice(c, u);
      s && (_ = _.replace(/\\/g, ""), s = !1), yt(r, a, _), d === 44 && (yt(e, i, r), r = /* @__PURE__ */ Object.create(null), i = void 0), a = void 0, c = u = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${f}`);
  if (c === -1 || o || d === 32 || d === 9)
    throw new SyntaxError("Unexpected end of input");
  u === -1 && (u = f);
  const E = t.slice(c, u);
  return i === void 0 ? yt(e, E, r) : (a === void 0 ? yt(r, E, !0) : s ? yt(r, a, E.replace(/\\/g, "")) : yt(r, a, E), yt(e, i, r)), e;
}
function $p(t) {
  return Object.keys(t).map((e) => {
    let r = t[e];
    return Array.isArray(r) || (r = [r]), r.map((s) => [e].concat(
      Object.keys(s).map((n) => {
        let o = s[n];
        return Array.isArray(o) || (o = [o]), o.map((i) => i === !0 ? n : `${n}=${i}`).join("; ");
      })
    ).join("; ")).join(", ");
  }).join(", ");
}
var gp = { format: $p, parse: yp };
const _p = im, vp = am, wp = cm, Td = lm, Ep = um, { randomBytes: Sp, createHash: bp } = Ji, { Duplex: dR, Readable: fR } = Xs, { URL: Bo } = fm, Ht = Zi, Pp = rp, kp = fp, { isBlob: Tp } = Zs, {
  BINARY_TYPES: Pl,
  CLOSE_TIMEOUT: Np,
  EMPTY_BUFFER: dn,
  GUID: Op,
  kForOnEventAttribute: Go,
  kListener: Rp,
  kStatusCode: Ip,
  kWebSocket: Se,
  NOOP: Nd
} = tr, {
  EventTarget: { addEventListener: Ap, removeEventListener: jp }
} = pp, { format: Cp, parse: Dp } = gp, { toBuffer: Mp } = ho, Od = Symbol("kAborted"), Ho = [8, 13], Dt = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], Lp = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
class X extends _p {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(e, r, s) {
    super(), this._binaryType = Pl[0], this._closeCode = 1006, this._closeFrameReceived = !1, this._closeFrameSent = !1, this._closeMessage = dn, this._closeTimer = null, this._errorEmitted = !1, this._extensions = {}, this._paused = !1, this._protocol = "", this._readyState = X.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = !1, this._redirects = 0, r === void 0 ? r = [] : Array.isArray(r) || (typeof r == "object" && r !== null ? (s = r, r = []) : r = [r]), Rd(this, e, r, s)) : (this._autoPong = s.autoPong, this._closeTimeout = s.closeTimeout, this._isServer = !0);
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
    Pl.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
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
  setSocket(e, r, s) {
    const n = new Pp({
      allowSynchronousEvents: s.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: s.maxPayload,
      skipUTF8Validation: s.skipUTF8Validation
    }), o = new kp(e, this._extensions, s.generateMask);
    this._receiver = n, this._sender = o, this._socket = e, n[Se] = this, o[Se] = this, e[Se] = this, n.on("conclude", zp), n.on("drain", Kp), n.on("error", xp), n.on("message", qp), n.on("ping", Bp), n.on("pong", Gp), o.onerror = Hp, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), r.length > 0 && e.unshift(r), e.on("close", jd), e.on("data", po), e.on("end", Cd), e.on("error", Dd), this._readyState = X.OPEN, this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = X.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    this._extensions[Ht.extensionName] && this._extensions[Ht.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = X.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
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
  close(e, r) {
    if (this.readyState !== X.CLOSED) {
      if (this.readyState === X.CONNECTING) {
        Je(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      if (this.readyState === X.CLOSING) {
        this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
        return;
      }
      this._readyState = X.CLOSING, this._sender.close(e, r, !this._isServer, (s) => {
        s || (this._closeFrameSent = !0, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
      }), Ad(this);
    }
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    this.readyState === X.CONNECTING || this.readyState === X.CLOSED || (this._paused = !0, this._socket.pause());
  }
  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(e, r, s) {
    if (this.readyState === X.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (s = e, e = r = void 0) : typeof r == "function" && (s = r, r = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== X.OPEN) {
      Wo(this, e, s);
      return;
    }
    r === void 0 && (r = !this._isServer), this._sender.ping(e || dn, r, s);
  }
  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(e, r, s) {
    if (this.readyState === X.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (s = e, e = r = void 0) : typeof r == "function" && (s = r, r = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== X.OPEN) {
      Wo(this, e, s);
      return;
    }
    r === void 0 && (r = !this._isServer), this._sender.pong(e || dn, r, s);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    this.readyState === X.CONNECTING || this.readyState === X.CLOSED || (this._paused = !1, this._receiver._writableState.needDrain || this._socket.resume());
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
  send(e, r, s) {
    if (this.readyState === X.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof r == "function" && (s = r, r = {}), typeof e == "number" && (e = e.toString()), this.readyState !== X.OPEN) {
      Wo(this, e, s);
      return;
    }
    const n = {
      binary: typeof e != "string",
      mask: !this._isServer,
      compress: !0,
      fin: !0,
      ...r
    };
    this._extensions[Ht.extensionName] || (n.compress = !1), this._sender.send(e || dn, n, s);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState !== X.CLOSED) {
      if (this.readyState === X.CONNECTING) {
        Je(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      this._socket && (this._readyState = X.CLOSING, this._socket.destroy());
    }
  }
}
Object.defineProperty(X, "CONNECTING", {
  enumerable: !0,
  value: Dt.indexOf("CONNECTING")
});
Object.defineProperty(X.prototype, "CONNECTING", {
  enumerable: !0,
  value: Dt.indexOf("CONNECTING")
});
Object.defineProperty(X, "OPEN", {
  enumerable: !0,
  value: Dt.indexOf("OPEN")
});
Object.defineProperty(X.prototype, "OPEN", {
  enumerable: !0,
  value: Dt.indexOf("OPEN")
});
Object.defineProperty(X, "CLOSING", {
  enumerable: !0,
  value: Dt.indexOf("CLOSING")
});
Object.defineProperty(X.prototype, "CLOSING", {
  enumerable: !0,
  value: Dt.indexOf("CLOSING")
});
Object.defineProperty(X, "CLOSED", {
  enumerable: !0,
  value: Dt.indexOf("CLOSED")
});
Object.defineProperty(X.prototype, "CLOSED", {
  enumerable: !0,
  value: Dt.indexOf("CLOSED")
});
[
  "binaryType",
  "bufferedAmount",
  "extensions",
  "isPaused",
  "protocol",
  "readyState",
  "url"
].forEach((t) => {
  Object.defineProperty(X.prototype, t, { enumerable: !0 });
});
["open", "error", "close", "message"].forEach((t) => {
  Object.defineProperty(X.prototype, `on${t}`, {
    enumerable: !0,
    get() {
      for (const e of this.listeners(t))
        if (e[Go]) return e[Rp];
      return null;
    },
    set(e) {
      for (const r of this.listeners(t))
        if (r[Go]) {
          this.removeListener(t, r);
          break;
        }
      typeof e == "function" && this.addEventListener(t, e, {
        [Go]: !0
      });
    }
  });
});
X.prototype.addEventListener = Ap;
X.prototype.removeEventListener = jp;
var Fp = X;
function Rd(t, e, r, s) {
  const n = {
    allowSynchronousEvents: !0,
    autoPong: !0,
    closeTimeout: Np,
    protocolVersion: Ho[1],
    maxPayload: 104857600,
    skipUTF8Validation: !1,
    perMessageDeflate: !0,
    followRedirects: !1,
    maxRedirects: 10,
    ...s,
    socketPath: void 0,
    hostname: void 0,
    protocol: void 0,
    timeout: void 0,
    method: "GET",
    host: void 0,
    path: void 0,
    port: void 0
  };
  if (t._autoPong = n.autoPong, t._closeTimeout = n.closeTimeout, !Ho.includes(n.protocolVersion))
    throw new RangeError(
      `Unsupported protocol version: ${n.protocolVersion} (supported versions: ${Ho.join(", ")})`
    );
  let o;
  if (e instanceof Bo)
    o = e;
  else
    try {
      o = new Bo(e);
    } catch {
      throw new SyntaxError(`Invalid URL: ${e}`);
    }
  o.protocol === "http:" ? o.protocol = "ws:" : o.protocol === "https:" && (o.protocol = "wss:"), t._url = o.href;
  const i = o.protocol === "wss:", a = o.protocol === "ws+unix:";
  let c;
  if (o.protocol !== "ws:" && !i && !a ? c = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : a && !o.pathname ? c = "The URL's pathname is empty" : o.hash && (c = "The URL contains a fragment identifier"), c) {
    const y = new SyntaxError(c);
    if (t._redirects === 0)
      throw y;
    Fn(t, y);
    return;
  }
  const d = i ? 443 : 80, u = Sp(16).toString("base64"), f = i ? vp.request : wp.request, E = /* @__PURE__ */ new Set();
  let _;
  if (n.createConnection = n.createConnection || (i ? Vp : Up), n.defaultPort = n.defaultPort || d, n.port = o.port || d, n.host = o.hostname.startsWith("[") ? o.hostname.slice(1, -1) : o.hostname, n.headers = {
    ...n.headers,
    "Sec-WebSocket-Version": n.protocolVersion,
    "Sec-WebSocket-Key": u,
    Connection: "Upgrade",
    Upgrade: "websocket"
  }, n.path = o.pathname + o.search, n.timeout = n.handshakeTimeout, n.perMessageDeflate && (_ = new Ht(
    n.perMessageDeflate !== !0 ? n.perMessageDeflate : {},
    !1,
    n.maxPayload
  ), n.headers["Sec-WebSocket-Extensions"] = Cp({
    [Ht.extensionName]: _.offer()
  })), r.length) {
    for (const y of r) {
      if (typeof y != "string" || !Lp.test(y) || E.has(y))
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      E.add(y);
    }
    n.headers["Sec-WebSocket-Protocol"] = r.join(",");
  }
  if (n.origin && (n.protocolVersion < 13 ? n.headers["Sec-WebSocket-Origin"] = n.origin : n.headers.Origin = n.origin), (o.username || o.password) && (n.auth = `${o.username}:${o.password}`), a) {
    const y = n.path.split(":");
    n.socketPath = y[0], n.path = y[1];
  }
  let v;
  if (n.followRedirects) {
    if (t._redirects === 0) {
      t._originalIpc = a, t._originalSecure = i, t._originalHostOrSocketPath = a ? n.socketPath : o.host;
      const y = s && s.headers;
      if (s = { ...s, headers: {} }, y)
        for (const [$, m] of Object.entries(y))
          s.headers[$.toLowerCase()] = m;
    } else if (t.listenerCount("redirect") === 0) {
      const y = a ? t._originalIpc ? n.socketPath === t._originalHostOrSocketPath : !1 : t._originalIpc ? !1 : o.host === t._originalHostOrSocketPath;
      (!y || t._originalSecure && !i) && (delete n.headers.authorization, delete n.headers.cookie, y || delete n.headers.host, n.auth = void 0);
    }
    n.auth && !s.headers.authorization && (s.headers.authorization = "Basic " + Buffer.from(n.auth).toString("base64")), v = t._req = f(n), t._redirects && t.emit("redirect", t.url, v);
  } else
    v = t._req = f(n);
  n.timeout && v.on("timeout", () => {
    Je(t, v, "Opening handshake has timed out");
  }), v.on("error", (y) => {
    v === null || v[Od] || (v = t._req = null, Fn(t, y));
  }), v.on("response", (y) => {
    const $ = y.headers.location, m = y.statusCode;
    if ($ && n.followRedirects && m >= 300 && m < 400) {
      if (++t._redirects > n.maxRedirects) {
        Je(t, v, "Maximum redirects exceeded");
        return;
      }
      v.abort();
      let w;
      try {
        w = new Bo($, e);
      } catch {
        const T = new SyntaxError(`Invalid URL: ${$}`);
        Fn(t, T);
        return;
      }
      Rd(t, w, r, s);
    } else t.emit("unexpected-response", v, y) || Je(
      t,
      v,
      `Unexpected server response: ${y.statusCode}`
    );
  }), v.on("upgrade", (y, $, m) => {
    if (t.emit("upgrade", y), t.readyState !== X.CONNECTING) return;
    v = t._req = null;
    const w = y.headers.upgrade;
    if (w === void 0 || w.toLowerCase() !== "websocket") {
      Je(t, $, "Invalid Upgrade header");
      return;
    }
    const P = bp("sha1").update(u + Op).digest("base64");
    if (y.headers["sec-websocket-accept"] !== P) {
      Je(t, $, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const T = y.headers["sec-websocket-protocol"];
    let N;
    if (T !== void 0 ? E.size ? E.has(T) || (N = "Server sent an invalid subprotocol") : N = "Server sent a subprotocol but none was requested" : E.size && (N = "Server sent no subprotocol"), N) {
      Je(t, $, N);
      return;
    }
    T && (t._protocol = T);
    const V = y.headers["sec-websocket-extensions"];
    if (V !== void 0) {
      if (!_) {
        Je(t, $, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
        return;
      }
      let H;
      try {
        H = Dp(V);
      } catch {
        Je(t, $, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      const ce = Object.keys(H);
      if (ce.length !== 1 || ce[0] !== Ht.extensionName) {
        Je(t, $, "Server indicated an extension that was not requested");
        return;
      }
      try {
        _.accept(H[Ht.extensionName]);
      } catch {
        Je(t, $, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      t._extensions[Ht.extensionName] = _;
    }
    t.setSocket($, m, {
      allowSynchronousEvents: n.allowSynchronousEvents,
      generateMask: n.generateMask,
      maxPayload: n.maxPayload,
      skipUTF8Validation: n.skipUTF8Validation
    });
  }), n.finishRequest ? n.finishRequest(v, t) : v.end();
}
function Fn(t, e) {
  t._readyState = X.CLOSING, t._errorEmitted = !0, t.emit("error", e), t.emitClose();
}
function Up(t) {
  return t.path = t.socketPath, Td.connect(t);
}
function Vp(t) {
  return t.path = void 0, !t.servername && t.servername !== "" && (t.servername = Td.isIP(t.host) ? "" : t.host), Ep.connect(t);
}
function Je(t, e, r) {
  t._readyState = X.CLOSING;
  const s = new Error(r);
  Error.captureStackTrace(s, Je), e.setHeader ? (e[Od] = !0, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(Fn, t, s)) : (e.destroy(s), e.once("error", t.emit.bind(t, "error")), e.once("close", t.emitClose.bind(t)));
}
function Wo(t, e, r) {
  if (e) {
    const s = Tp(e) ? e.size : Mp(e).length;
    t._socket ? t._sender._bufferedBytes += s : t._bufferedAmount += s;
  }
  if (r) {
    const s = new Error(
      `WebSocket is not open: readyState ${t.readyState} (${Dt[t.readyState]})`
    );
    process.nextTick(r, s);
  }
}
function zp(t, e) {
  const r = this[Se];
  r._closeFrameReceived = !0, r._closeMessage = e, r._closeCode = t, r._socket[Se] !== void 0 && (r._socket.removeListener("data", po), process.nextTick(Id, r._socket), t === 1005 ? r.close() : r.close(t, e));
}
function Kp() {
  const t = this[Se];
  t.isPaused || t._socket.resume();
}
function xp(t) {
  const e = this[Se];
  e._socket[Se] !== void 0 && (e._socket.removeListener("data", po), process.nextTick(Id, e._socket), e.close(t[Ip])), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", t));
}
function kl() {
  this[Se].emitClose();
}
function qp(t, e) {
  this[Se].emit("message", t, e);
}
function Bp(t) {
  const e = this[Se];
  e._autoPong && e.pong(t, !this._isServer, Nd), e.emit("ping", t);
}
function Gp(t) {
  this[Se].emit("pong", t);
}
function Id(t) {
  t.resume();
}
function Hp(t) {
  const e = this[Se];
  e.readyState !== X.CLOSED && (e.readyState === X.OPEN && (e._readyState = X.CLOSING, Ad(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", t)));
}
function Ad(t) {
  t._closeTimer = setTimeout(
    t._socket.destroy.bind(t._socket),
    t._closeTimeout
  );
}
function jd() {
  const t = this[Se];
  if (this.removeListener("close", jd), this.removeListener("data", po), this.removeListener("end", Cd), t._readyState = X.CLOSING, !this._readableState.endEmitted && !t._closeFrameReceived && !t._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
    const e = this.read(this._readableState.length);
    t._receiver.write(e);
  }
  t._receiver.end(), this[Se] = void 0, clearTimeout(t._closeTimer), t._receiver._writableState.finished || t._receiver._writableState.errorEmitted ? t.emitClose() : (t._receiver.on("error", kl), t._receiver.on("finish", kl));
}
function po(t) {
  this[Se]._receiver.write(t) || this.pause();
}
function Cd() {
  const t = this[Se];
  t._readyState = X.CLOSING, t._receiver.end(), this.end();
}
function Dd() {
  const t = this[Se];
  this.removeListener("error", Dd), this.on("error", Nd), t && (t._readyState = X.CLOSING, this.destroy());
}
const Wp = /* @__PURE__ */ Yi(Fp), { Duplex: hR } = Xs, { tokenChars: mR } = Zs, { Duplex: pR } = Xs, { createHash: yR } = Ji, { CLOSE_TIMEOUT: $R, GUID: gR, kWebSocket: _R } = tr, Ss = {
  cache: "no-store"
}, Jp = (t) => Hs + (t === !1 ? "" : " AssemblyAI/1.0 (" + Object.entries({ ...Zn, ...t }).map(([e, r]) => r ? `${e}=${r.name}/${r.version}` : "").join(" ") + ")");
let Hs = "";
typeof navigator < "u" && navigator.userAgent && (Hs += navigator.userAgent);
const Zn = {
  sdk: { name: "JavaScript", version: "4.22.1" }
};
typeof process < "u" && (process.versions.node && Hs.indexOf("Node") === -1 && (Zn.runtime_env = {
  name: "Node",
  version: process.versions.node
}), process.versions.bun && Hs.indexOf("Bun") === -1 && (Zn.runtime_env = {
  name: "Bun",
  version: process.versions.bun
}));
typeof Deno < "u" && process.versions.bun && Hs.indexOf("Deno") === -1 && (Zn.runtime_env = { name: "Deno", version: Deno.version.deno });
class Qs {
  /**
   * Create a new service.
   * @param params - The parameters to use for the service.
   */
  constructor(e) {
    this.params = e, e.userAgent === !1 ? this.userAgent = void 0 : this.userAgent = Jp(e.userAgent || {});
  }
  async fetch(e, r) {
    r = { ...Ss, ...r };
    let s = {
      Authorization: this.params.apiKey,
      "Content-Type": "application/json"
    };
    Ss != null && Ss.headers && (s = { ...s, ...Ss.headers }), r != null && r.headers && (s = { ...s, ...r.headers }), this.userAgent && (s["User-Agent"] = this.userAgent), r.headers = s, e.startsWith("http") || (e = this.params.baseUrl + e);
    const n = await fetch(e, r);
    if (n.status >= 400) {
      let o;
      const i = await n.text();
      if (i) {
        try {
          o = JSON.parse(i);
        } catch {
        }
        throw o != null && o.error ? new Error(o.error) : new Error(i);
      }
      throw new Error(`HTTP Error: ${n.status} ${n.statusText}`);
    }
    return n;
  }
  async fetchJson(e, r) {
    return (await this.fetch(e, r)).json();
  }
}
class Xp extends Qs {
  summary(e, r) {
    return this.fetchJson("/lemur/v3/generate/summary", {
      method: "POST",
      body: JSON.stringify(e),
      signal: r
    });
  }
  questionAnswer(e, r) {
    return this.fetchJson("/lemur/v3/generate/question-answer", {
      method: "POST",
      body: JSON.stringify(e),
      signal: r
    });
  }
  actionItems(e, r) {
    return this.fetchJson("/lemur/v3/generate/action-items", {
      method: "POST",
      body: JSON.stringify(e),
      signal: r
    });
  }
  task(e, r) {
    return this.fetchJson("/lemur/v3/generate/task", {
      method: "POST",
      body: JSON.stringify(e),
      signal: r
    });
  }
  getResponse(e, r) {
    return this.fetchJson(`/lemur/v3/${e}`, { signal: r });
  }
  /**
   * Delete the data for a previously submitted LeMUR request.
   * @param id - ID of the LeMUR request
   * @param signal - Optional AbortSignal to cancel the request
   */
  purgeRequestData(e, r) {
    return this.fetchJson(`/lemur/v3/${e}`, {
      method: "DELETE",
      signal: r
    });
  }
}
const Qn = (t, e) => new Wp(t, e), _e = {
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
}, Tl = {
  [_e.BadSampleRate]: "Sample rate must be a positive integer",
  [_e.AuthFailed]: "Not Authorized",
  [_e.InsufficientFunds]: "Insufficient funds",
  [_e.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [_e.NonexistentSessionId]: "Session ID does not exist",
  [_e.SessionExpired]: "Session has expired",
  [_e.ClosedSession]: "Session is closed",
  [_e.RateLimited]: "Rate limited",
  [_e.UniqueSessionViolation]: "Unique session violation",
  [_e.SessionTimeout]: "Session Timeout",
  [_e.AudioTooShort]: "Audio too short",
  [_e.AudioTooLong]: "Audio too long",
  [_e.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [_e.BadJson]: "Bad JSON",
  [_e.BadSchema]: "Bad schema",
  [_e.TooManyStreams]: "Too many streams",
  [_e.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid.",
  [_e.ReconnectAttemptsExhausted]: "Reconnect attempts exhausted",
  [_e.WordBoostParameterParsingFailed]: "Could not parse word boost parameter"
};
class Yp extends Error {
}
const Re = {
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
}, Nl = {
  [Re.BadSampleRate]: "Sample rate must be a positive integer",
  [Re.AuthFailed]: "Not Authorized",
  [Re.InsufficientFunds]: "Insufficient funds",
  [Re.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [Re.NonexistentSessionId]: "Session ID does not exist",
  [Re.SessionExpired]: "Session has expired",
  [Re.ClosedSession]: "Session is closed",
  [Re.RateLimited]: "Rate limited",
  [Re.UniqueSessionViolation]: "Unique session violation",
  [Re.SessionTimeout]: "Session Timeout",
  [Re.AudioTooShort]: "Audio too short",
  [Re.AudioTooLong]: "Audio too long",
  [Re.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [Re.BadSchema]: "Bad schema",
  [Re.TooManyStreams]: "Too many streams",
  [Re.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid."
};
class Zp extends Error {
}
const Qp = "wss://api.assemblyai.com/v2/realtime/ws", ey = '{"force_end_utterance":true}', Ol = '{"terminate_session":true}';
class ty {
  /**
   * Create a new RealtimeTranscriber.
   * @param params - Parameters to configure the RealtimeTranscriber
   */
  constructor(e) {
    if (this.listeners = {}, this.realtimeUrl = e.realtimeUrl ?? Qp, this.sampleRate = e.sampleRate ?? 16e3, this.wordBoost = e.wordBoost, this.encoding = e.encoding, this.endUtteranceSilenceThreshold = e.endUtteranceSilenceThreshold, this.disablePartialTranscripts = e.disablePartialTranscripts, "token" in e && e.token && (this.token = e.token), "apiKey" in e && e.apiKey && (this.apiKey = e.apiKey), !(this.token || this.apiKey))
      throw new Error("API key or temporary token is required.");
  }
  connectionUrl() {
    const e = new URL(this.realtimeUrl);
    if (e.protocol !== "wss:")
      throw new Error("Invalid protocol, must be wss");
    const r = new URLSearchParams();
    return this.token && r.set("token", this.token), r.set("sample_rate", this.sampleRate.toString()), this.wordBoost && this.wordBoost.length > 0 && r.set("word_boost", JSON.stringify(this.wordBoost)), this.encoding && r.set("encoding", this.encoding), r.set("enable_extra_session_information", "true"), this.disablePartialTranscripts && r.set("disable_partial_transcripts", this.disablePartialTranscripts.toString()), e.search = r.toString(), e;
  }
  /**
   * Add a listener for an event.
   * @param event - The event to listen for.
   * @param listener - The function to call when the event is emitted.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(e, r) {
    this.listeners[e] = r;
  }
  /**
   * Connect to the server and begin a new session.
   * @returns A promise that resolves when the connection is established and the session begins.
   */
  connect() {
    return new Promise((e) => {
      if (this.socket)
        throw new Error("Already connected");
      const r = this.connectionUrl();
      this.token ? this.socket = Qn(r.toString()) : this.socket = Qn(r.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
        this.endUtteranceSilenceThreshold === void 0 || this.endUtteranceSilenceThreshold === null || this.configureEndUtteranceSilenceThreshold(this.endUtteranceSilenceThreshold);
      }, this.socket.onclose = ({ code: s, reason: n }) => {
        var o, i;
        n || s in Tl && (n = Tl[s]), (i = (o = this.listeners).close) == null || i.call(o, s, n);
      }, this.socket.onerror = (s) => {
        var n, o, i, a;
        s.error ? (o = (n = this.listeners).error) == null || o.call(n, s.error) : (a = (i = this.listeners).error) == null || a.call(i, new Error(s.message));
      }, this.socket.onmessage = ({ data: s }) => {
        var o, i, a, c, d, u, f, E, _, v, y, $, m, w, P;
        const n = JSON.parse(s.toString());
        if ("error" in n) {
          (i = (o = this.listeners).error) == null || i.call(o, new Yp(n.error));
          return;
        }
        switch (n.message_type) {
          case "SessionBegins": {
            const T = {
              sessionId: n.session_id,
              expiresAt: new Date(n.expires_at)
            };
            e(T), (c = (a = this.listeners).open) == null || c.call(a, T);
            break;
          }
          case "PartialTranscript": {
            n.created = new Date(n.created), (u = (d = this.listeners).transcript) == null || u.call(d, n), (E = (f = this.listeners)["transcript.partial"]) == null || E.call(f, n);
            break;
          }
          case "FinalTranscript": {
            n.created = new Date(n.created), (v = (_ = this.listeners).transcript) == null || v.call(_, n), ($ = (y = this.listeners)["transcript.final"]) == null || $.call(y, n);
            break;
          }
          case "SessionInformation": {
            (w = (m = this.listeners).session_information) == null || w.call(m, n);
            break;
          }
          case "SessionTerminated": {
            (P = this.sessionTerminatedResolve) == null || P.call(this);
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
    return new yd({
      write: (e) => {
        this.sendAudio(e);
      }
    });
  }
  /**
   * Manually end an utterance
   */
  forceEndUtterance() {
    this.send(ey);
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
    var r;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN)
        if (e) {
          const s = new Promise((n) => {
            this.sessionTerminatedResolve = n;
          });
          this.socket.send(Ol), await s;
        } else
          this.socket.send(Ol);
      (r = this.socket) != null && r.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class ry extends Qs {
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
    const r = { ...e };
    return !r.token && !r.apiKey && (r.apiKey = this.rtFactoryParams.apiKey), new ty(r);
  }
  async createTemporaryToken(e) {
    return (await this.fetchJson("/v2/realtime/token", {
      method: "POST",
      body: JSON.stringify(e)
    })).token;
  }
}
function Rl(t) {
  return t.startsWith("http") || t.startsWith("https") || t.startsWith("data:") ? null : t.startsWith("file://") ? t.substring(7) : t.startsWith("file:") ? t.substring(5) : t;
}
class sy extends Qs {
  constructor(e, r) {
    super(e), this.files = r;
  }
  /**
   * Transcribe an audio file. This will create a transcript and wait until the transcript status is "completed" or "error".
   * @param params - The parameters to transcribe an audio file.
   * @param options - The options to transcribe an audio file.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async transcribe(e, r) {
    const s = await this.submit(e);
    return await this.waitUntilReady(s.id, r);
  }
  /**
   * Submits a transcription job for an audio file. This will not wait until the transcript status is "completed" or "error".
   * @param params - The parameters to start the transcription of an audio file.
   * @returns A promise that resolves to the queued transcript.
   */
  async submit(e) {
    let r, s;
    if ("audio" in e) {
      const { audio: o, ...i } = e;
      if (typeof o == "string") {
        const a = Rl(o);
        a !== null ? r = await this.files.upload(a) : o.startsWith("data:") ? r = await this.files.upload(o) : r = o;
      } else
        r = await this.files.upload(o);
      s = { ...i, audio_url: r };
    } else
      s = e;
    return await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(s)
    });
  }
  /**
   * Create a transcript.
   * @param params - The parameters to create a transcript.
   * @param options - The options used for creating the new transcript.
   * @returns A promise that resolves to the transcript.
   * @deprecated Use `transcribe` instead to transcribe a audio file that includes polling, or `submit` to transcribe a audio file without polling.
   */
  async create(e, r) {
    const s = Rl(e.audio_url);
    if (s !== null) {
      const o = await this.files.upload(s);
      e.audio_url = o;
    }
    const n = await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(e)
    });
    return (r == null ? void 0 : r.poll) ?? !0 ? await this.waitUntilReady(n.id, r) : n;
  }
  /**
   * Wait until the transcript ready, either the status is "completed" or "error".
   * @param transcriptId - The ID of the transcript.
   * @param options - The options to wait until the transcript is ready.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async waitUntilReady(e, r) {
    const s = (r == null ? void 0 : r.pollingInterval) ?? 3e3, n = (r == null ? void 0 : r.pollingTimeout) ?? -1, o = Date.now();
    for (; ; ) {
      const i = await this.get(e);
      if (i.status === "completed" || i.status === "error")
        return i;
      if (n > 0 && Date.now() - o > n)
        throw new Error("Polling timeout");
      await new Promise((a) => setTimeout(a, s));
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
    let r = "/v2/transcript";
    typeof e == "string" ? r = e : e && (r = `${r}?${new URLSearchParams(Object.keys(e).map((n) => {
      var o;
      return [
        n,
        ((o = e[n]) == null ? void 0 : o.toString()) || ""
      ];
    }))}`);
    const s = await this.fetchJson(r);
    for (const n of s.transcripts)
      n.created = new Date(n.created), n.completed && (n.completed = new Date(n.completed));
    return s;
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
  wordSearch(e, r) {
    const s = new URLSearchParams({ words: r.join(",") });
    return this.fetchJson(`/v2/transcript/${e}/word-search?${s.toString()}`);
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
  async subtitles(e, r = "srt", s) {
    let n = `/v2/transcript/${e}/${r}`;
    if (s) {
      const i = new URLSearchParams();
      i.set("chars_per_caption", s.toString()), n += `?${i.toString()}`;
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
    const { redacted_audio_url: r, status: s } = await this.redactedAudio(e);
    if (s !== "redacted_audio_ready")
      throw new Error(`Redacted audio status is ${s}`);
    const n = await fetch(r);
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
const ny = async (t) => dm.toWeb(pm(t));
class oy extends Qs {
  /**
   * Upload a local file to AssemblyAI.
   * @param input - The local file path to upload, or a stream or buffer of the file to upload.
   * @returns A promise that resolves to the uploaded file URL.
   */
  async upload(e) {
    let r;
    return typeof e == "string" ? e.startsWith("data:") ? r = iy(e) : r = await ny(e) : r = e, (await this.fetchJson("/v2/upload", {
      method: "POST",
      body: r,
      headers: {
        "Content-Type": "application/octet-stream"
      },
      duplex: "half"
    })).upload_url;
  }
}
function iy(t) {
  const e = t.split(","), r = e[0].match(/:(.*?);/)[1], s = atob(e[1]);
  let n = s.length;
  const o = new Uint8Array(n);
  for (; n--; )
    o[n] = s.charCodeAt(n);
  return new Blob([o], { type: r });
}
const ay = "wss://streaming.assemblyai.com/v3/ws", Il = '{"type":"Terminate"}';
class cy {
  constructor(e) {
    if (this.listeners = {}, this.params = {
      ...e,
      websocketBaseUrl: e.websocketBaseUrl || ay
    }, "token" in e && e.token && (this.token = e.token), "apiKey" in e && e.apiKey && (this.apiKey = e.apiKey), !(this.token || this.apiKey))
      throw new Error("API key or temporary token is required.");
  }
  connectionUrl() {
    const e = new URL(this.params.websocketBaseUrl ?? "");
    if (e.protocol !== "wss:")
      throw new Error("Invalid protocol, must be wss");
    const r = new URLSearchParams();
    return this.token && r.set("token", this.token), r.set("sample_rate", this.params.sampleRate.toString()), this.params.endOfTurnConfidenceThreshold && r.set("end_of_turn_confidence_threshold", this.params.endOfTurnConfidenceThreshold.toString()), this.params.minEndOfTurnSilenceWhenConfident && r.set("min_end_of_turn_silence_when_confident", this.params.minEndOfTurnSilenceWhenConfident.toString()), this.params.maxTurnSilence && r.set("max_turn_silence", this.params.maxTurnSilence.toString()), this.params.vadThreshold !== void 0 && r.set("vad_threshold", this.params.vadThreshold.toString()), this.params.formatTurns && r.set("format_turns", this.params.formatTurns.toString()), this.params.encoding && r.set("encoding", this.params.encoding.toString()), this.params.keytermsPrompt ? r.set("keyterms_prompt", JSON.stringify(this.params.keytermsPrompt)) : this.params.keyterms && (console.warn("[Deprecation Warning] `keyterms` is deprecated and will be removed in a future release. Please use `keytermsPrompt` instead."), r.set("keyterms_prompt", JSON.stringify(this.params.keyterms))), this.params.filterProfanity && r.set("filter_profanity", this.params.filterProfanity.toString()), this.params.speechModel && r.set("speech_model", this.params.speechModel.toString()), this.params.languageDetection !== void 0 && r.set("language_detection", this.params.languageDetection.toString()), this.params.inactivityTimeout !== void 0 && r.set("inactivity_timeout", this.params.inactivityTimeout.toString()), e.search = r.toString(), e;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(e, r) {
    this.listeners[e] = r;
  }
  connect() {
    return new Promise((e) => {
      if (this.socket)
        throw new Error("Already connected");
      const r = this.connectionUrl();
      this.token ? this.socket = Qn(r.toString()) : this.socket = Qn(r.toString(), {
        headers: { Authorization: this.apiKey }
      }), this.socket.binaryType = "arraybuffer", this.socket.onopen = () => {
      }, this.socket.onclose = ({ code: s, reason: n }) => {
        var o, i;
        n || s in Nl && (n = Nl[s]), (i = (o = this.listeners).close) == null || i.call(o, s, n);
      }, this.socket.onerror = (s) => {
        var n, o, i, a;
        s.error ? (o = (n = this.listeners).error) == null || o.call(n, s.error) : (a = (i = this.listeners).error) == null || a.call(i, new Error(s.message));
      }, this.socket.onmessage = ({ data: s }) => {
        var o, i, a, c, d, u, f;
        const n = JSON.parse(s.toString());
        if ("error" in n) {
          (i = (o = this.listeners).error) == null || i.call(o, new Zp(n.error));
          return;
        }
        switch (n.type) {
          case "Begin": {
            e(n), (c = (a = this.listeners).open) == null || c.call(a, n);
            break;
          }
          case "Turn": {
            (u = (d = this.listeners).turn) == null || u.call(d, n);
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
    return new yd({
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
    var r;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN)
        if (e) {
          const s = new Promise((n) => {
            this.sessionTerminatedResolve = n;
          });
          this.socket.send(Il), await s;
        } else
          this.socket.send(Il);
      (r = this.socket) != null && r.removeAllListeners && this.socket.removeAllListeners(), this.socket.close();
    }
    this.listeners = {}, this.socket = void 0;
  }
}
class ly extends Qs {
  constructor(e) {
    super(e), this.baseServiceParams = e;
  }
  transcriber(e) {
    const r = { ...e };
    return !r.token && !r.apiKey && (r.apiKey = this.baseServiceParams.apiKey), new cy(r);
  }
  async createTemporaryToken(e) {
    const r = new URLSearchParams();
    Object.entries(e).forEach(([i, a]) => {
      a != null && r.append(i, String(a));
    });
    const s = r.toString(), n = s ? `/v3/token?${s}` : "/v3/token";
    return (await this.fetchJson(n, {
      method: "GET"
    })).token;
  }
}
const uy = "https://api.assemblyai.com", dy = "https://streaming.assemblyai.com";
class fy {
  /**
   * Create a new AssemblyAI client.
   * @param params - The parameters for the service, including the API key and base URL, if any.
   */
  constructor(e) {
    e.baseUrl = e.baseUrl || uy, e.baseUrl && e.baseUrl.endsWith("/") && (e.baseUrl = e.baseUrl.slice(0, -1)), this.files = new oy(e), this.transcripts = new sy(e, this.files), this.lemur = new Xp(e), this.realtime = new ry(e), this.streaming = new ly({
      ...e,
      baseUrl: e.streamingBaseUrl || dy
    });
  }
}
function hy() {
  if (Be.isPackaged) {
    const e = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", r = $d.join(process.resourcesPath, "bin", e);
    if (Ei.existsSync(r))
      return r;
  }
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}
async function my(t) {
  const e = $m.tmpdir(), r = $d.join(e, `audio-${Date.now()}.wav`), s = hy();
  return new Promise((n, o) => {
    const i = ym(s, [
      "-i",
      t,
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
      r
    ]);
    let a = "";
    i.stderr.on("data", (c) => {
      a += c.toString();
    }), i.on("close", (c) => {
      c === 0 ? n(r) : o(new Error(`FFmpeg exited with code ${c}: ${a}`));
    }), i.on("error", (c) => {
      o(new Error(`Failed to spawn ffmpeg: ${c.message}. Make sure ffmpeg is installed and in PATH.`));
    });
  });
}
async function py(t, e) {
  try {
    if (!t.videoPath)
      return { success: !1, error: "Video path is required" };
    if (!t.apiKey)
      return { success: !1, error: "AssemblyAI API key is required" };
    if (!Ei.existsSync(t.videoPath))
      return { success: !1, error: `Video file not found: ${t.videoPath}` };
    e == null || e({
      status: "extracting",
      progress: 10,
      message: "Extracting audio from video..."
    });
    let r;
    try {
      r = await my(t.videoPath);
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
    const s = new fy({ apiKey: t.apiKey });
    e == null || e({
      status: "transcribing",
      progress: 30,
      message: "Transcribing audio (this may take a few minutes)..."
    });
    const n = {
      audio: r
    };
    t.language && t.language !== "auto" && (n.language_code = t.language);
    const o = await s.transcripts.transcribe(n);
    e == null || e({
      status: "processing",
      progress: 90,
      message: "Processing transcription results..."
    });
    try {
      Ei.unlinkSync(r);
    } catch {
      console.warn("Failed to cleanup temp audio file:", r);
    }
    if (o.status === "error")
      return {
        success: !1,
        error: o.error || "Transcription failed"
      };
    const i = (o.words || []).map((a) => ({
      text: a.text,
      startMs: a.start,
      endMs: a.end,
      confidence: a.confidence
    }));
    return e == null || e({
      status: "complete",
      progress: 100,
      message: `Transcription complete! ${i.length} words detected.`
    }), {
      success: !0,
      words: i
    };
  } catch (r) {
    return console.error("Transcription error:", r), {
      success: !1,
      error: r instanceof Error ? r.message : "Unknown transcription error"
    };
  }
}
const fn = gm(import.meta.url), yy = 100, Al = 5, $y = 16, gy = 1, _y = 2, vy = 4;
class wy {
  constructor() {
    de(this, "running", !1);
    de(this, "recordingId", "");
    de(this, "screenBounds", { width: 1920, height: 1080 });
    de(this, "recordingStartTime", 0);
    de(this, "events", []);
    de(this, "pendingDrag", null);
    de(this, "mouseHookAvailable", !1);
    de(this, "pollInterval", null);
    de(this, "windowsApi", null);
    de(this, "lastButtonState", { left: !1, right: !1, middle: !1 });
    this.initializeWindowsApi();
  }
  /**
   * Initialize Windows API bindings using koffi
   */
  initializeWindowsApi() {
    try {
      const e = fn("koffi");
      console.log("MouseEventDetector: koffi loaded successfully");
      const r = e.load("user32.dll");
      console.log("MouseEventDetector: user32.dll loaded"), e.struct("POINT", {
        x: "long",
        y: "long"
      });
      const s = r.func("short __stdcall GetAsyncKeyState(int vKey)"), n = r.func("bool __stdcall GetCursorPos(_Out_ POINT *lpPoint)");
      this.windowsApi = {
        GetAsyncKeyState: (o) => s(o),
        GetCursorPos: (o) => {
          const i = { x: 0, y: 0 }, a = n(i);
          return o[0] = i.x, o[1] = i.y, a;
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
      fn("global-mouse-events"), this.mouseHookAvailable = !0, console.log("MouseEventDetector: Using global-mouse-events fallback");
    } catch {
      console.warn("MouseEventDetector: No mouse detection available"), console.warn("MouseEventDetector: Install koffi (npm install koffi) for mouse detection without Visual Studio Build Tools"), this.mouseHookAvailable = !1;
    }
  }
  /**
   * Start capturing mouse events
   * @param recordingId - Unique identifier for the recording
   * @param screenBounds - Screen dimensions for coordinate validation
   */
  start(e, r) {
    if (this.running) {
      console.warn("MouseEventDetector: Already running");
      return;
    }
    this.recordingId = e, this.screenBounds = r, this.recordingStartTime = Date.now(), this.events = [], this.pendingDrag = null, this.running = !0, this.lastButtonState = { left: !1, right: !1, middle: !1 }, this.windowsApi ? this.startPolling() : this.initializeGlobalMouseEventsHook();
  }
  /**
   * Start polling Windows API for mouse state
   */
  startPolling() {
    this.windowsApi && (this.pollInterval = setInterval(() => {
      if (!this.running || !this.windowsApi) return;
      const e = [0, 0];
      this.windowsApi.GetCursorPos(e);
      const r = e[0], s = e[1], n = (this.windowsApi.GetAsyncKeyState(gy) & 32768) !== 0, o = (this.windowsApi.GetAsyncKeyState(_y) & 32768) !== 0, i = (this.windowsApi.GetAsyncKeyState(vy) & 32768) !== 0;
      n && !this.lastButtonState.left && this.onMouseDown(r, s, "left"), o && !this.lastButtonState.right && this.onMouseDown(r, s, "right"), i && !this.lastButtonState.middle && this.onMouseDown(r, s, "middle"), !n && this.lastButtonState.left && this.onMouseUp(r, s, "left"), !o && this.lastButtonState.right && this.onMouseUp(r, s, "right"), !i && this.lastButtonState.middle && this.onMouseUp(r, s, "middle"), this.lastButtonState = { left: n, right: o, middle: i };
    }, $y), console.log("MouseEventDetector: Polling started"));
  }
  /**
   * Handle mouse button down event
   */
  onMouseDown(e, r, s) {
    this.running && (this.pendingDrag && this.pendingDrag.button !== s && this.completePendingAsClick(), this.pendingDrag = {
      startTimestamp: this.getRelativeTimestamp(),
      startX: e,
      startY: r,
      button: s
    });
  }
  /**
   * Handle mouse button up event
   */
  onMouseUp(e, r, s) {
    if (!this.running || !this.pendingDrag || this.pendingDrag.button !== s) return;
    const n = this.getRelativeTimestamp(), o = n - this.pendingDrag.startTimestamp, i = Math.abs(e - this.pendingDrag.startX) > Al || Math.abs(r - this.pendingDrag.startY) > Al;
    if (o > yy && i) {
      const a = {
        type: "drag",
        startTimestamp: this.pendingDrag.startTimestamp,
        endTimestamp: n,
        startX: this.pendingDrag.startX,
        startY: this.pendingDrag.startY,
        endX: e,
        endY: r
      };
      this.events.push(a);
    } else {
      const a = {
        type: "click",
        timestamp: this.pendingDrag.startTimestamp,
        x: this.pendingDrag.startX,
        y: this.pendingDrag.startY,
        button: s
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
      const e = fn("global-mouse-events");
      e.on("mousedown", (r) => {
        if (!this.running) return;
        const s = this.mapButton(r.button);
        this.onMouseDown(r.x, r.y, s);
      }), e.on("mouseup", (r) => {
        if (!this.running) return;
        const s = this.mapButton(r.button);
        this.onMouseUp(r.x, r.y, s);
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
      const e = fn("global-mouse-events");
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
  addClickEvent(e, r, s = "left") {
    if (!this.running) return;
    const n = {
      type: "click",
      timestamp: this.getRelativeTimestamp(),
      x: e,
      y: r,
      button: s
    };
    this.events.push(n);
  }
  /**
   * Manually add a drag event (for testing or alternative input methods)
   */
  addDragEvent(e, r, s, n, o = 200) {
    if (!this.running) return;
    const i = this.getRelativeTimestamp(), a = {
      type: "drag",
      startTimestamp: i,
      endTimestamp: i + o,
      startX: e,
      startY: r,
      endX: s,
      endY: n
    };
    this.events.push(a);
  }
}
const Jo = new wy(), Ir = (t) => {
  const e = typeof t;
  return t !== null && (e === "object" || e === "function");
}, Md = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]), Ld = 1e6, Ey = (t) => t >= "0" && t <= "9";
function Fd(t) {
  if (t === "0")
    return !0;
  if (/^[1-9]\d*$/.test(t)) {
    const e = Number.parseInt(t, 10);
    return e <= Number.MAX_SAFE_INTEGER && e <= Ld;
  }
  return !1;
}
function Xo(t, e) {
  return Md.has(t) ? !1 : (t && Fd(t) ? e.push(Number.parseInt(t, 10)) : e.push(t), !0);
}
function Sy(t) {
  if (typeof t != "string")
    throw new TypeError(`Expected a string, got ${typeof t}`);
  const e = [];
  let r = "", s = "start", n = !1, o = 0;
  for (const i of t) {
    if (o++, n) {
      r += i, n = !1;
      continue;
    }
    if (i === "\\") {
      if (s === "index")
        throw new Error(`Invalid character '${i}' in an index at position ${o}`);
      if (s === "indexEnd")
        throw new Error(`Invalid character '${i}' after an index at position ${o}`);
      n = !0, s = s === "start" ? "property" : s;
      continue;
    }
    switch (i) {
      case ".": {
        if (s === "index")
          throw new Error(`Invalid character '${i}' in an index at position ${o}`);
        if (s === "indexEnd") {
          s = "property";
          break;
        }
        if (!Xo(r, e))
          return [];
        r = "", s = "property";
        break;
      }
      case "[": {
        if (s === "index")
          throw new Error(`Invalid character '${i}' in an index at position ${o}`);
        if (s === "indexEnd") {
          s = "index";
          break;
        }
        if (s === "property" || s === "start") {
          if ((r || s === "property") && !Xo(r, e))
            return [];
          r = "";
        }
        s = "index";
        break;
      }
      case "]": {
        if (s === "index") {
          if (r === "")
            r = (e.pop() || "") + "[]", s = "property";
          else {
            const a = Number.parseInt(r, 10);
            !Number.isNaN(a) && Number.isFinite(a) && a >= 0 && a <= Number.MAX_SAFE_INTEGER && a <= Ld && r === String(a) ? e.push(a) : e.push(r), r = "", s = "indexEnd";
          }
          break;
        }
        if (s === "indexEnd")
          throw new Error(`Invalid character '${i}' after an index at position ${o}`);
        r += i;
        break;
      }
      default: {
        if (s === "index" && !Ey(i))
          throw new Error(`Invalid character '${i}' in an index at position ${o}`);
        if (s === "indexEnd")
          throw new Error(`Invalid character '${i}' after an index at position ${o}`);
        s === "start" && (s = "property"), r += i;
      }
    }
  }
  switch (n && (r += "\\"), s) {
    case "property": {
      if (!Xo(r, e))
        return [];
      break;
    }
    case "index":
      throw new Error("Index was not closed");
    case "start": {
      e.push("");
      break;
    }
  }
  return e;
}
function yo(t) {
  if (typeof t == "string")
    return Sy(t);
  if (Array.isArray(t)) {
    const e = [];
    for (const [r, s] of t.entries()) {
      if (typeof s != "string" && typeof s != "number")
        throw new TypeError(`Expected a string or number for path segment at index ${r}, got ${typeof s}`);
      if (typeof s == "number" && !Number.isFinite(s))
        throw new TypeError(`Path segment at index ${r} must be a finite number, got ${s}`);
      if (Md.has(s))
        return [];
      typeof s == "string" && Fd(s) ? e.push(Number.parseInt(s, 10)) : e.push(s);
    }
    return e;
  }
  return [];
}
function jl(t, e, r) {
  if (!Ir(t) || typeof e != "string" && !Array.isArray(e))
    return r === void 0 ? t : r;
  const s = yo(e);
  if (s.length === 0)
    return r;
  for (let n = 0; n < s.length; n++) {
    const o = s[n];
    if (t = t[o], t == null) {
      if (n !== s.length - 1)
        return r;
      break;
    }
  }
  return t === void 0 ? r : t;
}
function hn(t, e, r) {
  if (!Ir(t) || typeof e != "string" && !Array.isArray(e))
    return t;
  const s = t, n = yo(e);
  if (n.length === 0)
    return t;
  for (let o = 0; o < n.length; o++) {
    const i = n[o];
    if (o === n.length - 1)
      t[i] = r;
    else if (!Ir(t[i])) {
      const c = typeof n[o + 1] == "number";
      t[i] = c ? [] : {};
    }
    t = t[i];
  }
  return s;
}
function by(t, e) {
  if (!Ir(t) || typeof e != "string" && !Array.isArray(e))
    return !1;
  const r = yo(e);
  if (r.length === 0)
    return !1;
  for (let s = 0; s < r.length; s++) {
    const n = r[s];
    if (s === r.length - 1)
      return Object.hasOwn(t, n) ? (delete t[n], !0) : !1;
    if (t = t[n], !Ir(t))
      return !1;
  }
}
function Yo(t, e) {
  if (!Ir(t) || typeof e != "string" && !Array.isArray(e))
    return !1;
  const r = yo(e);
  if (r.length === 0)
    return !1;
  for (const s of r) {
    if (!Ir(t) || !(s in t))
      return !1;
    t = t[s];
  }
  return !0;
}
const Wt = gd.homedir(), ea = gd.tmpdir(), { env: Hr } = pe, Py = (t) => {
  const e = C.join(Wt, "Library");
  return {
    data: C.join(e, "Application Support", t),
    config: C.join(e, "Preferences", t),
    cache: C.join(e, "Caches", t),
    log: C.join(e, "Logs", t),
    temp: C.join(ea, t)
  };
}, ky = (t) => {
  const e = Hr.APPDATA || C.join(Wt, "AppData", "Roaming"), r = Hr.LOCALAPPDATA || C.join(Wt, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: C.join(r, t, "Data"),
    config: C.join(e, t, "Config"),
    cache: C.join(r, t, "Cache"),
    log: C.join(r, t, "Log"),
    temp: C.join(ea, t)
  };
}, Ty = (t) => {
  const e = C.basename(Wt);
  return {
    data: C.join(Hr.XDG_DATA_HOME || C.join(Wt, ".local", "share"), t),
    config: C.join(Hr.XDG_CONFIG_HOME || C.join(Wt, ".config"), t),
    cache: C.join(Hr.XDG_CACHE_HOME || C.join(Wt, ".cache"), t),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: C.join(Hr.XDG_STATE_HOME || C.join(Wt, ".local", "state"), t),
    temp: C.join(ea, e, t)
  };
};
function Ny(t, { suffix: e = "nodejs" } = {}) {
  if (typeof t != "string")
    throw new TypeError(`Expected a string, got ${typeof t}`);
  return e && (t += `-${e}`), pe.platform === "darwin" ? Py(t) : pe.platform === "win32" ? ky(t) : Ty(t);
}
const Mt = (t, e) => {
  const { onError: r } = e;
  return function(...n) {
    return t.apply(void 0, n).catch(r);
  };
}, kt = (t, e) => {
  const { onError: r } = e;
  return function(...n) {
    try {
      return t.apply(void 0, n);
    } catch (o) {
      return r(o);
    }
  };
}, Oy = 250, Lt = (t, e) => {
  const { isRetriable: r } = e;
  return function(n) {
    const { timeout: o } = n, i = n.interval ?? Oy, a = Date.now() + o;
    return function c(...d) {
      return t.apply(void 0, d).catch((u) => {
        if (!r(u) || Date.now() >= a)
          throw u;
        const f = Math.round(i * Math.random());
        return f > 0 ? new Promise((_) => setTimeout(_, f)).then(() => c.apply(void 0, d)) : c.apply(void 0, d);
      });
    };
  };
}, Ft = (t, e) => {
  const { isRetriable: r } = e;
  return function(n) {
    const { timeout: o } = n, i = Date.now() + o;
    return function(...c) {
      for (; ; )
        try {
          return t.apply(void 0, c);
        } catch (d) {
          if (!r(d) || Date.now() >= i)
            throw d;
          continue;
        }
    };
  };
}, Wr = {
  /* API */
  isChangeErrorOk: (t) => {
    if (!Wr.isNodeError(t))
      return !1;
    const { code: e } = t;
    return e === "ENOSYS" || !Ry && (e === "EINVAL" || e === "EPERM");
  },
  isNodeError: (t) => t instanceof Error,
  isRetriableError: (t) => {
    if (!Wr.isNodeError(t))
      return !1;
    const { code: e } = t;
    return e === "EMFILE" || e === "ENFILE" || e === "EAGAIN" || e === "EBUSY" || e === "EACCESS" || e === "EACCES" || e === "EACCS" || e === "EPERM";
  },
  onChangeError: (t) => {
    if (!Wr.isNodeError(t))
      throw t;
    if (!Wr.isChangeErrorOk(t))
      throw t;
  }
}, mn = {
  onError: Wr.onChangeError
}, We = {
  onError: () => {
  }
}, Ry = pe.getuid ? !pe.getuid() : !1, Ie = {
  isRetriable: Wr.isRetriableError
}, Ce = {
  attempt: {
    /* ASYNC */
    chmod: Mt(Oe(Q.chmod), mn),
    chown: Mt(Oe(Q.chown), mn),
    close: Mt(Oe(Q.close), We),
    fsync: Mt(Oe(Q.fsync), We),
    mkdir: Mt(Oe(Q.mkdir), We),
    realpath: Mt(Oe(Q.realpath), We),
    stat: Mt(Oe(Q.stat), We),
    unlink: Mt(Oe(Q.unlink), We),
    /* SYNC */
    chmodSync: kt(Q.chmodSync, mn),
    chownSync: kt(Q.chownSync, mn),
    closeSync: kt(Q.closeSync, We),
    existsSync: kt(Q.existsSync, We),
    fsyncSync: kt(Q.fsync, We),
    mkdirSync: kt(Q.mkdirSync, We),
    realpathSync: kt(Q.realpathSync, We),
    statSync: kt(Q.statSync, We),
    unlinkSync: kt(Q.unlinkSync, We)
  },
  retry: {
    /* ASYNC */
    close: Lt(Oe(Q.close), Ie),
    fsync: Lt(Oe(Q.fsync), Ie),
    open: Lt(Oe(Q.open), Ie),
    readFile: Lt(Oe(Q.readFile), Ie),
    rename: Lt(Oe(Q.rename), Ie),
    stat: Lt(Oe(Q.stat), Ie),
    write: Lt(Oe(Q.write), Ie),
    writeFile: Lt(Oe(Q.writeFile), Ie),
    /* SYNC */
    closeSync: Ft(Q.closeSync, Ie),
    fsyncSync: Ft(Q.fsyncSync, Ie),
    openSync: Ft(Q.openSync, Ie),
    readFileSync: Ft(Q.readFileSync, Ie),
    renameSync: Ft(Q.renameSync, Ie),
    statSync: Ft(Q.statSync, Ie),
    writeSync: Ft(Q.writeSync, Ie),
    writeFileSync: Ft(Q.writeFileSync, Ie)
  }
}, Iy = "utf8", Cl = 438, Ay = 511, jy = {}, Cy = pe.geteuid ? pe.geteuid() : -1, Dy = pe.getegid ? pe.getegid() : -1, My = 1e3, Ly = !!pe.getuid;
pe.getuid && pe.getuid();
const Dl = 128, Fy = (t) => t instanceof Error && "code" in t, Ml = (t) => typeof t == "string", Zo = (t) => t === void 0, Uy = pe.platform === "linux", Ud = pe.platform === "win32", ta = ["SIGHUP", "SIGINT", "SIGTERM"];
Ud || ta.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
Uy && ta.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
class Vy {
  /* CONSTRUCTOR */
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set(), this.exited = !1, this.exit = (e) => {
      if (!this.exited) {
        this.exited = !0;
        for (const r of this.callbacks)
          r();
        e && (Ud && e !== "SIGINT" && e !== "SIGTERM" && e !== "SIGKILL" ? pe.kill(pe.pid, "SIGTERM") : pe.kill(pe.pid, e));
      }
    }, this.hook = () => {
      pe.once("exit", () => this.exit());
      for (const e of ta)
        try {
          pe.once(e, () => this.exit(e));
        } catch {
        }
    }, this.register = (e) => (this.callbacks.add(e), () => {
      this.callbacks.delete(e);
    }), this.hook();
  }
}
const zy = new Vy(), Ky = zy.register, De = {
  /* VARIABLES */
  store: {},
  // filePath => purge
  /* API */
  create: (t) => {
    const e = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6), n = `.tmp-${Date.now().toString().slice(-10)}${e}`;
    return `${t}${n}`;
  },
  get: (t, e, r = !0) => {
    const s = De.truncate(e(t));
    return s in De.store ? De.get(t, e, r) : (De.store[s] = r, [s, () => delete De.store[s]]);
  },
  purge: (t) => {
    De.store[t] && (delete De.store[t], Ce.attempt.unlink(t));
  },
  purgeSync: (t) => {
    De.store[t] && (delete De.store[t], Ce.attempt.unlinkSync(t));
  },
  purgeSyncAll: () => {
    for (const t in De.store)
      De.purgeSync(t);
  },
  truncate: (t) => {
    const e = C.basename(t);
    if (e.length <= Dl)
      return t;
    const r = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(e);
    if (!r)
      return t;
    const s = e.length - Dl;
    return `${t.slice(0, -e.length)}${r[1]}${r[2].slice(0, -s)}${r[3]}`;
  }
};
Ky(De.purgeSyncAll);
function Vd(t, e, r = jy) {
  if (Ml(r))
    return Vd(t, e, { encoding: r });
  const n = { timeout: r.timeout ?? My };
  let o = null, i = null, a = null;
  try {
    const c = Ce.attempt.realpathSync(t), d = !!c;
    t = c || t, [i, o] = De.get(t, r.tmpCreate || De.create, r.tmpPurge !== !1);
    const u = Ly && Zo(r.chown), f = Zo(r.mode);
    if (d && (u || f)) {
      const E = Ce.attempt.statSync(t);
      E && (r = { ...r }, u && (r.chown = { uid: E.uid, gid: E.gid }), f && (r.mode = E.mode));
    }
    if (!d) {
      const E = C.dirname(t);
      Ce.attempt.mkdirSync(E, {
        mode: Ay,
        recursive: !0
      });
    }
    a = Ce.retry.openSync(n)(i, "w", r.mode || Cl), r.tmpCreated && r.tmpCreated(i), Ml(e) ? Ce.retry.writeSync(n)(a, e, 0, r.encoding || Iy) : Zo(e) || Ce.retry.writeSync(n)(a, e, 0, e.length, 0), r.fsync !== !1 && (r.fsyncWait !== !1 ? Ce.retry.fsyncSync(n)(a) : Ce.attempt.fsync(a)), Ce.retry.closeSync(n)(a), a = null, r.chown && (r.chown.uid !== Cy || r.chown.gid !== Dy) && Ce.attempt.chownSync(i, r.chown.uid, r.chown.gid), r.mode && r.mode !== Cl && Ce.attempt.chmodSync(i, r.mode);
    try {
      Ce.retry.renameSync(n)(i, t);
    } catch (E) {
      if (!Fy(E) || E.code !== "ENAMETOOLONG")
        throw E;
      Ce.retry.renameSync(n)(i, De.truncate(t));
    }
    o(), i = null;
  } finally {
    a && Ce.attempt.closeSync(a), i && De.purge(i);
  }
}
var Ni = { exports: {} }, zd = {}, dt = {}, ss = {}, en = {}, ee = {}, Ws = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.regexpCode = t.getEsmExportName = t.getProperty = t.safeStringify = t.stringify = t.strConcat = t.addCodeArg = t.str = t._ = t.nil = t._Code = t.Name = t.IDENTIFIER = t._CodeOrName = void 0;
  class e {
  }
  t._CodeOrName = e, t.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends e {
    constructor(w) {
      if (super(), !t.IDENTIFIER.test(w))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = w;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  t.Name = r;
  class s extends e {
    constructor(w) {
      super(), this._items = typeof w == "string" ? [w] : w;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const w = this._items[0];
      return w === "" || w === '""';
    }
    get str() {
      var w;
      return (w = this._str) !== null && w !== void 0 ? w : this._str = this._items.reduce((P, T) => `${P}${T}`, "");
    }
    get names() {
      var w;
      return (w = this._names) !== null && w !== void 0 ? w : this._names = this._items.reduce((P, T) => (T instanceof r && (P[T.str] = (P[T.str] || 0) + 1), P), {});
    }
  }
  t._Code = s, t.nil = new s("");
  function n(m, ...w) {
    const P = [m[0]];
    let T = 0;
    for (; T < w.length; )
      a(P, w[T]), P.push(m[++T]);
    return new s(P);
  }
  t._ = n;
  const o = new s("+");
  function i(m, ...w) {
    const P = [_(m[0])];
    let T = 0;
    for (; T < w.length; )
      P.push(o), a(P, w[T]), P.push(o, _(m[++T]));
    return c(P), new s(P);
  }
  t.str = i;
  function a(m, w) {
    w instanceof s ? m.push(...w._items) : w instanceof r ? m.push(w) : m.push(f(w));
  }
  t.addCodeArg = a;
  function c(m) {
    let w = 1;
    for (; w < m.length - 1; ) {
      if (m[w] === o) {
        const P = d(m[w - 1], m[w + 1]);
        if (P !== void 0) {
          m.splice(w - 1, 3, P);
          continue;
        }
        m[w++] = "+";
      }
      w++;
    }
  }
  function d(m, w) {
    if (w === '""')
      return m;
    if (m === '""')
      return w;
    if (typeof m == "string")
      return w instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof w != "string" ? `${m.slice(0, -1)}${w}"` : w[0] === '"' ? m.slice(0, -1) + w.slice(1) : void 0;
    if (typeof w == "string" && w[0] === '"' && !(m instanceof r))
      return `"${m}${w.slice(1)}`;
  }
  function u(m, w) {
    return w.emptyStr() ? m : m.emptyStr() ? w : i`${m}${w}`;
  }
  t.strConcat = u;
  function f(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : _(Array.isArray(m) ? m.join(",") : m);
  }
  function E(m) {
    return new s(_(m));
  }
  t.stringify = E;
  function _(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  t.safeStringify = _;
  function v(m) {
    return typeof m == "string" && t.IDENTIFIER.test(m) ? new s(`.${m}`) : n`[${m}]`;
  }
  t.getProperty = v;
  function y(m) {
    if (typeof m == "string" && t.IDENTIFIER.test(m))
      return new s(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  t.getEsmExportName = y;
  function $(m) {
    return new s(m.toString());
  }
  t.regexpCode = $;
})(Ws);
var Oi = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.ValueScope = t.ValueScopeName = t.Scope = t.varKinds = t.UsedValueState = void 0;
  const e = Ws;
  class r extends Error {
    constructor(d) {
      super(`CodeGen: "code" for ${d} not defined`), this.value = d.value;
    }
  }
  var s;
  (function(c) {
    c[c.Started = 0] = "Started", c[c.Completed = 1] = "Completed";
  })(s || (t.UsedValueState = s = {})), t.varKinds = {
    const: new e.Name("const"),
    let: new e.Name("let"),
    var: new e.Name("var")
  };
  class n {
    constructor({ prefixes: d, parent: u } = {}) {
      this._names = {}, this._prefixes = d, this._parent = u;
    }
    toName(d) {
      return d instanceof e.Name ? d : this.name(d);
    }
    name(d) {
      return new e.Name(this._newName(d));
    }
    _newName(d) {
      const u = this._names[d] || this._nameGroup(d);
      return `${d}${u.index++}`;
    }
    _nameGroup(d) {
      var u, f;
      if (!((f = (u = this._parent) === null || u === void 0 ? void 0 : u._prefixes) === null || f === void 0) && f.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  t.Scope = n;
  class o extends e.Name {
    constructor(d, u) {
      super(u), this.prefix = d;
    }
    setValue(d, { property: u, itemIndex: f }) {
      this.value = d, this.scopePath = (0, e._)`.${new e.Name(u)}[${f}]`;
    }
  }
  t.ValueScopeName = o;
  const i = (0, e._)`\n`;
  class a extends n {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? i : e.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new o(d, this._newName(d));
    }
    value(d, u) {
      var f;
      if (u.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const E = this.toName(d), { prefix: _ } = E, v = (f = u.key) !== null && f !== void 0 ? f : u.ref;
      let y = this._values[_];
      if (y) {
        const w = y.get(v);
        if (w)
          return w;
      } else
        y = this._values[_] = /* @__PURE__ */ new Map();
      y.set(v, E);
      const $ = this._scope[_] || (this._scope[_] = []), m = $.length;
      return $[m] = u.ref, E.setValue(u, { property: _, itemIndex: m }), E;
    }
    getValue(d, u) {
      const f = this._values[d];
      if (f)
        return f.get(u);
    }
    scopeRefs(d, u = this._values) {
      return this._reduceValues(u, (f) => {
        if (f.scopePath === void 0)
          throw new Error(`CodeGen: name "${f}" has no value`);
        return (0, e._)`${d}${f.scopePath}`;
      });
    }
    scopeCode(d = this._values, u, f) {
      return this._reduceValues(d, (E) => {
        if (E.value === void 0)
          throw new Error(`CodeGen: name "${E}" has no value`);
        return E.value.code;
      }, u, f);
    }
    _reduceValues(d, u, f = {}, E) {
      let _ = e.nil;
      for (const v in d) {
        const y = d[v];
        if (!y)
          continue;
        const $ = f[v] = f[v] || /* @__PURE__ */ new Map();
        y.forEach((m) => {
          if ($.has(m))
            return;
          $.set(m, s.Started);
          let w = u(m);
          if (w) {
            const P = this.opts.es5 ? t.varKinds.var : t.varKinds.const;
            _ = (0, e._)`${_}${P} ${m} = ${w};${this.opts._n}`;
          } else if (w = E == null ? void 0 : E(m))
            _ = (0, e._)`${_}${w}${this.opts._n}`;
          else
            throw new r(m);
          $.set(m, s.Completed);
        });
      }
      return _;
    }
  }
  t.ValueScope = a;
})(Oi);
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.or = t.and = t.not = t.CodeGen = t.operators = t.varKinds = t.ValueScopeName = t.ValueScope = t.Scope = t.Name = t.regexpCode = t.stringify = t.getProperty = t.nil = t.strConcat = t.str = t._ = void 0;
  const e = Ws, r = Oi;
  var s = Ws;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return s._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return s.str;
  } }), Object.defineProperty(t, "strConcat", { enumerable: !0, get: function() {
    return s.strConcat;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return s.nil;
  } }), Object.defineProperty(t, "getProperty", { enumerable: !0, get: function() {
    return s.getProperty;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return s.stringify;
  } }), Object.defineProperty(t, "regexpCode", { enumerable: !0, get: function() {
    return s.regexpCode;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return s.Name;
  } });
  var n = Oi;
  Object.defineProperty(t, "Scope", { enumerable: !0, get: function() {
    return n.Scope;
  } }), Object.defineProperty(t, "ValueScope", { enumerable: !0, get: function() {
    return n.ValueScope;
  } }), Object.defineProperty(t, "ValueScopeName", { enumerable: !0, get: function() {
    return n.ValueScopeName;
  } }), Object.defineProperty(t, "varKinds", { enumerable: !0, get: function() {
    return n.varKinds;
  } }), t.operators = {
    GT: new e._Code(">"),
    GTE: new e._Code(">="),
    LT: new e._Code("<"),
    LTE: new e._Code("<="),
    EQ: new e._Code("==="),
    NEQ: new e._Code("!=="),
    NOT: new e._Code("!"),
    OR: new e._Code("||"),
    AND: new e._Code("&&"),
    ADD: new e._Code("+")
  };
  class o {
    optimizeNodes() {
      return this;
    }
    optimizeNames(l, h) {
      return this;
    }
  }
  class i extends o {
    constructor(l, h, S) {
      super(), this.varKind = l, this.name = h, this.rhs = S;
    }
    render({ es5: l, _n: h }) {
      const S = l ? r.varKinds.var : this.varKind, O = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${S} ${this.name}${O};` + h;
    }
    optimizeNames(l, h) {
      if (l[this.name.str])
        return this.rhs && (this.rhs = R(this.rhs, l, h)), this;
    }
    get names() {
      return this.rhs instanceof e._CodeOrName ? this.rhs.names : {};
    }
  }
  class a extends o {
    constructor(l, h, S) {
      super(), this.lhs = l, this.rhs = h, this.sideEffects = S;
    }
    render({ _n: l }) {
      return `${this.lhs} = ${this.rhs};` + l;
    }
    optimizeNames(l, h) {
      if (!(this.lhs instanceof e.Name && !l[this.lhs.str] && !this.sideEffects))
        return this.rhs = R(this.rhs, l, h), this;
    }
    get names() {
      const l = this.lhs instanceof e.Name ? {} : { ...this.lhs.names };
      return ae(l, this.rhs);
    }
  }
  class c extends a {
    constructor(l, h, S, O) {
      super(l, S, O), this.op = h;
    }
    render({ _n: l }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + l;
    }
  }
  class d extends o {
    constructor(l) {
      super(), this.label = l, this.names = {};
    }
    render({ _n: l }) {
      return `${this.label}:` + l;
    }
  }
  class u extends o {
    constructor(l) {
      super(), this.label = l, this.names = {};
    }
    render({ _n: l }) {
      return `break${this.label ? ` ${this.label}` : ""};` + l;
    }
  }
  class f extends o {
    constructor(l) {
      super(), this.error = l;
    }
    render({ _n: l }) {
      return `throw ${this.error};` + l;
    }
    get names() {
      return this.error.names;
    }
  }
  class E extends o {
    constructor(l) {
      super(), this.code = l;
    }
    render({ _n: l }) {
      return `${this.code};` + l;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(l, h) {
      return this.code = R(this.code, l, h), this;
    }
    get names() {
      return this.code instanceof e._CodeOrName ? this.code.names : {};
    }
  }
  class _ extends o {
    constructor(l = []) {
      super(), this.nodes = l;
    }
    render(l) {
      return this.nodes.reduce((h, S) => h + S.render(l), "");
    }
    optimizeNodes() {
      const { nodes: l } = this;
      let h = l.length;
      for (; h--; ) {
        const S = l[h].optimizeNodes();
        Array.isArray(S) ? l.splice(h, 1, ...S) : S ? l[h] = S : l.splice(h, 1);
      }
      return l.length > 0 ? this : void 0;
    }
    optimizeNames(l, h) {
      const { nodes: S } = this;
      let O = S.length;
      for (; O--; ) {
        const I = S[O];
        I.optimizeNames(l, h) || (A(l, I.names), S.splice(O, 1));
      }
      return S.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((l, h) => G(l, h.names), {});
    }
  }
  class v extends _ {
    render(l) {
      return "{" + l._n + super.render(l) + "}" + l._n;
    }
  }
  class y extends _ {
  }
  class $ extends v {
  }
  $.kind = "else";
  class m extends v {
    constructor(l, h) {
      super(h), this.condition = l;
    }
    render(l) {
      let h = `if(${this.condition})` + super.render(l);
      return this.else && (h += "else " + this.else.render(l)), h;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const l = this.condition;
      if (l === !0)
        return this.nodes;
      let h = this.else;
      if (h) {
        const S = h.optimizeNodes();
        h = this.else = Array.isArray(S) ? new $(S) : S;
      }
      if (h)
        return l === !1 ? h instanceof m ? h : h.nodes : this.nodes.length ? this : new m(F(l), h instanceof m ? [h] : h.nodes);
      if (!(l === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(l, h) {
      var S;
      if (this.else = (S = this.else) === null || S === void 0 ? void 0 : S.optimizeNames(l, h), !!(super.optimizeNames(l, h) || this.else))
        return this.condition = R(this.condition, l, h), this;
    }
    get names() {
      const l = super.names;
      return ae(l, this.condition), this.else && G(l, this.else.names), l;
    }
  }
  m.kind = "if";
  class w extends v {
  }
  w.kind = "for";
  class P extends w {
    constructor(l) {
      super(), this.iteration = l;
    }
    render(l) {
      return `for(${this.iteration})` + super.render(l);
    }
    optimizeNames(l, h) {
      if (super.optimizeNames(l, h))
        return this.iteration = R(this.iteration, l, h), this;
    }
    get names() {
      return G(super.names, this.iteration.names);
    }
  }
  class T extends w {
    constructor(l, h, S, O) {
      super(), this.varKind = l, this.name = h, this.from = S, this.to = O;
    }
    render(l) {
      const h = l.es5 ? r.varKinds.var : this.varKind, { name: S, from: O, to: I } = this;
      return `for(${h} ${S}=${O}; ${S}<${I}; ${S}++)` + super.render(l);
    }
    get names() {
      const l = ae(super.names, this.from);
      return ae(l, this.to);
    }
  }
  class N extends w {
    constructor(l, h, S, O) {
      super(), this.loop = l, this.varKind = h, this.name = S, this.iterable = O;
    }
    render(l) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(l);
    }
    optimizeNames(l, h) {
      if (super.optimizeNames(l, h))
        return this.iterable = R(this.iterable, l, h), this;
    }
    get names() {
      return G(super.names, this.iterable.names);
    }
  }
  class V extends v {
    constructor(l, h, S) {
      super(), this.name = l, this.args = h, this.async = S;
    }
    render(l) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(l);
    }
  }
  V.kind = "func";
  class H extends _ {
    render(l) {
      return "return " + super.render(l);
    }
  }
  H.kind = "return";
  class ce extends v {
    render(l) {
      let h = "try" + super.render(l);
      return this.catch && (h += this.catch.render(l)), this.finally && (h += this.finally.render(l)), h;
    }
    optimizeNodes() {
      var l, h;
      return super.optimizeNodes(), (l = this.catch) === null || l === void 0 || l.optimizeNodes(), (h = this.finally) === null || h === void 0 || h.optimizeNodes(), this;
    }
    optimizeNames(l, h) {
      var S, O;
      return super.optimizeNames(l, h), (S = this.catch) === null || S === void 0 || S.optimizeNames(l, h), (O = this.finally) === null || O === void 0 || O.optimizeNames(l, h), this;
    }
    get names() {
      const l = super.names;
      return this.catch && G(l, this.catch.names), this.finally && G(l, this.finally.names), l;
    }
  }
  class fe extends v {
    constructor(l) {
      super(), this.error = l;
    }
    render(l) {
      return `catch(${this.error})` + super.render(l);
    }
  }
  fe.kind = "catch";
  class ye extends v {
    render(l) {
      return "finally" + super.render(l);
    }
  }
  ye.kind = "finally";
  class K {
    constructor(l, h = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...h, _n: h.lines ? `
` : "" }, this._extScope = l, this._scope = new r.Scope({ parent: l }), this._nodes = [new y()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(l) {
      return this._scope.name(l);
    }
    // reserves unique name in the external scope
    scopeName(l) {
      return this._extScope.name(l);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(l, h) {
      const S = this._extScope.value(l, h);
      return (this._values[S.prefix] || (this._values[S.prefix] = /* @__PURE__ */ new Set())).add(S), S;
    }
    getScopeValue(l, h) {
      return this._extScope.getValue(l, h);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(l) {
      return this._extScope.scopeRefs(l, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(l, h, S, O) {
      const I = this._scope.toName(h);
      return S !== void 0 && O && (this._constants[I.str] = S), this._leafNode(new i(l, I, S)), I;
    }
    // `const` declaration (`var` in es5 mode)
    const(l, h, S) {
      return this._def(r.varKinds.const, l, h, S);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(l, h, S) {
      return this._def(r.varKinds.let, l, h, S);
    }
    // `var` declaration with optional assignment
    var(l, h, S) {
      return this._def(r.varKinds.var, l, h, S);
    }
    // assignment code
    assign(l, h, S) {
      return this._leafNode(new a(l, h, S));
    }
    // `+=` code
    add(l, h) {
      return this._leafNode(new c(l, t.operators.ADD, h));
    }
    // appends passed SafeExpr to code or executes Block
    code(l) {
      return typeof l == "function" ? l() : l !== e.nil && this._leafNode(new E(l)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...l) {
      const h = ["{"];
      for (const [S, O] of l)
        h.length > 1 && h.push(","), h.push(S), (S !== O || this.opts.es5) && (h.push(":"), (0, e.addCodeArg)(h, O));
      return h.push("}"), new e._Code(h);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(l, h, S) {
      if (this._blockNode(new m(l)), h && S)
        this.code(h).else().code(S).endIf();
      else if (h)
        this.code(h).endIf();
      else if (S)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(l) {
      return this._elseNode(new m(l));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new $());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, $);
    }
    _for(l, h) {
      return this._blockNode(l), h && this.code(h).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(l, h) {
      return this._for(new P(l), h);
    }
    // `for` statement for a range of values
    forRange(l, h, S, O, I = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const z = this._scope.toName(l);
      return this._for(new T(I, z, h, S), () => O(z));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(l, h, S, O = r.varKinds.const) {
      const I = this._scope.toName(l);
      if (this.opts.es5) {
        const z = h instanceof e.Name ? h : this.var("_arr", h);
        return this.forRange("_i", 0, (0, e._)`${z}.length`, (U) => {
          this.var(I, (0, e._)`${z}[${U}]`), S(I);
        });
      }
      return this._for(new N("of", O, I, h), () => S(I));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(l, h, S, O = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(l, (0, e._)`Object.keys(${h})`, S);
      const I = this._scope.toName(l);
      return this._for(new N("in", O, I, h), () => S(I));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(w);
    }
    // `label` statement
    label(l) {
      return this._leafNode(new d(l));
    }
    // `break` statement
    break(l) {
      return this._leafNode(new u(l));
    }
    // `return` statement
    return(l) {
      const h = new H();
      if (this._blockNode(h), this.code(l), h.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(H);
    }
    // `try` statement
    try(l, h, S) {
      if (!h && !S)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const O = new ce();
      if (this._blockNode(O), this.code(l), h) {
        const I = this.name("e");
        this._currNode = O.catch = new fe(I), h(I);
      }
      return S && (this._currNode = O.finally = new ye(), this.code(S)), this._endBlockNode(fe, ye);
    }
    // `throw` statement
    throw(l) {
      return this._leafNode(new f(l));
    }
    // start self-balancing block
    block(l, h) {
      return this._blockStarts.push(this._nodes.length), l && this.code(l).endBlock(h), this;
    }
    // end the current self-balancing block
    endBlock(l) {
      const h = this._blockStarts.pop();
      if (h === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const S = this._nodes.length - h;
      if (S < 0 || l !== void 0 && S !== l)
        throw new Error(`CodeGen: wrong number of nodes: ${S} vs ${l} expected`);
      return this._nodes.length = h, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(l, h = e.nil, S, O) {
      return this._blockNode(new V(l, h, S)), O && this.code(O).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(V);
    }
    optimize(l = 1) {
      for (; l-- > 0; )
        this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(l) {
      return this._currNode.nodes.push(l), this;
    }
    _blockNode(l) {
      this._currNode.nodes.push(l), this._nodes.push(l);
    }
    _endBlockNode(l, h) {
      const S = this._currNode;
      if (S instanceof l || h && S instanceof h)
        return this._nodes.pop(), this;
      throw new Error(`CodeGen: not in block "${h ? `${l.kind}/${h.kind}` : l.kind}"`);
    }
    _elseNode(l) {
      const h = this._currNode;
      if (!(h instanceof m))
        throw new Error('CodeGen: "else" without "if"');
      return this._currNode = h.else = l, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const l = this._nodes;
      return l[l.length - 1];
    }
    set _currNode(l) {
      const h = this._nodes;
      h[h.length - 1] = l;
    }
  }
  t.CodeGen = K;
  function G(g, l) {
    for (const h in l)
      g[h] = (g[h] || 0) + (l[h] || 0);
    return g;
  }
  function ae(g, l) {
    return l instanceof e._CodeOrName ? G(g, l.names) : g;
  }
  function R(g, l, h) {
    if (g instanceof e.Name)
      return S(g);
    if (!O(g))
      return g;
    return new e._Code(g._items.reduce((I, z) => (z instanceof e.Name && (z = S(z)), z instanceof e._Code ? I.push(...z._items) : I.push(z), I), []));
    function S(I) {
      const z = h[I.str];
      return z === void 0 || l[I.str] !== 1 ? I : (delete l[I.str], z);
    }
    function O(I) {
      return I instanceof e._Code && I._items.some((z) => z instanceof e.Name && l[z.str] === 1 && h[z.str] !== void 0);
    }
  }
  function A(g, l) {
    for (const h in l)
      g[h] = (g[h] || 0) - (l[h] || 0);
  }
  function F(g) {
    return typeof g == "boolean" || typeof g == "number" || g === null ? !g : (0, e._)`!${b(g)}`;
  }
  t.not = F;
  const M = p(t.operators.AND);
  function B(...g) {
    return g.reduce(M);
  }
  t.and = B;
  const L = p(t.operators.OR);
  function k(...g) {
    return g.reduce(L);
  }
  t.or = k;
  function p(g) {
    return (l, h) => l === e.nil ? h : h === e.nil ? l : (0, e._)`${b(l)} ${g} ${b(h)}`;
  }
  function b(g) {
    return g instanceof e.Name ? g : (0, e._)`(${g})`;
  }
})(ee);
var j = {};
Object.defineProperty(j, "__esModule", { value: !0 });
j.checkStrictMode = j.getErrorPath = j.Type = j.useFunc = j.setEvaluated = j.evaluatedPropsToName = j.mergeEvaluated = j.eachItem = j.unescapeJsonPointer = j.escapeJsonPointer = j.escapeFragment = j.unescapeFragment = j.schemaRefOrVal = j.schemaHasRulesButRef = j.schemaHasRules = j.checkUnknownRules = j.alwaysValidSchema = j.toHash = void 0;
const le = ee, xy = Ws;
function qy(t) {
  const e = {};
  for (const r of t)
    e[r] = !0;
  return e;
}
j.toHash = qy;
function By(t, e) {
  return typeof e == "boolean" ? e : Object.keys(e).length === 0 ? !0 : (Kd(t, e), !xd(e, t.self.RULES.all));
}
j.alwaysValidSchema = By;
function Kd(t, e = t.schema) {
  const { opts: r, self: s } = t;
  if (!r.strictSchema || typeof e == "boolean")
    return;
  const n = s.RULES.keywords;
  for (const o in e)
    n[o] || Gd(t, `unknown keyword: "${o}"`);
}
j.checkUnknownRules = Kd;
function xd(t, e) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (e[r])
      return !0;
  return !1;
}
j.schemaHasRules = xd;
function Gy(t, e) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (r !== "$ref" && e.all[r])
      return !0;
  return !1;
}
j.schemaHasRulesButRef = Gy;
function Hy({ topSchemaRef: t, schemaPath: e }, r, s, n) {
  if (!n) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, le._)`${r}`;
  }
  return (0, le._)`${t}${e}${(0, le.getProperty)(s)}`;
}
j.schemaRefOrVal = Hy;
function Wy(t) {
  return qd(decodeURIComponent(t));
}
j.unescapeFragment = Wy;
function Jy(t) {
  return encodeURIComponent(ra(t));
}
j.escapeFragment = Jy;
function ra(t) {
  return typeof t == "number" ? `${t}` : t.replace(/~/g, "~0").replace(/\//g, "~1");
}
j.escapeJsonPointer = ra;
function qd(t) {
  return t.replace(/~1/g, "/").replace(/~0/g, "~");
}
j.unescapeJsonPointer = qd;
function Xy(t, e) {
  if (Array.isArray(t))
    for (const r of t)
      e(r);
  else
    e(t);
}
j.eachItem = Xy;
function Ll({ mergeNames: t, mergeToName: e, mergeValues: r, resultToName: s }) {
  return (n, o, i, a) => {
    const c = i === void 0 ? o : i instanceof le.Name ? (o instanceof le.Name ? t(n, o, i) : e(n, o, i), i) : o instanceof le.Name ? (e(n, i, o), o) : r(o, i);
    return a === le.Name && !(c instanceof le.Name) ? s(n, c) : c;
  };
}
j.mergeEvaluated = {
  props: Ll({
    mergeNames: (t, e, r) => t.if((0, le._)`${r} !== true && ${e} !== undefined`, () => {
      t.if((0, le._)`${e} === true`, () => t.assign(r, !0), () => t.assign(r, (0, le._)`${r} || {}`).code((0, le._)`Object.assign(${r}, ${e})`));
    }),
    mergeToName: (t, e, r) => t.if((0, le._)`${r} !== true`, () => {
      e === !0 ? t.assign(r, !0) : (t.assign(r, (0, le._)`${r} || {}`), sa(t, r, e));
    }),
    mergeValues: (t, e) => t === !0 ? !0 : { ...t, ...e },
    resultToName: Bd
  }),
  items: Ll({
    mergeNames: (t, e, r) => t.if((0, le._)`${r} !== true && ${e} !== undefined`, () => t.assign(r, (0, le._)`${e} === true ? true : ${r} > ${e} ? ${r} : ${e}`)),
    mergeToName: (t, e, r) => t.if((0, le._)`${r} !== true`, () => t.assign(r, e === !0 ? !0 : (0, le._)`${r} > ${e} ? ${r} : ${e}`)),
    mergeValues: (t, e) => t === !0 ? !0 : Math.max(t, e),
    resultToName: (t, e) => t.var("items", e)
  })
};
function Bd(t, e) {
  if (e === !0)
    return t.var("props", !0);
  const r = t.var("props", (0, le._)`{}`);
  return e !== void 0 && sa(t, r, e), r;
}
j.evaluatedPropsToName = Bd;
function sa(t, e, r) {
  Object.keys(r).forEach((s) => t.assign((0, le._)`${e}${(0, le.getProperty)(s)}`, !0));
}
j.setEvaluated = sa;
const Fl = {};
function Yy(t, e) {
  return t.scopeValue("func", {
    ref: e,
    code: Fl[e.code] || (Fl[e.code] = new xy._Code(e.code))
  });
}
j.useFunc = Yy;
var Ri;
(function(t) {
  t[t.Num = 0] = "Num", t[t.Str = 1] = "Str";
})(Ri || (j.Type = Ri = {}));
function Zy(t, e, r) {
  if (t instanceof le.Name) {
    const s = e === Ri.Num;
    return r ? s ? (0, le._)`"[" + ${t} + "]"` : (0, le._)`"['" + ${t} + "']"` : s ? (0, le._)`"/" + ${t}` : (0, le._)`"/" + ${t}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, le.getProperty)(t).toString() : "/" + ra(t);
}
j.getErrorPath = Zy;
function Gd(t, e, r = t.opts.strictSchema) {
  if (r) {
    if (e = `strict mode: ${e}`, r === !0)
      throw new Error(e);
    t.self.logger.warn(e);
  }
}
j.checkStrictMode = Gd;
var Xe = {};
Object.defineProperty(Xe, "__esModule", { value: !0 });
const Ae = ee, Qy = {
  // validation function arguments
  data: new Ae.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new Ae.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new Ae.Name("instancePath"),
  parentData: new Ae.Name("parentData"),
  parentDataProperty: new Ae.Name("parentDataProperty"),
  rootData: new Ae.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new Ae.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new Ae.Name("vErrors"),
  // null or array of validation errors
  errors: new Ae.Name("errors"),
  // counter of validation errors
  this: new Ae.Name("this"),
  // "globals"
  self: new Ae.Name("self"),
  scope: new Ae.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new Ae.Name("json"),
  jsonPos: new Ae.Name("jsonPos"),
  jsonLen: new Ae.Name("jsonLen"),
  jsonPart: new Ae.Name("jsonPart")
};
Xe.default = Qy;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.extendErrors = t.resetErrorsCount = t.reportExtraError = t.reportError = t.keyword$DataError = t.keywordError = void 0;
  const e = ee, r = j, s = Xe;
  t.keywordError = {
    message: ({ keyword: $ }) => (0, e.str)`must pass "${$}" keyword validation`
  }, t.keyword$DataError = {
    message: ({ keyword: $, schemaType: m }) => m ? (0, e.str)`"${$}" keyword must be ${m} ($data)` : (0, e.str)`"${$}" keyword is invalid ($data)`
  };
  function n($, m = t.keywordError, w, P) {
    const { it: T } = $, { gen: N, compositeRule: V, allErrors: H } = T, ce = f($, m, w);
    P ?? (V || H) ? c(N, ce) : d(T, (0, e._)`[${ce}]`);
  }
  t.reportError = n;
  function o($, m = t.keywordError, w) {
    const { it: P } = $, { gen: T, compositeRule: N, allErrors: V } = P, H = f($, m, w);
    c(T, H), N || V || d(P, s.default.vErrors);
  }
  t.reportExtraError = o;
  function i($, m) {
    $.assign(s.default.errors, m), $.if((0, e._)`${s.default.vErrors} !== null`, () => $.if(m, () => $.assign((0, e._)`${s.default.vErrors}.length`, m), () => $.assign(s.default.vErrors, null)));
  }
  t.resetErrorsCount = i;
  function a({ gen: $, keyword: m, schemaValue: w, data: P, errsCount: T, it: N }) {
    if (T === void 0)
      throw new Error("ajv implementation error");
    const V = $.name("err");
    $.forRange("i", T, s.default.errors, (H) => {
      $.const(V, (0, e._)`${s.default.vErrors}[${H}]`), $.if((0, e._)`${V}.instancePath === undefined`, () => $.assign((0, e._)`${V}.instancePath`, (0, e.strConcat)(s.default.instancePath, N.errorPath))), $.assign((0, e._)`${V}.schemaPath`, (0, e.str)`${N.errSchemaPath}/${m}`), N.opts.verbose && ($.assign((0, e._)`${V}.schema`, w), $.assign((0, e._)`${V}.data`, P));
    });
  }
  t.extendErrors = a;
  function c($, m) {
    const w = $.const("err", m);
    $.if((0, e._)`${s.default.vErrors} === null`, () => $.assign(s.default.vErrors, (0, e._)`[${w}]`), (0, e._)`${s.default.vErrors}.push(${w})`), $.code((0, e._)`${s.default.errors}++`);
  }
  function d($, m) {
    const { gen: w, validateName: P, schemaEnv: T } = $;
    T.$async ? w.throw((0, e._)`new ${$.ValidationError}(${m})`) : (w.assign((0, e._)`${P}.errors`, m), w.return(!1));
  }
  const u = {
    keyword: new e.Name("keyword"),
    schemaPath: new e.Name("schemaPath"),
    // also used in JTD errors
    params: new e.Name("params"),
    propertyName: new e.Name("propertyName"),
    message: new e.Name("message"),
    schema: new e.Name("schema"),
    parentSchema: new e.Name("parentSchema")
  };
  function f($, m, w) {
    const { createErrors: P } = $.it;
    return P === !1 ? (0, e._)`{}` : E($, m, w);
  }
  function E($, m, w = {}) {
    const { gen: P, it: T } = $, N = [
      _(T, w),
      v($, w)
    ];
    return y($, m, N), P.object(...N);
  }
  function _({ errorPath: $ }, { instancePath: m }) {
    const w = m ? (0, e.str)`${$}${(0, r.getErrorPath)(m, r.Type.Str)}` : $;
    return [s.default.instancePath, (0, e.strConcat)(s.default.instancePath, w)];
  }
  function v({ keyword: $, it: { errSchemaPath: m } }, { schemaPath: w, parentSchema: P }) {
    let T = P ? m : (0, e.str)`${m}/${$}`;
    return w && (T = (0, e.str)`${T}${(0, r.getErrorPath)(w, r.Type.Str)}`), [u.schemaPath, T];
  }
  function y($, { params: m, message: w }, P) {
    const { keyword: T, data: N, schemaValue: V, it: H } = $, { opts: ce, propertyName: fe, topSchemaRef: ye, schemaPath: K } = H;
    P.push([u.keyword, T], [u.params, typeof m == "function" ? m($) : m || (0, e._)`{}`]), ce.messages && P.push([u.message, typeof w == "function" ? w($) : w]), ce.verbose && P.push([u.schema, V], [u.parentSchema, (0, e._)`${ye}${K}`], [s.default.data, N]), fe && P.push([u.propertyName, fe]);
  }
})(en);
Object.defineProperty(ss, "__esModule", { value: !0 });
ss.boolOrEmptySchema = ss.topBoolOrEmptySchema = void 0;
const e$ = en, t$ = ee, r$ = Xe, s$ = {
  message: "boolean schema is false"
};
function n$(t) {
  const { gen: e, schema: r, validateName: s } = t;
  r === !1 ? Hd(t, !1) : typeof r == "object" && r.$async === !0 ? e.return(r$.default.data) : (e.assign((0, t$._)`${s}.errors`, null), e.return(!0));
}
ss.topBoolOrEmptySchema = n$;
function o$(t, e) {
  const { gen: r, schema: s } = t;
  s === !1 ? (r.var(e, !1), Hd(t)) : r.var(e, !0);
}
ss.boolOrEmptySchema = o$;
function Hd(t, e) {
  const { gen: r, data: s } = t, n = {
    gen: r,
    keyword: "false schema",
    data: s,
    schema: !1,
    schemaCode: !1,
    schemaValue: !1,
    params: {},
    it: t
  };
  (0, e$.reportError)(n, s$, void 0, e);
}
var ve = {}, Ar = {};
Object.defineProperty(Ar, "__esModule", { value: !0 });
Ar.getRules = Ar.isJSONType = void 0;
const i$ = ["string", "number", "integer", "boolean", "null", "object", "array"], a$ = new Set(i$);
function c$(t) {
  return typeof t == "string" && a$.has(t);
}
Ar.isJSONType = c$;
function l$() {
  const t = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...t, integer: !0, boolean: !0, null: !0 },
    rules: [{ rules: [] }, t.number, t.string, t.array, t.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
Ar.getRules = l$;
var Ot = {};
Object.defineProperty(Ot, "__esModule", { value: !0 });
Ot.shouldUseRule = Ot.shouldUseGroup = Ot.schemaHasRulesForType = void 0;
function u$({ schema: t, self: e }, r) {
  const s = e.RULES.types[r];
  return s && s !== !0 && Wd(t, s);
}
Ot.schemaHasRulesForType = u$;
function Wd(t, e) {
  return e.rules.some((r) => Jd(t, r));
}
Ot.shouldUseGroup = Wd;
function Jd(t, e) {
  var r;
  return t[e.keyword] !== void 0 || ((r = e.definition.implements) === null || r === void 0 ? void 0 : r.some((s) => t[s] !== void 0));
}
Ot.shouldUseRule = Jd;
Object.defineProperty(ve, "__esModule", { value: !0 });
ve.reportTypeError = ve.checkDataTypes = ve.checkDataType = ve.coerceAndCheckDataType = ve.getJSONTypes = ve.getSchemaTypes = ve.DataType = void 0;
const d$ = Ar, f$ = Ot, h$ = en, te = ee, Xd = j;
var Zr;
(function(t) {
  t[t.Correct = 0] = "Correct", t[t.Wrong = 1] = "Wrong";
})(Zr || (ve.DataType = Zr = {}));
function m$(t) {
  const e = Yd(t.type);
  if (e.includes("null")) {
    if (t.nullable === !1)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!e.length && t.nullable !== void 0)
      throw new Error('"nullable" cannot be used without "type"');
    t.nullable === !0 && e.push("null");
  }
  return e;
}
ve.getSchemaTypes = m$;
function Yd(t) {
  const e = Array.isArray(t) ? t : t ? [t] : [];
  if (e.every(d$.isJSONType))
    return e;
  throw new Error("type must be JSONType or JSONType[]: " + e.join(","));
}
ve.getJSONTypes = Yd;
function p$(t, e) {
  const { gen: r, data: s, opts: n } = t, o = y$(e, n.coerceTypes), i = e.length > 0 && !(o.length === 0 && e.length === 1 && (0, f$.schemaHasRulesForType)(t, e[0]));
  if (i) {
    const a = na(e, s, n.strictNumbers, Zr.Wrong);
    r.if(a, () => {
      o.length ? $$(t, e, o) : oa(t);
    });
  }
  return i;
}
ve.coerceAndCheckDataType = p$;
const Zd = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function y$(t, e) {
  return e ? t.filter((r) => Zd.has(r) || e === "array" && r === "array") : [];
}
function $$(t, e, r) {
  const { gen: s, data: n, opts: o } = t, i = s.let("dataType", (0, te._)`typeof ${n}`), a = s.let("coerced", (0, te._)`undefined`);
  o.coerceTypes === "array" && s.if((0, te._)`${i} == 'object' && Array.isArray(${n}) && ${n}.length == 1`, () => s.assign(n, (0, te._)`${n}[0]`).assign(i, (0, te._)`typeof ${n}`).if(na(e, n, o.strictNumbers), () => s.assign(a, n))), s.if((0, te._)`${a} !== undefined`);
  for (const d of r)
    (Zd.has(d) || d === "array" && o.coerceTypes === "array") && c(d);
  s.else(), oa(t), s.endIf(), s.if((0, te._)`${a} !== undefined`, () => {
    s.assign(n, a), g$(t, a);
  });
  function c(d) {
    switch (d) {
      case "string":
        s.elseIf((0, te._)`${i} == "number" || ${i} == "boolean"`).assign(a, (0, te._)`"" + ${n}`).elseIf((0, te._)`${n} === null`).assign(a, (0, te._)`""`);
        return;
      case "number":
        s.elseIf((0, te._)`${i} == "boolean" || ${n} === null
              || (${i} == "string" && ${n} && ${n} == +${n})`).assign(a, (0, te._)`+${n}`);
        return;
      case "integer":
        s.elseIf((0, te._)`${i} === "boolean" || ${n} === null
              || (${i} === "string" && ${n} && ${n} == +${n} && !(${n} % 1))`).assign(a, (0, te._)`+${n}`);
        return;
      case "boolean":
        s.elseIf((0, te._)`${n} === "false" || ${n} === 0 || ${n} === null`).assign(a, !1).elseIf((0, te._)`${n} === "true" || ${n} === 1`).assign(a, !0);
        return;
      case "null":
        s.elseIf((0, te._)`${n} === "" || ${n} === 0 || ${n} === false`), s.assign(a, null);
        return;
      case "array":
        s.elseIf((0, te._)`${i} === "string" || ${i} === "number"
              || ${i} === "boolean" || ${n} === null`).assign(a, (0, te._)`[${n}]`);
    }
  }
}
function g$({ gen: t, parentData: e, parentDataProperty: r }, s) {
  t.if((0, te._)`${e} !== undefined`, () => t.assign((0, te._)`${e}[${r}]`, s));
}
function Ii(t, e, r, s = Zr.Correct) {
  const n = s === Zr.Correct ? te.operators.EQ : te.operators.NEQ;
  let o;
  switch (t) {
    case "null":
      return (0, te._)`${e} ${n} null`;
    case "array":
      o = (0, te._)`Array.isArray(${e})`;
      break;
    case "object":
      o = (0, te._)`${e} && typeof ${e} == "object" && !Array.isArray(${e})`;
      break;
    case "integer":
      o = i((0, te._)`!(${e} % 1) && !isNaN(${e})`);
      break;
    case "number":
      o = i();
      break;
    default:
      return (0, te._)`typeof ${e} ${n} ${t}`;
  }
  return s === Zr.Correct ? o : (0, te.not)(o);
  function i(a = te.nil) {
    return (0, te.and)((0, te._)`typeof ${e} == "number"`, a, r ? (0, te._)`isFinite(${e})` : te.nil);
  }
}
ve.checkDataType = Ii;
function na(t, e, r, s) {
  if (t.length === 1)
    return Ii(t[0], e, r, s);
  let n;
  const o = (0, Xd.toHash)(t);
  if (o.array && o.object) {
    const i = (0, te._)`typeof ${e} != "object"`;
    n = o.null ? i : (0, te._)`!${e} || ${i}`, delete o.null, delete o.array, delete o.object;
  } else
    n = te.nil;
  o.number && delete o.integer;
  for (const i in o)
    n = (0, te.and)(n, Ii(i, e, r, s));
  return n;
}
ve.checkDataTypes = na;
const _$ = {
  message: ({ schema: t }) => `must be ${t}`,
  params: ({ schema: t, schemaValue: e }) => typeof t == "string" ? (0, te._)`{type: ${t}}` : (0, te._)`{type: ${e}}`
};
function oa(t) {
  const e = v$(t);
  (0, h$.reportError)(e, _$);
}
ve.reportTypeError = oa;
function v$(t) {
  const { gen: e, data: r, schema: s } = t, n = (0, Xd.schemaRefOrVal)(t, s, "type");
  return {
    gen: e,
    keyword: "type",
    data: r,
    schema: s.type,
    schemaCode: n,
    schemaValue: n,
    parentSchema: s,
    params: {},
    it: t
  };
}
var $o = {};
Object.defineProperty($o, "__esModule", { value: !0 });
$o.assignDefaults = void 0;
const Lr = ee, w$ = j;
function E$(t, e) {
  const { properties: r, items: s } = t.schema;
  if (e === "object" && r)
    for (const n in r)
      Ul(t, n, r[n].default);
  else e === "array" && Array.isArray(s) && s.forEach((n, o) => Ul(t, o, n.default));
}
$o.assignDefaults = E$;
function Ul(t, e, r) {
  const { gen: s, compositeRule: n, data: o, opts: i } = t;
  if (r === void 0)
    return;
  const a = (0, Lr._)`${o}${(0, Lr.getProperty)(e)}`;
  if (n) {
    (0, w$.checkStrictMode)(t, `default is ignored for: ${a}`);
    return;
  }
  let c = (0, Lr._)`${a} === undefined`;
  i.useDefaults === "empty" && (c = (0, Lr._)`${c} || ${a} === null || ${a} === ""`), s.if(c, (0, Lr._)`${a} = ${(0, Lr.stringify)(r)}`);
}
var wt = {}, ne = {};
Object.defineProperty(ne, "__esModule", { value: !0 });
ne.validateUnion = ne.validateArray = ne.usePattern = ne.callValidateCode = ne.schemaProperties = ne.allSchemaProperties = ne.noPropertyInData = ne.propertyInData = ne.isOwnProperty = ne.hasPropFunc = ne.reportMissingProp = ne.checkMissingProp = ne.checkReportMissingProp = void 0;
const he = ee, ia = j, Ut = Xe, S$ = j;
function b$(t, e) {
  const { gen: r, data: s, it: n } = t;
  r.if(ca(r, s, e, n.opts.ownProperties), () => {
    t.setParams({ missingProperty: (0, he._)`${e}` }, !0), t.error();
  });
}
ne.checkReportMissingProp = b$;
function P$({ gen: t, data: e, it: { opts: r } }, s, n) {
  return (0, he.or)(...s.map((o) => (0, he.and)(ca(t, e, o, r.ownProperties), (0, he._)`${n} = ${o}`)));
}
ne.checkMissingProp = P$;
function k$(t, e) {
  t.setParams({ missingProperty: e }, !0), t.error();
}
ne.reportMissingProp = k$;
function Qd(t) {
  return t.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, he._)`Object.prototype.hasOwnProperty`
  });
}
ne.hasPropFunc = Qd;
function aa(t, e, r) {
  return (0, he._)`${Qd(t)}.call(${e}, ${r})`;
}
ne.isOwnProperty = aa;
function T$(t, e, r, s) {
  const n = (0, he._)`${e}${(0, he.getProperty)(r)} !== undefined`;
  return s ? (0, he._)`${n} && ${aa(t, e, r)}` : n;
}
ne.propertyInData = T$;
function ca(t, e, r, s) {
  const n = (0, he._)`${e}${(0, he.getProperty)(r)} === undefined`;
  return s ? (0, he.or)(n, (0, he.not)(aa(t, e, r))) : n;
}
ne.noPropertyInData = ca;
function ef(t) {
  return t ? Object.keys(t).filter((e) => e !== "__proto__") : [];
}
ne.allSchemaProperties = ef;
function N$(t, e) {
  return ef(e).filter((r) => !(0, ia.alwaysValidSchema)(t, e[r]));
}
ne.schemaProperties = N$;
function O$({ schemaCode: t, data: e, it: { gen: r, topSchemaRef: s, schemaPath: n, errorPath: o }, it: i }, a, c, d) {
  const u = d ? (0, he._)`${t}, ${e}, ${s}${n}` : e, f = [
    [Ut.default.instancePath, (0, he.strConcat)(Ut.default.instancePath, o)],
    [Ut.default.parentData, i.parentData],
    [Ut.default.parentDataProperty, i.parentDataProperty],
    [Ut.default.rootData, Ut.default.rootData]
  ];
  i.opts.dynamicRef && f.push([Ut.default.dynamicAnchors, Ut.default.dynamicAnchors]);
  const E = (0, he._)`${u}, ${r.object(...f)}`;
  return c !== he.nil ? (0, he._)`${a}.call(${c}, ${E})` : (0, he._)`${a}(${E})`;
}
ne.callValidateCode = O$;
const R$ = (0, he._)`new RegExp`;
function I$({ gen: t, it: { opts: e } }, r) {
  const s = e.unicodeRegExp ? "u" : "", { regExp: n } = e.code, o = n(r, s);
  return t.scopeValue("pattern", {
    key: o.toString(),
    ref: o,
    code: (0, he._)`${n.code === "new RegExp" ? R$ : (0, S$.useFunc)(t, n)}(${r}, ${s})`
  });
}
ne.usePattern = I$;
function A$(t) {
  const { gen: e, data: r, keyword: s, it: n } = t, o = e.name("valid");
  if (n.allErrors) {
    const a = e.let("valid", !0);
    return i(() => e.assign(a, !1)), a;
  }
  return e.var(o, !0), i(() => e.break()), o;
  function i(a) {
    const c = e.const("len", (0, he._)`${r}.length`);
    e.forRange("i", 0, c, (d) => {
      t.subschema({
        keyword: s,
        dataProp: d,
        dataPropType: ia.Type.Num
      }, o), e.if((0, he.not)(o), a);
    });
  }
}
ne.validateArray = A$;
function j$(t) {
  const { gen: e, schema: r, keyword: s, it: n } = t;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, ia.alwaysValidSchema)(n, c)) && !n.opts.unevaluated)
    return;
  const i = e.let("valid", !1), a = e.name("_valid");
  e.block(() => r.forEach((c, d) => {
    const u = t.subschema({
      keyword: s,
      schemaProp: d,
      compositeRule: !0
    }, a);
    e.assign(i, (0, he._)`${i} || ${a}`), t.mergeValidEvaluated(u, a) || e.if((0, he.not)(i));
  })), t.result(i, () => t.reset(), () => t.error(!0));
}
ne.validateUnion = j$;
Object.defineProperty(wt, "__esModule", { value: !0 });
wt.validateKeywordUsage = wt.validSchemaType = wt.funcKeywordCode = wt.macroKeywordCode = void 0;
const Me = ee, Er = Xe, C$ = ne, D$ = en;
function M$(t, e) {
  const { gen: r, keyword: s, schema: n, parentSchema: o, it: i } = t, a = e.macro.call(i.self, n, o, i), c = tf(r, s, a);
  i.opts.validateSchema !== !1 && i.self.validateSchema(a, !0);
  const d = r.name("valid");
  t.subschema({
    schema: a,
    schemaPath: Me.nil,
    errSchemaPath: `${i.errSchemaPath}/${s}`,
    topSchemaRef: c,
    compositeRule: !0
  }, d), t.pass(d, () => t.error(!0));
}
wt.macroKeywordCode = M$;
function L$(t, e) {
  var r;
  const { gen: s, keyword: n, schema: o, parentSchema: i, $data: a, it: c } = t;
  U$(c, e);
  const d = !a && e.compile ? e.compile.call(c.self, o, i, c) : e.validate, u = tf(s, n, d), f = s.let("valid");
  t.block$data(f, E), t.ok((r = e.valid) !== null && r !== void 0 ? r : f);
  function E() {
    if (e.errors === !1)
      y(), e.modifying && Vl(t), $(() => t.error());
    else {
      const m = e.async ? _() : v();
      e.modifying && Vl(t), $(() => F$(t, m));
    }
  }
  function _() {
    const m = s.let("ruleErrs", null);
    return s.try(() => y((0, Me._)`await `), (w) => s.assign(f, !1).if((0, Me._)`${w} instanceof ${c.ValidationError}`, () => s.assign(m, (0, Me._)`${w}.errors`), () => s.throw(w))), m;
  }
  function v() {
    const m = (0, Me._)`${u}.errors`;
    return s.assign(m, null), y(Me.nil), m;
  }
  function y(m = e.async ? (0, Me._)`await ` : Me.nil) {
    const w = c.opts.passContext ? Er.default.this : Er.default.self, P = !("compile" in e && !a || e.schema === !1);
    s.assign(f, (0, Me._)`${m}${(0, C$.callValidateCode)(t, u, w, P)}`, e.modifying);
  }
  function $(m) {
    var w;
    s.if((0, Me.not)((w = e.valid) !== null && w !== void 0 ? w : f), m);
  }
}
wt.funcKeywordCode = L$;
function Vl(t) {
  const { gen: e, data: r, it: s } = t;
  e.if(s.parentData, () => e.assign(r, (0, Me._)`${s.parentData}[${s.parentDataProperty}]`));
}
function F$(t, e) {
  const { gen: r } = t;
  r.if((0, Me._)`Array.isArray(${e})`, () => {
    r.assign(Er.default.vErrors, (0, Me._)`${Er.default.vErrors} === null ? ${e} : ${Er.default.vErrors}.concat(${e})`).assign(Er.default.errors, (0, Me._)`${Er.default.vErrors}.length`), (0, D$.extendErrors)(t);
  }, () => t.error());
}
function U$({ schemaEnv: t }, e) {
  if (e.async && !t.$async)
    throw new Error("async keyword in sync schema");
}
function tf(t, e, r) {
  if (r === void 0)
    throw new Error(`keyword "${e}" failed to compile`);
  return t.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, Me.stringify)(r) });
}
function V$(t, e, r = !1) {
  return !e.length || e.some((s) => s === "array" ? Array.isArray(t) : s === "object" ? t && typeof t == "object" && !Array.isArray(t) : typeof t == s || r && typeof t > "u");
}
wt.validSchemaType = V$;
function z$({ schema: t, opts: e, self: r, errSchemaPath: s }, n, o) {
  if (Array.isArray(n.keyword) ? !n.keyword.includes(o) : n.keyword !== o)
    throw new Error("ajv implementation error");
  const i = n.dependencies;
  if (i != null && i.some((a) => !Object.prototype.hasOwnProperty.call(t, a)))
    throw new Error(`parent schema must have dependencies of ${o}: ${i.join(",")}`);
  if (n.validateSchema && !n.validateSchema(t[o])) {
    const c = `keyword "${o}" value is invalid at path "${s}": ` + r.errorsText(n.validateSchema.errors);
    if (e.validateSchema === "log")
      r.logger.error(c);
    else
      throw new Error(c);
  }
}
wt.validateKeywordUsage = z$;
var Qt = {};
Object.defineProperty(Qt, "__esModule", { value: !0 });
Qt.extendSubschemaMode = Qt.extendSubschemaData = Qt.getSubschema = void 0;
const _t = ee, rf = j;
function K$(t, { keyword: e, schemaProp: r, schema: s, schemaPath: n, errSchemaPath: o, topSchemaRef: i }) {
  if (e !== void 0 && s !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (e !== void 0) {
    const a = t.schema[e];
    return r === void 0 ? {
      schema: a,
      schemaPath: (0, _t._)`${t.schemaPath}${(0, _t.getProperty)(e)}`,
      errSchemaPath: `${t.errSchemaPath}/${e}`
    } : {
      schema: a[r],
      schemaPath: (0, _t._)`${t.schemaPath}${(0, _t.getProperty)(e)}${(0, _t.getProperty)(r)}`,
      errSchemaPath: `${t.errSchemaPath}/${e}/${(0, rf.escapeFragment)(r)}`
    };
  }
  if (s !== void 0) {
    if (n === void 0 || o === void 0 || i === void 0)
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    return {
      schema: s,
      schemaPath: n,
      topSchemaRef: i,
      errSchemaPath: o
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
Qt.getSubschema = K$;
function x$(t, e, { dataProp: r, dataPropType: s, data: n, dataTypes: o, propertyName: i }) {
  if (n !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: a } = e;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: u, opts: f } = e, E = a.let("data", (0, _t._)`${e.data}${(0, _t.getProperty)(r)}`, !0);
    c(E), t.errorPath = (0, _t.str)`${d}${(0, rf.getErrorPath)(r, s, f.jsPropertySyntax)}`, t.parentDataProperty = (0, _t._)`${r}`, t.dataPathArr = [...u, t.parentDataProperty];
  }
  if (n !== void 0) {
    const d = n instanceof _t.Name ? n : a.let("data", n, !0);
    c(d), i !== void 0 && (t.propertyName = i);
  }
  o && (t.dataTypes = o);
  function c(d) {
    t.data = d, t.dataLevel = e.dataLevel + 1, t.dataTypes = [], e.definedProperties = /* @__PURE__ */ new Set(), t.parentData = e.data, t.dataNames = [...e.dataNames, d];
  }
}
Qt.extendSubschemaData = x$;
function q$(t, { jtdDiscriminator: e, jtdMetadata: r, compositeRule: s, createErrors: n, allErrors: o }) {
  s !== void 0 && (t.compositeRule = s), n !== void 0 && (t.createErrors = n), o !== void 0 && (t.allErrors = o), t.jtdDiscriminator = e, t.jtdMetadata = r;
}
Qt.extendSubschemaMode = q$;
var Te = {}, go = function t(e, r) {
  if (e === r) return !0;
  if (e && r && typeof e == "object" && typeof r == "object") {
    if (e.constructor !== r.constructor) return !1;
    var s, n, o;
    if (Array.isArray(e)) {
      if (s = e.length, s != r.length) return !1;
      for (n = s; n-- !== 0; )
        if (!t(e[n], r[n])) return !1;
      return !0;
    }
    if (e.constructor === RegExp) return e.source === r.source && e.flags === r.flags;
    if (e.valueOf !== Object.prototype.valueOf) return e.valueOf() === r.valueOf();
    if (e.toString !== Object.prototype.toString) return e.toString() === r.toString();
    if (o = Object.keys(e), s = o.length, s !== Object.keys(r).length) return !1;
    for (n = s; n-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(r, o[n])) return !1;
    for (n = s; n-- !== 0; ) {
      var i = o[n];
      if (!t(e[i], r[i])) return !1;
    }
    return !0;
  }
  return e !== e && r !== r;
}, sf = { exports: {} }, Yt = sf.exports = function(t, e, r) {
  typeof e == "function" && (r = e, e = {}), r = e.cb || r;
  var s = typeof r == "function" ? r : r.pre || function() {
  }, n = r.post || function() {
  };
  Un(e, s, n, t, "", t);
};
Yt.keywords = {
  additionalItems: !0,
  items: !0,
  contains: !0,
  additionalProperties: !0,
  propertyNames: !0,
  not: !0,
  if: !0,
  then: !0,
  else: !0
};
Yt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Yt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Yt.skipKeywords = {
  default: !0,
  enum: !0,
  const: !0,
  required: !0,
  maximum: !0,
  minimum: !0,
  exclusiveMaximum: !0,
  exclusiveMinimum: !0,
  multipleOf: !0,
  maxLength: !0,
  minLength: !0,
  pattern: !0,
  format: !0,
  maxItems: !0,
  minItems: !0,
  uniqueItems: !0,
  maxProperties: !0,
  minProperties: !0
};
function Un(t, e, r, s, n, o, i, a, c, d) {
  if (s && typeof s == "object" && !Array.isArray(s)) {
    e(s, n, o, i, a, c, d);
    for (var u in s) {
      var f = s[u];
      if (Array.isArray(f)) {
        if (u in Yt.arrayKeywords)
          for (var E = 0; E < f.length; E++)
            Un(t, e, r, f[E], n + "/" + u + "/" + E, o, n, u, s, E);
      } else if (u in Yt.propsKeywords) {
        if (f && typeof f == "object")
          for (var _ in f)
            Un(t, e, r, f[_], n + "/" + u + "/" + B$(_), o, n, u, s, _);
      } else (u in Yt.keywords || t.allKeys && !(u in Yt.skipKeywords)) && Un(t, e, r, f, n + "/" + u, o, n, u, s);
    }
    r(s, n, o, i, a, c, d);
  }
}
function B$(t) {
  return t.replace(/~/g, "~0").replace(/\//g, "~1");
}
var G$ = sf.exports;
Object.defineProperty(Te, "__esModule", { value: !0 });
Te.getSchemaRefs = Te.resolveUrl = Te.normalizeId = Te._getFullPath = Te.getFullPath = Te.inlineRef = void 0;
const H$ = j, W$ = go, J$ = G$, X$ = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function Y$(t, e = !0) {
  return typeof t == "boolean" ? !0 : e === !0 ? !Ai(t) : e ? nf(t) <= e : !1;
}
Te.inlineRef = Y$;
const Z$ = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function Ai(t) {
  for (const e in t) {
    if (Z$.has(e))
      return !0;
    const r = t[e];
    if (Array.isArray(r) && r.some(Ai) || typeof r == "object" && Ai(r))
      return !0;
  }
  return !1;
}
function nf(t) {
  let e = 0;
  for (const r in t) {
    if (r === "$ref")
      return 1 / 0;
    if (e++, !X$.has(r) && (typeof t[r] == "object" && (0, H$.eachItem)(t[r], (s) => e += nf(s)), e === 1 / 0))
      return 1 / 0;
  }
  return e;
}
function of(t, e = "", r) {
  r !== !1 && (e = Qr(e));
  const s = t.parse(e);
  return af(t, s);
}
Te.getFullPath = of;
function af(t, e) {
  return t.serialize(e).split("#")[0] + "#";
}
Te._getFullPath = af;
const Q$ = /#\/?$/;
function Qr(t) {
  return t ? t.replace(Q$, "") : "";
}
Te.normalizeId = Qr;
function eg(t, e, r) {
  return r = Qr(r), t.resolve(e, r);
}
Te.resolveUrl = eg;
const tg = /^[a-z_][-a-z0-9._]*$/i;
function rg(t, e) {
  if (typeof t == "boolean")
    return {};
  const { schemaId: r, uriResolver: s } = this.opts, n = Qr(t[r] || e), o = { "": n }, i = of(s, n, !1), a = {}, c = /* @__PURE__ */ new Set();
  return J$(t, { allKeys: !0 }, (f, E, _, v) => {
    if (v === void 0)
      return;
    const y = i + E;
    let $ = o[v];
    typeof f[r] == "string" && ($ = m.call(this, f[r])), w.call(this, f.$anchor), w.call(this, f.$dynamicAnchor), o[E] = $;
    function m(P) {
      const T = this.opts.uriResolver.resolve;
      if (P = Qr($ ? T($, P) : P), c.has(P))
        throw u(P);
      c.add(P);
      let N = this.refs[P];
      return typeof N == "string" && (N = this.refs[N]), typeof N == "object" ? d(f, N.schema, P) : P !== Qr(y) && (P[0] === "#" ? (d(f, a[P], P), a[P] = f) : this.refs[P] = y), P;
    }
    function w(P) {
      if (typeof P == "string") {
        if (!tg.test(P))
          throw new Error(`invalid anchor "${P}"`);
        m.call(this, `#${P}`);
      }
    }
  }), a;
  function d(f, E, _) {
    if (E !== void 0 && !W$(f, E))
      throw u(_);
  }
  function u(f) {
    return new Error(`reference "${f}" resolves to more than one schema`);
  }
}
Te.getSchemaRefs = rg;
Object.defineProperty(dt, "__esModule", { value: !0 });
dt.getData = dt.KeywordCxt = dt.validateFunctionCode = void 0;
const cf = ss, zl = ve, la = Ot, eo = ve, sg = $o, Ds = wt, Qo = Qt, x = ee, W = Xe, ng = Te, Rt = j, bs = en;
function og(t) {
  if (df(t) && (ff(t), uf(t))) {
    cg(t);
    return;
  }
  lf(t, () => (0, cf.topBoolOrEmptySchema)(t));
}
dt.validateFunctionCode = og;
function lf({ gen: t, validateName: e, schema: r, schemaEnv: s, opts: n }, o) {
  n.code.es5 ? t.func(e, (0, x._)`${W.default.data}, ${W.default.valCxt}`, s.$async, () => {
    t.code((0, x._)`"use strict"; ${Kl(r, n)}`), ag(t, n), t.code(o);
  }) : t.func(e, (0, x._)`${W.default.data}, ${ig(n)}`, s.$async, () => t.code(Kl(r, n)).code(o));
}
function ig(t) {
  return (0, x._)`{${W.default.instancePath}="", ${W.default.parentData}, ${W.default.parentDataProperty}, ${W.default.rootData}=${W.default.data}${t.dynamicRef ? (0, x._)`, ${W.default.dynamicAnchors}={}` : x.nil}}={}`;
}
function ag(t, e) {
  t.if(W.default.valCxt, () => {
    t.var(W.default.instancePath, (0, x._)`${W.default.valCxt}.${W.default.instancePath}`), t.var(W.default.parentData, (0, x._)`${W.default.valCxt}.${W.default.parentData}`), t.var(W.default.parentDataProperty, (0, x._)`${W.default.valCxt}.${W.default.parentDataProperty}`), t.var(W.default.rootData, (0, x._)`${W.default.valCxt}.${W.default.rootData}`), e.dynamicRef && t.var(W.default.dynamicAnchors, (0, x._)`${W.default.valCxt}.${W.default.dynamicAnchors}`);
  }, () => {
    t.var(W.default.instancePath, (0, x._)`""`), t.var(W.default.parentData, (0, x._)`undefined`), t.var(W.default.parentDataProperty, (0, x._)`undefined`), t.var(W.default.rootData, W.default.data), e.dynamicRef && t.var(W.default.dynamicAnchors, (0, x._)`{}`);
  });
}
function cg(t) {
  const { schema: e, opts: r, gen: s } = t;
  lf(t, () => {
    r.$comment && e.$comment && mf(t), hg(t), s.let(W.default.vErrors, null), s.let(W.default.errors, 0), r.unevaluated && lg(t), hf(t), yg(t);
  });
}
function lg(t) {
  const { gen: e, validateName: r } = t;
  t.evaluated = e.const("evaluated", (0, x._)`${r}.evaluated`), e.if((0, x._)`${t.evaluated}.dynamicProps`, () => e.assign((0, x._)`${t.evaluated}.props`, (0, x._)`undefined`)), e.if((0, x._)`${t.evaluated}.dynamicItems`, () => e.assign((0, x._)`${t.evaluated}.items`, (0, x._)`undefined`));
}
function Kl(t, e) {
  const r = typeof t == "object" && t[e.schemaId];
  return r && (e.code.source || e.code.process) ? (0, x._)`/*# sourceURL=${r} */` : x.nil;
}
function ug(t, e) {
  if (df(t) && (ff(t), uf(t))) {
    dg(t, e);
    return;
  }
  (0, cf.boolOrEmptySchema)(t, e);
}
function uf({ schema: t, self: e }) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (e.RULES.all[r])
      return !0;
  return !1;
}
function df(t) {
  return typeof t.schema != "boolean";
}
function dg(t, e) {
  const { schema: r, gen: s, opts: n } = t;
  n.$comment && r.$comment && mf(t), mg(t), pg(t);
  const o = s.const("_errs", W.default.errors);
  hf(t, o), s.var(e, (0, x._)`${o} === ${W.default.errors}`);
}
function ff(t) {
  (0, Rt.checkUnknownRules)(t), fg(t);
}
function hf(t, e) {
  if (t.opts.jtd)
    return xl(t, [], !1, e);
  const r = (0, zl.getSchemaTypes)(t.schema), s = (0, zl.coerceAndCheckDataType)(t, r);
  xl(t, r, !s, e);
}
function fg(t) {
  const { schema: e, errSchemaPath: r, opts: s, self: n } = t;
  e.$ref && s.ignoreKeywordsWithRef && (0, Rt.schemaHasRulesButRef)(e, n.RULES) && n.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function hg(t) {
  const { schema: e, opts: r } = t;
  e.default !== void 0 && r.useDefaults && r.strictSchema && (0, Rt.checkStrictMode)(t, "default is ignored in the schema root");
}
function mg(t) {
  const e = t.schema[t.opts.schemaId];
  e && (t.baseId = (0, ng.resolveUrl)(t.opts.uriResolver, t.baseId, e));
}
function pg(t) {
  if (t.schema.$async && !t.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function mf({ gen: t, schemaEnv: e, schema: r, errSchemaPath: s, opts: n }) {
  const o = r.$comment;
  if (n.$comment === !0)
    t.code((0, x._)`${W.default.self}.logger.log(${o})`);
  else if (typeof n.$comment == "function") {
    const i = (0, x.str)`${s}/$comment`, a = t.scopeValue("root", { ref: e.root });
    t.code((0, x._)`${W.default.self}.opts.$comment(${o}, ${i}, ${a}.schema)`);
  }
}
function yg(t) {
  const { gen: e, schemaEnv: r, validateName: s, ValidationError: n, opts: o } = t;
  r.$async ? e.if((0, x._)`${W.default.errors} === 0`, () => e.return(W.default.data), () => e.throw((0, x._)`new ${n}(${W.default.vErrors})`)) : (e.assign((0, x._)`${s}.errors`, W.default.vErrors), o.unevaluated && $g(t), e.return((0, x._)`${W.default.errors} === 0`));
}
function $g({ gen: t, evaluated: e, props: r, items: s }) {
  r instanceof x.Name && t.assign((0, x._)`${e}.props`, r), s instanceof x.Name && t.assign((0, x._)`${e}.items`, s);
}
function xl(t, e, r, s) {
  const { gen: n, schema: o, data: i, allErrors: a, opts: c, self: d } = t, { RULES: u } = d;
  if (o.$ref && (c.ignoreKeywordsWithRef || !(0, Rt.schemaHasRulesButRef)(o, u))) {
    n.block(() => $f(t, "$ref", u.all.$ref.definition));
    return;
  }
  c.jtd || gg(t, e), n.block(() => {
    for (const E of u.rules)
      f(E);
    f(u.post);
  });
  function f(E) {
    (0, la.shouldUseGroup)(o, E) && (E.type ? (n.if((0, eo.checkDataType)(E.type, i, c.strictNumbers)), ql(t, E), e.length === 1 && e[0] === E.type && r && (n.else(), (0, eo.reportTypeError)(t)), n.endIf()) : ql(t, E), a || n.if((0, x._)`${W.default.errors} === ${s || 0}`));
  }
}
function ql(t, e) {
  const { gen: r, schema: s, opts: { useDefaults: n } } = t;
  n && (0, sg.assignDefaults)(t, e.type), r.block(() => {
    for (const o of e.rules)
      (0, la.shouldUseRule)(s, o) && $f(t, o.keyword, o.definition, e.type);
  });
}
function gg(t, e) {
  t.schemaEnv.meta || !t.opts.strictTypes || (_g(t, e), t.opts.allowUnionTypes || vg(t, e), wg(t, t.dataTypes));
}
function _g(t, e) {
  if (e.length) {
    if (!t.dataTypes.length) {
      t.dataTypes = e;
      return;
    }
    e.forEach((r) => {
      pf(t.dataTypes, r) || ua(t, `type "${r}" not allowed by context "${t.dataTypes.join(",")}"`);
    }), Sg(t, e);
  }
}
function vg(t, e) {
  e.length > 1 && !(e.length === 2 && e.includes("null")) && ua(t, "use allowUnionTypes to allow union type keyword");
}
function wg(t, e) {
  const r = t.self.RULES.all;
  for (const s in r) {
    const n = r[s];
    if (typeof n == "object" && (0, la.shouldUseRule)(t.schema, n)) {
      const { type: o } = n.definition;
      o.length && !o.some((i) => Eg(e, i)) && ua(t, `missing type "${o.join(",")}" for keyword "${s}"`);
    }
  }
}
function Eg(t, e) {
  return t.includes(e) || e === "number" && t.includes("integer");
}
function pf(t, e) {
  return t.includes(e) || e === "integer" && t.includes("number");
}
function Sg(t, e) {
  const r = [];
  for (const s of t.dataTypes)
    pf(e, s) ? r.push(s) : e.includes("integer") && s === "number" && r.push("integer");
  t.dataTypes = r;
}
function ua(t, e) {
  const r = t.schemaEnv.baseId + t.errSchemaPath;
  e += ` at "${r}" (strictTypes)`, (0, Rt.checkStrictMode)(t, e, t.opts.strictTypes);
}
let yf = class {
  constructor(e, r, s) {
    if ((0, Ds.validateKeywordUsage)(e, r, s), this.gen = e.gen, this.allErrors = e.allErrors, this.keyword = s, this.data = e.data, this.schema = e.schema[s], this.$data = r.$data && e.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, Rt.schemaRefOrVal)(e, this.schema, s, this.$data), this.schemaType = r.schemaType, this.parentSchema = e.schema, this.params = {}, this.it = e, this.def = r, this.$data)
      this.schemaCode = e.gen.const("vSchema", gf(this.$data, e));
    else if (this.schemaCode = this.schemaValue, !(0, Ds.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${s} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = e.gen.const("_errs", W.default.errors));
  }
  result(e, r, s) {
    this.failResult((0, x.not)(e), r, s);
  }
  failResult(e, r, s) {
    this.gen.if(e), s ? s() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(e, r) {
    this.failResult((0, x.not)(e), void 0, r);
  }
  fail(e) {
    if (e === void 0) {
      this.error(), this.allErrors || this.gen.if(!1);
      return;
    }
    this.gen.if(e), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  fail$data(e) {
    if (!this.$data)
      return this.fail(e);
    const { schemaCode: r } = this;
    this.fail((0, x._)`${r} !== undefined && (${(0, x.or)(this.invalid$data(), e)})`);
  }
  error(e, r, s) {
    if (r) {
      this.setParams(r), this._error(e, s), this.setParams({});
      return;
    }
    this._error(e, s);
  }
  _error(e, r) {
    (e ? bs.reportExtraError : bs.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, bs.reportError)(this, this.def.$dataError || bs.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, bs.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(e) {
    this.allErrors || this.gen.if(e);
  }
  setParams(e, r) {
    r ? Object.assign(this.params, e) : this.params = e;
  }
  block$data(e, r, s = x.nil) {
    this.gen.block(() => {
      this.check$data(e, s), r();
    });
  }
  check$data(e = x.nil, r = x.nil) {
    if (!this.$data)
      return;
    const { gen: s, schemaCode: n, schemaType: o, def: i } = this;
    s.if((0, x.or)((0, x._)`${n} === undefined`, r)), e !== x.nil && s.assign(e, !0), (o.length || i.validateSchema) && (s.elseIf(this.invalid$data()), this.$dataError(), e !== x.nil && s.assign(e, !1)), s.else();
  }
  invalid$data() {
    const { gen: e, schemaCode: r, schemaType: s, def: n, it: o } = this;
    return (0, x.or)(i(), a());
    function i() {
      if (s.length) {
        if (!(r instanceof x.Name))
          throw new Error("ajv implementation error");
        const c = Array.isArray(s) ? s : [s];
        return (0, x._)`${(0, eo.checkDataTypes)(c, r, o.opts.strictNumbers, eo.DataType.Wrong)}`;
      }
      return x.nil;
    }
    function a() {
      if (n.validateSchema) {
        const c = e.scopeValue("validate$data", { ref: n.validateSchema });
        return (0, x._)`!${c}(${r})`;
      }
      return x.nil;
    }
  }
  subschema(e, r) {
    const s = (0, Qo.getSubschema)(this.it, e);
    (0, Qo.extendSubschemaData)(s, this.it, e), (0, Qo.extendSubschemaMode)(s, e);
    const n = { ...this.it, ...s, items: void 0, props: void 0 };
    return ug(n, r), n;
  }
  mergeEvaluated(e, r) {
    const { it: s, gen: n } = this;
    s.opts.unevaluated && (s.props !== !0 && e.props !== void 0 && (s.props = Rt.mergeEvaluated.props(n, e.props, s.props, r)), s.items !== !0 && e.items !== void 0 && (s.items = Rt.mergeEvaluated.items(n, e.items, s.items, r)));
  }
  mergeValidEvaluated(e, r) {
    const { it: s, gen: n } = this;
    if (s.opts.unevaluated && (s.props !== !0 || s.items !== !0))
      return n.if(r, () => this.mergeEvaluated(e, x.Name)), !0;
  }
};
dt.KeywordCxt = yf;
function $f(t, e, r, s) {
  const n = new yf(t, r, e);
  "code" in r ? r.code(n, s) : n.$data && r.validate ? (0, Ds.funcKeywordCode)(n, r) : "macro" in r ? (0, Ds.macroKeywordCode)(n, r) : (r.compile || r.validate) && (0, Ds.funcKeywordCode)(n, r);
}
const bg = /^\/(?:[^~]|~0|~1)*$/, Pg = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function gf(t, { dataLevel: e, dataNames: r, dataPathArr: s }) {
  let n, o;
  if (t === "")
    return W.default.rootData;
  if (t[0] === "/") {
    if (!bg.test(t))
      throw new Error(`Invalid JSON-pointer: ${t}`);
    n = t, o = W.default.rootData;
  } else {
    const d = Pg.exec(t);
    if (!d)
      throw new Error(`Invalid JSON-pointer: ${t}`);
    const u = +d[1];
    if (n = d[2], n === "#") {
      if (u >= e)
        throw new Error(c("property/index", u));
      return s[e - u];
    }
    if (u > e)
      throw new Error(c("data", u));
    if (o = r[e - u], !n)
      return o;
  }
  let i = o;
  const a = n.split("/");
  for (const d of a)
    d && (o = (0, x._)`${o}${(0, x.getProperty)((0, Rt.unescapeJsonPointer)(d))}`, i = (0, x._)`${i} && ${o}`);
  return i;
  function c(d, u) {
    return `Cannot access ${d} ${u} levels up, current level is ${e}`;
  }
}
dt.getData = gf;
var tn = {};
Object.defineProperty(tn, "__esModule", { value: !0 });
class kg extends Error {
  constructor(e) {
    super("validation failed"), this.errors = e, this.ajv = this.validation = !0;
  }
}
tn.default = kg;
var us = {};
Object.defineProperty(us, "__esModule", { value: !0 });
const ei = Te;
class Tg extends Error {
  constructor(e, r, s, n) {
    super(n || `can't resolve reference ${s} from id ${r}`), this.missingRef = (0, ei.resolveUrl)(e, r, s), this.missingSchema = (0, ei.normalizeId)((0, ei.getFullPath)(e, this.missingRef));
  }
}
us.default = Tg;
var Fe = {};
Object.defineProperty(Fe, "__esModule", { value: !0 });
Fe.resolveSchema = Fe.getCompilingSchema = Fe.resolveRef = Fe.compileSchema = Fe.SchemaEnv = void 0;
const nt = ee, Ng = tn, _r = Xe, lt = Te, Bl = j, Og = dt;
let _o = class {
  constructor(e) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let s;
    typeof e.schema == "object" && (s = e.schema), this.schema = e.schema, this.schemaId = e.schemaId, this.root = e.root || this, this.baseId = (r = e.baseId) !== null && r !== void 0 ? r : (0, lt.normalizeId)(s == null ? void 0 : s[e.schemaId || "$id"]), this.schemaPath = e.schemaPath, this.localRefs = e.localRefs, this.meta = e.meta, this.$async = s == null ? void 0 : s.$async, this.refs = {};
  }
};
Fe.SchemaEnv = _o;
function da(t) {
  const e = _f.call(this, t);
  if (e)
    return e;
  const r = (0, lt.getFullPath)(this.opts.uriResolver, t.root.baseId), { es5: s, lines: n } = this.opts.code, { ownProperties: o } = this.opts, i = new nt.CodeGen(this.scope, { es5: s, lines: n, ownProperties: o });
  let a;
  t.$async && (a = i.scopeValue("Error", {
    ref: Ng.default,
    code: (0, nt._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = i.scopeName("validate");
  t.validateName = c;
  const d = {
    gen: i,
    allErrors: this.opts.allErrors,
    data: _r.default.data,
    parentData: _r.default.parentData,
    parentDataProperty: _r.default.parentDataProperty,
    dataNames: [_r.default.data],
    dataPathArr: [nt.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: i.scopeValue("schema", this.opts.code.source === !0 ? { ref: t.schema, code: (0, nt.stringify)(t.schema) } : { ref: t.schema }),
    validateName: c,
    ValidationError: a,
    schema: t.schema,
    schemaEnv: t,
    rootId: r,
    baseId: t.baseId || r,
    schemaPath: nt.nil,
    errSchemaPath: t.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, nt._)`""`,
    opts: this.opts,
    self: this
  };
  let u;
  try {
    this._compilations.add(t), (0, Og.validateFunctionCode)(d), i.optimize(this.opts.code.optimize);
    const f = i.toString();
    u = `${i.scopeRefs(_r.default.scope)}return ${f}`, this.opts.code.process && (u = this.opts.code.process(u, t));
    const _ = new Function(`${_r.default.self}`, `${_r.default.scope}`, u)(this, this.scope.get());
    if (this.scope.value(c, { ref: _ }), _.errors = null, _.schema = t.schema, _.schemaEnv = t, t.$async && (_.$async = !0), this.opts.code.source === !0 && (_.source = { validateName: c, validateCode: f, scopeValues: i._values }), this.opts.unevaluated) {
      const { props: v, items: y } = d;
      _.evaluated = {
        props: v instanceof nt.Name ? void 0 : v,
        items: y instanceof nt.Name ? void 0 : y,
        dynamicProps: v instanceof nt.Name,
        dynamicItems: y instanceof nt.Name
      }, _.source && (_.source.evaluated = (0, nt.stringify)(_.evaluated));
    }
    return t.validate = _, t;
  } catch (f) {
    throw delete t.validate, delete t.validateName, u && this.logger.error("Error compiling schema, function code:", u), f;
  } finally {
    this._compilations.delete(t);
  }
}
Fe.compileSchema = da;
function Rg(t, e, r) {
  var s;
  r = (0, lt.resolveUrl)(this.opts.uriResolver, e, r);
  const n = t.refs[r];
  if (n)
    return n;
  let o = jg.call(this, t, r);
  if (o === void 0) {
    const i = (s = t.localRefs) === null || s === void 0 ? void 0 : s[r], { schemaId: a } = this.opts;
    i && (o = new _o({ schema: i, schemaId: a, root: t, baseId: e }));
  }
  if (o !== void 0)
    return t.refs[r] = Ig.call(this, o);
}
Fe.resolveRef = Rg;
function Ig(t) {
  return (0, lt.inlineRef)(t.schema, this.opts.inlineRefs) ? t.schema : t.validate ? t : da.call(this, t);
}
function _f(t) {
  for (const e of this._compilations)
    if (Ag(e, t))
      return e;
}
Fe.getCompilingSchema = _f;
function Ag(t, e) {
  return t.schema === e.schema && t.root === e.root && t.baseId === e.baseId;
}
function jg(t, e) {
  let r;
  for (; typeof (r = this.refs[e]) == "string"; )
    e = r;
  return r || this.schemas[e] || vo.call(this, t, e);
}
function vo(t, e) {
  const r = this.opts.uriResolver.parse(e), s = (0, lt._getFullPath)(this.opts.uriResolver, r);
  let n = (0, lt.getFullPath)(this.opts.uriResolver, t.baseId, void 0);
  if (Object.keys(t.schema).length > 0 && s === n)
    return ti.call(this, r, t);
  const o = (0, lt.normalizeId)(s), i = this.refs[o] || this.schemas[o];
  if (typeof i == "string") {
    const a = vo.call(this, t, i);
    return typeof (a == null ? void 0 : a.schema) != "object" ? void 0 : ti.call(this, r, a);
  }
  if (typeof (i == null ? void 0 : i.schema) == "object") {
    if (i.validate || da.call(this, i), o === (0, lt.normalizeId)(e)) {
      const { schema: a } = i, { schemaId: c } = this.opts, d = a[c];
      return d && (n = (0, lt.resolveUrl)(this.opts.uriResolver, n, d)), new _o({ schema: a, schemaId: c, root: t, baseId: n });
    }
    return ti.call(this, r, i);
  }
}
Fe.resolveSchema = vo;
const Cg = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function ti(t, { baseId: e, schema: r, root: s }) {
  var n;
  if (((n = t.fragment) === null || n === void 0 ? void 0 : n[0]) !== "/")
    return;
  for (const a of t.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, Bl.unescapeFragment)(a)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !Cg.has(a) && d && (e = (0, lt.resolveUrl)(this.opts.uriResolver, e, d));
  }
  let o;
  if (typeof r != "boolean" && r.$ref && !(0, Bl.schemaHasRulesButRef)(r, this.RULES)) {
    const a = (0, lt.resolveUrl)(this.opts.uriResolver, e, r.$ref);
    o = vo.call(this, s, a);
  }
  const { schemaId: i } = this.opts;
  if (o = o || new _o({ schema: r, schemaId: i, root: s, baseId: e }), o.schema !== o.root.schema)
    return o;
}
const Dg = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", Mg = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Lg = "object", Fg = [
  "$data"
], Ug = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
}, Vg = !1, zg = {
  $id: Dg,
  description: Mg,
  type: Lg,
  required: Fg,
  properties: Ug,
  additionalProperties: Vg
};
var fa = {}, wo = { exports: {} };
const Kg = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu), vf = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
function wf(t) {
  let e = "", r = 0, s = 0;
  for (s = 0; s < t.length; s++)
    if (r = t[s].charCodeAt(0), r !== 48) {
      if (!(r >= 48 && r <= 57 || r >= 65 && r <= 70 || r >= 97 && r <= 102))
        return "";
      e += t[s];
      break;
    }
  for (s += 1; s < t.length; s++) {
    if (r = t[s].charCodeAt(0), !(r >= 48 && r <= 57 || r >= 65 && r <= 70 || r >= 97 && r <= 102))
      return "";
    e += t[s];
  }
  return e;
}
const xg = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
function Gl(t) {
  return t.length = 0, !0;
}
function qg(t, e, r) {
  if (t.length) {
    const s = wf(t);
    if (s !== "")
      e.push(s);
    else
      return r.error = !0, !1;
    t.length = 0;
  }
  return !0;
}
function Bg(t) {
  let e = 0;
  const r = { error: !1, address: "", zone: "" }, s = [], n = [];
  let o = !1, i = !1, a = qg;
  for (let c = 0; c < t.length; c++) {
    const d = t[c];
    if (!(d === "[" || d === "]"))
      if (d === ":") {
        if (o === !0 && (i = !0), !a(n, s, r))
          break;
        if (++e > 7) {
          r.error = !0;
          break;
        }
        c > 0 && t[c - 1] === ":" && (o = !0), s.push(":");
        continue;
      } else if (d === "%") {
        if (!a(n, s, r))
          break;
        a = Gl;
      } else {
        n.push(d);
        continue;
      }
  }
  return n.length && (a === Gl ? r.zone = n.join("") : i ? s.push(n.join("")) : s.push(wf(n))), r.address = s.join(""), r;
}
function Ef(t) {
  if (Gg(t, ":") < 2)
    return { host: t, isIPV6: !1 };
  const e = Bg(t);
  if (e.error)
    return { host: t, isIPV6: !1 };
  {
    let r = e.address, s = e.address;
    return e.zone && (r += "%" + e.zone, s += "%25" + e.zone), { host: r, isIPV6: !0, escapedHost: s };
  }
}
function Gg(t, e) {
  let r = 0;
  for (let s = 0; s < t.length; s++)
    t[s] === e && r++;
  return r;
}
function Hg(t) {
  let e = t;
  const r = [];
  let s = -1, n = 0;
  for (; n = e.length; ) {
    if (n === 1) {
      if (e === ".")
        break;
      if (e === "/") {
        r.push("/");
        break;
      } else {
        r.push(e);
        break;
      }
    } else if (n === 2) {
      if (e[0] === ".") {
        if (e[1] === ".")
          break;
        if (e[1] === "/") {
          e = e.slice(2);
          continue;
        }
      } else if (e[0] === "/" && (e[1] === "." || e[1] === "/")) {
        r.push("/");
        break;
      }
    } else if (n === 3 && e === "/..") {
      r.length !== 0 && r.pop(), r.push("/");
      break;
    }
    if (e[0] === ".") {
      if (e[1] === ".") {
        if (e[2] === "/") {
          e = e.slice(3);
          continue;
        }
      } else if (e[1] === "/") {
        e = e.slice(2);
        continue;
      }
    } else if (e[0] === "/" && e[1] === ".") {
      if (e[2] === "/") {
        e = e.slice(2);
        continue;
      } else if (e[2] === "." && e[3] === "/") {
        e = e.slice(3), r.length !== 0 && r.pop();
        continue;
      }
    }
    if ((s = e.indexOf("/", 1)) === -1) {
      r.push(e);
      break;
    } else
      r.push(e.slice(0, s)), e = e.slice(s);
  }
  return r.join("");
}
function Wg(t, e) {
  const r = e !== !0 ? escape : unescape;
  return t.scheme !== void 0 && (t.scheme = r(t.scheme)), t.userinfo !== void 0 && (t.userinfo = r(t.userinfo)), t.host !== void 0 && (t.host = r(t.host)), t.path !== void 0 && (t.path = r(t.path)), t.query !== void 0 && (t.query = r(t.query)), t.fragment !== void 0 && (t.fragment = r(t.fragment)), t;
}
function Jg(t) {
  const e = [];
  if (t.userinfo !== void 0 && (e.push(t.userinfo), e.push("@")), t.host !== void 0) {
    let r = unescape(t.host);
    if (!vf(r)) {
      const s = Ef(r);
      s.isIPV6 === !0 ? r = `[${s.escapedHost}]` : r = t.host;
    }
    e.push(r);
  }
  return (typeof t.port == "number" || typeof t.port == "string") && (e.push(":"), e.push(String(t.port))), e.length ? e.join("") : void 0;
}
var Sf = {
  nonSimpleDomain: xg,
  recomposeAuthority: Jg,
  normalizeComponentEncoding: Wg,
  removeDotSegments: Hg,
  isIPv4: vf,
  isUUID: Kg,
  normalizeIPv6: Ef
};
const { isUUID: Xg } = Sf, Yg = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function bf(t) {
  return t.secure === !0 ? !0 : t.secure === !1 ? !1 : t.scheme ? t.scheme.length === 3 && (t.scheme[0] === "w" || t.scheme[0] === "W") && (t.scheme[1] === "s" || t.scheme[1] === "S") && (t.scheme[2] === "s" || t.scheme[2] === "S") : !1;
}
function Pf(t) {
  return t.host || (t.error = t.error || "HTTP URIs must have a host."), t;
}
function kf(t) {
  const e = String(t.scheme).toLowerCase() === "https";
  return (t.port === (e ? 443 : 80) || t.port === "") && (t.port = void 0), t.path || (t.path = "/"), t;
}
function Zg(t) {
  return t.secure = bf(t), t.resourceName = (t.path || "/") + (t.query ? "?" + t.query : ""), t.path = void 0, t.query = void 0, t;
}
function Qg(t) {
  if ((t.port === (bf(t) ? 443 : 80) || t.port === "") && (t.port = void 0), typeof t.secure == "boolean" && (t.scheme = t.secure ? "wss" : "ws", t.secure = void 0), t.resourceName) {
    const [e, r] = t.resourceName.split("?");
    t.path = e && e !== "/" ? e : void 0, t.query = r, t.resourceName = void 0;
  }
  return t.fragment = void 0, t;
}
function e_(t, e) {
  if (!t.path)
    return t.error = "URN can not be parsed", t;
  const r = t.path.match(Yg);
  if (r) {
    const s = e.scheme || t.scheme || "urn";
    t.nid = r[1].toLowerCase(), t.nss = r[2];
    const n = `${s}:${e.nid || t.nid}`, o = ha(n);
    t.path = void 0, o && (t = o.parse(t, e));
  } else
    t.error = t.error || "URN can not be parsed.";
  return t;
}
function t_(t, e) {
  if (t.nid === void 0)
    throw new Error("URN without nid cannot be serialized");
  const r = e.scheme || t.scheme || "urn", s = t.nid.toLowerCase(), n = `${r}:${e.nid || s}`, o = ha(n);
  o && (t = o.serialize(t, e));
  const i = t, a = t.nss;
  return i.path = `${s || e.nid}:${a}`, e.skipEscape = !0, i;
}
function r_(t, e) {
  const r = t;
  return r.uuid = r.nss, r.nss = void 0, !e.tolerant && (!r.uuid || !Xg(r.uuid)) && (r.error = r.error || "UUID is not valid."), r;
}
function s_(t) {
  const e = t;
  return e.nss = (t.uuid || "").toLowerCase(), e;
}
const Tf = (
  /** @type {SchemeHandler} */
  {
    scheme: "http",
    domainHost: !0,
    parse: Pf,
    serialize: kf
  }
), n_ = (
  /** @type {SchemeHandler} */
  {
    scheme: "https",
    domainHost: Tf.domainHost,
    parse: Pf,
    serialize: kf
  }
), Vn = (
  /** @type {SchemeHandler} */
  {
    scheme: "ws",
    domainHost: !0,
    parse: Zg,
    serialize: Qg
  }
), o_ = (
  /** @type {SchemeHandler} */
  {
    scheme: "wss",
    domainHost: Vn.domainHost,
    parse: Vn.parse,
    serialize: Vn.serialize
  }
), i_ = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn",
    parse: e_,
    serialize: t_,
    skipNormalize: !0
  }
), a_ = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn:uuid",
    parse: r_,
    serialize: s_,
    skipNormalize: !0
  }
), to = (
  /** @type {Record<SchemeName, SchemeHandler>} */
  {
    http: Tf,
    https: n_,
    ws: Vn,
    wss: o_,
    urn: i_,
    "urn:uuid": a_
  }
);
Object.setPrototypeOf(to, null);
function ha(t) {
  return t && (to[
    /** @type {SchemeName} */
    t
  ] || to[
    /** @type {SchemeName} */
    t.toLowerCase()
  ]) || void 0;
}
var c_ = {
  SCHEMES: to,
  getSchemeHandler: ha
};
const { normalizeIPv6: l_, removeDotSegments: Is, recomposeAuthority: u_, normalizeComponentEncoding: pn, isIPv4: d_, nonSimpleDomain: f_ } = Sf, { SCHEMES: h_, getSchemeHandler: Nf } = c_;
function m_(t, e) {
  return typeof t == "string" ? t = /** @type {T} */
  Et(jt(t, e), e) : typeof t == "object" && (t = /** @type {T} */
  jt(Et(t, e), e)), t;
}
function p_(t, e, r) {
  const s = r ? Object.assign({ scheme: "null" }, r) : { scheme: "null" }, n = Of(jt(t, s), jt(e, s), s, !0);
  return s.skipEscape = !0, Et(n, s);
}
function Of(t, e, r, s) {
  const n = {};
  return s || (t = jt(Et(t, r), r), e = jt(Et(e, r), r)), r = r || {}, !r.tolerant && e.scheme ? (n.scheme = e.scheme, n.userinfo = e.userinfo, n.host = e.host, n.port = e.port, n.path = Is(e.path || ""), n.query = e.query) : (e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0 ? (n.userinfo = e.userinfo, n.host = e.host, n.port = e.port, n.path = Is(e.path || ""), n.query = e.query) : (e.path ? (e.path[0] === "/" ? n.path = Is(e.path) : ((t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0) && !t.path ? n.path = "/" + e.path : t.path ? n.path = t.path.slice(0, t.path.lastIndexOf("/") + 1) + e.path : n.path = e.path, n.path = Is(n.path)), n.query = e.query) : (n.path = t.path, e.query !== void 0 ? n.query = e.query : n.query = t.query), n.userinfo = t.userinfo, n.host = t.host, n.port = t.port), n.scheme = t.scheme), n.fragment = e.fragment, n;
}
function y_(t, e, r) {
  return typeof t == "string" ? (t = unescape(t), t = Et(pn(jt(t, r), !0), { ...r, skipEscape: !0 })) : typeof t == "object" && (t = Et(pn(t, !0), { ...r, skipEscape: !0 })), typeof e == "string" ? (e = unescape(e), e = Et(pn(jt(e, r), !0), { ...r, skipEscape: !0 })) : typeof e == "object" && (e = Et(pn(e, !0), { ...r, skipEscape: !0 })), t.toLowerCase() === e.toLowerCase();
}
function Et(t, e) {
  const r = {
    host: t.host,
    scheme: t.scheme,
    userinfo: t.userinfo,
    port: t.port,
    path: t.path,
    query: t.query,
    nid: t.nid,
    nss: t.nss,
    uuid: t.uuid,
    fragment: t.fragment,
    reference: t.reference,
    resourceName: t.resourceName,
    secure: t.secure,
    error: ""
  }, s = Object.assign({}, e), n = [], o = Nf(s.scheme || r.scheme);
  o && o.serialize && o.serialize(r, s), r.path !== void 0 && (s.skipEscape ? r.path = unescape(r.path) : (r.path = escape(r.path), r.scheme !== void 0 && (r.path = r.path.split("%3A").join(":")))), s.reference !== "suffix" && r.scheme && n.push(r.scheme, ":");
  const i = u_(r);
  if (i !== void 0 && (s.reference !== "suffix" && n.push("//"), n.push(i), r.path && r.path[0] !== "/" && n.push("/")), r.path !== void 0) {
    let a = r.path;
    !s.absolutePath && (!o || !o.absolutePath) && (a = Is(a)), i === void 0 && a[0] === "/" && a[1] === "/" && (a = "/%2F" + a.slice(2)), n.push(a);
  }
  return r.query !== void 0 && n.push("?", r.query), r.fragment !== void 0 && n.push("#", r.fragment), n.join("");
}
const $_ = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function jt(t, e) {
  const r = Object.assign({}, e), s = {
    scheme: void 0,
    userinfo: void 0,
    host: "",
    port: void 0,
    path: "",
    query: void 0,
    fragment: void 0
  };
  let n = !1;
  r.reference === "suffix" && (r.scheme ? t = r.scheme + ":" + t : t = "//" + t);
  const o = t.match($_);
  if (o) {
    if (s.scheme = o[1], s.userinfo = o[3], s.host = o[4], s.port = parseInt(o[5], 10), s.path = o[6] || "", s.query = o[7], s.fragment = o[8], isNaN(s.port) && (s.port = o[5]), s.host)
      if (d_(s.host) === !1) {
        const c = l_(s.host);
        s.host = c.host.toLowerCase(), n = c.isIPV6;
      } else
        n = !0;
    s.scheme === void 0 && s.userinfo === void 0 && s.host === void 0 && s.port === void 0 && s.query === void 0 && !s.path ? s.reference = "same-document" : s.scheme === void 0 ? s.reference = "relative" : s.fragment === void 0 ? s.reference = "absolute" : s.reference = "uri", r.reference && r.reference !== "suffix" && r.reference !== s.reference && (s.error = s.error || "URI is not a " + r.reference + " reference.");
    const i = Nf(r.scheme || s.scheme);
    if (!r.unicodeSupport && (!i || !i.unicodeSupport) && s.host && (r.domainHost || i && i.domainHost) && n === !1 && f_(s.host))
      try {
        s.host = URL.domainToASCII(s.host.toLowerCase());
      } catch (a) {
        s.error = s.error || "Host's domain name can not be converted to ASCII: " + a;
      }
    (!i || i && !i.skipNormalize) && (t.indexOf("%") !== -1 && (s.scheme !== void 0 && (s.scheme = unescape(s.scheme)), s.host !== void 0 && (s.host = unescape(s.host))), s.path && (s.path = escape(unescape(s.path))), s.fragment && (s.fragment = encodeURI(decodeURIComponent(s.fragment)))), i && i.parse && i.parse(s, r);
  } else
    s.error = s.error || "URI can not be parsed.";
  return s;
}
const ma = {
  SCHEMES: h_,
  normalize: m_,
  resolve: p_,
  resolveComponent: Of,
  equal: y_,
  serialize: Et,
  parse: jt
};
wo.exports = ma;
wo.exports.default = ma;
wo.exports.fastUri = ma;
var Rf = wo.exports;
Object.defineProperty(fa, "__esModule", { value: !0 });
const If = Rf;
If.code = 'require("ajv/dist/runtime/uri").default';
fa.default = If;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = void 0;
  var e = dt;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return e.KeywordCxt;
  } });
  var r = ee;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return r._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return r.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return r.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return r.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return r.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return r.CodeGen;
  } });
  const s = tn, n = us, o = Ar, i = Fe, a = ee, c = Te, d = ve, u = j, f = zg, E = fa, _ = (k, p) => new RegExp(k, p);
  _.code = "new RegExp";
  const v = ["removeAdditional", "useDefaults", "coerceTypes"], y = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]), $ = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  }, m = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  }, w = 200;
  function P(k) {
    var p, b, g, l, h, S, O, I, z, U, ie, Ge, rr, sr, nr, or, ir, ar, cr, lr, ur, dr, fr, hr, mr;
    const rt = k.strict, pr = (p = k.code) === null || p === void 0 ? void 0 : p.optimize, gs = pr === !0 || pr === void 0 ? 1 : pr || 0, _s = (g = (b = k.code) === null || b === void 0 ? void 0 : b.regExp) !== null && g !== void 0 ? g : _, Lo = (l = k.uriResolver) !== null && l !== void 0 ? l : E.default;
    return {
      strictSchema: (S = (h = k.strictSchema) !== null && h !== void 0 ? h : rt) !== null && S !== void 0 ? S : !0,
      strictNumbers: (I = (O = k.strictNumbers) !== null && O !== void 0 ? O : rt) !== null && I !== void 0 ? I : !0,
      strictTypes: (U = (z = k.strictTypes) !== null && z !== void 0 ? z : rt) !== null && U !== void 0 ? U : "log",
      strictTuples: (Ge = (ie = k.strictTuples) !== null && ie !== void 0 ? ie : rt) !== null && Ge !== void 0 ? Ge : "log",
      strictRequired: (sr = (rr = k.strictRequired) !== null && rr !== void 0 ? rr : rt) !== null && sr !== void 0 ? sr : !1,
      code: k.code ? { ...k.code, optimize: gs, regExp: _s } : { optimize: gs, regExp: _s },
      loopRequired: (nr = k.loopRequired) !== null && nr !== void 0 ? nr : w,
      loopEnum: (or = k.loopEnum) !== null && or !== void 0 ? or : w,
      meta: (ir = k.meta) !== null && ir !== void 0 ? ir : !0,
      messages: (ar = k.messages) !== null && ar !== void 0 ? ar : !0,
      inlineRefs: (cr = k.inlineRefs) !== null && cr !== void 0 ? cr : !0,
      schemaId: (lr = k.schemaId) !== null && lr !== void 0 ? lr : "$id",
      addUsedSchema: (ur = k.addUsedSchema) !== null && ur !== void 0 ? ur : !0,
      validateSchema: (dr = k.validateSchema) !== null && dr !== void 0 ? dr : !0,
      validateFormats: (fr = k.validateFormats) !== null && fr !== void 0 ? fr : !0,
      unicodeRegExp: (hr = k.unicodeRegExp) !== null && hr !== void 0 ? hr : !0,
      int32range: (mr = k.int32range) !== null && mr !== void 0 ? mr : !0,
      uriResolver: Lo
    };
  }
  class T {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...P(p) };
      const { es5: b, lines: g } = this.opts.code;
      this.scope = new a.ValueScope({ scope: {}, prefixes: y, es5: b, lines: g }), this.logger = G(p.logger);
      const l = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, o.getRules)(), N.call(this, $, p, "NOT SUPPORTED"), N.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = ye.call(this), p.formats && ce.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && fe.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), H.call(this), p.validateFormats = l;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: b, schemaId: g } = this.opts;
      let l = f;
      g === "id" && (l = { ...f }, l.id = l.$id, delete l.$id), b && p && this.addMetaSchema(l, l[g], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: b } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[b] || p : void 0;
    }
    validate(p, b) {
      let g;
      if (typeof p == "string") {
        if (g = this.getSchema(p), !g)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        g = this.compile(p);
      const l = g(b);
      return "$async" in g || (this.errors = g.errors), l;
    }
    compile(p, b) {
      const g = this._addSchema(p, b);
      return g.validate || this._compileSchemaEnv(g);
    }
    compileAsync(p, b) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: g } = this.opts;
      return l.call(this, p, b);
      async function l(U, ie) {
        await h.call(this, U.$schema);
        const Ge = this._addSchema(U, ie);
        return Ge.validate || S.call(this, Ge);
      }
      async function h(U) {
        U && !this.getSchema(U) && await l.call(this, { $ref: U }, !0);
      }
      async function S(U) {
        try {
          return this._compileSchemaEnv(U);
        } catch (ie) {
          if (!(ie instanceof n.default))
            throw ie;
          return O.call(this, ie), await I.call(this, ie.missingSchema), S.call(this, U);
        }
      }
      function O({ missingSchema: U, missingRef: ie }) {
        if (this.refs[U])
          throw new Error(`AnySchema ${U} is loaded but ${ie} cannot be resolved`);
      }
      async function I(U) {
        const ie = await z.call(this, U);
        this.refs[U] || await h.call(this, ie.$schema), this.refs[U] || this.addSchema(ie, U, b);
      }
      async function z(U) {
        const ie = this._loading[U];
        if (ie)
          return ie;
        try {
          return await (this._loading[U] = g(U));
        } finally {
          delete this._loading[U];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, b, g, l = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const S of p)
          this.addSchema(S, void 0, g, l);
        return this;
      }
      let h;
      if (typeof p == "object") {
        const { schemaId: S } = this.opts;
        if (h = p[S], h !== void 0 && typeof h != "string")
          throw new Error(`schema ${S} must be string`);
      }
      return b = (0, c.normalizeId)(b || h), this._checkUnique(b), this.schemas[b] = this._addSchema(p, g, b, l, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, b, g = this.opts.validateSchema) {
      return this.addSchema(p, b, !0, g), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, b) {
      if (typeof p == "boolean")
        return !0;
      let g;
      if (g = p.$schema, g !== void 0 && typeof g != "string")
        throw new Error("$schema must be a string");
      if (g = g || this.opts.defaultMeta || this.defaultMeta(), !g)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const l = this.validate(g, p);
      if (!l && b) {
        const h = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(h);
        else
          throw new Error(h);
      }
      return l;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(p) {
      let b;
      for (; typeof (b = V.call(this, p)) == "string"; )
        p = b;
      if (b === void 0) {
        const { schemaId: g } = this.opts, l = new i.SchemaEnv({ schema: {}, schemaId: g });
        if (b = i.resolveSchema.call(this, l, p), !b)
          return;
        this.refs[p] = b;
      }
      return b.validate || this._compileSchemaEnv(b);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(p) {
      if (p instanceof RegExp)
        return this._removeAllSchemas(this.schemas, p), this._removeAllSchemas(this.refs, p), this;
      switch (typeof p) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          const b = V.call(this, p);
          return typeof b == "object" && this._cache.delete(b.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const b = p;
          this._cache.delete(b);
          let g = p[this.opts.schemaId];
          return g && (g = (0, c.normalizeId)(g), delete this.schemas[g], delete this.refs[g]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const b of p)
        this.addKeyword(b);
      return this;
    }
    addKeyword(p, b) {
      let g;
      if (typeof p == "string")
        g = p, typeof b == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), b.keyword = g);
      else if (typeof p == "object" && b === void 0) {
        if (b = p, g = b.keyword, Array.isArray(g) && !g.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (R.call(this, g, b), !b)
        return (0, u.eachItem)(g, (h) => A.call(this, h)), this;
      M.call(this, b);
      const l = {
        ...b,
        type: (0, d.getJSONTypes)(b.type),
        schemaType: (0, d.getJSONTypes)(b.schemaType)
      };
      return (0, u.eachItem)(g, l.type.length === 0 ? (h) => A.call(this, h, l) : (h) => l.type.forEach((S) => A.call(this, h, l, S))), this;
    }
    getKeyword(p) {
      const b = this.RULES.all[p];
      return typeof b == "object" ? b.definition : !!b;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: b } = this;
      delete b.keywords[p], delete b.all[p];
      for (const g of b.rules) {
        const l = g.rules.findIndex((h) => h.keyword === p);
        l >= 0 && g.rules.splice(l, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, b) {
      return typeof b == "string" && (b = new RegExp(b)), this.formats[p] = b, this;
    }
    errorsText(p = this.errors, { separator: b = ", ", dataVar: g = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((l) => `${g}${l.instancePath} ${l.message}`).reduce((l, h) => l + b + h);
    }
    $dataMetaSchema(p, b) {
      const g = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const l of b) {
        const h = l.split("/").slice(1);
        let S = p;
        for (const O of h)
          S = S[O];
        for (const O in g) {
          const I = g[O];
          if (typeof I != "object")
            continue;
          const { $data: z } = I.definition, U = S[O];
          z && U && (S[O] = L(U));
        }
      }
      return p;
    }
    _removeAllSchemas(p, b) {
      for (const g in p) {
        const l = p[g];
        (!b || b.test(g)) && (typeof l == "string" ? delete p[g] : l && !l.meta && (this._cache.delete(l.schema), delete p[g]));
      }
    }
    _addSchema(p, b, g, l = this.opts.validateSchema, h = this.opts.addUsedSchema) {
      let S;
      const { schemaId: O } = this.opts;
      if (typeof p == "object")
        S = p[O];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let I = this._cache.get(p);
      if (I !== void 0)
        return I;
      g = (0, c.normalizeId)(S || g);
      const z = c.getSchemaRefs.call(this, p, g);
      return I = new i.SchemaEnv({ schema: p, schemaId: O, meta: b, baseId: g, localRefs: z }), this._cache.set(I.schema, I), h && !g.startsWith("#") && (g && this._checkUnique(g), this.refs[g] = I), l && this.validateSchema(p, !0), I;
    }
    _checkUnique(p) {
      if (this.schemas[p] || this.refs[p])
        throw new Error(`schema with key or id "${p}" already exists`);
    }
    _compileSchemaEnv(p) {
      if (p.meta ? this._compileMetaSchema(p) : i.compileSchema.call(this, p), !p.validate)
        throw new Error("ajv implementation error");
      return p.validate;
    }
    _compileMetaSchema(p) {
      const b = this.opts;
      this.opts = this._metaOpts;
      try {
        i.compileSchema.call(this, p);
      } finally {
        this.opts = b;
      }
    }
  }
  T.ValidationError = s.default, T.MissingRefError = n.default, t.default = T;
  function N(k, p, b, g = "error") {
    for (const l in k) {
      const h = l;
      h in p && this.logger[g](`${b}: option ${l}. ${k[h]}`);
    }
  }
  function V(k) {
    return k = (0, c.normalizeId)(k), this.schemas[k] || this.refs[k];
  }
  function H() {
    const k = this.opts.schemas;
    if (k)
      if (Array.isArray(k))
        this.addSchema(k);
      else
        for (const p in k)
          this.addSchema(k[p], p);
  }
  function ce() {
    for (const k in this.opts.formats) {
      const p = this.opts.formats[k];
      p && this.addFormat(k, p);
    }
  }
  function fe(k) {
    if (Array.isArray(k)) {
      this.addVocabulary(k);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const p in k) {
      const b = k[p];
      b.keyword || (b.keyword = p), this.addKeyword(b);
    }
  }
  function ye() {
    const k = { ...this.opts };
    for (const p of v)
      delete k[p];
    return k;
  }
  const K = { log() {
  }, warn() {
  }, error() {
  } };
  function G(k) {
    if (k === !1)
      return K;
    if (k === void 0)
      return console;
    if (k.log && k.warn && k.error)
      return k;
    throw new Error("logger must implement log, warn and error methods");
  }
  const ae = /^[a-z_$][a-z0-9_$:-]*$/i;
  function R(k, p) {
    const { RULES: b } = this;
    if ((0, u.eachItem)(k, (g) => {
      if (b.keywords[g])
        throw new Error(`Keyword ${g} is already defined`);
      if (!ae.test(g))
        throw new Error(`Keyword ${g} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function A(k, p, b) {
    var g;
    const l = p == null ? void 0 : p.post;
    if (b && l)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: h } = this;
    let S = l ? h.post : h.rules.find(({ type: I }) => I === b);
    if (S || (S = { type: b, rules: [] }, h.rules.push(S)), h.keywords[k] = !0, !p)
      return;
    const O = {
      keyword: k,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? F.call(this, S, O, p.before) : S.rules.push(O), h.all[k] = O, (g = p.implements) === null || g === void 0 || g.forEach((I) => this.addKeyword(I));
  }
  function F(k, p, b) {
    const g = k.rules.findIndex((l) => l.keyword === b);
    g >= 0 ? k.rules.splice(g, 0, p) : (k.rules.push(p), this.logger.warn(`rule ${b} is not defined`));
  }
  function M(k) {
    let { metaSchema: p } = k;
    p !== void 0 && (k.$data && this.opts.$data && (p = L(p)), k.validateSchema = this.compile(p, !0));
  }
  const B = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function L(k) {
    return { anyOf: [k, B] };
  }
})(zd);
var pa = {}, ya = {}, $a = {};
Object.defineProperty($a, "__esModule", { value: !0 });
const g_ = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
$a.default = g_;
var Ct = {};
Object.defineProperty(Ct, "__esModule", { value: !0 });
Ct.callRef = Ct.getValidate = void 0;
const __ = us, Hl = ne, ze = ee, Fr = Xe, Wl = Fe, yn = j, v_ = {
  keyword: "$ref",
  schemaType: "string",
  code(t) {
    const { gen: e, schema: r, it: s } = t, { baseId: n, schemaEnv: o, validateName: i, opts: a, self: c } = s, { root: d } = o;
    if ((r === "#" || r === "#/") && n === d.baseId)
      return f();
    const u = Wl.resolveRef.call(c, d, n, r);
    if (u === void 0)
      throw new __.default(s.opts.uriResolver, n, r);
    if (u instanceof Wl.SchemaEnv)
      return E(u);
    return _(u);
    function f() {
      if (o === d)
        return zn(t, i, o, o.$async);
      const v = e.scopeValue("root", { ref: d });
      return zn(t, (0, ze._)`${v}.validate`, d, d.$async);
    }
    function E(v) {
      const y = Af(t, v);
      zn(t, y, v, v.$async);
    }
    function _(v) {
      const y = e.scopeValue("schema", a.code.source === !0 ? { ref: v, code: (0, ze.stringify)(v) } : { ref: v }), $ = e.name("valid"), m = t.subschema({
        schema: v,
        dataTypes: [],
        schemaPath: ze.nil,
        topSchemaRef: y,
        errSchemaPath: r
      }, $);
      t.mergeEvaluated(m), t.ok($);
    }
  }
};
function Af(t, e) {
  const { gen: r } = t;
  return e.validate ? r.scopeValue("validate", { ref: e.validate }) : (0, ze._)`${r.scopeValue("wrapper", { ref: e })}.validate`;
}
Ct.getValidate = Af;
function zn(t, e, r, s) {
  const { gen: n, it: o } = t, { allErrors: i, schemaEnv: a, opts: c } = o, d = c.passContext ? Fr.default.this : ze.nil;
  s ? u() : f();
  function u() {
    if (!a.$async)
      throw new Error("async schema referenced by sync schema");
    const v = n.let("valid");
    n.try(() => {
      n.code((0, ze._)`await ${(0, Hl.callValidateCode)(t, e, d)}`), _(e), i || n.assign(v, !0);
    }, (y) => {
      n.if((0, ze._)`!(${y} instanceof ${o.ValidationError})`, () => n.throw(y)), E(y), i || n.assign(v, !1);
    }), t.ok(v);
  }
  function f() {
    t.result((0, Hl.callValidateCode)(t, e, d), () => _(e), () => E(e));
  }
  function E(v) {
    const y = (0, ze._)`${v}.errors`;
    n.assign(Fr.default.vErrors, (0, ze._)`${Fr.default.vErrors} === null ? ${y} : ${Fr.default.vErrors}.concat(${y})`), n.assign(Fr.default.errors, (0, ze._)`${Fr.default.vErrors}.length`);
  }
  function _(v) {
    var y;
    if (!o.opts.unevaluated)
      return;
    const $ = (y = r == null ? void 0 : r.validate) === null || y === void 0 ? void 0 : y.evaluated;
    if (o.props !== !0)
      if ($ && !$.dynamicProps)
        $.props !== void 0 && (o.props = yn.mergeEvaluated.props(n, $.props, o.props));
      else {
        const m = n.var("props", (0, ze._)`${v}.evaluated.props`);
        o.props = yn.mergeEvaluated.props(n, m, o.props, ze.Name);
      }
    if (o.items !== !0)
      if ($ && !$.dynamicItems)
        $.items !== void 0 && (o.items = yn.mergeEvaluated.items(n, $.items, o.items));
      else {
        const m = n.var("items", (0, ze._)`${v}.evaluated.items`);
        o.items = yn.mergeEvaluated.items(n, m, o.items, ze.Name);
      }
  }
}
Ct.callRef = zn;
Ct.default = v_;
Object.defineProperty(ya, "__esModule", { value: !0 });
const w_ = $a, E_ = Ct, S_ = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  w_.default,
  E_.default
];
ya.default = S_;
var ga = {}, _a = {};
Object.defineProperty(_a, "__esModule", { value: !0 });
const ro = ee, Vt = ro.operators, so = {
  maximum: { okStr: "<=", ok: Vt.LTE, fail: Vt.GT },
  minimum: { okStr: ">=", ok: Vt.GTE, fail: Vt.LT },
  exclusiveMaximum: { okStr: "<", ok: Vt.LT, fail: Vt.GTE },
  exclusiveMinimum: { okStr: ">", ok: Vt.GT, fail: Vt.LTE }
}, b_ = {
  message: ({ keyword: t, schemaCode: e }) => (0, ro.str)`must be ${so[t].okStr} ${e}`,
  params: ({ keyword: t, schemaCode: e }) => (0, ro._)`{comparison: ${so[t].okStr}, limit: ${e}}`
}, P_ = {
  keyword: Object.keys(so),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: b_,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t;
    t.fail$data((0, ro._)`${r} ${so[e].fail} ${s} || isNaN(${r})`);
  }
};
_a.default = P_;
var va = {};
Object.defineProperty(va, "__esModule", { value: !0 });
const Ms = ee, k_ = {
  message: ({ schemaCode: t }) => (0, Ms.str)`must be multiple of ${t}`,
  params: ({ schemaCode: t }) => (0, Ms._)`{multipleOf: ${t}}`
}, T_ = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: k_,
  code(t) {
    const { gen: e, data: r, schemaCode: s, it: n } = t, o = n.opts.multipleOfPrecision, i = e.let("res"), a = o ? (0, Ms._)`Math.abs(Math.round(${i}) - ${i}) > 1e-${o}` : (0, Ms._)`${i} !== parseInt(${i})`;
    t.fail$data((0, Ms._)`(${s} === 0 || (${i} = ${r}/${s}, ${a}))`);
  }
};
va.default = T_;
var wa = {}, Ea = {};
Object.defineProperty(Ea, "__esModule", { value: !0 });
function jf(t) {
  const e = t.length;
  let r = 0, s = 0, n;
  for (; s < e; )
    r++, n = t.charCodeAt(s++), n >= 55296 && n <= 56319 && s < e && (n = t.charCodeAt(s), (n & 64512) === 56320 && s++);
  return r;
}
Ea.default = jf;
jf.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(wa, "__esModule", { value: !0 });
const Sr = ee, N_ = j, O_ = Ea, R_ = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxLength" ? "more" : "fewer";
    return (0, Sr.str)`must NOT have ${r} than ${e} characters`;
  },
  params: ({ schemaCode: t }) => (0, Sr._)`{limit: ${t}}`
}, I_ = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: R_,
  code(t) {
    const { keyword: e, data: r, schemaCode: s, it: n } = t, o = e === "maxLength" ? Sr.operators.GT : Sr.operators.LT, i = n.opts.unicode === !1 ? (0, Sr._)`${r}.length` : (0, Sr._)`${(0, N_.useFunc)(t.gen, O_.default)}(${r})`;
    t.fail$data((0, Sr._)`${i} ${o} ${s}`);
  }
};
wa.default = I_;
var Sa = {};
Object.defineProperty(Sa, "__esModule", { value: !0 });
const A_ = ne, no = ee, j_ = {
  message: ({ schemaCode: t }) => (0, no.str)`must match pattern "${t}"`,
  params: ({ schemaCode: t }) => (0, no._)`{pattern: ${t}}`
}, C_ = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: j_,
  code(t) {
    const { data: e, $data: r, schema: s, schemaCode: n, it: o } = t, i = o.opts.unicodeRegExp ? "u" : "", a = r ? (0, no._)`(new RegExp(${n}, ${i}))` : (0, A_.usePattern)(t, s);
    t.fail$data((0, no._)`!${a}.test(${e})`);
  }
};
Sa.default = C_;
var ba = {};
Object.defineProperty(ba, "__esModule", { value: !0 });
const Ls = ee, D_ = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxProperties" ? "more" : "fewer";
    return (0, Ls.str)`must NOT have ${r} than ${e} properties`;
  },
  params: ({ schemaCode: t }) => (0, Ls._)`{limit: ${t}}`
}, M_ = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: D_,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t, n = e === "maxProperties" ? Ls.operators.GT : Ls.operators.LT;
    t.fail$data((0, Ls._)`Object.keys(${r}).length ${n} ${s}`);
  }
};
ba.default = M_;
var Pa = {};
Object.defineProperty(Pa, "__esModule", { value: !0 });
const Ps = ne, Fs = ee, L_ = j, F_ = {
  message: ({ params: { missingProperty: t } }) => (0, Fs.str)`must have required property '${t}'`,
  params: ({ params: { missingProperty: t } }) => (0, Fs._)`{missingProperty: ${t}}`
}, U_ = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: F_,
  code(t) {
    const { gen: e, schema: r, schemaCode: s, data: n, $data: o, it: i } = t, { opts: a } = i;
    if (!o && r.length === 0)
      return;
    const c = r.length >= a.loopRequired;
    if (i.allErrors ? d() : u(), a.strictRequired) {
      const _ = t.parentSchema.properties, { definedProperties: v } = t.it;
      for (const y of r)
        if ((_ == null ? void 0 : _[y]) === void 0 && !v.has(y)) {
          const $ = i.schemaEnv.baseId + i.errSchemaPath, m = `required property "${y}" is not defined at "${$}" (strictRequired)`;
          (0, L_.checkStrictMode)(i, m, i.opts.strictRequired);
        }
    }
    function d() {
      if (c || o)
        t.block$data(Fs.nil, f);
      else
        for (const _ of r)
          (0, Ps.checkReportMissingProp)(t, _);
    }
    function u() {
      const _ = e.let("missing");
      if (c || o) {
        const v = e.let("valid", !0);
        t.block$data(v, () => E(_, v)), t.ok(v);
      } else
        e.if((0, Ps.checkMissingProp)(t, r, _)), (0, Ps.reportMissingProp)(t, _), e.else();
    }
    function f() {
      e.forOf("prop", s, (_) => {
        t.setParams({ missingProperty: _ }), e.if((0, Ps.noPropertyInData)(e, n, _, a.ownProperties), () => t.error());
      });
    }
    function E(_, v) {
      t.setParams({ missingProperty: _ }), e.forOf(_, s, () => {
        e.assign(v, (0, Ps.propertyInData)(e, n, _, a.ownProperties)), e.if((0, Fs.not)(v), () => {
          t.error(), e.break();
        });
      }, Fs.nil);
    }
  }
};
Pa.default = U_;
var ka = {};
Object.defineProperty(ka, "__esModule", { value: !0 });
const Us = ee, V_ = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxItems" ? "more" : "fewer";
    return (0, Us.str)`must NOT have ${r} than ${e} items`;
  },
  params: ({ schemaCode: t }) => (0, Us._)`{limit: ${t}}`
}, z_ = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: V_,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t, n = e === "maxItems" ? Us.operators.GT : Us.operators.LT;
    t.fail$data((0, Us._)`${r}.length ${n} ${s}`);
  }
};
ka.default = z_;
var Ta = {}, rn = {};
Object.defineProperty(rn, "__esModule", { value: !0 });
const Cf = go;
Cf.code = 'require("ajv/dist/runtime/equal").default';
rn.default = Cf;
Object.defineProperty(Ta, "__esModule", { value: !0 });
const ri = ve, Pe = ee, K_ = j, x_ = rn, q_ = {
  message: ({ params: { i: t, j: e } }) => (0, Pe.str)`must NOT have duplicate items (items ## ${e} and ${t} are identical)`,
  params: ({ params: { i: t, j: e } }) => (0, Pe._)`{i: ${t}, j: ${e}}`
}, B_ = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: q_,
  code(t) {
    const { gen: e, data: r, $data: s, schema: n, parentSchema: o, schemaCode: i, it: a } = t;
    if (!s && !n)
      return;
    const c = e.let("valid"), d = o.items ? (0, ri.getSchemaTypes)(o.items) : [];
    t.block$data(c, u, (0, Pe._)`${i} === false`), t.ok(c);
    function u() {
      const v = e.let("i", (0, Pe._)`${r}.length`), y = e.let("j");
      t.setParams({ i: v, j: y }), e.assign(c, !0), e.if((0, Pe._)`${v} > 1`, () => (f() ? E : _)(v, y));
    }
    function f() {
      return d.length > 0 && !d.some((v) => v === "object" || v === "array");
    }
    function E(v, y) {
      const $ = e.name("item"), m = (0, ri.checkDataTypes)(d, $, a.opts.strictNumbers, ri.DataType.Wrong), w = e.const("indices", (0, Pe._)`{}`);
      e.for((0, Pe._)`;${v}--;`, () => {
        e.let($, (0, Pe._)`${r}[${v}]`), e.if(m, (0, Pe._)`continue`), d.length > 1 && e.if((0, Pe._)`typeof ${$} == "string"`, (0, Pe._)`${$} += "_"`), e.if((0, Pe._)`typeof ${w}[${$}] == "number"`, () => {
          e.assign(y, (0, Pe._)`${w}[${$}]`), t.error(), e.assign(c, !1).break();
        }).code((0, Pe._)`${w}[${$}] = ${v}`);
      });
    }
    function _(v, y) {
      const $ = (0, K_.useFunc)(e, x_.default), m = e.name("outer");
      e.label(m).for((0, Pe._)`;${v}--;`, () => e.for((0, Pe._)`${y} = ${v}; ${y}--;`, () => e.if((0, Pe._)`${$}(${r}[${v}], ${r}[${y}])`, () => {
        t.error(), e.assign(c, !1).break(m);
      })));
    }
  }
};
Ta.default = B_;
var Na = {};
Object.defineProperty(Na, "__esModule", { value: !0 });
const ji = ee, G_ = j, H_ = rn, W_ = {
  message: "must be equal to constant",
  params: ({ schemaCode: t }) => (0, ji._)`{allowedValue: ${t}}`
}, J_ = {
  keyword: "const",
  $data: !0,
  error: W_,
  code(t) {
    const { gen: e, data: r, $data: s, schemaCode: n, schema: o } = t;
    s || o && typeof o == "object" ? t.fail$data((0, ji._)`!${(0, G_.useFunc)(e, H_.default)}(${r}, ${n})`) : t.fail((0, ji._)`${o} !== ${r}`);
  }
};
Na.default = J_;
var Oa = {};
Object.defineProperty(Oa, "__esModule", { value: !0 });
const As = ee, X_ = j, Y_ = rn, Z_ = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: t }) => (0, As._)`{allowedValues: ${t}}`
}, Q_ = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: Z_,
  code(t) {
    const { gen: e, data: r, $data: s, schema: n, schemaCode: o, it: i } = t;
    if (!s && n.length === 0)
      throw new Error("enum must have non-empty array");
    const a = n.length >= i.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, X_.useFunc)(e, Y_.default));
    let u;
    if (a || s)
      u = e.let("valid"), t.block$data(u, f);
    else {
      if (!Array.isArray(n))
        throw new Error("ajv implementation error");
      const _ = e.const("vSchema", o);
      u = (0, As.or)(...n.map((v, y) => E(_, y)));
    }
    t.pass(u);
    function f() {
      e.assign(u, !1), e.forOf("v", o, (_) => e.if((0, As._)`${d()}(${r}, ${_})`, () => e.assign(u, !0).break()));
    }
    function E(_, v) {
      const y = n[v];
      return typeof y == "object" && y !== null ? (0, As._)`${d()}(${r}, ${_}[${v}])` : (0, As._)`${r} === ${y}`;
    }
  }
};
Oa.default = Q_;
Object.defineProperty(ga, "__esModule", { value: !0 });
const e0 = _a, t0 = va, r0 = wa, s0 = Sa, n0 = ba, o0 = Pa, i0 = ka, a0 = Ta, c0 = Na, l0 = Oa, u0 = [
  // number
  e0.default,
  t0.default,
  // string
  r0.default,
  s0.default,
  // object
  n0.default,
  o0.default,
  // array
  i0.default,
  a0.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  c0.default,
  l0.default
];
ga.default = u0;
var Ra = {}, ds = {};
Object.defineProperty(ds, "__esModule", { value: !0 });
ds.validateAdditionalItems = void 0;
const br = ee, Ci = j, d0 = {
  message: ({ params: { len: t } }) => (0, br.str)`must NOT have more than ${t} items`,
  params: ({ params: { len: t } }) => (0, br._)`{limit: ${t}}`
}, f0 = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: d0,
  code(t) {
    const { parentSchema: e, it: r } = t, { items: s } = e;
    if (!Array.isArray(s)) {
      (0, Ci.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Df(t, s);
  }
};
function Df(t, e) {
  const { gen: r, schema: s, data: n, keyword: o, it: i } = t;
  i.items = !0;
  const a = r.const("len", (0, br._)`${n}.length`);
  if (s === !1)
    t.setParams({ len: e.length }), t.pass((0, br._)`${a} <= ${e.length}`);
  else if (typeof s == "object" && !(0, Ci.alwaysValidSchema)(i, s)) {
    const d = r.var("valid", (0, br._)`${a} <= ${e.length}`);
    r.if((0, br.not)(d), () => c(d)), t.ok(d);
  }
  function c(d) {
    r.forRange("i", e.length, a, (u) => {
      t.subschema({ keyword: o, dataProp: u, dataPropType: Ci.Type.Num }, d), i.allErrors || r.if((0, br.not)(d), () => r.break());
    });
  }
}
ds.validateAdditionalItems = Df;
ds.default = f0;
var Ia = {}, fs = {};
Object.defineProperty(fs, "__esModule", { value: !0 });
fs.validateTuple = void 0;
const Jl = ee, Kn = j, h0 = ne, m0 = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(t) {
    const { schema: e, it: r } = t;
    if (Array.isArray(e))
      return Mf(t, "additionalItems", e);
    r.items = !0, !(0, Kn.alwaysValidSchema)(r, e) && t.ok((0, h0.validateArray)(t));
  }
};
function Mf(t, e, r = t.schema) {
  const { gen: s, parentSchema: n, data: o, keyword: i, it: a } = t;
  u(n), a.opts.unevaluated && r.length && a.items !== !0 && (a.items = Kn.mergeEvaluated.items(s, r.length, a.items));
  const c = s.name("valid"), d = s.const("len", (0, Jl._)`${o}.length`);
  r.forEach((f, E) => {
    (0, Kn.alwaysValidSchema)(a, f) || (s.if((0, Jl._)`${d} > ${E}`, () => t.subschema({
      keyword: i,
      schemaProp: E,
      dataProp: E
    }, c)), t.ok(c));
  });
  function u(f) {
    const { opts: E, errSchemaPath: _ } = a, v = r.length, y = v === f.minItems && (v === f.maxItems || f[e] === !1);
    if (E.strictTuples && !y) {
      const $ = `"${i}" is ${v}-tuple, but minItems or maxItems/${e} are not specified or different at path "${_}"`;
      (0, Kn.checkStrictMode)(a, $, E.strictTuples);
    }
  }
}
fs.validateTuple = Mf;
fs.default = m0;
Object.defineProperty(Ia, "__esModule", { value: !0 });
const p0 = fs, y0 = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (t) => (0, p0.validateTuple)(t, "items")
};
Ia.default = y0;
var Aa = {};
Object.defineProperty(Aa, "__esModule", { value: !0 });
const Xl = ee, $0 = j, g0 = ne, _0 = ds, v0 = {
  message: ({ params: { len: t } }) => (0, Xl.str)`must NOT have more than ${t} items`,
  params: ({ params: { len: t } }) => (0, Xl._)`{limit: ${t}}`
}, w0 = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: v0,
  code(t) {
    const { schema: e, parentSchema: r, it: s } = t, { prefixItems: n } = r;
    s.items = !0, !(0, $0.alwaysValidSchema)(s, e) && (n ? (0, _0.validateAdditionalItems)(t, n) : t.ok((0, g0.validateArray)(t)));
  }
};
Aa.default = w0;
var ja = {};
Object.defineProperty(ja, "__esModule", { value: !0 });
const et = ee, $n = j, E0 = {
  message: ({ params: { min: t, max: e } }) => e === void 0 ? (0, et.str)`must contain at least ${t} valid item(s)` : (0, et.str)`must contain at least ${t} and no more than ${e} valid item(s)`,
  params: ({ params: { min: t, max: e } }) => e === void 0 ? (0, et._)`{minContains: ${t}}` : (0, et._)`{minContains: ${t}, maxContains: ${e}}`
}, S0 = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: E0,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, it: o } = t;
    let i, a;
    const { minContains: c, maxContains: d } = s;
    o.opts.next ? (i = c === void 0 ? 1 : c, a = d) : i = 1;
    const u = e.const("len", (0, et._)`${n}.length`);
    if (t.setParams({ min: i, max: a }), a === void 0 && i === 0) {
      (0, $n.checkStrictMode)(o, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (a !== void 0 && i > a) {
      (0, $n.checkStrictMode)(o, '"minContains" > "maxContains" is always invalid'), t.fail();
      return;
    }
    if ((0, $n.alwaysValidSchema)(o, r)) {
      let y = (0, et._)`${u} >= ${i}`;
      a !== void 0 && (y = (0, et._)`${y} && ${u} <= ${a}`), t.pass(y);
      return;
    }
    o.items = !0;
    const f = e.name("valid");
    a === void 0 && i === 1 ? _(f, () => e.if(f, () => e.break())) : i === 0 ? (e.let(f, !0), a !== void 0 && e.if((0, et._)`${n}.length > 0`, E)) : (e.let(f, !1), E()), t.result(f, () => t.reset());
    function E() {
      const y = e.name("_valid"), $ = e.let("count", 0);
      _(y, () => e.if(y, () => v($)));
    }
    function _(y, $) {
      e.forRange("i", 0, u, (m) => {
        t.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: $n.Type.Num,
          compositeRule: !0
        }, y), $();
      });
    }
    function v(y) {
      e.code((0, et._)`${y}++`), a === void 0 ? e.if((0, et._)`${y} >= ${i}`, () => e.assign(f, !0).break()) : (e.if((0, et._)`${y} > ${a}`, () => e.assign(f, !1).break()), i === 1 ? e.assign(f, !0) : e.if((0, et._)`${y} >= ${i}`, () => e.assign(f, !0)));
    }
  }
};
ja.default = S0;
var Eo = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.validateSchemaDeps = t.validatePropertyDeps = t.error = void 0;
  const e = ee, r = j, s = ne;
  t.error = {
    message: ({ params: { property: c, depsCount: d, deps: u } }) => {
      const f = d === 1 ? "property" : "properties";
      return (0, e.str)`must have ${f} ${u} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: u, missingProperty: f } }) => (0, e._)`{property: ${c},
    missingProperty: ${f},
    depsCount: ${d},
    deps: ${u}}`
    // TODO change to reference
  };
  const n = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: t.error,
    code(c) {
      const [d, u] = o(c);
      i(c, d), a(c, u);
    }
  };
  function o({ schema: c }) {
    const d = {}, u = {};
    for (const f in c) {
      if (f === "__proto__")
        continue;
      const E = Array.isArray(c[f]) ? d : u;
      E[f] = c[f];
    }
    return [d, u];
  }
  function i(c, d = c.schema) {
    const { gen: u, data: f, it: E } = c;
    if (Object.keys(d).length === 0)
      return;
    const _ = u.let("missing");
    for (const v in d) {
      const y = d[v];
      if (y.length === 0)
        continue;
      const $ = (0, s.propertyInData)(u, f, v, E.opts.ownProperties);
      c.setParams({
        property: v,
        depsCount: y.length,
        deps: y.join(", ")
      }), E.allErrors ? u.if($, () => {
        for (const m of y)
          (0, s.checkReportMissingProp)(c, m);
      }) : (u.if((0, e._)`${$} && (${(0, s.checkMissingProp)(c, y, _)})`), (0, s.reportMissingProp)(c, _), u.else());
    }
  }
  t.validatePropertyDeps = i;
  function a(c, d = c.schema) {
    const { gen: u, data: f, keyword: E, it: _ } = c, v = u.name("valid");
    for (const y in d)
      (0, r.alwaysValidSchema)(_, d[y]) || (u.if(
        (0, s.propertyInData)(u, f, y, _.opts.ownProperties),
        () => {
          const $ = c.subschema({ keyword: E, schemaProp: y }, v);
          c.mergeValidEvaluated($, v);
        },
        () => u.var(v, !0)
        // TODO var
      ), c.ok(v));
  }
  t.validateSchemaDeps = a, t.default = n;
})(Eo);
var Ca = {};
Object.defineProperty(Ca, "__esModule", { value: !0 });
const Lf = ee, b0 = j, P0 = {
  message: "property name must be valid",
  params: ({ params: t }) => (0, Lf._)`{propertyName: ${t.propertyName}}`
}, k0 = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: P0,
  code(t) {
    const { gen: e, schema: r, data: s, it: n } = t;
    if ((0, b0.alwaysValidSchema)(n, r))
      return;
    const o = e.name("valid");
    e.forIn("key", s, (i) => {
      t.setParams({ propertyName: i }), t.subschema({
        keyword: "propertyNames",
        data: i,
        dataTypes: ["string"],
        propertyName: i,
        compositeRule: !0
      }, o), e.if((0, Lf.not)(o), () => {
        t.error(!0), n.allErrors || e.break();
      });
    }), t.ok(o);
  }
};
Ca.default = k0;
var So = {};
Object.defineProperty(So, "__esModule", { value: !0 });
const gn = ne, it = ee, T0 = Xe, _n = j, N0 = {
  message: "must NOT have additional properties",
  params: ({ params: t }) => (0, it._)`{additionalProperty: ${t.additionalProperty}}`
}, O0 = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: N0,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, errsCount: o, it: i } = t;
    if (!o)
      throw new Error("ajv implementation error");
    const { allErrors: a, opts: c } = i;
    if (i.props = !0, c.removeAdditional !== "all" && (0, _n.alwaysValidSchema)(i, r))
      return;
    const d = (0, gn.allSchemaProperties)(s.properties), u = (0, gn.allSchemaProperties)(s.patternProperties);
    f(), t.ok((0, it._)`${o} === ${T0.default.errors}`);
    function f() {
      e.forIn("key", n, ($) => {
        !d.length && !u.length ? v($) : e.if(E($), () => v($));
      });
    }
    function E($) {
      let m;
      if (d.length > 8) {
        const w = (0, _n.schemaRefOrVal)(i, s.properties, "properties");
        m = (0, gn.isOwnProperty)(e, w, $);
      } else d.length ? m = (0, it.or)(...d.map((w) => (0, it._)`${$} === ${w}`)) : m = it.nil;
      return u.length && (m = (0, it.or)(m, ...u.map((w) => (0, it._)`${(0, gn.usePattern)(t, w)}.test(${$})`))), (0, it.not)(m);
    }
    function _($) {
      e.code((0, it._)`delete ${n}[${$}]`);
    }
    function v($) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        _($);
        return;
      }
      if (r === !1) {
        t.setParams({ additionalProperty: $ }), t.error(), a || e.break();
        return;
      }
      if (typeof r == "object" && !(0, _n.alwaysValidSchema)(i, r)) {
        const m = e.name("valid");
        c.removeAdditional === "failing" ? (y($, m, !1), e.if((0, it.not)(m), () => {
          t.reset(), _($);
        })) : (y($, m), a || e.if((0, it.not)(m), () => e.break()));
      }
    }
    function y($, m, w) {
      const P = {
        keyword: "additionalProperties",
        dataProp: $,
        dataPropType: _n.Type.Str
      };
      w === !1 && Object.assign(P, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), t.subschema(P, m);
    }
  }
};
So.default = O0;
var Da = {};
Object.defineProperty(Da, "__esModule", { value: !0 });
const R0 = dt, Yl = ne, si = j, Zl = So, I0 = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, it: o } = t;
    o.opts.removeAdditional === "all" && s.additionalProperties === void 0 && Zl.default.code(new R0.KeywordCxt(o, Zl.default, "additionalProperties"));
    const i = (0, Yl.allSchemaProperties)(r);
    for (const f of i)
      o.definedProperties.add(f);
    o.opts.unevaluated && i.length && o.props !== !0 && (o.props = si.mergeEvaluated.props(e, (0, si.toHash)(i), o.props));
    const a = i.filter((f) => !(0, si.alwaysValidSchema)(o, r[f]));
    if (a.length === 0)
      return;
    const c = e.name("valid");
    for (const f of a)
      d(f) ? u(f) : (e.if((0, Yl.propertyInData)(e, n, f, o.opts.ownProperties)), u(f), o.allErrors || e.else().var(c, !0), e.endIf()), t.it.definedProperties.add(f), t.ok(c);
    function d(f) {
      return o.opts.useDefaults && !o.compositeRule && r[f].default !== void 0;
    }
    function u(f) {
      t.subschema({
        keyword: "properties",
        schemaProp: f,
        dataProp: f
      }, c);
    }
  }
};
Da.default = I0;
var Ma = {};
Object.defineProperty(Ma, "__esModule", { value: !0 });
const Ql = ne, vn = ee, eu = j, tu = j, A0 = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(t) {
    const { gen: e, schema: r, data: s, parentSchema: n, it: o } = t, { opts: i } = o, a = (0, Ql.allSchemaProperties)(r), c = a.filter((y) => (0, eu.alwaysValidSchema)(o, r[y]));
    if (a.length === 0 || c.length === a.length && (!o.opts.unevaluated || o.props === !0))
      return;
    const d = i.strictSchema && !i.allowMatchingProperties && n.properties, u = e.name("valid");
    o.props !== !0 && !(o.props instanceof vn.Name) && (o.props = (0, tu.evaluatedPropsToName)(e, o.props));
    const { props: f } = o;
    E();
    function E() {
      for (const y of a)
        d && _(y), o.allErrors ? v(y) : (e.var(u, !0), v(y), e.if(u));
    }
    function _(y) {
      for (const $ in d)
        new RegExp(y).test($) && (0, eu.checkStrictMode)(o, `property ${$} matches pattern ${y} (use allowMatchingProperties)`);
    }
    function v(y) {
      e.forIn("key", s, ($) => {
        e.if((0, vn._)`${(0, Ql.usePattern)(t, y)}.test(${$})`, () => {
          const m = c.includes(y);
          m || t.subschema({
            keyword: "patternProperties",
            schemaProp: y,
            dataProp: $,
            dataPropType: tu.Type.Str
          }, u), o.opts.unevaluated && f !== !0 ? e.assign((0, vn._)`${f}[${$}]`, !0) : !m && !o.allErrors && e.if((0, vn.not)(u), () => e.break());
        });
      });
    }
  }
};
Ma.default = A0;
var La = {};
Object.defineProperty(La, "__esModule", { value: !0 });
const j0 = j, C0 = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(t) {
    const { gen: e, schema: r, it: s } = t;
    if ((0, j0.alwaysValidSchema)(s, r)) {
      t.fail();
      return;
    }
    const n = e.name("valid");
    t.subschema({
      keyword: "not",
      compositeRule: !0,
      createErrors: !1,
      allErrors: !1
    }, n), t.failResult(n, () => t.reset(), () => t.error());
  },
  error: { message: "must NOT be valid" }
};
La.default = C0;
var Fa = {};
Object.defineProperty(Fa, "__esModule", { value: !0 });
const D0 = ne, M0 = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: D0.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Fa.default = M0;
var Ua = {};
Object.defineProperty(Ua, "__esModule", { value: !0 });
const xn = ee, L0 = j, F0 = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: t }) => (0, xn._)`{passingSchemas: ${t.passing}}`
}, U0 = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: F0,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, it: n } = t;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (n.opts.discriminator && s.discriminator)
      return;
    const o = r, i = e.let("valid", !1), a = e.let("passing", null), c = e.name("_valid");
    t.setParams({ passing: a }), e.block(d), t.result(i, () => t.reset(), () => t.error(!0));
    function d() {
      o.forEach((u, f) => {
        let E;
        (0, L0.alwaysValidSchema)(n, u) ? e.var(c, !0) : E = t.subschema({
          keyword: "oneOf",
          schemaProp: f,
          compositeRule: !0
        }, c), f > 0 && e.if((0, xn._)`${c} && ${i}`).assign(i, !1).assign(a, (0, xn._)`[${a}, ${f}]`).else(), e.if(c, () => {
          e.assign(i, !0), e.assign(a, f), E && t.mergeEvaluated(E, xn.Name);
        });
      });
    }
  }
};
Ua.default = U0;
var Va = {};
Object.defineProperty(Va, "__esModule", { value: !0 });
const V0 = j, z0 = {
  keyword: "allOf",
  schemaType: "array",
  code(t) {
    const { gen: e, schema: r, it: s } = t;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const n = e.name("valid");
    r.forEach((o, i) => {
      if ((0, V0.alwaysValidSchema)(s, o))
        return;
      const a = t.subschema({ keyword: "allOf", schemaProp: i }, n);
      t.ok(n), t.mergeEvaluated(a);
    });
  }
};
Va.default = z0;
var za = {};
Object.defineProperty(za, "__esModule", { value: !0 });
const oo = ee, Ff = j, K0 = {
  message: ({ params: t }) => (0, oo.str)`must match "${t.ifClause}" schema`,
  params: ({ params: t }) => (0, oo._)`{failingKeyword: ${t.ifClause}}`
}, x0 = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: K0,
  code(t) {
    const { gen: e, parentSchema: r, it: s } = t;
    r.then === void 0 && r.else === void 0 && (0, Ff.checkStrictMode)(s, '"if" without "then" and "else" is ignored');
    const n = ru(s, "then"), o = ru(s, "else");
    if (!n && !o)
      return;
    const i = e.let("valid", !0), a = e.name("_valid");
    if (c(), t.reset(), n && o) {
      const u = e.let("ifClause");
      t.setParams({ ifClause: u }), e.if(a, d("then", u), d("else", u));
    } else n ? e.if(a, d("then")) : e.if((0, oo.not)(a), d("else"));
    t.pass(i, () => t.error(!0));
    function c() {
      const u = t.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, a);
      t.mergeEvaluated(u);
    }
    function d(u, f) {
      return () => {
        const E = t.subschema({ keyword: u }, a);
        e.assign(i, a), t.mergeValidEvaluated(E, i), f ? e.assign(f, (0, oo._)`${u}`) : t.setParams({ ifClause: u });
      };
    }
  }
};
function ru(t, e) {
  const r = t.schema[e];
  return r !== void 0 && !(0, Ff.alwaysValidSchema)(t, r);
}
za.default = x0;
var Ka = {};
Object.defineProperty(Ka, "__esModule", { value: !0 });
const q0 = j, B0 = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: t, parentSchema: e, it: r }) {
    e.if === void 0 && (0, q0.checkStrictMode)(r, `"${t}" without "if" is ignored`);
  }
};
Ka.default = B0;
Object.defineProperty(Ra, "__esModule", { value: !0 });
const G0 = ds, H0 = Ia, W0 = fs, J0 = Aa, X0 = ja, Y0 = Eo, Z0 = Ca, Q0 = So, ev = Da, tv = Ma, rv = La, sv = Fa, nv = Ua, ov = Va, iv = za, av = Ka;
function cv(t = !1) {
  const e = [
    // any
    rv.default,
    sv.default,
    nv.default,
    ov.default,
    iv.default,
    av.default,
    // object
    Z0.default,
    Q0.default,
    Y0.default,
    ev.default,
    tv.default
  ];
  return t ? e.push(H0.default, J0.default) : e.push(G0.default, W0.default), e.push(X0.default), e;
}
Ra.default = cv;
var xa = {}, hs = {};
Object.defineProperty(hs, "__esModule", { value: !0 });
hs.dynamicAnchor = void 0;
const ni = ee, lv = Xe, su = Fe, uv = Ct, dv = {
  keyword: "$dynamicAnchor",
  schemaType: "string",
  code: (t) => Uf(t, t.schema)
};
function Uf(t, e) {
  const { gen: r, it: s } = t;
  s.schemaEnv.root.dynamicAnchors[e] = !0;
  const n = (0, ni._)`${lv.default.dynamicAnchors}${(0, ni.getProperty)(e)}`, o = s.errSchemaPath === "#" ? s.validateName : fv(t);
  r.if((0, ni._)`!${n}`, () => r.assign(n, o));
}
hs.dynamicAnchor = Uf;
function fv(t) {
  const { schemaEnv: e, schema: r, self: s } = t.it, { root: n, baseId: o, localRefs: i, meta: a } = e.root, { schemaId: c } = s.opts, d = new su.SchemaEnv({ schema: r, schemaId: c, root: n, baseId: o, localRefs: i, meta: a });
  return su.compileSchema.call(s, d), (0, uv.getValidate)(t, d);
}
hs.default = dv;
var ms = {};
Object.defineProperty(ms, "__esModule", { value: !0 });
ms.dynamicRef = void 0;
const nu = ee, hv = Xe, ou = Ct, mv = {
  keyword: "$dynamicRef",
  schemaType: "string",
  code: (t) => Vf(t, t.schema)
};
function Vf(t, e) {
  const { gen: r, keyword: s, it: n } = t;
  if (e[0] !== "#")
    throw new Error(`"${s}" only supports hash fragment reference`);
  const o = e.slice(1);
  if (n.allErrors)
    i();
  else {
    const c = r.let("valid", !1);
    i(c), t.ok(c);
  }
  function i(c) {
    if (n.schemaEnv.root.dynamicAnchors[o]) {
      const d = r.let("_v", (0, nu._)`${hv.default.dynamicAnchors}${(0, nu.getProperty)(o)}`);
      r.if(d, a(d, c), a(n.validateName, c));
    } else
      a(n.validateName, c)();
  }
  function a(c, d) {
    return d ? () => r.block(() => {
      (0, ou.callRef)(t, c), r.let(d, !0);
    }) : () => (0, ou.callRef)(t, c);
  }
}
ms.dynamicRef = Vf;
ms.default = mv;
var qa = {};
Object.defineProperty(qa, "__esModule", { value: !0 });
const pv = hs, yv = j, $v = {
  keyword: "$recursiveAnchor",
  schemaType: "boolean",
  code(t) {
    t.schema ? (0, pv.dynamicAnchor)(t, "") : (0, yv.checkStrictMode)(t.it, "$recursiveAnchor: false is ignored");
  }
};
qa.default = $v;
var Ba = {};
Object.defineProperty(Ba, "__esModule", { value: !0 });
const gv = ms, _v = {
  keyword: "$recursiveRef",
  schemaType: "string",
  code: (t) => (0, gv.dynamicRef)(t, t.schema)
};
Ba.default = _v;
Object.defineProperty(xa, "__esModule", { value: !0 });
const vv = hs, wv = ms, Ev = qa, Sv = Ba, bv = [vv.default, wv.default, Ev.default, Sv.default];
xa.default = bv;
var Ga = {}, Ha = {};
Object.defineProperty(Ha, "__esModule", { value: !0 });
const iu = Eo, Pv = {
  keyword: "dependentRequired",
  type: "object",
  schemaType: "object",
  error: iu.error,
  code: (t) => (0, iu.validatePropertyDeps)(t)
};
Ha.default = Pv;
var Wa = {};
Object.defineProperty(Wa, "__esModule", { value: !0 });
const kv = Eo, Tv = {
  keyword: "dependentSchemas",
  type: "object",
  schemaType: "object",
  code: (t) => (0, kv.validateSchemaDeps)(t)
};
Wa.default = Tv;
var Ja = {};
Object.defineProperty(Ja, "__esModule", { value: !0 });
const Nv = j, Ov = {
  keyword: ["maxContains", "minContains"],
  type: "array",
  schemaType: "number",
  code({ keyword: t, parentSchema: e, it: r }) {
    e.contains === void 0 && (0, Nv.checkStrictMode)(r, `"${t}" without "contains" is ignored`);
  }
};
Ja.default = Ov;
Object.defineProperty(Ga, "__esModule", { value: !0 });
const Rv = Ha, Iv = Wa, Av = Ja, jv = [Rv.default, Iv.default, Av.default];
Ga.default = jv;
var Xa = {}, Ya = {};
Object.defineProperty(Ya, "__esModule", { value: !0 });
const qt = ee, au = j, Cv = Xe, Dv = {
  message: "must NOT have unevaluated properties",
  params: ({ params: t }) => (0, qt._)`{unevaluatedProperty: ${t.unevaluatedProperty}}`
}, Mv = {
  keyword: "unevaluatedProperties",
  type: "object",
  schemaType: ["boolean", "object"],
  trackErrors: !0,
  error: Dv,
  code(t) {
    const { gen: e, schema: r, data: s, errsCount: n, it: o } = t;
    if (!n)
      throw new Error("ajv implementation error");
    const { allErrors: i, props: a } = o;
    a instanceof qt.Name ? e.if((0, qt._)`${a} !== true`, () => e.forIn("key", s, (f) => e.if(d(a, f), () => c(f)))) : a !== !0 && e.forIn("key", s, (f) => a === void 0 ? c(f) : e.if(u(a, f), () => c(f))), o.props = !0, t.ok((0, qt._)`${n} === ${Cv.default.errors}`);
    function c(f) {
      if (r === !1) {
        t.setParams({ unevaluatedProperty: f }), t.error(), i || e.break();
        return;
      }
      if (!(0, au.alwaysValidSchema)(o, r)) {
        const E = e.name("valid");
        t.subschema({
          keyword: "unevaluatedProperties",
          dataProp: f,
          dataPropType: au.Type.Str
        }, E), i || e.if((0, qt.not)(E), () => e.break());
      }
    }
    function d(f, E) {
      return (0, qt._)`!${f} || !${f}[${E}]`;
    }
    function u(f, E) {
      const _ = [];
      for (const v in f)
        f[v] === !0 && _.push((0, qt._)`${E} !== ${v}`);
      return (0, qt.and)(..._);
    }
  }
};
Ya.default = Mv;
var Za = {};
Object.defineProperty(Za, "__esModule", { value: !0 });
const Pr = ee, cu = j, Lv = {
  message: ({ params: { len: t } }) => (0, Pr.str)`must NOT have more than ${t} items`,
  params: ({ params: { len: t } }) => (0, Pr._)`{limit: ${t}}`
}, Fv = {
  keyword: "unevaluatedItems",
  type: "array",
  schemaType: ["boolean", "object"],
  error: Lv,
  code(t) {
    const { gen: e, schema: r, data: s, it: n } = t, o = n.items || 0;
    if (o === !0)
      return;
    const i = e.const("len", (0, Pr._)`${s}.length`);
    if (r === !1)
      t.setParams({ len: o }), t.fail((0, Pr._)`${i} > ${o}`);
    else if (typeof r == "object" && !(0, cu.alwaysValidSchema)(n, r)) {
      const c = e.var("valid", (0, Pr._)`${i} <= ${o}`);
      e.if((0, Pr.not)(c), () => a(c, o)), t.ok(c);
    }
    n.items = !0;
    function a(c, d) {
      e.forRange("i", d, i, (u) => {
        t.subschema({ keyword: "unevaluatedItems", dataProp: u, dataPropType: cu.Type.Num }, c), n.allErrors || e.if((0, Pr.not)(c), () => e.break());
      });
    }
  }
};
Za.default = Fv;
Object.defineProperty(Xa, "__esModule", { value: !0 });
const Uv = Ya, Vv = Za, zv = [Uv.default, Vv.default];
Xa.default = zv;
var Qa = {}, ec = {};
Object.defineProperty(ec, "__esModule", { value: !0 });
const $e = ee, Kv = {
  message: ({ schemaCode: t }) => (0, $e.str)`must match format "${t}"`,
  params: ({ schemaCode: t }) => (0, $e._)`{format: ${t}}`
}, xv = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: Kv,
  code(t, e) {
    const { gen: r, data: s, $data: n, schema: o, schemaCode: i, it: a } = t, { opts: c, errSchemaPath: d, schemaEnv: u, self: f } = a;
    if (!c.validateFormats)
      return;
    n ? E() : _();
    function E() {
      const v = r.scopeValue("formats", {
        ref: f.formats,
        code: c.code.formats
      }), y = r.const("fDef", (0, $e._)`${v}[${i}]`), $ = r.let("fType"), m = r.let("format");
      r.if((0, $e._)`typeof ${y} == "object" && !(${y} instanceof RegExp)`, () => r.assign($, (0, $e._)`${y}.type || "string"`).assign(m, (0, $e._)`${y}.validate`), () => r.assign($, (0, $e._)`"string"`).assign(m, y)), t.fail$data((0, $e.or)(w(), P()));
      function w() {
        return c.strictSchema === !1 ? $e.nil : (0, $e._)`${i} && !${m}`;
      }
      function P() {
        const T = u.$async ? (0, $e._)`(${y}.async ? await ${m}(${s}) : ${m}(${s}))` : (0, $e._)`${m}(${s})`, N = (0, $e._)`(typeof ${m} == "function" ? ${T} : ${m}.test(${s}))`;
        return (0, $e._)`${m} && ${m} !== true && ${$} === ${e} && !${N}`;
      }
    }
    function _() {
      const v = f.formats[o];
      if (!v) {
        w();
        return;
      }
      if (v === !0)
        return;
      const [y, $, m] = P(v);
      y === e && t.pass(T());
      function w() {
        if (c.strictSchema === !1) {
          f.logger.warn(N());
          return;
        }
        throw new Error(N());
        function N() {
          return `unknown format "${o}" ignored in schema at path "${d}"`;
        }
      }
      function P(N) {
        const V = N instanceof RegExp ? (0, $e.regexpCode)(N) : c.code.formats ? (0, $e._)`${c.code.formats}${(0, $e.getProperty)(o)}` : void 0, H = r.scopeValue("formats", { key: o, ref: N, code: V });
        return typeof N == "object" && !(N instanceof RegExp) ? [N.type || "string", N.validate, (0, $e._)`${H}.validate`] : ["string", N, H];
      }
      function T() {
        if (typeof v == "object" && !(v instanceof RegExp) && v.async) {
          if (!u.$async)
            throw new Error("async format in sync schema");
          return (0, $e._)`await ${m}(${s})`;
        }
        return typeof $ == "function" ? (0, $e._)`${m}(${s})` : (0, $e._)`${m}.test(${s})`;
      }
    }
  }
};
ec.default = xv;
Object.defineProperty(Qa, "__esModule", { value: !0 });
const qv = ec, Bv = [qv.default];
Qa.default = Bv;
var ns = {};
Object.defineProperty(ns, "__esModule", { value: !0 });
ns.contentVocabulary = ns.metadataVocabulary = void 0;
ns.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
ns.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(pa, "__esModule", { value: !0 });
const Gv = ya, Hv = ga, Wv = Ra, Jv = xa, Xv = Ga, Yv = Xa, Zv = Qa, lu = ns, Qv = [
  Jv.default,
  Gv.default,
  Hv.default,
  (0, Wv.default)(!0),
  Zv.default,
  lu.metadataVocabulary,
  lu.contentVocabulary,
  Xv.default,
  Yv.default
];
pa.default = Qv;
var tc = {}, bo = {};
Object.defineProperty(bo, "__esModule", { value: !0 });
bo.DiscrError = void 0;
var uu;
(function(t) {
  t.Tag = "tag", t.Mapping = "mapping";
})(uu || (bo.DiscrError = uu = {}));
Object.defineProperty(tc, "__esModule", { value: !0 });
const xr = ee, Di = bo, du = Fe, ew = us, tw = j, rw = {
  message: ({ params: { discrError: t, tagName: e } }) => t === Di.DiscrError.Tag ? `tag "${e}" must be string` : `value of tag "${e}" must be in oneOf`,
  params: ({ params: { discrError: t, tag: e, tagName: r } }) => (0, xr._)`{error: ${t}, tag: ${r}, tagValue: ${e}}`
}, sw = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: rw,
  code(t) {
    const { gen: e, data: r, schema: s, parentSchema: n, it: o } = t, { oneOf: i } = n;
    if (!o.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const a = s.propertyName;
    if (typeof a != "string")
      throw new Error("discriminator: requires propertyName");
    if (s.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!i)
      throw new Error("discriminator: requires oneOf keyword");
    const c = e.let("valid", !1), d = e.const("tag", (0, xr._)`${r}${(0, xr.getProperty)(a)}`);
    e.if((0, xr._)`typeof ${d} == "string"`, () => u(), () => t.error(!1, { discrError: Di.DiscrError.Tag, tag: d, tagName: a })), t.ok(c);
    function u() {
      const _ = E();
      e.if(!1);
      for (const v in _)
        e.elseIf((0, xr._)`${d} === ${v}`), e.assign(c, f(_[v]));
      e.else(), t.error(!1, { discrError: Di.DiscrError.Mapping, tag: d, tagName: a }), e.endIf();
    }
    function f(_) {
      const v = e.name("valid"), y = t.subschema({ keyword: "oneOf", schemaProp: _ }, v);
      return t.mergeEvaluated(y, xr.Name), v;
    }
    function E() {
      var _;
      const v = {}, y = m(n);
      let $ = !0;
      for (let T = 0; T < i.length; T++) {
        let N = i[T];
        if (N != null && N.$ref && !(0, tw.schemaHasRulesButRef)(N, o.self.RULES)) {
          const H = N.$ref;
          if (N = du.resolveRef.call(o.self, o.schemaEnv.root, o.baseId, H), N instanceof du.SchemaEnv && (N = N.schema), N === void 0)
            throw new ew.default(o.opts.uriResolver, o.baseId, H);
        }
        const V = (_ = N == null ? void 0 : N.properties) === null || _ === void 0 ? void 0 : _[a];
        if (typeof V != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${a}"`);
        $ = $ && (y || m(N)), w(V, T);
      }
      if (!$)
        throw new Error(`discriminator: "${a}" must be required`);
      return v;
      function m({ required: T }) {
        return Array.isArray(T) && T.includes(a);
      }
      function w(T, N) {
        if (T.const)
          P(T.const, N);
        else if (T.enum)
          for (const V of T.enum)
            P(V, N);
        else
          throw new Error(`discriminator: "properties/${a}" must have "const" or "enum"`);
      }
      function P(T, N) {
        if (typeof T != "string" || T in v)
          throw new Error(`discriminator: "${a}" values must be unique strings`);
        v[T] = N;
      }
    }
  }
};
tc.default = sw;
var rc = {};
const nw = "https://json-schema.org/draft/2020-12/schema", ow = "https://json-schema.org/draft/2020-12/schema", iw = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0,
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0,
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
  "https://json-schema.org/draft/2020-12/vocab/validation": !0,
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, aw = "meta", cw = "Core and Validation specifications meta-schema", lw = [
  {
    $ref: "meta/core"
  },
  {
    $ref: "meta/applicator"
  },
  {
    $ref: "meta/unevaluated"
  },
  {
    $ref: "meta/validation"
  },
  {
    $ref: "meta/meta-data"
  },
  {
    $ref: "meta/format-annotation"
  },
  {
    $ref: "meta/content"
  }
], uw = [
  "object",
  "boolean"
], dw = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.", fw = {
  definitions: {
    $comment: '"definitions" has been replaced by "$defs".',
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    deprecated: !0,
    default: {}
  },
  dependencies: {
    $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $dynamicRef: "#meta"
        },
        {
          $ref: "meta/validation#/$defs/stringArray"
        }
      ]
    },
    deprecated: !0,
    default: {}
  },
  $recursiveAnchor: {
    $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
    $ref: "meta/core#/$defs/anchorString",
    deprecated: !0
  },
  $recursiveRef: {
    $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
    $ref: "meta/core#/$defs/uriReferenceString",
    deprecated: !0
  }
}, hw = {
  $schema: nw,
  $id: ow,
  $vocabulary: iw,
  $dynamicAnchor: aw,
  title: cw,
  allOf: lw,
  type: uw,
  $comment: dw,
  properties: fw
}, mw = "https://json-schema.org/draft/2020-12/schema", pw = "https://json-schema.org/draft/2020-12/meta/applicator", yw = {
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0
}, $w = "meta", gw = "Applicator vocabulary meta-schema", _w = [
  "object",
  "boolean"
], vw = {
  prefixItems: {
    $ref: "#/$defs/schemaArray"
  },
  items: {
    $dynamicRef: "#meta"
  },
  contains: {
    $dynamicRef: "#meta"
  },
  additionalProperties: {
    $dynamicRef: "#meta"
  },
  properties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    default: {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    propertyNames: {
      format: "regex"
    },
    default: {}
  },
  dependentSchemas: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    default: {}
  },
  propertyNames: {
    $dynamicRef: "#meta"
  },
  if: {
    $dynamicRef: "#meta"
  },
  then: {
    $dynamicRef: "#meta"
  },
  else: {
    $dynamicRef: "#meta"
  },
  allOf: {
    $ref: "#/$defs/schemaArray"
  },
  anyOf: {
    $ref: "#/$defs/schemaArray"
  },
  oneOf: {
    $ref: "#/$defs/schemaArray"
  },
  not: {
    $dynamicRef: "#meta"
  }
}, ww = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $dynamicRef: "#meta"
    }
  }
}, Ew = {
  $schema: mw,
  $id: pw,
  $vocabulary: yw,
  $dynamicAnchor: $w,
  title: gw,
  type: _w,
  properties: vw,
  $defs: ww
}, Sw = "https://json-schema.org/draft/2020-12/schema", bw = "https://json-schema.org/draft/2020-12/meta/unevaluated", Pw = {
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0
}, kw = "meta", Tw = "Unevaluated applicator vocabulary meta-schema", Nw = [
  "object",
  "boolean"
], Ow = {
  unevaluatedItems: {
    $dynamicRef: "#meta"
  },
  unevaluatedProperties: {
    $dynamicRef: "#meta"
  }
}, Rw = {
  $schema: Sw,
  $id: bw,
  $vocabulary: Pw,
  $dynamicAnchor: kw,
  title: Tw,
  type: Nw,
  properties: Ow
}, Iw = "https://json-schema.org/draft/2020-12/schema", Aw = "https://json-schema.org/draft/2020-12/meta/content", jw = {
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, Cw = "meta", Dw = "Content vocabulary meta-schema", Mw = [
  "object",
  "boolean"
], Lw = {
  contentEncoding: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentSchema: {
    $dynamicRef: "#meta"
  }
}, Fw = {
  $schema: Iw,
  $id: Aw,
  $vocabulary: jw,
  $dynamicAnchor: Cw,
  title: Dw,
  type: Mw,
  properties: Lw
}, Uw = "https://json-schema.org/draft/2020-12/schema", Vw = "https://json-schema.org/draft/2020-12/meta/core", zw = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0
}, Kw = "meta", xw = "Core vocabulary meta-schema", qw = [
  "object",
  "boolean"
], Bw = {
  $id: {
    $ref: "#/$defs/uriReferenceString",
    $comment: "Non-empty fragments not allowed.",
    pattern: "^[^#]*#?$"
  },
  $schema: {
    $ref: "#/$defs/uriString"
  },
  $ref: {
    $ref: "#/$defs/uriReferenceString"
  },
  $anchor: {
    $ref: "#/$defs/anchorString"
  },
  $dynamicRef: {
    $ref: "#/$defs/uriReferenceString"
  },
  $dynamicAnchor: {
    $ref: "#/$defs/anchorString"
  },
  $vocabulary: {
    type: "object",
    propertyNames: {
      $ref: "#/$defs/uriString"
    },
    additionalProperties: {
      type: "boolean"
    }
  },
  $comment: {
    type: "string"
  },
  $defs: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    }
  }
}, Gw = {
  anchorString: {
    type: "string",
    pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
  },
  uriString: {
    type: "string",
    format: "uri"
  },
  uriReferenceString: {
    type: "string",
    format: "uri-reference"
  }
}, Hw = {
  $schema: Uw,
  $id: Vw,
  $vocabulary: zw,
  $dynamicAnchor: Kw,
  title: xw,
  type: qw,
  properties: Bw,
  $defs: Gw
}, Ww = "https://json-schema.org/draft/2020-12/schema", Jw = "https://json-schema.org/draft/2020-12/meta/format-annotation", Xw = {
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0
}, Yw = "meta", Zw = "Format vocabulary meta-schema for annotation results", Qw = [
  "object",
  "boolean"
], eE = {
  format: {
    type: "string"
  }
}, tE = {
  $schema: Ww,
  $id: Jw,
  $vocabulary: Xw,
  $dynamicAnchor: Yw,
  title: Zw,
  type: Qw,
  properties: eE
}, rE = "https://json-schema.org/draft/2020-12/schema", sE = "https://json-schema.org/draft/2020-12/meta/meta-data", nE = {
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0
}, oE = "meta", iE = "Meta-data vocabulary meta-schema", aE = [
  "object",
  "boolean"
], cE = {
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  default: !0,
  deprecated: {
    type: "boolean",
    default: !1
  },
  readOnly: {
    type: "boolean",
    default: !1
  },
  writeOnly: {
    type: "boolean",
    default: !1
  },
  examples: {
    type: "array",
    items: !0
  }
}, lE = {
  $schema: rE,
  $id: sE,
  $vocabulary: nE,
  $dynamicAnchor: oE,
  title: iE,
  type: aE,
  properties: cE
}, uE = "https://json-schema.org/draft/2020-12/schema", dE = "https://json-schema.org/draft/2020-12/meta/validation", fE = {
  "https://json-schema.org/draft/2020-12/vocab/validation": !0
}, hE = "meta", mE = "Validation vocabulary meta-schema", pE = [
  "object",
  "boolean"
], yE = {
  type: {
    anyOf: [
      {
        $ref: "#/$defs/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/$defs/simpleTypes"
        },
        minItems: 1,
        uniqueItems: !0
      }
    ]
  },
  const: !0,
  enum: {
    type: "array",
    items: !0
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  maxItems: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    default: !1
  },
  maxContains: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minContains: {
    $ref: "#/$defs/nonNegativeInteger",
    default: 1
  },
  maxProperties: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/$defs/stringArray"
  },
  dependentRequired: {
    type: "object",
    additionalProperties: {
      $ref: "#/$defs/stringArray"
    }
  }
}, $E = {
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    $ref: "#/$defs/nonNegativeInteger",
    default: 0
  },
  simpleTypes: {
    enum: [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: !0,
    default: []
  }
}, gE = {
  $schema: uE,
  $id: dE,
  $vocabulary: fE,
  $dynamicAnchor: hE,
  title: mE,
  type: pE,
  properties: yE,
  $defs: $E
};
Object.defineProperty(rc, "__esModule", { value: !0 });
const _E = hw, vE = Ew, wE = Rw, EE = Fw, SE = Hw, bE = tE, PE = lE, kE = gE, TE = ["/properties"];
function NE(t) {
  return [
    _E,
    vE,
    wE,
    EE,
    SE,
    e(this, bE),
    PE,
    e(this, kE)
  ].forEach((r) => this.addMetaSchema(r, void 0, !1)), this;
  function e(r, s) {
    return t ? r.$dataMetaSchema(s, TE) : s;
  }
}
rc.default = NE;
(function(t, e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.MissingRefError = e.ValidationError = e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = e.Ajv2020 = void 0;
  const r = zd, s = pa, n = tc, o = rc, i = "https://json-schema.org/draft/2020-12/schema";
  class a extends r.default {
    constructor(_ = {}) {
      super({
        ..._,
        dynamicRef: !0,
        next: !0,
        unevaluated: !0
      });
    }
    _addVocabularies() {
      super._addVocabularies(), s.default.forEach((_) => this.addVocabulary(_)), this.opts.discriminator && this.addKeyword(n.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      const { $data: _, meta: v } = this.opts;
      v && (o.default.call(this, _), this.refs["http://json-schema.org/schema"] = i);
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(i) ? i : void 0);
    }
  }
  e.Ajv2020 = a, t.exports = e = a, t.exports.Ajv2020 = a, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = a;
  var c = dt;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return c.KeywordCxt;
  } });
  var d = ee;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return d._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return d.str;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return d.stringify;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return d.nil;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return d.Name;
  } }), Object.defineProperty(e, "CodeGen", { enumerable: !0, get: function() {
    return d.CodeGen;
  } });
  var u = tn;
  Object.defineProperty(e, "ValidationError", { enumerable: !0, get: function() {
    return u.default;
  } });
  var f = us;
  Object.defineProperty(e, "MissingRefError", { enumerable: !0, get: function() {
    return f.default;
  } });
})(Ni, Ni.exports);
var OE = Ni.exports, Mi = { exports: {} }, zf = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.formatNames = t.fastFormats = t.fullFormats = void 0;
  function e(K, G) {
    return { validate: K, compare: G };
  }
  t.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: e(o, i),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: e(c(!0), d),
    "date-time": e(E(!0), _),
    "iso-time": e(c(), u),
    "iso-date-time": e(E(), v),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: m,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex: ye,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte: P,
    // signed 32 bit integer
    int32: { type: "number", validate: V },
    // signed 64 bit integer
    int64: { type: "number", validate: H },
    // C-type float
    float: { type: "number", validate: ce },
    // C-type double
    double: { type: "number", validate: ce },
    // hint to the UI to hide input strings
    password: !0,
    // unchecked string payload
    binary: !0
  }, t.fastFormats = {
    ...t.fullFormats,
    date: e(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, i),
    time: e(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, d),
    "date-time": e(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, _),
    "iso-time": e(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, u),
    "iso-date-time": e(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, v),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  }, t.formatNames = Object.keys(t.fullFormats);
  function r(K) {
    return K % 4 === 0 && (K % 100 !== 0 || K % 400 === 0);
  }
  const s = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, n = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function o(K) {
    const G = s.exec(K);
    if (!G)
      return !1;
    const ae = +G[1], R = +G[2], A = +G[3];
    return R >= 1 && R <= 12 && A >= 1 && A <= (R === 2 && r(ae) ? 29 : n[R]);
  }
  function i(K, G) {
    if (K && G)
      return K > G ? 1 : K < G ? -1 : 0;
  }
  const a = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function c(K) {
    return function(ae) {
      const R = a.exec(ae);
      if (!R)
        return !1;
      const A = +R[1], F = +R[2], M = +R[3], B = R[4], L = R[5] === "-" ? -1 : 1, k = +(R[6] || 0), p = +(R[7] || 0);
      if (k > 23 || p > 59 || K && !B)
        return !1;
      if (A <= 23 && F <= 59 && M < 60)
        return !0;
      const b = F - p * L, g = A - k * L - (b < 0 ? 1 : 0);
      return (g === 23 || g === -1) && (b === 59 || b === -1) && M < 61;
    };
  }
  function d(K, G) {
    if (!(K && G))
      return;
    const ae = (/* @__PURE__ */ new Date("2020-01-01T" + K)).valueOf(), R = (/* @__PURE__ */ new Date("2020-01-01T" + G)).valueOf();
    if (ae && R)
      return ae - R;
  }
  function u(K, G) {
    if (!(K && G))
      return;
    const ae = a.exec(K), R = a.exec(G);
    if (ae && R)
      return K = ae[1] + ae[2] + ae[3], G = R[1] + R[2] + R[3], K > G ? 1 : K < G ? -1 : 0;
  }
  const f = /t|\s/i;
  function E(K) {
    const G = c(K);
    return function(R) {
      const A = R.split(f);
      return A.length === 2 && o(A[0]) && G(A[1]);
    };
  }
  function _(K, G) {
    if (!(K && G))
      return;
    const ae = new Date(K).valueOf(), R = new Date(G).valueOf();
    if (ae && R)
      return ae - R;
  }
  function v(K, G) {
    if (!(K && G))
      return;
    const [ae, R] = K.split(f), [A, F] = G.split(f), M = i(ae, A);
    if (M !== void 0)
      return M || d(R, F);
  }
  const y = /\/|:/, $ = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function m(K) {
    return y.test(K) && $.test(K);
  }
  const w = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function P(K) {
    return w.lastIndex = 0, w.test(K);
  }
  const T = -2147483648, N = 2 ** 31 - 1;
  function V(K) {
    return Number.isInteger(K) && K <= N && K >= T;
  }
  function H(K) {
    return Number.isInteger(K);
  }
  function ce() {
    return !0;
  }
  const fe = /[^\\]\\Z/;
  function ye(K) {
    if (fe.test(K))
      return !1;
    try {
      return new RegExp(K), !0;
    } catch {
      return !1;
    }
  }
})(zf);
var Kf = {}, Li = { exports: {} }, xf = {}, ft = {}, os = {}, sn = {}, se = {}, Js = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.regexpCode = t.getEsmExportName = t.getProperty = t.safeStringify = t.stringify = t.strConcat = t.addCodeArg = t.str = t._ = t.nil = t._Code = t.Name = t.IDENTIFIER = t._CodeOrName = void 0;
  class e {
  }
  t._CodeOrName = e, t.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends e {
    constructor(w) {
      if (super(), !t.IDENTIFIER.test(w))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = w;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  t.Name = r;
  class s extends e {
    constructor(w) {
      super(), this._items = typeof w == "string" ? [w] : w;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const w = this._items[0];
      return w === "" || w === '""';
    }
    get str() {
      var w;
      return (w = this._str) !== null && w !== void 0 ? w : this._str = this._items.reduce((P, T) => `${P}${T}`, "");
    }
    get names() {
      var w;
      return (w = this._names) !== null && w !== void 0 ? w : this._names = this._items.reduce((P, T) => (T instanceof r && (P[T.str] = (P[T.str] || 0) + 1), P), {});
    }
  }
  t._Code = s, t.nil = new s("");
  function n(m, ...w) {
    const P = [m[0]];
    let T = 0;
    for (; T < w.length; )
      a(P, w[T]), P.push(m[++T]);
    return new s(P);
  }
  t._ = n;
  const o = new s("+");
  function i(m, ...w) {
    const P = [_(m[0])];
    let T = 0;
    for (; T < w.length; )
      P.push(o), a(P, w[T]), P.push(o, _(m[++T]));
    return c(P), new s(P);
  }
  t.str = i;
  function a(m, w) {
    w instanceof s ? m.push(...w._items) : w instanceof r ? m.push(w) : m.push(f(w));
  }
  t.addCodeArg = a;
  function c(m) {
    let w = 1;
    for (; w < m.length - 1; ) {
      if (m[w] === o) {
        const P = d(m[w - 1], m[w + 1]);
        if (P !== void 0) {
          m.splice(w - 1, 3, P);
          continue;
        }
        m[w++] = "+";
      }
      w++;
    }
  }
  function d(m, w) {
    if (w === '""')
      return m;
    if (m === '""')
      return w;
    if (typeof m == "string")
      return w instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof w != "string" ? `${m.slice(0, -1)}${w}"` : w[0] === '"' ? m.slice(0, -1) + w.slice(1) : void 0;
    if (typeof w == "string" && w[0] === '"' && !(m instanceof r))
      return `"${m}${w.slice(1)}`;
  }
  function u(m, w) {
    return w.emptyStr() ? m : m.emptyStr() ? w : i`${m}${w}`;
  }
  t.strConcat = u;
  function f(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : _(Array.isArray(m) ? m.join(",") : m);
  }
  function E(m) {
    return new s(_(m));
  }
  t.stringify = E;
  function _(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  t.safeStringify = _;
  function v(m) {
    return typeof m == "string" && t.IDENTIFIER.test(m) ? new s(`.${m}`) : n`[${m}]`;
  }
  t.getProperty = v;
  function y(m) {
    if (typeof m == "string" && t.IDENTIFIER.test(m))
      return new s(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  t.getEsmExportName = y;
  function $(m) {
    return new s(m.toString());
  }
  t.regexpCode = $;
})(Js);
var Fi = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.ValueScope = t.ValueScopeName = t.Scope = t.varKinds = t.UsedValueState = void 0;
  const e = Js;
  class r extends Error {
    constructor(d) {
      super(`CodeGen: "code" for ${d} not defined`), this.value = d.value;
    }
  }
  var s;
  (function(c) {
    c[c.Started = 0] = "Started", c[c.Completed = 1] = "Completed";
  })(s || (t.UsedValueState = s = {})), t.varKinds = {
    const: new e.Name("const"),
    let: new e.Name("let"),
    var: new e.Name("var")
  };
  class n {
    constructor({ prefixes: d, parent: u } = {}) {
      this._names = {}, this._prefixes = d, this._parent = u;
    }
    toName(d) {
      return d instanceof e.Name ? d : this.name(d);
    }
    name(d) {
      return new e.Name(this._newName(d));
    }
    _newName(d) {
      const u = this._names[d] || this._nameGroup(d);
      return `${d}${u.index++}`;
    }
    _nameGroup(d) {
      var u, f;
      if (!((f = (u = this._parent) === null || u === void 0 ? void 0 : u._prefixes) === null || f === void 0) && f.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  t.Scope = n;
  class o extends e.Name {
    constructor(d, u) {
      super(u), this.prefix = d;
    }
    setValue(d, { property: u, itemIndex: f }) {
      this.value = d, this.scopePath = (0, e._)`.${new e.Name(u)}[${f}]`;
    }
  }
  t.ValueScopeName = o;
  const i = (0, e._)`\n`;
  class a extends n {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? i : e.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new o(d, this._newName(d));
    }
    value(d, u) {
      var f;
      if (u.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const E = this.toName(d), { prefix: _ } = E, v = (f = u.key) !== null && f !== void 0 ? f : u.ref;
      let y = this._values[_];
      if (y) {
        const w = y.get(v);
        if (w)
          return w;
      } else
        y = this._values[_] = /* @__PURE__ */ new Map();
      y.set(v, E);
      const $ = this._scope[_] || (this._scope[_] = []), m = $.length;
      return $[m] = u.ref, E.setValue(u, { property: _, itemIndex: m }), E;
    }
    getValue(d, u) {
      const f = this._values[d];
      if (f)
        return f.get(u);
    }
    scopeRefs(d, u = this._values) {
      return this._reduceValues(u, (f) => {
        if (f.scopePath === void 0)
          throw new Error(`CodeGen: name "${f}" has no value`);
        return (0, e._)`${d}${f.scopePath}`;
      });
    }
    scopeCode(d = this._values, u, f) {
      return this._reduceValues(d, (E) => {
        if (E.value === void 0)
          throw new Error(`CodeGen: name "${E}" has no value`);
        return E.value.code;
      }, u, f);
    }
    _reduceValues(d, u, f = {}, E) {
      let _ = e.nil;
      for (const v in d) {
        const y = d[v];
        if (!y)
          continue;
        const $ = f[v] = f[v] || /* @__PURE__ */ new Map();
        y.forEach((m) => {
          if ($.has(m))
            return;
          $.set(m, s.Started);
          let w = u(m);
          if (w) {
            const P = this.opts.es5 ? t.varKinds.var : t.varKinds.const;
            _ = (0, e._)`${_}${P} ${m} = ${w};${this.opts._n}`;
          } else if (w = E == null ? void 0 : E(m))
            _ = (0, e._)`${_}${w}${this.opts._n}`;
          else
            throw new r(m);
          $.set(m, s.Completed);
        });
      }
      return _;
    }
  }
  t.ValueScope = a;
})(Fi);
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.or = t.and = t.not = t.CodeGen = t.operators = t.varKinds = t.ValueScopeName = t.ValueScope = t.Scope = t.Name = t.regexpCode = t.stringify = t.getProperty = t.nil = t.strConcat = t.str = t._ = void 0;
  const e = Js, r = Fi;
  var s = Js;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return s._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return s.str;
  } }), Object.defineProperty(t, "strConcat", { enumerable: !0, get: function() {
    return s.strConcat;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return s.nil;
  } }), Object.defineProperty(t, "getProperty", { enumerable: !0, get: function() {
    return s.getProperty;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return s.stringify;
  } }), Object.defineProperty(t, "regexpCode", { enumerable: !0, get: function() {
    return s.regexpCode;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return s.Name;
  } });
  var n = Fi;
  Object.defineProperty(t, "Scope", { enumerable: !0, get: function() {
    return n.Scope;
  } }), Object.defineProperty(t, "ValueScope", { enumerable: !0, get: function() {
    return n.ValueScope;
  } }), Object.defineProperty(t, "ValueScopeName", { enumerable: !0, get: function() {
    return n.ValueScopeName;
  } }), Object.defineProperty(t, "varKinds", { enumerable: !0, get: function() {
    return n.varKinds;
  } }), t.operators = {
    GT: new e._Code(">"),
    GTE: new e._Code(">="),
    LT: new e._Code("<"),
    LTE: new e._Code("<="),
    EQ: new e._Code("==="),
    NEQ: new e._Code("!=="),
    NOT: new e._Code("!"),
    OR: new e._Code("||"),
    AND: new e._Code("&&"),
    ADD: new e._Code("+")
  };
  class o {
    optimizeNodes() {
      return this;
    }
    optimizeNames(l, h) {
      return this;
    }
  }
  class i extends o {
    constructor(l, h, S) {
      super(), this.varKind = l, this.name = h, this.rhs = S;
    }
    render({ es5: l, _n: h }) {
      const S = l ? r.varKinds.var : this.varKind, O = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${S} ${this.name}${O};` + h;
    }
    optimizeNames(l, h) {
      if (l[this.name.str])
        return this.rhs && (this.rhs = R(this.rhs, l, h)), this;
    }
    get names() {
      return this.rhs instanceof e._CodeOrName ? this.rhs.names : {};
    }
  }
  class a extends o {
    constructor(l, h, S) {
      super(), this.lhs = l, this.rhs = h, this.sideEffects = S;
    }
    render({ _n: l }) {
      return `${this.lhs} = ${this.rhs};` + l;
    }
    optimizeNames(l, h) {
      if (!(this.lhs instanceof e.Name && !l[this.lhs.str] && !this.sideEffects))
        return this.rhs = R(this.rhs, l, h), this;
    }
    get names() {
      const l = this.lhs instanceof e.Name ? {} : { ...this.lhs.names };
      return ae(l, this.rhs);
    }
  }
  class c extends a {
    constructor(l, h, S, O) {
      super(l, S, O), this.op = h;
    }
    render({ _n: l }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + l;
    }
  }
  class d extends o {
    constructor(l) {
      super(), this.label = l, this.names = {};
    }
    render({ _n: l }) {
      return `${this.label}:` + l;
    }
  }
  class u extends o {
    constructor(l) {
      super(), this.label = l, this.names = {};
    }
    render({ _n: l }) {
      return `break${this.label ? ` ${this.label}` : ""};` + l;
    }
  }
  class f extends o {
    constructor(l) {
      super(), this.error = l;
    }
    render({ _n: l }) {
      return `throw ${this.error};` + l;
    }
    get names() {
      return this.error.names;
    }
  }
  class E extends o {
    constructor(l) {
      super(), this.code = l;
    }
    render({ _n: l }) {
      return `${this.code};` + l;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(l, h) {
      return this.code = R(this.code, l, h), this;
    }
    get names() {
      return this.code instanceof e._CodeOrName ? this.code.names : {};
    }
  }
  class _ extends o {
    constructor(l = []) {
      super(), this.nodes = l;
    }
    render(l) {
      return this.nodes.reduce((h, S) => h + S.render(l), "");
    }
    optimizeNodes() {
      const { nodes: l } = this;
      let h = l.length;
      for (; h--; ) {
        const S = l[h].optimizeNodes();
        Array.isArray(S) ? l.splice(h, 1, ...S) : S ? l[h] = S : l.splice(h, 1);
      }
      return l.length > 0 ? this : void 0;
    }
    optimizeNames(l, h) {
      const { nodes: S } = this;
      let O = S.length;
      for (; O--; ) {
        const I = S[O];
        I.optimizeNames(l, h) || (A(l, I.names), S.splice(O, 1));
      }
      return S.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((l, h) => G(l, h.names), {});
    }
  }
  class v extends _ {
    render(l) {
      return "{" + l._n + super.render(l) + "}" + l._n;
    }
  }
  class y extends _ {
  }
  class $ extends v {
  }
  $.kind = "else";
  class m extends v {
    constructor(l, h) {
      super(h), this.condition = l;
    }
    render(l) {
      let h = `if(${this.condition})` + super.render(l);
      return this.else && (h += "else " + this.else.render(l)), h;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const l = this.condition;
      if (l === !0)
        return this.nodes;
      let h = this.else;
      if (h) {
        const S = h.optimizeNodes();
        h = this.else = Array.isArray(S) ? new $(S) : S;
      }
      if (h)
        return l === !1 ? h instanceof m ? h : h.nodes : this.nodes.length ? this : new m(F(l), h instanceof m ? [h] : h.nodes);
      if (!(l === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(l, h) {
      var S;
      if (this.else = (S = this.else) === null || S === void 0 ? void 0 : S.optimizeNames(l, h), !!(super.optimizeNames(l, h) || this.else))
        return this.condition = R(this.condition, l, h), this;
    }
    get names() {
      const l = super.names;
      return ae(l, this.condition), this.else && G(l, this.else.names), l;
    }
  }
  m.kind = "if";
  class w extends v {
  }
  w.kind = "for";
  class P extends w {
    constructor(l) {
      super(), this.iteration = l;
    }
    render(l) {
      return `for(${this.iteration})` + super.render(l);
    }
    optimizeNames(l, h) {
      if (super.optimizeNames(l, h))
        return this.iteration = R(this.iteration, l, h), this;
    }
    get names() {
      return G(super.names, this.iteration.names);
    }
  }
  class T extends w {
    constructor(l, h, S, O) {
      super(), this.varKind = l, this.name = h, this.from = S, this.to = O;
    }
    render(l) {
      const h = l.es5 ? r.varKinds.var : this.varKind, { name: S, from: O, to: I } = this;
      return `for(${h} ${S}=${O}; ${S}<${I}; ${S}++)` + super.render(l);
    }
    get names() {
      const l = ae(super.names, this.from);
      return ae(l, this.to);
    }
  }
  class N extends w {
    constructor(l, h, S, O) {
      super(), this.loop = l, this.varKind = h, this.name = S, this.iterable = O;
    }
    render(l) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(l);
    }
    optimizeNames(l, h) {
      if (super.optimizeNames(l, h))
        return this.iterable = R(this.iterable, l, h), this;
    }
    get names() {
      return G(super.names, this.iterable.names);
    }
  }
  class V extends v {
    constructor(l, h, S) {
      super(), this.name = l, this.args = h, this.async = S;
    }
    render(l) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(l);
    }
  }
  V.kind = "func";
  class H extends _ {
    render(l) {
      return "return " + super.render(l);
    }
  }
  H.kind = "return";
  class ce extends v {
    render(l) {
      let h = "try" + super.render(l);
      return this.catch && (h += this.catch.render(l)), this.finally && (h += this.finally.render(l)), h;
    }
    optimizeNodes() {
      var l, h;
      return super.optimizeNodes(), (l = this.catch) === null || l === void 0 || l.optimizeNodes(), (h = this.finally) === null || h === void 0 || h.optimizeNodes(), this;
    }
    optimizeNames(l, h) {
      var S, O;
      return super.optimizeNames(l, h), (S = this.catch) === null || S === void 0 || S.optimizeNames(l, h), (O = this.finally) === null || O === void 0 || O.optimizeNames(l, h), this;
    }
    get names() {
      const l = super.names;
      return this.catch && G(l, this.catch.names), this.finally && G(l, this.finally.names), l;
    }
  }
  class fe extends v {
    constructor(l) {
      super(), this.error = l;
    }
    render(l) {
      return `catch(${this.error})` + super.render(l);
    }
  }
  fe.kind = "catch";
  class ye extends v {
    render(l) {
      return "finally" + super.render(l);
    }
  }
  ye.kind = "finally";
  class K {
    constructor(l, h = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...h, _n: h.lines ? `
` : "" }, this._extScope = l, this._scope = new r.Scope({ parent: l }), this._nodes = [new y()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(l) {
      return this._scope.name(l);
    }
    // reserves unique name in the external scope
    scopeName(l) {
      return this._extScope.name(l);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(l, h) {
      const S = this._extScope.value(l, h);
      return (this._values[S.prefix] || (this._values[S.prefix] = /* @__PURE__ */ new Set())).add(S), S;
    }
    getScopeValue(l, h) {
      return this._extScope.getValue(l, h);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(l) {
      return this._extScope.scopeRefs(l, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(l, h, S, O) {
      const I = this._scope.toName(h);
      return S !== void 0 && O && (this._constants[I.str] = S), this._leafNode(new i(l, I, S)), I;
    }
    // `const` declaration (`var` in es5 mode)
    const(l, h, S) {
      return this._def(r.varKinds.const, l, h, S);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(l, h, S) {
      return this._def(r.varKinds.let, l, h, S);
    }
    // `var` declaration with optional assignment
    var(l, h, S) {
      return this._def(r.varKinds.var, l, h, S);
    }
    // assignment code
    assign(l, h, S) {
      return this._leafNode(new a(l, h, S));
    }
    // `+=` code
    add(l, h) {
      return this._leafNode(new c(l, t.operators.ADD, h));
    }
    // appends passed SafeExpr to code or executes Block
    code(l) {
      return typeof l == "function" ? l() : l !== e.nil && this._leafNode(new E(l)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...l) {
      const h = ["{"];
      for (const [S, O] of l)
        h.length > 1 && h.push(","), h.push(S), (S !== O || this.opts.es5) && (h.push(":"), (0, e.addCodeArg)(h, O));
      return h.push("}"), new e._Code(h);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(l, h, S) {
      if (this._blockNode(new m(l)), h && S)
        this.code(h).else().code(S).endIf();
      else if (h)
        this.code(h).endIf();
      else if (S)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(l) {
      return this._elseNode(new m(l));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new $());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, $);
    }
    _for(l, h) {
      return this._blockNode(l), h && this.code(h).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(l, h) {
      return this._for(new P(l), h);
    }
    // `for` statement for a range of values
    forRange(l, h, S, O, I = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const z = this._scope.toName(l);
      return this._for(new T(I, z, h, S), () => O(z));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(l, h, S, O = r.varKinds.const) {
      const I = this._scope.toName(l);
      if (this.opts.es5) {
        const z = h instanceof e.Name ? h : this.var("_arr", h);
        return this.forRange("_i", 0, (0, e._)`${z}.length`, (U) => {
          this.var(I, (0, e._)`${z}[${U}]`), S(I);
        });
      }
      return this._for(new N("of", O, I, h), () => S(I));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(l, h, S, O = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(l, (0, e._)`Object.keys(${h})`, S);
      const I = this._scope.toName(l);
      return this._for(new N("in", O, I, h), () => S(I));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(w);
    }
    // `label` statement
    label(l) {
      return this._leafNode(new d(l));
    }
    // `break` statement
    break(l) {
      return this._leafNode(new u(l));
    }
    // `return` statement
    return(l) {
      const h = new H();
      if (this._blockNode(h), this.code(l), h.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(H);
    }
    // `try` statement
    try(l, h, S) {
      if (!h && !S)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const O = new ce();
      if (this._blockNode(O), this.code(l), h) {
        const I = this.name("e");
        this._currNode = O.catch = new fe(I), h(I);
      }
      return S && (this._currNode = O.finally = new ye(), this.code(S)), this._endBlockNode(fe, ye);
    }
    // `throw` statement
    throw(l) {
      return this._leafNode(new f(l));
    }
    // start self-balancing block
    block(l, h) {
      return this._blockStarts.push(this._nodes.length), l && this.code(l).endBlock(h), this;
    }
    // end the current self-balancing block
    endBlock(l) {
      const h = this._blockStarts.pop();
      if (h === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const S = this._nodes.length - h;
      if (S < 0 || l !== void 0 && S !== l)
        throw new Error(`CodeGen: wrong number of nodes: ${S} vs ${l} expected`);
      return this._nodes.length = h, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(l, h = e.nil, S, O) {
      return this._blockNode(new V(l, h, S)), O && this.code(O).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(V);
    }
    optimize(l = 1) {
      for (; l-- > 0; )
        this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(l) {
      return this._currNode.nodes.push(l), this;
    }
    _blockNode(l) {
      this._currNode.nodes.push(l), this._nodes.push(l);
    }
    _endBlockNode(l, h) {
      const S = this._currNode;
      if (S instanceof l || h && S instanceof h)
        return this._nodes.pop(), this;
      throw new Error(`CodeGen: not in block "${h ? `${l.kind}/${h.kind}` : l.kind}"`);
    }
    _elseNode(l) {
      const h = this._currNode;
      if (!(h instanceof m))
        throw new Error('CodeGen: "else" without "if"');
      return this._currNode = h.else = l, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const l = this._nodes;
      return l[l.length - 1];
    }
    set _currNode(l) {
      const h = this._nodes;
      h[h.length - 1] = l;
    }
  }
  t.CodeGen = K;
  function G(g, l) {
    for (const h in l)
      g[h] = (g[h] || 0) + (l[h] || 0);
    return g;
  }
  function ae(g, l) {
    return l instanceof e._CodeOrName ? G(g, l.names) : g;
  }
  function R(g, l, h) {
    if (g instanceof e.Name)
      return S(g);
    if (!O(g))
      return g;
    return new e._Code(g._items.reduce((I, z) => (z instanceof e.Name && (z = S(z)), z instanceof e._Code ? I.push(...z._items) : I.push(z), I), []));
    function S(I) {
      const z = h[I.str];
      return z === void 0 || l[I.str] !== 1 ? I : (delete l[I.str], z);
    }
    function O(I) {
      return I instanceof e._Code && I._items.some((z) => z instanceof e.Name && l[z.str] === 1 && h[z.str] !== void 0);
    }
  }
  function A(g, l) {
    for (const h in l)
      g[h] = (g[h] || 0) - (l[h] || 0);
  }
  function F(g) {
    return typeof g == "boolean" || typeof g == "number" || g === null ? !g : (0, e._)`!${b(g)}`;
  }
  t.not = F;
  const M = p(t.operators.AND);
  function B(...g) {
    return g.reduce(M);
  }
  t.and = B;
  const L = p(t.operators.OR);
  function k(...g) {
    return g.reduce(L);
  }
  t.or = k;
  function p(g) {
    return (l, h) => l === e.nil ? h : h === e.nil ? l : (0, e._)`${b(l)} ${g} ${b(h)}`;
  }
  function b(g) {
    return g instanceof e.Name ? g : (0, e._)`(${g})`;
  }
})(se);
var D = {};
Object.defineProperty(D, "__esModule", { value: !0 });
D.checkStrictMode = D.getErrorPath = D.Type = D.useFunc = D.setEvaluated = D.evaluatedPropsToName = D.mergeEvaluated = D.eachItem = D.unescapeJsonPointer = D.escapeJsonPointer = D.escapeFragment = D.unescapeFragment = D.schemaRefOrVal = D.schemaHasRulesButRef = D.schemaHasRules = D.checkUnknownRules = D.alwaysValidSchema = D.toHash = void 0;
const ue = se, RE = Js;
function IE(t) {
  const e = {};
  for (const r of t)
    e[r] = !0;
  return e;
}
D.toHash = IE;
function AE(t, e) {
  return typeof e == "boolean" ? e : Object.keys(e).length === 0 ? !0 : (qf(t, e), !Bf(e, t.self.RULES.all));
}
D.alwaysValidSchema = AE;
function qf(t, e = t.schema) {
  const { opts: r, self: s } = t;
  if (!r.strictSchema || typeof e == "boolean")
    return;
  const n = s.RULES.keywords;
  for (const o in e)
    n[o] || Wf(t, `unknown keyword: "${o}"`);
}
D.checkUnknownRules = qf;
function Bf(t, e) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (e[r])
      return !0;
  return !1;
}
D.schemaHasRules = Bf;
function jE(t, e) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (r !== "$ref" && e.all[r])
      return !0;
  return !1;
}
D.schemaHasRulesButRef = jE;
function CE({ topSchemaRef: t, schemaPath: e }, r, s, n) {
  if (!n) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, ue._)`${r}`;
  }
  return (0, ue._)`${t}${e}${(0, ue.getProperty)(s)}`;
}
D.schemaRefOrVal = CE;
function DE(t) {
  return Gf(decodeURIComponent(t));
}
D.unescapeFragment = DE;
function ME(t) {
  return encodeURIComponent(sc(t));
}
D.escapeFragment = ME;
function sc(t) {
  return typeof t == "number" ? `${t}` : t.replace(/~/g, "~0").replace(/\//g, "~1");
}
D.escapeJsonPointer = sc;
function Gf(t) {
  return t.replace(/~1/g, "/").replace(/~0/g, "~");
}
D.unescapeJsonPointer = Gf;
function LE(t, e) {
  if (Array.isArray(t))
    for (const r of t)
      e(r);
  else
    e(t);
}
D.eachItem = LE;
function fu({ mergeNames: t, mergeToName: e, mergeValues: r, resultToName: s }) {
  return (n, o, i, a) => {
    const c = i === void 0 ? o : i instanceof ue.Name ? (o instanceof ue.Name ? t(n, o, i) : e(n, o, i), i) : o instanceof ue.Name ? (e(n, i, o), o) : r(o, i);
    return a === ue.Name && !(c instanceof ue.Name) ? s(n, c) : c;
  };
}
D.mergeEvaluated = {
  props: fu({
    mergeNames: (t, e, r) => t.if((0, ue._)`${r} !== true && ${e} !== undefined`, () => {
      t.if((0, ue._)`${e} === true`, () => t.assign(r, !0), () => t.assign(r, (0, ue._)`${r} || {}`).code((0, ue._)`Object.assign(${r}, ${e})`));
    }),
    mergeToName: (t, e, r) => t.if((0, ue._)`${r} !== true`, () => {
      e === !0 ? t.assign(r, !0) : (t.assign(r, (0, ue._)`${r} || {}`), nc(t, r, e));
    }),
    mergeValues: (t, e) => t === !0 ? !0 : { ...t, ...e },
    resultToName: Hf
  }),
  items: fu({
    mergeNames: (t, e, r) => t.if((0, ue._)`${r} !== true && ${e} !== undefined`, () => t.assign(r, (0, ue._)`${e} === true ? true : ${r} > ${e} ? ${r} : ${e}`)),
    mergeToName: (t, e, r) => t.if((0, ue._)`${r} !== true`, () => t.assign(r, e === !0 ? !0 : (0, ue._)`${r} > ${e} ? ${r} : ${e}`)),
    mergeValues: (t, e) => t === !0 ? !0 : Math.max(t, e),
    resultToName: (t, e) => t.var("items", e)
  })
};
function Hf(t, e) {
  if (e === !0)
    return t.var("props", !0);
  const r = t.var("props", (0, ue._)`{}`);
  return e !== void 0 && nc(t, r, e), r;
}
D.evaluatedPropsToName = Hf;
function nc(t, e, r) {
  Object.keys(r).forEach((s) => t.assign((0, ue._)`${e}${(0, ue.getProperty)(s)}`, !0));
}
D.setEvaluated = nc;
const hu = {};
function FE(t, e) {
  return t.scopeValue("func", {
    ref: e,
    code: hu[e.code] || (hu[e.code] = new RE._Code(e.code))
  });
}
D.useFunc = FE;
var Ui;
(function(t) {
  t[t.Num = 0] = "Num", t[t.Str = 1] = "Str";
})(Ui || (D.Type = Ui = {}));
function UE(t, e, r) {
  if (t instanceof ue.Name) {
    const s = e === Ui.Num;
    return r ? s ? (0, ue._)`"[" + ${t} + "]"` : (0, ue._)`"['" + ${t} + "']"` : s ? (0, ue._)`"/" + ${t}` : (0, ue._)`"/" + ${t}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, ue.getProperty)(t).toString() : "/" + sc(t);
}
D.getErrorPath = UE;
function Wf(t, e, r = t.opts.strictSchema) {
  if (r) {
    if (e = `strict mode: ${e}`, r === !0)
      throw new Error(e);
    t.self.logger.warn(e);
  }
}
D.checkStrictMode = Wf;
var bt = {};
Object.defineProperty(bt, "__esModule", { value: !0 });
const je = se, VE = {
  // validation function arguments
  data: new je.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new je.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new je.Name("instancePath"),
  parentData: new je.Name("parentData"),
  parentDataProperty: new je.Name("parentDataProperty"),
  rootData: new je.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new je.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new je.Name("vErrors"),
  // null or array of validation errors
  errors: new je.Name("errors"),
  // counter of validation errors
  this: new je.Name("this"),
  // "globals"
  self: new je.Name("self"),
  scope: new je.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new je.Name("json"),
  jsonPos: new je.Name("jsonPos"),
  jsonLen: new je.Name("jsonLen"),
  jsonPart: new je.Name("jsonPart")
};
bt.default = VE;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.extendErrors = t.resetErrorsCount = t.reportExtraError = t.reportError = t.keyword$DataError = t.keywordError = void 0;
  const e = se, r = D, s = bt;
  t.keywordError = {
    message: ({ keyword: $ }) => (0, e.str)`must pass "${$}" keyword validation`
  }, t.keyword$DataError = {
    message: ({ keyword: $, schemaType: m }) => m ? (0, e.str)`"${$}" keyword must be ${m} ($data)` : (0, e.str)`"${$}" keyword is invalid ($data)`
  };
  function n($, m = t.keywordError, w, P) {
    const { it: T } = $, { gen: N, compositeRule: V, allErrors: H } = T, ce = f($, m, w);
    P ?? (V || H) ? c(N, ce) : d(T, (0, e._)`[${ce}]`);
  }
  t.reportError = n;
  function o($, m = t.keywordError, w) {
    const { it: P } = $, { gen: T, compositeRule: N, allErrors: V } = P, H = f($, m, w);
    c(T, H), N || V || d(P, s.default.vErrors);
  }
  t.reportExtraError = o;
  function i($, m) {
    $.assign(s.default.errors, m), $.if((0, e._)`${s.default.vErrors} !== null`, () => $.if(m, () => $.assign((0, e._)`${s.default.vErrors}.length`, m), () => $.assign(s.default.vErrors, null)));
  }
  t.resetErrorsCount = i;
  function a({ gen: $, keyword: m, schemaValue: w, data: P, errsCount: T, it: N }) {
    if (T === void 0)
      throw new Error("ajv implementation error");
    const V = $.name("err");
    $.forRange("i", T, s.default.errors, (H) => {
      $.const(V, (0, e._)`${s.default.vErrors}[${H}]`), $.if((0, e._)`${V}.instancePath === undefined`, () => $.assign((0, e._)`${V}.instancePath`, (0, e.strConcat)(s.default.instancePath, N.errorPath))), $.assign((0, e._)`${V}.schemaPath`, (0, e.str)`${N.errSchemaPath}/${m}`), N.opts.verbose && ($.assign((0, e._)`${V}.schema`, w), $.assign((0, e._)`${V}.data`, P));
    });
  }
  t.extendErrors = a;
  function c($, m) {
    const w = $.const("err", m);
    $.if((0, e._)`${s.default.vErrors} === null`, () => $.assign(s.default.vErrors, (0, e._)`[${w}]`), (0, e._)`${s.default.vErrors}.push(${w})`), $.code((0, e._)`${s.default.errors}++`);
  }
  function d($, m) {
    const { gen: w, validateName: P, schemaEnv: T } = $;
    T.$async ? w.throw((0, e._)`new ${$.ValidationError}(${m})`) : (w.assign((0, e._)`${P}.errors`, m), w.return(!1));
  }
  const u = {
    keyword: new e.Name("keyword"),
    schemaPath: new e.Name("schemaPath"),
    // also used in JTD errors
    params: new e.Name("params"),
    propertyName: new e.Name("propertyName"),
    message: new e.Name("message"),
    schema: new e.Name("schema"),
    parentSchema: new e.Name("parentSchema")
  };
  function f($, m, w) {
    const { createErrors: P } = $.it;
    return P === !1 ? (0, e._)`{}` : E($, m, w);
  }
  function E($, m, w = {}) {
    const { gen: P, it: T } = $, N = [
      _(T, w),
      v($, w)
    ];
    return y($, m, N), P.object(...N);
  }
  function _({ errorPath: $ }, { instancePath: m }) {
    const w = m ? (0, e.str)`${$}${(0, r.getErrorPath)(m, r.Type.Str)}` : $;
    return [s.default.instancePath, (0, e.strConcat)(s.default.instancePath, w)];
  }
  function v({ keyword: $, it: { errSchemaPath: m } }, { schemaPath: w, parentSchema: P }) {
    let T = P ? m : (0, e.str)`${m}/${$}`;
    return w && (T = (0, e.str)`${T}${(0, r.getErrorPath)(w, r.Type.Str)}`), [u.schemaPath, T];
  }
  function y($, { params: m, message: w }, P) {
    const { keyword: T, data: N, schemaValue: V, it: H } = $, { opts: ce, propertyName: fe, topSchemaRef: ye, schemaPath: K } = H;
    P.push([u.keyword, T], [u.params, typeof m == "function" ? m($) : m || (0, e._)`{}`]), ce.messages && P.push([u.message, typeof w == "function" ? w($) : w]), ce.verbose && P.push([u.schema, V], [u.parentSchema, (0, e._)`${ye}${K}`], [s.default.data, N]), fe && P.push([u.propertyName, fe]);
  }
})(sn);
Object.defineProperty(os, "__esModule", { value: !0 });
os.boolOrEmptySchema = os.topBoolOrEmptySchema = void 0;
const zE = sn, KE = se, xE = bt, qE = {
  message: "boolean schema is false"
};
function BE(t) {
  const { gen: e, schema: r, validateName: s } = t;
  r === !1 ? Jf(t, !1) : typeof r == "object" && r.$async === !0 ? e.return(xE.default.data) : (e.assign((0, KE._)`${s}.errors`, null), e.return(!0));
}
os.topBoolOrEmptySchema = BE;
function GE(t, e) {
  const { gen: r, schema: s } = t;
  s === !1 ? (r.var(e, !1), Jf(t)) : r.var(e, !0);
}
os.boolOrEmptySchema = GE;
function Jf(t, e) {
  const { gen: r, data: s } = t, n = {
    gen: r,
    keyword: "false schema",
    data: s,
    schema: !1,
    schemaCode: !1,
    schemaValue: !1,
    params: {},
    it: t
  };
  (0, zE.reportError)(n, qE, void 0, e);
}
var we = {}, jr = {};
Object.defineProperty(jr, "__esModule", { value: !0 });
jr.getRules = jr.isJSONType = void 0;
const HE = ["string", "number", "integer", "boolean", "null", "object", "array"], WE = new Set(HE);
function JE(t) {
  return typeof t == "string" && WE.has(t);
}
jr.isJSONType = JE;
function XE() {
  const t = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...t, integer: !0, boolean: !0, null: !0 },
    rules: [{ rules: [] }, t.number, t.string, t.array, t.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
jr.getRules = XE;
var It = {};
Object.defineProperty(It, "__esModule", { value: !0 });
It.shouldUseRule = It.shouldUseGroup = It.schemaHasRulesForType = void 0;
function YE({ schema: t, self: e }, r) {
  const s = e.RULES.types[r];
  return s && s !== !0 && Xf(t, s);
}
It.schemaHasRulesForType = YE;
function Xf(t, e) {
  return e.rules.some((r) => Yf(t, r));
}
It.shouldUseGroup = Xf;
function Yf(t, e) {
  var r;
  return t[e.keyword] !== void 0 || ((r = e.definition.implements) === null || r === void 0 ? void 0 : r.some((s) => t[s] !== void 0));
}
It.shouldUseRule = Yf;
Object.defineProperty(we, "__esModule", { value: !0 });
we.reportTypeError = we.checkDataTypes = we.checkDataType = we.coerceAndCheckDataType = we.getJSONTypes = we.getSchemaTypes = we.DataType = void 0;
const ZE = jr, QE = It, eS = sn, re = se, Zf = D;
var es;
(function(t) {
  t[t.Correct = 0] = "Correct", t[t.Wrong = 1] = "Wrong";
})(es || (we.DataType = es = {}));
function tS(t) {
  const e = Qf(t.type);
  if (e.includes("null")) {
    if (t.nullable === !1)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!e.length && t.nullable !== void 0)
      throw new Error('"nullable" cannot be used without "type"');
    t.nullable === !0 && e.push("null");
  }
  return e;
}
we.getSchemaTypes = tS;
function Qf(t) {
  const e = Array.isArray(t) ? t : t ? [t] : [];
  if (e.every(ZE.isJSONType))
    return e;
  throw new Error("type must be JSONType or JSONType[]: " + e.join(","));
}
we.getJSONTypes = Qf;
function rS(t, e) {
  const { gen: r, data: s, opts: n } = t, o = sS(e, n.coerceTypes), i = e.length > 0 && !(o.length === 0 && e.length === 1 && (0, QE.schemaHasRulesForType)(t, e[0]));
  if (i) {
    const a = oc(e, s, n.strictNumbers, es.Wrong);
    r.if(a, () => {
      o.length ? nS(t, e, o) : ic(t);
    });
  }
  return i;
}
we.coerceAndCheckDataType = rS;
const eh = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function sS(t, e) {
  return e ? t.filter((r) => eh.has(r) || e === "array" && r === "array") : [];
}
function nS(t, e, r) {
  const { gen: s, data: n, opts: o } = t, i = s.let("dataType", (0, re._)`typeof ${n}`), a = s.let("coerced", (0, re._)`undefined`);
  o.coerceTypes === "array" && s.if((0, re._)`${i} == 'object' && Array.isArray(${n}) && ${n}.length == 1`, () => s.assign(n, (0, re._)`${n}[0]`).assign(i, (0, re._)`typeof ${n}`).if(oc(e, n, o.strictNumbers), () => s.assign(a, n))), s.if((0, re._)`${a} !== undefined`);
  for (const d of r)
    (eh.has(d) || d === "array" && o.coerceTypes === "array") && c(d);
  s.else(), ic(t), s.endIf(), s.if((0, re._)`${a} !== undefined`, () => {
    s.assign(n, a), oS(t, a);
  });
  function c(d) {
    switch (d) {
      case "string":
        s.elseIf((0, re._)`${i} == "number" || ${i} == "boolean"`).assign(a, (0, re._)`"" + ${n}`).elseIf((0, re._)`${n} === null`).assign(a, (0, re._)`""`);
        return;
      case "number":
        s.elseIf((0, re._)`${i} == "boolean" || ${n} === null
              || (${i} == "string" && ${n} && ${n} == +${n})`).assign(a, (0, re._)`+${n}`);
        return;
      case "integer":
        s.elseIf((0, re._)`${i} === "boolean" || ${n} === null
              || (${i} === "string" && ${n} && ${n} == +${n} && !(${n} % 1))`).assign(a, (0, re._)`+${n}`);
        return;
      case "boolean":
        s.elseIf((0, re._)`${n} === "false" || ${n} === 0 || ${n} === null`).assign(a, !1).elseIf((0, re._)`${n} === "true" || ${n} === 1`).assign(a, !0);
        return;
      case "null":
        s.elseIf((0, re._)`${n} === "" || ${n} === 0 || ${n} === false`), s.assign(a, null);
        return;
      case "array":
        s.elseIf((0, re._)`${i} === "string" || ${i} === "number"
              || ${i} === "boolean" || ${n} === null`).assign(a, (0, re._)`[${n}]`);
    }
  }
}
function oS({ gen: t, parentData: e, parentDataProperty: r }, s) {
  t.if((0, re._)`${e} !== undefined`, () => t.assign((0, re._)`${e}[${r}]`, s));
}
function Vi(t, e, r, s = es.Correct) {
  const n = s === es.Correct ? re.operators.EQ : re.operators.NEQ;
  let o;
  switch (t) {
    case "null":
      return (0, re._)`${e} ${n} null`;
    case "array":
      o = (0, re._)`Array.isArray(${e})`;
      break;
    case "object":
      o = (0, re._)`${e} && typeof ${e} == "object" && !Array.isArray(${e})`;
      break;
    case "integer":
      o = i((0, re._)`!(${e} % 1) && !isNaN(${e})`);
      break;
    case "number":
      o = i();
      break;
    default:
      return (0, re._)`typeof ${e} ${n} ${t}`;
  }
  return s === es.Correct ? o : (0, re.not)(o);
  function i(a = re.nil) {
    return (0, re.and)((0, re._)`typeof ${e} == "number"`, a, r ? (0, re._)`isFinite(${e})` : re.nil);
  }
}
we.checkDataType = Vi;
function oc(t, e, r, s) {
  if (t.length === 1)
    return Vi(t[0], e, r, s);
  let n;
  const o = (0, Zf.toHash)(t);
  if (o.array && o.object) {
    const i = (0, re._)`typeof ${e} != "object"`;
    n = o.null ? i : (0, re._)`!${e} || ${i}`, delete o.null, delete o.array, delete o.object;
  } else
    n = re.nil;
  o.number && delete o.integer;
  for (const i in o)
    n = (0, re.and)(n, Vi(i, e, r, s));
  return n;
}
we.checkDataTypes = oc;
const iS = {
  message: ({ schema: t }) => `must be ${t}`,
  params: ({ schema: t, schemaValue: e }) => typeof t == "string" ? (0, re._)`{type: ${t}}` : (0, re._)`{type: ${e}}`
};
function ic(t) {
  const e = aS(t);
  (0, eS.reportError)(e, iS);
}
we.reportTypeError = ic;
function aS(t) {
  const { gen: e, data: r, schema: s } = t, n = (0, Zf.schemaRefOrVal)(t, s, "type");
  return {
    gen: e,
    keyword: "type",
    data: r,
    schema: s.type,
    schemaCode: n,
    schemaValue: n,
    parentSchema: s,
    params: {},
    it: t
  };
}
var Po = {};
Object.defineProperty(Po, "__esModule", { value: !0 });
Po.assignDefaults = void 0;
const Ur = se, cS = D;
function lS(t, e) {
  const { properties: r, items: s } = t.schema;
  if (e === "object" && r)
    for (const n in r)
      mu(t, n, r[n].default);
  else e === "array" && Array.isArray(s) && s.forEach((n, o) => mu(t, o, n.default));
}
Po.assignDefaults = lS;
function mu(t, e, r) {
  const { gen: s, compositeRule: n, data: o, opts: i } = t;
  if (r === void 0)
    return;
  const a = (0, Ur._)`${o}${(0, Ur.getProperty)(e)}`;
  if (n) {
    (0, cS.checkStrictMode)(t, `default is ignored for: ${a}`);
    return;
  }
  let c = (0, Ur._)`${a} === undefined`;
  i.useDefaults === "empty" && (c = (0, Ur._)`${c} || ${a} === null || ${a} === ""`), s.if(c, (0, Ur._)`${a} = ${(0, Ur.stringify)(r)}`);
}
var St = {}, oe = {};
Object.defineProperty(oe, "__esModule", { value: !0 });
oe.validateUnion = oe.validateArray = oe.usePattern = oe.callValidateCode = oe.schemaProperties = oe.allSchemaProperties = oe.noPropertyInData = oe.propertyInData = oe.isOwnProperty = oe.hasPropFunc = oe.reportMissingProp = oe.checkMissingProp = oe.checkReportMissingProp = void 0;
const me = se, ac = D, zt = bt, uS = D;
function dS(t, e) {
  const { gen: r, data: s, it: n } = t;
  r.if(lc(r, s, e, n.opts.ownProperties), () => {
    t.setParams({ missingProperty: (0, me._)`${e}` }, !0), t.error();
  });
}
oe.checkReportMissingProp = dS;
function fS({ gen: t, data: e, it: { opts: r } }, s, n) {
  return (0, me.or)(...s.map((o) => (0, me.and)(lc(t, e, o, r.ownProperties), (0, me._)`${n} = ${o}`)));
}
oe.checkMissingProp = fS;
function hS(t, e) {
  t.setParams({ missingProperty: e }, !0), t.error();
}
oe.reportMissingProp = hS;
function th(t) {
  return t.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, me._)`Object.prototype.hasOwnProperty`
  });
}
oe.hasPropFunc = th;
function cc(t, e, r) {
  return (0, me._)`${th(t)}.call(${e}, ${r})`;
}
oe.isOwnProperty = cc;
function mS(t, e, r, s) {
  const n = (0, me._)`${e}${(0, me.getProperty)(r)} !== undefined`;
  return s ? (0, me._)`${n} && ${cc(t, e, r)}` : n;
}
oe.propertyInData = mS;
function lc(t, e, r, s) {
  const n = (0, me._)`${e}${(0, me.getProperty)(r)} === undefined`;
  return s ? (0, me.or)(n, (0, me.not)(cc(t, e, r))) : n;
}
oe.noPropertyInData = lc;
function rh(t) {
  return t ? Object.keys(t).filter((e) => e !== "__proto__") : [];
}
oe.allSchemaProperties = rh;
function pS(t, e) {
  return rh(e).filter((r) => !(0, ac.alwaysValidSchema)(t, e[r]));
}
oe.schemaProperties = pS;
function yS({ schemaCode: t, data: e, it: { gen: r, topSchemaRef: s, schemaPath: n, errorPath: o }, it: i }, a, c, d) {
  const u = d ? (0, me._)`${t}, ${e}, ${s}${n}` : e, f = [
    [zt.default.instancePath, (0, me.strConcat)(zt.default.instancePath, o)],
    [zt.default.parentData, i.parentData],
    [zt.default.parentDataProperty, i.parentDataProperty],
    [zt.default.rootData, zt.default.rootData]
  ];
  i.opts.dynamicRef && f.push([zt.default.dynamicAnchors, zt.default.dynamicAnchors]);
  const E = (0, me._)`${u}, ${r.object(...f)}`;
  return c !== me.nil ? (0, me._)`${a}.call(${c}, ${E})` : (0, me._)`${a}(${E})`;
}
oe.callValidateCode = yS;
const $S = (0, me._)`new RegExp`;
function gS({ gen: t, it: { opts: e } }, r) {
  const s = e.unicodeRegExp ? "u" : "", { regExp: n } = e.code, o = n(r, s);
  return t.scopeValue("pattern", {
    key: o.toString(),
    ref: o,
    code: (0, me._)`${n.code === "new RegExp" ? $S : (0, uS.useFunc)(t, n)}(${r}, ${s})`
  });
}
oe.usePattern = gS;
function _S(t) {
  const { gen: e, data: r, keyword: s, it: n } = t, o = e.name("valid");
  if (n.allErrors) {
    const a = e.let("valid", !0);
    return i(() => e.assign(a, !1)), a;
  }
  return e.var(o, !0), i(() => e.break()), o;
  function i(a) {
    const c = e.const("len", (0, me._)`${r}.length`);
    e.forRange("i", 0, c, (d) => {
      t.subschema({
        keyword: s,
        dataProp: d,
        dataPropType: ac.Type.Num
      }, o), e.if((0, me.not)(o), a);
    });
  }
}
oe.validateArray = _S;
function vS(t) {
  const { gen: e, schema: r, keyword: s, it: n } = t;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, ac.alwaysValidSchema)(n, c)) && !n.opts.unevaluated)
    return;
  const i = e.let("valid", !1), a = e.name("_valid");
  e.block(() => r.forEach((c, d) => {
    const u = t.subschema({
      keyword: s,
      schemaProp: d,
      compositeRule: !0
    }, a);
    e.assign(i, (0, me._)`${i} || ${a}`), t.mergeValidEvaluated(u, a) || e.if((0, me.not)(i));
  })), t.result(i, () => t.reset(), () => t.error(!0));
}
oe.validateUnion = vS;
Object.defineProperty(St, "__esModule", { value: !0 });
St.validateKeywordUsage = St.validSchemaType = St.funcKeywordCode = St.macroKeywordCode = void 0;
const Le = se, kr = bt, wS = oe, ES = sn;
function SS(t, e) {
  const { gen: r, keyword: s, schema: n, parentSchema: o, it: i } = t, a = e.macro.call(i.self, n, o, i), c = sh(r, s, a);
  i.opts.validateSchema !== !1 && i.self.validateSchema(a, !0);
  const d = r.name("valid");
  t.subschema({
    schema: a,
    schemaPath: Le.nil,
    errSchemaPath: `${i.errSchemaPath}/${s}`,
    topSchemaRef: c,
    compositeRule: !0
  }, d), t.pass(d, () => t.error(!0));
}
St.macroKeywordCode = SS;
function bS(t, e) {
  var r;
  const { gen: s, keyword: n, schema: o, parentSchema: i, $data: a, it: c } = t;
  kS(c, e);
  const d = !a && e.compile ? e.compile.call(c.self, o, i, c) : e.validate, u = sh(s, n, d), f = s.let("valid");
  t.block$data(f, E), t.ok((r = e.valid) !== null && r !== void 0 ? r : f);
  function E() {
    if (e.errors === !1)
      y(), e.modifying && pu(t), $(() => t.error());
    else {
      const m = e.async ? _() : v();
      e.modifying && pu(t), $(() => PS(t, m));
    }
  }
  function _() {
    const m = s.let("ruleErrs", null);
    return s.try(() => y((0, Le._)`await `), (w) => s.assign(f, !1).if((0, Le._)`${w} instanceof ${c.ValidationError}`, () => s.assign(m, (0, Le._)`${w}.errors`), () => s.throw(w))), m;
  }
  function v() {
    const m = (0, Le._)`${u}.errors`;
    return s.assign(m, null), y(Le.nil), m;
  }
  function y(m = e.async ? (0, Le._)`await ` : Le.nil) {
    const w = c.opts.passContext ? kr.default.this : kr.default.self, P = !("compile" in e && !a || e.schema === !1);
    s.assign(f, (0, Le._)`${m}${(0, wS.callValidateCode)(t, u, w, P)}`, e.modifying);
  }
  function $(m) {
    var w;
    s.if((0, Le.not)((w = e.valid) !== null && w !== void 0 ? w : f), m);
  }
}
St.funcKeywordCode = bS;
function pu(t) {
  const { gen: e, data: r, it: s } = t;
  e.if(s.parentData, () => e.assign(r, (0, Le._)`${s.parentData}[${s.parentDataProperty}]`));
}
function PS(t, e) {
  const { gen: r } = t;
  r.if((0, Le._)`Array.isArray(${e})`, () => {
    r.assign(kr.default.vErrors, (0, Le._)`${kr.default.vErrors} === null ? ${e} : ${kr.default.vErrors}.concat(${e})`).assign(kr.default.errors, (0, Le._)`${kr.default.vErrors}.length`), (0, ES.extendErrors)(t);
  }, () => t.error());
}
function kS({ schemaEnv: t }, e) {
  if (e.async && !t.$async)
    throw new Error("async keyword in sync schema");
}
function sh(t, e, r) {
  if (r === void 0)
    throw new Error(`keyword "${e}" failed to compile`);
  return t.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, Le.stringify)(r) });
}
function TS(t, e, r = !1) {
  return !e.length || e.some((s) => s === "array" ? Array.isArray(t) : s === "object" ? t && typeof t == "object" && !Array.isArray(t) : typeof t == s || r && typeof t > "u");
}
St.validSchemaType = TS;
function NS({ schema: t, opts: e, self: r, errSchemaPath: s }, n, o) {
  if (Array.isArray(n.keyword) ? !n.keyword.includes(o) : n.keyword !== o)
    throw new Error("ajv implementation error");
  const i = n.dependencies;
  if (i != null && i.some((a) => !Object.prototype.hasOwnProperty.call(t, a)))
    throw new Error(`parent schema must have dependencies of ${o}: ${i.join(",")}`);
  if (n.validateSchema && !n.validateSchema(t[o])) {
    const c = `keyword "${o}" value is invalid at path "${s}": ` + r.errorsText(n.validateSchema.errors);
    if (e.validateSchema === "log")
      r.logger.error(c);
    else
      throw new Error(c);
  }
}
St.validateKeywordUsage = NS;
var er = {};
Object.defineProperty(er, "__esModule", { value: !0 });
er.extendSubschemaMode = er.extendSubschemaData = er.getSubschema = void 0;
const vt = se, nh = D;
function OS(t, { keyword: e, schemaProp: r, schema: s, schemaPath: n, errSchemaPath: o, topSchemaRef: i }) {
  if (e !== void 0 && s !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (e !== void 0) {
    const a = t.schema[e];
    return r === void 0 ? {
      schema: a,
      schemaPath: (0, vt._)`${t.schemaPath}${(0, vt.getProperty)(e)}`,
      errSchemaPath: `${t.errSchemaPath}/${e}`
    } : {
      schema: a[r],
      schemaPath: (0, vt._)`${t.schemaPath}${(0, vt.getProperty)(e)}${(0, vt.getProperty)(r)}`,
      errSchemaPath: `${t.errSchemaPath}/${e}/${(0, nh.escapeFragment)(r)}`
    };
  }
  if (s !== void 0) {
    if (n === void 0 || o === void 0 || i === void 0)
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    return {
      schema: s,
      schemaPath: n,
      topSchemaRef: i,
      errSchemaPath: o
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
er.getSubschema = OS;
function RS(t, e, { dataProp: r, dataPropType: s, data: n, dataTypes: o, propertyName: i }) {
  if (n !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: a } = e;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: u, opts: f } = e, E = a.let("data", (0, vt._)`${e.data}${(0, vt.getProperty)(r)}`, !0);
    c(E), t.errorPath = (0, vt.str)`${d}${(0, nh.getErrorPath)(r, s, f.jsPropertySyntax)}`, t.parentDataProperty = (0, vt._)`${r}`, t.dataPathArr = [...u, t.parentDataProperty];
  }
  if (n !== void 0) {
    const d = n instanceof vt.Name ? n : a.let("data", n, !0);
    c(d), i !== void 0 && (t.propertyName = i);
  }
  o && (t.dataTypes = o);
  function c(d) {
    t.data = d, t.dataLevel = e.dataLevel + 1, t.dataTypes = [], e.definedProperties = /* @__PURE__ */ new Set(), t.parentData = e.data, t.dataNames = [...e.dataNames, d];
  }
}
er.extendSubschemaData = RS;
function IS(t, { jtdDiscriminator: e, jtdMetadata: r, compositeRule: s, createErrors: n, allErrors: o }) {
  s !== void 0 && (t.compositeRule = s), n !== void 0 && (t.createErrors = n), o !== void 0 && (t.allErrors = o), t.jtdDiscriminator = e, t.jtdMetadata = r;
}
er.extendSubschemaMode = IS;
var Ne = {}, oh = { exports: {} }, Zt = oh.exports = function(t, e, r) {
  typeof e == "function" && (r = e, e = {}), r = e.cb || r;
  var s = typeof r == "function" ? r : r.pre || function() {
  }, n = r.post || function() {
  };
  qn(e, s, n, t, "", t);
};
Zt.keywords = {
  additionalItems: !0,
  items: !0,
  contains: !0,
  additionalProperties: !0,
  propertyNames: !0,
  not: !0,
  if: !0,
  then: !0,
  else: !0
};
Zt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Zt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Zt.skipKeywords = {
  default: !0,
  enum: !0,
  const: !0,
  required: !0,
  maximum: !0,
  minimum: !0,
  exclusiveMaximum: !0,
  exclusiveMinimum: !0,
  multipleOf: !0,
  maxLength: !0,
  minLength: !0,
  pattern: !0,
  format: !0,
  maxItems: !0,
  minItems: !0,
  uniqueItems: !0,
  maxProperties: !0,
  minProperties: !0
};
function qn(t, e, r, s, n, o, i, a, c, d) {
  if (s && typeof s == "object" && !Array.isArray(s)) {
    e(s, n, o, i, a, c, d);
    for (var u in s) {
      var f = s[u];
      if (Array.isArray(f)) {
        if (u in Zt.arrayKeywords)
          for (var E = 0; E < f.length; E++)
            qn(t, e, r, f[E], n + "/" + u + "/" + E, o, n, u, s, E);
      } else if (u in Zt.propsKeywords) {
        if (f && typeof f == "object")
          for (var _ in f)
            qn(t, e, r, f[_], n + "/" + u + "/" + AS(_), o, n, u, s, _);
      } else (u in Zt.keywords || t.allKeys && !(u in Zt.skipKeywords)) && qn(t, e, r, f, n + "/" + u, o, n, u, s);
    }
    r(s, n, o, i, a, c, d);
  }
}
function AS(t) {
  return t.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jS = oh.exports;
Object.defineProperty(Ne, "__esModule", { value: !0 });
Ne.getSchemaRefs = Ne.resolveUrl = Ne.normalizeId = Ne._getFullPath = Ne.getFullPath = Ne.inlineRef = void 0;
const CS = D, DS = go, MS = jS, LS = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function FS(t, e = !0) {
  return typeof t == "boolean" ? !0 : e === !0 ? !zi(t) : e ? ih(t) <= e : !1;
}
Ne.inlineRef = FS;
const US = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function zi(t) {
  for (const e in t) {
    if (US.has(e))
      return !0;
    const r = t[e];
    if (Array.isArray(r) && r.some(zi) || typeof r == "object" && zi(r))
      return !0;
  }
  return !1;
}
function ih(t) {
  let e = 0;
  for (const r in t) {
    if (r === "$ref")
      return 1 / 0;
    if (e++, !LS.has(r) && (typeof t[r] == "object" && (0, CS.eachItem)(t[r], (s) => e += ih(s)), e === 1 / 0))
      return 1 / 0;
  }
  return e;
}
function ah(t, e = "", r) {
  r !== !1 && (e = ts(e));
  const s = t.parse(e);
  return ch(t, s);
}
Ne.getFullPath = ah;
function ch(t, e) {
  return t.serialize(e).split("#")[0] + "#";
}
Ne._getFullPath = ch;
const VS = /#\/?$/;
function ts(t) {
  return t ? t.replace(VS, "") : "";
}
Ne.normalizeId = ts;
function zS(t, e, r) {
  return r = ts(r), t.resolve(e, r);
}
Ne.resolveUrl = zS;
const KS = /^[a-z_][-a-z0-9._]*$/i;
function xS(t, e) {
  if (typeof t == "boolean")
    return {};
  const { schemaId: r, uriResolver: s } = this.opts, n = ts(t[r] || e), o = { "": n }, i = ah(s, n, !1), a = {}, c = /* @__PURE__ */ new Set();
  return MS(t, { allKeys: !0 }, (f, E, _, v) => {
    if (v === void 0)
      return;
    const y = i + E;
    let $ = o[v];
    typeof f[r] == "string" && ($ = m.call(this, f[r])), w.call(this, f.$anchor), w.call(this, f.$dynamicAnchor), o[E] = $;
    function m(P) {
      const T = this.opts.uriResolver.resolve;
      if (P = ts($ ? T($, P) : P), c.has(P))
        throw u(P);
      c.add(P);
      let N = this.refs[P];
      return typeof N == "string" && (N = this.refs[N]), typeof N == "object" ? d(f, N.schema, P) : P !== ts(y) && (P[0] === "#" ? (d(f, a[P], P), a[P] = f) : this.refs[P] = y), P;
    }
    function w(P) {
      if (typeof P == "string") {
        if (!KS.test(P))
          throw new Error(`invalid anchor "${P}"`);
        m.call(this, `#${P}`);
      }
    }
  }), a;
  function d(f, E, _) {
    if (E !== void 0 && !DS(f, E))
      throw u(_);
  }
  function u(f) {
    return new Error(`reference "${f}" resolves to more than one schema`);
  }
}
Ne.getSchemaRefs = xS;
Object.defineProperty(ft, "__esModule", { value: !0 });
ft.getData = ft.KeywordCxt = ft.validateFunctionCode = void 0;
const lh = os, yu = we, uc = It, io = we, qS = Po, Vs = St, oi = er, q = se, J = bt, BS = Ne, At = D, ks = sn;
function GS(t) {
  if (fh(t) && (hh(t), dh(t))) {
    JS(t);
    return;
  }
  uh(t, () => (0, lh.topBoolOrEmptySchema)(t));
}
ft.validateFunctionCode = GS;
function uh({ gen: t, validateName: e, schema: r, schemaEnv: s, opts: n }, o) {
  n.code.es5 ? t.func(e, (0, q._)`${J.default.data}, ${J.default.valCxt}`, s.$async, () => {
    t.code((0, q._)`"use strict"; ${$u(r, n)}`), WS(t, n), t.code(o);
  }) : t.func(e, (0, q._)`${J.default.data}, ${HS(n)}`, s.$async, () => t.code($u(r, n)).code(o));
}
function HS(t) {
  return (0, q._)`{${J.default.instancePath}="", ${J.default.parentData}, ${J.default.parentDataProperty}, ${J.default.rootData}=${J.default.data}${t.dynamicRef ? (0, q._)`, ${J.default.dynamicAnchors}={}` : q.nil}}={}`;
}
function WS(t, e) {
  t.if(J.default.valCxt, () => {
    t.var(J.default.instancePath, (0, q._)`${J.default.valCxt}.${J.default.instancePath}`), t.var(J.default.parentData, (0, q._)`${J.default.valCxt}.${J.default.parentData}`), t.var(J.default.parentDataProperty, (0, q._)`${J.default.valCxt}.${J.default.parentDataProperty}`), t.var(J.default.rootData, (0, q._)`${J.default.valCxt}.${J.default.rootData}`), e.dynamicRef && t.var(J.default.dynamicAnchors, (0, q._)`${J.default.valCxt}.${J.default.dynamicAnchors}`);
  }, () => {
    t.var(J.default.instancePath, (0, q._)`""`), t.var(J.default.parentData, (0, q._)`undefined`), t.var(J.default.parentDataProperty, (0, q._)`undefined`), t.var(J.default.rootData, J.default.data), e.dynamicRef && t.var(J.default.dynamicAnchors, (0, q._)`{}`);
  });
}
function JS(t) {
  const { schema: e, opts: r, gen: s } = t;
  uh(t, () => {
    r.$comment && e.$comment && ph(t), eb(t), s.let(J.default.vErrors, null), s.let(J.default.errors, 0), r.unevaluated && XS(t), mh(t), sb(t);
  });
}
function XS(t) {
  const { gen: e, validateName: r } = t;
  t.evaluated = e.const("evaluated", (0, q._)`${r}.evaluated`), e.if((0, q._)`${t.evaluated}.dynamicProps`, () => e.assign((0, q._)`${t.evaluated}.props`, (0, q._)`undefined`)), e.if((0, q._)`${t.evaluated}.dynamicItems`, () => e.assign((0, q._)`${t.evaluated}.items`, (0, q._)`undefined`));
}
function $u(t, e) {
  const r = typeof t == "object" && t[e.schemaId];
  return r && (e.code.source || e.code.process) ? (0, q._)`/*# sourceURL=${r} */` : q.nil;
}
function YS(t, e) {
  if (fh(t) && (hh(t), dh(t))) {
    ZS(t, e);
    return;
  }
  (0, lh.boolOrEmptySchema)(t, e);
}
function dh({ schema: t, self: e }) {
  if (typeof t == "boolean")
    return !t;
  for (const r in t)
    if (e.RULES.all[r])
      return !0;
  return !1;
}
function fh(t) {
  return typeof t.schema != "boolean";
}
function ZS(t, e) {
  const { schema: r, gen: s, opts: n } = t;
  n.$comment && r.$comment && ph(t), tb(t), rb(t);
  const o = s.const("_errs", J.default.errors);
  mh(t, o), s.var(e, (0, q._)`${o} === ${J.default.errors}`);
}
function hh(t) {
  (0, At.checkUnknownRules)(t), QS(t);
}
function mh(t, e) {
  if (t.opts.jtd)
    return gu(t, [], !1, e);
  const r = (0, yu.getSchemaTypes)(t.schema), s = (0, yu.coerceAndCheckDataType)(t, r);
  gu(t, r, !s, e);
}
function QS(t) {
  const { schema: e, errSchemaPath: r, opts: s, self: n } = t;
  e.$ref && s.ignoreKeywordsWithRef && (0, At.schemaHasRulesButRef)(e, n.RULES) && n.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function eb(t) {
  const { schema: e, opts: r } = t;
  e.default !== void 0 && r.useDefaults && r.strictSchema && (0, At.checkStrictMode)(t, "default is ignored in the schema root");
}
function tb(t) {
  const e = t.schema[t.opts.schemaId];
  e && (t.baseId = (0, BS.resolveUrl)(t.opts.uriResolver, t.baseId, e));
}
function rb(t) {
  if (t.schema.$async && !t.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function ph({ gen: t, schemaEnv: e, schema: r, errSchemaPath: s, opts: n }) {
  const o = r.$comment;
  if (n.$comment === !0)
    t.code((0, q._)`${J.default.self}.logger.log(${o})`);
  else if (typeof n.$comment == "function") {
    const i = (0, q.str)`${s}/$comment`, a = t.scopeValue("root", { ref: e.root });
    t.code((0, q._)`${J.default.self}.opts.$comment(${o}, ${i}, ${a}.schema)`);
  }
}
function sb(t) {
  const { gen: e, schemaEnv: r, validateName: s, ValidationError: n, opts: o } = t;
  r.$async ? e.if((0, q._)`${J.default.errors} === 0`, () => e.return(J.default.data), () => e.throw((0, q._)`new ${n}(${J.default.vErrors})`)) : (e.assign((0, q._)`${s}.errors`, J.default.vErrors), o.unevaluated && nb(t), e.return((0, q._)`${J.default.errors} === 0`));
}
function nb({ gen: t, evaluated: e, props: r, items: s }) {
  r instanceof q.Name && t.assign((0, q._)`${e}.props`, r), s instanceof q.Name && t.assign((0, q._)`${e}.items`, s);
}
function gu(t, e, r, s) {
  const { gen: n, schema: o, data: i, allErrors: a, opts: c, self: d } = t, { RULES: u } = d;
  if (o.$ref && (c.ignoreKeywordsWithRef || !(0, At.schemaHasRulesButRef)(o, u))) {
    n.block(() => gh(t, "$ref", u.all.$ref.definition));
    return;
  }
  c.jtd || ob(t, e), n.block(() => {
    for (const E of u.rules)
      f(E);
    f(u.post);
  });
  function f(E) {
    (0, uc.shouldUseGroup)(o, E) && (E.type ? (n.if((0, io.checkDataType)(E.type, i, c.strictNumbers)), _u(t, E), e.length === 1 && e[0] === E.type && r && (n.else(), (0, io.reportTypeError)(t)), n.endIf()) : _u(t, E), a || n.if((0, q._)`${J.default.errors} === ${s || 0}`));
  }
}
function _u(t, e) {
  const { gen: r, schema: s, opts: { useDefaults: n } } = t;
  n && (0, qS.assignDefaults)(t, e.type), r.block(() => {
    for (const o of e.rules)
      (0, uc.shouldUseRule)(s, o) && gh(t, o.keyword, o.definition, e.type);
  });
}
function ob(t, e) {
  t.schemaEnv.meta || !t.opts.strictTypes || (ib(t, e), t.opts.allowUnionTypes || ab(t, e), cb(t, t.dataTypes));
}
function ib(t, e) {
  if (e.length) {
    if (!t.dataTypes.length) {
      t.dataTypes = e;
      return;
    }
    e.forEach((r) => {
      yh(t.dataTypes, r) || dc(t, `type "${r}" not allowed by context "${t.dataTypes.join(",")}"`);
    }), ub(t, e);
  }
}
function ab(t, e) {
  e.length > 1 && !(e.length === 2 && e.includes("null")) && dc(t, "use allowUnionTypes to allow union type keyword");
}
function cb(t, e) {
  const r = t.self.RULES.all;
  for (const s in r) {
    const n = r[s];
    if (typeof n == "object" && (0, uc.shouldUseRule)(t.schema, n)) {
      const { type: o } = n.definition;
      o.length && !o.some((i) => lb(e, i)) && dc(t, `missing type "${o.join(",")}" for keyword "${s}"`);
    }
  }
}
function lb(t, e) {
  return t.includes(e) || e === "number" && t.includes("integer");
}
function yh(t, e) {
  return t.includes(e) || e === "integer" && t.includes("number");
}
function ub(t, e) {
  const r = [];
  for (const s of t.dataTypes)
    yh(e, s) ? r.push(s) : e.includes("integer") && s === "number" && r.push("integer");
  t.dataTypes = r;
}
function dc(t, e) {
  const r = t.schemaEnv.baseId + t.errSchemaPath;
  e += ` at "${r}" (strictTypes)`, (0, At.checkStrictMode)(t, e, t.opts.strictTypes);
}
class $h {
  constructor(e, r, s) {
    if ((0, Vs.validateKeywordUsage)(e, r, s), this.gen = e.gen, this.allErrors = e.allErrors, this.keyword = s, this.data = e.data, this.schema = e.schema[s], this.$data = r.$data && e.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, At.schemaRefOrVal)(e, this.schema, s, this.$data), this.schemaType = r.schemaType, this.parentSchema = e.schema, this.params = {}, this.it = e, this.def = r, this.$data)
      this.schemaCode = e.gen.const("vSchema", _h(this.$data, e));
    else if (this.schemaCode = this.schemaValue, !(0, Vs.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${s} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = e.gen.const("_errs", J.default.errors));
  }
  result(e, r, s) {
    this.failResult((0, q.not)(e), r, s);
  }
  failResult(e, r, s) {
    this.gen.if(e), s ? s() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(e, r) {
    this.failResult((0, q.not)(e), void 0, r);
  }
  fail(e) {
    if (e === void 0) {
      this.error(), this.allErrors || this.gen.if(!1);
      return;
    }
    this.gen.if(e), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  fail$data(e) {
    if (!this.$data)
      return this.fail(e);
    const { schemaCode: r } = this;
    this.fail((0, q._)`${r} !== undefined && (${(0, q.or)(this.invalid$data(), e)})`);
  }
  error(e, r, s) {
    if (r) {
      this.setParams(r), this._error(e, s), this.setParams({});
      return;
    }
    this._error(e, s);
  }
  _error(e, r) {
    (e ? ks.reportExtraError : ks.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, ks.reportError)(this, this.def.$dataError || ks.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, ks.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(e) {
    this.allErrors || this.gen.if(e);
  }
  setParams(e, r) {
    r ? Object.assign(this.params, e) : this.params = e;
  }
  block$data(e, r, s = q.nil) {
    this.gen.block(() => {
      this.check$data(e, s), r();
    });
  }
  check$data(e = q.nil, r = q.nil) {
    if (!this.$data)
      return;
    const { gen: s, schemaCode: n, schemaType: o, def: i } = this;
    s.if((0, q.or)((0, q._)`${n} === undefined`, r)), e !== q.nil && s.assign(e, !0), (o.length || i.validateSchema) && (s.elseIf(this.invalid$data()), this.$dataError(), e !== q.nil && s.assign(e, !1)), s.else();
  }
  invalid$data() {
    const { gen: e, schemaCode: r, schemaType: s, def: n, it: o } = this;
    return (0, q.or)(i(), a());
    function i() {
      if (s.length) {
        if (!(r instanceof q.Name))
          throw new Error("ajv implementation error");
        const c = Array.isArray(s) ? s : [s];
        return (0, q._)`${(0, io.checkDataTypes)(c, r, o.opts.strictNumbers, io.DataType.Wrong)}`;
      }
      return q.nil;
    }
    function a() {
      if (n.validateSchema) {
        const c = e.scopeValue("validate$data", { ref: n.validateSchema });
        return (0, q._)`!${c}(${r})`;
      }
      return q.nil;
    }
  }
  subschema(e, r) {
    const s = (0, oi.getSubschema)(this.it, e);
    (0, oi.extendSubschemaData)(s, this.it, e), (0, oi.extendSubschemaMode)(s, e);
    const n = { ...this.it, ...s, items: void 0, props: void 0 };
    return YS(n, r), n;
  }
  mergeEvaluated(e, r) {
    const { it: s, gen: n } = this;
    s.opts.unevaluated && (s.props !== !0 && e.props !== void 0 && (s.props = At.mergeEvaluated.props(n, e.props, s.props, r)), s.items !== !0 && e.items !== void 0 && (s.items = At.mergeEvaluated.items(n, e.items, s.items, r)));
  }
  mergeValidEvaluated(e, r) {
    const { it: s, gen: n } = this;
    if (s.opts.unevaluated && (s.props !== !0 || s.items !== !0))
      return n.if(r, () => this.mergeEvaluated(e, q.Name)), !0;
  }
}
ft.KeywordCxt = $h;
function gh(t, e, r, s) {
  const n = new $h(t, r, e);
  "code" in r ? r.code(n, s) : n.$data && r.validate ? (0, Vs.funcKeywordCode)(n, r) : "macro" in r ? (0, Vs.macroKeywordCode)(n, r) : (r.compile || r.validate) && (0, Vs.funcKeywordCode)(n, r);
}
const db = /^\/(?:[^~]|~0|~1)*$/, fb = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function _h(t, { dataLevel: e, dataNames: r, dataPathArr: s }) {
  let n, o;
  if (t === "")
    return J.default.rootData;
  if (t[0] === "/") {
    if (!db.test(t))
      throw new Error(`Invalid JSON-pointer: ${t}`);
    n = t, o = J.default.rootData;
  } else {
    const d = fb.exec(t);
    if (!d)
      throw new Error(`Invalid JSON-pointer: ${t}`);
    const u = +d[1];
    if (n = d[2], n === "#") {
      if (u >= e)
        throw new Error(c("property/index", u));
      return s[e - u];
    }
    if (u > e)
      throw new Error(c("data", u));
    if (o = r[e - u], !n)
      return o;
  }
  let i = o;
  const a = n.split("/");
  for (const d of a)
    d && (o = (0, q._)`${o}${(0, q.getProperty)((0, At.unescapeJsonPointer)(d))}`, i = (0, q._)`${i} && ${o}`);
  return i;
  function c(d, u) {
    return `Cannot access ${d} ${u} levels up, current level is ${e}`;
  }
}
ft.getData = _h;
var wn = {}, vu;
function fc() {
  if (vu) return wn;
  vu = 1, Object.defineProperty(wn, "__esModule", { value: !0 });
  class t extends Error {
    constructor(r) {
      super("validation failed"), this.errors = r, this.ajv = this.validation = !0;
    }
  }
  return wn.default = t, wn;
}
var En = {}, wu;
function ko() {
  if (wu) return En;
  wu = 1, Object.defineProperty(En, "__esModule", { value: !0 });
  const t = Ne;
  class e extends Error {
    constructor(s, n, o, i) {
      super(i || `can't resolve reference ${o} from id ${n}`), this.missingRef = (0, t.resolveUrl)(s, n, o), this.missingSchema = (0, t.normalizeId)((0, t.getFullPath)(s, this.missingRef));
    }
  }
  return En.default = e, En;
}
var qe = {};
Object.defineProperty(qe, "__esModule", { value: !0 });
qe.resolveSchema = qe.getCompilingSchema = qe.resolveRef = qe.compileSchema = qe.SchemaEnv = void 0;
const ot = se, hb = fc(), vr = bt, ut = Ne, Eu = D, mb = ft;
class To {
  constructor(e) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let s;
    typeof e.schema == "object" && (s = e.schema), this.schema = e.schema, this.schemaId = e.schemaId, this.root = e.root || this, this.baseId = (r = e.baseId) !== null && r !== void 0 ? r : (0, ut.normalizeId)(s == null ? void 0 : s[e.schemaId || "$id"]), this.schemaPath = e.schemaPath, this.localRefs = e.localRefs, this.meta = e.meta, this.$async = s == null ? void 0 : s.$async, this.refs = {};
  }
}
qe.SchemaEnv = To;
function hc(t) {
  const e = vh.call(this, t);
  if (e)
    return e;
  const r = (0, ut.getFullPath)(this.opts.uriResolver, t.root.baseId), { es5: s, lines: n } = this.opts.code, { ownProperties: o } = this.opts, i = new ot.CodeGen(this.scope, { es5: s, lines: n, ownProperties: o });
  let a;
  t.$async && (a = i.scopeValue("Error", {
    ref: hb.default,
    code: (0, ot._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = i.scopeName("validate");
  t.validateName = c;
  const d = {
    gen: i,
    allErrors: this.opts.allErrors,
    data: vr.default.data,
    parentData: vr.default.parentData,
    parentDataProperty: vr.default.parentDataProperty,
    dataNames: [vr.default.data],
    dataPathArr: [ot.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: i.scopeValue("schema", this.opts.code.source === !0 ? { ref: t.schema, code: (0, ot.stringify)(t.schema) } : { ref: t.schema }),
    validateName: c,
    ValidationError: a,
    schema: t.schema,
    schemaEnv: t,
    rootId: r,
    baseId: t.baseId || r,
    schemaPath: ot.nil,
    errSchemaPath: t.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, ot._)`""`,
    opts: this.opts,
    self: this
  };
  let u;
  try {
    this._compilations.add(t), (0, mb.validateFunctionCode)(d), i.optimize(this.opts.code.optimize);
    const f = i.toString();
    u = `${i.scopeRefs(vr.default.scope)}return ${f}`, this.opts.code.process && (u = this.opts.code.process(u, t));
    const _ = new Function(`${vr.default.self}`, `${vr.default.scope}`, u)(this, this.scope.get());
    if (this.scope.value(c, { ref: _ }), _.errors = null, _.schema = t.schema, _.schemaEnv = t, t.$async && (_.$async = !0), this.opts.code.source === !0 && (_.source = { validateName: c, validateCode: f, scopeValues: i._values }), this.opts.unevaluated) {
      const { props: v, items: y } = d;
      _.evaluated = {
        props: v instanceof ot.Name ? void 0 : v,
        items: y instanceof ot.Name ? void 0 : y,
        dynamicProps: v instanceof ot.Name,
        dynamicItems: y instanceof ot.Name
      }, _.source && (_.source.evaluated = (0, ot.stringify)(_.evaluated));
    }
    return t.validate = _, t;
  } catch (f) {
    throw delete t.validate, delete t.validateName, u && this.logger.error("Error compiling schema, function code:", u), f;
  } finally {
    this._compilations.delete(t);
  }
}
qe.compileSchema = hc;
function pb(t, e, r) {
  var s;
  r = (0, ut.resolveUrl)(this.opts.uriResolver, e, r);
  const n = t.refs[r];
  if (n)
    return n;
  let o = gb.call(this, t, r);
  if (o === void 0) {
    const i = (s = t.localRefs) === null || s === void 0 ? void 0 : s[r], { schemaId: a } = this.opts;
    i && (o = new To({ schema: i, schemaId: a, root: t, baseId: e }));
  }
  if (o !== void 0)
    return t.refs[r] = yb.call(this, o);
}
qe.resolveRef = pb;
function yb(t) {
  return (0, ut.inlineRef)(t.schema, this.opts.inlineRefs) ? t.schema : t.validate ? t : hc.call(this, t);
}
function vh(t) {
  for (const e of this._compilations)
    if ($b(e, t))
      return e;
}
qe.getCompilingSchema = vh;
function $b(t, e) {
  return t.schema === e.schema && t.root === e.root && t.baseId === e.baseId;
}
function gb(t, e) {
  let r;
  for (; typeof (r = this.refs[e]) == "string"; )
    e = r;
  return r || this.schemas[e] || No.call(this, t, e);
}
function No(t, e) {
  const r = this.opts.uriResolver.parse(e), s = (0, ut._getFullPath)(this.opts.uriResolver, r);
  let n = (0, ut.getFullPath)(this.opts.uriResolver, t.baseId, void 0);
  if (Object.keys(t.schema).length > 0 && s === n)
    return ii.call(this, r, t);
  const o = (0, ut.normalizeId)(s), i = this.refs[o] || this.schemas[o];
  if (typeof i == "string") {
    const a = No.call(this, t, i);
    return typeof (a == null ? void 0 : a.schema) != "object" ? void 0 : ii.call(this, r, a);
  }
  if (typeof (i == null ? void 0 : i.schema) == "object") {
    if (i.validate || hc.call(this, i), o === (0, ut.normalizeId)(e)) {
      const { schema: a } = i, { schemaId: c } = this.opts, d = a[c];
      return d && (n = (0, ut.resolveUrl)(this.opts.uriResolver, n, d)), new To({ schema: a, schemaId: c, root: t, baseId: n });
    }
    return ii.call(this, r, i);
  }
}
qe.resolveSchema = No;
const _b = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function ii(t, { baseId: e, schema: r, root: s }) {
  var n;
  if (((n = t.fragment) === null || n === void 0 ? void 0 : n[0]) !== "/")
    return;
  for (const a of t.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, Eu.unescapeFragment)(a)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !_b.has(a) && d && (e = (0, ut.resolveUrl)(this.opts.uriResolver, e, d));
  }
  let o;
  if (typeof r != "boolean" && r.$ref && !(0, Eu.schemaHasRulesButRef)(r, this.RULES)) {
    const a = (0, ut.resolveUrl)(this.opts.uriResolver, e, r.$ref);
    o = No.call(this, s, a);
  }
  const { schemaId: i } = this.opts;
  if (o = o || new To({ schema: r, schemaId: i, root: s, baseId: e }), o.schema !== o.root.schema)
    return o;
}
const vb = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", wb = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Eb = "object", Sb = [
  "$data"
], bb = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
}, Pb = !1, kb = {
  $id: vb,
  description: wb,
  type: Eb,
  required: Sb,
  properties: bb,
  additionalProperties: Pb
};
var mc = {};
Object.defineProperty(mc, "__esModule", { value: !0 });
const wh = Rf;
wh.code = 'require("ajv/dist/runtime/uri").default';
mc.default = wh;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = void 0;
  var e = ft;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return e.KeywordCxt;
  } });
  var r = se;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return r._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return r.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return r.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return r.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return r.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return r.CodeGen;
  } });
  const s = fc(), n = ko(), o = jr, i = qe, a = se, c = Ne, d = we, u = D, f = kb, E = mc, _ = (k, p) => new RegExp(k, p);
  _.code = "new RegExp";
  const v = ["removeAdditional", "useDefaults", "coerceTypes"], y = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]), $ = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  }, m = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  }, w = 200;
  function P(k) {
    var p, b, g, l, h, S, O, I, z, U, ie, Ge, rr, sr, nr, or, ir, ar, cr, lr, ur, dr, fr, hr, mr;
    const rt = k.strict, pr = (p = k.code) === null || p === void 0 ? void 0 : p.optimize, gs = pr === !0 || pr === void 0 ? 1 : pr || 0, _s = (g = (b = k.code) === null || b === void 0 ? void 0 : b.regExp) !== null && g !== void 0 ? g : _, Lo = (l = k.uriResolver) !== null && l !== void 0 ? l : E.default;
    return {
      strictSchema: (S = (h = k.strictSchema) !== null && h !== void 0 ? h : rt) !== null && S !== void 0 ? S : !0,
      strictNumbers: (I = (O = k.strictNumbers) !== null && O !== void 0 ? O : rt) !== null && I !== void 0 ? I : !0,
      strictTypes: (U = (z = k.strictTypes) !== null && z !== void 0 ? z : rt) !== null && U !== void 0 ? U : "log",
      strictTuples: (Ge = (ie = k.strictTuples) !== null && ie !== void 0 ? ie : rt) !== null && Ge !== void 0 ? Ge : "log",
      strictRequired: (sr = (rr = k.strictRequired) !== null && rr !== void 0 ? rr : rt) !== null && sr !== void 0 ? sr : !1,
      code: k.code ? { ...k.code, optimize: gs, regExp: _s } : { optimize: gs, regExp: _s },
      loopRequired: (nr = k.loopRequired) !== null && nr !== void 0 ? nr : w,
      loopEnum: (or = k.loopEnum) !== null && or !== void 0 ? or : w,
      meta: (ir = k.meta) !== null && ir !== void 0 ? ir : !0,
      messages: (ar = k.messages) !== null && ar !== void 0 ? ar : !0,
      inlineRefs: (cr = k.inlineRefs) !== null && cr !== void 0 ? cr : !0,
      schemaId: (lr = k.schemaId) !== null && lr !== void 0 ? lr : "$id",
      addUsedSchema: (ur = k.addUsedSchema) !== null && ur !== void 0 ? ur : !0,
      validateSchema: (dr = k.validateSchema) !== null && dr !== void 0 ? dr : !0,
      validateFormats: (fr = k.validateFormats) !== null && fr !== void 0 ? fr : !0,
      unicodeRegExp: (hr = k.unicodeRegExp) !== null && hr !== void 0 ? hr : !0,
      int32range: (mr = k.int32range) !== null && mr !== void 0 ? mr : !0,
      uriResolver: Lo
    };
  }
  class T {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...P(p) };
      const { es5: b, lines: g } = this.opts.code;
      this.scope = new a.ValueScope({ scope: {}, prefixes: y, es5: b, lines: g }), this.logger = G(p.logger);
      const l = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, o.getRules)(), N.call(this, $, p, "NOT SUPPORTED"), N.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = ye.call(this), p.formats && ce.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && fe.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), H.call(this), p.validateFormats = l;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: b, schemaId: g } = this.opts;
      let l = f;
      g === "id" && (l = { ...f }, l.id = l.$id, delete l.$id), b && p && this.addMetaSchema(l, l[g], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: b } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[b] || p : void 0;
    }
    validate(p, b) {
      let g;
      if (typeof p == "string") {
        if (g = this.getSchema(p), !g)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        g = this.compile(p);
      const l = g(b);
      return "$async" in g || (this.errors = g.errors), l;
    }
    compile(p, b) {
      const g = this._addSchema(p, b);
      return g.validate || this._compileSchemaEnv(g);
    }
    compileAsync(p, b) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: g } = this.opts;
      return l.call(this, p, b);
      async function l(U, ie) {
        await h.call(this, U.$schema);
        const Ge = this._addSchema(U, ie);
        return Ge.validate || S.call(this, Ge);
      }
      async function h(U) {
        U && !this.getSchema(U) && await l.call(this, { $ref: U }, !0);
      }
      async function S(U) {
        try {
          return this._compileSchemaEnv(U);
        } catch (ie) {
          if (!(ie instanceof n.default))
            throw ie;
          return O.call(this, ie), await I.call(this, ie.missingSchema), S.call(this, U);
        }
      }
      function O({ missingSchema: U, missingRef: ie }) {
        if (this.refs[U])
          throw new Error(`AnySchema ${U} is loaded but ${ie} cannot be resolved`);
      }
      async function I(U) {
        const ie = await z.call(this, U);
        this.refs[U] || await h.call(this, ie.$schema), this.refs[U] || this.addSchema(ie, U, b);
      }
      async function z(U) {
        const ie = this._loading[U];
        if (ie)
          return ie;
        try {
          return await (this._loading[U] = g(U));
        } finally {
          delete this._loading[U];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, b, g, l = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const S of p)
          this.addSchema(S, void 0, g, l);
        return this;
      }
      let h;
      if (typeof p == "object") {
        const { schemaId: S } = this.opts;
        if (h = p[S], h !== void 0 && typeof h != "string")
          throw new Error(`schema ${S} must be string`);
      }
      return b = (0, c.normalizeId)(b || h), this._checkUnique(b), this.schemas[b] = this._addSchema(p, g, b, l, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, b, g = this.opts.validateSchema) {
      return this.addSchema(p, b, !0, g), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, b) {
      if (typeof p == "boolean")
        return !0;
      let g;
      if (g = p.$schema, g !== void 0 && typeof g != "string")
        throw new Error("$schema must be a string");
      if (g = g || this.opts.defaultMeta || this.defaultMeta(), !g)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const l = this.validate(g, p);
      if (!l && b) {
        const h = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(h);
        else
          throw new Error(h);
      }
      return l;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(p) {
      let b;
      for (; typeof (b = V.call(this, p)) == "string"; )
        p = b;
      if (b === void 0) {
        const { schemaId: g } = this.opts, l = new i.SchemaEnv({ schema: {}, schemaId: g });
        if (b = i.resolveSchema.call(this, l, p), !b)
          return;
        this.refs[p] = b;
      }
      return b.validate || this._compileSchemaEnv(b);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(p) {
      if (p instanceof RegExp)
        return this._removeAllSchemas(this.schemas, p), this._removeAllSchemas(this.refs, p), this;
      switch (typeof p) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          const b = V.call(this, p);
          return typeof b == "object" && this._cache.delete(b.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const b = p;
          this._cache.delete(b);
          let g = p[this.opts.schemaId];
          return g && (g = (0, c.normalizeId)(g), delete this.schemas[g], delete this.refs[g]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const b of p)
        this.addKeyword(b);
      return this;
    }
    addKeyword(p, b) {
      let g;
      if (typeof p == "string")
        g = p, typeof b == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), b.keyword = g);
      else if (typeof p == "object" && b === void 0) {
        if (b = p, g = b.keyword, Array.isArray(g) && !g.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (R.call(this, g, b), !b)
        return (0, u.eachItem)(g, (h) => A.call(this, h)), this;
      M.call(this, b);
      const l = {
        ...b,
        type: (0, d.getJSONTypes)(b.type),
        schemaType: (0, d.getJSONTypes)(b.schemaType)
      };
      return (0, u.eachItem)(g, l.type.length === 0 ? (h) => A.call(this, h, l) : (h) => l.type.forEach((S) => A.call(this, h, l, S))), this;
    }
    getKeyword(p) {
      const b = this.RULES.all[p];
      return typeof b == "object" ? b.definition : !!b;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: b } = this;
      delete b.keywords[p], delete b.all[p];
      for (const g of b.rules) {
        const l = g.rules.findIndex((h) => h.keyword === p);
        l >= 0 && g.rules.splice(l, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, b) {
      return typeof b == "string" && (b = new RegExp(b)), this.formats[p] = b, this;
    }
    errorsText(p = this.errors, { separator: b = ", ", dataVar: g = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((l) => `${g}${l.instancePath} ${l.message}`).reduce((l, h) => l + b + h);
    }
    $dataMetaSchema(p, b) {
      const g = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const l of b) {
        const h = l.split("/").slice(1);
        let S = p;
        for (const O of h)
          S = S[O];
        for (const O in g) {
          const I = g[O];
          if (typeof I != "object")
            continue;
          const { $data: z } = I.definition, U = S[O];
          z && U && (S[O] = L(U));
        }
      }
      return p;
    }
    _removeAllSchemas(p, b) {
      for (const g in p) {
        const l = p[g];
        (!b || b.test(g)) && (typeof l == "string" ? delete p[g] : l && !l.meta && (this._cache.delete(l.schema), delete p[g]));
      }
    }
    _addSchema(p, b, g, l = this.opts.validateSchema, h = this.opts.addUsedSchema) {
      let S;
      const { schemaId: O } = this.opts;
      if (typeof p == "object")
        S = p[O];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let I = this._cache.get(p);
      if (I !== void 0)
        return I;
      g = (0, c.normalizeId)(S || g);
      const z = c.getSchemaRefs.call(this, p, g);
      return I = new i.SchemaEnv({ schema: p, schemaId: O, meta: b, baseId: g, localRefs: z }), this._cache.set(I.schema, I), h && !g.startsWith("#") && (g && this._checkUnique(g), this.refs[g] = I), l && this.validateSchema(p, !0), I;
    }
    _checkUnique(p) {
      if (this.schemas[p] || this.refs[p])
        throw new Error(`schema with key or id "${p}" already exists`);
    }
    _compileSchemaEnv(p) {
      if (p.meta ? this._compileMetaSchema(p) : i.compileSchema.call(this, p), !p.validate)
        throw new Error("ajv implementation error");
      return p.validate;
    }
    _compileMetaSchema(p) {
      const b = this.opts;
      this.opts = this._metaOpts;
      try {
        i.compileSchema.call(this, p);
      } finally {
        this.opts = b;
      }
    }
  }
  T.ValidationError = s.default, T.MissingRefError = n.default, t.default = T;
  function N(k, p, b, g = "error") {
    for (const l in k) {
      const h = l;
      h in p && this.logger[g](`${b}: option ${l}. ${k[h]}`);
    }
  }
  function V(k) {
    return k = (0, c.normalizeId)(k), this.schemas[k] || this.refs[k];
  }
  function H() {
    const k = this.opts.schemas;
    if (k)
      if (Array.isArray(k))
        this.addSchema(k);
      else
        for (const p in k)
          this.addSchema(k[p], p);
  }
  function ce() {
    for (const k in this.opts.formats) {
      const p = this.opts.formats[k];
      p && this.addFormat(k, p);
    }
  }
  function fe(k) {
    if (Array.isArray(k)) {
      this.addVocabulary(k);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const p in k) {
      const b = k[p];
      b.keyword || (b.keyword = p), this.addKeyword(b);
    }
  }
  function ye() {
    const k = { ...this.opts };
    for (const p of v)
      delete k[p];
    return k;
  }
  const K = { log() {
  }, warn() {
  }, error() {
  } };
  function G(k) {
    if (k === !1)
      return K;
    if (k === void 0)
      return console;
    if (k.log && k.warn && k.error)
      return k;
    throw new Error("logger must implement log, warn and error methods");
  }
  const ae = /^[a-z_$][a-z0-9_$:-]*$/i;
  function R(k, p) {
    const { RULES: b } = this;
    if ((0, u.eachItem)(k, (g) => {
      if (b.keywords[g])
        throw new Error(`Keyword ${g} is already defined`);
      if (!ae.test(g))
        throw new Error(`Keyword ${g} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function A(k, p, b) {
    var g;
    const l = p == null ? void 0 : p.post;
    if (b && l)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: h } = this;
    let S = l ? h.post : h.rules.find(({ type: I }) => I === b);
    if (S || (S = { type: b, rules: [] }, h.rules.push(S)), h.keywords[k] = !0, !p)
      return;
    const O = {
      keyword: k,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? F.call(this, S, O, p.before) : S.rules.push(O), h.all[k] = O, (g = p.implements) === null || g === void 0 || g.forEach((I) => this.addKeyword(I));
  }
  function F(k, p, b) {
    const g = k.rules.findIndex((l) => l.keyword === b);
    g >= 0 ? k.rules.splice(g, 0, p) : (k.rules.push(p), this.logger.warn(`rule ${b} is not defined`));
  }
  function M(k) {
    let { metaSchema: p } = k;
    p !== void 0 && (k.$data && this.opts.$data && (p = L(p)), k.validateSchema = this.compile(p, !0));
  }
  const B = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function L(k) {
    return { anyOf: [k, B] };
  }
})(xf);
var pc = {}, yc = {}, $c = {};
Object.defineProperty($c, "__esModule", { value: !0 });
const Tb = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
$c.default = Tb;
var Cr = {};
Object.defineProperty(Cr, "__esModule", { value: !0 });
Cr.callRef = Cr.getValidate = void 0;
const Nb = ko(), Su = oe, Ke = se, Vr = bt, bu = qe, Sn = D, Ob = {
  keyword: "$ref",
  schemaType: "string",
  code(t) {
    const { gen: e, schema: r, it: s } = t, { baseId: n, schemaEnv: o, validateName: i, opts: a, self: c } = s, { root: d } = o;
    if ((r === "#" || r === "#/") && n === d.baseId)
      return f();
    const u = bu.resolveRef.call(c, d, n, r);
    if (u === void 0)
      throw new Nb.default(s.opts.uriResolver, n, r);
    if (u instanceof bu.SchemaEnv)
      return E(u);
    return _(u);
    function f() {
      if (o === d)
        return Bn(t, i, o, o.$async);
      const v = e.scopeValue("root", { ref: d });
      return Bn(t, (0, Ke._)`${v}.validate`, d, d.$async);
    }
    function E(v) {
      const y = Eh(t, v);
      Bn(t, y, v, v.$async);
    }
    function _(v) {
      const y = e.scopeValue("schema", a.code.source === !0 ? { ref: v, code: (0, Ke.stringify)(v) } : { ref: v }), $ = e.name("valid"), m = t.subschema({
        schema: v,
        dataTypes: [],
        schemaPath: Ke.nil,
        topSchemaRef: y,
        errSchemaPath: r
      }, $);
      t.mergeEvaluated(m), t.ok($);
    }
  }
};
function Eh(t, e) {
  const { gen: r } = t;
  return e.validate ? r.scopeValue("validate", { ref: e.validate }) : (0, Ke._)`${r.scopeValue("wrapper", { ref: e })}.validate`;
}
Cr.getValidate = Eh;
function Bn(t, e, r, s) {
  const { gen: n, it: o } = t, { allErrors: i, schemaEnv: a, opts: c } = o, d = c.passContext ? Vr.default.this : Ke.nil;
  s ? u() : f();
  function u() {
    if (!a.$async)
      throw new Error("async schema referenced by sync schema");
    const v = n.let("valid");
    n.try(() => {
      n.code((0, Ke._)`await ${(0, Su.callValidateCode)(t, e, d)}`), _(e), i || n.assign(v, !0);
    }, (y) => {
      n.if((0, Ke._)`!(${y} instanceof ${o.ValidationError})`, () => n.throw(y)), E(y), i || n.assign(v, !1);
    }), t.ok(v);
  }
  function f() {
    t.result((0, Su.callValidateCode)(t, e, d), () => _(e), () => E(e));
  }
  function E(v) {
    const y = (0, Ke._)`${v}.errors`;
    n.assign(Vr.default.vErrors, (0, Ke._)`${Vr.default.vErrors} === null ? ${y} : ${Vr.default.vErrors}.concat(${y})`), n.assign(Vr.default.errors, (0, Ke._)`${Vr.default.vErrors}.length`);
  }
  function _(v) {
    var y;
    if (!o.opts.unevaluated)
      return;
    const $ = (y = r == null ? void 0 : r.validate) === null || y === void 0 ? void 0 : y.evaluated;
    if (o.props !== !0)
      if ($ && !$.dynamicProps)
        $.props !== void 0 && (o.props = Sn.mergeEvaluated.props(n, $.props, o.props));
      else {
        const m = n.var("props", (0, Ke._)`${v}.evaluated.props`);
        o.props = Sn.mergeEvaluated.props(n, m, o.props, Ke.Name);
      }
    if (o.items !== !0)
      if ($ && !$.dynamicItems)
        $.items !== void 0 && (o.items = Sn.mergeEvaluated.items(n, $.items, o.items));
      else {
        const m = n.var("items", (0, Ke._)`${v}.evaluated.items`);
        o.items = Sn.mergeEvaluated.items(n, m, o.items, Ke.Name);
      }
  }
}
Cr.callRef = Bn;
Cr.default = Ob;
Object.defineProperty(yc, "__esModule", { value: !0 });
const Rb = $c, Ib = Cr, Ab = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  Rb.default,
  Ib.default
];
yc.default = Ab;
var gc = {}, _c = {};
Object.defineProperty(_c, "__esModule", { value: !0 });
const ao = se, Kt = ao.operators, co = {
  maximum: { okStr: "<=", ok: Kt.LTE, fail: Kt.GT },
  minimum: { okStr: ">=", ok: Kt.GTE, fail: Kt.LT },
  exclusiveMaximum: { okStr: "<", ok: Kt.LT, fail: Kt.GTE },
  exclusiveMinimum: { okStr: ">", ok: Kt.GT, fail: Kt.LTE }
}, jb = {
  message: ({ keyword: t, schemaCode: e }) => (0, ao.str)`must be ${co[t].okStr} ${e}`,
  params: ({ keyword: t, schemaCode: e }) => (0, ao._)`{comparison: ${co[t].okStr}, limit: ${e}}`
}, Cb = {
  keyword: Object.keys(co),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: jb,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t;
    t.fail$data((0, ao._)`${r} ${co[e].fail} ${s} || isNaN(${r})`);
  }
};
_c.default = Cb;
var vc = {};
Object.defineProperty(vc, "__esModule", { value: !0 });
const zs = se, Db = {
  message: ({ schemaCode: t }) => (0, zs.str)`must be multiple of ${t}`,
  params: ({ schemaCode: t }) => (0, zs._)`{multipleOf: ${t}}`
}, Mb = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Db,
  code(t) {
    const { gen: e, data: r, schemaCode: s, it: n } = t, o = n.opts.multipleOfPrecision, i = e.let("res"), a = o ? (0, zs._)`Math.abs(Math.round(${i}) - ${i}) > 1e-${o}` : (0, zs._)`${i} !== parseInt(${i})`;
    t.fail$data((0, zs._)`(${s} === 0 || (${i} = ${r}/${s}, ${a}))`);
  }
};
vc.default = Mb;
var wc = {}, Ec = {};
Object.defineProperty(Ec, "__esModule", { value: !0 });
function Sh(t) {
  const e = t.length;
  let r = 0, s = 0, n;
  for (; s < e; )
    r++, n = t.charCodeAt(s++), n >= 55296 && n <= 56319 && s < e && (n = t.charCodeAt(s), (n & 64512) === 56320 && s++);
  return r;
}
Ec.default = Sh;
Sh.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(wc, "__esModule", { value: !0 });
const Tr = se, Lb = D, Fb = Ec, Ub = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxLength" ? "more" : "fewer";
    return (0, Tr.str)`must NOT have ${r} than ${e} characters`;
  },
  params: ({ schemaCode: t }) => (0, Tr._)`{limit: ${t}}`
}, Vb = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: Ub,
  code(t) {
    const { keyword: e, data: r, schemaCode: s, it: n } = t, o = e === "maxLength" ? Tr.operators.GT : Tr.operators.LT, i = n.opts.unicode === !1 ? (0, Tr._)`${r}.length` : (0, Tr._)`${(0, Lb.useFunc)(t.gen, Fb.default)}(${r})`;
    t.fail$data((0, Tr._)`${i} ${o} ${s}`);
  }
};
wc.default = Vb;
var Sc = {};
Object.defineProperty(Sc, "__esModule", { value: !0 });
const zb = oe, lo = se, Kb = {
  message: ({ schemaCode: t }) => (0, lo.str)`must match pattern "${t}"`,
  params: ({ schemaCode: t }) => (0, lo._)`{pattern: ${t}}`
}, xb = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Kb,
  code(t) {
    const { data: e, $data: r, schema: s, schemaCode: n, it: o } = t, i = o.opts.unicodeRegExp ? "u" : "", a = r ? (0, lo._)`(new RegExp(${n}, ${i}))` : (0, zb.usePattern)(t, s);
    t.fail$data((0, lo._)`!${a}.test(${e})`);
  }
};
Sc.default = xb;
var bc = {};
Object.defineProperty(bc, "__esModule", { value: !0 });
const Ks = se, qb = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxProperties" ? "more" : "fewer";
    return (0, Ks.str)`must NOT have ${r} than ${e} properties`;
  },
  params: ({ schemaCode: t }) => (0, Ks._)`{limit: ${t}}`
}, Bb = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: qb,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t, n = e === "maxProperties" ? Ks.operators.GT : Ks.operators.LT;
    t.fail$data((0, Ks._)`Object.keys(${r}).length ${n} ${s}`);
  }
};
bc.default = Bb;
var Pc = {};
Object.defineProperty(Pc, "__esModule", { value: !0 });
const Ts = oe, xs = se, Gb = D, Hb = {
  message: ({ params: { missingProperty: t } }) => (0, xs.str)`must have required property '${t}'`,
  params: ({ params: { missingProperty: t } }) => (0, xs._)`{missingProperty: ${t}}`
}, Wb = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Hb,
  code(t) {
    const { gen: e, schema: r, schemaCode: s, data: n, $data: o, it: i } = t, { opts: a } = i;
    if (!o && r.length === 0)
      return;
    const c = r.length >= a.loopRequired;
    if (i.allErrors ? d() : u(), a.strictRequired) {
      const _ = t.parentSchema.properties, { definedProperties: v } = t.it;
      for (const y of r)
        if ((_ == null ? void 0 : _[y]) === void 0 && !v.has(y)) {
          const $ = i.schemaEnv.baseId + i.errSchemaPath, m = `required property "${y}" is not defined at "${$}" (strictRequired)`;
          (0, Gb.checkStrictMode)(i, m, i.opts.strictRequired);
        }
    }
    function d() {
      if (c || o)
        t.block$data(xs.nil, f);
      else
        for (const _ of r)
          (0, Ts.checkReportMissingProp)(t, _);
    }
    function u() {
      const _ = e.let("missing");
      if (c || o) {
        const v = e.let("valid", !0);
        t.block$data(v, () => E(_, v)), t.ok(v);
      } else
        e.if((0, Ts.checkMissingProp)(t, r, _)), (0, Ts.reportMissingProp)(t, _), e.else();
    }
    function f() {
      e.forOf("prop", s, (_) => {
        t.setParams({ missingProperty: _ }), e.if((0, Ts.noPropertyInData)(e, n, _, a.ownProperties), () => t.error());
      });
    }
    function E(_, v) {
      t.setParams({ missingProperty: _ }), e.forOf(_, s, () => {
        e.assign(v, (0, Ts.propertyInData)(e, n, _, a.ownProperties)), e.if((0, xs.not)(v), () => {
          t.error(), e.break();
        });
      }, xs.nil);
    }
  }
};
Pc.default = Wb;
var kc = {};
Object.defineProperty(kc, "__esModule", { value: !0 });
const qs = se, Jb = {
  message({ keyword: t, schemaCode: e }) {
    const r = t === "maxItems" ? "more" : "fewer";
    return (0, qs.str)`must NOT have ${r} than ${e} items`;
  },
  params: ({ schemaCode: t }) => (0, qs._)`{limit: ${t}}`
}, Xb = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: Jb,
  code(t) {
    const { keyword: e, data: r, schemaCode: s } = t, n = e === "maxItems" ? qs.operators.GT : qs.operators.LT;
    t.fail$data((0, qs._)`${r}.length ${n} ${s}`);
  }
};
kc.default = Xb;
var Tc = {}, nn = {};
Object.defineProperty(nn, "__esModule", { value: !0 });
const bh = go;
bh.code = 'require("ajv/dist/runtime/equal").default';
nn.default = bh;
Object.defineProperty(Tc, "__esModule", { value: !0 });
const ai = we, ke = se, Yb = D, Zb = nn, Qb = {
  message: ({ params: { i: t, j: e } }) => (0, ke.str)`must NOT have duplicate items (items ## ${e} and ${t} are identical)`,
  params: ({ params: { i: t, j: e } }) => (0, ke._)`{i: ${t}, j: ${e}}`
}, e1 = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: Qb,
  code(t) {
    const { gen: e, data: r, $data: s, schema: n, parentSchema: o, schemaCode: i, it: a } = t;
    if (!s && !n)
      return;
    const c = e.let("valid"), d = o.items ? (0, ai.getSchemaTypes)(o.items) : [];
    t.block$data(c, u, (0, ke._)`${i} === false`), t.ok(c);
    function u() {
      const v = e.let("i", (0, ke._)`${r}.length`), y = e.let("j");
      t.setParams({ i: v, j: y }), e.assign(c, !0), e.if((0, ke._)`${v} > 1`, () => (f() ? E : _)(v, y));
    }
    function f() {
      return d.length > 0 && !d.some((v) => v === "object" || v === "array");
    }
    function E(v, y) {
      const $ = e.name("item"), m = (0, ai.checkDataTypes)(d, $, a.opts.strictNumbers, ai.DataType.Wrong), w = e.const("indices", (0, ke._)`{}`);
      e.for((0, ke._)`;${v}--;`, () => {
        e.let($, (0, ke._)`${r}[${v}]`), e.if(m, (0, ke._)`continue`), d.length > 1 && e.if((0, ke._)`typeof ${$} == "string"`, (0, ke._)`${$} += "_"`), e.if((0, ke._)`typeof ${w}[${$}] == "number"`, () => {
          e.assign(y, (0, ke._)`${w}[${$}]`), t.error(), e.assign(c, !1).break();
        }).code((0, ke._)`${w}[${$}] = ${v}`);
      });
    }
    function _(v, y) {
      const $ = (0, Yb.useFunc)(e, Zb.default), m = e.name("outer");
      e.label(m).for((0, ke._)`;${v}--;`, () => e.for((0, ke._)`${y} = ${v}; ${y}--;`, () => e.if((0, ke._)`${$}(${r}[${v}], ${r}[${y}])`, () => {
        t.error(), e.assign(c, !1).break(m);
      })));
    }
  }
};
Tc.default = e1;
var Nc = {};
Object.defineProperty(Nc, "__esModule", { value: !0 });
const Ki = se, t1 = D, r1 = nn, s1 = {
  message: "must be equal to constant",
  params: ({ schemaCode: t }) => (0, Ki._)`{allowedValue: ${t}}`
}, n1 = {
  keyword: "const",
  $data: !0,
  error: s1,
  code(t) {
    const { gen: e, data: r, $data: s, schemaCode: n, schema: o } = t;
    s || o && typeof o == "object" ? t.fail$data((0, Ki._)`!${(0, t1.useFunc)(e, r1.default)}(${r}, ${n})`) : t.fail((0, Ki._)`${o} !== ${r}`);
  }
};
Nc.default = n1;
var Oc = {};
Object.defineProperty(Oc, "__esModule", { value: !0 });
const js = se, o1 = D, i1 = nn, a1 = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: t }) => (0, js._)`{allowedValues: ${t}}`
}, c1 = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: a1,
  code(t) {
    const { gen: e, data: r, $data: s, schema: n, schemaCode: o, it: i } = t;
    if (!s && n.length === 0)
      throw new Error("enum must have non-empty array");
    const a = n.length >= i.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, o1.useFunc)(e, i1.default));
    let u;
    if (a || s)
      u = e.let("valid"), t.block$data(u, f);
    else {
      if (!Array.isArray(n))
        throw new Error("ajv implementation error");
      const _ = e.const("vSchema", o);
      u = (0, js.or)(...n.map((v, y) => E(_, y)));
    }
    t.pass(u);
    function f() {
      e.assign(u, !1), e.forOf("v", o, (_) => e.if((0, js._)`${d()}(${r}, ${_})`, () => e.assign(u, !0).break()));
    }
    function E(_, v) {
      const y = n[v];
      return typeof y == "object" && y !== null ? (0, js._)`${d()}(${r}, ${_}[${v}])` : (0, js._)`${r} === ${y}`;
    }
  }
};
Oc.default = c1;
Object.defineProperty(gc, "__esModule", { value: !0 });
const l1 = _c, u1 = vc, d1 = wc, f1 = Sc, h1 = bc, m1 = Pc, p1 = kc, y1 = Tc, $1 = Nc, g1 = Oc, _1 = [
  // number
  l1.default,
  u1.default,
  // string
  d1.default,
  f1.default,
  // object
  h1.default,
  m1.default,
  // array
  p1.default,
  y1.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  $1.default,
  g1.default
];
gc.default = _1;
var Rc = {}, ps = {};
Object.defineProperty(ps, "__esModule", { value: !0 });
ps.validateAdditionalItems = void 0;
const Nr = se, xi = D, v1 = {
  message: ({ params: { len: t } }) => (0, Nr.str)`must NOT have more than ${t} items`,
  params: ({ params: { len: t } }) => (0, Nr._)`{limit: ${t}}`
}, w1 = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: v1,
  code(t) {
    const { parentSchema: e, it: r } = t, { items: s } = e;
    if (!Array.isArray(s)) {
      (0, xi.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Ph(t, s);
  }
};
function Ph(t, e) {
  const { gen: r, schema: s, data: n, keyword: o, it: i } = t;
  i.items = !0;
  const a = r.const("len", (0, Nr._)`${n}.length`);
  if (s === !1)
    t.setParams({ len: e.length }), t.pass((0, Nr._)`${a} <= ${e.length}`);
  else if (typeof s == "object" && !(0, xi.alwaysValidSchema)(i, s)) {
    const d = r.var("valid", (0, Nr._)`${a} <= ${e.length}`);
    r.if((0, Nr.not)(d), () => c(d)), t.ok(d);
  }
  function c(d) {
    r.forRange("i", e.length, a, (u) => {
      t.subschema({ keyword: o, dataProp: u, dataPropType: xi.Type.Num }, d), i.allErrors || r.if((0, Nr.not)(d), () => r.break());
    });
  }
}
ps.validateAdditionalItems = Ph;
ps.default = w1;
var Ic = {}, ys = {};
Object.defineProperty(ys, "__esModule", { value: !0 });
ys.validateTuple = void 0;
const Pu = se, Gn = D, E1 = oe, S1 = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(t) {
    const { schema: e, it: r } = t;
    if (Array.isArray(e))
      return kh(t, "additionalItems", e);
    r.items = !0, !(0, Gn.alwaysValidSchema)(r, e) && t.ok((0, E1.validateArray)(t));
  }
};
function kh(t, e, r = t.schema) {
  const { gen: s, parentSchema: n, data: o, keyword: i, it: a } = t;
  u(n), a.opts.unevaluated && r.length && a.items !== !0 && (a.items = Gn.mergeEvaluated.items(s, r.length, a.items));
  const c = s.name("valid"), d = s.const("len", (0, Pu._)`${o}.length`);
  r.forEach((f, E) => {
    (0, Gn.alwaysValidSchema)(a, f) || (s.if((0, Pu._)`${d} > ${E}`, () => t.subschema({
      keyword: i,
      schemaProp: E,
      dataProp: E
    }, c)), t.ok(c));
  });
  function u(f) {
    const { opts: E, errSchemaPath: _ } = a, v = r.length, y = v === f.minItems && (v === f.maxItems || f[e] === !1);
    if (E.strictTuples && !y) {
      const $ = `"${i}" is ${v}-tuple, but minItems or maxItems/${e} are not specified or different at path "${_}"`;
      (0, Gn.checkStrictMode)(a, $, E.strictTuples);
    }
  }
}
ys.validateTuple = kh;
ys.default = S1;
Object.defineProperty(Ic, "__esModule", { value: !0 });
const b1 = ys, P1 = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (t) => (0, b1.validateTuple)(t, "items")
};
Ic.default = P1;
var Ac = {};
Object.defineProperty(Ac, "__esModule", { value: !0 });
const ku = se, k1 = D, T1 = oe, N1 = ps, O1 = {
  message: ({ params: { len: t } }) => (0, ku.str)`must NOT have more than ${t} items`,
  params: ({ params: { len: t } }) => (0, ku._)`{limit: ${t}}`
}, R1 = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: O1,
  code(t) {
    const { schema: e, parentSchema: r, it: s } = t, { prefixItems: n } = r;
    s.items = !0, !(0, k1.alwaysValidSchema)(s, e) && (n ? (0, N1.validateAdditionalItems)(t, n) : t.ok((0, T1.validateArray)(t)));
  }
};
Ac.default = R1;
var jc = {};
Object.defineProperty(jc, "__esModule", { value: !0 });
const tt = se, bn = D, I1 = {
  message: ({ params: { min: t, max: e } }) => e === void 0 ? (0, tt.str)`must contain at least ${t} valid item(s)` : (0, tt.str)`must contain at least ${t} and no more than ${e} valid item(s)`,
  params: ({ params: { min: t, max: e } }) => e === void 0 ? (0, tt._)`{minContains: ${t}}` : (0, tt._)`{minContains: ${t}, maxContains: ${e}}`
}, A1 = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: I1,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, it: o } = t;
    let i, a;
    const { minContains: c, maxContains: d } = s;
    o.opts.next ? (i = c === void 0 ? 1 : c, a = d) : i = 1;
    const u = e.const("len", (0, tt._)`${n}.length`);
    if (t.setParams({ min: i, max: a }), a === void 0 && i === 0) {
      (0, bn.checkStrictMode)(o, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (a !== void 0 && i > a) {
      (0, bn.checkStrictMode)(o, '"minContains" > "maxContains" is always invalid'), t.fail();
      return;
    }
    if ((0, bn.alwaysValidSchema)(o, r)) {
      let y = (0, tt._)`${u} >= ${i}`;
      a !== void 0 && (y = (0, tt._)`${y} && ${u} <= ${a}`), t.pass(y);
      return;
    }
    o.items = !0;
    const f = e.name("valid");
    a === void 0 && i === 1 ? _(f, () => e.if(f, () => e.break())) : i === 0 ? (e.let(f, !0), a !== void 0 && e.if((0, tt._)`${n}.length > 0`, E)) : (e.let(f, !1), E()), t.result(f, () => t.reset());
    function E() {
      const y = e.name("_valid"), $ = e.let("count", 0);
      _(y, () => e.if(y, () => v($)));
    }
    function _(y, $) {
      e.forRange("i", 0, u, (m) => {
        t.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: bn.Type.Num,
          compositeRule: !0
        }, y), $();
      });
    }
    function v(y) {
      e.code((0, tt._)`${y}++`), a === void 0 ? e.if((0, tt._)`${y} >= ${i}`, () => e.assign(f, !0).break()) : (e.if((0, tt._)`${y} > ${a}`, () => e.assign(f, !1).break()), i === 1 ? e.assign(f, !0) : e.if((0, tt._)`${y} >= ${i}`, () => e.assign(f, !0)));
    }
  }
};
jc.default = A1;
var Th = {};
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.validateSchemaDeps = t.validatePropertyDeps = t.error = void 0;
  const e = se, r = D, s = oe;
  t.error = {
    message: ({ params: { property: c, depsCount: d, deps: u } }) => {
      const f = d === 1 ? "property" : "properties";
      return (0, e.str)`must have ${f} ${u} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: u, missingProperty: f } }) => (0, e._)`{property: ${c},
    missingProperty: ${f},
    depsCount: ${d},
    deps: ${u}}`
    // TODO change to reference
  };
  const n = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: t.error,
    code(c) {
      const [d, u] = o(c);
      i(c, d), a(c, u);
    }
  };
  function o({ schema: c }) {
    const d = {}, u = {};
    for (const f in c) {
      if (f === "__proto__")
        continue;
      const E = Array.isArray(c[f]) ? d : u;
      E[f] = c[f];
    }
    return [d, u];
  }
  function i(c, d = c.schema) {
    const { gen: u, data: f, it: E } = c;
    if (Object.keys(d).length === 0)
      return;
    const _ = u.let("missing");
    for (const v in d) {
      const y = d[v];
      if (y.length === 0)
        continue;
      const $ = (0, s.propertyInData)(u, f, v, E.opts.ownProperties);
      c.setParams({
        property: v,
        depsCount: y.length,
        deps: y.join(", ")
      }), E.allErrors ? u.if($, () => {
        for (const m of y)
          (0, s.checkReportMissingProp)(c, m);
      }) : (u.if((0, e._)`${$} && (${(0, s.checkMissingProp)(c, y, _)})`), (0, s.reportMissingProp)(c, _), u.else());
    }
  }
  t.validatePropertyDeps = i;
  function a(c, d = c.schema) {
    const { gen: u, data: f, keyword: E, it: _ } = c, v = u.name("valid");
    for (const y in d)
      (0, r.alwaysValidSchema)(_, d[y]) || (u.if(
        (0, s.propertyInData)(u, f, y, _.opts.ownProperties),
        () => {
          const $ = c.subschema({ keyword: E, schemaProp: y }, v);
          c.mergeValidEvaluated($, v);
        },
        () => u.var(v, !0)
        // TODO var
      ), c.ok(v));
  }
  t.validateSchemaDeps = a, t.default = n;
})(Th);
var Cc = {};
Object.defineProperty(Cc, "__esModule", { value: !0 });
const Nh = se, j1 = D, C1 = {
  message: "property name must be valid",
  params: ({ params: t }) => (0, Nh._)`{propertyName: ${t.propertyName}}`
}, D1 = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: C1,
  code(t) {
    const { gen: e, schema: r, data: s, it: n } = t;
    if ((0, j1.alwaysValidSchema)(n, r))
      return;
    const o = e.name("valid");
    e.forIn("key", s, (i) => {
      t.setParams({ propertyName: i }), t.subschema({
        keyword: "propertyNames",
        data: i,
        dataTypes: ["string"],
        propertyName: i,
        compositeRule: !0
      }, o), e.if((0, Nh.not)(o), () => {
        t.error(!0), n.allErrors || e.break();
      });
    }), t.ok(o);
  }
};
Cc.default = D1;
var Oo = {};
Object.defineProperty(Oo, "__esModule", { value: !0 });
const Pn = oe, at = se, M1 = bt, kn = D, L1 = {
  message: "must NOT have additional properties",
  params: ({ params: t }) => (0, at._)`{additionalProperty: ${t.additionalProperty}}`
}, F1 = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: L1,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, errsCount: o, it: i } = t;
    if (!o)
      throw new Error("ajv implementation error");
    const { allErrors: a, opts: c } = i;
    if (i.props = !0, c.removeAdditional !== "all" && (0, kn.alwaysValidSchema)(i, r))
      return;
    const d = (0, Pn.allSchemaProperties)(s.properties), u = (0, Pn.allSchemaProperties)(s.patternProperties);
    f(), t.ok((0, at._)`${o} === ${M1.default.errors}`);
    function f() {
      e.forIn("key", n, ($) => {
        !d.length && !u.length ? v($) : e.if(E($), () => v($));
      });
    }
    function E($) {
      let m;
      if (d.length > 8) {
        const w = (0, kn.schemaRefOrVal)(i, s.properties, "properties");
        m = (0, Pn.isOwnProperty)(e, w, $);
      } else d.length ? m = (0, at.or)(...d.map((w) => (0, at._)`${$} === ${w}`)) : m = at.nil;
      return u.length && (m = (0, at.or)(m, ...u.map((w) => (0, at._)`${(0, Pn.usePattern)(t, w)}.test(${$})`))), (0, at.not)(m);
    }
    function _($) {
      e.code((0, at._)`delete ${n}[${$}]`);
    }
    function v($) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        _($);
        return;
      }
      if (r === !1) {
        t.setParams({ additionalProperty: $ }), t.error(), a || e.break();
        return;
      }
      if (typeof r == "object" && !(0, kn.alwaysValidSchema)(i, r)) {
        const m = e.name("valid");
        c.removeAdditional === "failing" ? (y($, m, !1), e.if((0, at.not)(m), () => {
          t.reset(), _($);
        })) : (y($, m), a || e.if((0, at.not)(m), () => e.break()));
      }
    }
    function y($, m, w) {
      const P = {
        keyword: "additionalProperties",
        dataProp: $,
        dataPropType: kn.Type.Str
      };
      w === !1 && Object.assign(P, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), t.subschema(P, m);
    }
  }
};
Oo.default = F1;
var Dc = {};
Object.defineProperty(Dc, "__esModule", { value: !0 });
const U1 = ft, Tu = oe, ci = D, Nu = Oo, V1 = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(t) {
    const { gen: e, schema: r, parentSchema: s, data: n, it: o } = t;
    o.opts.removeAdditional === "all" && s.additionalProperties === void 0 && Nu.default.code(new U1.KeywordCxt(o, Nu.default, "additionalProperties"));
    const i = (0, Tu.allSchemaProperties)(r);
    for (const f of i)
      o.definedProperties.add(f);
    o.opts.unevaluated && i.length && o.props !== !0 && (o.props = ci.mergeEvaluated.props(e, (0, ci.toHash)(i), o.props));
    const a = i.filter((f) => !(0, ci.alwaysValidSchema)(o, r[f]));
    if (a.length === 0)
      return;
    const c = e.name("valid");
    for (const f of a)
      d(f) ? u(f) : (e.if((0, Tu.propertyInData)(e, n, f, o.opts.ownProperties)), u(f), o.allErrors || e.else().var(c, !0), e.endIf()), t.it.definedProperties.add(f), t.ok(c);
    function d(f) {
      return o.opts.useDefaults && !o.compositeRule && r[f].default !== void 0;
    }
    function u(f) {
      t.subschema({
        keyword: "properties",
        schemaProp: f,
        dataProp: f
      }, c);
    }
  }
};
Dc.default = V1;
var Mc = {};
Object.defineProperty(Mc, "__esModule", { value: !0 });
const Ou = oe, Tn = se, Ru = D, Iu = D, z1 = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(t) {
    const { gen: e, schema: r, data: s, parentSchema: n, it: o } = t, { opts: i } = o, a = (0, Ou.allSchemaProperties)(r), c = a.filter((y) => (0, Ru.alwaysValidSchema)(o, r[y]));
    if (a.length === 0 || c.length === a.length && (!o.opts.unevaluated || o.props === !0))
      return;
    const d = i.strictSchema && !i.allowMatchingProperties && n.properties, u = e.name("valid");
    o.props !== !0 && !(o.props instanceof Tn.Name) && (o.props = (0, Iu.evaluatedPropsToName)(e, o.props));
    const { props: f } = o;
    E();
    function E() {
      for (const y of a)
        d && _(y), o.allErrors ? v(y) : (e.var(u, !0), v(y), e.if(u));
    }
    function _(y) {
      for (const $ in d)
        new RegExp(y).test($) && (0, Ru.checkStrictMode)(o, `property ${$} matches pattern ${y} (use allowMatchingProperties)`);
    }
    function v(y) {
      e.forIn("key", s, ($) => {
        e.if((0, Tn._)`${(0, Ou.usePattern)(t, y)}.test(${$})`, () => {
          const m = c.includes(y);
          m || t.subschema({
            keyword: "patternProperties",
            schemaProp: y,
            dataProp: $,
            dataPropType: Iu.Type.Str
          }, u), o.opts.unevaluated && f !== !0 ? e.assign((0, Tn._)`${f}[${$}]`, !0) : !m && !o.allErrors && e.if((0, Tn.not)(u), () => e.break());
        });
      });
    }
  }
};
Mc.default = z1;
var Lc = {};
Object.defineProperty(Lc, "__esModule", { value: !0 });
const K1 = D, x1 = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(t) {
    const { gen: e, schema: r, it: s } = t;
    if ((0, K1.alwaysValidSchema)(s, r)) {
      t.fail();
      return;
    }
    const n = e.name("valid");
    t.subschema({
      keyword: "not",
      compositeRule: !0,
      createErrors: !1,
      allErrors: !1
    }, n), t.failResult(n, () => t.reset(), () => t.error());
  },
  error: { message: "must NOT be valid" }
};
Lc.default = x1;
var Fc = {};
Object.defineProperty(Fc, "__esModule", { value: !0 });
const q1 = oe, B1 = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: q1.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Fc.default = B1;
var Uc = {};
Object.defineProperty(Uc, "__esModule", { value: !0 });
const Hn = se, G1 = D, H1 = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: t }) => (0, Hn._)`{passingSchemas: ${t.passing}}`
}, W1 = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: H1,
  code(t) {
    const { gen: e, schema: r, parentSchema: s, it: n } = t;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (n.opts.discriminator && s.discriminator)
      return;
    const o = r, i = e.let("valid", !1), a = e.let("passing", null), c = e.name("_valid");
    t.setParams({ passing: a }), e.block(d), t.result(i, () => t.reset(), () => t.error(!0));
    function d() {
      o.forEach((u, f) => {
        let E;
        (0, G1.alwaysValidSchema)(n, u) ? e.var(c, !0) : E = t.subschema({
          keyword: "oneOf",
          schemaProp: f,
          compositeRule: !0
        }, c), f > 0 && e.if((0, Hn._)`${c} && ${i}`).assign(i, !1).assign(a, (0, Hn._)`[${a}, ${f}]`).else(), e.if(c, () => {
          e.assign(i, !0), e.assign(a, f), E && t.mergeEvaluated(E, Hn.Name);
        });
      });
    }
  }
};
Uc.default = W1;
var Vc = {};
Object.defineProperty(Vc, "__esModule", { value: !0 });
const J1 = D, X1 = {
  keyword: "allOf",
  schemaType: "array",
  code(t) {
    const { gen: e, schema: r, it: s } = t;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const n = e.name("valid");
    r.forEach((o, i) => {
      if ((0, J1.alwaysValidSchema)(s, o))
        return;
      const a = t.subschema({ keyword: "allOf", schemaProp: i }, n);
      t.ok(n), t.mergeEvaluated(a);
    });
  }
};
Vc.default = X1;
var zc = {};
Object.defineProperty(zc, "__esModule", { value: !0 });
const uo = se, Oh = D, Y1 = {
  message: ({ params: t }) => (0, uo.str)`must match "${t.ifClause}" schema`,
  params: ({ params: t }) => (0, uo._)`{failingKeyword: ${t.ifClause}}`
}, Z1 = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: Y1,
  code(t) {
    const { gen: e, parentSchema: r, it: s } = t;
    r.then === void 0 && r.else === void 0 && (0, Oh.checkStrictMode)(s, '"if" without "then" and "else" is ignored');
    const n = Au(s, "then"), o = Au(s, "else");
    if (!n && !o)
      return;
    const i = e.let("valid", !0), a = e.name("_valid");
    if (c(), t.reset(), n && o) {
      const u = e.let("ifClause");
      t.setParams({ ifClause: u }), e.if(a, d("then", u), d("else", u));
    } else n ? e.if(a, d("then")) : e.if((0, uo.not)(a), d("else"));
    t.pass(i, () => t.error(!0));
    function c() {
      const u = t.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, a);
      t.mergeEvaluated(u);
    }
    function d(u, f) {
      return () => {
        const E = t.subschema({ keyword: u }, a);
        e.assign(i, a), t.mergeValidEvaluated(E, i), f ? e.assign(f, (0, uo._)`${u}`) : t.setParams({ ifClause: u });
      };
    }
  }
};
function Au(t, e) {
  const r = t.schema[e];
  return r !== void 0 && !(0, Oh.alwaysValidSchema)(t, r);
}
zc.default = Z1;
var Kc = {};
Object.defineProperty(Kc, "__esModule", { value: !0 });
const Q1 = D, eP = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: t, parentSchema: e, it: r }) {
    e.if === void 0 && (0, Q1.checkStrictMode)(r, `"${t}" without "if" is ignored`);
  }
};
Kc.default = eP;
Object.defineProperty(Rc, "__esModule", { value: !0 });
const tP = ps, rP = Ic, sP = ys, nP = Ac, oP = jc, iP = Th, aP = Cc, cP = Oo, lP = Dc, uP = Mc, dP = Lc, fP = Fc, hP = Uc, mP = Vc, pP = zc, yP = Kc;
function $P(t = !1) {
  const e = [
    // any
    dP.default,
    fP.default,
    hP.default,
    mP.default,
    pP.default,
    yP.default,
    // object
    aP.default,
    cP.default,
    iP.default,
    lP.default,
    uP.default
  ];
  return t ? e.push(rP.default, nP.default) : e.push(tP.default, sP.default), e.push(oP.default), e;
}
Rc.default = $P;
var xc = {}, qc = {};
Object.defineProperty(qc, "__esModule", { value: !0 });
const ge = se, gP = {
  message: ({ schemaCode: t }) => (0, ge.str)`must match format "${t}"`,
  params: ({ schemaCode: t }) => (0, ge._)`{format: ${t}}`
}, _P = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: gP,
  code(t, e) {
    const { gen: r, data: s, $data: n, schema: o, schemaCode: i, it: a } = t, { opts: c, errSchemaPath: d, schemaEnv: u, self: f } = a;
    if (!c.validateFormats)
      return;
    n ? E() : _();
    function E() {
      const v = r.scopeValue("formats", {
        ref: f.formats,
        code: c.code.formats
      }), y = r.const("fDef", (0, ge._)`${v}[${i}]`), $ = r.let("fType"), m = r.let("format");
      r.if((0, ge._)`typeof ${y} == "object" && !(${y} instanceof RegExp)`, () => r.assign($, (0, ge._)`${y}.type || "string"`).assign(m, (0, ge._)`${y}.validate`), () => r.assign($, (0, ge._)`"string"`).assign(m, y)), t.fail$data((0, ge.or)(w(), P()));
      function w() {
        return c.strictSchema === !1 ? ge.nil : (0, ge._)`${i} && !${m}`;
      }
      function P() {
        const T = u.$async ? (0, ge._)`(${y}.async ? await ${m}(${s}) : ${m}(${s}))` : (0, ge._)`${m}(${s})`, N = (0, ge._)`(typeof ${m} == "function" ? ${T} : ${m}.test(${s}))`;
        return (0, ge._)`${m} && ${m} !== true && ${$} === ${e} && !${N}`;
      }
    }
    function _() {
      const v = f.formats[o];
      if (!v) {
        w();
        return;
      }
      if (v === !0)
        return;
      const [y, $, m] = P(v);
      y === e && t.pass(T());
      function w() {
        if (c.strictSchema === !1) {
          f.logger.warn(N());
          return;
        }
        throw new Error(N());
        function N() {
          return `unknown format "${o}" ignored in schema at path "${d}"`;
        }
      }
      function P(N) {
        const V = N instanceof RegExp ? (0, ge.regexpCode)(N) : c.code.formats ? (0, ge._)`${c.code.formats}${(0, ge.getProperty)(o)}` : void 0, H = r.scopeValue("formats", { key: o, ref: N, code: V });
        return typeof N == "object" && !(N instanceof RegExp) ? [N.type || "string", N.validate, (0, ge._)`${H}.validate`] : ["string", N, H];
      }
      function T() {
        if (typeof v == "object" && !(v instanceof RegExp) && v.async) {
          if (!u.$async)
            throw new Error("async format in sync schema");
          return (0, ge._)`await ${m}(${s})`;
        }
        return typeof $ == "function" ? (0, ge._)`${m}(${s})` : (0, ge._)`${m}.test(${s})`;
      }
    }
  }
};
qc.default = _P;
Object.defineProperty(xc, "__esModule", { value: !0 });
const vP = qc, wP = [vP.default];
xc.default = wP;
var is = {};
Object.defineProperty(is, "__esModule", { value: !0 });
is.contentVocabulary = is.metadataVocabulary = void 0;
is.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
is.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(pc, "__esModule", { value: !0 });
const EP = yc, SP = gc, bP = Rc, PP = xc, ju = is, kP = [
  EP.default,
  SP.default,
  (0, bP.default)(),
  PP.default,
  ju.metadataVocabulary,
  ju.contentVocabulary
];
pc.default = kP;
var Bc = {}, Ro = {};
Object.defineProperty(Ro, "__esModule", { value: !0 });
Ro.DiscrError = void 0;
var Cu;
(function(t) {
  t.Tag = "tag", t.Mapping = "mapping";
})(Cu || (Ro.DiscrError = Cu = {}));
Object.defineProperty(Bc, "__esModule", { value: !0 });
const qr = se, qi = Ro, Du = qe, TP = ko(), NP = D, OP = {
  message: ({ params: { discrError: t, tagName: e } }) => t === qi.DiscrError.Tag ? `tag "${e}" must be string` : `value of tag "${e}" must be in oneOf`,
  params: ({ params: { discrError: t, tag: e, tagName: r } }) => (0, qr._)`{error: ${t}, tag: ${r}, tagValue: ${e}}`
}, RP = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: OP,
  code(t) {
    const { gen: e, data: r, schema: s, parentSchema: n, it: o } = t, { oneOf: i } = n;
    if (!o.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const a = s.propertyName;
    if (typeof a != "string")
      throw new Error("discriminator: requires propertyName");
    if (s.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!i)
      throw new Error("discriminator: requires oneOf keyword");
    const c = e.let("valid", !1), d = e.const("tag", (0, qr._)`${r}${(0, qr.getProperty)(a)}`);
    e.if((0, qr._)`typeof ${d} == "string"`, () => u(), () => t.error(!1, { discrError: qi.DiscrError.Tag, tag: d, tagName: a })), t.ok(c);
    function u() {
      const _ = E();
      e.if(!1);
      for (const v in _)
        e.elseIf((0, qr._)`${d} === ${v}`), e.assign(c, f(_[v]));
      e.else(), t.error(!1, { discrError: qi.DiscrError.Mapping, tag: d, tagName: a }), e.endIf();
    }
    function f(_) {
      const v = e.name("valid"), y = t.subschema({ keyword: "oneOf", schemaProp: _ }, v);
      return t.mergeEvaluated(y, qr.Name), v;
    }
    function E() {
      var _;
      const v = {}, y = m(n);
      let $ = !0;
      for (let T = 0; T < i.length; T++) {
        let N = i[T];
        if (N != null && N.$ref && !(0, NP.schemaHasRulesButRef)(N, o.self.RULES)) {
          const H = N.$ref;
          if (N = Du.resolveRef.call(o.self, o.schemaEnv.root, o.baseId, H), N instanceof Du.SchemaEnv && (N = N.schema), N === void 0)
            throw new TP.default(o.opts.uriResolver, o.baseId, H);
        }
        const V = (_ = N == null ? void 0 : N.properties) === null || _ === void 0 ? void 0 : _[a];
        if (typeof V != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${a}"`);
        $ = $ && (y || m(N)), w(V, T);
      }
      if (!$)
        throw new Error(`discriminator: "${a}" must be required`);
      return v;
      function m({ required: T }) {
        return Array.isArray(T) && T.includes(a);
      }
      function w(T, N) {
        if (T.const)
          P(T.const, N);
        else if (T.enum)
          for (const V of T.enum)
            P(V, N);
        else
          throw new Error(`discriminator: "properties/${a}" must have "const" or "enum"`);
      }
      function P(T, N) {
        if (typeof T != "string" || T in v)
          throw new Error(`discriminator: "${a}" values must be unique strings`);
        v[T] = N;
      }
    }
  }
};
Bc.default = RP;
const IP = "http://json-schema.org/draft-07/schema#", AP = "http://json-schema.org/draft-07/schema#", jP = "Core schema meta-schema", CP = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        default: 0
      }
    ]
  },
  simpleTypes: {
    enum: [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: !0,
    default: []
  }
}, DP = [
  "object",
  "boolean"
], MP = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  default: !0,
  readOnly: {
    type: "boolean",
    default: !1
  },
  examples: {
    type: "array",
    items: !0
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    default: !0
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    default: !1
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    default: {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  const: !0,
  enum: {
    type: "array",
    items: !0,
    minItems: 1,
    uniqueItems: !0
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: !0
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  if: {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  else: {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
}, LP = {
  $schema: IP,
  $id: AP,
  title: jP,
  definitions: CP,
  type: DP,
  properties: MP,
  default: !0
};
(function(t, e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.MissingRefError = e.ValidationError = e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = e.Ajv = void 0;
  const r = xf, s = pc, n = Bc, o = LP, i = ["/properties"], a = "http://json-schema.org/draft-07/schema";
  class c extends r.default {
    _addVocabularies() {
      super._addVocabularies(), s.default.forEach((v) => this.addVocabulary(v)), this.opts.discriminator && this.addKeyword(n.default);
    }
    _addDefaultMetaSchema() {
      if (super._addDefaultMetaSchema(), !this.opts.meta)
        return;
      const v = this.opts.$data ? this.$dataMetaSchema(o, i) : o;
      this.addMetaSchema(v, a, !1), this.refs["http://json-schema.org/schema"] = a;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(a) ? a : void 0);
    }
  }
  e.Ajv = c, t.exports = e = c, t.exports.Ajv = c, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = c;
  var d = ft;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return d.KeywordCxt;
  } });
  var u = se;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return u._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return u.str;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return u.stringify;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return u.nil;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return u.Name;
  } }), Object.defineProperty(e, "CodeGen", { enumerable: !0, get: function() {
    return u.CodeGen;
  } });
  var f = fc();
  Object.defineProperty(e, "ValidationError", { enumerable: !0, get: function() {
    return f.default;
  } });
  var E = ko();
  Object.defineProperty(e, "MissingRefError", { enumerable: !0, get: function() {
    return E.default;
  } });
})(Li, Li.exports);
var FP = Li.exports;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.formatLimitDefinition = void 0;
  const e = FP, r = se, s = r.operators, n = {
    formatMaximum: { okStr: "<=", ok: s.LTE, fail: s.GT },
    formatMinimum: { okStr: ">=", ok: s.GTE, fail: s.LT },
    formatExclusiveMaximum: { okStr: "<", ok: s.LT, fail: s.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: s.GT, fail: s.LTE }
  }, o = {
    message: ({ keyword: a, schemaCode: c }) => (0, r.str)`should be ${n[a].okStr} ${c}`,
    params: ({ keyword: a, schemaCode: c }) => (0, r._)`{comparison: ${n[a].okStr}, limit: ${c}}`
  };
  t.formatLimitDefinition = {
    keyword: Object.keys(n),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: o,
    code(a) {
      const { gen: c, data: d, schemaCode: u, keyword: f, it: E } = a, { opts: _, self: v } = E;
      if (!_.validateFormats)
        return;
      const y = new e.KeywordCxt(E, v.RULES.all.format.definition, "format");
      y.$data ? $() : m();
      function $() {
        const P = c.scopeValue("formats", {
          ref: v.formats,
          code: _.code.formats
        }), T = c.const("fmt", (0, r._)`${P}[${y.schemaCode}]`);
        a.fail$data((0, r.or)((0, r._)`typeof ${T} != "object"`, (0, r._)`${T} instanceof RegExp`, (0, r._)`typeof ${T}.compare != "function"`, w(T)));
      }
      function m() {
        const P = y.schema, T = v.formats[P];
        if (!T || T === !0)
          return;
        if (typeof T != "object" || T instanceof RegExp || typeof T.compare != "function")
          throw new Error(`"${f}": format "${P}" does not define "compare" function`);
        const N = c.scopeValue("formats", {
          key: P,
          ref: T,
          code: _.code.formats ? (0, r._)`${_.code.formats}${(0, r.getProperty)(P)}` : void 0
        });
        a.fail$data(w(N));
      }
      function w(P) {
        return (0, r._)`${P}.compare(${d}, ${u}) ${n[f].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const i = (a) => (a.addKeyword(t.formatLimitDefinition), a);
  t.default = i;
})(Kf);
(function(t, e) {
  Object.defineProperty(e, "__esModule", { value: !0 });
  const r = zf, s = Kf, n = se, o = new n.Name("fullFormats"), i = new n.Name("fastFormats"), a = (d, u = { keywords: !0 }) => {
    if (Array.isArray(u))
      return c(d, u, r.fullFormats, o), d;
    const [f, E] = u.mode === "fast" ? [r.fastFormats, i] : [r.fullFormats, o], _ = u.formats || r.formatNames;
    return c(d, _, f, E), u.keywords && (0, s.default)(d), d;
  };
  a.get = (d, u = "full") => {
    const E = (u === "fast" ? r.fastFormats : r.fullFormats)[d];
    if (!E)
      throw new Error(`Unknown format "${d}"`);
    return E;
  };
  function c(d, u, f, E) {
    var _, v;
    (_ = (v = d.opts.code).formats) !== null && _ !== void 0 || (v.formats = (0, n._)`require("ajv-formats/dist/formats").${E}`);
    for (const y of u)
      d.addFormat(y, f[y]);
  }
  t.exports = e = a, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = a;
})(Mi, Mi.exports);
var UP = Mi.exports;
const VP = /* @__PURE__ */ Yi(UP), zP = (t, e, r, s) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  const n = Object.getOwnPropertyDescriptor(t, r), o = Object.getOwnPropertyDescriptor(e, r);
  !KP(n, o) && s || Object.defineProperty(t, r, o);
}, KP = function(t, e) {
  return t === void 0 || t.configurable || t.writable === e.writable && t.enumerable === e.enumerable && t.configurable === e.configurable && (t.writable || t.value === e.value);
}, xP = (t, e) => {
  const r = Object.getPrototypeOf(e);
  r !== Object.getPrototypeOf(t) && Object.setPrototypeOf(t, r);
}, qP = (t, e) => `/* Wrapped ${t}*/
${e}`, BP = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), GP = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"), HP = (t, e, r) => {
  const s = r === "" ? "" : `with ${r.trim()}() `, n = qP.bind(null, s, e.toString());
  Object.defineProperty(n, "name", GP);
  const { writable: o, enumerable: i, configurable: a } = BP;
  Object.defineProperty(t, "toString", { value: n, writable: o, enumerable: i, configurable: a });
};
function WP(t, e, { ignoreNonConfigurable: r = !1 } = {}) {
  const { name: s } = t;
  for (const n of Reflect.ownKeys(e))
    zP(t, e, n, r);
  return xP(t, e), HP(t, e, s), t;
}
const Mu = (t, e = {}) => {
  if (typeof t != "function")
    throw new TypeError(`Expected the first argument to be a function, got \`${typeof t}\``);
  const {
    wait: r = 0,
    maxWait: s = Number.POSITIVE_INFINITY,
    before: n = !1,
    after: o = !0
  } = e;
  if (r < 0 || s < 0)
    throw new RangeError("`wait` and `maxWait` must not be negative.");
  if (!n && !o)
    throw new Error("Both `before` and `after` are false, function wouldn't be called.");
  let i, a, c;
  const d = function(...u) {
    const f = this, E = () => {
      i = void 0, a && (clearTimeout(a), a = void 0), o && (c = t.apply(f, u));
    }, _ = () => {
      a = void 0, i && (clearTimeout(i), i = void 0), o && (c = t.apply(f, u));
    }, v = n && !i;
    return clearTimeout(i), i = setTimeout(E, r), s > 0 && s !== Number.POSITIVE_INFINITY && !a && (a = setTimeout(_, s)), v && (c = t.apply(f, u)), c;
  };
  return WP(d, t), d.cancel = () => {
    i && (clearTimeout(i), i = void 0), a && (clearTimeout(a), a = void 0);
  }, d;
};
var Bi = { exports: {} };
const JP = "2.0.0", Rh = 256, XP = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, YP = 16, ZP = Rh - 6, QP = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var Io = {
  MAX_LENGTH: Rh,
  MAX_SAFE_COMPONENT_LENGTH: YP,
  MAX_SAFE_BUILD_LENGTH: ZP,
  MAX_SAFE_INTEGER: XP,
  RELEASE_TYPES: QP,
  SEMVER_SPEC_VERSION: JP,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const ek = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...t) => console.error("SEMVER", ...t) : () => {
};
var Ao = ek;
(function(t, e) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: r,
    MAX_SAFE_BUILD_LENGTH: s,
    MAX_LENGTH: n
  } = Io, o = Ao;
  e = t.exports = {};
  const i = e.re = [], a = e.safeRe = [], c = e.src = [], d = e.safeSrc = [], u = e.t = {};
  let f = 0;
  const E = "[a-zA-Z0-9-]", _ = [
    ["\\s", 1],
    ["\\d", n],
    [E, s]
  ], v = ($) => {
    for (const [m, w] of _)
      $ = $.split(`${m}*`).join(`${m}{0,${w}}`).split(`${m}+`).join(`${m}{1,${w}}`);
    return $;
  }, y = ($, m, w) => {
    const P = v(m), T = f++;
    o($, T, m), u[$] = T, c[T] = m, d[T] = P, i[T] = new RegExp(m, w ? "g" : void 0), a[T] = new RegExp(P, w ? "g" : void 0);
  };
  y("NUMERICIDENTIFIER", "0|[1-9]\\d*"), y("NUMERICIDENTIFIERLOOSE", "\\d+"), y("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${E}*`), y("MAINVERSION", `(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})`), y("MAINVERSIONLOOSE", `(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASEIDENTIFIER", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIER]})`), y("PRERELEASEIDENTIFIERLOOSE", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASE", `(?:-(${c[u.PRERELEASEIDENTIFIER]}(?:\\.${c[u.PRERELEASEIDENTIFIER]})*))`), y("PRERELEASELOOSE", `(?:-?(${c[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${c[u.PRERELEASEIDENTIFIERLOOSE]})*))`), y("BUILDIDENTIFIER", `${E}+`), y("BUILD", `(?:\\+(${c[u.BUILDIDENTIFIER]}(?:\\.${c[u.BUILDIDENTIFIER]})*))`), y("FULLPLAIN", `v?${c[u.MAINVERSION]}${c[u.PRERELEASE]}?${c[u.BUILD]}?`), y("FULL", `^${c[u.FULLPLAIN]}$`), y("LOOSEPLAIN", `[v=\\s]*${c[u.MAINVERSIONLOOSE]}${c[u.PRERELEASELOOSE]}?${c[u.BUILD]}?`), y("LOOSE", `^${c[u.LOOSEPLAIN]}$`), y("GTLT", "((?:<|>)?=?)"), y("XRANGEIDENTIFIERLOOSE", `${c[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), y("XRANGEIDENTIFIER", `${c[u.NUMERICIDENTIFIER]}|x|X|\\*`), y("XRANGEPLAIN", `[v=\\s]*(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:${c[u.PRERELEASE]})?${c[u.BUILD]}?)?)?`), y("XRANGEPLAINLOOSE", `[v=\\s]*(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:${c[u.PRERELEASELOOSE]})?${c[u.BUILD]}?)?)?`), y("XRANGE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAIN]}$`), y("XRANGELOOSE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAINLOOSE]}$`), y("COERCEPLAIN", `(^|[^\\d])(\\d{1,${r}})(?:\\.(\\d{1,${r}}))?(?:\\.(\\d{1,${r}}))?`), y("COERCE", `${c[u.COERCEPLAIN]}(?:$|[^\\d])`), y("COERCEFULL", c[u.COERCEPLAIN] + `(?:${c[u.PRERELEASE]})?(?:${c[u.BUILD]})?(?:$|[^\\d])`), y("COERCERTL", c[u.COERCE], !0), y("COERCERTLFULL", c[u.COERCEFULL], !0), y("LONETILDE", "(?:~>?)"), y("TILDETRIM", `(\\s*)${c[u.LONETILDE]}\\s+`, !0), e.tildeTrimReplace = "$1~", y("TILDE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAIN]}$`), y("TILDELOOSE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAINLOOSE]}$`), y("LONECARET", "(?:\\^)"), y("CARETTRIM", `(\\s*)${c[u.LONECARET]}\\s+`, !0), e.caretTrimReplace = "$1^", y("CARET", `^${c[u.LONECARET]}${c[u.XRANGEPLAIN]}$`), y("CARETLOOSE", `^${c[u.LONECARET]}${c[u.XRANGEPLAINLOOSE]}$`), y("COMPARATORLOOSE", `^${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]})$|^$`), y("COMPARATOR", `^${c[u.GTLT]}\\s*(${c[u.FULLPLAIN]})$|^$`), y("COMPARATORTRIM", `(\\s*)${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]}|${c[u.XRANGEPLAIN]})`, !0), e.comparatorTrimReplace = "$1$2$3", y("HYPHENRANGE", `^\\s*(${c[u.XRANGEPLAIN]})\\s+-\\s+(${c[u.XRANGEPLAIN]})\\s*$`), y("HYPHENRANGELOOSE", `^\\s*(${c[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${c[u.XRANGEPLAINLOOSE]})\\s*$`), y("STAR", "(<|>)?=?\\s*\\*"), y("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), y("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(Bi, Bi.exports);
var on = Bi.exports;
const tk = Object.freeze({ loose: !0 }), rk = Object.freeze({}), sk = (t) => t ? typeof t != "object" ? tk : t : rk;
var Gc = sk;
const Lu = /^[0-9]+$/, Ih = (t, e) => {
  if (typeof t == "number" && typeof e == "number")
    return t === e ? 0 : t < e ? -1 : 1;
  const r = Lu.test(t), s = Lu.test(e);
  return r && s && (t = +t, e = +e), t === e ? 0 : r && !s ? -1 : s && !r ? 1 : t < e ? -1 : 1;
}, nk = (t, e) => Ih(e, t);
var Ah = {
  compareIdentifiers: Ih,
  rcompareIdentifiers: nk
};
const Nn = Ao, { MAX_LENGTH: Fu, MAX_SAFE_INTEGER: On } = Io, { safeRe: Rn, t: In } = on, ok = Gc, { compareIdentifiers: li } = Ah;
let ik = class $t {
  constructor(e, r) {
    if (r = ok(r), e instanceof $t) {
      if (e.loose === !!r.loose && e.includePrerelease === !!r.includePrerelease)
        return e;
      e = e.version;
    } else if (typeof e != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof e}".`);
    if (e.length > Fu)
      throw new TypeError(
        `version is longer than ${Fu} characters`
      );
    Nn("SemVer", e, r), this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease;
    const s = e.trim().match(r.loose ? Rn[In.LOOSE] : Rn[In.FULL]);
    if (!s)
      throw new TypeError(`Invalid Version: ${e}`);
    if (this.raw = e, this.major = +s[1], this.minor = +s[2], this.patch = +s[3], this.major > On || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > On || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > On || this.patch < 0)
      throw new TypeError("Invalid patch version");
    s[4] ? this.prerelease = s[4].split(".").map((n) => {
      if (/^[0-9]+$/.test(n)) {
        const o = +n;
        if (o >= 0 && o < On)
          return o;
      }
      return n;
    }) : this.prerelease = [], this.build = s[5] ? s[5].split(".") : [], this.format();
  }
  format() {
    return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
  }
  toString() {
    return this.version;
  }
  compare(e) {
    if (Nn("SemVer.compare", this.version, this.options, e), !(e instanceof $t)) {
      if (typeof e == "string" && e === this.version)
        return 0;
      e = new $t(e, this.options);
    }
    return e.version === this.version ? 0 : this.compareMain(e) || this.comparePre(e);
  }
  compareMain(e) {
    return e instanceof $t || (e = new $t(e, this.options)), this.major < e.major ? -1 : this.major > e.major ? 1 : this.minor < e.minor ? -1 : this.minor > e.minor ? 1 : this.patch < e.patch ? -1 : this.patch > e.patch ? 1 : 0;
  }
  comparePre(e) {
    if (e instanceof $t || (e = new $t(e, this.options)), this.prerelease.length && !e.prerelease.length)
      return -1;
    if (!this.prerelease.length && e.prerelease.length)
      return 1;
    if (!this.prerelease.length && !e.prerelease.length)
      return 0;
    let r = 0;
    do {
      const s = this.prerelease[r], n = e.prerelease[r];
      if (Nn("prerelease compare", r, s, n), s === void 0 && n === void 0)
        return 0;
      if (n === void 0)
        return 1;
      if (s === void 0)
        return -1;
      if (s === n)
        continue;
      return li(s, n);
    } while (++r);
  }
  compareBuild(e) {
    e instanceof $t || (e = new $t(e, this.options));
    let r = 0;
    do {
      const s = this.build[r], n = e.build[r];
      if (Nn("build compare", r, s, n), s === void 0 && n === void 0)
        return 0;
      if (n === void 0)
        return 1;
      if (s === void 0)
        return -1;
      if (s === n)
        continue;
      return li(s, n);
    } while (++r);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(e, r, s) {
    if (e.startsWith("pre")) {
      if (!r && s === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (r) {
        const n = `-${r}`.match(this.options.loose ? Rn[In.PRERELEASELOOSE] : Rn[In.PRERELEASE]);
        if (!n || n[1] !== r)
          throw new Error(`invalid identifier: ${r}`);
      }
    }
    switch (e) {
      case "premajor":
        this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", r, s);
        break;
      case "preminor":
        this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", r, s);
        break;
      case "prepatch":
        this.prerelease.length = 0, this.inc("patch", r, s), this.inc("pre", r, s);
        break;
      case "prerelease":
        this.prerelease.length === 0 && this.inc("patch", r, s), this.inc("pre", r, s);
        break;
      case "release":
        if (this.prerelease.length === 0)
          throw new Error(`version ${this.raw} is not a prerelease`);
        this.prerelease.length = 0;
        break;
      case "major":
        (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
        break;
      case "minor":
        (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
        break;
      case "patch":
        this.prerelease.length === 0 && this.patch++, this.prerelease = [];
        break;
      case "pre": {
        const n = Number(s) ? 1 : 0;
        if (this.prerelease.length === 0)
          this.prerelease = [n];
        else {
          let o = this.prerelease.length;
          for (; --o >= 0; )
            typeof this.prerelease[o] == "number" && (this.prerelease[o]++, o = -2);
          if (o === -1) {
            if (r === this.prerelease.join(".") && s === !1)
              throw new Error("invalid increment argument: identifier already exists");
            this.prerelease.push(n);
          }
        }
        if (r) {
          let o = [r, n];
          s === !1 && (o = [r]), li(this.prerelease[0], r) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = o) : this.prerelease = o;
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${e}`);
    }
    return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
  }
};
var Ue = ik;
const Uu = Ue, ak = (t, e, r = !1) => {
  if (t instanceof Uu)
    return t;
  try {
    return new Uu(t, e);
  } catch (s) {
    if (!r)
      return null;
    throw s;
  }
};
var $s = ak;
const ck = $s, lk = (t, e) => {
  const r = ck(t, e);
  return r ? r.version : null;
};
var uk = lk;
const dk = $s, fk = (t, e) => {
  const r = dk(t.trim().replace(/^[=v]+/, ""), e);
  return r ? r.version : null;
};
var hk = fk;
const Vu = Ue, mk = (t, e, r, s, n) => {
  typeof r == "string" && (n = s, s = r, r = void 0);
  try {
    return new Vu(
      t instanceof Vu ? t.version : t,
      r
    ).inc(e, s, n).version;
  } catch {
    return null;
  }
};
var pk = mk;
const zu = $s, yk = (t, e) => {
  const r = zu(t, null, !0), s = zu(e, null, !0), n = r.compare(s);
  if (n === 0)
    return null;
  const o = n > 0, i = o ? r : s, a = o ? s : r, c = !!i.prerelease.length;
  if (!!a.prerelease.length && !c) {
    if (!a.patch && !a.minor)
      return "major";
    if (a.compareMain(i) === 0)
      return a.minor && !a.patch ? "minor" : "patch";
  }
  const u = c ? "pre" : "";
  return r.major !== s.major ? u + "major" : r.minor !== s.minor ? u + "minor" : r.patch !== s.patch ? u + "patch" : "prerelease";
};
var $k = yk;
const gk = Ue, _k = (t, e) => new gk(t, e).major;
var vk = _k;
const wk = Ue, Ek = (t, e) => new wk(t, e).minor;
var Sk = Ek;
const bk = Ue, Pk = (t, e) => new bk(t, e).patch;
var kk = Pk;
const Tk = $s, Nk = (t, e) => {
  const r = Tk(t, e);
  return r && r.prerelease.length ? r.prerelease : null;
};
var Ok = Nk;
const Ku = Ue, Rk = (t, e, r) => new Ku(t, r).compare(new Ku(e, r));
var ht = Rk;
const Ik = ht, Ak = (t, e, r) => Ik(e, t, r);
var jk = Ak;
const Ck = ht, Dk = (t, e) => Ck(t, e, !0);
var Mk = Dk;
const xu = Ue, Lk = (t, e, r) => {
  const s = new xu(t, r), n = new xu(e, r);
  return s.compare(n) || s.compareBuild(n);
};
var Hc = Lk;
const Fk = Hc, Uk = (t, e) => t.sort((r, s) => Fk(r, s, e));
var Vk = Uk;
const zk = Hc, Kk = (t, e) => t.sort((r, s) => zk(s, r, e));
var xk = Kk;
const qk = ht, Bk = (t, e, r) => qk(t, e, r) > 0;
var jo = Bk;
const Gk = ht, Hk = (t, e, r) => Gk(t, e, r) < 0;
var Wc = Hk;
const Wk = ht, Jk = (t, e, r) => Wk(t, e, r) === 0;
var jh = Jk;
const Xk = ht, Yk = (t, e, r) => Xk(t, e, r) !== 0;
var Ch = Yk;
const Zk = ht, Qk = (t, e, r) => Zk(t, e, r) >= 0;
var Jc = Qk;
const eT = ht, tT = (t, e, r) => eT(t, e, r) <= 0;
var Xc = tT;
const rT = jh, sT = Ch, nT = jo, oT = Jc, iT = Wc, aT = Xc, cT = (t, e, r, s) => {
  switch (e) {
    case "===":
      return typeof t == "object" && (t = t.version), typeof r == "object" && (r = r.version), t === r;
    case "!==":
      return typeof t == "object" && (t = t.version), typeof r == "object" && (r = r.version), t !== r;
    case "":
    case "=":
    case "==":
      return rT(t, r, s);
    case "!=":
      return sT(t, r, s);
    case ">":
      return nT(t, r, s);
    case ">=":
      return oT(t, r, s);
    case "<":
      return iT(t, r, s);
    case "<=":
      return aT(t, r, s);
    default:
      throw new TypeError(`Invalid operator: ${e}`);
  }
};
var Dh = cT;
const lT = Ue, uT = $s, { safeRe: An, t: jn } = on, dT = (t, e) => {
  if (t instanceof lT)
    return t;
  if (typeof t == "number" && (t = String(t)), typeof t != "string")
    return null;
  e = e || {};
  let r = null;
  if (!e.rtl)
    r = t.match(e.includePrerelease ? An[jn.COERCEFULL] : An[jn.COERCE]);
  else {
    const c = e.includePrerelease ? An[jn.COERCERTLFULL] : An[jn.COERCERTL];
    let d;
    for (; (d = c.exec(t)) && (!r || r.index + r[0].length !== t.length); )
      (!r || d.index + d[0].length !== r.index + r[0].length) && (r = d), c.lastIndex = d.index + d[1].length + d[2].length;
    c.lastIndex = -1;
  }
  if (r === null)
    return null;
  const s = r[2], n = r[3] || "0", o = r[4] || "0", i = e.includePrerelease && r[5] ? `-${r[5]}` : "", a = e.includePrerelease && r[6] ? `+${r[6]}` : "";
  return uT(`${s}.${n}.${o}${i}${a}`, e);
};
var fT = dT;
class hT {
  constructor() {
    this.max = 1e3, this.map = /* @__PURE__ */ new Map();
  }
  get(e) {
    const r = this.map.get(e);
    if (r !== void 0)
      return this.map.delete(e), this.map.set(e, r), r;
  }
  delete(e) {
    return this.map.delete(e);
  }
  set(e, r) {
    if (!this.delete(e) && r !== void 0) {
      if (this.map.size >= this.max) {
        const n = this.map.keys().next().value;
        this.delete(n);
      }
      this.map.set(e, r);
    }
    return this;
  }
}
var mT = hT, ui, qu;
function mt() {
  if (qu) return ui;
  qu = 1;
  const t = /\s+/g;
  class e {
    constructor(A, F) {
      if (F = n(F), A instanceof e)
        return A.loose === !!F.loose && A.includePrerelease === !!F.includePrerelease ? A : new e(A.raw, F);
      if (A instanceof o)
        return this.raw = A.value, this.set = [[A]], this.formatted = void 0, this;
      if (this.options = F, this.loose = !!F.loose, this.includePrerelease = !!F.includePrerelease, this.raw = A.trim().replace(t, " "), this.set = this.raw.split("||").map((M) => this.parseRange(M.trim())).filter((M) => M.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const M = this.set[0];
        if (this.set = this.set.filter((B) => !y(B[0])), this.set.length === 0)
          this.set = [M];
        else if (this.set.length > 1) {
          for (const B of this.set)
            if (B.length === 1 && $(B[0])) {
              this.set = [B];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let A = 0; A < this.set.length; A++) {
          A > 0 && (this.formatted += "||");
          const F = this.set[A];
          for (let M = 0; M < F.length; M++)
            M > 0 && (this.formatted += " "), this.formatted += F[M].toString().trim();
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(A) {
      const M = ((this.options.includePrerelease && _) | (this.options.loose && v)) + ":" + A, B = s.get(M);
      if (B)
        return B;
      const L = this.options.loose, k = L ? c[d.HYPHENRANGELOOSE] : c[d.HYPHENRANGE];
      A = A.replace(k, G(this.options.includePrerelease)), i("hyphen replace", A), A = A.replace(c[d.COMPARATORTRIM], u), i("comparator trim", A), A = A.replace(c[d.TILDETRIM], f), i("tilde trim", A), A = A.replace(c[d.CARETTRIM], E), i("caret trim", A);
      let p = A.split(" ").map((h) => w(h, this.options)).join(" ").split(/\s+/).map((h) => K(h, this.options));
      L && (p = p.filter((h) => (i("loose invalid filter", h, this.options), !!h.match(c[d.COMPARATORLOOSE])))), i("range list", p);
      const b = /* @__PURE__ */ new Map(), g = p.map((h) => new o(h, this.options));
      for (const h of g) {
        if (y(h))
          return [h];
        b.set(h.value, h);
      }
      b.size > 1 && b.has("") && b.delete("");
      const l = [...b.values()];
      return s.set(M, l), l;
    }
    intersects(A, F) {
      if (!(A instanceof e))
        throw new TypeError("a Range is required");
      return this.set.some((M) => m(M, F) && A.set.some((B) => m(B, F) && M.every((L) => B.every((k) => L.intersects(k, F)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(A) {
      if (!A)
        return !1;
      if (typeof A == "string")
        try {
          A = new a(A, this.options);
        } catch {
          return !1;
        }
      for (let F = 0; F < this.set.length; F++)
        if (ae(this.set[F], A, this.options))
          return !0;
      return !1;
    }
  }
  ui = e;
  const r = mT, s = new r(), n = Gc, o = Co(), i = Ao, a = Ue, {
    safeRe: c,
    t: d,
    comparatorTrimReplace: u,
    tildeTrimReplace: f,
    caretTrimReplace: E
  } = on, { FLAG_INCLUDE_PRERELEASE: _, FLAG_LOOSE: v } = Io, y = (R) => R.value === "<0.0.0-0", $ = (R) => R.value === "", m = (R, A) => {
    let F = !0;
    const M = R.slice();
    let B = M.pop();
    for (; F && M.length; )
      F = M.every((L) => B.intersects(L, A)), B = M.pop();
    return F;
  }, w = (R, A) => (R = R.replace(c[d.BUILD], ""), i("comp", R, A), R = V(R, A), i("caret", R), R = T(R, A), i("tildes", R), R = ce(R, A), i("xrange", R), R = ye(R, A), i("stars", R), R), P = (R) => !R || R.toLowerCase() === "x" || R === "*", T = (R, A) => R.trim().split(/\s+/).map((F) => N(F, A)).join(" "), N = (R, A) => {
    const F = A.loose ? c[d.TILDELOOSE] : c[d.TILDE];
    return R.replace(F, (M, B, L, k, p) => {
      i("tilde", R, M, B, L, k, p);
      let b;
      return P(B) ? b = "" : P(L) ? b = `>=${B}.0.0 <${+B + 1}.0.0-0` : P(k) ? b = `>=${B}.${L}.0 <${B}.${+L + 1}.0-0` : p ? (i("replaceTilde pr", p), b = `>=${B}.${L}.${k}-${p} <${B}.${+L + 1}.0-0`) : b = `>=${B}.${L}.${k} <${B}.${+L + 1}.0-0`, i("tilde return", b), b;
    });
  }, V = (R, A) => R.trim().split(/\s+/).map((F) => H(F, A)).join(" "), H = (R, A) => {
    i("caret", R, A);
    const F = A.loose ? c[d.CARETLOOSE] : c[d.CARET], M = A.includePrerelease ? "-0" : "";
    return R.replace(F, (B, L, k, p, b) => {
      i("caret", R, B, L, k, p, b);
      let g;
      return P(L) ? g = "" : P(k) ? g = `>=${L}.0.0${M} <${+L + 1}.0.0-0` : P(p) ? L === "0" ? g = `>=${L}.${k}.0${M} <${L}.${+k + 1}.0-0` : g = `>=${L}.${k}.0${M} <${+L + 1}.0.0-0` : b ? (i("replaceCaret pr", b), L === "0" ? k === "0" ? g = `>=${L}.${k}.${p}-${b} <${L}.${k}.${+p + 1}-0` : g = `>=${L}.${k}.${p}-${b} <${L}.${+k + 1}.0-0` : g = `>=${L}.${k}.${p}-${b} <${+L + 1}.0.0-0`) : (i("no pr"), L === "0" ? k === "0" ? g = `>=${L}.${k}.${p}${M} <${L}.${k}.${+p + 1}-0` : g = `>=${L}.${k}.${p}${M} <${L}.${+k + 1}.0-0` : g = `>=${L}.${k}.${p} <${+L + 1}.0.0-0`), i("caret return", g), g;
    });
  }, ce = (R, A) => (i("replaceXRanges", R, A), R.split(/\s+/).map((F) => fe(F, A)).join(" ")), fe = (R, A) => {
    R = R.trim();
    const F = A.loose ? c[d.XRANGELOOSE] : c[d.XRANGE];
    return R.replace(F, (M, B, L, k, p, b) => {
      i("xRange", R, M, B, L, k, p, b);
      const g = P(L), l = g || P(k), h = l || P(p), S = h;
      return B === "=" && S && (B = ""), b = A.includePrerelease ? "-0" : "", g ? B === ">" || B === "<" ? M = "<0.0.0-0" : M = "*" : B && S ? (l && (k = 0), p = 0, B === ">" ? (B = ">=", l ? (L = +L + 1, k = 0, p = 0) : (k = +k + 1, p = 0)) : B === "<=" && (B = "<", l ? L = +L + 1 : k = +k + 1), B === "<" && (b = "-0"), M = `${B + L}.${k}.${p}${b}`) : l ? M = `>=${L}.0.0${b} <${+L + 1}.0.0-0` : h && (M = `>=${L}.${k}.0${b} <${L}.${+k + 1}.0-0`), i("xRange return", M), M;
    });
  }, ye = (R, A) => (i("replaceStars", R, A), R.trim().replace(c[d.STAR], "")), K = (R, A) => (i("replaceGTE0", R, A), R.trim().replace(c[A.includePrerelease ? d.GTE0PRE : d.GTE0], "")), G = (R) => (A, F, M, B, L, k, p, b, g, l, h, S) => (P(M) ? F = "" : P(B) ? F = `>=${M}.0.0${R ? "-0" : ""}` : P(L) ? F = `>=${M}.${B}.0${R ? "-0" : ""}` : k ? F = `>=${F}` : F = `>=${F}${R ? "-0" : ""}`, P(g) ? b = "" : P(l) ? b = `<${+g + 1}.0.0-0` : P(h) ? b = `<${g}.${+l + 1}.0-0` : S ? b = `<=${g}.${l}.${h}-${S}` : R ? b = `<${g}.${l}.${+h + 1}-0` : b = `<=${b}`, `${F} ${b}`.trim()), ae = (R, A, F) => {
    for (let M = 0; M < R.length; M++)
      if (!R[M].test(A))
        return !1;
    if (A.prerelease.length && !F.includePrerelease) {
      for (let M = 0; M < R.length; M++)
        if (i(R[M].semver), R[M].semver !== o.ANY && R[M].semver.prerelease.length > 0) {
          const B = R[M].semver;
          if (B.major === A.major && B.minor === A.minor && B.patch === A.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return ui;
}
var di, Bu;
function Co() {
  if (Bu) return di;
  Bu = 1;
  const t = Symbol("SemVer ANY");
  class e {
    static get ANY() {
      return t;
    }
    constructor(u, f) {
      if (f = r(f), u instanceof e) {
        if (u.loose === !!f.loose)
          return u;
        u = u.value;
      }
      u = u.trim().split(/\s+/).join(" "), i("comparator", u, f), this.options = f, this.loose = !!f.loose, this.parse(u), this.semver === t ? this.value = "" : this.value = this.operator + this.semver.version, i("comp", this);
    }
    parse(u) {
      const f = this.options.loose ? s[n.COMPARATORLOOSE] : s[n.COMPARATOR], E = u.match(f);
      if (!E)
        throw new TypeError(`Invalid comparator: ${u}`);
      this.operator = E[1] !== void 0 ? E[1] : "", this.operator === "=" && (this.operator = ""), E[2] ? this.semver = new a(E[2], this.options.loose) : this.semver = t;
    }
    toString() {
      return this.value;
    }
    test(u) {
      if (i("Comparator.test", u, this.options.loose), this.semver === t || u === t)
        return !0;
      if (typeof u == "string")
        try {
          u = new a(u, this.options);
        } catch {
          return !1;
        }
      return o(u, this.operator, this.semver, this.options);
    }
    intersects(u, f) {
      if (!(u instanceof e))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new c(u.value, f).test(this.value) : u.operator === "" ? u.value === "" ? !0 : new c(this.value, f).test(u.semver) : (f = r(f), f.includePrerelease && (this.value === "<0.0.0-0" || u.value === "<0.0.0-0") || !f.includePrerelease && (this.value.startsWith("<0.0.0") || u.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && u.operator.startsWith(">") || this.operator.startsWith("<") && u.operator.startsWith("<") || this.semver.version === u.semver.version && this.operator.includes("=") && u.operator.includes("=") || o(this.semver, "<", u.semver, f) && this.operator.startsWith(">") && u.operator.startsWith("<") || o(this.semver, ">", u.semver, f) && this.operator.startsWith("<") && u.operator.startsWith(">")));
    }
  }
  di = e;
  const r = Gc, { safeRe: s, t: n } = on, o = Dh, i = Ao, a = Ue, c = mt();
  return di;
}
const pT = mt(), yT = (t, e, r) => {
  try {
    e = new pT(e, r);
  } catch {
    return !1;
  }
  return e.test(t);
};
var Do = yT;
const $T = mt(), gT = (t, e) => new $T(t, e).set.map((r) => r.map((s) => s.value).join(" ").trim().split(" "));
var _T = gT;
const vT = Ue, wT = mt(), ET = (t, e, r) => {
  let s = null, n = null, o = null;
  try {
    o = new wT(e, r);
  } catch {
    return null;
  }
  return t.forEach((i) => {
    o.test(i) && (!s || n.compare(i) === -1) && (s = i, n = new vT(s, r));
  }), s;
};
var ST = ET;
const bT = Ue, PT = mt(), kT = (t, e, r) => {
  let s = null, n = null, o = null;
  try {
    o = new PT(e, r);
  } catch {
    return null;
  }
  return t.forEach((i) => {
    o.test(i) && (!s || n.compare(i) === 1) && (s = i, n = new bT(s, r));
  }), s;
};
var TT = kT;
const fi = Ue, NT = mt(), Gu = jo, OT = (t, e) => {
  t = new NT(t, e);
  let r = new fi("0.0.0");
  if (t.test(r) || (r = new fi("0.0.0-0"), t.test(r)))
    return r;
  r = null;
  for (let s = 0; s < t.set.length; ++s) {
    const n = t.set[s];
    let o = null;
    n.forEach((i) => {
      const a = new fi(i.semver.version);
      switch (i.operator) {
        case ">":
          a.prerelease.length === 0 ? a.patch++ : a.prerelease.push(0), a.raw = a.format();
        case "":
        case ">=":
          (!o || Gu(a, o)) && (o = a);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${i.operator}`);
      }
    }), o && (!r || Gu(r, o)) && (r = o);
  }
  return r && t.test(r) ? r : null;
};
var RT = OT;
const IT = mt(), AT = (t, e) => {
  try {
    return new IT(t, e).range || "*";
  } catch {
    return null;
  }
};
var jT = AT;
const CT = Ue, Mh = Co(), { ANY: DT } = Mh, MT = mt(), LT = Do, Hu = jo, Wu = Wc, FT = Xc, UT = Jc, VT = (t, e, r, s) => {
  t = new CT(t, s), e = new MT(e, s);
  let n, o, i, a, c;
  switch (r) {
    case ">":
      n = Hu, o = FT, i = Wu, a = ">", c = ">=";
      break;
    case "<":
      n = Wu, o = UT, i = Hu, a = "<", c = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (LT(t, e, s))
    return !1;
  for (let d = 0; d < e.set.length; ++d) {
    const u = e.set[d];
    let f = null, E = null;
    if (u.forEach((_) => {
      _.semver === DT && (_ = new Mh(">=0.0.0")), f = f || _, E = E || _, n(_.semver, f.semver, s) ? f = _ : i(_.semver, E.semver, s) && (E = _);
    }), f.operator === a || f.operator === c || (!E.operator || E.operator === a) && o(t, E.semver))
      return !1;
    if (E.operator === c && i(t, E.semver))
      return !1;
  }
  return !0;
};
var Yc = VT;
const zT = Yc, KT = (t, e, r) => zT(t, e, ">", r);
var xT = KT;
const qT = Yc, BT = (t, e, r) => qT(t, e, "<", r);
var GT = BT;
const Ju = mt(), HT = (t, e, r) => (t = new Ju(t, r), e = new Ju(e, r), t.intersects(e, r));
var WT = HT;
const JT = Do, XT = ht;
var YT = (t, e, r) => {
  const s = [];
  let n = null, o = null;
  const i = t.sort((u, f) => XT(u, f, r));
  for (const u of i)
    JT(u, e, r) ? (o = u, n || (n = u)) : (o && s.push([n, o]), o = null, n = null);
  n && s.push([n, null]);
  const a = [];
  for (const [u, f] of s)
    u === f ? a.push(u) : !f && u === i[0] ? a.push("*") : f ? u === i[0] ? a.push(`<=${f}`) : a.push(`${u} - ${f}`) : a.push(`>=${u}`);
  const c = a.join(" || "), d = typeof e.raw == "string" ? e.raw : String(e);
  return c.length < d.length ? c : e;
};
const Xu = mt(), Zc = Co(), { ANY: hi } = Zc, Ns = Do, Qc = ht, ZT = (t, e, r = {}) => {
  if (t === e)
    return !0;
  t = new Xu(t, r), e = new Xu(e, r);
  let s = !1;
  e: for (const n of t.set) {
    for (const o of e.set) {
      const i = eN(n, o, r);
      if (s = s || i !== null, i)
        continue e;
    }
    if (s)
      return !1;
  }
  return !0;
}, QT = [new Zc(">=0.0.0-0")], Yu = [new Zc(">=0.0.0")], eN = (t, e, r) => {
  if (t === e)
    return !0;
  if (t.length === 1 && t[0].semver === hi) {
    if (e.length === 1 && e[0].semver === hi)
      return !0;
    r.includePrerelease ? t = QT : t = Yu;
  }
  if (e.length === 1 && e[0].semver === hi) {
    if (r.includePrerelease)
      return !0;
    e = Yu;
  }
  const s = /* @__PURE__ */ new Set();
  let n, o;
  for (const _ of t)
    _.operator === ">" || _.operator === ">=" ? n = Zu(n, _, r) : _.operator === "<" || _.operator === "<=" ? o = Qu(o, _, r) : s.add(_.semver);
  if (s.size > 1)
    return null;
  let i;
  if (n && o) {
    if (i = Qc(n.semver, o.semver, r), i > 0)
      return null;
    if (i === 0 && (n.operator !== ">=" || o.operator !== "<="))
      return null;
  }
  for (const _ of s) {
    if (n && !Ns(_, String(n), r) || o && !Ns(_, String(o), r))
      return null;
    for (const v of e)
      if (!Ns(_, String(v), r))
        return !1;
    return !0;
  }
  let a, c, d, u, f = o && !r.includePrerelease && o.semver.prerelease.length ? o.semver : !1, E = n && !r.includePrerelease && n.semver.prerelease.length ? n.semver : !1;
  f && f.prerelease.length === 1 && o.operator === "<" && f.prerelease[0] === 0 && (f = !1);
  for (const _ of e) {
    if (u = u || _.operator === ">" || _.operator === ">=", d = d || _.operator === "<" || _.operator === "<=", n) {
      if (E && _.semver.prerelease && _.semver.prerelease.length && _.semver.major === E.major && _.semver.minor === E.minor && _.semver.patch === E.patch && (E = !1), _.operator === ">" || _.operator === ">=") {
        if (a = Zu(n, _, r), a === _ && a !== n)
          return !1;
      } else if (n.operator === ">=" && !Ns(n.semver, String(_), r))
        return !1;
    }
    if (o) {
      if (f && _.semver.prerelease && _.semver.prerelease.length && _.semver.major === f.major && _.semver.minor === f.minor && _.semver.patch === f.patch && (f = !1), _.operator === "<" || _.operator === "<=") {
        if (c = Qu(o, _, r), c === _ && c !== o)
          return !1;
      } else if (o.operator === "<=" && !Ns(o.semver, String(_), r))
        return !1;
    }
    if (!_.operator && (o || n) && i !== 0)
      return !1;
  }
  return !(n && d && !o && i !== 0 || o && u && !n && i !== 0 || E || f);
}, Zu = (t, e, r) => {
  if (!t)
    return e;
  const s = Qc(t.semver, e.semver, r);
  return s > 0 ? t : s < 0 || e.operator === ">" && t.operator === ">=" ? e : t;
}, Qu = (t, e, r) => {
  if (!t)
    return e;
  const s = Qc(t.semver, e.semver, r);
  return s < 0 ? t : s > 0 || e.operator === "<" && t.operator === "<=" ? e : t;
};
var tN = ZT;
const mi = on, ed = Io, rN = Ue, td = Ah, sN = $s, nN = uk, oN = hk, iN = pk, aN = $k, cN = vk, lN = Sk, uN = kk, dN = Ok, fN = ht, hN = jk, mN = Mk, pN = Hc, yN = Vk, $N = xk, gN = jo, _N = Wc, vN = jh, wN = Ch, EN = Jc, SN = Xc, bN = Dh, PN = fT, kN = Co(), TN = mt(), NN = Do, ON = _T, RN = ST, IN = TT, AN = RT, jN = jT, CN = Yc, DN = xT, MN = GT, LN = WT, FN = YT, UN = tN;
var VN = {
  parse: sN,
  valid: nN,
  clean: oN,
  inc: iN,
  diff: aN,
  major: cN,
  minor: lN,
  patch: uN,
  prerelease: dN,
  compare: fN,
  rcompare: hN,
  compareLoose: mN,
  compareBuild: pN,
  sort: yN,
  rsort: $N,
  gt: gN,
  lt: _N,
  eq: vN,
  neq: wN,
  gte: EN,
  lte: SN,
  cmp: bN,
  coerce: PN,
  Comparator: kN,
  Range: TN,
  satisfies: NN,
  toComparators: ON,
  maxSatisfying: RN,
  minSatisfying: IN,
  minVersion: AN,
  validRange: jN,
  outside: CN,
  gtr: DN,
  ltr: MN,
  intersects: LN,
  simplifyRange: FN,
  subset: UN,
  SemVer: rN,
  re: mi.re,
  src: mi.src,
  tokens: mi.t,
  SEMVER_SPEC_VERSION: ed.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: ed.RELEASE_TYPES,
  compareIdentifiers: td.compareIdentifiers,
  rcompareIdentifiers: td.rcompareIdentifiers
};
const zr = /* @__PURE__ */ Yi(VN), zN = Object.prototype.toString, KN = "[object Uint8Array]", xN = "[object ArrayBuffer]";
function Lh(t, e, r) {
  return t ? t.constructor === e ? !0 : zN.call(t) === r : !1;
}
function Fh(t) {
  return Lh(t, Uint8Array, KN);
}
function qN(t) {
  return Lh(t, ArrayBuffer, xN);
}
function BN(t) {
  return Fh(t) || qN(t);
}
function GN(t) {
  if (!Fh(t))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof t}\``);
}
function HN(t) {
  if (!BN(t))
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof t}\``);
}
function pi(t, e) {
  if (t.length === 0)
    return new Uint8Array(0);
  e ?? (e = t.reduce((n, o) => n + o.length, 0));
  const r = new Uint8Array(e);
  let s = 0;
  for (const n of t)
    GN(n), r.set(n, s), s += n.length;
  return r;
}
const Cn = {
  utf8: new globalThis.TextDecoder("utf8")
};
function Dn(t, e = "utf8") {
  return HN(t), Cn[e] ?? (Cn[e] = new globalThis.TextDecoder(e)), Cn[e].decode(t);
}
function WN(t) {
  if (typeof t != "string")
    throw new TypeError(`Expected \`string\`, got \`${typeof t}\``);
}
const JN = new globalThis.TextEncoder();
function Mn(t) {
  return WN(t), JN.encode(t);
}
Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
const yi = "aes-256-cbc", xt = () => /* @__PURE__ */ Object.create(null), rd = (t) => t !== void 0, $i = (t, e) => {
  const r = /* @__PURE__ */ new Set([
    "undefined",
    "symbol",
    "function"
  ]), s = typeof e;
  if (r.has(s))
    throw new TypeError(`Setting a value of type \`${s}\` for key \`${t}\` is not allowed as it's not supported by JSON`);
}, Bt = "__internal__", gi = `${Bt}.migrations.version`;
var Jt, ct, Ve, Qe, Or, Rr, rs, gt, be, Uh, Vh, zh, Kh, xh, qh, Bh, Gh;
class XN {
  constructor(e = {}) {
    pt(this, be);
    de(this, "path");
    de(this, "events");
    pt(this, Jt);
    pt(this, ct);
    pt(this, Ve);
    pt(this, Qe, {});
    pt(this, Or, !1);
    pt(this, Rr);
    pt(this, rs);
    pt(this, gt);
    de(this, "_deserialize", (e) => JSON.parse(e));
    de(this, "_serialize", (e) => JSON.stringify(e, void 0, "	"));
    const r = Pt(this, be, Uh).call(this, e);
    He(this, Ve, r), Pt(this, be, Vh).call(this, r), Pt(this, be, Kh).call(this, r), Pt(this, be, xh).call(this, r), this.events = new EventTarget(), He(this, ct, r.encryptionKey), this.path = Pt(this, be, qh).call(this, r), Pt(this, be, Bh).call(this, r), r.watch && this._watch();
  }
  get(e, r) {
    if (Y(this, Ve).accessPropertiesByDotNotation)
      return this._get(e, r);
    const { store: s } = this;
    return e in s ? s[e] : r;
  }
  set(e, r) {
    if (typeof e != "string" && typeof e != "object")
      throw new TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof e}`);
    if (typeof e != "object" && r === void 0)
      throw new TypeError("Use `delete()` to clear values");
    if (this._containsReservedKey(e))
      throw new TypeError(`Please don't use the ${Bt} key, as it's used to manage this module internal operations.`);
    const { store: s } = this, n = (o, i) => {
      if ($i(o, i), Y(this, Ve).accessPropertiesByDotNotation)
        hn(s, o, i);
      else {
        if (o === "__proto__" || o === "constructor" || o === "prototype")
          return;
        s[o] = i;
      }
    };
    if (typeof e == "object") {
      const o = e;
      for (const [i, a] of Object.entries(o))
        n(i, a);
    } else
      n(e, r);
    this.store = s;
  }
  has(e) {
    return Y(this, Ve).accessPropertiesByDotNotation ? Yo(this.store, e) : e in this.store;
  }
  appendToArray(e, r) {
    $i(e, r);
    const s = Y(this, Ve).accessPropertiesByDotNotation ? this._get(e, []) : e in this.store ? this.store[e] : [];
    if (!Array.isArray(s))
      throw new TypeError(`The key \`${e}\` is already set to a non-array value`);
    this.set(e, [...s, r]);
  }
  /**
      Reset items to their default values, as defined by the `defaults` or `schema` option.
  
      @see `clear()` to reset all items.
  
      @param keys - The keys of the items to reset.
      */
  reset(...e) {
    for (const r of e)
      rd(Y(this, Qe)[r]) && this.set(r, Y(this, Qe)[r]);
  }
  delete(e) {
    const { store: r } = this;
    Y(this, Ve).accessPropertiesByDotNotation ? by(r, e) : delete r[e], this.store = r;
  }
  /**
      Delete all items.
  
      This resets known items to their default values, if defined by the `defaults` or `schema` option.
      */
  clear() {
    const e = xt();
    for (const r of Object.keys(Y(this, Qe)))
      rd(Y(this, Qe)[r]) && ($i(r, Y(this, Qe)[r]), Y(this, Ve).accessPropertiesByDotNotation ? hn(e, r, Y(this, Qe)[r]) : e[r] = Y(this, Qe)[r]);
    this.store = e;
  }
  onDidChange(e, r) {
    if (typeof e != "string")
      throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof e}`);
    if (typeof r != "function")
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof r}`);
    return this._handleValueChange(() => this.get(e), r);
  }
  /**
      Watches the whole config object, calling `callback` on any changes.
  
      @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
      @returns A function, that when called, will unsubscribe.
      */
  onDidAnyChange(e) {
    if (typeof e != "function")
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof e}`);
    return this._handleStoreChange(e);
  }
  get size() {
    return Object.keys(this.store).filter((r) => !this._isReservedKeyPath(r)).length;
  }
  /**
      Get all the config as an object or replace the current config with an object.
  
      @example
      ```
      console.log(config.store);
      //=> {name: 'John', age: 30}
      ```
  
      @example
      ```
      config.store = {
          hello: 'world'
      };
      ```
      */
  get store() {
    var e;
    try {
      const r = Q.readFileSync(this.path, Y(this, ct) ? null : "utf8"), s = this._decryptData(r), n = this._deserialize(s);
      return Y(this, Or) || this._validate(n), Object.assign(xt(), n);
    } catch (r) {
      if ((r == null ? void 0 : r.code) === "ENOENT")
        return this._ensureDirectory(), xt();
      if (Y(this, Ve).clearInvalidConfig) {
        const s = r;
        if (s.name === "SyntaxError" || (e = s.message) != null && e.startsWith("Config schema violation:"))
          return xt();
      }
      throw r;
    }
  }
  set store(e) {
    if (this._ensureDirectory(), !Yo(e, Bt))
      try {
        const r = Q.readFileSync(this.path, Y(this, ct) ? null : "utf8"), s = this._decryptData(r), n = this._deserialize(s);
        Yo(n, Bt) && hn(e, Bt, jl(n, Bt));
      } catch {
      }
    Y(this, Or) || this._validate(e), this._write(e), this.events.dispatchEvent(new Event("change"));
  }
  *[Symbol.iterator]() {
    for (const [e, r] of Object.entries(this.store))
      this._isReservedKeyPath(e) || (yield [e, r]);
  }
  /**
  Close the file watcher if one exists. This is useful in tests to prevent the process from hanging.
  */
  _closeWatcher() {
    Y(this, Rr) && (Y(this, Rr).close(), He(this, Rr, void 0)), Y(this, rs) && (Q.unwatchFile(this.path), He(this, rs, !1)), He(this, gt, void 0);
  }
  _decryptData(e) {
    if (!Y(this, ct))
      return typeof e == "string" ? e : Dn(e);
    try {
      const r = e.slice(0, 16), s = yr.pbkdf2Sync(Y(this, ct), r, 1e4, 32, "sha512"), n = yr.createDecipheriv(yi, s, r), o = e.slice(17), i = typeof o == "string" ? Mn(o) : o;
      return Dn(pi([n.update(i), n.final()]));
    } catch {
      try {
        const r = e.slice(0, 16), s = yr.pbkdf2Sync(Y(this, ct), r.toString(), 1e4, 32, "sha512"), n = yr.createDecipheriv(yi, s, r), o = e.slice(17), i = typeof o == "string" ? Mn(o) : o;
        return Dn(pi([n.update(i), n.final()]));
      } catch {
      }
    }
    return typeof e == "string" ? e : Dn(e);
  }
  _handleStoreChange(e) {
    let r = this.store;
    const s = () => {
      const n = r, o = this.store;
      nl(o, n) || (r = o, e.call(this, o, n));
    };
    return this.events.addEventListener("change", s), () => {
      this.events.removeEventListener("change", s);
    };
  }
  _handleValueChange(e, r) {
    let s = e();
    const n = () => {
      const o = s, i = e();
      nl(i, o) || (s = i, r.call(this, i, o));
    };
    return this.events.addEventListener("change", n), () => {
      this.events.removeEventListener("change", n);
    };
  }
  _validate(e) {
    if (!Y(this, Jt) || Y(this, Jt).call(this, e) || !Y(this, Jt).errors)
      return;
    const s = Y(this, Jt).errors.map(({ instancePath: n, message: o = "" }) => `\`${n.slice(1)}\` ${o}`);
    throw new Error("Config schema violation: " + s.join("; "));
  }
  _ensureDirectory() {
    Q.mkdirSync(C.dirname(this.path), { recursive: !0 });
  }
  _write(e) {
    let r = this._serialize(e);
    if (Y(this, ct)) {
      const s = yr.randomBytes(16), n = yr.pbkdf2Sync(Y(this, ct), s, 1e4, 32, "sha512"), o = yr.createCipheriv(yi, n, s);
      r = pi([s, Mn(":"), o.update(Mn(r)), o.final()]);
    }
    if (pe.env.SNAP)
      Q.writeFileSync(this.path, r, { mode: Y(this, Ve).configFileMode });
    else
      try {
        Vd(this.path, r, { mode: Y(this, Ve).configFileMode });
      } catch (s) {
        if ((s == null ? void 0 : s.code) === "EXDEV") {
          Q.writeFileSync(this.path, r, { mode: Y(this, Ve).configFileMode });
          return;
        }
        throw s;
      }
  }
  _watch() {
    if (this._ensureDirectory(), Q.existsSync(this.path) || this._write(xt()), pe.platform === "win32" || pe.platform === "darwin") {
      Y(this, gt) ?? He(this, gt, Mu(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 100 }));
      const e = C.dirname(this.path), r = C.basename(this.path);
      He(this, Rr, Q.watch(e, { persistent: !1, encoding: "utf8" }, (s, n) => {
        n && n !== r || typeof Y(this, gt) == "function" && Y(this, gt).call(this);
      }));
    } else
      Y(this, gt) ?? He(this, gt, Mu(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 1e3 })), Q.watchFile(this.path, { persistent: !1 }, (e, r) => {
        typeof Y(this, gt) == "function" && Y(this, gt).call(this);
      }), He(this, rs, !0);
  }
  _migrate(e, r, s) {
    let n = this._get(gi, "0.0.0");
    const o = Object.keys(e).filter((a) => this._shouldPerformMigration(a, n, r));
    let i = structuredClone(this.store);
    for (const a of o)
      try {
        s && s(this, {
          fromVersion: n,
          toVersion: a,
          finalVersion: r,
          versions: o
        });
        const c = e[a];
        c == null || c(this), this._set(gi, a), n = a, i = structuredClone(this.store);
      } catch (c) {
        this.store = i;
        try {
          this._write(i);
        } catch {
        }
        const d = c instanceof Error ? c.message : String(c);
        throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${d}`);
      }
    (this._isVersionInRangeFormat(n) || !zr.eq(n, r)) && this._set(gi, r);
  }
  _containsReservedKey(e) {
    return typeof e == "string" ? this._isReservedKeyPath(e) : !e || typeof e != "object" ? !1 : this._objectContainsReservedKey(e);
  }
  _objectContainsReservedKey(e) {
    if (!e || typeof e != "object")
      return !1;
    for (const [r, s] of Object.entries(e))
      if (this._isReservedKeyPath(r) || this._objectContainsReservedKey(s))
        return !0;
    return !1;
  }
  _isReservedKeyPath(e) {
    return e === Bt || e.startsWith(`${Bt}.`);
  }
  _isVersionInRangeFormat(e) {
    return zr.clean(e) === null;
  }
  _shouldPerformMigration(e, r, s) {
    return this._isVersionInRangeFormat(e) ? r !== "0.0.0" && zr.satisfies(r, e) ? !1 : zr.satisfies(s, e) : !(zr.lte(e, r) || zr.gt(e, s));
  }
  _get(e, r) {
    return jl(this.store, e, r);
  }
  _set(e, r) {
    const { store: s } = this;
    hn(s, e, r), this.store = s;
  }
}
Jt = new WeakMap(), ct = new WeakMap(), Ve = new WeakMap(), Qe = new WeakMap(), Or = new WeakMap(), Rr = new WeakMap(), rs = new WeakMap(), gt = new WeakMap(), be = new WeakSet(), Uh = function(e) {
  const r = {
    configName: "config",
    fileExtension: "json",
    projectSuffix: "nodejs",
    clearInvalidConfig: !1,
    accessPropertiesByDotNotation: !0,
    configFileMode: 438,
    ...e
  };
  if (!r.cwd) {
    if (!r.projectName)
      throw new Error("Please specify the `projectName` option.");
    r.cwd = Ny(r.projectName, { suffix: r.projectSuffix }).config;
  }
  return typeof r.fileExtension == "string" && (r.fileExtension = r.fileExtension.replace(/^\.+/, "")), r;
}, Vh = function(e) {
  if (!(e.schema ?? e.ajvOptions ?? e.rootSchema))
    return;
  if (e.schema && typeof e.schema != "object")
    throw new TypeError("The `schema` option must be an object.");
  const r = VP.default, s = new OE.Ajv2020({
    allErrors: !0,
    useDefaults: !0,
    ...e.ajvOptions
  });
  r(s);
  const n = {
    ...e.rootSchema,
    type: "object",
    properties: e.schema
  };
  He(this, Jt, s.compile(n)), Pt(this, be, zh).call(this, e.schema);
}, zh = function(e) {
  const r = Object.entries(e ?? {});
  for (const [s, n] of r) {
    if (!n || typeof n != "object" || !Object.hasOwn(n, "default"))
      continue;
    const { default: o } = n;
    o !== void 0 && (Y(this, Qe)[s] = o);
  }
}, Kh = function(e) {
  e.defaults && Object.assign(Y(this, Qe), e.defaults);
}, xh = function(e) {
  e.serialize && (this._serialize = e.serialize), e.deserialize && (this._deserialize = e.deserialize);
}, qh = function(e) {
  const r = typeof e.fileExtension == "string" ? e.fileExtension : void 0, s = r ? `.${r}` : "";
  return C.resolve(e.cwd, `${e.configName ?? "config"}${s}`);
}, Bh = function(e) {
  if (e.migrations) {
    Pt(this, be, Gh).call(this, e), this._validate(this.store);
    return;
  }
  const r = this.store, s = Object.assign(xt(), e.defaults ?? {}, r);
  this._validate(s);
  try {
    ol.deepEqual(r, s);
  } catch {
    this.store = s;
  }
}, Gh = function(e) {
  const { migrations: r, projectVersion: s } = e;
  if (r) {
    if (!s)
      throw new Error("Please specify the `projectVersion` option.");
    He(this, Or, !0);
    try {
      const n = this.store, o = Object.assign(xt(), e.defaults ?? {}, n);
      try {
        ol.deepEqual(n, o);
      } catch {
        this._write(o);
      }
      this._migrate(r, s, e.beforeEachMigration);
    } finally {
      He(this, Or, !1);
    }
  }
};
const { app: Wn, ipcMain: Gi, shell: YN } = hd;
let sd = !1;
const nd = () => {
  if (!Gi || !Wn)
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  const t = {
    defaultCwd: Wn.getPath("userData"),
    appVersion: Wn.getVersion()
  };
  return sd || (Gi.on("electron-store-get-data", (e) => {
    e.returnValue = t;
  }), sd = !0), t;
};
class ZN extends XN {
  constructor(e) {
    let r, s;
    if (pe.type === "renderer") {
      const n = hd.ipcRenderer.sendSync("electron-store-get-data");
      if (!n)
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      ({ defaultCwd: r, appVersion: s } = n);
    } else Gi && Wn && ({ defaultCwd: r, appVersion: s } = nd());
    e = {
      name: "config",
      ...e
    }, e.projectVersion || (e.projectVersion = s), e.cwd ? e.cwd = C.isAbsolute(e.cwd) ? e.cwd : C.join(r, e.cwd) : e.cwd = r, e.configName = e.name, delete e.name, super(e);
  }
  static initRenderer() {
    nd();
  }
  async openInEditor() {
    const e = await YN.openPath(this.path);
    if (e)
      throw new Error(e);
  }
}
const QN = ["assemblyai"];
function Mo(t) {
  return QN.includes(t);
}
const as = new ZN({
  name: "secure-storage",
  schema: {
    apiKeys: {
      type: "object",
      default: {},
      properties: {
        assemblyai: {
          type: "string"
        }
      }
    }
  }
});
function eO() {
  return Bs.isEncryptionAvailable();
}
function tO(t, e) {
  try {
    if (!Mo(t))
      return { success: !1, error: `Unknown service: ${t}` };
    if (!Bs.isEncryptionAvailable())
      return {
        success: !1,
        error: "Encryption is not available on this platform"
      };
    if (!e || e.trim() === "")
      return {
        success: !1,
        error: "API key cannot be empty"
      };
    const s = Bs.encryptString(e.trim()).toString("base64"), n = as.get("apiKeys", {});
    return n[t] = s, as.set("apiKeys", n), { success: !0 };
  } catch (r) {
    return console.error(`Failed to store API key for ${t}:`, r), {
      success: !1,
      error: r instanceof Error ? r.message : "Unknown error storing API key"
    };
  }
}
function rO(t) {
  try {
    if (!Mo(t))
      return { success: !1, error: `Unknown service: ${t}` };
    if (!Bs.isEncryptionAvailable())
      return {
        success: !1,
        error: "Encryption is not available on this platform"
      };
    const r = as.get("apiKeys", {})[t];
    if (!r)
      return {
        success: !1,
        notFound: !0,
        error: `No API key found for ${t}`
      };
    const s = Buffer.from(r, "base64");
    return {
      success: !0,
      apiKey: Bs.decryptString(s)
    };
  } catch (e) {
    return console.error(`Failed to retrieve API key for ${t}:`, e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error retrieving API key"
    };
  }
}
function sO(t) {
  try {
    if (!Mo(t))
      return { success: !1, error: `Unknown service: ${t}` };
    const e = as.get("apiKeys", {});
    return t in e ? (delete e[t], as.set("apiKeys", e), { success: !0 }) : {
      success: !1,
      error: `No API key found for ${t}`
    };
  } catch (e) {
    return console.error(`Failed to delete API key for ${t}:`, e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error deleting API key"
    };
  }
}
function nO(t) {
  try {
    if (!Mo(t))
      return !1;
    const e = as.get("apiKeys", {});
    return t in e;
  } catch (e) {
    return console.error(`Failed to check API key for ${t}:`, e), !1;
  }
}
function od(t) {
  const e = C.basename(t);
  if (!e || e === "." || e === "..")
    throw new Error("Invalid file name");
  return e;
}
function oO(t, e) {
  const r = C.resolve(t), s = C.resolve(e);
  return r === s || r.startsWith(s + C.sep);
}
function iO(t) {
  return t instanceof Error && "code" in t;
}
let Kr = null, Os = null;
const id = /* @__PURE__ */ new Set();
function aO(t, e, r, s, n) {
  Z.handle("get-sources", async (o, i) => (await tm.getSources(i)).map((c) => ({
    id: c.id,
    name: c.name,
    display_id: c.display_id,
    thumbnail: c.thumbnail ? c.thumbnail.toDataURL() : null,
    appIcon: c.appIcon ? c.appIcon.toDataURL() : null
  }))), Z.handle("select-source", (o, i) => {
    Kr = i;
    const a = s();
    return a && a.close(), Kr;
  }), Z.handle("get-selected-source", () => Kr), Z.handle("open-source-selector", () => {
    const o = s();
    if (o) {
      o.focus();
      return;
    }
    e();
  }), Z.handle("switch-to-editor", () => {
    const o = r();
    o && o.close(), t();
  }), Z.handle("store-recorded-video", async (o, i, a) => {
    try {
      const c = C.join(Nt, od(a));
      return await xe.writeFile(c, Buffer.from(i)), Os = c, {
        success: !0,
        path: c,
        message: "Video stored successfully"
      };
    } catch (c) {
      return console.error("Failed to store video:", c), {
        success: !1,
        message: "Failed to store video",
        error: String(c)
      };
    }
  }), Z.handle("get-recorded-video-path", async () => {
    try {
      const i = (await xe.readdir(Nt)).filter((d) => d.endsWith(".webm"));
      if (i.length === 0)
        return { success: !1, message: "No recorded video found" };
      const a = i.sort().reverse()[0];
      return { success: !0, path: C.join(Nt, a) };
    } catch (o) {
      return console.error("Failed to get video path:", o), { success: !1, message: "Failed to get video path", error: String(o) };
    }
  }), Z.handle("set-recording-state", (o, i) => {
    const a = (Kr == null ? void 0 : Kr.name) ?? "Screen";
    n && n(i, a);
  }), Z.handle("open-external-url", async (o, i) => {
    try {
      return await rm.openExternal(i), { success: !0 };
    } catch (a) {
      return console.error("Failed to open URL:", a), { success: !1, error: String(a) };
    }
  }), Z.handle("get-asset-base-path", () => {
    try {
      return Be.isPackaged ? C.join(process.resourcesPath, "assets") : C.join(Be.getAppPath(), "public", "assets");
    } catch (o) {
      return console.error("Failed to resolve asset base path:", o), null;
    }
  }), Z.handle("save-exported-video", async (o, i, a) => {
    try {
      const c = a.toLowerCase().endsWith(".gif"), d = c ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }], u = await sl.showSaveDialog({
        title: c ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: C.join(Be.getPath("downloads"), a),
        filters: d,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      });
      return u.canceled || !u.filePath ? {
        success: !1,
        cancelled: !0,
        message: "Export cancelled"
      } : (await xe.writeFile(u.filePath, Buffer.from(i)), {
        success: !0,
        path: u.filePath,
        message: "Video exported successfully"
      });
    } catch (c) {
      return console.error("Failed to save exported video:", c), {
        success: !1,
        message: "Failed to save exported video",
        error: String(c)
      };
    }
  }), Z.handle("open-video-file-picker", async () => {
    try {
      const o = await sl.showOpenDialog({
        title: "Select Video File",
        defaultPath: Nt,
        filters: [
          { name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      if (o.canceled || o.filePaths.length === 0)
        return { success: !1, cancelled: !0 };
      const i = C.resolve(o.filePaths[0]);
      return id.add(i), {
        success: !0,
        path: i
      };
    } catch (o) {
      return console.error("Failed to open file picker:", o), {
        success: !1,
        message: "Failed to open file picker",
        error: String(o)
      };
    }
  }), Z.handle("set-current-video-path", (o, i) => (Os = i, { success: !0 })), Z.handle("get-current-video-path", () => Os ? { success: !0, path: Os } : { success: !1 }), Z.handle("clear-current-video-path", () => (Os = null, { success: !0 })), Z.handle("get-platform", () => process.platform), Z.handle("presets:get", async () => await Pm()), Z.handle("presets:save", async (o, i) => await km(i)), Z.handle("presets:update", async (o, i, a) => await Tm(i, a)), Z.handle("presets:delete", async (o, i) => await Nm(i)), Z.handle("presets:duplicate", async (o, i) => await Om(i)), Z.handle("presets:setDefault", async (o, i) => await Rm(i)), Z.handle("transcribe-video", async (o, i) => await py(i, (a) => {
    const c = r();
    c && !c.isDestroyed() && c.webContents.send("transcription-progress", a);
  })), Z.handle("secure-storage:is-available", () => ({ available: eO() })), Z.handle("secure-storage:set-api-key", async (o, i, a) => tO(i, a)), Z.handle("secure-storage:get-api-key", async (o, i) => rO(i)), Z.handle("secure-storage:delete-api-key", async (o, i) => sO(i)), Z.handle("secure-storage:has-api-key", async (o, i) => ({ hasKey: nO(i) })), Z.handle("auto-zoom:start-detection", async (o, i, a) => {
    try {
      return Jo.start(i, a), { success: !0 };
    } catch (c) {
      return console.error("Failed to start mouse event detection:", c), { success: !1, error: String(c) };
    }
  }), Z.handle("auto-zoom:stop-detection", async () => {
    try {
      return { success: !0, data: Jo.stop() };
    } catch (o) {
      return console.error("Failed to stop mouse event detection:", o), { success: !1, error: String(o) };
    }
  }), Z.handle("auto-zoom:save-events", async (o, i, a) => {
    try {
      const c = C.join(Nt, od(a));
      return await xe.writeFile(c, JSON.stringify(i, null, 2)), { success: !0, path: c };
    } catch (c) {
      return console.error("Failed to save mouse events:", c), { success: !1, error: String(c) };
    }
  }), Z.handle("auto-zoom:get-events", async (o, i) => {
    try {
      const a = C.resolve(i), c = oO(a, Nt), d = id.has(a);
      if (!c && !d)
        return { success: !1, error: "Invalid video path" };
      const u = a.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".events.json");
      try {
        const f = await xe.readFile(u, "utf-8");
        return { success: !0, data: JSON.parse(f) };
      } catch (f) {
        if (iO(f) && f.code === "ENOENT")
          return { success: !1, notFound: !0 };
        throw f;
      }
    } catch (a) {
      return console.error("Failed to get mouse events:", a), { success: !1, error: String(a) };
    }
  }), Z.handle("auto-zoom:is-running", () => Jo.isRunning());
}
let _i = null;
async function cO() {
  if (!_i)
    try {
      _i = await import("uiohook-napi");
    } catch (t) {
      throw console.error("[KeystrokeService] Failed to load uiohook-napi:", t), t;
    }
  return _i;
}
class lO {
  constructor() {
    de(this, "running", !1);
    de(this, "eventCallback", null);
    de(this, "errorCallback", null);
    de(this, "keydownHandler", null);
    de(this, "clickHandler", null);
    de(this, "uiohook", null);
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
        this.uiohook = await cO(), this.setupEventHandlers(), this.uiohook.uIOhook.start(), this.running = !0;
      } catch (e) {
        this.running = !1, this.removeEventHandlers();
        const r = this.createServiceError(e);
        throw console.error("[KeystrokeService] Failed to initialize uiohook:", {
          code: r.code,
          message: r.message,
          originalError: e instanceof Error ? e.stack : e
        }), this.emitError(r), e;
      }
  }
  /**
   * Create a structured error object from a caught error
   * 
   * @param error The caught error
   * @returns Structured KeystrokeServiceError
   */
  createServiceError(e) {
    const r = e instanceof Error ? e : void 0, s = e instanceof Error ? e.message : String(e);
    return s.includes("Cannot find module") || s.includes("not found") || s.includes("failed to load") || s.includes("ENOENT") || s.includes("MODULE_NOT_FOUND") ? {
      code: "LIBRARY_LOAD_FAILED",
      message: "Failed to load uiohook native library. The keystroke overlay feature is unavailable.",
      originalError: r
    } : s.includes("init") || s.includes("start") || s.includes("permission") || s.includes("access") ? {
      code: "INIT_FAILED",
      message: "Failed to initialize keystroke capture. Please check system permissions.",
      originalError: r
    } : {
      code: "UNKNOWN",
      message: `Keystroke capture failed: ${s}`,
      originalError: r
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
    this.keydownHandler = (r) => {
      if (this.eventCallback) {
        const s = {
          type: "keystroke",
          timestamp: Date.now(),
          key: String(r.keycode),
          // Use keycode as string for now; proper mapping in task 6
          keyCode: r.keycode,
          modifiers: {
            ctrl: r.ctrlKey ?? !1,
            alt: r.altKey ?? !1,
            shift: r.shiftKey ?? !1,
            meta: r.metaKey ?? !1
          }
        };
        this.eventCallback(s);
      }
    }, this.clickHandler = (r) => {
      if (this.eventCallback) {
        const s = {
          1: "left",
          2: "right",
          3: "middle"
        }, n = r.button, o = s[n];
        if (o) {
          const i = {
            type: "mouse",
            timestamp: Date.now(),
            button: o,
            modifiers: {
              ctrl: r.ctrlKey ?? !1,
              alt: r.altKey ?? !1,
              shift: r.shiftKey ?? !1,
              meta: r.metaKey ?? !1
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
const Rs = new lO(), ad = {
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
}, cd = {
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
}, ld = {
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
function uO(t) {
  return ad[t] ? ad[t] : cd[t] ? cd[t] : ld[t] ? ld[t] : `Key(0x${t.toString(16).toUpperCase().padStart(4, "0")})`;
}
class dO {
  constructor() {
    de(this, "running", !1);
    de(this, "recordingId", "");
    de(this, "recordingStartTime", 0);
    de(this, "events", []);
    de(this, "eventHandler", null);
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
    this.recordingId = e, this.recordingStartTime = Date.now(), this.events = [], this.running = !0, this.eventHandler = (r) => {
      this.handleEvent(r);
    }, Rs.onEvent(this.eventHandler), Rs.isRunning() || Rs.start().catch((r) => {
      console.error("[KeystrokeEventRecorder] Failed to start keystroke service:", r), this.running = !1, this.eventHandler = null;
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
    Rs.removeEventListener(), Rs.stop(), this.eventHandler = null;
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
    const r = e.timestamp - this.recordingStartTime, s = Math.max(0, r);
    if (e.type === "keystroke") {
      const n = {
        type: "keystroke",
        timestamp: s,
        keyCode: e.keyCode,
        keyName: uO(e.keyCode),
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
        timestamp: s,
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
const vi = new dO();
function fO(t) {
  return t.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".keystroke.json");
}
async function hO(t, e) {
  try {
    if (!t || typeof t.version != "number" || !Array.isArray(t.events))
      return console.error("[KeystrokeEventRecorder] Invalid event data: missing required fields"), {
        success: !1,
        error: "Invalid event data: missing required fields"
      };
    const r = JSON.stringify(t, null, 2);
    return await xe.writeFile(e, r, "utf-8"), console.log(`[KeystrokeEventRecorder] Saved ${t.events.length} events to ${e}`), {
      success: !0,
      path: e
    };
  } catch (r) {
    const s = r instanceof Error ? r.message : String(r);
    return console.error(`[KeystrokeEventRecorder] Failed to save events to ${e}:`, s), {
      success: !1,
      error: s
    };
  }
}
async function mO(t) {
  try {
    const e = await xe.readFile(t, "utf-8");
    let r;
    try {
      r = JSON.parse(e);
    } catch (s) {
      const n = s instanceof Error ? s.message : String(s);
      return console.error(`[KeystrokeEventRecorder] Corrupt JSON in ${t}:`, n), {
        success: !1,
        error: "Invalid JSON format in keystroke event file"
      };
    }
    return pO(r) ? (console.log(`[KeystrokeEventRecorder] Loaded ${r.events.length} events from ${t}`), {
      success: !0,
      data: r
    }) : (console.error(`[KeystrokeEventRecorder] Invalid keystroke event file format in ${t}`), {
      success: !1,
      error: "Invalid keystroke event file format"
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT")
      return {
        success: !1,
        notFound: !0
      };
    const r = e instanceof Error ? e.message : String(e);
    return console.error(`[KeystrokeEventRecorder] Failed to load events from ${t}:`, r), {
      success: !1,
      error: r
    };
  }
}
function pO(t) {
  if (!t || typeof t != "object")
    return !1;
  const e = t;
  if (e.version !== 1 || typeof e.recordingId != "string" || !Array.isArray(e.events))
    return !1;
  for (const r of e.events)
    if (!yO(r))
      return !1;
  return !0;
}
function yO(t) {
  if (!t || typeof t != "object")
    return !1;
  const e = t;
  return typeof e.timestamp != "number" || e.timestamp < 0 || !$O(e.modifiers) ? !1 : e.type === "keystroke" ? typeof e.keyCode == "number" && typeof e.keyName == "string" && e.keyName.length > 0 : e.type === "mouse" ? e.button === "left" || e.button === "right" || e.button === "middle" : !1;
}
function $O(t) {
  if (!t || typeof t != "object")
    return !1;
  const e = t;
  return typeof e.ctrl == "boolean" && typeof e.alt == "boolean" && typeof e.shift == "boolean" && typeof e.meta == "boolean";
}
const gO = {
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
}, el = {
  captureEnabled: !1,
  defaultStyle: gO,
  defaultPosition: "bottom-center"
}, _O = "keystroke-editor-settings.json", Hh = 1;
function vO(t) {
  const e = C.basename(t);
  if (!e || e === "." || e === "..")
    throw new Error("Invalid file name");
  return e;
}
function wO(t, e) {
  const r = C.resolve(t), s = C.resolve(e);
  return r === s || r.startsWith(s + C.sep);
}
function Hi() {
  return C.join(Be.getPath("userData"), _O);
}
function wi() {
  return {
    version: Hh,
    settings: { ...el }
  };
}
async function Wh() {
  try {
    const t = Hi(), e = await xe.readFile(t, "utf-8"), r = JSON.parse(e);
    return !r.settings || typeof r.settings != "object" ? (console.warn("[KeystrokeEditor] Invalid settings file, creating new store"), wi()) : {
      version: r.version || Hh,
      settings: { ...el, ...r.settings }
    };
  } catch (t) {
    if (t instanceof Error && "code" in t && t.code === "ENOENT")
      return wi();
    console.error("[KeystrokeEditor] Failed to read settings file:", t);
    try {
      const e = Hi(), r = e + ".backup." + Date.now();
      await xe.rename(e, r), console.log("[KeystrokeEditor] Backed up corrupt settings file to:", r);
    } catch {
    }
    return wi();
  }
}
async function EO(t) {
  const e = Hi();
  await xe.writeFile(e, JSON.stringify(t, null, 2), "utf-8");
}
async function SO() {
  try {
    return {
      success: !0,
      settings: (await Wh()).settings
    };
  } catch (t) {
    return console.error("[KeystrokeEditor] Failed to get settings:", t), {
      success: !1,
      settings: { ...el }
    };
  }
}
async function bO(t) {
  try {
    const e = await Wh();
    return e.settings = { ...e.settings, ...t }, await EO(e), { success: !0, settings: e.settings };
  } catch (e) {
    return console.error("[KeystrokeEditor] Failed to save settings:", e), { success: !1, error: String(e) };
  }
}
async function PO() {
  try {
    return await import("uiohook-napi"), { available: !0 };
  } catch (t) {
    const e = t instanceof Error ? t.message : String(t);
    return console.error("[KeystrokeEditor] Keystroke service not available:", e), {
      available: !1,
      error: "Keystroke capture is not available on this system. The native library could not be loaded."
    };
  }
}
function kO(t) {
  Z.handle("keystroke-editor:check-availability", async () => await PO()), Z.handle("keystroke-editor:start-capture", async (e, r) => {
    try {
      return vi.start(r), { success: !0 };
    } catch (s) {
      return console.error("[KeystrokeEditor] Failed to start capture:", s), {
        success: !1,
        error: s instanceof Error ? s.message : String(s)
      };
    }
  }), Z.handle("keystroke-editor:stop-capture", async () => {
    try {
      return { success: !0, data: vi.stop() };
    } catch (e) {
      return console.error("[KeystrokeEditor] Failed to stop capture:", e), {
        success: !1,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }), Z.handle("keystroke-editor:is-capturing", () => vi.isRunning()), Z.handle(
    "keystroke-editor:save-events",
    async (e, r, s) => {
      try {
        const n = vO(s), o = C.join(t, n), i = await hO(r, o);
        return i.success || console.error("[KeystrokeEditor] Failed to save events:", i.error), i;
      } catch (n) {
        const o = n instanceof Error ? n.message : String(n);
        return console.error("[KeystrokeEditor] Failed to save events:", o), {
          success: !1,
          error: o
        };
      }
    }
  ), Z.handle("keystroke-editor:load-events", async (e, r) => {
    try {
      const s = C.resolve(r);
      if (!wO(s, t))
        return { success: !1, error: "Invalid video path" };
      const n = fO(s), o = await mO(n);
      return !o.success && !o.notFound && o.error && console.error("[KeystrokeEditor] Failed to load events (corrupt file):", o.error), o;
    } catch (s) {
      const n = s instanceof Error ? s.message : String(s);
      return console.error("[KeystrokeEditor] Failed to load events:", n), {
        success: !1,
        error: n
      };
    }
  }), Z.handle("keystroke-editor:get-settings", async () => await SO()), Z.handle(
    "keystroke-editor:set-settings",
    async (e, r) => await bO(r)
  ), console.log("[KeystrokeEditor] IPC handlers registered");
}
const TO = C.dirname(Wi(import.meta.url)), Nt = C.join(Be.getPath("userData"), "recordings");
async function NO() {
  try {
    await xe.mkdir(Nt, { recursive: !0 }), console.log("RECORDINGS_DIR:", Nt), console.log("User Data Path:", Be.getPath("userData"));
  } catch (t) {
    console.error("Failed to create recordings directory:", t);
  }
}
process.env.APP_ROOT = C.join(TO, "..");
const OO = process.env.VITE_DEV_SERVER_URL, ER = C.join(process.env.APP_ROOT, "dist-electron"), Jh = C.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = OO ? C.join(process.env.APP_ROOT, "public") : Jh;
let Ee = null, Cs = null, Jr = null, Xh = "", ud = !1;
const Yh = Zh("openscreen.png"), RO = Zh("rec-button.png");
function tl() {
  Ee = vm();
}
function dd() {
  Jr = new nm(Yh);
}
function Zh(t) {
  return sm.createFromPath(C.join(process.env.VITE_PUBLIC || Jh, t)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function fd(t = !1) {
  if (!Jr) return;
  const e = t ? RO : Yh, r = process.platform === "darwin" ? "⌃⇧R" : "Ctrl+Shift+R", s = t ? `Recording: ${Xh} (${r} to stop)` : `OpenScreen (${r} to record)`, n = t ? [
    {
      label: "Stop Recording",
      accelerator: "CommandOrControl+Shift+R",
      click: () => {
        Ee && !Ee.isDestroyed() && Ee.webContents.send("stop-recording-from-tray");
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        Ee && !Ee.isDestroyed() ? Ee.isMinimized() && Ee.restore() : tl();
      }
    },
    {
      label: "Quit",
      click: () => {
        Be.quit();
      }
    }
  ];
  Jr.setImage(e), Jr.setToolTip(s), Jr.setContextMenu(om.buildFromTemplate(n));
}
function IO() {
  Ee && (Ee.close(), Ee = null), Ee = wm();
}
function AO() {
  return Cs = Em(), Cs.on("closed", () => {
    Cs = null;
  }), Cs;
}
Be.on("window-all-closed", () => {
});
Be.on("activate", () => {
  fo.getAllWindows().length === 0 && tl();
});
Be.whenReady().then(async () => {
  const { ipcMain: t } = await import("electron");
  t.on("hud-overlay-close", () => {
    Be.quit();
  }), dd(), fd(), await NO(), aO(
    IO,
    AO,
    () => Ee,
    () => Cs,
    (r, s) => {
      ud = r, Xh = s, Jr || dd(), fd(r), r || Ee && Ee.restore();
    }
  ), kO(Nt), pd.register("CommandOrControl+Shift+R", () => {
    !Ee || Ee.isDestroyed() || (ud ? Ee.webContents.send("stop-recording-from-tray") : Ee.webContents.send("start-recording-from-shortcut"));
  }) || console.warn("[Shortcut] Failed to register Ctrl+Shift+R shortcut — may already be in use by another application"), tl();
});
Be.on("will-quit", () => {
  pd.unregisterAll();
});
export {
  ER as MAIN_DIST,
  Nt as RECORDINGS_DIR,
  Jh as RENDERER_DIST,
  OO as VITE_DEV_SERVER_URL
};
