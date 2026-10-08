"use client";

import { useState } from "react";

interface ProductGalleryProps {
  name: string;
  mainUrl: string;
  gallery: string[];
}

export function ProductGallery({ name, mainUrl, gallery }: ProductGalleryProps) {
  const images = [mainUrl, ...gallery];
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <img
          src={images[active]}
          alt={active === 0 ? name : `${name} - ảnh ${active + 1}`}
          width={800}
          height={800}
          className="aspect-square w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-surface transition-colors sm:h-20 sm:w-20 ${
                i === active
                  ? "border-accent"
                  : "border-transparent hover:border-border"
              }`}
            >
              <img
                src={url}
                alt=""
                width={120}
                height={120}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
