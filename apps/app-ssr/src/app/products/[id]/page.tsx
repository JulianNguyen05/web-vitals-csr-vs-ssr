import productsData from "@repo/data/json/products-20.json";
import type { Product } from "@repo/types";
import { notFound } from "next/navigation";
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
        <p className="text-lg font-bold mt-2">
          {product.price.toLocaleString("vi-VN")}₫
        </p>
        <p className="text-gray-600 mt-4">{product.description}</p>
        <div className="mt-4 max-w-xs">
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}