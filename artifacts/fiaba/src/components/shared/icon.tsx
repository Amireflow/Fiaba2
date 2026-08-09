import { HugeiconsIcon } from '@hugeicons/react';
import type { FC } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconType = any;

export const Icon: FC<{ glyph: IconType; size?: number; strokeWidth?: number; className?: string }> = ({
  glyph,
  size = 18,
  strokeWidth = 1.8,
  className,
}) => <HugeiconsIcon icon={glyph} size={size} strokeWidth={strokeWidth} className={className} />;
