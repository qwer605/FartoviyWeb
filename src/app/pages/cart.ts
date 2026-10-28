import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';

@Component({
  selector: 'shop-cart',
  standalone: true,
  imports: [RouterLink, Translate],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartPage {
  readonly store = inject(Store);
}
