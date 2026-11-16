import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'shop-catalog',
  standalone: true,
  imports: [Translate, ProductCard, RouterLink],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class CatalogPage {
  readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly categories = [
    { id: 'all', label: 'Все вещи' }, { id: 'clothing', label: 'Одежда' },
    { id: 'shoes', label: 'Обувь' }, { id: 'accessories', label: 'Аксессуары' }
  ];
  readonly category = computed(() => {
    const value = this.params().get('category');
    return this.categories.some(category => category.id === value) ? value! : 'all';
  });
  readonly visibleProducts = computed(() => this.store.products().filter(product => this.category() === 'all' || product.category === this.category()));
  count(category: string): number { return this.store.products().filter(product => category === 'all' || product.category === category).length; }
}
