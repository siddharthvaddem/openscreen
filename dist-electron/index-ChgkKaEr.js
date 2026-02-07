import { g as getDefaultExportFromCjs } from "./main-BkgJTXDU.js";
import require$$0 from "events";
import path__default from "path";
import fs__default from "fs";
import os__default from "os";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var dist = {};
function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var nodeGypBuild$1 = { exports: {} };
var nodeGypBuild;
var hasRequiredNodeGypBuild;
function requireNodeGypBuild() {
  if (hasRequiredNodeGypBuild) return nodeGypBuild;
  hasRequiredNodeGypBuild = 1;
  var fs = fs__default;
  var path = path__default;
  var os = os__default;
  var runtimeRequire2 = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
  var vars = process.config && process.config.variables || {};
  var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
  var abi = process.versions.modules;
  var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
  var arch = process.env.npm_config_arch || os.arch();
  var platform = process.env.npm_config_platform || os.platform();
  var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
  var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
  var uv = (process.versions.uv || "").split(".")[0];
  nodeGypBuild = load;
  function load(dir) {
    return runtimeRequire2(load.resolve(dir));
  }
  load.resolve = load.path = function(dir) {
    dir = path.resolve(dir || ".");
    try {
      var name = runtimeRequire2(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
      if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
    } catch (err) {
    }
    if (!prebuildsOnly) {
      var release = getFirst(path.join(dir, "build/Release"), matchBuild);
      if (release) return release;
      var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
      if (debug) return debug;
    }
    var prebuild = resolve(dir);
    if (prebuild) return prebuild;
    var nearby = resolve(path.dirname(process.execPath));
    if (nearby) return nearby;
    var target = [
      "platform=" + platform,
      "arch=" + arch,
      "runtime=" + runtime,
      "abi=" + abi,
      "uv=" + uv,
      armv ? "armv=" + armv : "",
      "libc=" + libc,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ === "function" ? "webpack=true" : ""
      // eslint-disable-line
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
    function resolve(dir2) {
      var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
      var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
      if (!tuple) return;
      var prebuilds = path.join(dir2, "prebuilds", tuple.name);
      var parsed = readdirSync(prebuilds).map(parseTags);
      var candidates = parsed.filter(matchTags(runtime, abi));
      var winner = candidates.sort(compareTags(runtime))[0];
      if (winner) return path.join(prebuilds, winner.file);
    }
  };
  function readdirSync(dir) {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      return [];
    }
  }
  function getFirst(dir, filter) {
    var files = readdirSync(dir).filter(filter);
    return files[0] && path.join(dir, files[0]);
  }
  function matchBuild(name) {
    return /\.node$/.test(name);
  }
  function parseTuple(name) {
    var arr = name.split("-");
    if (arr.length !== 2) return;
    var platform2 = arr[0];
    var architectures = arr[1].split("+");
    if (!platform2) return;
    if (!architectures.length) return;
    if (!architectures.every(Boolean)) return;
    return { name, platform: platform2, architectures };
  }
  function matchTuple(platform2, arch2) {
    return function(tuple) {
      if (tuple == null) return false;
      if (tuple.platform !== platform2) return false;
      return tuple.architectures.includes(arch2);
    };
  }
  function compareTuples(a, b) {
    return a.architectures.length - b.architectures.length;
  }
  function parseTags(file) {
    var arr = file.split(".");
    var extension = arr.pop();
    var tags = { file, specificity: 0 };
    if (extension !== "node") return;
    for (var i = 0; i < arr.length; i++) {
      var tag = arr[i];
      if (tag === "node" || tag === "electron" || tag === "node-webkit") {
        tags.runtime = tag;
      } else if (tag === "napi") {
        tags.napi = true;
      } else if (tag.slice(0, 3) === "abi") {
        tags.abi = tag.slice(3);
      } else if (tag.slice(0, 2) === "uv") {
        tags.uv = tag.slice(2);
      } else if (tag.slice(0, 4) === "armv") {
        tags.armv = tag.slice(4);
      } else if (tag === "glibc" || tag === "musl") {
        tags.libc = tag;
      } else {
        continue;
      }
      tags.specificity++;
    }
    return tags;
  }
  function matchTags(runtime2, abi2) {
    return function(tags) {
      if (tags == null) return false;
      if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags)) return false;
      if (tags.abi && tags.abi !== abi2 && !tags.napi) return false;
      if (tags.uv && tags.uv !== uv) return false;
      if (tags.armv && tags.armv !== armv) return false;
      if (tags.libc && tags.libc !== libc) return false;
      return true;
    };
  }
  function runtimeAgnostic(tags) {
    return tags.runtime === "node" && tags.napi;
  }
  function compareTags(runtime2) {
    return function(a, b) {
      if (a.runtime !== b.runtime) {
        return a.runtime === runtime2 ? -1 : 1;
      } else if (a.abi !== b.abi) {
        return a.abi ? -1 : 1;
      } else if (a.specificity !== b.specificity) {
        return a.specificity > b.specificity ? -1 : 1;
      } else {
        return 0;
      }
    };
  }
  function isNwjs() {
    return !!(process.versions && process.versions.nw);
  }
  function isElectron() {
    if (process.versions && process.versions.electron) return true;
    if (process.env.ELECTRON_RUN_AS_NODE) return true;
    return typeof window !== "undefined" && window.process && window.process.type === "renderer";
  }
  function isAlpine(platform2) {
    return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
  }
  load.parseTags = parseTags;
  load.matchTags = matchTags;
  load.compareTags = compareTags;
  load.parseTuple = parseTuple;
  load.matchTuple = matchTuple;
  load.compareTuples = compareTuples;
  return nodeGypBuild;
}
const runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
if (typeof runtimeRequire.addon === "function") {
  nodeGypBuild$1.exports = runtimeRequire.addon.bind(runtimeRequire);
} else {
  nodeGypBuild$1.exports = requireNodeGypBuild();
}
var nodeGypBuildExports = nodeGypBuild$1.exports;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.uIOhook = exports.UiohookKey = exports.WheelDirection = exports.EventType = void 0;
  const events_1 = require$$0;
  const path_1 = path__default;
  const lib = nodeGypBuildExports((0, path_1.join)(__dirname, ".."));
  var KeyToggle;
  (function(KeyToggle2) {
    KeyToggle2[KeyToggle2["Tap"] = 0] = "Tap";
    KeyToggle2[KeyToggle2["Down"] = 1] = "Down";
    KeyToggle2[KeyToggle2["Up"] = 2] = "Up";
  })(KeyToggle || (KeyToggle = {}));
  var EventType;
  (function(EventType2) {
    EventType2[EventType2["EVENT_KEY_PRESSED"] = 4] = "EVENT_KEY_PRESSED";
    EventType2[EventType2["EVENT_KEY_RELEASED"] = 5] = "EVENT_KEY_RELEASED";
    EventType2[EventType2["EVENT_MOUSE_CLICKED"] = 6] = "EVENT_MOUSE_CLICKED";
    EventType2[EventType2["EVENT_MOUSE_PRESSED"] = 7] = "EVENT_MOUSE_PRESSED";
    EventType2[EventType2["EVENT_MOUSE_RELEASED"] = 8] = "EVENT_MOUSE_RELEASED";
    EventType2[EventType2["EVENT_MOUSE_MOVED"] = 9] = "EVENT_MOUSE_MOVED";
    EventType2[EventType2["EVENT_MOUSE_WHEEL"] = 11] = "EVENT_MOUSE_WHEEL";
  })(EventType = exports.EventType || (exports.EventType = {}));
  (function(WheelDirection) {
    WheelDirection[WheelDirection["VERTICAL"] = 3] = "VERTICAL";
    WheelDirection[WheelDirection["HORIZONTAL"] = 4] = "HORIZONTAL";
  })(exports.WheelDirection || (exports.WheelDirection = {}));
  exports.UiohookKey = {
    Backspace: 14,
    Tab: 15,
    Enter: 28,
    CapsLock: 58,
    Escape: 1,
    Space: 57,
    PageUp: 3657,
    PageDown: 3665,
    End: 3663,
    Home: 3655,
    ArrowLeft: 57419,
    ArrowUp: 57416,
    ArrowRight: 57421,
    ArrowDown: 57424,
    Insert: 3666,
    Delete: 3667,
    0: 11,
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 7,
    7: 8,
    8: 9,
    9: 10,
    A: 30,
    B: 48,
    C: 46,
    D: 32,
    E: 18,
    F: 33,
    G: 34,
    H: 35,
    I: 23,
    J: 36,
    K: 37,
    L: 38,
    M: 50,
    N: 49,
    O: 24,
    P: 25,
    Q: 16,
    R: 19,
    S: 31,
    T: 20,
    U: 22,
    V: 47,
    W: 17,
    X: 45,
    Y: 21,
    Z: 44,
    Numpad0: 82,
    Numpad1: 79,
    Numpad2: 80,
    Numpad3: 81,
    Numpad4: 75,
    Numpad5: 76,
    Numpad6: 77,
    Numpad7: 71,
    Numpad8: 72,
    Numpad9: 73,
    NumpadMultiply: 55,
    NumpadAdd: 78,
    NumpadSubtract: 74,
    NumpadDecimal: 83,
    NumpadDivide: 3637,
    NumpadEnter: 3584 | 28,
    NumpadEnd: 60928 | 79,
    NumpadArrowDown: 60928 | 80,
    NumpadPageDown: 60928 | 81,
    NumpadArrowLeft: 60928 | 75,
    NumpadArrowRight: 60928 | 77,
    NumpadHome: 60928 | 71,
    NumpadArrowUp: 60928 | 72,
    NumpadPageUp: 60928 | 73,
    NumpadInsert: 60928 | 82,
    NumpadDelete: 60928 | 83,
    F1: 59,
    F2: 60,
    F3: 61,
    F4: 62,
    F5: 63,
    F6: 64,
    F7: 65,
    F8: 66,
    F9: 67,
    F10: 68,
    F11: 87,
    F12: 88,
    F13: 91,
    F14: 92,
    F15: 93,
    F16: 99,
    F17: 100,
    F18: 101,
    F19: 102,
    F20: 103,
    F21: 104,
    F22: 105,
    F23: 106,
    F24: 107,
    Semicolon: 39,
    Equal: 13,
    Comma: 51,
    Minus: 12,
    Period: 52,
    Slash: 53,
    Backquote: 41,
    BracketLeft: 26,
    Backslash: 43,
    BracketRight: 27,
    Quote: 40,
    Ctrl: 29,
    CtrlRight: 3613,
    Alt: 56,
    AltRight: 3640,
    Shift: 42,
    ShiftRight: 54,
    Meta: 3675,
    MetaRight: 3676,
    NumLock: 69,
    ScrollLock: 70,
    PrintScreen: 3639
  };
  class UiohookNapi extends events_1.EventEmitter {
    handler(e) {
      this.emit("input", e);
      switch (e.type) {
        case EventType.EVENT_KEY_PRESSED:
          this.emit("keydown", e);
          break;
        case EventType.EVENT_KEY_RELEASED:
          this.emit("keyup", e);
          break;
        case EventType.EVENT_MOUSE_CLICKED:
          this.emit("click", e);
          break;
        case EventType.EVENT_MOUSE_MOVED:
          this.emit("mousemove", e);
          break;
        case EventType.EVENT_MOUSE_PRESSED:
          this.emit("mousedown", e);
          break;
        case EventType.EVENT_MOUSE_RELEASED:
          this.emit("mouseup", e);
          break;
        case EventType.EVENT_MOUSE_WHEEL:
          this.emit("wheel", e);
          break;
      }
    }
    start() {
      lib.start(this.handler.bind(this));
    }
    stop() {
      lib.stop();
    }
    keyTap(key, modifiers = []) {
      if (!modifiers.length) {
        lib.keyTap(key, KeyToggle.Tap);
        return;
      }
      for (const modKey of modifiers) {
        lib.keyTap(modKey, KeyToggle.Down);
      }
      lib.keyTap(key, KeyToggle.Tap);
      let i = modifiers.length;
      while (i--) {
        lib.keyTap(modifiers[i], KeyToggle.Up);
      }
    }
    keyToggle(key, toggle) {
      lib.keyTap(key, toggle === "down" ? KeyToggle.Down : KeyToggle.Up);
    }
  }
  exports.uIOhook = new UiohookNapi();
})(dist);
const index = /* @__PURE__ */ getDefaultExportFromCjs(dist);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [dist]);
export {
  index$1 as i
};
