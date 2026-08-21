import { faker } from "@faker-js/faker";
import { writeFileSync, mkdirSync } from "fs";

const CATEGORIES = [
  { id: "cat-1", name: "Điện tử", slug: "dien-tu" },
  { id: "cat-2", name: "Thời trang", slug: "thoi-trang" },
  { id: "cat-3", name: "Gia dụng", slug: "gia-dung" },
  { id: "cat-4", name: "Sách", slug: "sach" },
];

function makeProduct(i) {
  const category = faker.helpers.arrayElement(CATEGORIES);
  const name = faker.commerce.productName();
  const slug = `${faker.helpers.slugify(name).toLowerCase()}-${i}`;
  return {
    id: `prod-${i}`,
    name,
    slug,
    price: faker.number.int({ min: 50000, max: 5000000 }),
    categoryId: category.id,
    thumbUrl: `https://picsum.photos/seed/prod-${i}/400/400`,
    detailUrl: `https://picsum.photos/seed/prod-${i}/800/800`,
    description: faker.commerce.productDescription(),
  };
}

function generate(count) {
  return Array.from({ length: count }, (_, i) => makeProduct(i + 1));
}

mkdirSync("./json", { recursive: true });

for (const count of [20, 500, 2000]) {
  const products = generate(count);
  writeFileSync(
    `./json/products-${count}.json`,
    JSON.stringify(products, null, 2)
  );
  console.log(`Generated products-${count}.json (${products.length} items)`);
}

writeFileSync("./json/categories.json", JSON.stringify(CATEGORIES, null, 2));
console.log("Generated categories.json");