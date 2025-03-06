"use client";

import { useEffect, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    // Limpar qualquer erro anterior
    setError(null);

    // Verificar se a URL está vazia
    if (!url) {
      setError("URL do vídeo não fornecida");
      return;
    }

    try {
      if (Hls.isSupported()) {
        hls = new Hls({
          debug: true,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        // Adicionar handlers de eventos para debug e tratamento de erros
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("Erro HLS:", data);
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Erro de rede, tentando recuperar...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Erro de mídia, tentando recuperar...");
                hls?.recoverMediaError();
                break;
              default:
                setError(`Erro fatal: ${data.details}`);
                hls?.destroy();
                break;
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("Manifest analisado com sucesso, pronto para reproduzir");
          if (playing) {
            video.play().catch(err => {
              console.error("Erro ao reproduzir vídeo:", err);
              setError(`Erro ao iniciar reprodução: ${err.message}`);
            });
          }
        });

        // Adicionar evento para detectar quando o vídeo começa a carregar
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log("Mídia anexada ao elemento de vídeo");
        });

        // Carregar a fonte e anexar ao elemento de vídeo
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Fallback para Safari nativo
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          console.log("Metadados carregados no modo Safari");
          if (playing) {
            video.play().catch(err => {
              console.error("Erro ao reproduzir vídeo:", err);
              setError(`Erro ao iniciar reprodução: ${err.message}`);
            });
          }
        });
        
        // Adicionar evento para erros no elemento de vídeo
        video.addEventListener("error", (e) => {
          console.error("Erro no elemento de vídeo:", video.error);
          setError(`Erro no vídeo: ${video.error?.message || "Desconhecido"}`);
        });
      } else {
        setError("HLS não é suportado neste navegador.");
      }

      video.volume = volume;
      video.muted = muted;
      video.controls = controls;
    } catch (err) {
      console.error("Erro ao inicializar player:", err);
      setError(`Erro ao inicializar player: ${err instanceof Error ? err.message : String(err)}`);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, playing, volume, muted, controls]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        width={width}
        height={height}
        className="w-full h-full bg-black"
      />
      {error && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-70 text-white p-4">
          <p>{error}</p>
        </div>
      )}
      {!error && !videoRef.current?.currentTime && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-70">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}