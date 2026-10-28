import type { Product } from './catalog';

export interface ProductFields {
  id: string; name: string; category: string; label: string;
  price: string; image: string; sizes: string; description: string;
}

export function productFields(product?: Product): ProductFields {
  return product ? { ...product, price: String(product.price), sizes: product.sizes.join(', ') }
    : { id: '', name: '', category: 'accessories', label: '', price: '', image: '', sizes: '', description: '' };
}

export function isProductImage(value: string): boolean {
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) return value.length <= 8_000_000;
  if (/^assets\/[\w./-]+\.(?:jpe?g|png|webp)$/i.test(value) && !value.includes('..')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

/** Editor validation is stricter than legacy database reads. */
export function editedProduct(fields: ProductFields): Product {
  const product: Product = {
    ...fields, id: fields.id.trim(), name: fields.name.trim(), category: fields.category.trim(),
    label: fields.label.trim(), description: fields.description.trim(), image: fields.image.trim(),
    price: Number(fields.price), sizes: [...new Set(fields.sizes.split(/[,;\n]/).map(size => size.trim()).filter(Boolean))]
  };
  const cents = Math.round(product.price * 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(product.id)
    || !product.name || product.name.length > 200 || !product.label || product.label.length > 100
    || !['shoes', 'clothing', 'accessories'].includes(product.category)
    || !/^(?:\d+|\d*\.\d{1,2})$/.test(fields.price.trim()) || !Number.isFinite(product.price) || product.price < 0
    || !Number.isSafeInteger(cents) || cents / 100 !== product.price
    || !product.sizes.length || product.sizes.length > 20 || product.sizes.some(size => size.length > 40)
    || product.description.length > 4000 || !isProductImage(product.image)) {
    throw new Error('Invalid product fields');
  }
  return product;
}

export async function productPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Invalid image');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('Image too large');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', .85);
  } finally { bitmap.close(); }
}
