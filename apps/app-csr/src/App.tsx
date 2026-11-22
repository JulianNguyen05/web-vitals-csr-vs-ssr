import { Routes, Route } from "react-router-dom";
import { ProductListPage } from "./pages/ProductListPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { NotFoundView, WebVitalsReporter } from "@repo/ui";
import { Header } from "./components/Header";
import { RouterLink } from "./components/RouterLink";
import { ScrollManager } from "./components/ScrollManager";

// App KHÔNG đọc state giỏ hàng (xem components/Header.tsx) — cùng phạm vi render lại như bản SSR.
function App() {
  return (
    <div className="min-h-screen bg-surface">
      <WebVitalsReporter />
      <ScrollManager />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="*" element={<NotFoundView LinkComponent={RouterLink} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
