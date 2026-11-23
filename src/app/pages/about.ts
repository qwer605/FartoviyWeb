import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';

@Component({
  selector: 'shop-about',
  standalone: true,
  imports: [RouterLink, Translate],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class AboutPage {
  private readonly store = inject(Store);
  readonly lookbookProduct = computed(() => this.store.product('damani-royal-leather-jacket'));
}
