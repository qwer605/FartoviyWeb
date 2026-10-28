FARTOVIY — Angular-каталог

Запуск
  Node.js 22.18+
  npm ci
  npm start
  http://localhost:4200

Реализовано четыре компонента
  1. Каталог: список всех товаров.
  2. Карточка товара: фото, название, цена и переход к товару.
  3. Страница товара: описание, выбор размера и добавление в корзину.
  4. Корзина: количество, удаление, сумма и сохранение в браузере.

Каждый компонент standalone, со своими HTML и CSS:
  src/app/pages/catalog.ts / .html / .css
  src/app/shared/product-card.ts / .html / .css
  src/app/pages/product.ts / .html / .css
  src/app/pages/cart.ts / .html / .css

Оболочка и навигация: src/app/app.ts / .html / .css
Товары и корзина: src/app/core/catalog.ts, store.ts
Переводы RU/УКР: src/app/core/i18n.ts, translations.ts
Фотографии: public/assets/

Глобального CSS нет. Баннеры, иконки, избранное, демооплата,
камера и computer vision удалены из текущей реализации.
Компьютерное зрение — следующий отдельный этап.
Цены демонстрационные, в условных единицах; доставки нет.

Сборка
  npm run build
  Результат: dist/index.html и соседние файлы.
  При сборке dist/ пересоздаётся; редактировать нужно src/.

Публикация FE в Sites
  Публичный адрес: https://fartoviy.nimblejam34.chatgpt.site
  Доступ по ссылке без авторизации; этот адрес можно использовать для QR-кода.
  Привязка Site сохранена в .openai/hosting.json.
  Разработку FE и BE можно продолжать в текущем рабочем проекте.
  Обновления публикуйте в тот же Site, сохраняя project_id и адрес.

QR-код
  share/qr.png — для отправки и печати.
  share/qr.svg — векторная версия.
  share/url.txt — публичный адрес сайта.

Служебные каталоги
  node_modules/ — установленные зависимости.
  .angular/ — автоматически создаваемый кеш Angular.

Для открытия сайта через QR используйте публичный адрес Sites выше.
Фотографии: Unsplash.
