import { ipcMain as i, screen as R, BrowserWindow as x, app as f, desktopCapturer as ee, shell as te, dialog as I, nativeImage as re, Tray as oe, Menu as V } from "electron";
import { fileURLToPath as B } from "node:url";
import a from "node:path";
import p from "node:fs/promises";
const N = a.dirname(B(import.meta.url)), se = a.join(N, ".."), T = process.env.VITE_DEV_SERVER_URL, W = a.join(se, "dist");
let O = null;
i.on("hud-overlay-hide", () => {
  O && !O.isDestroyed() && O.minimize();
});
function ne() {
  const o = R.getPrimaryDisplay(), { workArea: r } = o, c = 500, g = 100, y = Math.floor(r.x + (r.width - c) / 2), t = Math.floor(r.y + r.height - g - 5), e = new x({
    width: c,
    height: g,
    minWidth: 500,
    maxWidth: 500,
    minHeight: 100,
    maxHeight: 100,
    x: y,
    y: t,
    frame: !1,
    transparent: !0,
    resizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    hasShadow: !1,
    webPreferences: {
      preload: a.join(N, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      backgroundThrottling: !1
    }
  });
  return e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), O = e, e.on("closed", () => {
    O === e && (O = null);
  }), T ? e.loadURL(T + "?windowType=hud-overlay") : e.loadFile(a.join(W, "index.html"), {
    query: { windowType: "hud-overlay" }
  }), e;
}
function ae() {
  const o = process.platform === "darwin", r = new x({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...o && {
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
      preload: a.join(N, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1,
      backgroundThrottling: !1
    }
  });
  return r.maximize(), r.webContents.on("did-finish-load", () => {
    r == null || r.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), T ? r.loadURL(T + "?windowType=editor") : r.loadFile(a.join(W, "index.html"), {
    query: { windowType: "editor" }
  }), r;
}
function ie() {
  const { width: o, height: r } = R.getPrimaryDisplay().workAreaSize, c = new x({
    width: 620,
    height: 420,
    minHeight: 350,
    maxHeight: 500,
    x: Math.round((o - 620) / 2),
    y: Math.round((r - 420) / 2),
    frame: !1,
    resizable: !1,
    alwaysOnTop: !0,
    transparent: !0,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: a.join(N, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  return T ? c.loadURL(T + "?windowType=source-selector") : c.loadFile(a.join(W, "index.html"), {
    query: { windowType: "source-selector" }
  }), c;
}
const D = "openscreen", U = a.join(f.getPath("userData"), "shortcuts.json");
let v = null, w = null, m = null;
function z(o) {
  return a.resolve(o);
}
function le(o) {
  return !o || !m ? !1 : z(o) === z(m);
}
const ce = 1, ue = 100, de = 60 * 60 * 10;
let C = null, G = 0, F = [], _ = [];
function M(o, r, c) {
  return Math.min(c, Math.max(r, o));
}
function J() {
  C && (clearInterval(C), C = null);
}
function $() {
  const o = R.getCursorScreenPoint(), r = Number(v == null ? void 0 : v.display_id), y = ((Number.isFinite(r) ? R.getAllDisplays().find((l) => l.id === r) ?? null : null) ?? R.getDisplayNearestPoint(o)).bounds, t = Math.max(1, y.width), e = Math.max(1, y.height), n = M((o.x - y.x) / t, 0, 1), s = M((o.y - y.y) / e, 0, 1);
  F.push({
    timeMs: Math.max(0, Date.now() - G),
    cx: n,
    cy: s
  }), F.length > de && F.shift();
}
function pe(o, r, c, g, y) {
  i.handle("get-sources", async (t, e) => (await ee.getSources(e)).map((s) => ({
    id: s.id,
    name: s.name,
    display_id: s.display_id,
    thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null,
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null
  }))), i.handle("select-source", (t, e) => {
    v = e;
    const n = g();
    return n && n.close(), v;
  }), i.handle("get-selected-source", () => v), i.handle("open-source-selector", () => {
    const t = g();
    if (t) {
      t.focus();
      return;
    }
    r();
  }), i.handle("switch-to-editor", () => {
    const t = c();
    t && t.close(), o();
  }), i.handle("store-recorded-video", async (t, e, n) => {
    try {
      const s = a.join(S, n);
      await p.writeFile(s, Buffer.from(e)), w = s, m = null;
      const l = `${s}.cursor.json`;
      return _.length > 0 && await p.writeFile(
        l,
        JSON.stringify({ version: ce, samples: _ }, null, 2),
        "utf-8"
      ), _ = [], {
        success: !0,
        path: s,
        message: "Video stored successfully"
      };
    } catch (s) {
      return console.error("Failed to store video:", s), {
        success: !1,
        message: "Failed to store video",
        error: String(s)
      };
    }
  }), i.handle("get-recorded-video-path", async () => {
    try {
      const e = (await p.readdir(S)).filter((l) => l.endsWith(".webm"));
      if (e.length === 0)
        return { success: !1, message: "No recorded video found" };
      const n = e.sort().reverse()[0];
      return { success: !0, path: a.join(S, n) };
    } catch (t) {
      return console.error("Failed to get video path:", t), { success: !1, message: "Failed to get video path", error: String(t) };
    }
  }), i.handle("set-recording-state", (t, e) => {
    e ? (J(), F = [], _ = [], G = Date.now(), $(), C = setInterval($, ue)) : (J(), _ = [...F], F = []), y && y(e, (v || { name: "Screen" }).name);
  }), i.handle("get-cursor-telemetry", async (t, e) => {
    const n = e ?? w;
    if (!n)
      return { success: !0, samples: [] };
    const s = `${n}.cursor.json`;
    try {
      const l = await p.readFile(s, "utf-8"), d = JSON.parse(l);
      return { success: !0, samples: (Array.isArray(d) ? d : Array.isArray(d == null ? void 0 : d.samples) ? d.samples : []).filter((b) => !!(b && typeof b == "object")).map((b) => {
        const h = b;
        return {
          timeMs: typeof h.timeMs == "number" && Number.isFinite(h.timeMs) ? Math.max(0, h.timeMs) : 0,
          cx: typeof h.cx == "number" && Number.isFinite(h.cx) ? M(h.cx, 0, 1) : 0.5,
          cy: typeof h.cy == "number" && Number.isFinite(h.cy) ? M(h.cy, 0, 1) : 0.5
        };
      }).sort((b, h) => b.timeMs - h.timeMs) };
    } catch (l) {
      return l.code === "ENOENT" ? { success: !0, samples: [] } : (console.error("Failed to load cursor telemetry:", l), { success: !1, message: "Failed to load cursor telemetry", error: String(l), samples: [] });
    }
  }), i.handle("open-external-url", async (t, e) => {
    try {
      return await te.openExternal(e), { success: !0 };
    } catch (n) {
      return console.error("Failed to open URL:", n), { success: !1, error: String(n) };
    }
  }), i.handle("get-asset-base-path", () => {
    try {
      return f.isPackaged ? a.join(process.resourcesPath, "assets") : a.join(f.getAppPath(), "public", "assets");
    } catch (t) {
      return console.error("Failed to resolve asset base path:", t), null;
    }
  }), i.handle("save-exported-video", async (t, e, n) => {
    try {
      const s = n.toLowerCase().endsWith(".gif"), l = s ? [{ name: "GIF Image", extensions: ["gif"] }] : [{ name: "MP4 Video", extensions: ["mp4"] }], d = await I.showSaveDialog({
        title: s ? "Save Exported GIF" : "Save Exported Video",
        defaultPath: a.join(f.getPath("downloads"), n),
        filters: l,
        properties: ["createDirectory", "showOverwriteConfirmation"]
      });
      return d.canceled || !d.filePath ? {
        success: !1,
        canceled: !0,
        message: "Export canceled"
      } : (await p.writeFile(d.filePath, Buffer.from(e)), {
        success: !0,
        path: d.filePath,
        message: "Video exported successfully"
      });
    } catch (s) {
      return console.error("Failed to save exported video:", s), {
        success: !1,
        message: "Failed to save exported video",
        error: String(s)
      };
    }
  }), i.handle("open-video-file-picker", async () => {
    try {
      const t = await I.showOpenDialog({
        title: "Select Video File",
        defaultPath: S,
        filters: [
          { name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      return t.canceled || t.filePaths.length === 0 ? { success: !1, canceled: !0 } : (m = null, {
        success: !0,
        path: t.filePaths[0]
      });
    } catch (t) {
      return console.error("Failed to open file picker:", t), {
        success: !1,
        message: "Failed to open file picker",
        error: String(t)
      };
    }
  });
  ipcMain.handle("reveal-in-folder", async (_, filePath) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error(`Error revealing item in folder: ${filePath}`, error);
      try {
        const openPathResult = await shell.openPath(path.dirname(filePath));
        if (openPathResult) {
          return { success: false, error: openPathResult };
        }
        return { success: true, message: "Could not reveal item, but opened directory." };
      } catch (openError) {
        console.error(`Error opening directory: ${path.dirname(filePath)}`, openError);
        return { success: false, error: String(error) };
      }
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
  }), i.handle("save-project-file", async (t, e, n, s) => {
    try {
      const l = le(s) ? s : null;
      if (l)
        return await p.writeFile(l, JSON.stringify(e, null, 2), "utf-8"), m = l, {
          success: !0,
          path: l,
          message: "Project saved successfully"
        };
      const d = (n || `project-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "_"), k = d.endsWith(`.${D}`) ? d : `${d}.${D}`, P = await I.showSaveDialog({
        title: "Save OpenScreen Project",
        defaultPath: a.join(S, k),
        filters: [
          { name: "OpenScreen Project", extensions: [D] },
          { name: "JSON", extensions: ["json"] }
        ],
        properties: ["createDirectory", "showOverwriteConfirmation"]
      });
      return P.canceled || !P.filePath ? {
        success: !1,
        canceled: !0,
        message: "Save project canceled"
      } : (await p.writeFile(P.filePath, JSON.stringify(e, null, 2), "utf-8"), m = P.filePath, {
        success: !0,
        path: P.filePath,
        message: "Project saved successfully"
      });
    } catch (l) {
      return console.error("Failed to save project file:", l), {
        success: !1,
        message: "Failed to save project file",
        error: String(l)
      };
    }
  }), i.handle("load-project-file", async () => {
    try {
      const t = await I.showOpenDialog({
        title: "Open OpenScreen Project",
        defaultPath: S,
        filters: [
          { name: "OpenScreen Project", extensions: [D] },
          { name: "JSON", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      if (t.canceled || t.filePaths.length === 0)
        return { success: !1, canceled: !0, message: "Open project canceled" };
      const e = t.filePaths[0], n = await p.readFile(e, "utf-8"), s = JSON.parse(n);
      return m = e, s && typeof s == "object" && typeof s.videoPath == "string" && (w = s.videoPath), {
        success: !0,
        path: e,
        project: s
      };
    } catch (t) {
      return console.error("Failed to load project file:", t), {
        success: !1,
        message: "Failed to load project file",
        error: String(t)
      };
    }
  }), i.handle("load-current-project-file", async () => {
    try {
      if (!m)
        return { success: !1, message: "No active project" };
      const t = await p.readFile(m, "utf-8"), e = JSON.parse(t);
      return e && typeof e == "object" && typeof e.videoPath == "string" && (w = e.videoPath), {
        success: !0,
        path: m,
        project: e
      };
    } catch (t) {
      return console.error("Failed to load current project file:", t), {
        success: !1,
        message: "Failed to load current project file",
        error: String(t)
      };
    }
  }), i.handle("set-current-video-path", (t, e) => (w = e, m = null, { success: !0 })), i.handle("get-current-video-path", () => w ? { success: !0, path: w } : { success: !1 }), i.handle("clear-current-video-path", () => (w = null, { success: !0 })), i.handle("get-platform", () => process.platform), i.handle("get-shortcuts", async () => {
    try {
      const t = await p.readFile(U, "utf-8");
      return JSON.parse(t);
    } catch {
      return null;
    }
  }), i.handle("save-shortcuts", async (t, e) => {
    try {
      return await p.writeFile(U, JSON.stringify(e, null, 2), "utf-8"), { success: !0 };
    } catch (n) {
      return console.error("Failed to save shortcuts:", n), { success: !1, error: String(n) };
    }
  });
  ipcMain.handle("hud:setMicrophoneExpanded", (_, micEnabled) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;
    const bounds = win.getBounds();
    const compactWidth = 500;
    const expandedWidth = 800;
    const newWidth = micEnabled ? expandedWidth : compactWidth;
    win.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: newWidth,
      height: bounds.height
    });
    win.setMinimumSize(newWidth, 100);
    win.setMaximumSize(newWidth, 100);
  });
}
const fe = a.dirname(B(import.meta.url)), S = a.join(f.getPath("userData"), "recordings");
async function he() {
  try {
    await p.mkdir(S, { recursive: !0 }), console.log("RECORDINGS_DIR:", S), console.log("User Data Path:", f.getPath("userData"));
  } catch (o) {
    console.error("Failed to create recordings directory:", o);
  }
}
process.env.APP_ROOT = a.join(fe, "..");
const me = process.env.VITE_DEV_SERVER_URL, Oe = a.join(process.env.APP_ROOT, "dist-electron"), X = a.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = me ? a.join(process.env.APP_ROOT, "public") : X;
let u = null, E = null, j = null, Z = "";
const Q = Y("openscreen.png"), ye = Y("rec-button.png");
function L() {
  u = ne();
}
function ge(o) {
  return o.webContents.getURL().includes("windowType=editor");
}
function A(o) {
  let r = x.getFocusedWindow() ?? u;
  if (!r || r.isDestroyed() || !ge(r)) {
    if (K(), r = u, !r || r.isDestroyed()) return;
    r.webContents.once("did-finish-load", () => {
      !r || r.isDestroyed() || r.webContents.send(o);
    });
    return;
  }
  r.webContents.send(o);
}
function we() {
  const o = process.platform === "darwin", r = [];
  o && r.push({
    label: f.name,
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" }
    ]
  }), r.push(
    {
      label: "File",
      submenu: [
        {
          label: "Load Project…",
          accelerator: "CmdOrCtrl+O",
          click: () => A("menu-load-project")
        },
        {
          label: "Save Project…",
          accelerator: "CmdOrCtrl+S",
          click: () => A("menu-save-project")
        },
        {
          label: "Save Project As…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => A("menu-save-project-as")
        },
        ...o ? [] : [{ type: "separator" }, { role: "quit" }]
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: o ? [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" }
      ] : [
        { role: "minimize" },
        { role: "close" }
      ]
    }
  );
  const c = V.buildFromTemplate(r);
  V.setApplicationMenu(c);
}
function H() {
  j = new oe(Q);
}
function Y(o) {
  return re.createFromPath(a.join(process.env.VITE_PUBLIC || X, o)).resize({
    width: 24,
    height: 24,
    quality: "best"
  });
}
function q(o = !1) {
  if (!j) return;
  const r = o ? ye : Q, c = o ? `Recording: ${Z}` : "OpenScreen", g = o ? [
    {
      label: "Stop Recording",
      click: () => {
        u && !u.isDestroyed() && u.webContents.send("stop-recording-from-tray");
      }
    }
  ] : [
    {
      label: "Open",
      click: () => {
        u && !u.isDestroyed() ? u.isMinimized() && u.restore() : L();
      }
    },
    {
      label: "Quit",
      click: () => {
        f.quit();
      }
    }
  ];
  j.setImage(r), j.setToolTip(c), j.setContextMenu(V.buildFromTemplate(g));
}
function K() {
  u && (u.close(), u = null), u = ae();
}
function Se() {
  return E = ie(), E.on("closed", () => {
    E = null;
  }), E;
}
f.on("window-all-closed", () => {
});
f.on("activate", () => {
  x.getAllWindows().length === 0 && L();
});
f.whenReady().then(async () => {
  const { ipcMain: o } = await import("electron");
  o.on("hud-overlay-close", () => {
    f.quit();
  }), H(), q(), we(), await he(), pe(
    K,
    Se,
    () => u,
    () => E,
    (r, c) => {
      Z = c, j || H(), q(r), r || u && u.restore();
    }
  ), L();
});
export {
  Oe as MAIN_DIST,
  S as RECORDINGS_DIR,
  X as RENDERER_DIST,
  me as VITE_DEV_SERVER_URL
};
