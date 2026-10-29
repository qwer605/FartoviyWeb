import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { Translate } from '../core/i18n';
import { Detector } from '../core/detector';
import { INPUT_SIZE, resizedGeometry, maskOverlay } from '../core/vision';
import type { Detection, ImageGeometry } from '../core/vision';
import type { PatternCandidate, RecognitionPhase } from '../core/bag-pattern';

const PATTERN_CONFIDENCE_THRESHOLD = .1;

@Component({
  selector: 'shop-recognize',
  standalone: true,
  imports: [Translate],
  templateUrl: './recognize.html',
  styleUrl: './recognize.css'
})
export class RecognizePage implements OnDestroy {
  private readonly detector = inject(Detector);
  private readonly camera = viewChild<ElementRef<HTMLVideoElement>>('camera');
  private readonly maskCanvas = viewChild<ElementRef<HTMLCanvasElement>>('maskCanvas');
  readonly preview = signal('');
  readonly busy = signal(false);
  readonly phase = signal<RecognitionPhase>('loading');
  readonly candidates = signal<PatternCandidate[]>([]);
  readonly completed = signal(false);
  readonly error = signal('');
  readonly cameraOpen = signal(false);
  readonly cameraStarting = signal(false);
  private image?: HTMLImageElement;
  private objectUrl?: string;
  private stream?: MediaStream;
  private destroyed = false;

  matches(): number { return this.candidates().filter(candidate => candidate.matched).length; }

  private clearMasks(): void {
    const canvas = this.maskCanvas()?.nativeElement;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private drawMasks(detections: Detection[], geometry: ImageGeometry, candidates: PatternCandidate[]): void {
    const canvas = this.maskCanvas()!.nativeElement;
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    const source = document.createElement('canvas');
    source.width = source.height = 160;
    const sourceContext = source.getContext('2d')!;
    const overlay = sourceContext.createImageData(160, 160);
    const objectMask = maskOverlay(detections);
    for (let pixel = 0; pixel < objectMask.length; pixel += 4) {
      if (objectMask[pixel + 3]) objectMask.set([28, 120, 200, objectMask[pixel + 3] > 100 ? 200 : 65], pixel);
    }
    overlay.data.set(objectMask);
    sourceContext.putImageData(overlay, 0, 0);
    // Remove the same centered letterbox used by inference before fitting the original photo.
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = true;
    context.drawImage(source, geometry.padX / 4, geometry.padY / 4, geometry.width / 4, geometry.height / 4,
      0, 0, canvas.width, canvas.height);
    for (const candidate of candidates) {
      if (!candidate.matched) continue;
      const texture = candidate.texture;
      const layer = document.createElement('canvas');
      layer.width = texture.width; layer.height = texture.height;
      const paint = layer.getContext('2d')!;
      const overlay = paint.createImageData(layer.width, layer.height);
      for (let pixel = 0; pixel < texture.mask.length; pixel++) {
        if (texture.mask[pixel]) overlay.data.set([255, 159, 10, 190], pixel * 4);
      }
      paint.putImageData(overlay, 0, 0);
      context.drawImage(layer, 0, 0, canvas.width, canvas.height);
    }
  }

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      this.error.set('Выберите JPG, PNG или WebP размером до 20 МБ.');
      return;
    }
    await this.loadImage(URL.createObjectURL(file), true);
  }

  async example(): Promise<void> {
    await this.loadImage(new URL('assets/vision-sample.jpg', document.baseURI).href, false);
  }

  private async loadImage(url: string, temporary: boolean): Promise<void> {
    if (this.busy()) { if (temporary) URL.revokeObjectURL(url); return; }
    this.stopCamera();
    this.busy.set(true);
    this.error.set('');
    this.completed.set(false);
    this.candidates.set([]);
    this.clearMasks();
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (this.destroyed) { if (temporary) URL.revokeObjectURL(url); return; }
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Image too large');
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = temporary ? url : undefined;
      this.image = image;
      this.preview.set(url);
    } catch {
      if (temporary) URL.revokeObjectURL(url);
      this.error.set('Не удалось открыть фото. Выберите другое изображение.');
    } finally { this.busy.set(false); }
  }

  async startCamera(): Promise<void> {
    if (this.busy() || this.cameraStarting() || this.cameraOpen()) return;
    this.error.set('');
    this.cameraStarting.set(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (this.destroyed) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const video = this.camera()!.nativeElement;
      video.srcObject = stream;
      await video.play();
      if (this.destroyed) { this.stopCamera(); return; }
      this.cameraOpen.set(true);
    } catch {
      this.stopCamera();
      this.error.set('Не удалось открыть камеру. Разрешите доступ или загрузите фото.');
    } finally { this.cameraStarting.set(false); }
  }

  async capture(): Promise<void> {
    const video = this.camera()!.nativeElement;
    if (!video.videoWidth || this.busy()) return;
    const canvas = document.createElement('canvas');
    const geometry = resizedGeometry(video.videoWidth, video.videoHeight);
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.stopCamera();
    await this.loadImage(canvas.toDataURL('image/jpeg', 0.9), false);
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    if (this.camera()) this.camera()!.nativeElement.srcObject = null;
    this.cameraOpen.set(false);
  }

  async analyze(): Promise<void> {
    if (!this.image || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.completed.set(false);
    this.candidates.set([]);
    this.clearMasks();
    this.phase.set('loading');
    try {
      const geometry = resizedGeometry(this.image.naturalWidth, this.image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = INPUT_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      // Ultralytics letterbox: longest edge 640, centered padding with RGB 114.
      context.fillStyle = 'rgb(114, 114, 114)';
      context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      context.drawImage(this.image, geometry.padX, geometry.padY, geometry.width, geometry.height);
      const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
      const result = await this.detector.detect(pixels, geometry, phase => this.phase.set(phase), PATTERN_CONFIDENCE_THRESHOLD, 'pattern');
      if (this.destroyed) return;
      const detections = result.candidates.map(candidate => candidate.detection);
      this.candidates.set(result.candidates);
      this.drawMasks(detections, geometry, result.candidates);
      this.completed.set(true);
    } catch (error) {
      if (!this.destroyed) {
        console.error('Object detection failed:', error);
        this.error.set('Не удалось выполнить распознавание. Попробуйте ещё раз.');
      }
    } finally { this.busy.set(false); }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopCamera();
    this.detector.stop();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
