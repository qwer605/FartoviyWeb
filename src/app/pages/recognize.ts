import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { I18n, Translate } from '../core/i18n';
import { Detector } from '../core/detector';
import { INPUT_SIZE, OBJECT_LABELS, resizedGeometry } from '../core/vision';
import type { Detection } from '../core/vision';

@Component({
  selector: 'shop-recognize',
  standalone: true,
  imports: [Translate],
  templateUrl: './recognize.html',
  styleUrl: './recognize.css'
})
export class RecognizePage implements OnDestroy {
  readonly i18n = inject(I18n);
  private readonly detector = inject(Detector);
  private readonly camera = viewChild<ElementRef<HTMLVideoElement>>('camera');
  readonly preview = signal('');
  readonly busy = signal(false);
  readonly phase = signal<'loading' | 'running'>('loading');
  readonly detections = signal<Detection[]>([]);
  readonly completed = signal(false);
  readonly error = signal('');
  readonly cameraOpen = signal(false);
  readonly cameraStarting = signal(false);
  private image?: HTMLImageElement;
  private objectUrl?: string;
  private stream?: MediaStream;
  private destroyed = false;

  label(classId: number): string {
    const index = { en: 0, ru: 1, uk: 2 }[this.i18n.language()];
    return OBJECT_LABELS[classId][index];
  }

  confidence(value: number): string {
    return new Intl.NumberFormat(this.i18n.language(), { style: 'percent', maximumFractionDigits: 0 }).format(value);
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
    this.detections.set([]);
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
    this.detections.set([]);
    this.phase.set('loading');
    try {
      const geometry = resizedGeometry(this.image.naturalWidth, this.image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = INPUT_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      // Match the model's processor: longest edge 640, black padding on right/bottom.
      context.fillStyle = 'black';
      context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      context.drawImage(this.image, 0, 0, geometry.width, geometry.height);
      const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
      const detections = await this.detector.detect(pixels, geometry, phase => this.phase.set(phase));
      if (this.destroyed) return;
      this.detections.set(detections);
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
