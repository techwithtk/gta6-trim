"use client";

import { useState } from "react";
import { SceneArt } from "@/components/SceneArt";

/**
 * Real live preview frame from Twitch (thumbnail_url from the Helix API).
 * Shown inside the stream directory with the channel name + a link back to the stream.
 * Falls back to original art if the image is missing or fails to load.
 */
export function LiveThumb({ src, alt, className = "", fallbackSeed = 3 }: { src?: string; alt: string; className?: string; fallbackSeed?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <SceneArt variant="dusk" seed={fallbackSeed} animated={false} className={`block bg-black object-cover ${className}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`block bg-black object-cover ${className}`} />
  );
}
