import productsData from "@repo/data/json/products-20.json";
import type { Product } from "@repo/types";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@repo/ui";
import { AddToCartButton } from "../../add-to-cart-button";

export const dynamic = "force-dynamic";

const products = productsData as Product[];

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
      cartAction={<AddToCartButton productId={product.id} />}
    />
  );
}
