import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../core/catalog';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';

@Component({
  selector: 'shop-product-card',
  standalone: true,
  imports: [RouterLink, Translate],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly store = inject(Store);
}
