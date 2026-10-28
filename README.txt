FARTOVIY — Angular-каталог

Запуск
  Node.js 22.18+
  npm ci
  npm start
  http://localhost:4200

Реализовано пять компонентов
  1. Каталог: список всех товаров.
  2. Карточка товара: фото, название, цена и переход к товару.
  3. Страница товара: описание, выбор размера и добавление в корзину.
  4. Корзина: количество, удаление, сумма и сохранение в браузере.
  5. Распознавание: фото или снимок с камеры, рамки и список найденных объектов.

Каждый компонент standalone, со своими HTML и CSS:
  src/app/pages/catalog.ts / .html / .css
  src/app/shared/product-card.ts / .html / .css
  src/app/pages/product.ts / .html / .css
  src/app/pages/cart.ts / .html / .css
  src/app/pages/recognize.ts / .html / .css

Оболочка и навигация: src/app/app.ts / .html / .css
Товары и корзина: src/app/core/catalog.ts, store.ts
Переводы EN/RU/УКР: src/app/core/i18n.ts, translations.ts
Выбор языка: src/app/core/language.ts
Фотографии: public/assets/

Язык интерфейса
  При первом посещении выбирается первый поддерживаемый язык из настроек браузера.
  Поддерживаются английский (en), русский (ru) и украинский (uk), включая ru-RU/uk-UA.
  Если подходящего языка нет, используется английский.
  Ручной выбор EN/RU/УКР сохраняется и имеет приоритет при следующих посещениях.
  Автоматически выбранный язык не записывается как ручное предпочтение.
  Старое значение fartoviy-language игнорируется: оно сохраняло и автоматический RU.
  Проверка выбора языка и переводов: npm test.

Распознавание в браузере
  Откройте вкладку Recognition / Распознавание / Розпізнавання.
  Загрузите JPG, PNG или WebP до 20 МБ (до 40 мегапикселей),
  сделайте снимок с камеры или нажмите «Попробовать пример», затем «Распознать».
  Адрес после публикации: https://qwer605.github.io/FartoviyWeb/#/recognize
  Фото и кадры обрабатываются локально и не отправляются на сервер.
  Камера требует HTTPS либо localhost и разрешение пользователя.
  После снимка, закрытия камеры или ухода со страницы видеопоток останавливается.
  Модель YOLOv10n uint8 (2,65 МБ) и ONNX Runtime Web WASM загружаются
  с того же сайта по запросу; суммарный размер файлов около 18 МБ до сжатия.
  Вычисления выполняются в Web Worker на CPU без требований COOP/COEP.
  Уверенность от 30%, максимум 30 рамок. Возможны ошибки распознавания.
  Поддерживаются 80 классов COCO, включая людей, рюкзаки и сумки.
  Это не поиск конкретных товаров: для одежды, обуви и SKU нужна другая модель.
  Источник, версия, SHA256 и лицензия модели: public/models/README.txt.
  Обработка изображения и координат: src/app/core/vision.ts.
  Загрузка и запуск модели: src/app/core/detector.ts, detector.worker.ts.

Проверки
  npm test — переводы, выбор языка, RGB-вход, рамки и SHA256 модели.
  npm run build -- --base-href /FartoviyWeb/
  npx playwright install chromium
  npm run test:e2e — реальный ONNX/WASM, камера, ошибки и мобильная вёрстка.
  Для установленного Edge в PowerShell: $env:PLAYWRIGHT_CHANNEL='msedge'
  Браузерные тесты используют production-сборку dist/ и путь /FartoviyWeb/.

Глобального CSS нет. Баннеры, иконки, избранное и демооплата не реализованы.
Цены демонстрационные, в условных единицах; доставки нет.

Сборка
  npm run build
  Результат: dist/index.html и соседние файлы.
  При сборке dist/ пересоздаётся; редактировать нужно src/.

CI/CD FE в GitHub Actions и GitHub Pages
  Workflow: .github/workflows/fe-ci.yml.
  Запускается при push в quality/main и при создании или обновлении PR в main.
  Устанавливает Node.js 22, выполняет npm ci, npm test и production-сборку npm run build.
  Затем запускает браузерные проверки распознавания в Chromium.
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
