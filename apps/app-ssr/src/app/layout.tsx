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
        <Nav />
        {children}
      </body>
    </html>
  );
}