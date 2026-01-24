var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, screen, BrowserWindow, app, desktopCapturer, shell, dialog, nativeImage, Tray, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import fs$1 from "node:fs/promises";
import { WritableStream } from "stream/web";
import require$$0$3 from "events";
import require$$1$2 from "https";
import require$$2$1 from "http";
import require$$3 from "net";
import require$$4 from "tls";
import require$$1$1 from "crypto";
import require$$0$2, { Readable as Readable$1 } from "stream";
import require$$7 from "url";
import require$$0 from "zlib";
import require$$0$1 from "buffer";
import * as fs from "fs";
import { createReadStream } from "fs";
import { spawn } from "child_process";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL$1 = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST$1 = path$1.join(APP_ROOT, "dist");
let hudOverlayWindow = null;
let keystrokeOverlayWindow = null;
ipcMain.on("hud-overlay-hide", () => {
  if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
    hudOverlayWindow.minimize();
  }
});
function createHudOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const windowWidth = 500;
  const windowHeight = 350;
  const x = Math.floor(workArea.x + (workArea.width - windowWidth) / 2);
  const y = Math.floor(workArea.y + workArea.height - windowHeight - 5);
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 580,
    maxWidth: 580,
    minHeight: 350,
    maxHeight: 350,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("windowType=mic-settings")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 340,
          height: 520,
          frame: false,
          transparent: true,
          resizable: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          parent: win,
          modal: false,
          webPreferences: {
            preload: path$1.join(__dirname$1, "preload.mjs"),
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    return { action: "deny" };
  });
  hudOverlayWindow = win;
  win.on("closed", () => {
    if (hudOverlayWindow === win) {
      hudOverlayWindow = null;
    }
  });
  if (VITE_DEV_SERVER_URL$1) {
    win.loadURL(VITE_DEV_SERVER_URL$1 + "?windowType=hud-overlay");
  } else {
    win.loadFile(path$1.join(RENDERER_DIST$1, "index.html"), {
      query: { windowType: "hud-overlay" }
    });
  }
  return win;
}
function createEditorWindow() {
  const isMac = process.platform === "darwin";
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...isMac && {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 12, y: 12 }
    },
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    title: "OpenScreen",
    backgroundColor: "#000000",
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  });
  win.maximize();
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL$1) {
    win.loadURL(VITE_DEV_SERVER_URL$1 + "?windowType=editor");
  } else {
    win.loadFile(path$1.join(RENDERER_DIST$1, "index.html"), {
      query: { windowType: "editor" }
    });
  }
  return win;
}
function createSourceSelectorWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 620,
    height: 420,
    minHeight: 350,
    maxHeight: 500,
    x: Math.round((width - 620) / 2),
    y: Math.round((height - 420) / 2),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL$1) {
    win.loadURL(VITE_DEV_SERVER_URL$1 + "?windowType=source-selector");
  } else {
    win.loadFile(path$1.join(RENDERER_DIST$1, "index.html"), {
      query: { windowType: "source-selector" }
    });
  }
  return win;
}
function createKeystrokeOverlayWindow(displayId) {
  screen.getAllDisplays();
  const targetDisplay = screen.getPrimaryDisplay();
  const { bounds } = targetDisplay;
  const windowWidth = 400;
  const windowHeight = 100;
  const x = Math.floor(bounds.x + (bounds.width - windowWidth) / 2);
  const y = Math.floor(bounds.y + bounds.height - windowHeight - 50);
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    // 2.1: No window frame
    transparent: true,
    // 2.1: Transparent background
    resizable: false,
    alwaysOnTop: true,
    // 2.2: Always on top
    skipTaskbar: true,
    // 2.4: Excluded from taskbar
    hasShadow: false,
    focusable: false,
    // Don't steal focus
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });
  win.setIgnoreMouseEvents(true);
  if (VITE_DEV_SERVER_URL$1) {
    win.loadURL(VITE_DEV_SERVER_URL$1 + "?windowType=keystroke-overlay");
  } else {
    win.loadFile(path$1.join(RENDERER_DIST$1, "index.html"), {
      query: { windowType: "keystroke-overlay" }
    });
  }
  keystrokeOverlayWindow = win;
  win.on("closed", () => {
    if (keystrokeOverlayWindow === win) {
      keystrokeOverlayWindow = null;
    }
  });
  return win;
}
function getKeystrokeOverlayWindow() {
  return keystrokeOverlayWindow;
}
function hideKeystrokeOverlayWindow() {
  if (keystrokeOverlayWindow && !keystrokeOverlayWindow.isDestroyed()) {
    keystrokeOverlayWindow.hide();
  }
}
function showKeystrokeOverlayWindow() {
  if (keystrokeOverlayWindow && !keystrokeOverlayWindow.isDestroyed()) {
    keystrokeOverlayWindow.show();
  }
}
const PRESETS_FILE_NAME = "presets.json";
const CURRENT_VERSION$2 = 1;
function getPresetsFilePath() {
  return path$1.join(app.getPath("userData"), PRESETS_FILE_NAME);
}
function createEmptyStore() {
  return {
    version: CURRENT_VERSION$2,
    defaultPresetId: null,
    presets: []
  };
}
async function readPresetsStore() {
  try {
    const filePath = getPresetsFilePath();
    const data = await fs$1.readFile(filePath, "utf-8");
    const store = JSON.parse(data);
    if (!store.presets || !Array.isArray(store.presets)) {
      console.warn("Invalid presets file, creating new store");
      return createEmptyStore();
    }
    return store;
  } catch (error) {
    if (error.code === "ENOENT") {
      return createEmptyStore();
    }
    console.error("Failed to read presets file:", error);
    try {
      const filePath = getPresetsFilePath();
      const backupPath = filePath + ".backup." + Date.now();
      await fs$1.rename(filePath, backupPath);
      console.log("Backed up corrupt presets file to:", backupPath);
    } catch {
    }
    return createEmptyStore();
  }
}
async function writePresetsStore(store) {
  const filePath = getPresetsFilePath();
  await fs$1.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}
