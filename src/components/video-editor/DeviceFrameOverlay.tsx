import type { DeviceFrameType } from "@/lib/deviceFrames";
import { DEVICE_FRAME_SPECS } from "@/lib/deviceFrames";

interface Props {
  frameType: DeviceFrameType;
  // The actual pixel dimensions of the preview stage (for scaling calculations)
  width: number;
  height: number;
}

export function DeviceFrameOverlay({ frameType, width: w, height: h }: Props) {
  if (frameType === "none" || w === 0 || h === 0) return null;

  if (frameType === "browser") return <BrowserFrameSVG w={w} h={h} />;
  if (frameType === "iphone") return <IPhoneFrameSVG w={w} h={h} />;
  if (frameType === "android") return <AndroidFrameSVG w={w} h={h} />;
  return null;
}

function BrowserFrameSVG({ w, h }: { w: number; h: number }) {
  const spec = DEVICE_FRAME_SPECS.browser;
  const barH = spec.screenRect.y * h;
  const dotR = Math.max(4, barH * 0.22);
  const dotCY = barH * 0.5;
  const borderW = spec.screenRect.x * w;
  const dotStartX = borderW + dotR * 1.4;
  const urlW = w * 0.38;
  const urlH = barH * 0.52;
  const urlX = (w - urlW) / 2;
  const urlY = (barH - urlH) / 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shell with screen cutout */}
      <path
        fillRule="evenodd"
        fill="#1a1a2e"
        d={`M6,0 H${w - 6} Q${w},0 ${w},6 V${h - 6} Q${w},${h} ${w - 6},${h} H6 Q0,${h} 0,${h - 6} V6 Q0,0 6,0 Z
            M${spec.screenRect.x * w},${spec.screenRect.y * h}
            H${(spec.screenRect.x + spec.screenRect.w) * w}
            V${(spec.screenRect.y + spec.screenRect.h) * h}
            H${spec.screenRect.x * w} Z`}
      />
      {/* Divider */}
      <rect x={0} y={barH - 1} width={w} height={1} fill="rgba(255,255,255,0.06)" />
      {/* Traffic lights */}
      {(["#ff5f57", "#febc2e", "#28c840"] as const).map((color, i) => (
        <circle key={color} cx={dotStartX + i * dotR * 2.8} cy={dotCY} r={dotR} fill={color} />
      ))}
      {/* URL bar */}
      <rect x={urlX} y={urlY} width={urlW} height={urlH} rx={urlH / 2} fill="#2d2d44" />
    </svg>
  );
}

function IPhoneFrameSVG({ w, h }: { w: number; h: number }) {
  const spec = DEVICE_FRAME_SPECS.iphone;
  const shellR = w * 0.11;
  const screenR = Math.min(w, h) * spec.screenCornerRadiusFrac;
  const sx = spec.screenRect.x * w;
  const sy = spec.screenRect.y * h;
  const sw = spec.screenRect.w * w;
  const sh = spec.screenRect.h * h;
  const diW = w * 0.275;
  const diH = h * 0.038;
  const diX = (w - diW) / 2;
  const diY = h * 0.026;
  const hiW = w * 0.28;
  const hiH = Math.max(3, h * 0.0045);
  const btnW = Math.max(3, w * 0.022);

  // Shell path with screen hole (evenodd)
  const shellPath = rr(0, 0, w, h, shellR);
  const screenPath = rr(sx, sy, sw, sh, screenR);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shell with screen cutout */}
      <path fillRule="evenodd" fill="#1c1c1e" d={`${shellPath} ${screenPath}`} />
      {/* Dynamic Island */}
      <rect x={diX} y={diY} width={diW} height={diH} rx={diH / 2} fill="#000" />
      <circle cx={diX + diW * 0.78} cy={diY + diH / 2} r={diH * 0.29} fill="#1a1a2a" />
      {/* Home indicator */}
      <rect x={(w - hiW) / 2} y={h * 0.966} width={hiW} height={hiH} rx={hiH / 2} fill="rgba(255,255,255,0.42)" />
      {/* Side buttons */}
      <rect x={-btnW * 0.35} y={h * 0.22} width={btnW} height={h * 0.068} rx={btnW / 2} fill="#2c2c2e" />
      <rect x={-btnW * 0.35} y={h * 0.305} width={btnW} height={h * 0.068} rx={btnW / 2} fill="#2c2c2e" />
      <rect x={w - btnW * 0.65} y={h * 0.263} width={btnW} height={h * 0.09} rx={btnW / 2} fill="#2c2c2e" />
    </svg>
  );
}

function AndroidFrameSVG({ w, h }: { w: number; h: number }) {
  const spec = DEVICE_FRAME_SPECS.android;
  const shellR = w * 0.07;
  const screenR = Math.min(w, h) * spec.screenCornerRadiusFrac;
  const sx = spec.screenRect.x * w;
  const sy = spec.screenRect.y * h;
  const sw = spec.screenRect.w * w;
  const sh = spec.screenRect.h * h;
  const phR = Math.max(4, w * 0.022);
  const phCX = w / 2;
  const phCY = spec.screenRect.y * h * 0.48;
  const gbW = w * 0.25;
  const gbH = Math.max(2, h * 0.004);

  const shellPath = rr(0, 0, w, h, shellR);
  const screenPath = rr(sx, sy, sw, sh, screenR);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fillRule="evenodd" fill="#111114" d={`${shellPath} ${screenPath}`} />
      <circle cx={phCX} cy={phCY} r={phR} fill="#000" />
      <rect x={(w - gbW) / 2} y={h * 0.968} width={gbW} height={gbH} rx={gbH / 2} fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

/** Build an SVG rounded rect path string (clockwise for outer, counter-clockwise creates hole via evenodd) */
function rr(x: number, y: number, w: number, h: number, r: number): string {
  if (r <= 0) return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  return (
    `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} ` +
    `V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} ` +
    `H${x + r} Q${x},${y + h} ${x},${y + h - r} ` +
    `V${y + r} Q${x},${y} ${x + r},${y} Z`
  );
}
