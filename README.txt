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

CI/CD FE в GitHub Actions и GitHub Pages
  Workflow: .github/workflows/fe-ci.yml.
  Запускается при push в quality/main и при создании или обновлении PR в main.
  Устанавливает Node.js 22, выполняет npm ci и production-сборку npm run build.
  Собирает приложение с base href /FartoviyWeb/ для адреса репозитория.
  PR и push в quality только проверяют сборку.
  Каждый push в main, включая merge PR quality -> main, публикует dist/ в Pages.
  При ошибке сборки публикация не запускается.
  Адрес FE: https://qwer605.github.io/FartoviyWeb/
  Результат виден во вкладке Actions и в проверках PR: FE pipeline / Production build.
  Первичная настройка: Settings -> Pages -> Build and deployment -> GitHub Actions.
  Для ручного повторного запуска выберите main во вкладке Actions -> FE pipeline.
  Workflow использует встроенный GITHUB_TOKEN; отдельные секреты не нужны.
  Для запрета merge при ошибке сборки добавьте Production build в required checks
  правила защиты ветки main в настройках GitHub.

Предыдущая публикация FE в Sites
  Публичный адрес: https://fartoviy.nimblejam34.chatgpt.site
  Предыдущий адрес сохранён для справки; актуальный QR-код ведёт в GitHub Pages.
  Привязка Site сохранена в .openai/hosting.json.
  Разработку FE и BE можно продолжать в текущем рабочем проекте.
  Pipeline публикует только в GitHub Pages; Sites обновляется отдельно через ChatGPT.

QR-код
  share/qr.png — для отправки и печати.
  share/qr.svg — векторная версия.
  share/url.txt — https://qwer605.github.io/FartoviyWeb/.
  PNG и SVG содержат этот же адрес GitHub Pages.

Служебные каталоги
  node_modules/ — установленные зависимости.
  .angular/ — автоматически создаваемый кеш Angular.

Для открытия сайта через QR используйте https://qwer605.github.io/FartoviyWeb/.
Фотографии: Unsplash.
