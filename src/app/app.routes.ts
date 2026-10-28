import { Routes } from '@angular/router';
import { CatalogPage } from './pages/catalog';
import { ProductPage } from './pages/product';
import { CartPage } from './pages/cart';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  { path: 'catalog', component: CatalogPage },
  { path: 'product/:id', component: ProductPage },
  { path: 'cart', component: CartPage },
  { path: '**', redirectTo: 'catalog' }
];
