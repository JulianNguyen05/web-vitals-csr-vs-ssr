import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * next/link mặc định cuộn lên đầu trang sau mỗi lần điều hướng; BrowserRouter thì không.
 * Component này tái tạo đúng hành vi đó ở CSR để luồng thao tác hai bản giống nhau.
 * Nút Back/Forward (POP) giữ cơ chế khôi phục vị trí cuộn mặc định của trình duyệt.
 */
export function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  useLayoutEffect(() => {
    if (navType !== "POP") window.scrollTo(0, 0);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
