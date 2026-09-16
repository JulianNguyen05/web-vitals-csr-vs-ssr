import { Routes, Route, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { useCartStore } from "@repo/cart-store";
import { SiteHeader } from "@repo/ui";

function RouterLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function App() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <SiteHeader
          storeLabel="T&Q Mart (CSR)"
          cartQuantity={totalQuantity}
          LinkComponent={RouterLink}
        />
        <Routes>
          <Route path="/" element={<CategoryPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
