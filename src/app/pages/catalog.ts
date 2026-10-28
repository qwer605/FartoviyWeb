import { Component, inject } from '@angular/core';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'shop-catalog',
  standalone: true,
  imports: [Translate, ProductCard],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class CatalogPage {
  readonly store = inject(Store);
}
