// Win32 SetWindowPos wrapper for forcing a BrowserWindow above the Windows 11
// taskbar.
//
// Why this exists:
//   Electron's `BrowserWindow.setAlwaysOnTop(true, "screen-saver")` maps to
//   `SetWindowPos(HWND_TOPMOST)` internally, but Electron short-circuits the
//   call when the alwaysOnTop flag is already true.  That means once we set
//   it once, repeat calls are no-ops and the Win11 shell tray (Shell_TrayWnd)
//   — which also sits at HWND_TOPMOST and re-asserts itself continuously —
//   wins the activation race and paints over us.  Toggling false→true forces
//   a real call, but Electron's path still goes through window-state tracking
//   that can lag a frame or two behind the taskbar.
//
//   Going direct to Win32 lets us:
//     1) re-promote via SetWindowPos every tick with NO state-tracking lag, and
//     2) pass SWP_NOSENDCHANGING + SWP_NOACTIVATE, which suppress the focus/
//        activation side-effects that normally invite the shell to win.
//
// We use koffi (runtime FFI, no native compilation) so we don't need a
// node-gyp build step or electron-rebuild dance.
import type { BrowserWindow } from "electron";
import koffi from "koffi";

// HWND_TOPMOST = -1 cast to a window handle.  When SetWindowPos's
// hWndInsertAfter argument is HWND_TOPMOST the target window is placed above
// all non-topmost windows and is added to the topmost group.
const HWND_TOPMOST_VALUE = -1;

// SetWindowPos flag bits (winuser.h).
const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOACTIVATE = 0x0010;
// SWP_NOSENDCHANGING tells the OS not to send WM_WINDOWPOSCHANGING to the
// window — which is what other topmost windows (like the shell tray) listen
// for to re-assert their own z-order.  Skipping it makes our promotion stick.
const SWP_NOSENDCHANGING = 0x0400;
const PROMOTE_FLAGS = SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_NOSENDCHANGING;

interface User32Bindings {
	SetWindowPos: (
		hWnd: number | bigint,
		hWndInsertAfter: number | bigint,
		x: number,
		y: number,
		cx: number,
		cy: number,
		uFlags: number,
	) => number;
	GetLastError: () => number;
}

let cachedBindings: User32Bindings | null = null;
let loadAttempted = false;

function loadUser32(): User32Bindings | null {
	if (loadAttempted) {
		return cachedBindings;
	}
	loadAttempted = true;

	if (process.platform !== "win32") {
		return null;
	}

	try {
		const user32 = koffi.load("user32.dll");
		// HWND and HWND_INSERT_AFTER are pointer-sized; koffi's "long" is 64-bit
		// on 64-bit Windows so we can pass HWND_TOPMOST as a signed 64-bit value.
		const bindings: User32Bindings = {
			SetWindowPos: user32.func("__stdcall", "SetWindowPos", "int", [
				"long",
				"long",
				"int",
				"int",
				"int",
				"int",
				"uint",
			]) as User32Bindings["SetWindowPos"],
			GetLastError: koffi
				.load("kernel32.dll")
				.func("__stdcall", "GetLastError", "uint", []) as User32Bindings["GetLastError"],
		};
		cachedBindings = bindings;
		return bindings;
	} catch (err) {
		// FFI load failed (missing dll on weird Windows variant, koffi binary
		// mismatch, etc.) — caller will fall back to setAlwaysOnTop polling.
		console.warn("[win32-topmost] Failed to load user32.dll via koffi:", err);
		return null;
	}
}

// Read the HWND from BrowserWindow.getNativeWindowHandle() (returns a Buffer).
// On 64-bit Windows the buffer is 8 bytes (HWND is pointer-sized).
// On 32-bit Windows the buffer is 4 bytes (we still cast to bigint).
function readHwnd(buf: Buffer): bigint {
	if (buf.length >= 8) {
		return buf.readBigUInt64LE(0);
	}
	if (buf.length >= 4) {
		return BigInt(buf.readUInt32LE(0));
	}
	return BigInt(0);
}

/**
 * Force the given BrowserWindow above every other topmost window (including
 * the Win11 taskbar).  Safe to call every animation frame.
 *
 * Returns true if the SetWindowPos call succeeded, false on any failure.
 * Falls back silently to no-op on non-Windows platforms and when the FFI
 * bindings can't be loaded — callers should keep their existing
 * setAlwaysOnTop polling as a backup path.
 */
export function promoteAboveTaskbar(win: BrowserWindow): boolean {
	if (process.platform !== "win32") return false;
	if (!win || win.isDestroyed()) return false;

	const user32 = loadUser32();
	if (!user32) return false;

	let hwnd: bigint;
	try {
		const handleBuf = win.getNativeWindowHandle();
		hwnd = readHwnd(handleBuf);
	} catch (err) {
		console.warn("[win32-topmost] getNativeWindowHandle threw:", err);
		return false;
	}

	if (hwnd === BigInt(0)) return false;

	try {
		const result = user32.SetWindowPos(hwnd, BigInt(HWND_TOPMOST_VALUE), 0, 0, 0, 0, PROMOTE_FLAGS);
		if (result === 0) {
			// SetWindowPos returns 0 on failure.  Log once with the error code
			// so the user has something to inspect; further failures stay quiet.
			const err = user32.GetLastError();
			if (!suppressErrorLog) {
				console.warn(`[win32-topmost] SetWindowPos failed, GetLastError=${err}`);
				suppressErrorLog = true;
			}
			return false;
		}
		return true;
	} catch (err) {
		if (!suppressErrorLog) {
			console.warn("[win32-topmost] SetWindowPos threw:", err);
			suppressErrorLog = true;
		}
		return false;
	}
}

let suppressErrorLog = false;
