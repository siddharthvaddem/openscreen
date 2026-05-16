export type DeviceFrameType = "none" | "browser" | "iphone" | "android";

export interface DeviceFrameSpec {
  /** Fraction of canvas [0-1] for the inner screen rect */
  screenRect: { x: number; y: number; w: number; h: number };
  /** Corner radius of screen rect as fraction of canvas min dimension */
  screenCornerRadiusFrac: number;
}

export const DEVICE_FRAME_SPECS: Record<Exclude<DeviceFrameType, "none">, DeviceFrameSpec> = {
  browser: {
    screenRect: { x: 0.008, y: 0.10, w: 0.984, h: 0.892 },
    screenCornerRadiusFrac: 0,
  },
  iphone: {
    screenRect: { x: 0.045, y: 0.11, w: 0.91, h: 0.80 },
    screenCornerRadiusFrac: 0.045,
  },
  android: {
    screenRect: { x: 0.035, y: 0.065, w: 0.93, h: 0.865 },
    screenCornerRadiusFrac: 0.03,
  },
};

/**
 * Draw the device frame onto ctx. Assumes ctx is the FINAL composite canvas
 * (video already rendered underneath). Draws shell with transparent screen hole,
 * then decorative elements on top.
 */
export function drawDeviceFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frameType: Exclude<DeviceFrameType, "none">,
): void {
  if (frameType === "browser") drawBrowserFrame(ctx, w, h);
  else if (frameType === "iphone") drawIPhoneFrame(ctx, w, h);
  else if (frameType === "android") drawAndroidFrame(ctx, w, h);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function makeFrameCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

function drawBrowserFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const spec = DEVICE_FRAME_SPECS.browser;
  const barH = spec.screenRect.y * h;
  const borderW = Math.max(1, w * spec.screenRect.x);

  const [fc, fctx] = makeFrameCanvas(w, h);

  // Full canvas shell
  fctx.fillStyle = "#1a1a2e";
  roundedRectPath(fctx, 0, 0, w, h, 6);
  fctx.fill();

  // Cut screen hole
  fctx.globalCompositeOperation = "destination-out";
  const sx = spec.screenRect.x * w;
  const sy = spec.screenRect.y * h;
  const sw = spec.screenRect.w * w;
  const sh = spec.screenRect.h * h;
  fctx.fillStyle = "#000";
  fctx.fillRect(sx, sy, sw, sh);
  fctx.globalCompositeOperation = "source-over";

  // Divider line
  fctx.fillStyle = "rgba(255,255,255,0.06)";
  fctx.fillRect(0, barH - 1, w, 1);

  // Traffic lights
  const dotR = Math.max(4, barH * 0.22);
  const dotCY = barH * 0.5;
  const dotStartX = borderW + dotR * 1.4;
  ([["#ff5f57", 0], ["#febc2e", 1], ["#28c840", 2]] as const).forEach(([color, i]) => {
    fctx.fillStyle = color;
    fctx.beginPath();
    fctx.arc(dotStartX + i * (dotR * 2.8), dotCY, dotR, 0, Math.PI * 2);
    fctx.fill();
  });

  // URL bar
  const urlW = w * 0.38;
  const urlH = barH * 0.52;
  const urlX = (w - urlW) / 2;
  const urlY = (barH - urlH) / 2;
  fctx.fillStyle = "#2d2d44";
  roundedRectPath(fctx, urlX, urlY, urlW, urlH, urlH / 2);
  fctx.fill();

  // Refresh icon (simple circle arc)
  const btnX = urlX + urlW + urlH * 0.8;
  const btnY = barH * 0.5;
  const btnR = urlH * 0.28;
  fctx.strokeStyle = "rgba(255,255,255,0.25)";
  fctx.lineWidth = Math.max(1, btnR * 0.5);
  fctx.beginPath();
  fctx.arc(btnX, btnY, btnR, -Math.PI * 0.15, Math.PI * 1.7);
  fctx.stroke();

  ctx.drawImage(fc, 0, 0);
}

function drawIPhoneFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const spec = DEVICE_FRAME_SPECS.iphone;
  const shellR = w * 0.11;
  const screenR = Math.min(w, h) * spec.screenCornerRadiusFrac;

  const [fc, fctx] = makeFrameCanvas(w, h);

  // Shell
  fctx.fillStyle = "#1c1c1e";
  roundedRectPath(fctx, 0, 0, w, h, shellR);
  fctx.fill();

  // Screen hole
  fctx.globalCompositeOperation = "destination-out";
  const sx = spec.screenRect.x * w;
  const sy = spec.screenRect.y * h;
  const sw = spec.screenRect.w * w;
  const sh = spec.screenRect.h * h;
  fctx.fillStyle = "#000";
  roundedRectPath(fctx, sx, sy, sw, sh, screenR);
  fctx.fill();
  fctx.globalCompositeOperation = "source-over";

  // Dynamic Island pill
  const diW = w * 0.275;
  const diH = h * 0.038;
  const diX = (w - diW) / 2;
  const diY = h * 0.026;
  fctx.fillStyle = "#000";
  roundedRectPath(fctx, diX, diY, diW, diH, diH / 2);
  fctx.fill();

  // Camera dot in Dynamic Island (right side)
  fctx.fillStyle = "#1a1a2a";
  fctx.beginPath();
  fctx.arc(diX + diW * 0.78, diY + diH / 2, diH * 0.29, 0, Math.PI * 2);
  fctx.fill();

  // Home indicator
  const hiW = w * 0.28;
  const hiH = Math.max(3, h * 0.0045);
  fctx.fillStyle = "rgba(255,255,255,0.42)";
  roundedRectPath(fctx, (w - hiW) / 2, h * 0.966, hiW, hiH, hiH / 2);
  fctx.fill();

  // Side buttons
  const btnW = Math.max(3, w * 0.022);
  fctx.fillStyle = "#2c2c2e";
  // Volume up
  roundedRectPath(fctx, -btnW * 0.35, h * 0.22, btnW, h * 0.068, btnW / 2);
  fctx.fill();
  // Volume down
  roundedRectPath(fctx, -btnW * 0.35, h * 0.305, btnW, h * 0.068, btnW / 2);
  fctx.fill();
  // Power
  roundedRectPath(fctx, w - btnW * 0.65, h * 0.263, btnW, h * 0.09, btnW / 2);
  fctx.fill();

  ctx.drawImage(fc, 0, 0);
}

function drawAndroidFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const spec = DEVICE_FRAME_SPECS.android;
  const shellR = w * 0.07;
  const screenR = Math.min(w, h) * spec.screenCornerRadiusFrac;

  const [fc, fctx] = makeFrameCanvas(w, h);

  // Shell
  fctx.fillStyle = "#111114";
  roundedRectPath(fctx, 0, 0, w, h, shellR);
  fctx.fill();

  // Screen hole
  fctx.globalCompositeOperation = "destination-out";
  const sx = spec.screenRect.x * w;
  const sy = spec.screenRect.y * h;
  const sw = spec.screenRect.w * w;
  const sh = spec.screenRect.h * h;
  fctx.fillStyle = "#000";
  roundedRectPath(fctx, sx, sy, sw, sh, screenR);
  fctx.fill();
  fctx.globalCompositeOperation = "source-over";

  // Punch-hole camera
  const phR = Math.max(4, w * 0.022);
  const phCX = w / 2;
  const phCY = spec.screenRect.y * h * 0.48;
  fctx.fillStyle = "#000";
  fctx.beginPath();
  fctx.arc(phCX, phCY, phR, 0, Math.PI * 2);
  fctx.fill();

  // Gesture bar
  const gbW = w * 0.25;
  const gbH = Math.max(2, h * 0.004);
  fctx.fillStyle = "rgba(255,255,255,0.35)";
  roundedRectPath(fctx, (w - gbW) / 2, h * 0.968, gbW, gbH, gbH / 2);
  fctx.fill();

  ctx.drawImage(fc, 0, 0);
}
