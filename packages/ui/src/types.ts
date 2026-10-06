import type { ComponentType, ReactNode } from "react";

export type LinkComponentType = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
}>;