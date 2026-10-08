import { useParams } from "react-router-dom";
import { ProductDetailView, AddToCartButton } from "@repo/ui";
import { products } from "@repo/data";

export function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) return <div className="p-4">Không tìm thấy sản phẩm.</div>;

  return (
    <ProductDetailView
      product={product}
      cartAction={<AddToCartButton productId={product.id} variant="detail" />}
    />
  );
}
