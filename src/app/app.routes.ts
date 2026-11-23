import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { CatalogPage } from './pages/catalog';
import { ProductPage } from './pages/product';
import { CartPage } from './pages/cart';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home', pathMatch: 'full',
    loadComponent: () => import('./pages/home').then(module => module.HomePage),
    canActivate: [({ fragment }) => fragment === 'lookbook' || fragment === 'about'
      ? inject(Router).createUrlTree(['/about'], { fragment })
      : true],
    runGuardsAndResolvers: (from, to) => from.fragment !== to.fragment
  },
  { path: 'catalog', component: CatalogPage },
  { path: 'about', loadComponent: () => import('./pages/about').then(module => module.AboutPage) },
  { path: 'product/:id', component: ProductPage },
  { path: 'cart', component: CartPage },
  { path: 'checkout', loadComponent: () => import('./pages/checkout').then(module => module.CheckoutPage) },
  { path: 'orders', loadComponent: () => import('./pages/orders').then(module => module.OrdersPage) },
  { path: 'orders/:id', loadComponent: () => import('./pages/order').then(module => module.OrderPage) },
  { path: 'recognize', redirectTo: 'catalog', pathMatch: 'full' },
  { path: '**', redirectTo: 'catalog' }
];
