export interface AppEnv {
  dataset: "20" | "500" | "2000";
  showArchLabel: boolean;
  datasetPath: string;
}
export function readAppEnv(env?: Record<string, string | undefined>): AppEnv;
export function storeLabel(arch: "CSR" | "SSR", showArchLabel: boolean): string;
