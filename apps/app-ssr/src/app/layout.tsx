import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./nav";

export const metadata: Metadata = {
  title: "T&Q Mart (SSR)",
  description: "Ứng dụng mẫu mô phỏng giao dịch thương mại điện tử T&Q Mart",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-surface">
          <Nav />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
