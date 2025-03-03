// components/HLSPlayer.tsx
"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HLSPlayerProps {
  url: string;
  playing?: boolean;
  volume?: number;
  muted?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
}

export default function HLSPlayer({
  url,
  playing = false,
  volume = 0.8,
  muted = false,
  controls = true,
  width = "100%",
  height = "100%",
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playing) {
          video.play().catch(err => console.error("Erro ao reproduzir vídeo:", err));
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (playing) {
          video.play().catch(err => console.error("Erro ao reproduzir vídeo:", err));
        }
      });
    } else {
      console.error("HLS não é suportado neste navegador.");
    }

    video.volume = volume;
    video.muted = muted;
    video.controls = controls;

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, playing, volume, muted, controls]);

  return (
    <video
      ref={videoRef}
      width={width}
      height={height}
      className="w-full h-full bg-black"
    />
  );
}
