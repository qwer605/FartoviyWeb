/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/wasm';
import { decodeDetections, INPUT_SIZE, rgbaToTensor } from './vision';
import type { ImageGeometry } from './vision';

let session: Promise<ort.InferenceSession> | undefined;

addEventListener('message', async ({ data }: MessageEvent<{ pixels: ArrayBuffer; geometry: ImageGeometry; baseUrl: string }>) => {
  let input: ort.Tensor | undefined;
  let outputs: ort.InferenceSession.ReturnType | undefined;
  try {
    postMessage({ phase: 'loading' });
    ort.env.wasm.numThreads = 1; // Pages cannot enable cross-origin isolation headers.
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = new URL('onnx/', data.baseUrl).href;
    session ??= ort.InferenceSession.create(new URL('models/yolov10n-uint8.onnx', data.baseUrl).href,
      { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }).catch(error => { session = undefined; throw error; });
    const model = await session;
    postMessage({ phase: 'running' });
    input = new ort.Tensor('float32', rgbaToTensor(new Uint8ClampedArray(data.pixels)), [1, 3, INPUT_SIZE, INPUT_SIZE]);
    outputs = await model.run({ [model.inputNames[0]]: input });
    const output = outputs[model.outputNames[0]];
    const detections = decodeDetections(output.data as Float32Array, output.dims, data.geometry);
    postMessage({ detections });
  } catch (error) {
    postMessage({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    input?.dispose();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
  }
});
