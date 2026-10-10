import { Command } from 'commander';
import fs from 'fs';

const program = new Command();

program
  .name('restaurant-cli')
  .description('CLI-програма для керування меню ресторану')
  .version('1.0.0');


program.option('-f, --file <path>', 'шлях до JSON-файлу з меню', 'data.json');


function loadMenuData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Помилка: Файл за шляхом "${filePath}" не знайдено.`);
      process.exit(1);
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Помилка: Файл "${filePath}" містить некоректний JSON синтаксис.`);
    } else {
      console.error(`Помилка читання файлу: ${error.message}`);
    }
    process.exit(1);
  }
}




program
  .command('list')
  .description('Показати стислий список категорій меню')
  .option('-l, --limit <number>', 'обмежити кількість категорій', parseInt)
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    let categories = data.categories;
    
    if (options.limit !== undefined) {
      categories = categories.slice(0, options.limit);
    }

    console.log(`Ресторан: ${data.restaurantName}\n`);
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. Категорія: ${cat.categoryName} (Страв: ${cat.dishes.length})`);
    });
  });


program
  .command('dish')
  .description('Показати повну інформацію про конкретну страву за назвою')
  .requiredOption('-n, --name <name>', 'назва страви')
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    let foundDish = null;

    for (const cat of data.categories) {
      const dish = cat.dishes.find(d => d.name.toLowerCase() === options.name.toLowerCase());
      if (dish) {
        foundDish = dish;
        break;
      }
    }

    if (!foundDish) {
      console.error(`Помилка: Страви з назвою "${options.name}" не знайдено.`);
      process.exit(1);
    }

    console.log(JSON.stringify(foundDish, null, 2));
  });


program
  .command('field')
  .description('Показати значення окремого кореневого поля (наприклад, restaurantName)')
  .requiredOption('-p, --prop <property>', 'назва поля')
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    
    if (options.prop in data) {
      console.log(`${options.prop}:`, data[options.prop]);
    } else {
      console.error(`Помилка: Поле "${options.prop}" відсутнє в корені документа.`);
      process.exit(1);
    }
  });




program
  .command('category-dishes')
  .description('Вивести всі страви обраної категорії')
  .requiredOption('-c, --category <name>', 'назва категорії (наприклад, "Перші страви")')
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    const cat = data.categories.find(c => c.categoryName.toLowerCase() === options.category.toLowerCase());

    if (!cat) {
      console.error(`Помилка: Категорію "${options.category}" не знайдено.`);
      process.exit(1);
    }

    console.log(`Категорія: ${cat.categoryName}\nСтрав у категорії:`);
    cat.dishes.forEach(d => {
      console.log(`- ${d.name} (${d.price} грн, вага: ${d.weightGrams}г)`);
    });
  });


program
  .command('filter-dishes')
  .description('Відбір страв за максимальною ціною та опціональними ознаками')
  .option('-m, --max-price <number>', 'максимальна ціна', parseFloat)
  .option('-v, --vegetarian', 'тільки вегетаріанські страви')
  .option('-s, --spicy', 'тільки гострі страви')
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    let matchedDishes = [];

    data.categories.forEach(cat => {
      cat.dishes.forEach(dish => {
        let match = true;
        if (options.maxPrice !== undefined && dish.price > options.maxPrice) match = false;
        if (options.vegetarian !== undefined && dish.isVegetarian !== options.vegetarian) match = false;
        if (options.spicy !== undefined && dish.isSpicy !== options.spicy) match = false;

        if (match) {
          matchedDishes.push({ category: cat.categoryName, ...dish });
        }
      });
    });

    console.log(`Знайдено страв: ${matchedDishes.length}\n`);
    matchedDishes.forEach(d => {
      console.log(`[${d.category}] ${d.name} — ${d.price} грн (Вег: ${d.isVegetarian}, Гостра: ${d.isSpicy || false})`);
    });
  });


program
  .command('search-ingredient')
  .description('Знайти всі страви, до складу яких входить заданий інгредієнт')
  .requiredOption('-i, --ingredient <name>', 'назва інгредієнта (наприклад, "креветки")')
  .action((options) => {
    const data = loadMenuData(program.opts().file);
    const query = options.ingredient.toLowerCase();
    let foundDishes = [];

    data.categories.forEach(cat => {
      cat.dishes.forEach(dish => {
        if (dish.ingredients.some(ing => ing.toLowerCase().includes(query))) {
          foundDishes.push(dish.name);
        }
      });
    });

    console.log(`Страви з інгредієнтом "${options.ingredient}":`);
    if (foundDishes.length === 0) {
      console.log('Нічого не знайдено.');
    } else {
      foundDishes.forEach(name => console.log(`- ${name}`));
    }
  });

program.parse(process.argv);