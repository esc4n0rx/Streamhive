"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import ReactPlayer from "react-player";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ShareModal } from "@/components/share-modal";
import { ArrowLeft, Beef, Heart, Share2, Users, Smile, Send } from "lucide-react";
import Link from "next/link";

const HLSPlayer = dynamic(() => import("@/components/HLSPlayer"), { ssr: false });

import { useRoomSocket } from "@/hooks/useRoomSocket";

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface StreamDetails {
  id: string;
  title: string;
  description: string;
  host: string;
  host_id: string;
  isPublic: boolean;
  videoUrl: string;
  viewers: number;
}

export default function StreamPage() {
  const { id = "" } = useParams();
  const streamId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { toast } = useToast();

  if (!streamId) {
    console.error("[StreamPage] Nenhum streamId fornecido.");
    return <div>Stream não encontrado</div>;
  }

  // Estados principais
  const [stream, setStream] = useState<StreamDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Controla se o player está tocando
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewers, setViewers] = useState<number>(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showWaitingOverlay, setShowWaitingOverlay] = useState(true);
  const [showStreamEndedModal, setShowStreamEndedModal] = useState(false);

  // Refs e variáveis para sincronização
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const queuedPlayerTimeRef = useRef<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Função para obter a URL do vídeo
  const getVideoUrl = (): string => {
    if (!stream) return "";
    let url = stream.videoUrl;
    const isYT = url.includes("youtube.com") || url.includes("youtu.be");
    if (!isYT && url.startsWith("http://")) {
      url = `https://backend-streamhive.onrender.com/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const videoUrl = getVideoUrl();
  const decodedVideoUrl = decodeURIComponent(videoUrl);
  const isYT = stream?.videoUrl.includes("youtube.com") || stream?.videoUrl.includes("youtu.be");
  const videoIsHLS = !isYT && decodedVideoUrl.toLowerCase().endsWith(".m3u8");

  // Callback chamado quando o host inicia a transmissão
  const handlePlayerStart = (data: { time: number; startAt: number }) => {
    const delay = data.startAt - Date.now();
    console.log("[Player Sync] player:start recebido:", data, "Delay:", delay);
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.seekTo(data.time, "seconds");
        setIsPlaying(true);
        setShowWaitingOverlay(false);
      }
    }, delay > 0 ? delay : 0);
  };

  // Integração com o hook de socket (os callbacks abaixo serão chamados quando os eventos chegarem)
  const { startPlayback, socket } = useRoomSocket(streamId, isHost, {
    onChatMessage: (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.timestamp === msg.timestamp && m.text === msg.text)) return prev;
        return [...prev, msg];
      });
    },
    onReaction: (data: { emoji: string; user: string; roomId?: string }) => {
      if (!playerContainerRef.current) return;
      const rect = playerContainerRef.current.getBoundingClientRect();
      const reaction: Reaction = {
        id: Date.now().toString(),
        emoji: data.emoji,
        x: Math.random() * rect.width,
        y: rect.height - 20,
      };
      setReactions((prev) => [...prev, reaction]);
    },
    onPlayerStart: handlePlayerStart,
    onPlayerUpdate: (data: any) => {
      console.log("[Player Sync] player:update recebido:", data);
      // Para convidados, atualizar o estado conforme o evento do host
      if (playerRef.current && stream && localStorage.getItem("userId") !== stream.host_id) {
        if (data.data.state === "paused") {
          setIsPlaying(false);
        } else if (data.data.state === "playing") {
          setIsPlaying(true);
          setShowWaitingOverlay(false);
        }
        if (!playerReady) {
          queuedPlayerTimeRef.current = data.data.time;
          return;
        }
        const currentTime = playerRef.current.getCurrentTime();
        if (Math.abs(currentTime - data.data.time) > 1) {
          console.log("[Player Sync] Sincronizando tempo para:", data.data.time);
          playerRef.current.seekTo(data.data.time, "seconds");
        }
      }
    },
    onUserJoined: (data: { username: string; roomId: string }) => {
      setViewers((prev) => prev + 1);
    },
    onUserLeft: (data: { username: string; roomId: string }) => {
      setViewers((prev) => Math.max(prev - 1, 0));
    },
    onStreamEnded: () => {
      console.log("[Player Sync] stream:ended recebido");
      if (!isHost) {
        setShowStreamEndedModal(true);
        setTimeout(() => router.push("/dashboard"), 5000);
      }
    }
  });

  // Apenas o host pode iniciar a transmissão
  const handleStartStream = () => {
    if (isHost) {
      startPlayback(0);
    }
  };

  // Carregamento dos dados da transmissão
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data: StreamDetails) => {
        setStream(data);
        setViewers(data.viewers || 1);
        const currentUserId = localStorage.getItem("userId");
        setIsHost(currentUserId !== null && currentUserId === data.host_id);
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar os detalhes da transmissão." });
      });
  }, [streamId, router, toast]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data: Message[]) => setMessages(data))
      .catch((error) => console.error("Erro ao buscar mensagens:", error));
  }, [streamId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReactions((prev) => prev.filter((r) => Date.now() - parseInt(r.id) < 2000));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Quando o player estiver pronto, para convidados forçamos a pausa
  const handlePlayerReady = () => {
    console.log("[Player Sync] Player pronto.");
    setPlayerReady(true);
    setPlayerError(null);
    if (!isHost) {
      setIsPlaying(false);
    }
    if (queuedPlayerTimeRef.current !== null && playerRef.current) {
      console.log("[Player Sync] Aplicando sincronização em fila:", queuedPlayerTimeRef.current);
      playerRef.current.seekTo(queuedPlayerTimeRef.current, "seconds");
      queuedPlayerTimeRef.current = null;
    }
  };

  const handlePlayerError = (error: any) => {
    console.error("[Player Sync] Erro no player:", error);
    setPlayerError("Ocorreu um erro ao reproduzir o vídeo. Tente recarregar a página.");
    if (stream && !stream.videoUrl.includes("youtube.com") && !stream.videoUrl.includes("youtu.be")) {
      if (!stream.videoUrl.startsWith("http://") && !stream.videoUrl.startsWith("https://")) {
        const newUrl = `http://${stream.videoUrl}`;
        setStream({ ...stream, videoUrl: newUrl });
      }
    }
  };

  // O host emite atualizações de tempo; o convidado usa os dados para sincronizar
  const handleProgress = (state: { playedSeconds: number }) => {
    if (isHost && socket) {
      const now = Date.now();
      if (now - lastEmitTimeRef.current > 1000) {
        lastEmitTimeRef.current = now;
        console.log("[Player Sync] Host emitindo atualização com tempo:", state.playedSeconds);
        socket.emit("player:update", {
          roomId: streamId,
          data: {
            time: state.playedSeconds,
            state: isPlaying ? "playing" : "paused",
            volume,
            muted: isMuted,
          },
        });
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: newMessage, roomId: streamId }),
    })
      .then((res) => res.json())
      .then(() => setNewMessage(""))
      .catch((error) => console.error("Erro ao enviar mensagem:", error));
  };

  const toggleReactionPicker = () => {
    setShowReactionPicker((prev) => !prev);
  };

  const handleReaction = (emoji: string) => {
    if (socket) {
      socket.emit("reaction:sent", { roomId: streamId, emoji });
    }
    if (!playerContainerRef.current) return;
    const rect = playerContainerRef.current.getBoundingClientRect();
    const reaction: Reaction = {
      id: Date.now().toString(),
      emoji,
      x: Math.random() * rect.width,
      y: rect.height - 20,
    };
    setReactions((prev) => [...prev, reaction]);
    setShowReactionPicker(false);
  };

  const handleDeleteStream = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      if (isHost && socket) {
        socket.emit("stream:ended", { roomId: streamId });
      }
      const res = await fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.message || "Erro ao encerrar a transmissão." });
        return;
      }
      toast({ title: "Transmissão encerrada", description: "A transmissão foi encerrada com sucesso." });
      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao deletar a transmissão:", error);
      toast({ title: "Erro", description: "Erro ao encerrar a transmissão." });
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    const link = `https://streamhivex.vercel.app/stream/${streamId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "O link da transmissão foi copiado para a área de transferência." });
  };

  const handleRetryVideo = () => {
    if (!stream) return;
    setPlayerError(null);
    setStream({ ...stream });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center ml-2">
            <Beef size={24} className="text-primary mr-2" />
            <h1 className="text-xl font-bold neon-text">
              Stream<span className="text-primary">Hive</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-sm text-muted-foreground mr-4">
            <Users className="h-4 w-4 mr-1" />
            <span>{viewers} assistindo</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          {isHost && (
            <Button variant="destructive" size="sm" onClick={handleDeleteStream}>
              Encerrar
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 bg-black relative" ref={playerContainerRef}>
          {playerError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-white mb-4">{playerError}</p>
              <Button onClick={handleRetryVideo}>Tentar novamente</Button>
            </div>
          ) : isYT ? (
            <ReactPlayer
              ref={playerRef}
              url={stream?.videoUrl || ""}
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              controls
              config={{
                youtube: { playerVars: { autoplay: 0, showinfo: 1 } }
              }}
              onReady={handlePlayerReady}
              onProgress={handleProgress}
              onError={handlePlayerError}
            />
          ) : videoIsHLS ? (
            <HLSPlayer
              url={videoUrl}
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              controls
            />
          ) : (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              controls
              onReady={handlePlayerReady}
              onProgress={handleProgress}
              onError={handlePlayerError}
            />
          )}

          {/* Overlay que bloqueia interações para convidados */}
          {!isHost && (
            <div className="absolute inset-0 z-30" style={{ background: "rgba(0,0,0,0)", pointerEvents: "all" }}></div>
          )}

          <AnimatePresence>
            {showWaitingOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20"
              >
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                  {isHost ? (
                    <>
                      <p className="text-white text-2xl mb-4">Seu conteúdo está pronto para começar.</p>
                      <div className="flex justify-center space-x-4">
                        <Button onClick={handleStartStream} className="bg-green-500 hover:bg-green-600 text-white">
                          Assistir Agora
                        </Button>
                        <Button onClick={handleDeleteStream} className="bg-red-500 hover:bg-red-600 text-white">
                          Excluir Sala
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-white text-2xl">
                      Aguardando {stream?.host} iniciar um conteúdo...
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {reactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                className="emoji-reaction absolute text-2xl"
                initial={{ opacity: 0, y: 0, x: reaction.x }}
                animate={{ opacity: 1, y: -20 }}
                exit={{ opacity: 0, y: -100 }}
                style={{ bottom: reaction.y, left: reaction.x }}
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={() => setShowReactionPicker((prev) => !prev)}>
              <Smile className="h-5 w-5" />
            </Button>
            {showReactionPicker && (
              <div className="absolute right-0 mt-2 bg-card border border-border rounded shadow-lg p-2 z-50">
                {["👍", "❤️", "😂", "😮", "👏"].map((emoji) => (
                  <Button key={emoji} variant="ghost" size="icon" onClick={() => handleReaction(emoji)}>
                    {emoji}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-1 border-l border-border flex flex-col">
          <Tabs defaultValue="chat" className="flex flex-col flex-1">
            <TabsList className="mx-4 my-2 grid grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chat-message-enter">
                      <div className="flex items-start">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          {msg.user.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{msg.user}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{msg.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 bg-card border-t border-border fixed bottom-0 inset-x-0 lg:static">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Envie uma mensagem..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleReaction("❤️")}>
                    <Heart className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>
            <TabsContent value="info" className="flex-1 p-4 m-0 overflow-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Sobre a transmissão</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stream ? `Iniciada por ${stream.host}` : "Carregando..."}
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium">Participantes</h3>
                  <div className="mt-2 space-y-2">
                    {isHost ? (
                      <div className="flex items-center">
                        <div className="bg-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          {stream ? stream.host.charAt(0) : "C"}
                        </div>
                        <span>{stream ? `${stream.host} (anfitrião)` : "Carregando..."}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <div className="bg-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                            {stream ? stream.host.charAt(0) : "C"}
                          </div>
                          <span>{stream ? `${stream.host} (anfitrião)` : "Carregando..."}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                            V
                          </div>
                          <span>Você</span>
                        </div>
                      </>
                    )}
                    {viewers > (isHost ? 1 : 2) && (
                      <div className="flex items-center">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          +{viewers - (isHost ? 1 : 2)}
                        </div>
                        <span>outros</span>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium">Compartilhar</h3>
                  <div className="mt-2 space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={handleCopyLink}>
                      <Link href="#" className="mr-2 h-4 w-4" />
                      Copiar link
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Mais opções
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} streamId={streamId} />
      
      <AnimatePresence>
        {showStreamEndedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-black p-6 rounded shadow-lg text-center">
              <p>Poxa, {stream?.host} encerrou a transmissão. Infelizmente, tenho que te levar de volta.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