async function getPresets() {
  try {
    const store = await readPresetsStore();
    return {
      success: true,
      presets: store.presets,
      defaultPresetId: store.defaultPresetId
    };
  } catch (error) {
    console.error("Failed to get presets:", error);
    return {
      success: false,
      presets: [],
      defaultPresetId: null
    };
  }
}
async function savePreset(preset) {
  try {
    const store = await readPresetsStore();
    const newPreset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    if (newPreset.isDefault) {
      store.presets = store.presets.map((p) => ({ ...p, isDefault: false }));
      store.defaultPresetId = newPreset.id;
    }
    store.presets.push(newPreset);
    await writePresetsStore(store);
    return { success: true, preset: newPreset };
  } catch (error) {
    console.error("Failed to save preset:", error);
    return { success: false, error: String(error) };
  }
}
async function updatePreset(id, updates) {
  try {
    const store = await readPresetsStore();
    const index = store.presets.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, error: "Preset not found" };
    }
    if (updates.isDefault === true) {
      store.presets = store.presets.map((p) => ({ ...p, isDefault: false }));
      store.defaultPresetId = id;
    } else if (updates.isDefault === false && store.defaultPresetId === id) {
      store.defaultPresetId = null;
    }
    store.presets[index] = { ...store.presets[index], ...updates };
    await writePresetsStore(store);
    return { success: true, preset: store.presets[index] };
  } catch (error) {
    console.error("Failed to update preset:", error);
    return { success: false, error: String(error) };
  }
}
async function deletePreset(id) {
  try {
    const store = await readPresetsStore();
    const index = store.presets.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, error: "Preset not found" };
    }
    if (store.defaultPresetId === id) {
      store.defaultPresetId = null;
    }
    store.presets.splice(index, 1);
    await writePresetsStore(store);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete preset:", error);
    return { success: false, error: String(error) };
  }
}
async function duplicatePreset(id) {
  try {
    const store = await readPresetsStore();
    const original = store.presets.find((p) => p.id === id);
    if (!original) {
      return { success: false, error: "Preset not found" };
    }
    const newPreset = {
      ...original,
      id: crypto.randomUUID(),
      name: `Copy of ${original.name}`,
      createdAt: Date.now(),
      isDefault: false
      // Duplicates should never be default
    };
    store.presets.push(newPreset);
    await writePresetsStore(store);
    return { success: true, preset: newPreset };
  } catch (error) {
    console.error("Failed to duplicate preset:", error);
    return { success: false, error: String(error) };
  }
}
async function setDefaultPreset(id) {
  try {
    const store = await readPresetsStore();
    store.presets = store.presets.map((p) => ({ ...p, isDefault: false }));
    store.defaultPresetId = null;
    if (id) {
      const preset = store.presets.find((p) => p.id === id);
      if (!preset) {
        return { success: false, error: "Preset not found" };
      }
      preset.isDefault = true;
      store.defaultPresetId = id;
    }
    await writePresetsStore(store);
    return { success: true };
  } catch (error) {
    console.error("Failed to set default preset:", error);
    return { success: false, error: String(error) };
  }
}
let uIOhookModule = null;
async function getUIOhook() {
  if (!uIOhookModule) {
    try {
      uIOhookModule = await import("./index-CuUw7h0t.js").then((n) => n.i);
    } catch (error) {
      console.error("[KeystrokeService] Failed to load uiohook-napi:", error);
      throw error;
    }
  }
  return uIOhookModule;
}
class KeystrokeService {
  constructor() {
    __publicField(this, "running", false);
    __publicField(this, "eventCallback", null);
    __publicField(this, "errorCallback", null);
    __publicField(this, "keydownHandler", null);
    __publicField(this, "clickHandler", null);
    __publicField(this, "uiohook", null);
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
    if (this.running) {
      return;
    }
    try {
      this.uiohook = await getUIOhook();
      this.setupEventHandlers();
      this.uiohook.uIOhook.start();
      this.running = true;
    } catch (error) {
      this.running = false;
      this.removeEventHandlers();
      const serviceError = this.createServiceError(error);
      console.error("[KeystrokeService] Failed to initialize uiohook:", {
        code: serviceError.code,
        message: serviceError.message,
        originalError: error instanceof Error ? error.stack : error
      });
      this.emitError(serviceError);
      throw error;
    }
  }
  /**
   * Create a structured error object from a caught error
   * 
   * @param error The caught error
   * @returns Structured KeystrokeServiceError
   */
  createServiceError(error) {
    const originalError = error instanceof Error ? error : void 0;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Cannot find module") || errorMessage.includes("not found") || errorMessage.includes("failed to load") || errorMessage.includes("ENOENT") || errorMessage.includes("MODULE_NOT_FOUND")) {
      return {
        code: "LIBRARY_LOAD_FAILED",
        message: "Failed to load uiohook native library. The keystroke overlay feature is unavailable.",
        originalError
      };
    }
    if (errorMessage.includes("init") || errorMessage.includes("start") || errorMessage.includes("permission") || errorMessage.includes("access")) {
      return {
        code: "INIT_FAILED",
        message: "Failed to initialize keystroke capture. Please check system permissions.",
        originalError
      };
    }
    return {
      code: "UNKNOWN",
      message: `Keystroke capture failed: ${errorMessage}`,
      originalError
    };
  }
  /**
   * Emit an error to the registered error callback
   * 
   * @param error The error to emit
   */
  emitError(error) {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
  /**
   * Stop the keystroke capture service
   * Cleans up uiohook listener and removes event handlers
   */
  stop() {
    if (!this.running) {
      return;
    }
    try {
      if (this.uiohook) {
        this.uiohook.uIOhook.stop();
      }
      this.removeEventHandlers();
      this.running = false;
    } catch (error) {
      this.running = false;
      console.error("Error stopping keystroke service:", error);
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
  onEvent(callback) {
    this.eventCallback = callback;
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
  onError(callback) {
    this.errorCallback = callback;
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
    if (!this.uiohook) {
      throw new Error("uiohook module not loaded");
    }
    const { uIOhook } = this.uiohook;
    this.keydownHandler = (e) => {
      if (this.eventCallback) {
        const keystrokeEvent = {
          type: "keystroke",
          timestamp: Date.now(),
          key: String(e.keycode),
          // Use keycode as string for now; proper mapping in task 6
          keyCode: e.keycode,
          modifiers: {
            ctrl: e.ctrlKey ?? false,
            alt: e.altKey ?? false,
            shift: e.shiftKey ?? false,
            meta: e.metaKey ?? false
          }
        };
        this.eventCallback(keystrokeEvent);
      }
    };
    this.clickHandler = (e) => {
      if (this.eventCallback) {
        const buttonMap = {
          1: "left",
          2: "right",
          3: "middle"
        };
        const buttonNumber = e.button;
        const button = buttonMap[buttonNumber];
        if (button) {
          const mouseEvent = {
            type: "mouse",
            timestamp: Date.now(),
            button,
            modifiers: {
              ctrl: e.ctrlKey ?? false,
              alt: e.altKey ?? false,
              shift: e.shiftKey ?? false,
              meta: e.metaKey ?? false
            }
          };
          this.eventCallback(mouseEvent);
        }
      }
    };
    uIOhook.on("keydown", this.keydownHandler);
    uIOhook.on("click", this.clickHandler);
  }
  /**
   * Remove uiohook event handlers
   */
  removeEventHandlers() {
    if (!this.uiohook) {
      return;
    }
    const { uIOhook } = this.uiohook;
    if (this.keydownHandler) {
      uIOhook.off("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.clickHandler) {
      uIOhook.off("click", this.clickHandler);
      this.clickHandler = null;
    }
  }
}
const keystrokeService = new KeystrokeService();
const DEFAULT_KEYSTROKE_SETTINGS = {
  enabled: false,
  position: "bottom-center",
  fadeDurationMs: 1500,
  fadeDelayMs: 1e3,
  groupingThresholdMs: 100,
  showMouseClicks: true,
  textScale: 1
};
const KEYSTROKE_SETTINGS_FILE_NAME = "keystroke-settings.json";
const CURRENT_VERSION$1 = 1;
function getKeystrokeSettingsFilePath() {
  return path$1.join(app.getPath("userData"), KEYSTROKE_SETTINGS_FILE_NAME);
}
function createDefaultStore$1() {
  return {
    version: CURRENT_VERSION$1,
    settings: { ...DEFAULT_KEYSTROKE_SETTINGS }
  };
}
async function readKeystrokeSettingsStore() {
  try {
    const filePath = getKeystrokeSettingsFilePath();
    const data = await fs$1.readFile(filePath, "utf-8");
    const store = JSON.parse(data);
    if (!store.settings || typeof store.settings !== "object") {
      console.warn("Invalid keystroke settings file, creating new store");
      return createDefaultStore$1();
    }
    return {
      version: store.version || CURRENT_VERSION$1,
      settings: { ...DEFAULT_KEYSTROKE_SETTINGS, ...store.settings }
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return createDefaultStore$1();
    }
    console.error("Failed to read keystroke settings file:", error);
    try {
      const filePath = getKeystrokeSettingsFilePath();
      const backupPath = filePath + ".backup." + Date.now();
      await fs$1.rename(filePath, backupPath);
      console.log("Backed up corrupt keystroke settings file to:", backupPath);
    } catch {
    }
    return createDefaultStore$1();
  }
}
async function writeKeystrokeSettingsStore(store) {
  const filePath = getKeystrokeSettingsFilePath();
  await fs$1.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}
async function getKeystrokeSettings() {
  try {
    const store = await readKeystrokeSettingsStore();
    return {
      success: true,
      settings: store.settings
    };
  } catch (error) {
    console.error("Failed to get keystroke settings:", error);
    return {
      success: false,
      settings: { ...DEFAULT_KEYSTROKE_SETTINGS }
    };
  }
}
async function setKeystrokeSettings(settings) {
  try {
    const store = await readKeystrokeSettingsStore();
    store.settings = { ...store.settings, ...settings };
    await writeKeystrokeSettingsStore(store);
    return { success: true, settings: store.settings };
  } catch (error) {
    console.error("Failed to save keystroke settings:", error);
    return { success: false, error: String(error) };
  }
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var bufferUtil$1 = { exports: {} };
const BINARY_TYPES$2 = ["nodebuffer", "arraybuffer", "fragments"];
const hasBlob$1 = typeof Blob !== "undefined";
if (hasBlob$1) BINARY_TYPES$2.push("blob");
var constants = {
  BINARY_TYPES: BINARY_TYPES$2,
  CLOSE_TIMEOUT: 3e4,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: hasBlob$1,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
};
throw new Error(`Could not resolve "bufferutil" imported by "ws". Is it installed?`);
const __viteOptionalPeerDep_bufferutil_ws = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteOptionalPeerDep_bufferutil_ws);
var unmask$1;
var mask;
const { EMPTY_BUFFER: EMPTY_BUFFER$3 } = constants;
const FastBuffer$2 = Buffer[Symbol.species];
function concat$1(list, totalLength) {
  if (list.length === 0) return EMPTY_BUFFER$3;
  if (list.length === 1) return list[0];
  const target = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  for (let i = 0; i < list.length; i++) {
    const buf = list[i];
    target.set(buf, offset);
    offset += buf.length;
  }
  if (offset < totalLength) {
    return new FastBuffer$2(target.buffer, target.byteOffset, offset);
  }
  return target;
}
function _mask(source, mask2, output, offset, length) {
  for (let i = 0; i < length; i++) {
    output[offset + i] = source[i] ^ mask2[i & 3];
  }
}
function _unmask(buffer, mask2) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] ^= mask2[i & 3];
  }
}
function toArrayBuffer$1(buf) {
  if (buf.length === buf.buffer.byteLength) {
    return buf.buffer;
  }
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}
function toBuffer$2(data) {
  toBuffer$2.readOnly = true;
  if (Buffer.isBuffer(data)) return data;
  let buf;
  if (data instanceof ArrayBuffer) {
    buf = new FastBuffer$2(data);
  } else if (ArrayBuffer.isView(data)) {
    buf = new FastBuffer$2(data.buffer, data.byteOffset, data.byteLength);
  } else {
    buf = Buffer.from(data);
    toBuffer$2.readOnly = false;
  }
  return buf;
}
bufferUtil$1.exports = {
  concat: concat$1,
  mask: _mask,
  toArrayBuffer: toArrayBuffer$1,
  toBuffer: toBuffer$2,
  unmask: _unmask
};
if (!process.env.WS_NO_BUFFER_UTIL) {
  try {
    const bufferUtil2 = require$$1;
    mask = bufferUtil$1.exports.mask = function(source, mask2, output, offset, length) {
      if (length < 48) _mask(source, mask2, output, offset, length);
      else bufferUtil2.mask(source, mask2, output, offset, length);
    };
    unmask$1 = bufferUtil$1.exports.unmask = function(buffer, mask2) {
      if (buffer.length < 32) _unmask(buffer, mask2);
      else bufferUtil2.unmask(buffer, mask2);
    };
  } catch (e) {
  }
}
var bufferUtilExports = bufferUtil$1.exports;
const kDone = Symbol("kDone");
const kRun = Symbol("kRun");
let Limiter$1 = class Limiter {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(concurrency) {
    this[kDone] = () => {
      this.pending--;
      this[kRun]();
    };
    this.concurrency = concurrency || Infinity;
    this.jobs = [];
    this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(job) {
    this.jobs.push(job);
    this[kRun]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [kRun]() {
    if (this.pending === this.concurrency) return;
    if (this.jobs.length) {
      const job = this.jobs.shift();
      this.pending++;
      job(this[kDone]);
    }
  }
};
var limiter = Limiter$1;
const zlib = require$$0;
const bufferUtil = bufferUtilExports;
const Limiter2 = limiter;
const { kStatusCode: kStatusCode$2 } = constants;
const FastBuffer$1 = Buffer[Symbol.species];
const TRAILER = Buffer.from([0, 0, 255, 255]);
const kPerMessageDeflate = Symbol("permessage-deflate");
const kTotalLength = Symbol("total-length");
const kCallback = Symbol("callback");
const kBuffers = Symbol("buffers");
const kError$1 = Symbol("error");
let zlibLimiter;
let PerMessageDeflate$3 = class PerMessageDeflate {
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
  constructor(options, isServer, maxPayload) {
    this._maxPayload = maxPayload | 0;
    this._options = options || {};
    this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
    this._isServer = !!isServer;
    this._deflate = null;
    this._inflate = null;
    this.params = null;
    if (!zlibLimiter) {
      const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      zlibLimiter = new Limiter2(concurrency);
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
    const params = {};
    if (this._options.serverNoContextTakeover) {
      params.server_no_context_takeover = true;
    }
    if (this._options.clientNoContextTakeover) {
      params.client_no_context_takeover = true;
    }
    if (this._options.serverMaxWindowBits) {
      params.server_max_window_bits = this._options.serverMaxWindowBits;
    }
    if (this._options.clientMaxWindowBits) {
      params.client_max_window_bits = this._options.clientMaxWindowBits;
    } else if (this._options.clientMaxWindowBits == null) {
      params.client_max_window_bits = true;
    }
    return params;
  }
  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(configurations) {
    configurations = this.normalizeParams(configurations);
    this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
    return this.params;
  }
  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate) {
      this._inflate.close();
      this._inflate = null;
    }
    if (this._deflate) {
      const callback = this._deflate[kCallback];
      this._deflate.close();
      this._deflate = null;
      if (callback) {
        callback(
          new Error(
            "The deflate stream was closed while data was being processed"
          )
        );
      }
    }
  }
  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(offers) {
    const opts = this._options;
    const accepted = offers.find((params) => {
      if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
        return false;
      }
      return true;
    });
    if (!accepted) {
      throw new Error("None of the extension offers can be accepted");
    }
    if (opts.serverNoContextTakeover) {
      accepted.server_no_context_takeover = true;
    }
    if (opts.clientNoContextTakeover) {
      accepted.client_no_context_takeover = true;
    }
    if (typeof opts.serverMaxWindowBits === "number") {
      accepted.server_max_window_bits = opts.serverMaxWindowBits;
    }
    if (typeof opts.clientMaxWindowBits === "number") {
      accepted.client_max_window_bits = opts.clientMaxWindowBits;
    } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
      delete accepted.client_max_window_bits;
    }
    return accepted;
  }
  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(response) {
    const params = response[0];
    if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    }
    if (!params.client_max_window_bits) {
      if (typeof this._options.clientMaxWindowBits === "number") {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      }
    } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    }
    return params;
  }
  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(configurations) {
    configurations.forEach((params) => {
      Object.keys(params).forEach((key) => {
        let value = params[key];
        if (value.length > 1) {
          throw new Error(`Parameter "${key}" must have only a single value`);
        }
        value = value[0];
        if (key === "client_max_window_bits") {
          if (value !== true) {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
            value = num;
          } else if (!this._isServer) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else if (key === "server_max_window_bits") {
          const num = +value;
          if (!Number.isInteger(num) || num < 8 || num > 15) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
          value = num;
        } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
          if (value !== true) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else {
          throw new Error(`Unknown parameter "${key}"`);
        }
        params[key] = value;
      });
    });
    return configurations;
  }
  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._decompress(data, fin, (err, result) => {
        done();
        callback(err, result);
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
  compress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._compress(data, fin, (err, result) => {
        done();
        callback(err, result);
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
  _decompress(data, fin, callback) {
    const endpoint = this._isServer ? "client" : "server";
    if (!this._inflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
      this._inflate = zlib.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits
      });
      this._inflate[kPerMessageDeflate] = this;
      this._inflate[kTotalLength] = 0;
      this._inflate[kBuffers] = [];
      this._inflate.on("error", inflateOnError);
      this._inflate.on("data", inflateOnData);
    }
    this._inflate[kCallback] = callback;
    this._inflate.write(data);
    if (fin) this._inflate.write(TRAILER);
    this._inflate.flush(() => {
      const err = this._inflate[kError$1];
      if (err) {
        this._inflate.close();
        this._inflate = null;
        callback(err);
        return;
      }
      const data2 = bufferUtil.concat(
        this._inflate[kBuffers],
        this._inflate[kTotalLength]
      );
      if (this._inflate._readableState.endEmitted) {
        this._inflate.close();
        this._inflate = null;
      } else {
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._inflate.reset();
        }
      }
      callback(null, data2);
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
  _compress(data, fin, callback) {
    const endpoint = this._isServer ? "server" : "client";
    if (!this._deflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
      this._deflate = zlib.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits
      });
      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];
      this._deflate.on("data", deflateOnData);
    }
    this._deflate[kCallback] = callback;
    this._deflate.write(data);
    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
      if (!this._deflate) {
        return;
      }
      let data2 = bufferUtil.concat(
        this._deflate[kBuffers],
        this._deflate[kTotalLength]
      );
      if (fin) {
        data2 = new FastBuffer$1(data2.buffer, data2.byteOffset, data2.length - 4);
      }
      this._deflate[kCallback] = null;
      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];
      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
        this._deflate.reset();
      }
      callback(null, data2);
    });
  }
};
var permessageDeflate = PerMessageDeflate$3;
function deflateOnData(chunk) {
  this[kBuffers].push(chunk);
  this[kTotalLength] += chunk.length;
}
function inflateOnData(chunk) {
  this[kTotalLength] += chunk.length;
  if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
    this[kBuffers].push(chunk);
    return;
  }
  this[kError$1] = new RangeError("Max payload size exceeded");
  this[kError$1].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
  this[kError$1][kStatusCode$2] = 1009;
  this.removeListener("data", inflateOnData);
  this.reset();
}
function inflateOnError(err) {
  this[kPerMessageDeflate]._inflate = null;
  if (this[kError$1]) {
    this[kCallback](this[kError$1]);
    return;
  }
  err[kStatusCode$2] = 1007;
  this[kCallback](err);
}
var validation = { exports: {} };
throw new Error(`Could not resolve "utf-8-validate" imported by "ws". Is it installed?`);
const __viteOptionalPeerDep_utf8Validate_ws = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
const require$$2 = /* @__PURE__ */ getAugmentedNamespace(__viteOptionalPeerDep_utf8Validate_ws);
var isValidUTF8_1;
const { isUtf8 } = require$$0$1;
const { hasBlob } = constants;
const tokenChars$2 = [
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
function isValidStatusCode$2(code) {
  return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
}
function _isValidUTF8(buf) {
  const len = buf.length;
  let i = 0;
  while (i < len) {
    if ((buf[i] & 128) === 0) {
      i++;
    } else if ((buf[i] & 224) === 192) {
      if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
        return false;
      }
      i += 2;
    } else if ((buf[i] & 240) === 224) {
      if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
      buf[i] === 237 && (buf[i + 1] & 224) === 160) {
        return false;
      }
      i += 3;
    } else if ((buf[i] & 248) === 240) {
      if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
      buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
        return false;
      }
      i += 4;
    } else {
      return false;
    }
  }
  return true;
}
function isBlob$2(value) {
  return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
}
validation.exports = {
  isBlob: isBlob$2,
  isValidStatusCode: isValidStatusCode$2,
  isValidUTF8: _isValidUTF8,
  tokenChars: tokenChars$2
};
if (isUtf8) {
  isValidUTF8_1 = validation.exports.isValidUTF8 = function(buf) {
    return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
  };
} else if (!process.env.WS_NO_UTF_8_VALIDATE) {
  try {
    const isValidUTF82 = require$$2;
    isValidUTF8_1 = validation.exports.isValidUTF8 = function(buf) {
      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF82(buf);
    };
  } catch (e) {
  }
}
var validationExports = validation.exports;
const { Writable } = require$$0$2;
const PerMessageDeflate$2 = permessageDeflate;
const {
  BINARY_TYPES: BINARY_TYPES$1,
  EMPTY_BUFFER: EMPTY_BUFFER$2,
  kStatusCode: kStatusCode$1,
  kWebSocket: kWebSocket$3
} = constants;
const { concat, toArrayBuffer, unmask } = bufferUtilExports;
const { isValidStatusCode: isValidStatusCode$1, isValidUTF8 } = validationExports;
const FastBuffer = Buffer[Symbol.species];
const GET_INFO = 0;
const GET_PAYLOAD_LENGTH_16 = 1;
const GET_PAYLOAD_LENGTH_64 = 2;
const GET_MASK = 3;
const GET_DATA = 4;
const INFLATING = 5;
const DEFER_EVENT = 6;
let Receiver$1 = class Receiver extends Writable {
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
  constructor(options = {}) {
    super();
    this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
    this._binaryType = options.binaryType || BINARY_TYPES$1[0];
    this._extensions = options.extensions || {};
    this._isServer = !!options.isServer;
    this._maxPayload = options.maxPayload | 0;
    this._skipUTF8Validation = !!options.skipUTF8Validation;
    this[kWebSocket$3] = void 0;
    this._bufferedBytes = 0;
    this._buffers = [];
    this._compressed = false;
    this._payloadLength = 0;
    this._mask = void 0;
    this._fragmented = 0;
    this._masked = false;
    this._fin = false;
    this._opcode = 0;
    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragments = [];
    this._errored = false;
    this._loop = false;
    this._state = GET_INFO;
  }
  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(chunk, encoding, cb) {
    if (this._opcode === 8 && this._state == GET_INFO) return cb();
    this._bufferedBytes += chunk.length;
    this._buffers.push(chunk);
    this.startLoop(cb);
  }
  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(n) {
    this._bufferedBytes -= n;
    if (n === this._buffers[0].length) return this._buffers.shift();
    if (n < this._buffers[0].length) {
      const buf = this._buffers[0];
      this._buffers[0] = new FastBuffer(
        buf.buffer,
        buf.byteOffset + n,
        buf.length - n
      );
      return new FastBuffer(buf.buffer, buf.byteOffset, n);
    }
    const dst = Buffer.allocUnsafe(n);
    do {
      const buf = this._buffers[0];
      const offset = dst.length - n;
      if (n >= buf.length) {
        dst.set(this._buffers.shift(), offset);
      } else {
        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
        this._buffers[0] = new FastBuffer(
          buf.buffer,
          buf.byteOffset + n,
          buf.length - n
        );
      }
      n -= buf.length;
    } while (n > 0);
    return dst;
  }
  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(cb) {
    this._loop = true;
    do {
      switch (this._state) {
        case GET_INFO:
          this.getInfo(cb);
          break;
        case GET_PAYLOAD_LENGTH_16:
          this.getPayloadLength16(cb);
          break;
        case GET_PAYLOAD_LENGTH_64:
          this.getPayloadLength64(cb);
          break;
        case GET_MASK:
          this.getMask();
          break;
        case GET_DATA:
          this.getData(cb);
          break;
        case INFLATING:
        case DEFER_EVENT:
          this._loop = false;
          return;
      }
    } while (this._loop);
    if (!this._errored) cb();
  }
  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }
    const buf = this.consume(2);
    if ((buf[0] & 48) !== 0) {
      const error = this.createError(
        RangeError,
        "RSV2 and RSV3 must be clear",
        true,
        1002,
        "WS_ERR_UNEXPECTED_RSV_2_3"
      );
      cb(error);
      return;
    }
    const compressed = (buf[0] & 64) === 64;
    if (compressed && !this._extensions[PerMessageDeflate$2.extensionName]) {
      const error = this.createError(
        RangeError,
        "RSV1 must be clear",
        true,
        1002,
        "WS_ERR_UNEXPECTED_RSV_1"
      );
      cb(error);
      return;
    }
    this._fin = (buf[0] & 128) === 128;
    this._opcode = buf[0] & 15;
    this._payloadLength = buf[1] & 127;
    if (this._opcode === 0) {
      if (compressed) {
        const error = this.createError(
          RangeError,
          "RSV1 must be clear",
          true,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        cb(error);
        return;
      }
      if (!this._fragmented) {
        const error = this.createError(
          RangeError,
          "invalid opcode 0",
          true,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        cb(error);
        return;
      }
      this._opcode = this._fragmented;
    } else if (this._opcode === 1 || this._opcode === 2) {
      if (this._fragmented) {
        const error = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          true,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        cb(error);
        return;
      }
      this._compressed = compressed;
    } else if (this._opcode > 7 && this._opcode < 11) {
      if (!this._fin) {
        const error = this.createError(
          RangeError,
          "FIN must be set",
          true,
          1002,
          "WS_ERR_EXPECTED_FIN"
        );
        cb(error);
        return;
      }
      if (compressed) {
        const error = this.createError(
          RangeError,
          "RSV1 must be clear",
          true,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        cb(error);
        return;
      }
      if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
        const error = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          true,
          1002,
          "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
        );
        cb(error);
        return;
      }
    } else {
      const error = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        true,
        1002,
        "WS_ERR_INVALID_OPCODE"
      );
      cb(error);
      return;
    }
    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
    this._masked = (buf[1] & 128) === 128;
    if (this._isServer) {
      if (!this._masked) {
        const error = this.createError(
          RangeError,
          "MASK must be set",
          true,
          1002,
          "WS_ERR_EXPECTED_MASK"
        );
        cb(error);
        return;
      }
    } else if (this._masked) {
      const error = this.createError(
        RangeError,
        "MASK must be clear",
        true,
        1002,
        "WS_ERR_UNEXPECTED_MASK"
      );
      cb(error);
      return;
    }
    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
    else this.haveLength(cb);
  }
  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }
    this._payloadLength = this.consume(2).readUInt16BE(0);
    this.haveLength(cb);
  }
  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(cb) {
    if (this._bufferedBytes < 8) {
      this._loop = false;
      return;
    }
    const buf = this.consume(8);
    const num = buf.readUInt32BE(0);
    if (num > Math.pow(2, 53 - 32) - 1) {
      const error = this.createError(
        RangeError,
        "Unsupported WebSocket frame: payload length > 2^53 - 1",
        false,
        1009,
        "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
      );
      cb(error);
      return;
    }
    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
    this.haveLength(cb);
  }
  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(cb) {
    if (this._payloadLength && this._opcode < 8) {
      this._totalPayloadLength += this._payloadLength;
      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
        const error = this.createError(
          RangeError,
          "Max payload size exceeded",
          false,
          1009,
          "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
        );
        cb(error);
        return;
      }
    }
    if (this._masked) this._state = GET_MASK;
    else this._state = GET_DATA;
  }
  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = false;
      return;
    }
    this._mask = this.consume(4);
    this._state = GET_DATA;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(cb) {
    let data = EMPTY_BUFFER$2;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = false;
        return;
      }
      data = this.consume(this._payloadLength);
      if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
        unmask(data, this._mask);
      }
    }
    if (this._opcode > 7) {
      this.controlMessage(data, cb);
      return;
    }
    if (this._compressed) {
      this._state = INFLATING;
      this.decompress(data, cb);
      return;
    }
    if (data.length) {
      this._messageLength = this._totalPayloadLength;
      this._fragments.push(data);
    }
    this.dataMessage(cb);
  }
  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(data, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate$2.extensionName];
    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
      if (err) return cb(err);
      if (buf.length) {
        this._messageLength += buf.length;
        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(
            RangeError,
            "Max payload size exceeded",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          cb(error);
          return;
        }
        this._fragments.push(buf);
      }
      this.dataMessage(cb);
      if (this._state === GET_INFO) this.startLoop(cb);
    });
  }
  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(cb) {
    if (!this._fin) {
      this._state = GET_INFO;
      return;
    }
    const messageLength = this._messageLength;
    const fragments = this._fragments;
    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragmented = 0;
    this._fragments = [];
    if (this._opcode === 2) {
      let data;
      if (this._binaryType === "nodebuffer") {
        data = concat(fragments, messageLength);
      } else if (this._binaryType === "arraybuffer") {
        data = toArrayBuffer(concat(fragments, messageLength));
      } else if (this._binaryType === "blob") {
        data = new Blob(fragments);
      } else {
        data = fragments;
      }
      if (this._allowSynchronousEvents) {
        this.emit("message", data, true);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit("message", data, true);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    } else {
      const buf = concat(fragments, messageLength);
      if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
        const error = this.createError(
          Error,
          "invalid UTF-8 sequence",
          true,
          1007,
          "WS_ERR_INVALID_UTF8"
        );
        cb(error);
        return;
      }
      if (this._state === INFLATING || this._allowSynchronousEvents) {
        this.emit("message", buf, false);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit("message", buf, false);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
  }
  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(data, cb) {
    if (this._opcode === 8) {
      if (data.length === 0) {
        this._loop = false;
        this.emit("conclude", 1005, EMPTY_BUFFER$2);
        this.end();
      } else {
        const code = data.readUInt16BE(0);
        if (!isValidStatusCode$1(code)) {
          const error = this.createError(
            RangeError,
            `invalid status code ${code}`,
            true,
            1002,
            "WS_ERR_INVALID_CLOSE_CODE"
          );
          cb(error);
          return;
        }
        const buf = new FastBuffer(
          data.buffer,
          data.byteOffset + 2,
          data.length - 2
        );
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(
            Error,
            "invalid UTF-8 sequence",
            true,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          cb(error);
          return;
        }
        this._loop = false;
        this.emit("conclude", code, buf);
        this.end();
      }
      this._state = GET_INFO;
      return;
    }
    if (this._allowSynchronousEvents) {
      this.emit(this._opcode === 9 ? "ping" : "pong", data);
      this._state = GET_INFO;
    } else {
      this._state = DEFER_EVENT;
      setImmediate(() => {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
        this.startLoop(cb);
      });
    }
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
  createError(ErrorCtor, message, prefix, statusCode, errorCode) {
    this._loop = false;
    this._errored = true;
    const err = new ErrorCtor(
      prefix ? `Invalid WebSocket frame: ${message}` : message
    );
    Error.captureStackTrace(err, this.createError);
    err.code = errorCode;
    err[kStatusCode$1] = statusCode;
    return err;
  }
};
var receiver = Receiver$1;
const { Duplex: Duplex$3 } = require$$0$2;
const { randomFillSync } = require$$1$1;
const PerMessageDeflate$1 = permessageDeflate;
const { EMPTY_BUFFER: EMPTY_BUFFER$1, kWebSocket: kWebSocket$2, NOOP: NOOP$1 } = constants;
const { isBlob: isBlob$1, isValidStatusCode } = validationExports;
const { mask: applyMask, toBuffer: toBuffer$1 } = bufferUtilExports;
const kByteLength = Symbol("kByteLength");
const maskBuffer = Buffer.alloc(4);
const RANDOM_POOL_SIZE = 8 * 1024;
let randomPool;
let randomPoolPointer = RANDOM_POOL_SIZE;
const DEFAULT = 0;
const DEFLATING = 1;
const GET_BLOB_DATA = 2;
let Sender$1 = class Sender {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(socket, extensions, generateMask) {
    this._extensions = extensions || {};
    if (generateMask) {
      this._generateMask = generateMask;
      this._maskBuffer = Buffer.alloc(4);
    }
    this._socket = socket;
    this._firstFragment = true;
    this._compress = false;
    this._bufferedBytes = 0;
    this._queue = [];
    this._state = DEFAULT;
    this.onerror = NOOP$1;
    this[kWebSocket$2] = void 0;
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
  static frame(data, options) {
    let mask2;
    let merge = false;
    let offset = 2;
    let skipMasking = false;
    if (options.mask) {
      mask2 = options.maskBuffer || maskBuffer;
      if (options.generateMask) {
        options.generateMask(mask2);
      } else {
        if (randomPoolPointer === RANDOM_POOL_SIZE) {
          if (randomPool === void 0) {
            randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
          }
          randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
          randomPoolPointer = 0;
        }
        mask2[0] = randomPool[randomPoolPointer++];
        mask2[1] = randomPool[randomPoolPointer++];
        mask2[2] = randomPool[randomPoolPointer++];
        mask2[3] = randomPool[randomPoolPointer++];
      }
      skipMasking = (mask2[0] | mask2[1] | mask2[2] | mask2[3]) === 0;
      offset = 6;
    }
    let dataLength;
    if (typeof data === "string") {
      if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
        dataLength = options[kByteLength];
      } else {
        data = Buffer.from(data);
        dataLength = data.length;
      }
    } else {
      dataLength = data.length;
      merge = options.mask && options.readOnly && !skipMasking;
    }
    let payloadLength = dataLength;
    if (dataLength >= 65536) {
      offset += 8;
      payloadLength = 127;
    } else if (dataLength > 125) {
      offset += 2;
      payloadLength = 126;
    }
    const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
    target[0] = options.fin ? options.opcode | 128 : options.opcode;
    if (options.rsv1) target[0] |= 64;
    target[1] = payloadLength;
    if (payloadLength === 126) {
      target.writeUInt16BE(dataLength, 2);
    } else if (payloadLength === 127) {
      target[2] = target[3] = 0;
      target.writeUIntBE(dataLength, 4, 6);
    }
    if (!options.mask) return [target, data];
    target[1] |= 128;
    target[offset - 4] = mask2[0];
    target[offset - 3] = mask2[1];
    target[offset - 2] = mask2[2];
    target[offset - 1] = mask2[3];
    if (skipMasking) return [target, data];
    if (merge) {
      applyMask(data, mask2, target, offset, dataLength);
      return [target];
    }
    applyMask(data, mask2, data, 0, dataLength);
    return [target, data];
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
  close(code, data, mask2, cb) {
    let buf;
    if (code === void 0) {
      buf = EMPTY_BUFFER$1;
    } else if (typeof code !== "number" || !isValidStatusCode(code)) {
      throw new TypeError("First argument must be a valid error code number");
    } else if (data === void 0 || !data.length) {
      buf = Buffer.allocUnsafe(2);
      buf.writeUInt16BE(code, 0);
    } else {
      const length = Buffer.byteLength(data);
      if (length > 123) {
        throw new RangeError("The message must not be greater than 123 bytes");
      }
      buf = Buffer.allocUnsafe(2 + length);
      buf.writeUInt16BE(code, 0);
      if (typeof data === "string") {
        buf.write(data, 2);
      } else {
        buf.set(data, 2);
      }
    }
    const options = {
      [kByteLength]: buf.length,
      fin: true,
      generateMask: this._generateMask,
      mask: mask2,
      maskBuffer: this._maskBuffer,
      opcode: 8,
      readOnly: false,
      rsv1: false
    };
    if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, buf, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(buf, options), cb);
    }
  }
  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(data, mask2, cb) {
    let byteLength;
    let readOnly;
    if (typeof data === "string") {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }
    if (byteLength > 125) {
      throw new RangeError("The data size must not be greater than 125 bytes");
    }
    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask: mask2,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly,
      rsv1: false
    };
    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
  }
  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(data, mask2, cb) {
    let byteLength;
    let readOnly;
    if (typeof data === "string") {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }
    if (byteLength > 125) {
      throw new RangeError("The data size must not be greater than 125 bytes");
    }
    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask: mask2,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly,
      rsv1: false
    };
    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
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
  send(data, options, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate$1.extensionName];
    let opcode = options.binary ? 2 : 1;
    let rsv1 = options.compress;
    let byteLength;
    let readOnly;
    if (typeof data === "string") {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }
    if (this._firstFragment) {
      this._firstFragment = false;
      if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
        rsv1 = byteLength >= perMessageDeflate._threshold;
      }
      this._compress = rsv1;
    } else {
      rsv1 = false;
      opcode = 0;
    }
    if (options.fin) this._firstFragment = true;
    const opts = {
      [kByteLength]: byteLength,
      fin: options.fin,
      generateMask: this._generateMask,
      mask: options.mask,
      maskBuffer: this._maskBuffer,
      opcode,
      readOnly,
      rsv1
    };
    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
      } else {
        this.getBlobData(data, this._compress, opts, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, this._compress, opts, cb]);
    } else {
      this.dispatch(data, this._compress, opts, cb);
    }
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
  getBlobData(blob, compress, options, cb) {
    this._bufferedBytes += options[kByteLength];
    this._state = GET_BLOB_DATA;
    blob.arrayBuffer().then((arrayBuffer) => {
      if (this._socket.destroyed) {
        const err = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(callCallbacks, this, err, cb);
        return;
      }
      this._bufferedBytes -= options[kByteLength];
      const data = toBuffer$1(arrayBuffer);
      if (!compress) {
        this._state = DEFAULT;
        this.sendFrame(Sender.frame(data, options), cb);
        this.dequeue();
      } else {
        this.dispatch(data, compress, options, cb);
      }
    }).catch((err) => {
      process.nextTick(onError, this, err, cb);
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
  dispatch(data, compress, options, cb) {
    if (!compress) {
      this.sendFrame(Sender.frame(data, options), cb);
      return;
    }
    const perMessageDeflate = this._extensions[PerMessageDeflate$1.extensionName];
    this._bufferedBytes += options[kByteLength];
    this._state = DEFLATING;
    perMessageDeflate.compress(data, options.fin, (_, buf) => {
      if (this._socket.destroyed) {
        const err = new Error(
          "The socket was closed while data was being compressed"
        );
        callCallbacks(this, err, cb);
        return;
      }
      this._bufferedBytes -= options[kByteLength];
      this._state = DEFAULT;
      options.readOnly = false;
      this.sendFrame(Sender.frame(buf, options), cb);
      this.dequeue();
    });
  }
  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    while (this._state === DEFAULT && this._queue.length) {
      const params = this._queue.shift();
      this._bufferedBytes -= params[3][kByteLength];
      Reflect.apply(params[0], this, params.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(params) {
    this._bufferedBytes += params[3][kByteLength];
    this._queue.push(params);
  }
  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(list, cb) {
    if (list.length === 2) {
      this._socket.cork();
      this._socket.write(list[0]);
      this._socket.write(list[1], cb);
      this._socket.uncork();
    } else {
      this._socket.write(list[0], cb);
    }
  }
};
var sender = Sender$1;
function callCallbacks(sender2, err, cb) {
  if (typeof cb === "function") cb(err);
  for (let i = 0; i < sender2._queue.length; i++) {
    const params = sender2._queue[i];
    const callback = params[params.length - 1];
    if (typeof callback === "function") callback(err);
  }
}
function onError(sender2, err, cb) {
  callCallbacks(sender2, err, cb);
  sender2.onerror(err);
}
const { kForOnEventAttribute: kForOnEventAttribute$1, kListener: kListener$1 } = constants;
const kCode = Symbol("kCode");
const kData = Symbol("kData");
const kError = Symbol("kError");
const kMessage = Symbol("kMessage");
const kReason = Symbol("kReason");
const kTarget = Symbol("kTarget");
const kType = Symbol("kType");
const kWasClean = Symbol("kWasClean");
class Event {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(type) {
    this[kTarget] = null;
    this[kType] = type;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[kTarget];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[kType];
  }
}
Object.defineProperty(Event.prototype, "target", { enumerable: true });
Object.defineProperty(Event.prototype, "type", { enumerable: true });
class CloseEvent extends Event {
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
  constructor(type, options = {}) {
    super(type);
    this[kCode] = options.code === void 0 ? 0 : options.code;
    this[kReason] = options.reason === void 0 ? "" : options.reason;
    this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[kCode];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[kReason];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[kWasClean];
  }
}
Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
class ErrorEvent extends Event {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(type, options = {}) {
    super(type);
    this[kError] = options.error === void 0 ? null : options.error;
    this[kMessage] = options.message === void 0 ? "" : options.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[kError];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[kMessage];
  }
}
Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
class MessageEvent extends Event {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(type, options = {}) {
    super(type);
    this[kData] = options.data === void 0 ? null : options.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[kData];
  }
}
Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
const EventTarget = {
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
  addEventListener(type, handler, options = {}) {
    for (const listener of this.listeners(type)) {
      if (!options[kForOnEventAttribute$1] && listener[kListener$1] === handler && !listener[kForOnEventAttribute$1]) {
        return;
      }
    }
    let wrapper;
    if (type === "message") {
      wrapper = function onMessage(data, isBinary) {
        const event = new MessageEvent("message", {
          data: isBinary ? data : data.toString()
        });
        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === "close") {
      wrapper = function onClose(code, message) {
        const event = new CloseEvent("close", {
          code,
          reason: message.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === "error") {
      wrapper = function onError2(error) {
        const event = new ErrorEvent("error", {
          error,
          message: error.message
        });
        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === "open") {
      wrapper = function onOpen() {
        const event = new Event("open");
        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else {
      return;
    }
    wrapper[kForOnEventAttribute$1] = !!options[kForOnEventAttribute$1];
    wrapper[kListener$1] = handler;
    if (options.once) {
      this.once(type, wrapper);
    } else {
      this.on(type, wrapper);
    }
  },
  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(type, handler) {
    for (const listener of this.listeners(type)) {
      if (listener[kListener$1] === handler && !listener[kForOnEventAttribute$1]) {
        this.removeListener(type, listener);
        break;
      }
    }
  }
};
var eventTarget = {
  EventTarget
};
function callListener(listener, thisArg, event) {
  if (typeof listener === "object" && listener.handleEvent) {
    listener.handleEvent.call(listener, event);
  } else {
    listener.call(thisArg, event);
  }
}
const { tokenChars: tokenChars$1 } = validationExports;
function push(dest, name, elem) {
  if (dest[name] === void 0) dest[name] = [elem];
  else dest[name].push(elem);
}
function parse$1(header) {
  const offers = /* @__PURE__ */ Object.create(null);
  let params = /* @__PURE__ */ Object.create(null);
  let mustUnescape = false;
  let isEscaping = false;
  let inQuotes = false;
  let extensionName;
  let paramName;
  let start = -1;
  let code = -1;
  let end = -1;
  let i = 0;
  for (; i < header.length; i++) {
    code = header.charCodeAt(i);
    if (extensionName === void 0) {
      if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 59 || code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1) end = i;
        const name = header.slice(start, end);
        if (code === 44) {
          push(offers, name, params);
          params = /* @__PURE__ */ Object.create(null);
        } else {
          extensionName = name;
        }
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else if (paramName === void 0) {
      if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (code === 32 || code === 9) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 59 || code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1) end = i;
        push(params, header.slice(start, end), true);
        if (code === 44) {
          push(offers, extensionName, params);
          params = /* @__PURE__ */ Object.create(null);
          extensionName = void 0;
        }
        start = end = -1;
      } else if (code === 61 && start !== -1 && end === -1) {
        paramName = header.slice(start, i);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else {
      if (isEscaping) {
        if (tokenChars$1[code] !== 1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (start === -1) start = i;
        else if (!mustUnescape) mustUnescape = true;
        isEscaping = false;
      } else if (inQuotes) {
        if (tokenChars$1[code] === 1) {
          if (start === -1) start = i;
        } else if (code === 34 && start !== -1) {
          inQuotes = false;
          end = i;
        } else if (code === 92) {
          isEscaping = true;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
        inQuotes = true;
      } else if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (start !== -1 && (code === 32 || code === 9)) {
        if (end === -1) end = i;
      } else if (code === 59 || code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1) end = i;
        let value = header.slice(start, end);
        if (mustUnescape) {
          value = value.replace(/\\/g, "");
          mustUnescape = false;
        }
        push(params, paramName, value);
        if (code === 44) {
          push(offers, extensionName, params);
          params = /* @__PURE__ */ Object.create(null);
          extensionName = void 0;
        }
        paramName = void 0;
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
  }
  if (start === -1 || inQuotes || code === 32 || code === 9) {
    throw new SyntaxError("Unexpected end of input");
  }
  if (end === -1) end = i;
  const token = header.slice(start, end);
  if (extensionName === void 0) {
    push(offers, token, params);
  } else {
    if (paramName === void 0) {
      push(params, token, true);
    } else if (mustUnescape) {
      push(params, paramName, token.replace(/\\/g, ""));
    } else {
      push(params, paramName, token);
    }
    push(offers, extensionName, params);
  }
  return offers;
}
function format$1(extensions) {
  return Object.keys(extensions).map((extension2) => {
    let configurations = extensions[extension2];
    if (!Array.isArray(configurations)) configurations = [configurations];
    return configurations.map((params) => {
      return [extension2].concat(
        Object.keys(params).map((k) => {
          let values = params[k];
          if (!Array.isArray(values)) values = [values];
          return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
        })
      ).join("; ");
    }).join(", ");
  }).join(", ");
}
var extension = { format: format$1, parse: parse$1 };
const EventEmitter = require$$0$3;
const https = require$$1$2;
const http = require$$2$1;
const net = require$$3;
const tls = require$$4;
const { randomBytes, createHash: createHash$1 } = require$$1$1;
const { Duplex: Duplex$2, Readable } = require$$0$2;
const { URL: URL$1 } = require$$7;
const PerMessageDeflate2 = permessageDeflate;
const Receiver2 = receiver;
const Sender2 = sender;
const { isBlob } = validationExports;
const {
  BINARY_TYPES,
  CLOSE_TIMEOUT: CLOSE_TIMEOUT$1,
  EMPTY_BUFFER,
  GUID: GUID$1,
  kForOnEventAttribute,
  kListener,
  kStatusCode,
  kWebSocket: kWebSocket$1,
  NOOP
} = constants;
const {
  EventTarget: { addEventListener, removeEventListener }
} = eventTarget;
const { format, parse } = extension;
const { toBuffer } = bufferUtilExports;
const kAborted = Symbol("kAborted");
const protocolVersions = [8, 13];
const readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
class WebSocket extends EventEmitter {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(address, protocols, options) {
    super();
    this._binaryType = BINARY_TYPES[0];
    this._closeCode = 1006;
    this._closeFrameReceived = false;
    this._closeFrameSent = false;
    this._closeMessage = EMPTY_BUFFER;
    this._closeTimer = null;
    this._errorEmitted = false;
    this._extensions = {};
    this._paused = false;
    this._protocol = "";
    this._readyState = WebSocket.CONNECTING;
    this._receiver = null;
    this._sender = null;
    this._socket = null;
    if (address !== null) {
      this._bufferedAmount = 0;
      this._isServer = false;
      this._redirects = 0;
      if (protocols === void 0) {
        protocols = [];
      } else if (!Array.isArray(protocols)) {
        if (typeof protocols === "object" && protocols !== null) {
          options = protocols;
          protocols = [];
        } else {
          protocols = [protocols];
        }
      }
      initAsClient(this, address, protocols, options);
    } else {
      this._autoPong = options.autoPong;
      this._closeTimeout = options.closeTimeout;
      this._isServer = true;
    }
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
  set binaryType(type) {
    if (!BINARY_TYPES.includes(type)) return;
    this._binaryType = type;
    if (this._receiver) this._receiver._binaryType = type;
  }
  /**
   * @type {Number}
   */
  get bufferedAmount() {
    if (!this._socket) return this._bufferedAmount;
    return this._socket._writableState.length + this._sender._bufferedBytes;
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
  setSocket(socket, head, options) {
    const receiver2 = new Receiver2({
      allowSynchronousEvents: options.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: options.maxPayload,
      skipUTF8Validation: options.skipUTF8Validation
    });
    const sender2 = new Sender2(socket, this._extensions, options.generateMask);
    this._receiver = receiver2;
    this._sender = sender2;
    this._socket = socket;
    receiver2[kWebSocket$1] = this;
    sender2[kWebSocket$1] = this;
    socket[kWebSocket$1] = this;
    receiver2.on("conclude", receiverOnConclude);
    receiver2.on("drain", receiverOnDrain);
    receiver2.on("error", receiverOnError);
    receiver2.on("message", receiverOnMessage);
    receiver2.on("ping", receiverOnPing);
    receiver2.on("pong", receiverOnPong);
    sender2.onerror = senderOnError;
    if (socket.setTimeout) socket.setTimeout(0);
    if (socket.setNoDelay) socket.setNoDelay();
    if (head.length > 0) socket.unshift(head);
    socket.on("close", socketOnClose);
    socket.on("data", socketOnData);
    socket.on("end", socketOnEnd);
    socket.on("error", socketOnError);
    this._readyState = WebSocket.OPEN;
    this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = WebSocket.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    if (this._extensions[PerMessageDeflate2.extensionName]) {
      this._extensions[PerMessageDeflate2.extensionName].cleanup();
    }
    this._receiver.removeAllListeners();
    this._readyState = WebSocket.CLOSED;
    this.emit("close", this._closeCode, this._closeMessage);
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
  close(code, data) {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = "WebSocket was closed before the connection was established";
      abortHandshake(this, this._req, msg);
      return;
    }
    if (this.readyState === WebSocket.CLOSING) {
      if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
        this._socket.end();
      }
      return;
    }
    this._readyState = WebSocket.CLOSING;
    this._sender.close(code, data, !this._isServer, (err) => {
      if (err) return;
      this._closeFrameSent = true;
      if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
        this._socket.end();
      }
    });
    setCloseTimer(this);
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
      return;
    }
    this._paused = true;
    this._socket.pause();
  }
  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(data, mask2, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    }
    if (typeof data === "function") {
      cb = data;
      data = mask2 = void 0;
    } else if (typeof mask2 === "function") {
      cb = mask2;
      mask2 = void 0;
    }
    if (typeof data === "number") data = data.toString();
    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }
    if (mask2 === void 0) mask2 = !this._isServer;
    this._sender.ping(data || EMPTY_BUFFER, mask2, cb);
  }
  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(data, mask2, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    }
    if (typeof data === "function") {
      cb = data;
      data = mask2 = void 0;
    } else if (typeof mask2 === "function") {
      cb = mask2;
      mask2 = void 0;
    }
    if (typeof data === "number") data = data.toString();
    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }
    if (mask2 === void 0) mask2 = !this._isServer;
    this._sender.pong(data || EMPTY_BUFFER, mask2, cb);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
      return;
    }
    this._paused = false;
    if (!this._receiver._writableState.needDrain) this._socket.resume();
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
  send(data, options, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    }
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    if (typeof data === "number") data = data.toString();
    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }
    const opts = {
      binary: typeof data !== "string",
      mask: !this._isServer,
      compress: true,
      fin: true,
      ...options
    };
    if (!this._extensions[PerMessageDeflate2.extensionName]) {
      opts.compress = false;
    }
    this._sender.send(data || EMPTY_BUFFER, opts, cb);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = "WebSocket was closed before the connection was established";
      abortHandshake(this, this._req, msg);
      return;
    }
    if (this._socket) {
      this._readyState = WebSocket.CLOSING;
      this._socket.destroy();
    }
  }
}
Object.defineProperty(WebSocket, "CONNECTING", {
  enumerable: true,
  value: readyStates.indexOf("CONNECTING")
});
Object.defineProperty(WebSocket.prototype, "CONNECTING", {
  enumerable: true,
  value: readyStates.indexOf("CONNECTING")
});
Object.defineProperty(WebSocket, "OPEN", {
  enumerable: true,
  value: readyStates.indexOf("OPEN")
});
Object.defineProperty(WebSocket.prototype, "OPEN", {
  enumerable: true,
  value: readyStates.indexOf("OPEN")
});
Object.defineProperty(WebSocket, "CLOSING", {
  enumerable: true,
  value: readyStates.indexOf("CLOSING")
});
Object.defineProperty(WebSocket.prototype, "CLOSING", {
  enumerable: true,
  value: readyStates.indexOf("CLOSING")
});
Object.defineProperty(WebSocket, "CLOSED", {
  enumerable: true,
  value: readyStates.indexOf("CLOSED")
});
Object.defineProperty(WebSocket.prototype, "CLOSED", {
  enumerable: true,
  value: readyStates.indexOf("CLOSED")
});
[
  "binaryType",
  "bufferedAmount",
  "extensions",
  "isPaused",
  "protocol",
  "readyState",
  "url"
].forEach((property) => {
  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
});
["open", "error", "close", "message"].forEach((method) => {
  Object.defineProperty(WebSocket.prototype, `on${method}`, {
    enumerable: true,
    get() {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) return listener[kListener];
      }
      return null;
    },
    set(handler) {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) {
          this.removeListener(method, listener);
          break;
        }
      }
      if (typeof handler !== "function") return;
      this.addEventListener(method, handler, {
        [kForOnEventAttribute]: true
      });
    }
  });
});
WebSocket.prototype.addEventListener = addEventListener;
WebSocket.prototype.removeEventListener = removeEventListener;
var websocket = WebSocket;
function initAsClient(websocket2, address, protocols, options) {
  const opts = {
    allowSynchronousEvents: true,
    autoPong: true,
    closeTimeout: CLOSE_TIMEOUT$1,
    protocolVersion: protocolVersions[1],
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
    perMessageDeflate: true,
    followRedirects: false,
    maxRedirects: 10,
    ...options,
    socketPath: void 0,
    hostname: void 0,
    protocol: void 0,
    timeout: void 0,
    method: "GET",
    host: void 0,
    path: void 0,
    port: void 0
  };
  websocket2._autoPong = opts.autoPong;
  websocket2._closeTimeout = opts.closeTimeout;
  if (!protocolVersions.includes(opts.protocolVersion)) {
    throw new RangeError(
      `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
    );
  }
  let parsedUrl;
  if (address instanceof URL$1) {
    parsedUrl = address;
  } else {
    try {
      parsedUrl = new URL$1(address);
    } catch (e) {
      throw new SyntaxError(`Invalid URL: ${address}`);
    }
  }
  if (parsedUrl.protocol === "http:") {
    parsedUrl.protocol = "ws:";
  } else if (parsedUrl.protocol === "https:") {
    parsedUrl.protocol = "wss:";
  }
  websocket2._url = parsedUrl.href;
  const isSecure = parsedUrl.protocol === "wss:";
  const isIpcUrl = parsedUrl.protocol === "ws+unix:";
  let invalidUrlMessage;
  if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
    invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
  } else if (isIpcUrl && !parsedUrl.pathname) {
    invalidUrlMessage = "The URL's pathname is empty";
  } else if (parsedUrl.hash) {
    invalidUrlMessage = "The URL contains a fragment identifier";
  }
  if (invalidUrlMessage) {
    const err = new SyntaxError(invalidUrlMessage);
    if (websocket2._redirects === 0) {
      throw err;
    } else {
      emitErrorAndClose(websocket2, err);
      return;
    }
  }
  const defaultPort = isSecure ? 443 : 80;
  const key = randomBytes(16).toString("base64");
  const request = isSecure ? https.request : http.request;
  const protocolSet = /* @__PURE__ */ new Set();
  let perMessageDeflate;
  opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
  opts.defaultPort = opts.defaultPort || defaultPort;
  opts.port = parsedUrl.port || defaultPort;
  opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
  opts.headers = {
    ...opts.headers,
    "Sec-WebSocket-Version": opts.protocolVersion,
    "Sec-WebSocket-Key": key,
    Connection: "Upgrade",
    Upgrade: "websocket"
  };
  opts.path = parsedUrl.pathname + parsedUrl.search;
  opts.timeout = opts.handshakeTimeout;
  if (opts.perMessageDeflate) {
    perMessageDeflate = new PerMessageDeflate2(
      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
      false,
      opts.maxPayload
    );
    opts.headers["Sec-WebSocket-Extensions"] = format({
      [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
    });
  }
  if (protocols.length) {
    for (const protocol of protocols) {
      if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      }
      protocolSet.add(protocol);
    }
    opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
  }
  if (opts.origin) {
    if (opts.protocolVersion < 13) {
      opts.headers["Sec-WebSocket-Origin"] = opts.origin;
    } else {
      opts.headers.Origin = opts.origin;
    }
  }
  if (parsedUrl.username || parsedUrl.password) {
    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
  }
  if (isIpcUrl) {
    const parts = opts.path.split(":");
    opts.socketPath = parts[0];
    opts.path = parts[1];
  }
  let req;
  if (opts.followRedirects) {
    if (websocket2._redirects === 0) {
      websocket2._originalIpc = isIpcUrl;
      websocket2._originalSecure = isSecure;
      websocket2._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
      const headers = options && options.headers;
      options = { ...options, headers: {} };
      if (headers) {
        for (const [key2, value] of Object.entries(headers)) {
          options.headers[key2.toLowerCase()] = value;
        }
      }
    } else if (websocket2.listenerCount("redirect") === 0) {
      const isSameHost = isIpcUrl ? websocket2._originalIpc ? opts.socketPath === websocket2._originalHostOrSocketPath : false : websocket2._originalIpc ? false : parsedUrl.host === websocket2._originalHostOrSocketPath;
      if (!isSameHost || websocket2._originalSecure && !isSecure) {
        delete opts.headers.authorization;
        delete opts.headers.cookie;
        if (!isSameHost) delete opts.headers.host;
        opts.auth = void 0;
      }
    }
    if (opts.auth && !options.headers.authorization) {
      options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
    }
    req = websocket2._req = request(opts);
    if (websocket2._redirects) {
      websocket2.emit("redirect", websocket2.url, req);
    }
  } else {
    req = websocket2._req = request(opts);
  }
  if (opts.timeout) {
    req.on("timeout", () => {
      abortHandshake(websocket2, req, "Opening handshake has timed out");
    });
  }
  req.on("error", (err) => {
    if (req === null || req[kAborted]) return;
    req = websocket2._req = null;
    emitErrorAndClose(websocket2, err);
  });
  req.on("response", (res) => {
    const location = res.headers.location;
    const statusCode = res.statusCode;
    if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
      if (++websocket2._redirects > opts.maxRedirects) {
        abortHandshake(websocket2, req, "Maximum redirects exceeded");
        return;
      }
      req.abort();
      let addr;
      try {
        addr = new URL$1(location, address);
      } catch (e) {
        const err = new SyntaxError(`Invalid URL: ${location}`);
        emitErrorAndClose(websocket2, err);
        return;
      }
      initAsClient(websocket2, addr, protocols, options);
    } else if (!websocket2.emit("unexpected-response", req, res)) {
      abortHandshake(
        websocket2,
        req,
        `Unexpected server response: ${res.statusCode}`
      );
    }
  });
  req.on("upgrade", (res, socket, head) => {
    websocket2.emit("upgrade", res);
    if (websocket2.readyState !== WebSocket.CONNECTING) return;
    req = websocket2._req = null;
    const upgrade = res.headers.upgrade;
    if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
      abortHandshake(websocket2, socket, "Invalid Upgrade header");
      return;
    }
    const digest = createHash$1("sha1").update(key + GUID$1).digest("base64");
    if (res.headers["sec-websocket-accept"] !== digest) {
      abortHandshake(websocket2, socket, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const serverProt = res.headers["sec-websocket-protocol"];
    let protError;
    if (serverProt !== void 0) {
      if (!protocolSet.size) {
        protError = "Server sent a subprotocol but none was requested";
      } else if (!protocolSet.has(serverProt)) {
        protError = "Server sent an invalid subprotocol";
      }
    } else if (protocolSet.size) {
      protError = "Server sent no subprotocol";
    }
    if (protError) {
      abortHandshake(websocket2, socket, protError);
      return;
    }
    if (serverProt) websocket2._protocol = serverProt;
    const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
    if (secWebSocketExtensions !== void 0) {
      if (!perMessageDeflate) {
        const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
        abortHandshake(websocket2, socket, message);
        return;
      }
      let extensions;
      try {
        extensions = parse(secWebSocketExtensions);
      } catch (err) {
        const message = "Invalid Sec-WebSocket-Extensions header";
        abortHandshake(websocket2, socket, message);
        return;
      }
      const extensionNames = Object.keys(extensions);
      if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
        const message = "Server indicated an extension that was not requested";
        abortHandshake(websocket2, socket, message);
        return;
      }
      try {
        perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
      } catch (err) {
        const message = "Invalid Sec-WebSocket-Extensions header";
        abortHandshake(websocket2, socket, message);
        return;
      }
      websocket2._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
    }
    websocket2.setSocket(socket, head, {
      allowSynchronousEvents: opts.allowSynchronousEvents,
      generateMask: opts.generateMask,
      maxPayload: opts.maxPayload,
      skipUTF8Validation: opts.skipUTF8Validation
    });
  });
  if (opts.finishRequest) {
    opts.finishRequest(req, websocket2);
  } else {
    req.end();
  }
}
function emitErrorAndClose(websocket2, err) {
  websocket2._readyState = WebSocket.CLOSING;
  websocket2._errorEmitted = true;
  websocket2.emit("error", err);
  websocket2.emitClose();
}
function netConnect(options) {
  options.path = options.socketPath;
  return net.connect(options);
}
function tlsConnect(options) {
  options.path = void 0;
  if (!options.servername && options.servername !== "") {
    options.servername = net.isIP(options.host) ? "" : options.host;
  }
  return tls.connect(options);
}
function abortHandshake(websocket2, stream, message) {
  websocket2._readyState = WebSocket.CLOSING;
  const err = new Error(message);
  Error.captureStackTrace(err, abortHandshake);
  if (stream.setHeader) {
    stream[kAborted] = true;
    stream.abort();
    if (stream.socket && !stream.socket.destroyed) {
      stream.socket.destroy();
    }
    process.nextTick(emitErrorAndClose, websocket2, err);
  } else {
    stream.destroy(err);
    stream.once("error", websocket2.emit.bind(websocket2, "error"));
    stream.once("close", websocket2.emitClose.bind(websocket2));
  }
}
function sendAfterClose(websocket2, data, cb) {
  if (data) {
    const length = isBlob(data) ? data.size : toBuffer(data).length;
    if (websocket2._socket) websocket2._sender._bufferedBytes += length;
    else websocket2._bufferedAmount += length;
  }
  if (cb) {
    const err = new Error(
      `WebSocket is not open: readyState ${websocket2.readyState} (${readyStates[websocket2.readyState]})`
    );
    process.nextTick(cb, err);
  }
}
function receiverOnConclude(code, reason) {
  const websocket2 = this[kWebSocket$1];
  websocket2._closeFrameReceived = true;
  websocket2._closeMessage = reason;
  websocket2._closeCode = code;
  if (websocket2._socket[kWebSocket$1] === void 0) return;
  websocket2._socket.removeListener("data", socketOnData);
  process.nextTick(resume, websocket2._socket);
  if (code === 1005) websocket2.close();
  else websocket2.close(code, reason);
}
function receiverOnDrain() {
  const websocket2 = this[kWebSocket$1];
  if (!websocket2.isPaused) websocket2._socket.resume();
}
function receiverOnError(err) {
  const websocket2 = this[kWebSocket$1];
  if (websocket2._socket[kWebSocket$1] !== void 0) {
    websocket2._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket2._socket);
    websocket2.close(err[kStatusCode]);
  }
  if (!websocket2._errorEmitted) {
    websocket2._errorEmitted = true;
    websocket2.emit("error", err);
  }
}
function receiverOnFinish() {
  this[kWebSocket$1].emitClose();
}
function receiverOnMessage(data, isBinary) {
  this[kWebSocket$1].emit("message", data, isBinary);
}
function receiverOnPing(data) {
  const websocket2 = this[kWebSocket$1];
  if (websocket2._autoPong) websocket2.pong(data, !this._isServer, NOOP);
  websocket2.emit("ping", data);
}
function receiverOnPong(data) {
  this[kWebSocket$1].emit("pong", data);
}
function resume(stream) {
  stream.resume();
}
function senderOnError(err) {
  const websocket2 = this[kWebSocket$1];
  if (websocket2.readyState === WebSocket.CLOSED) return;
  if (websocket2.readyState === WebSocket.OPEN) {
    websocket2._readyState = WebSocket.CLOSING;
    setCloseTimer(websocket2);
  }
  this._socket.end();
  if (!websocket2._errorEmitted) {
    websocket2._errorEmitted = true;
    websocket2.emit("error", err);
  }
}
function setCloseTimer(websocket2) {
  websocket2._closeTimer = setTimeout(
    websocket2._socket.destroy.bind(websocket2._socket),
    websocket2._closeTimeout
  );
}
function socketOnClose() {
  const websocket2 = this[kWebSocket$1];
  this.removeListener("close", socketOnClose);
  this.removeListener("data", socketOnData);
  this.removeListener("end", socketOnEnd);
  websocket2._readyState = WebSocket.CLOSING;
  if (!this._readableState.endEmitted && !websocket2._closeFrameReceived && !websocket2._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
    const chunk = this.read(this._readableState.length);
    websocket2._receiver.write(chunk);
  }
  websocket2._receiver.end();
  this[kWebSocket$1] = void 0;
  clearTimeout(websocket2._closeTimer);
  if (websocket2._receiver._writableState.finished || websocket2._receiver._writableState.errorEmitted) {
    websocket2.emitClose();
  } else {
    websocket2._receiver.on("error", receiverOnFinish);
    websocket2._receiver.on("finish", receiverOnFinish);
  }
}
function socketOnData(chunk) {
  if (!this[kWebSocket$1]._receiver.write(chunk)) {
    this.pause();
  }
}
function socketOnEnd() {
  const websocket2 = this[kWebSocket$1];
  websocket2._readyState = WebSocket.CLOSING;
  websocket2._receiver.end();
  this.end();
}
function socketOnError() {
  const websocket2 = this[kWebSocket$1];
  this.removeListener("error", socketOnError);
  this.on("error", NOOP);
  if (websocket2) {
    websocket2._readyState = WebSocket.CLOSING;
    this.destroy();
  }
}
const WebSocket$1 = /* @__PURE__ */ getDefaultExportFromCjs(websocket);
const { Duplex: Duplex$1 } = require$$0$2;
const { tokenChars } = validationExports;
const { Duplex } = require$$0$2;
const { createHash } = require$$1$1;
const { CLOSE_TIMEOUT, GUID, kWebSocket } = constants;
const DEFAULT_FETCH_INIT = {
  cache: "no-store"
};
const buildUserAgent = (userAgent) => defaultUserAgentString + (userAgent === false ? "" : " AssemblyAI/1.0 (" + Object.entries({ ...defaultUserAgent, ...userAgent }).map(([key, item]) => item ? `${key}=${item.name}/${item.version}` : "").join(" ") + ")");
let defaultUserAgentString = "";
if (typeof navigator !== "undefined" && navigator.userAgent) {
  defaultUserAgentString += navigator.userAgent;
}
const defaultUserAgent = {
  sdk: { name: "JavaScript", version: "4.22.1" }
};
if (typeof process !== "undefined") {
  if (process.versions.node && defaultUserAgentString.indexOf("Node") === -1) {
    defaultUserAgent.runtime_env = {
      name: "Node",
      version: process.versions.node
    };
  }
  if (process.versions.bun && defaultUserAgentString.indexOf("Bun") === -1) {
    defaultUserAgent.runtime_env = {
      name: "Bun",
      version: process.versions.bun
    };
  }
}
if (typeof Deno !== "undefined") {
  if (process.versions.bun && defaultUserAgentString.indexOf("Deno") === -1) {
    defaultUserAgent.runtime_env = { name: "Deno", version: Deno.version.deno };
  }
}
class BaseService {
  /**
   * Create a new service.
   * @param params - The parameters to use for the service.
   */
  constructor(params) {
    this.params = params;
    if (params.userAgent === false) {
      this.userAgent = void 0;
    } else {
      this.userAgent = buildUserAgent(params.userAgent || {});
    }
  }
  async fetch(input, init) {
    init = { ...DEFAULT_FETCH_INIT, ...init };
    let headers = {
      Authorization: this.params.apiKey,
      "Content-Type": "application/json"
    };
    if (DEFAULT_FETCH_INIT == null ? void 0 : DEFAULT_FETCH_INIT.headers)
      headers = { ...headers, ...DEFAULT_FETCH_INIT.headers };
    if (init == null ? void 0 : init.headers)
      headers = { ...headers, ...init.headers };
    if (this.userAgent) {
      headers["User-Agent"] = this.userAgent;
    }
    init.headers = headers;
    if (!input.startsWith("http"))
      input = this.params.baseUrl + input;
    const response = await fetch(input, init);
    if (response.status >= 400) {
      let json;
      const text = await response.text();
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
        }
        if (json == null ? void 0 : json.error)
          throw new Error(json.error);
        throw new Error(text);
      }
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return response;
  }
  async fetchJson(input, init) {
    const response = await this.fetch(input, init);
    return response.json();
  }
}
class LemurService extends BaseService {
  summary(params, signal) {
    return this.fetchJson("/lemur/v3/generate/summary", {
      method: "POST",
      body: JSON.stringify(params),
      signal
    });
  }
  questionAnswer(params, signal) {
    return this.fetchJson("/lemur/v3/generate/question-answer", {
      method: "POST",
      body: JSON.stringify(params),
      signal
    });
  }
  actionItems(params, signal) {
    return this.fetchJson("/lemur/v3/generate/action-items", {
      method: "POST",
      body: JSON.stringify(params),
      signal
    });
  }
  task(params, signal) {
    return this.fetchJson("/lemur/v3/generate/task", {
      method: "POST",
      body: JSON.stringify(params),
      signal
    });
  }
  getResponse(id, signal) {
    return this.fetchJson(`/lemur/v3/${id}`, { signal });
  }
  /**
   * Delete the data for a previously submitted LeMUR request.
   * @param id - ID of the LeMUR request
   * @param signal - Optional AbortSignal to cancel the request
   */
  purgeRequestData(id, signal) {
    return this.fetchJson(`/lemur/v3/${id}`, {
      method: "DELETE",
      signal
    });
  }
}
const factory = (url, params) => new WebSocket$1(url, params);
const RealtimeErrorType = {
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
};
const RealtimeErrorMessages = {
  [RealtimeErrorType.BadSampleRate]: "Sample rate must be a positive integer",
  [RealtimeErrorType.AuthFailed]: "Not Authorized",
  [RealtimeErrorType.InsufficientFunds]: "Insufficient funds",
  [RealtimeErrorType.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [RealtimeErrorType.NonexistentSessionId]: "Session ID does not exist",
  [RealtimeErrorType.SessionExpired]: "Session has expired",
  [RealtimeErrorType.ClosedSession]: "Session is closed",
  [RealtimeErrorType.RateLimited]: "Rate limited",
  [RealtimeErrorType.UniqueSessionViolation]: "Unique session violation",
  [RealtimeErrorType.SessionTimeout]: "Session Timeout",
  [RealtimeErrorType.AudioTooShort]: "Audio too short",
  [RealtimeErrorType.AudioTooLong]: "Audio too long",
  [RealtimeErrorType.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [RealtimeErrorType.BadJson]: "Bad JSON",
  [RealtimeErrorType.BadSchema]: "Bad schema",
  [RealtimeErrorType.TooManyStreams]: "Too many streams",
  [RealtimeErrorType.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid.",
  [RealtimeErrorType.ReconnectAttemptsExhausted]: "Reconnect attempts exhausted",
  [RealtimeErrorType.WordBoostParameterParsingFailed]: "Could not parse word boost parameter"
};
class RealtimeError extends Error {
}
const StreamingErrorType = {
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
};
const StreamingErrorMessages = {
  [StreamingErrorType.BadSampleRate]: "Sample rate must be a positive integer",
  [StreamingErrorType.AuthFailed]: "Not Authorized",
  [StreamingErrorType.InsufficientFunds]: "Insufficient funds",
  [StreamingErrorType.FreeTierUser]: "This feature is paid-only and requires you to add a credit card. Please visit https://app.assemblyai.com/ to add a credit card to your account.",
  [StreamingErrorType.NonexistentSessionId]: "Session ID does not exist",
  [StreamingErrorType.SessionExpired]: "Session has expired",
  [StreamingErrorType.ClosedSession]: "Session is closed",
  [StreamingErrorType.RateLimited]: "Rate limited",
  [StreamingErrorType.UniqueSessionViolation]: "Unique session violation",
  [StreamingErrorType.SessionTimeout]: "Session Timeout",
  [StreamingErrorType.AudioTooShort]: "Audio too short",
  [StreamingErrorType.AudioTooLong]: "Audio too long",
  [StreamingErrorType.AudioTooSmallToTranscode]: "Audio too small to transcode",
  [StreamingErrorType.BadSchema]: "Bad schema",
  [StreamingErrorType.TooManyStreams]: "Too many streams",
  [StreamingErrorType.Reconnected]: "This session has been reconnected. This WebSocket is no longer valid."
};
class StreamingError extends Error {
}
const defaultRealtimeUrl = "wss://api.assemblyai.com/v2/realtime/ws";
const forceEndOfUtteranceMessage = `{"force_end_utterance":true}`;
const terminateSessionMessage$1 = `{"terminate_session":true}`;
class RealtimeTranscriber {
  /**
   * Create a new RealtimeTranscriber.
   * @param params - Parameters to configure the RealtimeTranscriber
   */
  constructor(params) {
    this.listeners = {};
    this.realtimeUrl = params.realtimeUrl ?? defaultRealtimeUrl;
    this.sampleRate = params.sampleRate ?? 16e3;
    this.wordBoost = params.wordBoost;
    this.encoding = params.encoding;
    this.endUtteranceSilenceThreshold = params.endUtteranceSilenceThreshold;
    this.disablePartialTranscripts = params.disablePartialTranscripts;
    if ("token" in params && params.token)
      this.token = params.token;
    if ("apiKey" in params && params.apiKey)
      this.apiKey = params.apiKey;
    if (!(this.token || this.apiKey)) {
      throw new Error("API key or temporary token is required.");
    }
  }
  connectionUrl() {
    const url = new URL(this.realtimeUrl);
    if (url.protocol !== "wss:") {
      throw new Error("Invalid protocol, must be wss");
    }
    const searchParams = new URLSearchParams();
    if (this.token) {
      searchParams.set("token", this.token);
    }
    searchParams.set("sample_rate", this.sampleRate.toString());
    if (this.wordBoost && this.wordBoost.length > 0) {
      searchParams.set("word_boost", JSON.stringify(this.wordBoost));
    }
    if (this.encoding) {
      searchParams.set("encoding", this.encoding);
    }
    searchParams.set("enable_extra_session_information", "true");
    if (this.disablePartialTranscripts) {
      searchParams.set("disable_partial_transcripts", this.disablePartialTranscripts.toString());
    }
    url.search = searchParams.toString();
    return url;
  }
  /**
   * Add a listener for an event.
   * @param event - The event to listen for.
   * @param listener - The function to call when the event is emitted.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event, listener) {
    this.listeners[event] = listener;
  }
  /**
   * Connect to the server and begin a new session.
   * @returns A promise that resolves when the connection is established and the session begins.
   */
  connect() {
    return new Promise((resolve) => {
      if (this.socket) {
        throw new Error("Already connected");
      }
      const url = this.connectionUrl();
      if (this.token) {
        this.socket = factory(url.toString());
      } else {
        this.socket = factory(url.toString(), {
          headers: { Authorization: this.apiKey }
        });
      }
      this.socket.binaryType = "arraybuffer";
      this.socket.onopen = () => {
        if (this.endUtteranceSilenceThreshold === void 0 || this.endUtteranceSilenceThreshold === null) {
          return;
        }
        this.configureEndUtteranceSilenceThreshold(this.endUtteranceSilenceThreshold);
      };
      this.socket.onclose = ({ code, reason }) => {
        var _a, _b;
        if (!reason) {
          if (code in RealtimeErrorMessages) {
            reason = RealtimeErrorMessages[code];
          }
        }
        (_b = (_a = this.listeners).close) == null ? void 0 : _b.call(_a, code, reason);
      };
      this.socket.onerror = (event) => {
        var _a, _b, _c, _d;
        if (event.error)
          (_b = (_a = this.listeners).error) == null ? void 0 : _b.call(_a, event.error);
        else
          (_d = (_c = this.listeners).error) == null ? void 0 : _d.call(_c, new Error(event.message));
      };
      this.socket.onmessage = ({ data }) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
        const message = JSON.parse(data.toString());
        if ("error" in message) {
          (_b = (_a = this.listeners).error) == null ? void 0 : _b.call(_a, new RealtimeError(message.error));
          return;
        }
        switch (message.message_type) {
          case "SessionBegins": {
            const openObject = {
              sessionId: message.session_id,
              expiresAt: new Date(message.expires_at)
            };
            resolve(openObject);
            (_d = (_c = this.listeners).open) == null ? void 0 : _d.call(_c, openObject);
            break;
          }
          case "PartialTranscript": {
            message.created = new Date(message.created);
            (_f = (_e = this.listeners).transcript) == null ? void 0 : _f.call(_e, message);
            (_h = (_g = this.listeners)["transcript.partial"]) == null ? void 0 : _h.call(_g, message);
            break;
          }
          case "FinalTranscript": {
            message.created = new Date(message.created);
            (_j = (_i = this.listeners).transcript) == null ? void 0 : _j.call(_i, message);
            (_l = (_k = this.listeners)["transcript.final"]) == null ? void 0 : _l.call(_k, message);
            break;
          }
          case "SessionInformation": {
            (_n = (_m = this.listeners).session_information) == null ? void 0 : _n.call(_m, message);
            break;
          }
          case "SessionTerminated": {
            (_o = this.sessionTerminatedResolve) == null ? void 0 : _o.call(this);
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
  sendAudio(audio) {
    this.send(audio);
  }
  /**
   * Create a writable stream that can be used to send audio data to the server.
   * @returns A writable stream that can be used to send audio data to the server.
   */
  stream() {
    return new WritableStream({
      write: (chunk) => {
        this.sendAudio(chunk);
      }
    });
  }
  /**
   * Manually end an utterance
   */
  forceEndUtterance() {
    this.send(forceEndOfUtteranceMessage);
  }
  /**
   * Configure the threshold for how long to wait before ending an utterance. Default is 700ms.
   * @param threshold - The duration of the end utterance silence threshold in milliseconds.
   * This value must be an integer between 0 and 20_000.
   */
  configureEndUtteranceSilenceThreshold(threshold) {
    this.send(`{"end_utterance_silence_threshold":${threshold}}`);
  }
  send(data) {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      throw new Error("Socket is not open for communication");
    }
    this.socket.send(data);
  }
  /**
   * Close the connection to the server.
   * @param waitForSessionTermination - If true, the method will wait for the session to be terminated before closing the connection.
   * While waiting for the session to be terminated, you will receive the final transcript and session information.
   */
  async close(waitForSessionTermination = true) {
    var _a;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN) {
        if (waitForSessionTermination) {
          const sessionTerminatedPromise = new Promise((resolve) => {
            this.sessionTerminatedResolve = resolve;
          });
          this.socket.send(terminateSessionMessage$1);
          await sessionTerminatedPromise;
        } else {
          this.socket.send(terminateSessionMessage$1);
        }
      }
      if ((_a = this.socket) == null ? void 0 : _a.removeAllListeners)
        this.socket.removeAllListeners();
      this.socket.close();
    }
    this.listeners = {};
    this.socket = void 0;
  }
}
class RealtimeTranscriberFactory extends BaseService {
  constructor(params) {
    super(params);
    this.rtFactoryParams = params;
  }
  /**
   * @deprecated Use transcriber(...) instead
   */
  createService(params) {
    return this.transcriber(params);
  }
  transcriber(params) {
    const serviceParams = { ...params };
    if (!serviceParams.token && !serviceParams.apiKey) {
      serviceParams.apiKey = this.rtFactoryParams.apiKey;
    }
    return new RealtimeTranscriber(serviceParams);
  }
  async createTemporaryToken(params) {
    const data = await this.fetchJson("/v2/realtime/token", {
      method: "POST",
      body: JSON.stringify(params)
    });
    return data.token;
  }
}
function getPath(path2) {
  if (path2.startsWith("http"))
    return null;
  if (path2.startsWith("https"))
    return null;
  if (path2.startsWith("data:"))
    return null;
  if (path2.startsWith("file://"))
    return path2.substring(7);
  if (path2.startsWith("file:"))
    return path2.substring(5);
  return path2;
}
class TranscriptService extends BaseService {
  constructor(params, files) {
    super(params);
    this.files = files;
  }
  /**
   * Transcribe an audio file. This will create a transcript and wait until the transcript status is "completed" or "error".
   * @param params - The parameters to transcribe an audio file.
   * @param options - The options to transcribe an audio file.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async transcribe(params, options) {
    const transcript = await this.submit(params);
    return await this.waitUntilReady(transcript.id, options);
  }
  /**
   * Submits a transcription job for an audio file. This will not wait until the transcript status is "completed" or "error".
   * @param params - The parameters to start the transcription of an audio file.
   * @returns A promise that resolves to the queued transcript.
   */
  async submit(params) {
    let audioUrl;
    let transcriptParams = void 0;
    if ("audio" in params) {
      const { audio, ...audioTranscriptParams } = params;
      if (typeof audio === "string") {
        const path2 = getPath(audio);
        if (path2 !== null) {
          audioUrl = await this.files.upload(path2);
        } else {
          if (audio.startsWith("data:")) {
            audioUrl = await this.files.upload(audio);
          } else {
            audioUrl = audio;
          }
        }
      } else {
        audioUrl = await this.files.upload(audio);
      }
      transcriptParams = { ...audioTranscriptParams, audio_url: audioUrl };
    } else {
      transcriptParams = params;
    }
    const data = await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(transcriptParams)
    });
    return data;
  }
  /**
   * Create a transcript.
   * @param params - The parameters to create a transcript.
   * @param options - The options used for creating the new transcript.
   * @returns A promise that resolves to the transcript.
   * @deprecated Use `transcribe` instead to transcribe a audio file that includes polling, or `submit` to transcribe a audio file without polling.
   */
  async create(params, options) {
    const path2 = getPath(params.audio_url);
    if (path2 !== null) {
      const uploadUrl = await this.files.upload(path2);
      params.audio_url = uploadUrl;
    }
    const data = await this.fetchJson("/v2/transcript", {
      method: "POST",
      body: JSON.stringify(params)
    });
    if ((options == null ? void 0 : options.poll) ?? true) {
      return await this.waitUntilReady(data.id, options);
    }
    return data;
  }
  /**
   * Wait until the transcript ready, either the status is "completed" or "error".
   * @param transcriptId - The ID of the transcript.
   * @param options - The options to wait until the transcript is ready.
   * @returns A promise that resolves to the transcript. The transcript status is "completed" or "error".
   */
  async waitUntilReady(transcriptId, options) {
    const pollingInterval = (options == null ? void 0 : options.pollingInterval) ?? 3e3;
    const pollingTimeout = (options == null ? void 0 : options.pollingTimeout) ?? -1;
    const startTime = Date.now();
    while (true) {
      const transcript = await this.get(transcriptId);
      if (transcript.status === "completed" || transcript.status === "error") {
        return transcript;
      } else if (pollingTimeout > 0 && Date.now() - startTime > pollingTimeout) {
        throw new Error("Polling timeout");
      } else {
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      }
    }
  }
  /**
   * Retrieve a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the transcript.
   */
  get(id) {
    return this.fetchJson(`/v2/transcript/${id}`);
  }
  /**
   * Retrieves a page of transcript listings.
   * @param params - The parameters to filter the transcript list by, or the URL to retrieve the transcript list from.
   */
  async list(params) {
    let url = "/v2/transcript";
    if (typeof params === "string") {
      url = params;
    } else if (params) {
      url = `${url}?${new URLSearchParams(Object.keys(params).map((key) => {
        var _a;
        return [
          key,
          ((_a = params[key]) == null ? void 0 : _a.toString()) || ""
        ];
      }))}`;
    }
    const data = await this.fetchJson(url);
    for (const transcriptListItem of data.transcripts) {
      transcriptListItem.created = new Date(transcriptListItem.created);
      if (transcriptListItem.completed) {
        transcriptListItem.completed = new Date(transcriptListItem.completed);
      }
    }
    return data;
  }
  /**
   * Delete a transcript
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the transcript.
   */
  delete(id) {
    return this.fetchJson(`/v2/transcript/${id}`, { method: "DELETE" });
  }
  /**
   * Search through the transcript for a specific set of keywords.
   * You can search for individual words, numbers, or phrases containing up to five words or numbers.
   * @param id - The identifier of the transcript.
   * @param words - Keywords to search for.
   * @returns A promise that resolves to the sentences.
   */
  wordSearch(id, words) {
    const params = new URLSearchParams({ words: words.join(",") });
    return this.fetchJson(`/v2/transcript/${id}/word-search?${params.toString()}`);
  }
  /**
   * Retrieve all sentences of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the sentences.
   */
  sentences(id) {
    return this.fetchJson(`/v2/transcript/${id}/sentences`);
  }
  /**
   * Retrieve all paragraphs of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the paragraphs.
   */
  paragraphs(id) {
    return this.fetchJson(`/v2/transcript/${id}/paragraphs`);
  }
  /**
   * Retrieve subtitles of a transcript.
   * @param id - The identifier of the transcript.
   * @param format - The format of the subtitles.
   * @param chars_per_caption - The maximum number of characters per caption.
   * @returns A promise that resolves to the subtitles text.
   */
  async subtitles(id, format2 = "srt", chars_per_caption) {
    let url = `/v2/transcript/${id}/${format2}`;
    if (chars_per_caption) {
      const params = new URLSearchParams();
      params.set("chars_per_caption", chars_per_caption.toString());
      url += `?${params.toString()}`;
    }
    const response = await this.fetch(url);
    return await response.text();
  }
  /**
   * Retrieve the redacted audio URL of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the details of the redacted audio.
   * @deprecated Use `redactedAudio` instead.
   */
  redactions(id) {
    return this.redactedAudio(id);
  }
  /**
   * Retrieve the redacted audio URL of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the details of the redacted audio.
   */
  redactedAudio(id) {
    return this.fetchJson(`/v2/transcript/${id}/redacted-audio`);
  }
  /**
   * Retrieve the redacted audio file of a transcript.
   * @param id - The identifier of the transcript.
   * @returns A promise that resolves to the fetch HTTP response of the redacted audio file.
   */
  async redactedAudioFile(id) {
    const { redacted_audio_url, status } = await this.redactedAudio(id);
    if (status !== "redacted_audio_ready") {
      throw new Error(`Redacted audio status is ${status}`);
    }
    const response = await fetch(redacted_audio_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch redacted audio: ${response.statusText}`);
    }
    return {
      arrayBuffer: response.arrayBuffer.bind(response),
      blob: response.blob.bind(response),
      body: response.body,
      bodyUsed: response.bodyUsed
    };
  }
}
const readFile = async (path2) => Readable$1.toWeb(createReadStream(path2));
class FileService extends BaseService {
  /**
   * Upload a local file to AssemblyAI.
   * @param input - The local file path to upload, or a stream or buffer of the file to upload.
   * @returns A promise that resolves to the uploaded file URL.
   */
  async upload(input) {
    let fileData;
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        fileData = dataUrlToBlob(input);
      } else {
        fileData = await readFile(input);
      }
    } else
      fileData = input;
    const data = await this.fetchJson("/v2/upload", {
      method: "POST",
      body: fileData,
      headers: {
        "Content-Type": "application/octet-stream"
      },
      duplex: "half"
    });
    return data.upload_url;
  }
}
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
const defaultStreamingUrl$1 = "wss://streaming.assemblyai.com/v3/ws";
const terminateSessionMessage = `{"type":"Terminate"}`;
class StreamingTranscriber {
  constructor(params) {
    this.listeners = {};
    this.params = {
      ...params,
      websocketBaseUrl: params.websocketBaseUrl || defaultStreamingUrl$1
    };
    if ("token" in params && params.token)
      this.token = params.token;
    if ("apiKey" in params && params.apiKey)
      this.apiKey = params.apiKey;
    if (!(this.token || this.apiKey)) {
      throw new Error("API key or temporary token is required.");
    }
  }
  connectionUrl() {
    const url = new URL(this.params.websocketBaseUrl ?? "");
    if (url.protocol !== "wss:") {
      throw new Error("Invalid protocol, must be wss");
    }
    const searchParams = new URLSearchParams();
    if (this.token) {
      searchParams.set("token", this.token);
    }
    searchParams.set("sample_rate", this.params.sampleRate.toString());
    if (this.params.endOfTurnConfidenceThreshold) {
      searchParams.set("end_of_turn_confidence_threshold", this.params.endOfTurnConfidenceThreshold.toString());
    }
    if (this.params.minEndOfTurnSilenceWhenConfident) {
      searchParams.set("min_end_of_turn_silence_when_confident", this.params.minEndOfTurnSilenceWhenConfident.toString());
    }
    if (this.params.maxTurnSilence) {
      searchParams.set("max_turn_silence", this.params.maxTurnSilence.toString());
    }
    if (this.params.vadThreshold !== void 0) {
      searchParams.set("vad_threshold", this.params.vadThreshold.toString());
    }
    if (this.params.formatTurns) {
      searchParams.set("format_turns", this.params.formatTurns.toString());
    }
    if (this.params.encoding) {
      searchParams.set("encoding", this.params.encoding.toString());
    }
    if (this.params.keytermsPrompt) {
      searchParams.set("keyterms_prompt", JSON.stringify(this.params.keytermsPrompt));
    } else if (this.params.keyterms) {
      console.warn("[Deprecation Warning] `keyterms` is deprecated and will be removed in a future release. Please use `keytermsPrompt` instead.");
      searchParams.set("keyterms_prompt", JSON.stringify(this.params.keyterms));
    }
    if (this.params.filterProfanity) {
      searchParams.set("filter_profanity", this.params.filterProfanity.toString());
    }
    if (this.params.speechModel) {
      searchParams.set("speech_model", this.params.speechModel.toString());
    }
    if (this.params.languageDetection !== void 0) {
      searchParams.set("language_detection", this.params.languageDetection.toString());
    }
    if (this.params.inactivityTimeout !== void 0) {
      searchParams.set("inactivity_timeout", this.params.inactivityTimeout.toString());
    }
    url.search = searchParams.toString();
    return url;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event, listener) {
    this.listeners[event] = listener;
  }
  connect() {
    return new Promise((resolve) => {
      if (this.socket) {
        throw new Error("Already connected");
      }
      const url = this.connectionUrl();
      if (this.token) {
        this.socket = factory(url.toString());
      } else {
        this.socket = factory(url.toString(), {
          headers: { Authorization: this.apiKey }
        });
      }
      this.socket.binaryType = "arraybuffer";
      this.socket.onopen = () => {
      };
      this.socket.onclose = ({ code, reason }) => {
        var _a, _b;
        if (!reason) {
          if (code in StreamingErrorMessages) {
            reason = StreamingErrorMessages[code];
          }
        }
        (_b = (_a = this.listeners).close) == null ? void 0 : _b.call(_a, code, reason);
      };
      this.socket.onerror = (event) => {
        var _a, _b, _c, _d;
        if (event.error)
          (_b = (_a = this.listeners).error) == null ? void 0 : _b.call(_a, event.error);
        else
          (_d = (_c = this.listeners).error) == null ? void 0 : _d.call(_c, new Error(event.message));
      };
      this.socket.onmessage = ({ data }) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const message = JSON.parse(data.toString());
        if ("error" in message) {
          (_b = (_a = this.listeners).error) == null ? void 0 : _b.call(_a, new StreamingError(message.error));
          return;
        }
        switch (message.type) {
          case "Begin": {
            resolve(message);
            (_d = (_c = this.listeners).open) == null ? void 0 : _d.call(_c, message);
            break;
          }
          case "Turn": {
            (_f = (_e = this.listeners).turn) == null ? void 0 : _f.call(_e, message);
            break;
          }
          case "Termination": {
            (_g = this.sessionTerminatedResolve) == null ? void 0 : _g.call(this);
            break;
          }
        }
      };
    });
  }
  stream() {
    return new WritableStream({
      write: (chunk) => {
        this.sendAudio(chunk);
      }
    });
  }
  sendAudio(audio) {
    this.send(audio);
  }
  send(data) {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      throw new Error("Socket is not open for communication");
    }
    this.socket.send(data);
  }
  async close(waitForSessionTermination = true) {
    var _a;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN) {
        if (waitForSessionTermination) {
          const sessionTerminatedPromise = new Promise((resolve) => {
            this.sessionTerminatedResolve = resolve;
          });
          this.socket.send(terminateSessionMessage);
          await sessionTerminatedPromise;
        } else {
          this.socket.send(terminateSessionMessage);
        }
      }
      if ((_a = this.socket) == null ? void 0 : _a.removeAllListeners)
        this.socket.removeAllListeners();
      this.socket.close();
    }
    this.listeners = {};
    this.socket = void 0;
  }
}
class StreamingTranscriberFactory extends BaseService {
  constructor(params) {
    super(params);
    this.baseServiceParams = params;
  }
  transcriber(params) {
    const serviceParams = { ...params };
    if (!serviceParams.token && !serviceParams.apiKey) {
      serviceParams.apiKey = this.baseServiceParams.apiKey;
    }
    return new StreamingTranscriber(serviceParams);
  }
  async createTemporaryToken(params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== void 0 && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    const url = queryString ? `/v3/token?${queryString}` : "/v3/token";
    const data = await this.fetchJson(url, {
      method: "GET"
    });
    return data.token;
  }
}
const defaultBaseUrl = "https://api.assemblyai.com";
const defaultStreamingUrl = "https://streaming.assemblyai.com";
class AssemblyAI {
  /**
   * Create a new AssemblyAI client.
   * @param params - The parameters for the service, including the API key and base URL, if any.
   */
  constructor(params) {
    params.baseUrl = params.baseUrl || defaultBaseUrl;
    if (params.baseUrl && params.baseUrl.endsWith("/")) {
      params.baseUrl = params.baseUrl.slice(0, -1);
    }
    this.files = new FileService(params);
    this.transcripts = new TranscriptService(params, this.files);
    this.lemur = new LemurService(params);
    this.realtime = new RealtimeTranscriberFactory(params);
    this.streaming = new StreamingTranscriberFactory({
      ...params,
      baseUrl: params.streamingBaseUrl || defaultStreamingUrl
    });
  }
}
function getFFmpegPath() {
  const { app: app2 } = require("electron");
  if (app2.isPackaged) {
    const platform = process.platform;
    const ffmpegName = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    const resourcePath = path.join(process.resourcesPath, "bin", ffmpegName);
    if (fs.existsSync(resourcePath)) {
      return resourcePath;
    }
  }
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}
async function extractAudio(videoPath) {
  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `audio-${Date.now()}.wav`);
  const ffmpegPath = getFFmpegPath();
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-i",
      videoPath,
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
      audioPath
    ]);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed and in PATH.`));
    });
  });
}
async function transcribeVideo(request, onProgress) {
  try {
    if (!request.videoPath) {
      return { success: false, error: "Video path is required" };
    }
    if (!request.apiKey) {
      return { success: false, error: "AssemblyAI API key is required" };
    }
    if (!fs.existsSync(request.videoPath)) {
      return { success: false, error: `Video file not found: ${request.videoPath}` };
    }
    onProgress == null ? void 0 : onProgress({
      status: "extracting",
      progress: 10,
      message: "Extracting audio from video..."
    });
    let audioPath;
    try {
      audioPath = await extractAudio(request.videoPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract audio: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    onProgress == null ? void 0 : onProgress({
      status: "uploading",
      progress: 20,
      message: "Uploading audio to AssemblyAI..."
    });
    const client = new AssemblyAI({ apiKey: request.apiKey });
    onProgress == null ? void 0 : onProgress({
      status: "transcribing",
      progress: 30,
      message: "Transcribing audio (this may take a few minutes)..."
    });
    const transcriptConfig = {
      audio: audioPath
    };
    if (request.language && request.language !== "auto") {
      transcriptConfig.language_code = request.language;
    }
    const transcript = await client.transcripts.transcribe(transcriptConfig);
    onProgress == null ? void 0 : onProgress({
      status: "processing",
      progress: 90,
      message: "Processing transcription results..."
    });
    try {
      fs.unlinkSync(audioPath);
    } catch {
      console.warn("Failed to cleanup temp audio file:", audioPath);
    }
    if (transcript.status === "error") {
      return {
        success: false,
        error: transcript.error || "Transcription failed"
      };
    }
    const words = (transcript.words || []).map((w) => ({
      text: w.text,
      startMs: w.start,
      endMs: w.end,
      confidence: w.confidence
    }));
    onProgress == null ? void 0 : onProgress({
      status: "complete",
      progress: 100,
      message: `Transcription complete! ${words.length} words detected.`
    });
    return {
      success: true,
      words
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transcription error"
    };
  }
}
const require$1 = createRequire(import.meta.url);
const MIN_DRAG_DURATION_MS = 100;
const MIN_DRAG_DISTANCE = 5;
const POLL_INTERVAL_MS = 16;
const VK_LBUTTON = 1;
const VK_RBUTTON = 2;
const VK_MBUTTON = 4;
class MouseEventDetectorService {
  constructor() {
    __publicField(this, "running", false);
    __publicField(this, "recordingId", "");
    __publicField(this, "screenBounds", { width: 1920, height: 1080 });
    __publicField(this, "recordingStartTime", 0);
    __publicField(this, "events", []);
    __publicField(this, "pendingDrag", null);
    __publicField(this, "mouseHookAvailable", false);
    __publicField(this, "pollInterval", null);
    __publicField(this, "windowsApi", null);
    __publicField(this, "lastButtonState", { left: false, right: false, middle: false });
    this.initializeWindowsApi();
  }
  /**
   * Initialize Windows API bindings using koffi
   */
  initializeWindowsApi() {
    try {
      const koffi = require$1("koffi");
      console.log("MouseEventDetector: koffi loaded successfully");
      const user32 = koffi.load("user32.dll");
      console.log("MouseEventDetector: user32.dll loaded");
      koffi.struct("POINT", {
        x: "long",
        y: "long"
      });
      const GetAsyncKeyState = user32.func("short __stdcall GetAsyncKeyState(int vKey)");
      const GetCursorPos = user32.func("bool __stdcall GetCursorPos(_Out_ POINT *lpPoint)");
      this.windowsApi = {
        GetAsyncKeyState: (vKey) => GetAsyncKeyState(vKey),
        GetCursorPos: (point) => {
          const p = { x: 0, y: 0 };
          const result = GetCursorPos(p);
          point[0] = p.x;
          point[1] = p.y;
          return result;
        }
      };
      this.mouseHookAvailable = true;
      console.log("MouseEventDetector: Windows API initialized via koffi (no native compilation required)");
    } catch (error) {
      console.warn("MouseEventDetector: koffi not available, trying global-mouse-events fallback");
      console.warn("MouseEventDetector: koffi error:", error);
      this.tryGlobalMouseEventsFallback();
    }
  }
  /**
   * Try to use global-mouse-events as fallback (requires native compilation)
   */
  tryGlobalMouseEventsFallback() {
    try {
      require$1("global-mouse-events");
      this.mouseHookAvailable = true;
      console.log("MouseEventDetector: Using global-mouse-events fallback");
    } catch (error) {
      console.warn("MouseEventDetector: No mouse detection available");
      console.warn("MouseEventDetector: Install koffi (npm install koffi) for mouse detection without Visual Studio Build Tools");
      this.mouseHookAvailable = false;
    }
  }
  /**
   * Start capturing mouse events
   * @param recordingId - Unique identifier for the recording
   * @param screenBounds - Screen dimensions for coordinate validation
   */
  start(recordingId, screenBounds) {
    if (this.running) {
      console.warn("MouseEventDetector: Already running");
      return;
    }
    this.recordingId = recordingId;
    this.screenBounds = screenBounds;
    this.recordingStartTime = Date.now();
    this.events = [];
    this.pendingDrag = null;
    this.running = true;
    this.lastButtonState = { left: false, right: false, middle: false };
    if (this.windowsApi) {
      this.startPolling();
    } else {
      this.initializeGlobalMouseEventsHook();
    }
  }
  /**
   * Start polling Windows API for mouse state
   */
  startPolling() {
    if (!this.windowsApi) return;
    this.pollInterval = setInterval(() => {
      if (!this.running || !this.windowsApi) return;
      const point = [0, 0];
      this.windowsApi.GetCursorPos(point);
      const x = point[0];
      const y = point[1];
      const leftDown = (this.windowsApi.GetAsyncKeyState(VK_LBUTTON) & 32768) !== 0;
      const rightDown = (this.windowsApi.GetAsyncKeyState(VK_RBUTTON) & 32768) !== 0;
      const middleDown = (this.windowsApi.GetAsyncKeyState(VK_MBUTTON) & 32768) !== 0;
      if (leftDown && !this.lastButtonState.left) {
        this.onMouseDown(x, y, "left");
      }
      if (rightDown && !this.lastButtonState.right) {
        this.onMouseDown(x, y, "right");
      }
      if (middleDown && !this.lastButtonState.middle) {
        this.onMouseDown(x, y, "middle");
      }
      if (!leftDown && this.lastButtonState.left) {
        this.onMouseUp(x, y, "left");
      }
      if (!rightDown && this.lastButtonState.right) {
        this.onMouseUp(x, y, "right");
      }
      if (!middleDown && this.lastButtonState.middle) {
        this.onMouseUp(x, y, "middle");
      }
      this.lastButtonState = { left: leftDown, right: rightDown, middle: middleDown };
    }, POLL_INTERVAL_MS);
    console.log("MouseEventDetector: Polling started");
  }
  /**
   * Handle mouse button down event
   */
  onMouseDown(x, y, button) {
    if (!this.running) return;
    if (this.pendingDrag && this.pendingDrag.button !== button) {
      this.completePendingAsClick();
    }
    this.pendingDrag = {
      startTimestamp: this.getRelativeTimestamp(),
      startX: x,
      startY: y,
      button
    };
  }
  /**
   * Handle mouse button up event
   */
  onMouseUp(x, y, button) {
    if (!this.running || !this.pendingDrag) return;
    if (this.pendingDrag.button !== button) return;
    const endTimestamp = this.getRelativeTimestamp();
    const duration = endTimestamp - this.pendingDrag.startTimestamp;
    const positionChanged = Math.abs(x - this.pendingDrag.startX) > MIN_DRAG_DISTANCE || Math.abs(y - this.pendingDrag.startY) > MIN_DRAG_DISTANCE;
    if (duration > MIN_DRAG_DURATION_MS && positionChanged) {
      const dragEvent = {
        type: "drag",
        startTimestamp: this.pendingDrag.startTimestamp,
        endTimestamp,
        startX: this.pendingDrag.startX,
        startY: this.pendingDrag.startY,
        endX: x,
        endY: y
      };
      this.events.push(dragEvent);
    } else {
      const clickEvent = {
        type: "click",
        timestamp: this.pendingDrag.startTimestamp,
        x: this.pendingDrag.startX,
        y: this.pendingDrag.startY,
        button
      };
      this.events.push(clickEvent);
    }
    this.pendingDrag = null;
  }
  /**
   * Complete pending drag as a click (used when another button is pressed)
   */
  completePendingAsClick() {
    if (!this.pendingDrag) return;
    const clickEvent = {
      type: "click",
      timestamp: this.pendingDrag.startTimestamp,
      x: this.pendingDrag.startX,
      y: this.pendingDrag.startY,
      button: this.pendingDrag.button
    };
    this.events.push(clickEvent);
    this.pendingDrag = null;
  }
  /**
   * Initialize global-mouse-events hook (fallback for non-koffi systems)
   */
  initializeGlobalMouseEventsHook() {
    try {
      const mouseEvents = require$1("global-mouse-events");
      mouseEvents.on("mousedown", (event) => {
        if (!this.running) return;
        const button = this.mapButton(event.button);
        this.onMouseDown(event.x, event.y, button);
      });
      mouseEvents.on("mouseup", (event) => {
        if (!this.running) return;
        const button = this.mapButton(event.button);
        this.onMouseUp(event.x, event.y, button);
      });
      console.log("MouseEventDetector: global-mouse-events hook initialized");
    } catch (error) {
      console.warn("MouseEventDetector: Failed to initialize global-mouse-events");
    }
  }
  /**
   * Stop capturing and return collected events
   */
  stop() {
    if (!this.running) {
      console.warn("MouseEventDetector: Not running");
      return this.createEmptyEventData();
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.cleanupGlobalMouseEvents();
    this.running = false;
    this.pendingDrag = null;
    const eventData = {
      version: 1,
      recordingId: this.recordingId,
      screenWidth: this.screenBounds.width,
      screenHeight: this.screenBounds.height,
      events: [...this.events]
    };
    this.events = [];
    this.recordingId = "";
    console.log(`MouseEventDetector: Stopped, captured ${eventData.events.length} events`);
    return eventData;
  }
  /**
   * Cleanup global-mouse-events listeners
   */
  cleanupGlobalMouseEvents() {
    try {
      const mouseEvents = require$1("global-mouse-events");
      mouseEvents.removeAllListeners("mousedown");
      mouseEvents.removeAllListeners("mouseup");
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
  mapButton(button) {
    switch (button) {
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
  addClickEvent(x, y, button = "left") {
    if (!this.running) return;
    const clickEvent = {
      type: "click",
      timestamp: this.getRelativeTimestamp(),
      x,
      y,
      button
    };
    this.events.push(clickEvent);
  }
  /**
   * Manually add a drag event (for testing or alternative input methods)
   */
  addDragEvent(startX, startY, endX, endY, durationMs = 200) {
    if (!this.running) return;
    const startTimestamp = this.getRelativeTimestamp();
    const dragEvent = {
      type: "drag",
      startTimestamp,
      endTimestamp: startTimestamp + durationMs,
      startX,
      startY,
      endX,
      endY
    };
    this.events.push(dragEvent);
  }
}
const mouseEventDetector = new MouseEventDetectorService();
let selectedSource = null;
function registerIpcHandlers(createEditorWindow2, createSourceSelectorWindow2, getMainWindow, getSourceSelectorWindow, onRecordingStateChange) {
  ipcMain.handle("get-sources", async (_, opts) => {
    const sources = await desktopCapturer.getSources(opts);
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      display_id: source.display_id,
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  });
  ipcMain.handle("select-source", (_, source) => {
    selectedSource = source;
    const sourceSelectorWin = getSourceSelectorWindow();
    if (sourceSelectorWin) {
      sourceSelectorWin.close();
    }
    return selectedSource;
  });
  ipcMain.handle("get-selected-source", () => {
    return selectedSource;
  });
  ipcMain.handle("open-source-selector", () => {
    const sourceSelectorWin = getSourceSelectorWindow();
    if (sourceSelectorWin) {
      sourceSelectorWin.focus();
      return;
    }
    createSourceSelectorWindow2();
  });
  ipcMain.handle("switch-to-editor", () => {
    const mainWin = getMainWindow();
    if (mainWin) {
      mainWin.close();
    }
    createEditorWindow2();
  });
  ipcMain.handle("store-recorded-video", async (_, videoData, fileName) => {
    try {
      const videoPath = path$1.join(RECORDINGS_DIR, fileName);
      await fs$1.writeFile(videoPath, Buffer.from(videoData));
      currentVideoPath = videoPath;
      return {
        success: true,
        path: videoPath,
        message: "Video stored successfully"
      };
    } catch (error) {
      console.error("Failed to store video:", error);
      return {
        success: false,
        message: "Failed to store video",
        error: String(error)
      };
    }
  });
  ipcMain.handle("get-recorded-video-path", async () => {
    try {
      const files = await fs$1.readdir(RECORDINGS_DIR);
      const videoFiles = files.filter((file) => file.endsWith(".webm"));
      if (videoFiles.length === 0) {
        return { success: false, message: "No recorded video found" };
      }
      const latestVideo = videoFiles.sort().reverse()[0];
      const videoPath = path$1.join(RECORDINGS_DIR, latestVideo);
      return { success: true, path: videoPath };
    } catch (error) {
      console.error("Failed to get video path:", error);
      return { success: false, message: "Failed to get video path", error: String(error) };
    }
  });
  ipcMain.handle("set-recording-state", (_, recording) => {
    const source = selectedSource || { name: "Screen" };
    if (onRecordingStateChange) {
      onRecordingStateChange(recording, source.name);
    }
  });
  ipcMain.handle("open-external-url", async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("Failed to open URL:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("get-asset-base-path", () => {
    try {
      if (app.isPackaged) {
        return path$1.join(process.resourcesPath, "assets");
      }
      return path$1.join(app.getAppPath(), "public", "assets");
    } catch (err) {
      console.error("Failed to resolve asset base path:", err);
      return null;
    }
  });
  ipcMain.handle("save-exported-video", async (_, videoData, fileName) => {
    try {
      const mainWindow2 = getMainWindow();
      const isGif = fileName.toLowerCase().endsWith(".gif");
      const filters = isGif ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }];
      const dialogOptions = {
        title: isGif ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: path$1.join(app.getPath("downloads"), fileName),
        filters,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      };
      const result = mainWindow2 ? await dialog.showSaveDialog(mainWindow2, dialogOptions) : await dialog.showSaveDialog(dialogOptions);
      if (result.canceled || !result.filePath) {
        return {
          success: false,
          cancelled: true,
          message: "Export cancelled"
        };
      }
      await fs$1.writeFile(result.filePath, Buffer.from(videoData));
      return {
        success: true,
        path: result.filePath,
        message: "Video exported successfully"
      };
    } catch (error) {
      console.error("Failed to save exported video:", error);
      return {
        success: false,
        message: "Failed to save exported video",
        error: String(error)
      };
    }
  });
  ipcMain.handle("open-video-file-picker", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Select Video File",
        defaultPath: RECORDINGS_DIR,
        filters: [
          { name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }
      return {
        success: true,
        path: result.filePaths[0]
      };
    } catch (error) {
      console.error("Failed to open file picker:", error);
      return {
        success: false,
        message: "Failed to open file picker",
        error: String(error)
      };
    }
  });
  let currentVideoPath = null;
  ipcMain.handle("set-current-video-path", (_, path2) => {
    currentVideoPath = path2;
    return { success: true };
  });
  ipcMain.handle("get-current-video-path", () => {
    return currentVideoPath ? { success: true, path: currentVideoPath } : { success: false };
  });
  ipcMain.handle("clear-current-video-path", () => {
    currentVideoPath = null;
    return { success: true };
  });
  ipcMain.handle("get-platform", () => {
    return process.platform;
  });
  ipcMain.handle("presets:get", async () => {
    return await getPresets();
  });
  ipcMain.handle("presets:save", async (_, preset) => {
    return await savePreset(preset);
  });
  ipcMain.handle("presets:update", async (_, id, updates) => {
    return await updatePreset(id, updates);
  });
  ipcMain.handle("presets:delete", async (_, id) => {
    return await deletePreset(id);
  });
  ipcMain.handle("presets:duplicate", async (_, id) => {
    return await duplicatePreset(id);
  });
  ipcMain.handle("presets:setDefault", async (_, id) => {
    return await setDefaultPreset(id);
  });
  ipcMain.handle("keystroke:start", async () => {
    try {
      await keystrokeService.start();
      return { success: true };
    } catch (error) {
      console.error("Failed to start keystroke service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke:stop", () => {
    try {
      keystrokeService.stop();
      return { success: true };
    } catch (error) {
      console.error("Failed to stop keystroke service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke:get-settings", async () => {
    return await getKeystrokeSettings();
  });
  ipcMain.handle("keystroke:set-settings", async (_, settings) => {
    return await setKeystrokeSettings(settings);
  });
  ipcMain.handle("keystroke:show-overlay", async () => {
    try {
      let overlayWindow = getKeystrokeOverlayWindow();
      if (!overlayWindow || overlayWindow.isDestroyed()) {
        overlayWindow = createKeystrokeOverlayWindow();
        keystrokeService.onEvent((event) => {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send("keystroke:event", event);
          }
        });
      } else {
        showKeystrokeOverlayWindow();
      }
      return { success: true };
    } catch (error) {
      console.error("Failed to show keystroke overlay:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke:hide-overlay", async () => {
    try {
      hideKeystrokeOverlayWindow();
      return { success: true };
    } catch (error) {
      console.error("Failed to hide keystroke overlay:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("transcribe-video", async (_event, request) => {
    return await transcribeVideo(request, (progress) => {
      const mainWindow2 = getMainWindow();
      if (mainWindow2 && !mainWindow2.isDestroyed()) {
        mainWindow2.webContents.send("transcription-progress", progress);
      }
    });
  });
  ipcMain.handle("auto-zoom:start-detection", async (_, recordingId, screenBounds) => {
    try {
      mouseEventDetector.start(recordingId, screenBounds);
      return { success: true };
    } catch (error) {
      console.error("Failed to start mouse event detection:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("auto-zoom:stop-detection", async () => {
    try {
      const eventData = mouseEventDetector.stop();
      return { success: true, data: eventData };
    } catch (error) {
      console.error("Failed to stop mouse event detection:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("auto-zoom:save-events", async (_, eventData, fileName) => {
    try {
      const eventsPath = path$1.join(RECORDINGS_DIR, fileName);
      await fs$1.writeFile(eventsPath, JSON.stringify(eventData, null, 2));
      return { success: true, path: eventsPath };
    } catch (error) {
      console.error("Failed to save mouse events:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("auto-zoom:get-events", async (_, videoPath) => {
    try {
      const eventsPath = videoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".events.json");
      try {
        const data = await fs$1.readFile(eventsPath, "utf-8");
        const eventData = JSON.parse(data);
        return { success: true, data: eventData };
      } catch (readError) {
        if (readError.code === "ENOENT") {
          return { success: false, notFound: true };
        }
        throw readError;
      }
    } catch (error) {
      console.error("Failed to get mouse events:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("auto-zoom:is-running", () => {
    return mouseEventDetector.isRunning();
  });
}
const SPECIAL_KEY_CODES = {
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
};
const ALPHA_KEY_CODES = {
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
};
const SYMBOL_KEY_CODES = {
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
function getKeyDisplayName(keyCode) {
  if (SPECIAL_KEY_CODES[keyCode]) {
    return SPECIAL_KEY_CODES[keyCode];
  }
  if (ALPHA_KEY_CODES[keyCode]) {
    return ALPHA_KEY_CODES[keyCode];
  }
  if (SYMBOL_KEY_CODES[keyCode]) {
    return SYMBOL_KEY_CODES[keyCode];
  }
  return `Key(0x${keyCode.toString(16).toUpperCase().padStart(4, "0")})`;
}
class KeystrokeEventRecorder {
  constructor() {
    __publicField(this, "running", false);
    __publicField(this, "recordingId", "");
    __publicField(this, "recordingStartTime", 0);
    __publicField(this, "events", []);
    __publicField(this, "eventHandler", null);
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
  start(recordingId) {
    if (this.running) {
      console.warn("[KeystrokeEventRecorder] Already recording, ignoring start call");
      return;
    }
    this.recordingId = recordingId;
    this.recordingStartTime = Date.now();
    this.events = [];
    this.running = true;
    this.eventHandler = (event) => {
      this.handleEvent(event);
    };
    keystrokeService.onEvent(this.eventHandler);
    if (!keystrokeService.isRunning()) {
      keystrokeService.start().catch((error) => {
        console.error("[KeystrokeEventRecorder] Failed to start keystroke service:", error);
        this.running = false;
        this.eventHandler = null;
      });
    }
    console.log(`[KeystrokeEventRecorder] Started recording: ${recordingId}`);
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
    if (!this.running) {
      console.warn("[KeystrokeEventRecorder] Not recording, returning empty data");
      return {
        version: 1,
        recordingId: "",
        events: []
      };
    }
    keystrokeService.removeEventListener();
    this.eventHandler = null;
    const eventData = {
      version: 1,
      recordingId: this.recordingId,
      events: [...this.events]
    };
    this.running = false;
    this.recordingId = "";
    this.recordingStartTime = 0;
    this.events = [];
    console.log(`[KeystrokeEventRecorder] Stopped recording, captured ${eventData.events.length} events`);
    return eventData;
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
  handleEvent(event) {
    if (!this.running) {
      return;
    }
    const relativeTimestamp = event.timestamp - this.recordingStartTime;
    const timestamp = Math.max(0, relativeTimestamp);
    if (event.type === "keystroke") {
      const recordedEvent = {
        type: "keystroke",
        timestamp,
        keyCode: event.keyCode,
        keyName: getKeyDisplayName(event.keyCode),
        modifiers: {
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          shift: event.modifiers.shift,
          meta: event.modifiers.meta
        }
      };
      this.events.push(recordedEvent);
    } else if (event.type === "mouse") {
      const recordedEvent = {
        type: "mouse",
        timestamp,
        button: event.button,
        modifiers: {
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          shift: event.modifiers.shift,
          meta: event.modifiers.meta
        }
      };
      this.events.push(recordedEvent);
    }
  }
}
const keystrokeEventRecorder = new KeystrokeEventRecorder();
function getKeystrokeFilePathFromVideo(videoPath) {
  return videoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, ".keystroke.json");
}
async function saveKeystrokeEvents(eventData, filePath) {
  try {
    if (!eventData || typeof eventData.version !== "number" || !Array.isArray(eventData.events)) {
      return {
        success: false,
        error: "Invalid event data: missing required fields"
      };
    }
    const jsonContent = JSON.stringify(eventData, null, 2);
    await fs$1.writeFile(filePath, jsonContent, "utf-8");
    console.log(`[KeystrokeEventRecorder] Saved ${eventData.events.length} events to ${filePath}`);
    return {
      success: true,
      path: filePath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[KeystrokeEventRecorder] Failed to save events to ${filePath}:`, error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
