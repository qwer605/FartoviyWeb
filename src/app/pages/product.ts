import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';

@Component({
  selector: 'shop-product',
  standalone: true,
  imports: [RouterLink, Translate],
  templateUrl: './product.html',
  styleUrl: './product.css'
})
export class ProductPage {
  readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly product = computed(() => this.store.product(this.params().get('id') ?? ''));
  readonly photos = computed(() => {
    const product = this.product();
    return product ? [product.image, ...(product.gallery ?? [])] : [];
  });
  readonly photoIndex = signal(0);
  readonly size = signal('');
  readonly message = signal('');
  readonly zoomed = signal(false);

  constructor() {
    effect(() => {
      const product = this.product();
      this.size.set(product?.sizes[0] ?? '');
      this.message.set('');
      this.zoomed.set(false);
      this.photoIndex.set(0);
    });
  }

  selectPhoto(index: number): void {
    this.photoIndex.set(index);
    this.zoomed.set(false);
  }

  selectSize(value: string): void {
    this.size.set(value);
    this.message.set('');
  }

  add(): void {
    const product = this.product();
    if (!product) return;
    this.message.set(this.store.add(product, this.size())
      ? 'Товар добавлен в корзину.'
      : 'В корзине уже 99 товаров этого размера.');
  }
}
