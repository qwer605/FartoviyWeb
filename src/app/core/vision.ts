export const INPUT_SIZE = 640;

export interface ImageGeometry { width: number; height: number; }
export interface Detection { classId: number; confidence: number; x: number; y: number; width: number; height: number; }

// COCO class order used by the bundled YOLOv10 model: English, Russian, Ukrainian.
export const OBJECT_LABELS = [
  ['person', 'человек', 'людина'], ['bicycle', 'велосипед', 'велосипед'],
  ['car', 'автомобиль', 'автомобіль'], ['motorcycle', 'мотоцикл', 'мотоцикл'],
  ['airplane', 'самолёт', 'літак'], ['bus', 'автобус', 'автобус'],
  ['train', 'поезд', 'потяг'], ['truck', 'грузовик', 'вантажівка'],
  ['boat', 'лодка', 'човен'], ['traffic light', 'светофор', 'світлофор'],
  ['fire hydrant', 'пожарный гидрант', 'пожежний гідрант'], ['stop sign', 'знак стоп', 'знак стоп'],
  ['parking meter', 'паркомат', 'паркомат'], ['bench', 'скамейка', 'лавка'],
  ['bird', 'птица', 'птах'], ['cat', 'кот', 'кіт'], ['dog', 'собака', 'собака'],
  ['horse', 'лошадь', 'кінь'], ['sheep', 'овца', 'вівця'], ['cow', 'корова', 'корова'],
  ['elephant', 'слон', 'слон'], ['bear', 'медведь', 'ведмідь'],
  ['zebra', 'зебра', 'зебра'], ['giraffe', 'жираф', 'жирафа'],
  ['backpack', 'рюкзак', 'рюкзак'], ['umbrella', 'зонт', 'парасолька'],
  ['handbag', 'сумка', 'сумка'], ['tie', 'галстук', 'краватка'],
  ['suitcase', 'чемодан', 'валіза'], ['frisbee', 'фрисби', 'фрисбі'],
  ['skis', 'лыжи', 'лижі'], ['snowboard', 'сноуборд', 'сноуборд'],
  ['sports ball', 'мяч', 'м’яч'], ['kite', 'воздушный змей', 'повітряний змій'],
  ['baseball bat', 'бейсбольная бита', 'бейсбольна бита'],
  ['baseball glove', 'бейсбольная перчатка', 'бейсбольна рукавичка'],
  ['skateboard', 'скейтборд', 'скейтборд'], ['surfboard', 'доска для сёрфинга', 'дошка для серфінгу'],
  ['tennis racket', 'теннисная ракетка', 'тенісна ракетка'], ['bottle', 'бутылка', 'пляшка'],
  ['wine glass', 'бокал', 'келих'], ['cup', 'чашка', 'чашка'], ['fork', 'вилка', 'виделка'],
  ['knife', 'нож', 'ніж'], ['spoon', 'ложка', 'ложка'], ['bowl', 'миска', 'миска'],
  ['banana', 'банан', 'банан'], ['apple', 'яблоко', 'яблуко'], ['sandwich', 'сэндвич', 'сендвіч'],
  ['orange', 'апельсин', 'апельсин'], ['broccoli', 'брокколи', 'броколі'],
  ['carrot', 'морковь', 'морква'], ['hot dog', 'хот-дог', 'хот-дог'],
  ['pizza', 'пицца', 'піца'], ['donut', 'пончик', 'пончик'], ['cake', 'торт', 'торт'],
  ['chair', 'стул', 'стілець'], ['couch', 'диван', 'диван'],
  ['potted plant', 'растение в горшке', 'рослина в горщику'], ['bed', 'кровать', 'ліжко'],
  ['dining table', 'обеденный стол', 'обідній стіл'], ['toilet', 'унитаз', 'унітаз'],
  ['tv', 'телевизор', 'телевізор'], ['laptop', 'ноутбук', 'ноутбук'],
  ['mouse', 'мышь', 'миша'], ['remote', 'пульт', 'пульт'],
  ['keyboard', 'клавиатура', 'клавіатура'], ['cell phone', 'телефон', 'телефон'],
  ['microwave', 'микроволновка', 'мікрохвильова піч'], ['oven', 'духовка', 'духовка'],
  ['toaster', 'тостер', 'тостер'], ['sink', 'раковина', 'раковина'],
  ['refrigerator', 'холодильник', 'холодильник'], ['book', 'книга', 'книга'],
  ['clock', 'часы', 'годинник'], ['vase', 'ваза', 'ваза'], ['scissors', 'ножницы', 'ножиці'],
  ['teddy bear', 'плюшевый медведь', 'плюшевий ведмедик'],
  ['hair drier', 'фен', 'фен'], ['toothbrush', 'зубная щётка', 'зубна щітка']
] as const;

export function resizedGeometry(width: number, height: number): ImageGeometry {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new Error('Invalid image dimensions');
  }
  const scale = INPUT_SIZE / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function rgbaToTensor(rgba: Uint8ClampedArray): Float32Array {
  const count = INPUT_SIZE * INPUT_SIZE;
  if (rgba.length !== count * 4) throw new Error('Unexpected image buffer size');
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    data[i] = rgba[i * 4] / 255;
    data[count + i] = rgba[i * 4 + 1] / 255;
    data[count * 2 + i] = rgba[i * 4 + 2] / 255;
  }
  return data;
}

export function decodeDetections(data: ArrayLike<number>, dims: readonly number[], geometry: ImageGeometry): Detection[] {
  // This pinned export returns NMS-free [x1, y1, x2, y2, score, class] rows.
  if (dims.length !== 3 || dims[0] !== 1 || dims[2] !== 6 || data.length !== dims[1] * 6) {
    throw new Error('Unexpected YOLOv10 output shape');
  }
  const result: Detection[] = [];
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  for (let i = 0; i < data.length; i += 6) {
    const confidence = data[i + 4];
    const classId = data[i + 5];
    if (confidence < 0.3 || confidence > 1 || !Number.isFinite(confidence)
      || !Number.isInteger(classId) || classId < 0 || classId >= OBJECT_LABELS.length) continue;
    const coordinates = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (!coordinates.every(Number.isFinite)) continue;
    const [x1, y1, x2, y2] = coordinates;
    const x = clamp(x1 / geometry.width);
    const y = clamp(y1 / geometry.height);
    const width = clamp(x2 / geometry.width) - x;
    const height = clamp(y2 / geometry.height) - y;
    if (width > 0 && height > 0) result.push({ classId, confidence, x, y, width, height });
  }
  return result.sort((a, b) => b.confidence - a.confidence).slice(0, 30);
}
