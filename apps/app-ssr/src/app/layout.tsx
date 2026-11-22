import type { Metadata } from "next";
import { WebVitalsReporter } from "@repo/ui";
import "./globals.css";
import { Nav } from "./nav";
import { STORE_LABEL } from "./config";

// SAD: SSR thuần — MỌI route render lại ở mỗi request, không ISR/SSG.
// Đặt ở layout để áp dụng cho cả những trang là Client Component.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: STORE_LABEL,
  description: "Ứng dụng mẫu mô phỏng giao dịch thương mại điện tử T&Q Mart",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-surface">
          <WebVitalsReporter />
          <Nav storeLabel={STORE_LABEL} />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
