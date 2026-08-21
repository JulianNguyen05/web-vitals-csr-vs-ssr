import type { Product } from "@repo/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden flex flex-col">
      <img
        src={product.thumbUrl}
        alt={product.name}
        width={400}
        height={400}
        loading="lazy"
        className="w-full aspect-square object-cover"
      />
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-medium line-clamp-2">{product.name}</h3>
        <p className="text-base font-semibold mt-auto">
          {product.price.toLocaleString("vi-VN")}₫
        </p>
        {onAddToCart && (
          <button
            onClick={() => onAddToCart(product.id)}
            className="text-sm bg-blue-600 text-white rounded-md py-1.5 hover:bg-blue-700"
          >
            Thêm vào giỏ
          </button>
        )}
      </div>
    </div>
  );
}