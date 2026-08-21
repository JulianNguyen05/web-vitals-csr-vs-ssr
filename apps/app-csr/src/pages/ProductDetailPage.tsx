import { useParams } from "react-router-dom";
import productsData from "@repo/data/json/products-20.json";
import { useCartStore } from "@repo/cart-store";
import { Button } from "@repo/ui";
import type { Product } from "@repo/types";

const products = productsData as Product[];

export function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const addItem = useCartStore((s) => s.addItem);

  if (!product) return <div className="p-4">Không tìm thấy sản phẩm.</div>;

  return (
    <div className="p-4 flex flex-col md:flex-row gap-6">
      <img
        src={product.detailUrl}
        alt={product.name}
        width={800}
        height={800}
        className="w-full md:w-96 aspect-square object-cover rounded-lg"
      />
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-lg font-bold mt-2">{product.price.toLocaleString("vi-VN")}₫</p>
        <p className="text-gray-600 mt-4">{product.description}</p>
        <Button className="mt-4" onClick={() => addItem(product.id)}>
          Thêm vào giỏ hàng
        </Button>
      </div>
    </div>
  );
}