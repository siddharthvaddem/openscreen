"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  hudOverlayHide: () => {
    electron.ipcRenderer.send("hud-overlay-hide");
  },
  hudOverlayClose: () => {
    electron.ipcRenderer.send("hud-overlay-close");
  },
  getAssetBasePath: async () => {
    return await electron.ipcRenderer.invoke("get-asset-base-path");
  },
  getSources: async (opts) => {
    return await electron.ipcRenderer.invoke("get-sources", opts);
  },
  switchToEditor: () => {
    return electron.ipcRenderer.invoke("switch-to-editor");
  },
  openSourceSelector: () => {
    return electron.ipcRenderer.invoke("open-source-selector");
  },
  selectSource: (source) => {
    return electron.ipcRenderer.invoke("select-source", source);
  },
  getSelectedSource: () => {
    return electron.ipcRenderer.invoke("get-selected-source");
  },
  storeRecordedVideo: (videoData, fileName) => {
    return electron.ipcRenderer.invoke("store-recorded-video", videoData, fileName);
  },
  getRecordedVideoPath: () => {
    return electron.ipcRenderer.invoke("get-recorded-video-path");
  },
  setRecordingState: (recording) => {
    return electron.ipcRenderer.invoke("set-recording-state", recording);
  },
  onStopRecordingFromTray: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("stop-recording-from-tray", listener);
    return () => electron.ipcRenderer.removeListener("stop-recording-from-tray", listener);
  },
  openExternalUrl: (url) => {
    return electron.ipcRenderer.invoke("open-external-url", url);
  },
  saveExportedVideo: (videoData, fileName) => {
    return electron.ipcRenderer.invoke("save-exported-video", videoData, fileName);
  },
  openVideoFilePicker: () => {
    return electron.ipcRenderer.invoke("open-video-file-picker");
  },
  setCurrentVideoPath: (path) => {
    return electron.ipcRenderer.invoke("set-current-video-path", path);
  },
  getCurrentVideoPath: () => {
    return electron.ipcRenderer.invoke("get-current-video-path");
  },
  clearCurrentVideoPath: () => {
    return electron.ipcRenderer.invoke("clear-current-video-path");
  },
  getPlatform: () => {
    return electron.ipcRenderer.invoke("get-platform");
  },
  revealInFolder: (filePath) => {
    return electron.ipcRenderer.invoke("reveal-in-folder", filePath);
  },
  setMicrophoneExpanded: (micEnabled) => {
    return electron.ipcRenderer.invoke("hud:setMicrophoneExpanded", micEnabled);
  }
});
"use strict";const e=require("electron");e.contextBridge.exposeInMainWorld("electronAPI",{hudOverlayHide:()=>{e.ipcRenderer.send("hud-overlay-hide")},hudOverlayClose:()=>{e.ipcRenderer.send("hud-overlay-close")},getAssetBasePath:async()=>await e.ipcRenderer.invoke("get-asset-base-path"),getSources:async r=>await e.ipcRenderer.invoke("get-sources",r),switchToEditor:()=>e.ipcRenderer.invoke("switch-to-editor"),openSourceSelector:()=>e.ipcRenderer.invoke("open-source-selector"),selectSource:r=>e.ipcRenderer.invoke("select-source",r),getSelectedSource:()=>e.ipcRenderer.invoke("get-selected-source"),storeRecordedVideo:(r,t)=>e.ipcRenderer.invoke("store-recorded-video",r,t),getRecordedVideoPath:()=>e.ipcRenderer.invoke("get-recorded-video-path"),setRecordingState:r=>e.ipcRenderer.invoke("set-recording-state",r),getCursorTelemetry:r=>e.ipcRenderer.invoke("get-cursor-telemetry",r),onStopRecordingFromTray:r=>{const t=()=>r();return e.ipcRenderer.on("stop-recording-from-tray",t),()=>e.ipcRenderer.removeListener("stop-recording-from-tray",t)},openExternalUrl:r=>e.ipcRenderer.invoke("open-external-url",r),saveExportedVideo:(r,t)=>e.ipcRenderer.invoke("save-exported-video",r,t),openVideoFilePicker:()=>e.ipcRenderer.invoke("open-video-file-picker"),setCurrentVideoPath:r=>e.ipcRenderer.invoke("set-current-video-path",r),getCurrentVideoPath:()=>e.ipcRenderer.invoke("get-current-video-path"),clearCurrentVideoPath:()=>e.ipcRenderer.invoke("clear-current-video-path"),saveProjectFile:(r,t,n)=>e.ipcRenderer.invoke("save-project-file",r,t,n),loadProjectFile:()=>e.ipcRenderer.invoke("load-project-file"),loadCurrentProjectFile:()=>e.ipcRenderer.invoke("load-current-project-file"),onMenuLoadProject:r=>{const t=()=>r();return e.ipcRenderer.on("menu-load-project",t),()=>e.ipcRenderer.removeListener("menu-load-project",t)},onMenuSaveProject:r=>{const t=()=>r();return e.ipcRenderer.on("menu-save-project",t),()=>e.ipcRenderer.removeListener("menu-save-project",t)},onMenuSaveProjectAs:r=>{const t=()=>r();return e.ipcRenderer.on("menu-save-project-as",t),()=>e.ipcRenderer.removeListener("menu-save-project-as",t)},getPlatform:()=>e.ipcRenderer.invoke("get-platform"),getShortcuts:()=>e.ipcRenderer.invoke("get-shortcuts"),saveShortcuts:r=>e.ipcRenderer.invoke("save-shortcuts",r)});
