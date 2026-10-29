export const INPUT_SIZE = 640;

export interface ImageGeometry { width: number; height: number; padX: number; padY: number; }
export interface Detection {
  classId: number; confidence: number; x: number; y: number; width: number; height: number;
  mask: { width: number; height: number; data: Uint8Array };
}

// COCO class order used by the bundled YOLO26-seg model: English, Russian, Ukrainian.
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
  const resizedWidth = Math.max(1, Math.round(width * scale));
  const resizedHeight = Math.max(1, Math.round(height * scale));
  return { width: resizedWidth, height: resizedHeight,
    padX: Math.floor((INPUT_SIZE - resizedWidth) / 2), padY: Math.floor((INPUT_SIZE - resizedHeight) / 2) };
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

export function decodeSegments(data: ArrayLike<number>, dims: readonly number[], prototypes: ArrayLike<number>,
  protoDims: readonly number[], geometry: ImageGeometry, threshold = .25,
  classIds: readonly number[] = OBJECT_LABELS.map((_, index) => index)): Detection[] {
  // Pinned official end-to-end export: [1,300,6+32] and [1,32,160,160]. No NMS.
  if (dims.length !== 3 || dims[0] !== 1 || dims[2] !== 38 || data.length !== dims[1] * 38
    || protoDims.length !== 4 || protoDims[0] !== 1 || protoDims[1] !== 32
    || protoDims[2] !== 160 || protoDims[3] !== 160 || prototypes.length !== 32 * 160 * 160) {
    throw new Error('Unexpected YOLO26 segmentation output shape');
  }
  if (!Number.isFinite(threshold) || threshold < .1 || threshold > .8
    || ![geometry.width, geometry.height, geometry.padX, geometry.padY].every(Number.isInteger)
    || geometry.width <= 0 || geometry.height <= 0 || geometry.padX < 0 || geometry.padY < 0
    || geometry.width + geometry.padX > INPUT_SIZE || geometry.height + geometry.padY > INPUT_SIZE) {
    throw new Error('Invalid segmentation geometry or threshold');
  }
  const candidates: { offset: number; box: Omit<Detection, 'mask'>; bounds: number[] }[] = [];
  const result: Detection[] = [];
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  for (let i = 0; i < data.length; i += 38) {
    const confidence = data[i + 4];
    const modelClassId = data[i + 5];
    const classId = classIds[modelClassId];
    if (confidence < threshold || confidence > 1 || !Number.isFinite(confidence)
      || !Number.isInteger(modelClassId) || modelClassId < 0 || modelClassId >= classIds.length
      || !Number.isInteger(classId) || classId < 0 || classId >= OBJECT_LABELS.length) continue;
    const coordinates = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (!coordinates.every(Number.isFinite) || !Array.from({ length: 32 }, (_, c) => data[i + 6 + c]).every(Number.isFinite)) continue;
    const [x1, y1, x2, y2] = coordinates;
    const x = clamp((x1 - geometry.padX) / geometry.width);
    const y = clamp((y1 - geometry.padY) / geometry.height);
    const width = clamp((x2 - geometry.padX) / geometry.width) - x;
    const height = clamp((y2 - geometry.padY) / geometry.height) - y;
    if (width > 0 && height > 0) candidates.push({ offset: i, box: { classId, confidence, x, y, width, height }, bounds: coordinates });
  }
  for (const candidate of candidates.sort((a, b) => b.box.confidence - a.box.confidence)) {
    const mask = new Uint8Array(160 * 160);
    const [x1, y1, x2, y2] = candidate.bounds;
    const left = Math.max(0, Math.ceil(Math.max(x1, geometry.padX) / 4 - .5));
    const top = Math.max(0, Math.ceil(Math.max(y1, geometry.padY) / 4 - .5));
    const right = Math.min(160, Math.ceil(Math.min(x2, geometry.padX + geometry.width) / 4 - .5));
    const bottom = Math.min(160, Math.ceil(Math.min(y2, geometry.padY + geometry.height) / 4 - .5));
    let pixels = 0;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const pixel = y * 160 + x;
        let logit = 0;
        for (let channel = 0; channel < 32; channel++) logit += data[candidate.offset + 6 + channel] * prototypes[channel * 160 * 160 + pixel];
        // sigmoid(logit) > .5 is equivalent to logit > 0.
        if (Number.isFinite(logit) && logit > 0) { mask[pixel] = 255; pixels++; }
      }
    }
    if (pixels) result.push({ ...candidate.box, mask: { width: 160, height: 160, data: mask } });
    if (result.length === 30) break;
  }
  return result;
}

/** Paint only predicted mask pixels; confidence order resolves overlapping instances. */
export function maskOverlay(detections: readonly Detection[]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(160 * 160 * 4);
  const colors = [[0, 164, 126], [38, 121, 230], [230, 125, 20], [164, 66, 213], [214, 55, 100]];
  for (const detection of [...detections].sort((a, b) => a.confidence - b.confidence)) {
    const { data, width, height } = detection.mask;
    if (width !== 160 || height !== 160 || data.length !== width * height) throw new Error('Invalid display mask');
    const color = colors[detection.classId % colors.length];
    for (let pixel = 0; pixel < data.length; pixel++) {
      if (!data[pixel]) continue;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const boundary = x === 0 || y === 0 || x === width - 1 || y === height - 1
        || !data[pixel - 1] || !data[pixel + 1] || !data[pixel - width] || !data[pixel + width];
      pixels.set([...color, boundary ? 230 : 100], pixel * 4);
    }
  }
  return pixels;
}
