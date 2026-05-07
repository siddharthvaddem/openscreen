import type { Rotation3D } from "@/components/video-editor/types";
import {
	computeRotation3DContainScale,
	isRotation3DIdentity,
	rotation3DPerspective,
} from "@/components/video-editor/types";

// CSS uses +y down, WebGL clip space uses +y up. We do all rotation math in CSS
// convention (top-left origin, +y down) to match the preview, then flip
// gl_Position.y at the end so WebGL's clip space lands the input's top edge at
// the top of the output viewport.
const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
in vec2 aUV;
out vec2 vUV;
uniform mat4 uMvp;
uniform vec2 uSize;
void main() {
	vUV = aUV;
	vec2 px = (aPos - 0.5) * uSize;
	vec4 clip = uMvp * vec4(px, 0.0, 1.0);
	clip.y = -clip.y;
	gl_Position = clip;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D uTex;
void main() {
	fragColor = texture(uTex, vUV);
}
`;

function deg2rad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16);
	for (let i = 0; i < 4; i += 1) {
		for (let j = 0; j < 4; j += 1) {
			let s = 0;
			for (let k = 0; k < 4; k += 1) {
				s += a[k * 4 + j] * b[i * 4 + k];
			}
			out[i * 4 + j] = s;
		}
	}
	return out;
}

function rotationXMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotationYMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function rotationZMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function translationMat(x: number, y: number, z: number): Float32Array {
	return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function perspectiveMat(fovY: number, aspect: number, near: number, far: number): Float32Array {
	const f = 1 / Math.tan(fovY / 2);
	const nf = 1 / (near - far);
	return new Float32Array([
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(far + near) * nf,
		-1,
		0,
		0,
		2 * far * near * nf,
		0,
	]);
}

function scaleMat(s: number): Float32Array {
	return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function buildMvpMatrix(rot: Rotation3D, w: number, h: number): Float32Array {
	const rx = rotationXMat(deg2rad(rot.rotationX));
	const ry = rotationYMat(deg2rad(rot.rotationY));
	const rz = rotationZMat(deg2rad(rot.rotationZ));
	const rotMat = multiplyMat4(rz, multiplyMat4(ry, rx));

	const perspective = rotation3DPerspective(w, h);
	const containScale = computeRotation3DContainScale(rot, w, h, perspective);
	const rotScaled = multiplyMat4(rotMat, scaleMat(containScale));

	const d = perspective;
	const fovY = 2 * Math.atan2(h / 2, d);
	const proj = perspectiveMat(fovY, w / h, 0.1, d * 4 + Math.max(w, h));
	const view = translationMat(0, 0, -d);
	return multiplyMat4(proj, multiplyMat4(view, rotScaled));
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("Failed to create shader");
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${info}`);
	}
	return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
	const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
	const program = gl.createProgram();
	if (!program) throw new Error("Failed to create program");
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Program link failed: ${info}`);
	}
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	return program;
}

export interface ThreeDPass {
	apply(srcCanvas: HTMLCanvasElement | OffscreenCanvas, rot: Rotation3D): HTMLCanvasElement;
	/**
	 * Reads back the most recent apply() result into a Uint8ClampedArray suitable
	 * for ImageData. Use this on platforms where drawImage(webglCanvas) is unreliable.
	 */
	readPixels(): Uint8ClampedArray;
	resize(width: number, height: number): void;
	destroy(): void;
}

export function createThreeDPass(width: number, height: number): ThreeDPass {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true });
	if (!gl) throw new Error("WebGL2 not available for 3D pass");

	const program = createProgram(gl);
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
	gl.useProgram(program);

	const aPos = gl.getAttribLocation(program, "aPos");
	const aUV = gl.getAttribLocation(program, "aUV");
	const uMvp = gl.getUniformLocation(program, "uMvp");
	const uSize = gl.getUniformLocation(program, "uSize");
	const uTex = gl.getUniformLocation(program, "uTex");

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	// Quad: two triangles sharing UVs consistently per corner.
	// pos.y ranges 0 (top of input) → 1 (bottom of input) following CSS convention.
	// UV.y is inverted (1 - pos.y) so that with UNPACK_FLIP_Y_WEBGL the texture
	// sample at the top of the input lands at the top of the rendered quad.
	//   TL: pos(0,0) uv(0,1)   TR: pos(1,0) uv(1,1)
	//   BL: pos(0,1) uv(0,0)   BR: pos(1,1) uv(1,0)
	const verts = new Float32Array([
		// aPos.x, aPos.y, aUV.x, aUV.y
		0,
		0,
		0,
		1, // TL
		1,
		0,
		1,
		1, // TR
		0,
		1,
		0,
		0, // BL
		0,
		1,
		0,
		0, // BL
		1,
		0,
		1,
		1, // TR (was 1,0,1,0 — broken)
		1,
		1,
		1,
		0, // BR
	]);
	const vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
	gl.enableVertexAttribArray(aUV);
	gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);

	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// Plain bilinear, NO mipmaps. Mipmaps pre-blur the texture for downsampling, but
	// at our moderate rotation angles (≤22°) the receding edge would still pick a
	// smaller mipmap level, which softens fine details — specifically the few-pixel
	// rounded-corner anti-alias ramp and the shadow's Gaussian falloff. The result
	// is "rounding looks like a hard corner / shadow looks grimy". Sampling level 0
	// directly preserves the source crispness.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Anisotropic filtering still helps without mipmaps: at oblique viewing angles
	// it samples multiple texels along the gradient direction at level 0, recovering
	// detail that plain bilinear would lose. Cap to the device max (16× typical).
	const anisoExt =
		gl.getExtension("EXT_texture_filter_anisotropic") ||
		gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
		gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
	if (anisoExt) {
		const maxAniso = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
		gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, maxAniso));
	}
	gl.uniform1i(uTex, 0);

	let currentSize = { width, height };

	const apply = (
		srcCanvas: HTMLCanvasElement | OffscreenCanvas,
		rot: Rotation3D,
	): HTMLCanvasElement => {
		gl.viewport(0, 0, currentSize.width, currentSize.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(program);
		gl.bindVertexArray(vao);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		// CRITICAL: premultiply on upload. The source 2D canvas stores non-premultiplied
		// RGBA (alpha=0 areas have RGB=0). Bilinear filtering between an inside-the-shape
		// texel (alpha=1, RGB=color) and an outside texel (alpha=0, RGB=0) in
		// non-premultiplied space yields (color/2, alpha=0.5), which the
		// premultipliedAlpha:true canvas then interprets as half-strength color — visible
		// as a dark halo around rounded corners and softened/grimy shadows. Premultiplying
		// at upload time makes the bilinear math operate in linear-light premultiplied
		// space, which is exactly the math used for compositing. Edges and shadows then
		// reproduce the source crisply.
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			srcCanvas as TexImageSource,
		);

		const mvp = isRotation3DIdentity(rot)
			? buildMvpMatrix(
					{ rotationX: 0, rotationY: 0, rotationZ: 0 },
					currentSize.width,
					currentSize.height,
				)
			: buildMvpMatrix(rot, currentSize.width, currentSize.height);
		gl.uniformMatrix4fv(uMvp, false, mvp);
		gl.uniform2f(uSize, currentSize.width, currentSize.height);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
		return canvas;
	};

	const resize = (w: number, h: number) => {
		if (w === currentSize.width && h === currentSize.height) return;
		canvas.width = w;
		canvas.height = h;
		currentSize = { width: w, height: h };
	};

	const readPixels = (): Uint8ClampedArray => {
		const w = currentSize.width;
		const h = currentSize.height;
		const buf = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		// gl.readPixels is bottom-up; flip to top-down for ImageData. We also need
		// to un-premultiply the alpha here: the framebuffer holds premultiplied RGBA
		// (we set UNPACK_PREMULTIPLY_ALPHA_WEBGL=true on upload), but ImageData /
		// putImageData expect non-premultiplied. Without this divide, semi-transparent
		// pixels get interpreted as darker than they should be.
		const rowSize = w * 4;
		const out = new Uint8ClampedArray(buf.length);
		for (let row = 0; row < h; row += 1) {
			const src = (h - 1 - row) * rowSize;
			const dst = row * rowSize;
			for (let col = 0; col < rowSize; col += 4) {
				const r = buf[src + col];
				const g = buf[src + col + 1];
				const b = buf[src + col + 2];
				const a = buf[src + col + 3];
				if (a === 0) {
					out[dst + col] = 0;
					out[dst + col + 1] = 0;
					out[dst + col + 2] = 0;
					out[dst + col + 3] = 0;
				} else if (a === 255) {
					out[dst + col] = r;
					out[dst + col + 1] = g;
					out[dst + col + 2] = b;
					out[dst + col + 3] = 255;
				} else {
					const inv = 255 / a;
					out[dst + col] = Math.min(255, Math.round(r * inv));
					out[dst + col + 1] = Math.min(255, Math.round(g * inv));
					out[dst + col + 2] = Math.min(255, Math.round(b * inv));
					out[dst + col + 3] = a;
				}
			}
		}
		return out;
	};

	const destroy = () => {
		gl.deleteProgram(program);
		gl.deleteBuffer(vbo);
		gl.deleteVertexArray(vao);
		gl.deleteTexture(texture);
	};

	return { apply, readPixels, resize, destroy };
}
