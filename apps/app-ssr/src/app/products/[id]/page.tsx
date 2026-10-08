import { products } from "@repo/data";
import { notFound } from "next/navigation";
import { ProductDetailView, AddToCartButton } from "@repo/ui";

export const dynamic = "force-dynamic";

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = products.find((p) => p.id === params.id);
  if (!product) notFound();

  return (
    <ProductDetailView
      product={product}
      cartAction={<AddToCartButton productId={product.id} variant="detail" />}
    />
  );
}
