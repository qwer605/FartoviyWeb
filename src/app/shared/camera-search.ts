import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
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
  private readonly captureInput = viewChild.required<ElementRef<HTMLInputElement>>('captureInput');
  readonly busy = signal(false);
  readonly status = signal('');
  readonly error = signal('');
  private generation = 0;
  private photoUrl?: string;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.cancel();
    });
  }

  open(): void {
    if (this.busy()) return;
    this.status.set('');
    this.error.set('');
    // Keep this synchronous with the tap so the browser can launch native capture.
    this.captureInput().nativeElement.click();
  }

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // The same photo can be captured/selected again after a retry.
    if (!file || this.busy()) return;
    this.status.set('');
    this.error.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      this.error.set('Выберите JPG, PNG или WebP размером до 20 МБ.');
      return;
    }
    const run = ++this.generation;
    this.busy.set(true);
    this.status.set('Подготовка фото…');
    const url = URL.createObjectURL(file);
    this.photoUrl = url;
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (run !== this.generation) return;
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Image too large');
      const geometry = resizedGeometry(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = INPUT_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = 'rgb(114, 114, 114)';
      context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      context.drawImage(image, geometry.padX, geometry.padY, geometry.width, geometry.height);
      const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
      const result = await this.detector.detect(pixels, geometry, phase => {
        if (run === this.generation) this.status.set(phase === 'loading' ? 'Подготовка поиска…' : 'Ищем шахматный узор…');
      }, .1, 'pattern', 'regions');
      if (run !== this.generation) return;
      if (!result.candidates.some(candidate => candidate.matched)) {
        this.status.set('Узор не найден. Сделайте другое фото или измените ракурс.');
      } else if (!this.store.product(CHECKER_BAG_ID)) {
        this.status.set('');
        this.error.set('Эта сумка сейчас недоступна в каталоге.');
      } else {
        this.status.set('');
        await this.router.navigate(['/product', CHECKER_BAG_ID]);
      }
    } catch {
      if (run === this.generation) {
        this.status.set('');
        this.error.set('Не удалось обработать фото. Выберите другое изображение или повторите попытку.');
      }
    } finally {
      if (this.photoUrl === url) this.releasePhoto();
      if (run === this.generation) this.busy.set(false);
    }
  }

  private releasePhoto(): void {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = undefined;
  }

  cancel(): void {
    ++this.generation;
    this.detector.stop();
    this.releasePhoto();
    this.busy.set(false);
    this.status.set('');
    this.error.set('');
  }

  ngOnDestroy(): void { this.cancel(); }
}
