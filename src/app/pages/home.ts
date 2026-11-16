import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import { ProductCard } from '../shared/product-card';

@Component({ selector: 'shop-home', standalone: true, imports: [RouterLink, Translate, ProductCard], templateUrl: './home.html', styleUrl: './home.css' })
export class HomePage {
  readonly store = inject(Store);
  readonly featured = computed(() => {
    const ids = ['checker-bag', 'essential', 'comfort', 'runner'];
    return [...this.store.products()].sort((a, b) => {
      const rank = (id: string) => ids.includes(id) ? ids.indexOf(id) : ids.length;
      return rank(a.id) - rank(b.id);
    }).slice(0, 4);
  });
}
