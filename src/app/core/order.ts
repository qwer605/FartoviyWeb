import type { Product } from './catalog';

export interface Customer { name: string; email: string; phone: string; note: string; }
export interface OrderItemRequest { id: string; size: string; qty: number; expectedPrice: number; }
export interface OrderDraft { id: string; customer: Customer; items: OrderItemRequest[]; }
export interface OrderItem { id: string; name: string; size: string; qty: number; unitPrice: number; total: number; }
export interface Order {
  id: string;
  number: string;
  createdAt: string;
  status: 'saved';
  customer: Customer;
  items: OrderItem[];
  total: number;
}

export class OrderError extends Error {
  readonly code: 'INVALID_CUSTOMER' | 'INVALID_CART' | 'CATALOG_CHANGED';
  constructor(code: OrderError['code']) { super(code); this.name = 'OrderError'; this.code = code; }
}

export function cartFingerprint(items: readonly { id: string; size: string; qty: number }[]): string {
  return JSON.stringify(items.map(item => [item.id, item.size, item.qty]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

export function validateOrderDraft(draft: OrderDraft): OrderDraft {
  const customer = draft?.customer;
  if (!customer || ![customer.name, customer.email, customer.phone, customer.note].every(value => typeof value === 'string')
    || !customer.name.trim() || customer.name.trim().length > 120 || customer.email.trim().length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
    || customer.phone.trim().length > 40 || customer.note.trim().length > 1000) throw new OrderError('INVALID_CUSTOMER');
  if (typeof draft.id !== 'string' || !draft.id || draft.id.length > 80
    || !Array.isArray(draft.items) || !draft.items.length || draft.items.length > 100) throw new OrderError('INVALID_CART');
  const keys = new Set<string>();
  for (const item of draft.items) {
    if (!item || typeof item.id !== 'string' || !item.id || typeof item.size !== 'string' || !item.size
      || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99
      || !Number.isFinite(item.expectedPrice) || item.expectedPrice < 0) throw new OrderError('INVALID_CART');
    const key = JSON.stringify([item.id, item.size]);
    if (keys.has(key)) throw new OrderError('INVALID_CART');
    keys.add(key);
  }
  return { id: draft.id, customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim(), note: customer.note.trim() },
    items: draft.items.map(item => ({ ...item })) };
}

export function buildOrder(draft: OrderDraft, products: readonly Product[], createdAt = new Date().toISOString()): Order {
  const checked = validateOrderDraft(draft);
  let totalCents = 0;
  const items = checked.items.map(item => {
    const product = products.find(product => product.id === item.id);
    if (!product || !product.sizes.includes(item.size) || product.price !== item.expectedPrice) throw new OrderError('CATALOG_CHANGED');
    const cents = Math.round(product.price * 100);
    if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - product.price) > 1e-8) throw new OrderError('INVALID_CART');
    const lineCents = cents * item.qty;
    totalCents += lineCents;
    if (!Number.isSafeInteger(totalCents)) throw new OrderError('INVALID_CART');
    return { id: product.id, name: product.name, size: item.size, qty: item.qty, unitPrice: cents / 100, total: lineCents / 100 };
  });
  return { id: checked.id, number: 'FRT-' + createdAt.slice(0, 10).replaceAll('-', '') + '-' + checked.id.replaceAll('-', '').slice(0, 8).toUpperCase(),
    createdAt, status: 'saved', customer: checked.customer, items, total: totalCents / 100 };
}
