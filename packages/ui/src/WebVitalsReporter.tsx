"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export interface VitalsRecord {
  name: Metric["name"];
  value: number;
  rating: Metric["rating"];
  id: string;
  navigationType: Metric["navigationType"];
}

declare global {
  interface Window {
    /** Giá trị mới nhất của từng chỉ số — script đo (Playwright) đọc trực tiếp biến này. */
    __WEB_VITALS__?: Partial<Record<Metric["name"], VitalsRecord>>;
  }
}

function record(metric: Metric) {
  const store = (window.__WEB_VITALS__ ??= {});
  store[metric.name] = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
  };
  // Không gửi về server (tránh phát sinh request làm nhiễu phép đo) — chỉ ghi console + window.
  console.log(`[web-vitals] ${metric.name}=${metric.value.toFixed(metric.name === "CLS" ? 4 : 0)} (${metric.rating})`);
}

/**
 * Thu thập LCP, INP, CLS, FCP, TTFB bằng thư viện web-vitals (Google).
 * TBT là chỉ số phòng lab, chỉ Lighthouse đo được → lấy trong scripts/measurement.
 * Gắn ở cả 2 app, cùng một chỗ (sau lần render đầu) để điều kiện thu thập giống nhau.
 * Observer dùng buffered: true nên vẫn bắt được FCP/LCP xảy ra trước khi effect chạy.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    const opts = { reportAllChanges: true };
    onLCP(record, opts);
    onINP(record, opts);
    onCLS(record, opts);
    onFCP(record);
    onTTFB(record);
  }, []);
  return null;
}
