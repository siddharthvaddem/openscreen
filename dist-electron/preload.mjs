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
    const listener = (event) => callback(event);
    electron.ipcRenderer.on("stop-recording-from-tray", listener);
    return () => electron.ipcRenderer.removeListener("stop-recording-from-tray", listener);
  },
  onStartRecordingFromShortcut: (callback) => {
    const listener = (event, ...args) => callback(event, ...args);
    electron.ipcRenderer.on("start-recording-from-shortcut", listener);
    return () => electron.ipcRenderer.removeListener("start-recording-from-shortcut", listener);
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
  // ============================================
  // PRESET API
  // ============================================
  presets: {
    get: () => {
      return electron.ipcRenderer.invoke("presets:get");
    },
    save: (preset) => {
      return electron.ipcRenderer.invoke("presets:save", preset);
    },
    update: (id, updates) => {
      return electron.ipcRenderer.invoke("presets:update", id, updates);
    },
    delete: (id) => {
      return electron.ipcRenderer.invoke("presets:delete", id);
    },
    duplicate: (id) => {
      return electron.ipcRenderer.invoke("presets:duplicate", id);
    },
    setDefault: (id) => {
      return electron.ipcRenderer.invoke("presets:setDefault", id);
    }
  },
  // ============================================
  // TRANSCRIPTION API
  // ============================================
  transcribeVideo: (request) => {
    return electron.ipcRenderer.invoke("transcribe-video", request);
  },
  onTranscriptionProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("transcription-progress", listener);
    return () => electron.ipcRenderer.removeListener("transcription-progress", listener);
  },
  // ============================================
  // SECURE STORAGE API
  // ============================================
  secureStorage: {
    isAvailable: () => {
      return electron.ipcRenderer.invoke("secure-storage:is-available");
    },
    setApiKey: (service, apiKey) => {
      return electron.ipcRenderer.invoke("secure-storage:set-api-key", service, apiKey);
    },
    getApiKey: (service) => {
      return electron.ipcRenderer.invoke("secure-storage:get-api-key", service);
    },
    deleteApiKey: (service) => {
      return electron.ipcRenderer.invoke("secure-storage:delete-api-key", service);
    },
    hasApiKey: (service) => {
      return electron.ipcRenderer.invoke("secure-storage:has-api-key", service);
    }
  },
  // ============================================
  // AUTO ZOOM API
  // ============================================
  autoZoom: {
    startDetection: (recordingId, screenBounds) => {
      return electron.ipcRenderer.invoke("auto-zoom:start-detection", recordingId, screenBounds);
    },
    stopDetection: () => {
      return electron.ipcRenderer.invoke("auto-zoom:stop-detection");
    },
    saveEvents: (eventData, fileName) => {
      return electron.ipcRenderer.invoke("auto-zoom:save-events", eventData, fileName);
    },
    getEvents: (videoPath) => {
      return electron.ipcRenderer.invoke("auto-zoom:get-events", videoPath);
    },
    isRunning: () => {
      return electron.ipcRenderer.invoke("auto-zoom:is-running");
    }
  },
  // ============================================
  // CAMERA PERMISSION API
  // ============================================
  camera: {
    getPermissionStatus: () => {
      return electron.ipcRenderer.invoke("camera:get-permission-status");
    },
    requestAccess: () => {
      return electron.ipcRenderer.invoke("camera:request-access");
    }
  },
  // ============================================
  // WEBCAM FILE DISCOVERY API
  // ============================================
  webcam: {
    getWebcamVideoPath: (mainVideoPath) => {
      return electron.ipcRenderer.invoke("webcam:get-webcam-video-path", mainVideoPath);
    }
  },
  // ============================================
  // KEYSTROKE EDITOR API
  // ============================================
  keystrokeEditor: {
    checkAvailability: () => {
      return electron.ipcRenderer.invoke("keystroke-editor:check-availability");
    },
    startCapture: (recordingId) => {
      return electron.ipcRenderer.invoke("keystroke-editor:start-capture", recordingId);
    },
    stopCapture: () => {
      return electron.ipcRenderer.invoke("keystroke-editor:stop-capture");
    },
    isCapturing: () => {
      return electron.ipcRenderer.invoke("keystroke-editor:is-capturing");
    },
    saveEvents: (eventData, fileName) => {
      return electron.ipcRenderer.invoke("keystroke-editor:save-events", eventData, fileName);
    },
    loadEvents: (videoPath) => {
      return electron.ipcRenderer.invoke("keystroke-editor:load-events", videoPath);
    },
    getSettings: () => {
      return electron.ipcRenderer.invoke("keystroke-editor:get-settings");
    },
    setSettings: (settings) => {
      return electron.ipcRenderer.invoke("keystroke-editor:set-settings", settings);
    }
  }
});
