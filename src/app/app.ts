import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from './core/store';
import { I18n, Translate } from './core/i18n';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Translate],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly store = inject(Store);
  readonly i18n = inject(I18n);
}
