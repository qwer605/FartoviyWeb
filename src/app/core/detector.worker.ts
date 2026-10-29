/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/wasm';
import { decodeSegments, INPUT_SIZE, rgbaToTensor } from './vision';
import type { ImageGeometry } from './vision';
import { checkBagPattern, patternCandidates } from './bag-pattern';
import type { RecognitionMode } from './bag-pattern';

let session: Promise<ort.InferenceSession> | undefined;

addEventListener('message', async ({ data }: MessageEvent<{ pixels: ArrayBuffer; geometry: ImageGeometry; baseUrl: string; threshold: number; mode: RecognitionMode }>) => {
  let input: ort.Tensor | undefined;
  let outputs: ort.InferenceSession.ReturnType | undefined;
  try {
    postMessage({ phase: 'loading' });
    ort.env.wasm.numThreads = 1; // Pages cannot enable cross-origin isolation headers.
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = new URL('onnx/', data.baseUrl).href;
    session ??= ort.InferenceSession.create(new URL('models/yolo26s-seg.onnx', data.baseUrl).href,
      { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }).catch(error => { session = undefined; throw error; });
    const model = await session;
    postMessage({ phase: 'running' });
    input = new ort.Tensor('float32', rgbaToTensor(new Uint8ClampedArray(data.pixels)), [1, 3, INPUT_SIZE, INPUT_SIZE]);
    outputs = await model.run({ [model.inputNames[0]]: input });
    const output = outputs[model.outputNames[0]];
    const prototypes = outputs[model.outputNames[1]];
    const detections = decodeSegments(output.data as Float32Array, output.dims,
      prototypes.data as Float32Array, prototypes.dims, data.geometry, data.threshold);
    const candidates = [];
    if (data.mode === 'pattern') {
      postMessage({ phase: 'texture' });
      for (const detection of patternCandidates(detections)) candidates.push(checkBagPattern(new Uint8ClampedArray(data.pixels), data.geometry, detection));
    }
    const buffers = detections.map(detection => detection.mask.data.buffer as ArrayBuffer);
    for (const candidate of candidates) buffers.push(candidate.texture.mask.buffer as ArrayBuffer);
    postMessage({ result: { detections, candidates } }, buffers);
  } catch (error) {
    postMessage({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    input?.dispose();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
  }
});
