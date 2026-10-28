import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import type { Product } from '../core/catalog';
import type { Order } from '../core/order';
import { editedProduct, isProductImage, productFields, productPhoto } from '../core/product-editor';
import type { ProductFields } from '../core/product-editor';

@Component({
  selector: 'app-admin', standalone: true, imports: [RouterLink, Translate],
  templateUrl: './admin.html', styleUrl: './admin.css'
})
export class AdminPage {
  readonly store = inject(Store);
  readonly tab = signal<'products' | 'orders'>('products');
  readonly query = signal('');
  readonly fields = signal(productFields());
  readonly editing = signal<string | null>(null);
  readonly dirty = signal(false);
  readonly photoLoading = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly previewError = signal(false);
  readonly orders = signal<Order[]>([]);
  readonly ordersLoading = signal(false);
  readonly ordersError = signal(false);
  readonly busy = computed(() => this.store.savingCatalog() || this.store.submittingOrder() || this.photoLoading());
  readonly preview = computed(() => isProductImage(this.fields().image.trim()) ? this.fields().image.trim() : '');
  readonly filteredProducts = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.store.products().filter(product => [product.id, product.name, this.store.i18n.text(product.name), product.label]
      .some(value => value.toLocaleLowerCase().includes(query)));
  });

  set(field: keyof ProductFields, event: Event): void {
    this.fields.update(fields => ({ ...fields, [field]: (event.target as HTMLInputElement).value }));
    this.dirty.set(true);
    this.message.set('');
    this.error.set('');
    if (field === 'image') this.previewError.set(false);
  }

  edit(product?: Product): void {
    if (this.busy() || (this.dirty() && !confirm(this.store.i18n.text('Отменить несохранённые изменения?')))) return;
    this.fields.set(productFields(product));
    this.editing.set(product?.id ?? null);
    this.dirty.set(false);
    this.message.set('');
    this.error.set('');
    this.previewError.set(false);
    document.getElementById(product ? 'admin-name' : 'admin-id')?.focus();
  }

  async photo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.busy()) return;
    this.photoLoading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const image = await productPhoto(file);
      this.fields.update(fields => ({ ...fields, image }));
      this.dirty.set(true);
      this.previewError.set(false);
    } catch { this.error.set('Не удалось загрузить фото. Выберите JPG, PNG или WebP до 10 МБ и 40 мегапикселей.'); }
    finally { this.photoLoading.set(false); input.value = ''; }
  }

  useImageLink(): void {
    this.fields.update(fields => ({ ...fields, image: '' }));
    this.dirty.set(true);
    this.previewError.set(false);
    this.message.set('');
    this.error.set('');
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    let product: Product;
    try { product = editedProduct(this.fields()); }
    catch { this.error.set('Проверьте поля: цена до двух знаков, размеры через запятую и корректное фото.'); return; }
    try {
      await this.store.saveProduct(product, this.editing() === null);
      this.fields.set(productFields(product));
      this.editing.set(product.id);
      this.dirty.set(false);
      this.message.set('Товар сохранён.');
    } catch (error) {
      this.error.set(error instanceof DOMException && error.name === 'ConstraintError'
        ? 'Товар с таким ID уже существует. Выберите другой ID.'
        : error instanceof DOMException && error.name === 'NotFoundError'
          ? 'Товар уже удалён в другой вкладке. Обновите страницу.'
          : 'Не удалось сохранить товар. Изменения в форме сохранены. Повторите попытку.');
    }
  }

  async remove(product: Product): Promise<void> {
    if (this.busy()) return;
    const prompt = this.store.i18n.text('Удалить товар?') + '\n' + this.store.i18n.text(product.name)
      + '\n' + this.store.i18n.text('Несохранённые изменения этого товара будут потеряны.');
    if (!confirm(prompt)) return;
    this.error.set('');
    this.message.set('');
    try {
      await this.store.deleteProduct(product.id);
      if (this.editing() === product.id) {
        this.fields.set(productFields()); this.editing.set(null); this.dirty.set(false); this.previewError.set(false);
      }
      this.message.set('Товар удалён.');
    } catch { this.error.set('Не удалось удалить товар. Повторите попытку.'); }
  }

  showOrders(): void { this.tab.set('orders'); void this.loadOrders(); }

  async loadOrders(): Promise<void> {
    if (this.ordersLoading()) return;
    this.ordersLoading.set(true);
    this.ordersError.set(false);
    try { this.orders.set(await this.store.listOrders()); }
    catch { this.ordersError.set(true); }
    finally { this.ordersLoading.set(false); }
  }

  date(value: string): string {
    return new Intl.DateTimeFormat(this.store.i18n.language(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
