import { Injectable, OnDestroy } from '@angular/core';
import type { ImageGeometry } from './vision';
import type { RecognitionResult, RecognitionPhase, RecognitionMode } from './bag-pattern';

@Injectable({ providedIn: 'root' })
export class Detector implements OnDestroy {
  private worker?: Worker;
  private cancel?: () => void;

  detect(pixels: Uint8ClampedArray, geometry: ImageGeometry, progress: (phase: RecognitionPhase) => void,
    threshold = .25, mode: RecognitionMode = 'objects'): Promise<RecognitionResult> {
    if (this.cancel) return Promise.reject(new Error('Detection is already running'));
    this.worker ??= new Worker(new URL('./detector.worker', import.meta.url), { type: 'module' });
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      const finish = () => { clearTimeout(timeout); this.cancel = undefined; worker.onmessage = null; worker.onerror = null; };
      const fail = (message: string) => { finish(); worker.terminate(); this.worker = undefined; reject(new Error(message)); };
      const timeout = setTimeout(() => fail('Detection timed out'), 120_000);
      this.cancel = () => fail('Detection cancelled');
      worker.onerror = () => fail('Detection worker failed');
      worker.onmessage = ({ data }) => {
        if (data.phase) progress(data.phase);
        else if (data.error) fail(data.error);
        else { finish(); resolve(data.result); }
      };
      try {
        worker.postMessage({ pixels: pixels.buffer, geometry, baseUrl: document.baseURI, threshold, mode }, [pixels.buffer as ArrayBuffer]);
      } catch (error) { fail(error instanceof Error ? error.message : String(error)); }
    });
  }

  stop(): void { this.cancel?.(); this.worker?.terminate(); this.worker = undefined; }
  ngOnDestroy(): void { this.stop(); }
}
