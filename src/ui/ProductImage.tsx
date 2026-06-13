import { ImageOff } from "lucide-react";
import { useState } from "react";

interface ProductImageProps {
  urls: string[];
  label: string;
  size?: "card" | "hero" | "thumb";
}

export function ProductImage({ urls, label, size = "card" }: ProductImageProps) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const url = urls.find((item) => item && !failed[item]);

  if (!url) {
    return (
      <div className={`image-placeholder image-${size}`} aria-label={`No image for ${label}`}>
        <ImageOff size={size === "thumb" ? 18 : 28} />
        <span>Image missing</span>
      </div>
    );
  }

  return (
    <img
      className={`product-image image-${size}`}
      src={url}
      alt={label}
      crossOrigin="anonymous"
      loading="lazy"
      onError={() => setFailed((current) => ({ ...current, [url]: true }))}
    />
  );
}
