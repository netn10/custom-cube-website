'use client';

import React from 'react';

// Battle and Room cards are printed in landscape orientation. We want them
// displayed vertically (rotated 90deg) like every other card, regardless of
// how the source image is stored.
export function isRotatedCardType(type?: string | null): boolean {
  return !!type && /\b(Battle|Room)\b/i.test(type);
}

interface CardArtProps {
  /** The card's type line, used to detect Battle/Room cards. */
  type?: string | null;
  src: string;
  alt?: string;
  /** Classes controlling the card's size/layout in its slot. */
  className?: string;
  loading?: 'lazy' | 'eager';
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * Renders a card image, auto-rotating Battle and Room cards to a vertical
 * orientation. Non-rotated cards render as a plain <img> so existing layouts
 * are unchanged.
 */
export default function CardArt({ type, src, alt = '', className = '', loading, onError }: CardArtProps) {
  if (isRotatedCardType(type)) {
    return (
      <div className={`battle-frame ${className}`}>
        <img src={src} alt={alt} className="battle-rotate" loading={loading} onError={onError} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading={loading} onError={onError} />;
}
