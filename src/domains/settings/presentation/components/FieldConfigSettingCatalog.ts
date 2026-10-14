import type { FieldConfig, FieldConfigOverrides } from '@/domains/spaces/presentation/field/fieldConfig';

export type FieldConfigNumberSetting = {
  readonly kind: 'number';
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly digits?: number;
};

export type FieldConfigBooleanSetting = {
  readonly kind: 'boolean';
  readonly path: string;
  readonly label: string;
  readonly description: string;
};

export type FieldConfigColorSetting = {
  readonly kind: 'color';
  readonly path: string;
  readonly label: string;
  readonly description: string;
};

export type FieldConfigSetting =
  | FieldConfigNumberSetting
  | FieldConfigBooleanSetting
  | FieldConfigColorSetting;

export type FieldConfigSettingGroup = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly settings: readonly FieldConfigSetting[];
};

function numberSetting(
  path: string,
  label: string,
  description: string,
  min: number,
  max: number,
  step: number,
  digits?: number,
): FieldConfigNumberSetting {
  return {
    kind: 'number',
    path,
    label,
    description,
    min,
    max,
    step,
    ...(digits === undefined ? {} : { digits }),
  };
}

function booleanSetting(
  path: string,
  label: string,
  description: string,
): FieldConfigBooleanSetting {
  return { kind: 'boolean', path, label, description };
}

function colorSetting(
  path: string,
  label: string,
  description: string,
): FieldConfigColorSetting {
  return { kind: 'color', path, label, description };
}

const n = numberSetting;
const b = booleanSetting;
const c = colorSetting;

/**
 * Searchable developer-facing catalog for every leaf in DEFAULT_FIELD_CONFIG.
 * Numeric ranges are editing bounds for the UI, not validation rules for the config model.
 */
