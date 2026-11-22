import { SearchX } from "lucide-react";
import type { LinkComponentType } from "./types";

/** Trang 404 dùng chung (UC02 – luồng thay thế 2a): CSR dùng cho route "*", SSR dùng trong app/not-found.tsx. */
export function NotFoundView({ LinkComponent }: { LinkComponent: LinkComponentType }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-light">
        <SearchX className="h-10 w-10 text-accent" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">Lỗi 404</p>
      <h1 className="text-xl font-bold text-foreground">Không tìm thấy trang hoặc sản phẩm</h1>
      <p className="text-sm text-muted">
        Sản phẩm bạn tìm không tồn tại trong tập dữ liệu hoặc đường dẫn không đúng.
      </p>
      <LinkComponent
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Về trang danh mục
      </LinkComponent>
    </div>
  );
}
