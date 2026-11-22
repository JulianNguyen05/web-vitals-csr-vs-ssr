import { useParams } from "react-router-dom";
import { ProductDetailView, AddToCartButton, NotFoundView } from "@repo/ui";
import { products } from "@repo/data";
import { RouterLink } from "../components/RouterLink";

export function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) return <NotFoundView LinkComponent={RouterLink} />;

  return (
    <ProductDetailView
      product={product}
      cartAction={<AddToCartButton productId={product.id} variant="detail" />}
    />
  );
}
