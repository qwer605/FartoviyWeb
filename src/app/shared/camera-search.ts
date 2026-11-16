import { Component, ElementRef, HostListener, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Detector } from '../core/detector';
import { Translate } from '../core/i18n';
import { Store } from '../core/store';
import { CHECKER_BAG_ID } from '../core/catalog';
import { INPUT_SIZE, resizedGeometry } from '../core/vision';

@Component({
  selector: 'shop-camera-search',
  standalone: true,
  imports: [Translate],
  templateUrl: './camera-search.html',
  styleUrl: './camera-search.css'
})
export class CameraSearch implements OnDestroy {
  private readonly detector = inject(Detector);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly camera = viewChild.required<ElementRef<HTMLVideoElement>>('camera');
  readonly opened = signal(false);
  readonly starting = signal(false);
  readonly busy = signal(false);
  readonly cameraReady = signal(false);
  readonly preview = signal('');
  readonly status = signal('');
  readonly error = signal('');
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.close();
    });
  }

  open(): void {
    if (this.opened()) return;
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
    void this.startCamera();
  }

  async startCamera(): Promise<void> {
    if (!this.opened() || this.busy() || this.starting()) return;
    const run = ++this.generation;
    this.stopStream();
    this.clearPreview();
    this.error.set('');
    this.starting.set(true);
    this.status.set('Разрешите доступ к камере, чтобы найти сумку по узору.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      });
      if (!this.current(run)) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const video = this.camera().nativeElement;
      video.srcObject = stream;
      // Render before play(): some mobile browsers will not start hidden video.
      this.cameraReady.set(true);
      await video.play();
      if (!this.current(run)) return;
      this.status.set('Наведите камеру на шахматный узор сумки.');
      this.scheduleScan(run, 0);
    } catch {
      if (this.current(run)) {
        this.stopStream();
        this.status.set('');
        this.error.set('Не удалось открыть камеру. Разрешите доступ или сделайте и загрузите фото.');
      }
    } finally { if (this.current(run)) this.starting.set(false); }
  }

  private current(run: number): boolean { return this.opened() && run === this.generation; }

  private scheduleScan(run: number, delay = 900): void {
    if (this.current(run)) this.timer = setTimeout(() => { void this.scanFrame(run); }, delay);
  }

  private async scanFrame(run: number): Promise<void> {
    if (!this.current(run) || !this.cameraReady() || this.busy()) return;
    const video = this.camera().nativeElement;
    if (!video.videoWidth || video.readyState < 2) { this.scheduleScan(run, 200); return; }
    this.busy.set(true);
    try {
      const matched = await this.analyze(video, video.videoWidth, video.videoHeight, run);
      if (this.current(run) && !matched) {
        this.status.set('Узор пока не найден. Поднесите камеру ближе или измените ракурс.');
        this.scheduleScan(run);
      }
    } catch {
      if (this.current(run)) {
        this.stopStream();
        this.status.set('');
        this.error.set('Не удалось выполнить поиск. Повторите попытку.');
      }
    } finally { if (this.current(run)) this.busy.set(false); }
  }

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.opened() || this.busy() || this.starting()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      this.error.set('Выберите JPG, PNG или WebP размером до 20 МБ.');
      return;
    }
    const run = ++this.generation;
    this.stopStream();
    this.clearPreview();
    this.error.set('');
    this.status.set('Подготовка фото…');
    this.busy.set(true);
    const url = URL.createObjectURL(file);
    this.preview.set(url);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!this.current(run)) return;
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Image too large');
      const matched = await this.analyze(image, image.naturalWidth, image.naturalHeight, run);
      if (this.current(run) && !matched) this.status.set('Узор не найден. Сделайте другое фото или измените ракурс.');
    } catch {
      if (this.current(run)) {
        this.status.set('');
        this.error.set('Не удалось обработать фото. Выберите другое изображение или повторите попытку.');
      }
    } finally { if (this.current(run)) this.busy.set(false); }
  }

  private async analyze(source: CanvasImageSource, width: number, height: number, run: number): Promise<boolean> {
    const geometry = resizedGeometry(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = INPUT_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = 'rgb(114, 114, 114)';
    context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    context.drawImage(source, geometry.padX, geometry.padY, geometry.width, geometry.height);
    const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    const result = await this.detector.detect(pixels, geometry, phase => {
      if (this.current(run)) this.status.set(phase === 'loading' ? 'Подготовка поиска…' : 'Ищем шахматный узор…');
    }, .1, 'pattern', 'regions');
    if (!this.current(run)) return false;
    if (!result.candidates.some(candidate => candidate.matched)) return false;
    if (!this.store.product(CHECKER_BAG_ID)) {
      this.stopStream();
      this.status.set('');
      this.error.set('Эта сумка сейчас недоступна в каталоге.');
      return true;
    }
    this.close();
    await this.router.navigate(['/product', CHECKER_BAG_ID]);
    return true;
  }

  private stopStream(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    const video = this.camera().nativeElement;
    video.pause();
    video.srcObject = null;
    this.cameraReady.set(false);
  }

  private clearPreview(): void {
    const url = this.preview();
    this.preview.set('');
    if (url) URL.revokeObjectURL(url);
  }

  @HostListener('document:visibilitychange')
  pauseWhenHidden(): void {
    if (!document.hidden || !this.opened()) return;
    ++this.generation;
    this.stopStream();
    this.detector.stop();
    this.busy.set(false);
    this.starting.set(false);
    this.status.set('Поиск приостановлен. Включите камеру, чтобы продолжить.');
  }

  close(): void {
    if (!this.opened()) return;
    ++this.generation;
    this.opened.set(false);
    this.stopStream();
    this.detector.stop();
    this.clearPreview();
    this.busy.set(false);
    this.starting.set(false);
    this.status.set('');
    this.error.set('');
    this.dialog().nativeElement.close();
  }

  ngOnDestroy(): void { this.close(); }
}
