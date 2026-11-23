export type Currency = 'EUR';

export interface Product {
  id: string;
  name: string;
  category: string;
  label: string;
  price: number;
  currency?: Currency;
  image: string;
  gallery?: string[];
  source?: string;
  inspiration?: string;
  sizes: string[];
  description: string;
}

export const CHECKER_BAG_ID = 'checker-bag';
export const checkerBag: Product = {
  id: CHECKER_BAG_ID,
  name: 'Louis Vuitton Galliera Damier Azur',
  category: 'accessories',
  label: 'Сумки',
  price: 3490,
  currency: 'EUR',
  inspiration: '«Сплетница»',
  image: 'assets/checker-bag.jpg',
  sizes: ['Единый'],
  description: 'Плечевая сумка с мягким силуэтом хобо, светлой шахматной канвой Damier Azur и отделкой из кожи натурального оттенка. Регулируемый ремень крепится на металлических кольцах, а спереди закреплена табличка Louis Vuitton Inventeur. Модель Galliera появилась в линейке Louis Vuitton в 2008 году.'
};

const legacyProducts: Product[] = [
  {
    "id": "runner",
    "name": "Кроссовки Red Runner",
    "category": "shoes",
    "label": "Кроссовки",
    "price": 6490,
    "image": "assets/sneakers.jpg",
    "sizes": [
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43"
    ],
    "description": "Яркий акцент для повседневных маршрутов. Лёгкий верх, мягкая стелька и гибкая подошва — для долгих прогулок и больших планов."
  },
  {
    "id": "essential",
    "name": "Футболка Essential",
    "category": "clothing",
    "label": "Футболки",
    "price": 1990,
    "image": "assets/tshirt.jpg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Та самая белая футболка, с которой начинается гардероб. Мягкий хлопок, свободная посадка и минимум деталей. Легко сочетается со всем, что вам нравится."
  },
  {
    "id": "everyday",
    "name": "Рюкзак Everyday",
    "category": "accessories",
    "label": "Рюкзаки",
    "price": 4290,
    "image": "assets/backpack.jpg",
    "sizes": [
      "Единый"
    ],
    "description": "Всё нужное — с собой. Вместительное основное отделение, удобные лямки и лаконичный дизайн для города, работы и спонтанных поездок."
  },
  {
    "id": "comfort",
    "name": "Худи Comfort Club",
    "category": "clothing",
    "label": "Худи и свитшоты",
    "price": 3990,
    "image": "assets/hoodie.jpg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Ваш личный режим комфорта. Объёмный крой, уютный капюшон и мягкая ткань. Для прохладных вечеров и дней, когда хочется просто быть собой."
  },
  {
    "id": "sunday",
    "name": "Очки Sunday Mood",
    "category": "accessories",
    "label": "Солнцезащитные очки",
    "price": 2490,
    "image": "assets/sunglasses.jpg",
    "sizes": [
      "Единый"
    ],
    "description": "Немного солнца в повседневных образах. Выразительная оправа в тёплом оттенке и удобная посадка — для прогулок без спешки."
  },
  {
    "id": "urban",
    "name": "Куртка Urban Layer",
    "category": "clothing",
    "label": "Верхняя одежда",
    "price": 7990,
    "image": "assets/jacket.jpg",
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Ещё один любимый слой. Универсальная куртка свободного силуэта для переменчивой погоды и многослойных сочетаний."
  },
  {
    "id": "daily",
    "name": "Кроссовки Daily Step",
    "category": "shoes",
    "label": "Кроссовки",
    "price": 5490,
    "image": "assets/sneakers-white.jpg",
    "sizes": [
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42"
    ],
    "description": "Классическая форма и спокойные оттенки. Удобная пара на каждый день, которая одинаково хорошо смотрится с джинсами и свободными брюками."
  },
  {
    "id": "mini",
    "name": "Сумка Mini Story",
    "category": "accessories",
    "label": "Сумки",
    "price": 3490,
    "image": "assets/bag.jpg",
    "sizes": [
      "Единый"
    ],
    "description": "Маленькая сумка для важных мелочей. Компактная форма, аккуратная фурнитура и характер, который завершает образ."
  }
];

export const legacyProductIds = new Set(legacyProducts.map(product => product.id));

interface ArchiveEntry {
  id: string;
  name: string;
  category: 'accessories' | 'clothing' | 'shoes';
  price: number;
  source: string;
  description: string;
  photos: string[];
}

