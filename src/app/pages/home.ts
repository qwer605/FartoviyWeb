import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'shop-home',
  standalone: true,
  imports: [RouterLink, Translate, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomePage {
  readonly store = inject(Store);
  readonly featured = computed(() => this.store.collection().slice(0, 4));
  readonly heroProduct = computed(() => this.store.product('hermes-birkin-bag-30'));
}