async function loadKeystrokeEvents(filePath) {
  try {
    const content = await fs$1.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (!isValidKeystrokeEventData(data)) {
      return {
        success: false,
        error: "Invalid keystroke event file format"
      };
    }
    console.log(`[KeystrokeEventRecorder] Loaded ${data.events.length} events from ${filePath}`);
    return {
      success: true,
      data
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        success: false,
        notFound: true
      };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[KeystrokeEventRecorder] Failed to load events from ${filePath}:`, error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
function isValidKeystrokeEventData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  const obj = data;
  if (obj.version !== 1) {
    return false;
  }
  if (typeof obj.recordingId !== "string") {
    return false;
  }
  if (!Array.isArray(obj.events)) {
    return false;
  }
  for (const event of obj.events) {
    if (!isValidRecordedInputEvent(event)) {
      return false;
    }
  }
  return true;
}
function isValidRecordedInputEvent(event) {
  if (!event || typeof event !== "object") {
    return false;
  }
  const obj = event;
  if (typeof obj.timestamp !== "number" || obj.timestamp < 0) {
    return false;
  }
  if (!isValidModifiers(obj.modifiers)) {
    return false;
  }
  if (obj.type === "keystroke") {
    return typeof obj.keyCode === "number" && typeof obj.keyName === "string" && obj.keyName.length > 0;
  } else if (obj.type === "mouse") {
    return obj.button === "left" || obj.button === "right" || obj.button === "middle";
  }
  return false;
}
function isValidModifiers(modifiers) {
  if (!modifiers || typeof modifiers !== "object") {
    return false;
  }
  const obj = modifiers;
  return typeof obj.ctrl === "boolean" && typeof obj.alt === "boolean" && typeof obj.shift === "boolean" && typeof obj.meta === "boolean";
}
const DEFAULT_KEYSTROKE_STYLE = {
  textColor: "#FFFFFF",
  backgroundColor: "#000000CC",
  modifierColor: "#34B27B",
  textScale: 1,
  borderRadius: 8,
  fadeDurationMs: 300,
  lingerDurationMs: 1500,
  animationIn: "fade",
  animationOut: "fade",
  showOnlyHotkeys: false
};
const DEFAULT_KEYSTROKE_EDITOR_SETTINGS = {
  captureEnabled: false,
  defaultStyle: DEFAULT_KEYSTROKE_STYLE,
  defaultPosition: "bottom-center"
};
const KEYSTROKE_EDITOR_SETTINGS_FILE_NAME = "keystroke-editor-settings.json";
const CURRENT_VERSION = 1;
function getKeystrokeEditorSettingsFilePath() {
  return path$1.join(app.getPath("userData"), KEYSTROKE_EDITOR_SETTINGS_FILE_NAME);
}
function createDefaultStore() {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS }
  };
}
async function readKeystrokeEditorSettingsStore() {
  try {
    const filePath = getKeystrokeEditorSettingsFilePath();
    const data = await fs$1.readFile(filePath, "utf-8");
    const store = JSON.parse(data);
    if (!store.settings || typeof store.settings !== "object") {
      console.warn("[KeystrokeEditor] Invalid settings file, creating new store");
      return createDefaultStore();
    }
    return {
      version: store.version || CURRENT_VERSION,
      settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS, ...store.settings }
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return createDefaultStore();
    }
    console.error("[KeystrokeEditor] Failed to read settings file:", error);
    try {
      const filePath = getKeystrokeEditorSettingsFilePath();
      const backupPath = filePath + ".backup." + Date.now();
      await fs$1.rename(filePath, backupPath);
      console.log("[KeystrokeEditor] Backed up corrupt settings file to:", backupPath);
    } catch {
    }
    return createDefaultStore();
  }
}
async function writeKeystrokeEditorSettingsStore(store) {
  const filePath = getKeystrokeEditorSettingsFilePath();
  await fs$1.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}
async function getKeystrokeEditorSettings() {
  try {
    const store = await readKeystrokeEditorSettingsStore();
    return {
      success: true,
      settings: store.settings
    };
  } catch (error) {
    console.error("[KeystrokeEditor] Failed to get settings:", error);
    return {
      success: false,
      settings: { ...DEFAULT_KEYSTROKE_EDITOR_SETTINGS }
    };
  }
}
async function setKeystrokeEditorSettings(settings) {
  try {
    const store = await readKeystrokeEditorSettingsStore();
    store.settings = { ...store.settings, ...settings };
    await writeKeystrokeEditorSettingsStore(store);
    return { success: true, settings: store.settings };
  } catch (error) {
    console.error("[KeystrokeEditor] Failed to save settings:", error);
    return { success: false, error: String(error) };
  }
}
async function checkKeystrokeServiceAvailability() {
  try {
    await import("./index-CuUw7h0t.js").then((n) => n.i);
    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[KeystrokeEditor] Keystroke service not available:", errorMessage);
    return {
      available: false,
      error: "Keystroke capture is not available on this system. The native library could not be loaded."
    };
  }
}
function registerKeystrokeEditorIpcHandlers(recordingsDir) {
  ipcMain.handle("keystroke-editor:check-availability", async () => {
    return await checkKeystrokeServiceAvailability();
  });
  ipcMain.handle("keystroke-editor:start-capture", async (_, recordingId) => {
    try {
      keystrokeEventRecorder.start(recordingId);
      return { success: true };
    } catch (error) {
      console.error("[KeystrokeEditor] Failed to start capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke-editor:stop-capture", async () => {
    try {
      const eventData = keystrokeEventRecorder.stop();
      return { success: true, data: eventData };
    } catch (error) {
      console.error("[KeystrokeEditor] Failed to stop capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke-editor:is-capturing", () => {
    return keystrokeEventRecorder.isRunning();
  });
  ipcMain.handle(
    "keystroke-editor:save-events",
    async (_, eventData, fileName) => {
      try {
        const filePath = path$1.join(recordingsDir, fileName);
        const result = await saveKeystrokeEvents(eventData, filePath);
        return result;
      } catch (error) {
        console.error("[KeystrokeEditor] Failed to save events:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );
  ipcMain.handle("keystroke-editor:load-events", async (_, videoPath) => {
    try {
      const keystrokeFilePath = getKeystrokeFilePathFromVideo(videoPath);
      const result = await loadKeystrokeEvents(keystrokeFilePath);
      return result;
    } catch (error) {
      console.error("[KeystrokeEditor] Failed to load events:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("keystroke-editor:get-settings", async () => {
    return await getKeystrokeEditorSettings();
  });
  ipcMain.handle(
    "keystroke-editor:set-settings",
    async (_, settings) => {
      return await setKeystrokeEditorSettings(settings);
    }
  );
  console.log("[KeystrokeEditor] IPC handlers registered");
}
const __dirname = path$1.dirname(fileURLToPath(import.meta.url));
const RECORDINGS_DIR = path$1.join(app.getPath("userData"), "recordings");
async function ensureRecordingsDir() {
  try {
    await fs$1.mkdir(RECORDINGS_DIR, { recursive: true });
    console.log("RECORDINGS_DIR:", RECORDINGS_DIR);
    console.log("User Data Path:", app.getPath("userData"));
  } catch (error) {
    console.error("Failed to create recordings directory:", error);
  }
}
process.env.APP_ROOT = path$1.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow = null;
let sourceSelectorWindow = null;
let tray = null;
let selectedSourceName = "";
const defaultTrayIcon = getTrayIcon("openscreen.png");
const recordingTrayIcon = getTrayIcon("rec-button.png");
function createWindow() {
  mainWindow = createHudOverlayWindow();
}
function createTray() {
  tray = new Tray(defaultTrayIcon);
}
function getTrayIcon(filename) {
  return nativeImage.createFromPath(path$1.join(process.env.VITE_PUBLIC || RENDERER_DIST, filename)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function updateTrayMenu(recording = false) {
  if (!tray) return;
  const trayIcon = recording ? recordingTrayIcon : defaultTrayIcon;
  const trayToolTip = recording ? `Recording: ${selectedSourceName}` : "OpenScreen";
  const menuTemplate = recording ? [
    {
      label: "Stop Recording",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("stop-recording-from-tray");
        }
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.isMinimized() && mainWindow.restore();
        } else {
          createWindow();
        }
      }
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ];
  tray.setImage(trayIcon);
  tray.setToolTip(trayToolTip);
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
}
function createEditorWindowWrapper() {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  mainWindow = createEditorWindow();
}
function createSourceSelectorWindowWrapper() {
  sourceSelectorWindow = createSourceSelectorWindow();
  sourceSelectorWindow.on("closed", () => {
    sourceSelectorWindow = null;
  });
  return sourceSelectorWindow;
}
app.on("window-all-closed", () => {
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  const { ipcMain: ipcMain2 } = await import("electron");
  ipcMain2.on("hud-overlay-close", () => {
    app.quit();
  });
  createTray();
  updateTrayMenu();
  await ensureRecordingsDir();
  registerIpcHandlers(
    createEditorWindowWrapper,
    createSourceSelectorWindowWrapper,
    () => mainWindow,
    () => sourceSelectorWindow,
    (recording, sourceName) => {
      selectedSourceName = sourceName;
      if (!tray) createTray();
      updateTrayMenu(recording);
      if (!recording) {
        if (mainWindow) mainWindow.restore();
      }
    }
  );
  registerKeystrokeEditorIpcHandlers(RECORDINGS_DIR);
  createWindow();
});
export {
  MAIN_DIST as M,
  RECORDINGS_DIR as R,
  VITE_DEV_SERVER_URL as V,
  RENDERER_DIST as a,
  getDefaultExportFromCjs as g
};
