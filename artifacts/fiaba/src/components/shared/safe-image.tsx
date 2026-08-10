import { useState, useEffect } from 'react';
import { Store01Icon } from '@hugeicons/core-free-icons';
import { Icon, type IconType } from './icon';
import { getFirstImageUrl, isSupportedImageUrl } from '@/lib/storage-upload';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackGlyph?: IconType;
  iconSize?: number;
}

export function SafeImage({
  src,
  alt,
  className = 'h-10 w-10 shrink-0 rounded-xl object-cover',
  fallbackGlyph = Store01Icon,
  iconSize = 18,
}: SafeImageProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  // Extract clean URL if src is a JSON array string like '["https://..."]' or raw string
  const resolvedUrl = getFirstImageUrl(src) || (typeof src === 'string' && isSupportedImageUrl(src) ? src.trim() : null);

  if (!resolvedUrl || error) {
    return (
      <span className={`grid place-items-center bg-[#efedff] text-[#5b49e8] ${className}`}>
        <Icon glyph={fallbackGlyph} size={iconSize} />
      </span>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