export const FIELD_CONFIG_SETTING_GROUPS: readonly FieldConfigSettingGroup[] = [
  {
    id: 'grid',
    title: 'Сетка',
    description: 'Размеры ячеек и базовая геометрия поля.',
    settings: [
      n('grid.cellSizePx', 'Размер ячейки', 'Ширина и высота внутренней области ячейки без разделительной линии, px.', 20, 160, 1),
      n('grid.dividerWidthPx', 'Толщина разделителя', 'Ширина линии между ячейками, px. Меняет расстояние между ячейками даже при скрытых линиях.', 0, 8, 1),
      b('grid.showDividers', 'Показывать divider', 'Включает или скрывает линии между ячейками, не меняя размеры и расположение сетки.'),
      n('grid.centerCols', 'Центральные колонки', 'Число колонок в центральной полосе сетки.', 1, 40, 1),
      n('grid.sideExtraCols', 'Колонки по сторонам', 'Количество дополнительных колонок с каждой стороны.', 0, 100, 1),
      n('grid.rows', 'Количество рядов', 'Число рядов сетки по глубине.', 1, 60, 1),
    ],
  },
  {
    id: 'chunks',
    title: 'Поток чанков',
    description: 'Сколько сегментов поля подготавливается вокруг камеры и с какой скоростью.',
    settings: [
      n('chunks.cols', 'Колонки в чанке', 'Количество колонок, составляющих один чанк.', 1, 40, 1),
      n('chunks.behind', 'Чанки позади', 'Сколько чанков сохраняется позади текущего положения камеры.', 0, 8, 1),
      n('chunks.ahead', 'Чанки впереди', 'Сколько чанков поля поддерживается впереди камеры.', 1, 12, 1),
      n('chunks.lookAheadPx', 'Дистанция look-ahead', 'Сдвиг точки планирования чанков вперёд камеры, мировые px.', 0, 4000, 25),
      n('chunks.prefetchExtraAhead', 'Доп. чанки предзагрузки', 'Сколько чанков подготавливать сверх видимого окна.', 0, 8, 1),
      n('chunks.gpuUploadSteady', 'GPU-загрузки за кадр', 'Лимит GPU-загрузок в штатном режиме за один кадр. Минимум 1 нужен, чтобы новые чанки не оставались неподготовленными.', 1, 8, 1),
      n('chunks.lineZLift', 'Высота линий сетки', 'Подъём линий сетки по оси Z относительно поверхности.', -2, 10, 0.1, 1),
    ],
  },
  {
    id: 'wave',
    title: 'Волна касания',
    description: 'Пиксельная волна, которая появляется при нажатии или удержании ячейки.',
    settings: [
      n('wave.sizePx', 'Диаметр волны', 'Максимальный диаметр распространения волны, px.', 8, 500, 4),
      n('wave.pixelSizePx', 'Размер пикселя волны', 'Размер одного логического пикселя при растеризации волны.', 1, 32, 1),
      n('wave.maxAlpha', 'Максимальная непрозрачность', 'Пиковая непрозрачность волны от 0 до 1.', 0, 1, 0.01, 2),
      n('wave.durationSec', 'Длительность', 'Полное время жизни волны в секундах.', 0.05, 4, 0.05, 2),
      n('wave.fadeInEnd', 'Конец появления', 'Доля времени жизни, отведённая на fade-in, от 0 до 1.', 0, 1, 0.01, 2),
      n('wave.fadeOutStart', 'Начало исчезновения', 'Доля времени жизни, после которой начинается fade-out.', 0, 1, 0.01, 2),
    ],
  },
  {
    id: 'camera',
    title: 'Камера',
    description: 'Начальная позиция, перспективная проекция, движение и инерция камеры.',
    settings: [
      n('camera.position.x', 'Начальная позиция X', 'Горизонтальная координата камеры в мировых единицах.', -5000, 5000, 10),
      n('camera.position.y', 'Начальная позиция Y', 'Координата камеры по глубине в мировых единицах.', -5000, 5000, 10),
      n('camera.position.z', 'Начальная позиция Z', 'Высота камеры в мировых единицах.', -1000, 5000, 10),
      n('camera.rotationDeg.x', 'Поворот X', 'Начальный угол вращения вокруг оси X, градусы.', -180, 180, 1),
      n('camera.rotationDeg.y', 'Поворот Y', 'Начальный угол вращения вокруг оси Y, градусы.', -180, 180, 1),
      n('camera.rotationDeg.z', 'Поворот Z', 'Начальный угол вращения вокруг оси Z, градусы.', -180, 180, 1),
      n('camera.fov', 'Поле зрения', 'Вертикальный угол перспективной камеры, градусы.', 10, 120, 1),
      n('camera.near', 'Ближняя плоскость', 'Минимальная глубина рендеринга камеры, мировые единицы; всегда должна быть меньше far.', 0.01, 99, 0.1, 2),
      n('camera.far', 'Дальняя плоскость', 'Максимальная глубина рендеринга камеры, мировые единицы.', 100, 60000, 100),
      n('camera.framingMargin', 'Запас кадрирования', 'Добавляет свободное пространство вокруг поля при автоматическом расчёте кадра. В текущем режиме с фиксированной камерой напрямую не используется.', 1, 3, 0.01, 2),
      n('camera.framingElevationDeg', 'Высота кадрирования', 'Угол камеры над полем при автоматическом расчёте кадра. В текущем режиме с фиксированной камерой напрямую не используется.', 0, 90, 1),
      n('camera.moveStepPx', 'Шаг перемещения', 'Базовое перемещение за один шаг управления камерой, px.', 0.1, 100, 0.5, 1),
      n('camera.rotateStepDeg', 'Шаг вращения', 'Угол поворота камеры за одну команду, градусы.', 0.1, 45, 0.5, 1),
      n('camera.holdRampMs', 'Разгон удержания', 'Время разгона повторного движения при удержании, мс.', 0, 10000, 50),
      n('camera.holdMaxStep', 'Максимальный шаг удержания', 'Верхний множитель движения при длительном удержании.', 1, 100, 1),
      n('camera.swipeInertiaSpeedScale', 'Множитель инерции свайпа', 'Множитель скорости камеры, полученной из жеста свайпа.', 0, 5, 0.05, 2),
      n('camera.swipeInertiaMaxSpeed', 'Максимальная скорость инерции', 'Ограничение скорости камеры после отпускания свайпа, единиц/с.', 0, 10000, 100),
      n('camera.swipeInertiaDrag', 'Сопротивление инерции', 'Коэффициент торможения после свайпа. Должен быть больше 0 и меньше 1.', 0.01, 0.99, 0.01, 2),
      n('camera.swipeInertiaStopSpeed', 'Порог остановки инерции', 'Инерция останавливается ниже этой скорости, единиц/с.', 0, 20, 0.1, 1),
      n('camera.swipeFrameDeltaMaxSec', 'Макс. шаг симуляции', 'Максимальный delta времени для расчёта инерции, секунды.', 0.001, 0.25, 0.005, 3),
      n('camera.hudPublishMs', 'Частота обновления HUD', 'Минимальный интервал обновления состояния камеры для HUD, мс.', 16, 1000, 16),
      n('camera.activeAxisHighlightMs', 'Подсветка активной оси', 'Длительность временной подсветки оси мира, мс.', 0, 5000, 50),
    ],
  },
  {
    id: 'labels',
    title: 'Подписи ячеек',
    description: 'Масштаб, отступы и высота текстовых подписей.',
    settings: [
      n('labels.scale', 'Масштаб подписи', 'Общий множитель размера подписи.', 0.1, 5, 0.1, 1),
      n('labels.padding', 'Внутренний отступ', 'Отступ пикселей подписи от границы текстуры.', 0, 32, 1),
      n('labels.raise', 'Подъём над поверхностью', 'Высота текста над плоскостью поля, мировые единицы.', 0, 100, 1),
      n('labels.activeCenterSize', 'Размер центра активной ячейки', 'Размер маркера центра активной ячейки, px.', 0, 40, 1),
      n('labels.activeBorder', 'Толщина границы', 'Толщина границы активной ячейки или маркера, px.', 0, 10, 1),
    ],
  },
  {
    id: 'activeCells',
    title: 'Активные ячейки',
    description: 'Цвета и размер области подсвеченных ячеек.',
    settings: [
      n('activeCells.sideSpan', 'Область соседних ячеек', 'Количество рядов/колонок вокруг фокуса для боковой подсветки.', 0, 20, 1),
      c('activeCells.fillHex', 'Цвет заливки', 'HEX-цвет фона подсвеченных соседних ячеек.'),
      c('activeCells.centerHex', 'Цвет центра', 'HEX-цвет центрального маркера активной ячейки.'),
      c('activeCells.labelTextHex', 'Цвет текста', 'HEX-цвет подписей в активных ячейках.'),
    ],
  },
  {
    id: 'axes',
    title: 'Отладочные оси',
    description: 'Геометрия и порядок отрисовки вспомогательных мировых осей.',
    settings: [
      n('axes.length', 'Длина оси', 'Полная длина каждой отладочной оси, мировые единицы.', 0, 1000, 10),
      n('axes.headLength', 'Длина наконечника', 'Длина стрелочного наконечника, мировые единицы.', 0, 250, 1),
      n('axes.headWidth', 'Ширина наконечника', 'Ширина стрелочного наконечника, мировые единицы.', 0, 200, 1),
      n('axes.originRadius', 'Радиус начала координат', 'Радиус сферы в начале мировых осей, мировые единицы.', 0, 100, 1),
      n('axes.liftZ', 'Высота осей', 'Сдвиг осей по Z над поверхностью поля.', -100, 100, 0.5, 1),
      n('axes.renderOrder', 'Порядок отрисовки', 'Приоритет рендеринга осей; большие значения рисуются позже.', -10000, 10000, 100),
    ],
  },
  {
    id: 'press',
    title: 'Нажатие и удержание',
    description: 'Порог распознавания долгого нажатия и задержка второй волны.',
    settings: [
      n('press.longPressMs', 'Порог долгого нажатия', 'Сколько нужно удерживать ячейку до long-press, мс.', 0, 2000, 10),
      n('press.secondBurstGapSec', 'Пауза между волнами', 'Интервал между первой и второй волной при удержании, секунды.', 0, 2, 0.01, 2),
    ],
  },
  {
    id: 'holdRepeat',
    title: 'Повтор движения',
    description: 'Интервалы непрерывного перемещения при удержании направления.',
    settings: [
      n('holdRepeat.tickMs', 'Интервал повтора', 'Время между повторными шагами движения, мс.', 8, 1000, 1),
      n('holdRepeat.startDelayMs', 'Задержка повтора', 'Пауза до начала повторного движения после первого нажатия, мс.', 0, 3000, 10),
    ],
  },
  {
    id: 'lighting',
    title: 'Общее освещение',
    description: 'Основной свет сцены и мягкая тёплая подсветка тёмных участков поля.',
    settings: [
      n('lighting.ambientIntensity', 'Ambient intensity', 'Интенсивность фонового освещения всей сцены.', 0, 4, 0.05, 2),
      n('lighting.directionalIntensity', 'Directional intensity', 'Интенсивность общего направленного света, отбрасывающего геометрические тени.', 0, 4, 0.05, 2),
      c('lighting.surfaceAmbientColor', 'Цвет подсветки поверхности', 'Тёплый оттенок слабого постоянного света, который не даёт чёрной поверхности проваливаться в полный чёрный.'),
      n('lighting.surfaceAmbientIntensity', 'Сила подсветки поверхности', 'Яркость постоянной фоновой подсветки в шейдере сетки. Небольшие значения сохраняют тёмную атмосферу.', 0, 0.15, 0.005, 3),
      n('lighting.directionalPosition.0', 'Позиция света X', 'Смещение направленного источника по X относительно камеры.', -2000, 2000, 10),
      n('lighting.directionalPosition.1', 'Позиция света Y', 'Смещение направленного источника по Y относительно камеры.', -2000, 2000, 10),
      n('lighting.directionalPosition.2', 'Позиция света Z', 'Высота направленного источника относительно камеры.', -2000, 2000, 10),
    ],
  },
  {
    id: 'objectGlow',
    title: 'Свечение объектов',
    description: 'Временный общий режим свечения и параметры локальных источников.',
    settings: [
      b('lighting.objectGlow.forceAllObjectsForTesting', 'Принудительно светить всеми объектами', 'Тестовый режим: выдаёт источник каждому объекту, пока API не передаёт параметры свечения.'),
      c('lighting.objectGlow.fallbackColor', 'Тестовый цвет свечения', 'HEX-цвет локального источника, используемый временным override.'),
      n('lighting.objectGlow.fallbackIntensity', 'Интенсивность свечения', 'Базовая интенсивность локального света до мерцания.', 0, 5, 0.05, 2),
      n('lighting.objectGlow.fallbackDistance', 'Радиус свечения', 'Расстояние затухания локального источника в мировых единицах.', 1, 2000, 10),
      n('lighting.objectGlow.heightAbovePlatform', 'Высота света над платформой', 'Положение локального света по высоте. Значение около верхней части спрайта даёт более естественное распространение света и уменьшает чрезмерно длинную зону перекрытия платформой.', 0.1, 64, 0.5, 1),
      n('lighting.objectGlow.decay', 'Затухание PointLight', 'Степень пространственного затухания локального источника.', 0, 4, 0.1, 1),
      n('lighting.objectGlow.minimumVisibleIntensity', 'Минимальная интенсивность', 'Источник скрывается, если после мерцания его интенсивность ниже порога.', 0, 1, 0.001, 3),
    ],
  },
  {
    id: 'flicker',
    title: 'Мерцание',
    description: 'Скорость и амплитуда медленных, средних и быстрых изменений яркости.',
    settings: [
      n('lighting.objectGlow.flicker.minMultiplier', 'Базовый множитель', 'Минимальный множитель яркости до добавления волн мерцания.', 0, 2, 0.01, 2),
      n('lighting.objectGlow.flicker.slowAmplitude', 'Амплитуда медленного слоя', 'Вклад медленных изменений в мерцание.', 0, 1, 0.01, 2),
      n('lighting.objectGlow.flicker.mediumAmplitude', 'Амплитуда среднего слоя', 'Вклад средних по скорости изменений яркости.', 0, 1, 0.01, 2),
      n('lighting.objectGlow.flicker.fastAmplitude', 'Амплитуда быстрого слоя', 'Вклад быстрых мелких изменений яркости.', 0, 1, 0.01, 2),
      n('lighting.objectGlow.flicker.slowIntervalMs', 'Интервал медленного слоя', 'Как часто меняется медленная составляющая, мс.', 1, 2000, 1),
      n('lighting.objectGlow.flicker.mediumIntervalMs', 'Интервал среднего слоя', 'Как часто меняется средняя составляющая, мс.', 1, 2000, 1),
      n('lighting.objectGlow.flicker.fastIntervalMs', 'Интервал быстрого слоя', 'Как часто меняется быстрая составляющая, мс.', 1, 2000, 1),
      n('lighting.objectGlow.flicker.roundingScale', 'Точность округления', 'Масштаб округления множителя: 100 оставляет две цифры после запятой.', 1, 1000, 1),
    ],
  },
  {
    id: 'pixelOverlay',
    title: 'Пиксельное свечение',
    description: 'Параметры стилизованного свечения, рисуемого поверх поверхности крупными пикселями.',
    settings: [
      n('lighting.objectGlow.pixelOverlay.pixelSizePx', 'Размер пикселя', 'Ширина и высота логического пикселя светового слоя.', 1, 64, 1),
      n('lighting.objectGlow.pixelOverlay.intensityScale', 'Множитель энергии', 'Множитель яркости перед расчётом цвета пиксельного слоя.', 0, 3, 0.01, 2),
      n('lighting.objectGlow.pixelOverlay.alphaScale', 'Множитель альфа', 'Переводит накопленную энергию света в непрозрачность.', 0, 3, 0.01, 2),
      n('lighting.objectGlow.pixelOverlay.maxAlpha', 'Максимальная альфа', 'Верхняя граница непрозрачности пиксельного свечения.', 0, 1, 0.01, 2),
      n('lighting.objectGlow.pixelOverlay.surfaceColorMix', 'Смешивание с поверхностью', 'Насколько сильно цвет свечения смешивается с уже нарисованными пикселями.', 0, 1, 0.01, 2),
    ],
  },
  {
    id: 'shadows',
    title: 'Тени',
    description: 'Мягкие общие тени и ограниченное число динамических теней от ближайших локальных огней.',
    settings: [
      n('lighting.shadows.mapSizePx', 'Разрешение общей карты теней', 'Ширина и высота карты теней направленного света; большее значение даёт более чистые края, но дороже.', 64, 1024, 64),
      n('lighting.shadows.localShadowLights', 'Локальных источников с тенями', 'Сколько ближайших локальных источников могут отбрасывать отдельные динамические тени на другие платформы. 0 отключает локальные тени; увеличение повышает нагрузку.', 0, 4, 1),
      n('lighting.shadows.localShadowMapSizePx', 'Разрешение локальных теней', 'Разрешение каждой из шести граней карты PointLight. Более высокие значения дают более чёткие тени, но заметно дороже.', 64, 256, 64),
      n('lighting.shadows.filterRadius', 'Мягкость краёв теней', 'Общий радиус фильтрации теней от платформ и объектов. Больше — шире и мягче край тени; слишком большое значение размывает мелкие детали.', 0, 10, 0.5, 1),
      n('lighting.shadows.cameraLeft', 'Граница камеры слева', 'Левая граница камеры общей карты теней, мировые единицы.', -5000, 5000, 50),
      n('lighting.shadows.cameraRight', 'Граница камеры справа', 'Правая граница камеры общей карты теней, мировые единицы.', -5000, 5000, 50),
      n('lighting.shadows.cameraTop', 'Граница камеры сверху', 'Верхняя граница камеры общей карты теней, мировые единицы.', -5000, 5000, 50),
      n('lighting.shadows.cameraBottom', 'Граница камеры снизу', 'Нижняя граница камеры общей карты теней, мировые единицы.', -5000, 5000, 50),
      n('lighting.shadows.cameraNear', 'Ближняя плоскость теней', 'Минимальная глубина общей shadow-камеры; должна быть меньше cameraFar.', 0.01, 99, 0.1, 2),
      n('lighting.shadows.cameraFar', 'Дальняя плоскость теней', 'Максимальная глубина общей shadow-камеры, мировые единицы.', 100, 30000, 100),
      n('lighting.shadows.bias', 'Bias теней', 'Сдвиг глубины, уменьшающий артефакты самозатенения; чрезмерное значение отрывает тень.', -0.01, 0.01, 0.0001, 4),
      n('lighting.shadows.normalBias', 'Normal bias теней', 'Дополнительный сдвиг глубины по нормали поверхности.', 0, 1, 0.005, 3),
      n('lighting.shadows.baselineIntensity', 'Базовая интенсивность теней', 'Интенсивность общей тени, когда локальные источники не видны.', 0, 1, 0.01, 2),
      n('lighting.shadows.minIntensity', 'Минимальная интенсивность теней', 'Нижняя граница интенсивности общей тени.', 0, 1, 0.01, 2),
      n('lighting.shadows.maxIntensity', 'Максимальная интенсивность теней', 'Верхняя граница интенсивности общей тени.', 0, 1, 0.01, 2),
      n('lighting.shadows.emitterSaturationIntensity', 'Насыщение от источников', 'Суммарная сила локальных источников, при которой ослабление общей тени от направленного света достигает максимума.', 0.01, 20, 0.1, 2),
      n('lighting.shadows.contrastScale', 'Масштаб контраста', 'Насколько локальные источники осветляют тень от общего направленного света; отдельные точечные источники по-прежнему отбрасывают собственные тени.', 0, 2, 0.01, 2),
    ],
  },
];

export function fieldConfigSettingValue(config: FieldConfig, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, config);
}

/** Build the smallest nested patch for a setting, preserving other values in vector tuples. */
export function buildFieldConfigSettingPatch(
  config: FieldConfig,
  path: string,
  value: unknown,
): FieldConfigOverrides {
  const segments = path.split('.');

  const build = (current: unknown, index: number): Record<string, unknown> => {
    const key = segments[index]!;
    if (index === segments.length - 1) return { [key]: value };

    if (current === null || typeof current !== 'object') {
      throw new Error(`Invalid FieldConfig setting path: ${path}`);
    }
    const source = (current as Record<string, unknown>)[key];
    const nextSegment = segments[index + 1]!;

    if (Array.isArray(source)) {
      const slot = Number(nextSegment);
      if (!Number.isInteger(slot) || slot < 0 || slot >= source.length) {
        throw new Error(`Invalid FieldConfig array setting path: ${path}`);
      }
      const nextArray = [...source];
      nextArray[slot] = value;
      return { [key]: nextArray };
    }

    return { [key]: build(source, index + 1) };
  };

  return build(config, 0) as FieldConfigOverrides;
}
