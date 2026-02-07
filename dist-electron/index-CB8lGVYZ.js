import Z from "events";
import j from "path";
import Q from "fs";
import z from "os";
function J(i, p) {
  for (var f = 0; f < p.length; f++) {
    const u = p[f];
    if (typeof u != "string" && !Array.isArray(u)) {
      for (const s in u)
        if (s !== "default" && !(s in i)) {
          const E = Object.getOwnPropertyDescriptor(u, s);
          E && Object.defineProperty(i, s, E.get ? E : {
            enumerable: !0,
            get: () => u[s]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(i, Symbol.toStringTag, { value: "Module" }));
}
function X(i) {
  return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, "default") ? i.default : i;
}
var D = {};
function q(i) {
  throw new Error('Could not dynamically require "' + i + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var w = { exports: {} }, b, P;
function e0() {
  if (P) return b;
  P = 1;
  var i = Q, p = j, f = z, u = typeof __webpack_require__ == "function" ? __non_webpack_require__ : q, s = process.config && process.config.variables || {}, E = !!process.env.PREBUILDS_ONLY, v = process.versions.modules, n = $() ? "electron" : I() ? "node-webkit" : "node", o = process.env.npm_config_arch || f.arch(), l = process.env.npm_config_platform || f.platform(), d = process.env.LIBC || (K(l) ? "musl" : "glibc"), _ = process.env.ARM_VERSION || (o === "arm64" ? "8" : s.arm_version) || "", k = (process.versions.uv || "").split(".")[0];
  b = x;
  function x(e) {
    return u(x.resolve(e));
  }
  x.resolve = x.path = function(e) {
    e = p.resolve(e || ".");
    try {
      var t = u(p.join(e, "package.json")).name.toUpperCase().replace(/-/g, "_");
      process.env[t + "_PREBUILD"] && (e = process.env[t + "_PREBUILD"]);
    } catch {
    }
    if (!E) {
      var r = y(p.join(e, "build/Release"), T);
      if (r) return r;
      var c = y(p.join(e, "build/Debug"), T);
      if (c) return c;
    }
    var m = B(e);
    if (m) return m;
    var a = B(p.dirname(process.execPath));
    if (a) return a;
    var H = [
      "platform=" + l,
      "arch=" + o,
      "runtime=" + n,
      "abi=" + v,
      "uv=" + k,
      _ ? "armv=" + _ : "",
      "libc=" + d,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ == "function" ? "webpack=true" : ""
      // eslint-disable-line
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + H + `
    loaded from: ` + e + `
`);
    function B(N) {
      var Y = h(p.join(N, "prebuilds")).map(O), V = Y.filter(R(l, o)).sort(A)[0];
      if (V) {
        var M = p.join(N, "prebuilds", V.name), G = h(M).map(F), W = G.filter(U(n, v)), C = W.sort(L(n))[0];
        if (C) return p.join(M, C.file);
      }
    }
  };
  function h(e) {
    try {
      return i.readdirSync(e);
    } catch {
      return [];
    }
  }
  function y(e, t) {
    var r = h(e).filter(t);
    return r[0] && p.join(e, r[0]);
  }
  function T(e) {
    return /\.node$/.test(e);
  }
  function O(e) {
    var t = e.split("-");
    if (t.length === 2) {
      var r = t[0], c = t[1].split("+");
      if (r && c.length && c.every(Boolean))
        return { name: e, platform: r, architectures: c };
    }
  }
  function R(e, t) {
    return function(r) {
      return r == null || r.platform !== e ? !1 : r.architectures.includes(t);
    };
  }
  function A(e, t) {
    return e.architectures.length - t.architectures.length;
  }
  function F(e) {
    var t = e.split("."), r = t.pop(), c = { file: e, specificity: 0 };
    if (r === "node") {
      for (var m = 0; m < t.length; m++) {
        var a = t[m];
        if (a === "node" || a === "electron" || a === "node-webkit")
          c.runtime = a;
        else if (a === "napi")
          c.napi = !0;
        else if (a.slice(0, 3) === "abi")
          c.abi = a.slice(3);
        else if (a.slice(0, 2) === "uv")
          c.uv = a.slice(2);
        else if (a.slice(0, 4) === "armv")
          c.armv = a.slice(4);
        else if (a === "glibc" || a === "musl")
          c.libc = a;
        else
          continue;
        c.specificity++;
      }
      return c;
    }
  }
  function U(e, t) {
    return function(r) {
      return !(r == null || r.runtime && r.runtime !== e && !g(r) || r.abi && r.abi !== t && !r.napi || r.uv && r.uv !== k || r.armv && r.armv !== _ || r.libc && r.libc !== d);
    };
  }
  function g(e) {
    return e.runtime === "node" && e.napi;
  }
  function L(e) {
    return function(t, r) {
      return t.runtime !== r.runtime ? t.runtime === e ? -1 : 1 : t.abi !== r.abi ? t.abi ? -1 : 1 : t.specificity !== r.specificity ? t.specificity > r.specificity ? -1 : 1 : 0;
    };
  }
  function I() {
    return !!(process.versions && process.versions.nw);
  }
  function $() {
    return process.versions && process.versions.electron || process.env.ELECTRON_RUN_AS_NODE ? !0 : typeof window < "u" && window.process && window.process.type === "renderer";
  }
  function K(e) {
    return e === "linux" && i.existsSync("/etc/alpine-release");
  }
  return x.parseTags = F, x.matchTags = U, x.compareTags = L, x.parseTuple = O, x.matchTuple = R, x.compareTuples = A, b;
}
const S = typeof __webpack_require__ == "function" ? __non_webpack_require__ : q;
typeof S.addon == "function" ? w.exports = S.addon.bind(S) : w.exports = e0();
var r0 = w.exports;
(function(i) {
  Object.defineProperty(i, "__esModule", { value: !0 }), i.uIOhook = i.UiohookKey = i.WheelDirection = i.EventType = void 0;
  const p = Z, u = r0((0, j.join)(__dirname, ".."));
  var s;
  (function(n) {
    n[n.Tap = 0] = "Tap", n[n.Down = 1] = "Down", n[n.Up = 2] = "Up";
  })(s || (s = {}));
  var E;
  (function(n) {
    n[n.EVENT_KEY_PRESSED = 4] = "EVENT_KEY_PRESSED", n[n.EVENT_KEY_RELEASED = 5] = "EVENT_KEY_RELEASED", n[n.EVENT_MOUSE_CLICKED = 6] = "EVENT_MOUSE_CLICKED", n[n.EVENT_MOUSE_PRESSED = 7] = "EVENT_MOUSE_PRESSED", n[n.EVENT_MOUSE_RELEASED = 8] = "EVENT_MOUSE_RELEASED", n[n.EVENT_MOUSE_MOVED = 9] = "EVENT_MOUSE_MOVED", n[n.EVENT_MOUSE_WHEEL = 11] = "EVENT_MOUSE_WHEEL";
  })(E = i.EventType || (i.EventType = {})), function(n) {
    n[n.VERTICAL = 3] = "VERTICAL", n[n.HORIZONTAL = 4] = "HORIZONTAL";
  }(i.WheelDirection || (i.WheelDirection = {})), i.UiohookKey = {
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
    NumpadEnter: 3612,
    NumpadEnd: 61007,
    NumpadArrowDown: 61008,
    NumpadPageDown: 61009,
    NumpadArrowLeft: 61003,
    NumpadArrowRight: 61005,
    NumpadHome: 60999,
    NumpadArrowUp: 61e3,
    NumpadPageUp: 61001,
    NumpadInsert: 61010,
    NumpadDelete: 61011,
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
  class v extends p.EventEmitter {
    handler(o) {
      switch (this.emit("input", o), o.type) {
        case E.EVENT_KEY_PRESSED:
          this.emit("keydown", o);
          break;
        case E.EVENT_KEY_RELEASED:
          this.emit("keyup", o);
          break;
        case E.EVENT_MOUSE_CLICKED:
          this.emit("click", o);
          break;
        case E.EVENT_MOUSE_MOVED:
          this.emit("mousemove", o);
          break;
        case E.EVENT_MOUSE_PRESSED:
          this.emit("mousedown", o);
          break;
        case E.EVENT_MOUSE_RELEASED:
          this.emit("mouseup", o);
          break;
        case E.EVENT_MOUSE_WHEEL:
          this.emit("wheel", o);
          break;
      }
    }
    start() {
      u.start(this.handler.bind(this));
    }
    stop() {
      u.stop();
    }
    keyTap(o, l = []) {
      if (!l.length) {
        u.keyTap(o, s.Tap);
        return;
      }
      for (const _ of l)
        u.keyTap(_, s.Down);
      u.keyTap(o, s.Tap);
      let d = l.length;
      for (; d--; )
        u.keyTap(l[d], s.Up);
    }
    keyToggle(o, l) {
      u.keyTap(o, l === "down" ? s.Down : s.Up);
    }
  }
  i.uIOhook = new v();
})(D);
const n0 = /* @__PURE__ */ X(D), u0 = /* @__PURE__ */ J({
  __proto__: null,
  default: n0
}, [D]);
export {
  u0 as i
};
