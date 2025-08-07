# Папка с фотоинструкциями

Здесь размещаются фотографии для инструкций по упаковке и возвратам, организованные по брендам и общим инструкциям.

## Общие файлы для упаковки:
- `pallet-example.svg` - Схема правильно собранной палеты
- `drink-stands.svg` - Схема размещения подставок для напитков
- `return-pallet.svg` - Схема оформления возвратной палеты
- `return-labels.svg` - Схема правильного размещения этикеток

## Бренд-специфичные инструкции:

### A. Le Coq (`brands/a-le-coq/`)
- `packing-example-1.heic` до `packing-example-10.heic` - Примеры упаковки A. Le Coq

### Coca-Cola (`brands/coca-cola/`)
- `packing-example-1.jpg` до `packing-example-10.jpg` - Примеры упаковки Coca-Cola
- `wooden-base-1-4.jpg` - Деревянная основа 1-4
- `wooden-base-additional.jpg` - Дополнительная деревянная основа

### Kaupmees (`brands/kaupmees/`)
- `packing-example-1.heic` до `packing-example-4.heic` - Примеры упаковки Kaupmees

### Mobec (`brands/mobec/`)
- `packing-example-1.heic` - Пример упаковки Mobec

### Prike (`brands/prike/`)
- `packing-example-1.heic` - Пример упаковки Prike

### Saku (`brands/saku/`)
- `packing-example-1.heic` до `packing-example-9.heic` - Примеры упаковки Saku

### Smarten (`brands/smarten/`)
- `packing-example-1.heic` до `packing-example-3.heic` - Примеры упаковки Smarten

## Рекомендации:
- Размер изображений: 800x600 пикселей или больше
- Формат: JPG или PNG
- Качество: высокое, четкие детали
- Освещение: хорошее, без теней
- Подписи: краткие, информативные

## Добавление новых инструкций:
1. Поместите изображение в эту папку
2. Обновите функции `getPackagingInstructions()` и `getReturnsInstructions()` в main.js
3. Добавьте переводы в ru.json и ee.json
