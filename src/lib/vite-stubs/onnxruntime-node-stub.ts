/**
 * Transformers imports `onnxruntime-node`, then picks web vs node from
 * `process.release.name`, which is often `"node"` in Electron's renderer even
 * though we need the WASM build. The real `onnxruntime-node` is aliased away (it
 * pulls `fs`), so re-export `onnxruntime-web` to give the node branch a working ORT.
 */
import * as ortWeb from "onnxruntime-web";

const ort = (ortWeb as { default?: typeof ortWeb }).default ?? ortWeb;
export default ort;
