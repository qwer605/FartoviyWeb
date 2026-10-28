import { Routes } from '@angular/router';
import { CatalogPage } from './pages/catalog';
import { ProductPage } from './pages/product';
import { CartPage } from './pages/cart';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  { path: 'catalog', component: CatalogPage },
  { path: 'product/:id', component: ProductPage },
  { path: 'cart', component: CartPage },
  { path: 'checkout', loadComponent: () => import('./pages/checkout').then(module => module.CheckoutPage) },
  { path: 'orders', loadComponent: () => import('./pages/orders').then(module => module.OrdersPage) },
  { path: 'orders/:id', loadComponent: () => import('./pages/order').then(module => module.OrderPage) },
  { path: 'recognize', loadComponent: () => import('./pages/recognize').then(module => module.RecognizePage) },
  { path: 'admin', loadComponent: () => import('./pages/admin').then(module => module.AdminPage) },
  { path: '**', redirectTo: 'catalog' }
];
