import { useParams } from "react-router-dom";
import productsData from "@repo/data/json/products-20.json";
import { useCartStore } from "@repo/cart-store";
import { Button, ProductDetailView } from "@repo/ui";
import type { Product } from "@repo/types";

const products = productsData as Product[];

export function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const addItem = useCartStore((s) => s.addItem);

  if (!product) return <div className="p-4">Không tìm thấy sản phẩm.</div>;

  return (
    <ProductDetailView
      product={product}
      cartAction={
        <Button onClick={() => addItem(product.id)}>Thêm vào giỏ hàng</Button>
      }
    />
  );
}
