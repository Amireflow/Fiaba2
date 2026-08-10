import { useState, useEffect } from 'react';
import { Store01Icon } from '@hugeicons/core-free-icons';
import { Icon, type IconType } from './icon';

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

  const isValidUrl =
    src &&
    typeof src === 'string' &&
    src.trim().length > 0 &&
    (src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:image/') ||
      src.startsWith('/'));

  if (!isValidUrl || error) {
    return (
      <span className={`grid place-items-center bg-[#efedff] text-[#5b49e8] ${className}`}>
        <Icon glyph={fallbackGlyph} size={iconSize} />
      </span>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
