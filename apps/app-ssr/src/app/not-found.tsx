import { NotFoundView } from "@repo/ui";
import { NextLinkAdapter } from "./next-link-adapter";

export default function NotFound() {
  return <NotFoundView LinkComponent={NextLinkAdapter} />;
}