const archiveEntries: ArchiveEntry[] = [
  {
    id: 'chloe-tourist-bag-blue', name: 'Chloe tourist bag blue', category: 'accessories',
    price: 4300, source: '“Friends” 1998', photos: ['19-16', '19-18', '19-20'],
    description: 'Мягкая сумка из тёмно-синего денима с карамельной отделкой и прошитым логотипом Chloé у основания. Изогнутая молния повторяет линию верха, а тонкая ручка поддерживает округлый силуэт.'
  },
  {
    id: 'cartier-coach-bag', name: 'Cartier coach bag', category: 'accessories',
    price: 6700, source: '“Desperate Housewives”', photos: ['19-24', '19-26', '19-28'],
    description: 'Чёрная сумка вытянутой прямоугольной формы с широким клапаном и двумя длинными ручками. На гладкой поверхности вытеснены переплетённые буквы C разного размера. Ручки продолжаются вертикальными полосами по корпусу.'
  },
  {
    id: 'damani-royal-leather-jacket', name: 'Damani Royal leather jacket', category: 'clothing',
    price: 3890, source: '“New York shadows: 2”', photos: ['19-31', '19-33', '19-36'],
    description: 'Чёрная кожаная куртка в стиле бомбера с отложным воротником, молнией и наклонными карманами. Белый кант подчёркивает линии рукавов и спины. На спине крупная аппликация Damani Dada с эмблемой в виде короны, а манжеты и пояс выполнены из трикотажа в рубчик.'
  },
  {
    id: 'vintage-gucci-chuck-loafers', name: 'Vintage Gucci Chuck loafers', category: 'shoes',
    price: 4200, source: '“Gossip Girl”', photos: ['19-38', '19-41', '19-43'],
    description: 'Лоферы из чёрно-коричневого тканого материала с клетчатым рисунком и коричневой фактурной окантовкой. На подъёме металлическая пряжка Horsebit золотистого цвета, характерная для семейства лоферов, которое Gucci представил в 1953 году.'
  },
  {
    id: 'dolce-gabbana-vintage-vine-clutch-2002', name: 'Dolce&Gabbana vintage vine clutch 2002', category: 'accessories',
    price: 8300, source: '“Sex and the City”', photos: ['19-46', '19-48', '19-50', '19-55'],
    description: 'Винный вечерний клатч с глянцевой поверхностью, мягкими складками по бокам и тонкой цепочкой. Жёсткая металлическая рамка закрывается прямоугольной защёлкой с гравировкой Dolce & Gabbana.'
  },
  {
    id: 'damiano-murray-midnight-heels', name: 'Damiano Murray Midnight Heels', category: 'shoes',
    price: 1300, source: '“101 Dalmatians” (1996) · Cruella de Vil', photos: ['19-57', '20-00', '20-02'],
    description: 'Чёрные ботильоны с округлым носком и высоким тонким каблуком. Гладкие панели спереди переходят в полосы с лаковым блеском и тиснением под рептилию на боковых деталях и пятке.'
  },
  {
    id: 'hermes-birkin-bag-30', name: 'Hermes Birkin bag 30', category: 'accessories',
    price: 43000, source: '“Life of Kelly Resenfort”', photos: ['20-04', '20-06', '20-08'],
    description: 'Birkin 30 из ярко-оранжевой кожи с выраженным зерном. Две округлые ручки, клапан с вырезами вокруг их оснований и кожаные ремешки с поворотной застёжкой формируют узнаваемый силуэт Birkin, названной в честь Джейн Биркин.'
  },
  {
    id: 'twinset-simona-flower-evolution-heels', name: 'Twinset Simona “flower evolution” heels', category: 'shoes',
    price: 890, source: '“Kinda crazy girl” 2016', photos: ['20-10', '20-12', '20-14'],
    description: 'Изумрудные лодочки Twinset Simona Barbieri с блестящим покрытием, закрытым носком на небольшой платформе и высоким тонким каблуком. Прозрачные камни в форме лепестков собраны в цветок над носком.'
  },
  {
    id: 'hermes-birkin-bag-25', name: 'Hermes Birkin bag 25', category: 'accessories',
    price: 22000, source: '“Gossip Girl”', photos: ['20-15', '20-17', '20-19'],
    description: 'Компактная чёрная Birkin 25 из гладкой кожи с короткими округлыми ручками. Два узких ремешка проходят по клапану, а поворотную застёжку дополняет небольшой навесной замок серебристого цвета.'
  },
  {
    id: 'marskin-yellow-heel-slippers', name: 'Marskin yellow heel slippers', category: 'shoes',
    price: 990, source: '“Summer holidays”', photos: ['20-20', '20-22', '20-24'],
    description: 'Ярко-жёлтые мюли с открытым носком, широкой перемычкой и открытой пяткой. Бархатистая фактура верха повторяется на платформе и высоком квадратном каблуке.'
  }
];

const archiveLabels: Record<ArchiveEntry['category'], string> = {
  accessories: 'Сумки',
  clothing: 'Верхняя одежда',
  shoes: 'Обувь'
};

export const archiveProducts: Product[] = archiveEntries.map(({ id, name, category, price, source, description, photos }) => {
  const [image, ...gallery] = photos.map(photo => `assets/new/${encodeURIComponent(name)}/photo_2026-11-23_12-${photo}.jpg`);
  return {
    id, name, category, price, source, description, image, gallery,
    label: archiveLabels[category],
    currency: 'EUR',
    sizes: [category === 'accessories' ? 'Единый' : 'Размер не указан']
  };
});

export const collectionProducts: Product[] = [checkerBag, ...archiveProducts];
export const products: Product[] = [...legacyProducts, ...collectionProducts];
