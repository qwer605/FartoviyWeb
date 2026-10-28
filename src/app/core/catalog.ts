export interface Product {
  id: string;
  name: string;
  category: string;
  label: string;
  price: number;
  image: string;
  sizes: string[];
  description: string;
}

export const products: Product[] = [
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
