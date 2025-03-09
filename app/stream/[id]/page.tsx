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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { ShareModal } from "@/components/share-modal";
import { ArrowLeft, Beef, Heart, Share2, Users, Smile, Send } from "lucide-react";
import Link from "next/link";

// Importa o HLSPlayer dinamicamente
const HLSPlayer = dynamic(() => import("@/components/HLSPlayer"), { ssr: false });

// Importa o hook customizado que centraliza a conexão e os eventos do socket.
// Esse hook deve ser implementado em "hooks/useRoomSocket.ts" conforme discutido.
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

  // Estados para dados da transmissão, reprodução, chat, reações, debug e overlay
  const [stream, setStream] = useState<StreamDetails | null>(null);
  const [forceShowDebug, setForceShowDebug] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewers, setViewers] = useState<number>(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const displayedViewers = viewers;
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [showWaitingOverlay, setShowWaitingOverlay] = useState(true);

  // Refs para o container do player, para o ReactPlayer e para variáveis de sincronização
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const queuedPlayerTimeRef = useRef<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Função que monta a URL do vídeo (aplicando proxy quando necessário)
  const getVideoUrl = (): string => {
    if (!stream) return "";
    
    let url = stream.videoUrl;
    const isYT = url.includes("youtube.com") || url.includes("youtu.be");
    
    if (!isYT) {
      if (url.startsWith("http://")) {
        console.log("[StreamPage] Aplicando proxy para URL HTTP:", url);
        url = `https://backend-streamhive.onrender.com/api/proxy?url=${encodeURIComponent(url)}`;
      }
    }
    
    console.log("[StreamPage] URL final do vídeo:", url);
    return url;
  };

  const videoUrl = getVideoUrl();
  const decodedVideoUrl = decodeURIComponent(videoUrl);
  const isYT = stream?.videoUrl.includes("youtube.com") || stream?.videoUrl.includes("youtu.be");
  const videoIsHLS = !isYT && decodedVideoUrl.toLowerCase().endsWith(".m3u8");

  console.log("[StreamPage] isYouTube:", isYT, "videoIsHLS:", videoIsHLS);

  // Callback para quando o evento "player:start" for recebido via socket
  // Essa é a nova feature que sincroniza o início do player para todos
  const handlePlayerStart = (data: { time: number; startAt: number }) => {
    const delay = data.startAt - Date.now();
    console.log("[StreamPage] Evento player:start recebido. Dados:", data, "Delay:", delay);
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.seekTo(data.time, "seconds");
        setIsPlaying(true);
        setShowWaitingOverlay(false);
      }
    }, delay > 0 ? delay : 0);
  };

  // Integração com o hook customizado de socket, passando os callbacks para os eventos
  const { startPlayback, socket } = useRoomSocket(streamId, isHost, {
    // Chat: adiciona nova mensagem
    onChatMessage: (msg: Message) => {
      console.log("[Socket] Recebida nova mensagem:", msg);
      setMessages((prev) => {
        if (prev.some((m) => m.timestamp === msg.timestamp && m.text === msg.text)) {
          return prev;
        }
        return [...prev, msg];
      });
    },
    // Reações: calcula a posição da reação e atualiza o estado
    onReaction: (data: { emoji: string; user: string; roomId?: string }) => {
      console.log("[Socket] Recebida reação:", data);
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
      console.log("[StreamPage] Evento player:update recebido:", data);
      if (playerRef.current && stream && localStorage.getItem("userId") !== stream.host_id) {
        if (data.data.state === "paused") {
          setIsPlaying(false);
        } else if (data.data.state === "playing") {
          setIsPlaying(true);
        }
    
        if (!playerReady) {
          queuedPlayerTimeRef.current = data.data.time;
          return;
        }
        const currentTime = playerRef.current.getCurrentTime();
        if (Math.abs(currentTime - data.data.time) > 1) {
          console.log("[StreamPage] Sincronizando player para o tempo:", data.data.time);
          playerRef.current.seekTo(data.data.time, "seconds");
        }
      }
    },
    
    onUserJoined: (data: { username: string; roomId: string }) => {
      console.log("[Socket] Novo usuário entrou:", data.username);
      if (localStorage.getItem("userId") !== stream?.host_id) {
        setViewers((prev) => prev + 1);
      }
    },

    onUserLeft: (data: { username: string; roomId: string }) => {
      console.log("[Socket] Usuário saiu:", data.username);
      setViewers((prev) => Math.max(prev - 1, 0));
    },
  });

  const handleStartStream = () => {
    if (isHost) {
      startPlayback(0);
    } else {
      // Caso seja convidado (em geral, não haverá botão de play para eles)
      setShowWaitingOverlay(false);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("[StreamPage] Token não encontrado, redirecionando para /");
      router.push("/");
      return;
    }
    
    console.log("[StreamPage] Buscando detalhes da transmissão...");
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data: StreamDetails) => {
        console.log("[StreamPage] Dados da transmissão:", data);
        setStream(data);
        const initialViewers = data.viewers || 1;
        setViewers(initialViewers);
        const currentUserId = localStorage.getItem("userId");
        setIsHost(currentUserId !== null && currentUserId === data.host_id);
      })
      .catch((error) => {
        console.error("Erro ao buscar transmissão:", error);
        toast({ 
          title: "Erro", 
          description: "Não foi possível carregar os detalhes da transmissão." 
        });
      });
  }, [streamId, router, toast]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    console.log("[StreamPage] Buscando mensagens do chat...");
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data: Message[]) => {
        console.log("[StreamPage] Mensagens recebidas:", data);
        setMessages(data);
      })
      .catch((error) => console.error("Erro ao buscar mensagens:", error));
  }, [streamId]);

  // Limpeza periódica das reações para remover as que já expiraram (menos de 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      setReactions((prev) => prev.filter((r) => Date.now() - parseInt(r.id) < 2000));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handler para quando o player estiver pronto – aplica sincronização pendente se houver
  const handlePlayerReady = () => {
    console.log("[StreamPage] Player pronto.");
    setPlayerReady(true);
    setPlayerError(null);
    
    if (queuedPlayerTimeRef.current !== null && playerRef.current) {
      console.log("[StreamPage] Aplicando sincronização em fila com tempo:", queuedPlayerTimeRef.current);
      playerRef.current.seekTo(queuedPlayerTimeRef.current, "seconds");
      queuedPlayerTimeRef.current = null;
    }
  };

  // Handler para erros do player
  const handlePlayerError = (error: any) => {
    console.error("[StreamPage] Erro no player:", error);
    setPlayerError("Ocorreu um erro ao reproduzir o vídeo. Tente recarregar a página.");
    if (stream && !stream.videoUrl.includes("youtube.com") && !stream.videoUrl.includes("youtu.be")) {
      if (!stream.videoUrl.startsWith("http://") && !stream.videoUrl.startsWith("https://")) {
        console.log("[StreamPage] Tentando adicionar protocolo HTTP para URL:", stream.videoUrl);
        const newUrl = `http://${stream.videoUrl}`;
        setStream({ ...stream, videoUrl: newUrl });
      }
    }
  };

  // Handler para atualização contínua do player (sincronização via "player:update")
  const handleProgress = (state: { playedSeconds: number }) => {
    if (isHost && socket) {
      const now = Date.now();
      if (now - lastEmitTimeRef.current > 1000) {
        lastEmitTimeRef.current = now;
        console.log("[StreamPage] Host emitindo player:update com tempo:", state.playedSeconds);
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

  // Envio de mensagens do chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    console.log("[StreamPage] Enviando mensagem:", newMessage);
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: newMessage, roomId: streamId }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[StreamPage] Mensagem enviada:", data);
        setNewMessage("");
      })
      .catch((error) => console.error("Erro ao enviar mensagem:", error));
  };

  // Alterna a exibição do picker de reações
  const toggleReactionPicker = () => {
    setShowReactionPicker((prev) => !prev);
  };

  // Envia a reação (via socket) e calcula posição para animação
  const handleReaction = (emoji: string) => {
    console.log("[StreamPage] Enviando reação:", emoji);
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

  // Deleta a transmissão
  const handleDeleteStream = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      console.log("[StreamPage] Deletando transmissão...");
      const res = await fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  // Abre o modal de compartilhamento
  const handleShare = () => {
    console.log("[StreamPage] Abrindo modal de compartilhamento");
    setShowShareModal(true);
  };

  // Copia o link da transmissão para a área de transferência
  const handleCopyLink = () => {
    const link = `https://streamhivex.vercel.app/stream/${streamId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link da transmissão foi copiado para a área de transferência.",
    });
    console.log("[StreamPage] Link copiado:", link);
  };

  // Tenta reproduzir o vídeo novamente em caso de erro
  const handleRetryVideo = () => {
    if (!stream) return;
    
    console.log("[StreamPage] Tentando reproduzir novamente o vídeo");
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
            <span>{displayedViewers} assistindo</span>
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
              config={{ youtube: { playerVars: { showinfo: 1 } } }}
              onReady={handlePlayerReady}
              onProgress={handleProgress}
              onPause={() => {
                if (isHost && socket) {
                  const currentTime = playerRef.current?.getCurrentTime() || 0;
                  console.log("[StreamPage] Host pausou, emitindo player:update com estado paused");
                  socket.emit("player:update", {
                    roomId: streamId,
                    data: {
                      time: currentTime,
                      state: "paused",
                      volume,
                      muted: isMuted,
                    },
                  });
                  setIsPlaying(false);
                }
              }}
              onPlay={() => {
                if (isHost && socket) {
                  const currentTime = playerRef.current?.getCurrentTime() || 0;
                  console.log("[StreamPage] Host retomou, emitindo player:update com estado playing");
                  socket.emit("player:update", {
                    roomId: streamId,
                    data: {
                      time: currentTime,
                      state: "playing",
                      volume,
                      muted: isMuted,
                    },
                  });
                  setIsPlaying(true);
                }
              }}
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
              onPause={() => {
                if (isHost && socket) {
                  const currentTime = playerRef.current?.getCurrentTime() || 0;
                  console.log("[StreamPage] Host pausou, emitindo player:update com estado paused");
                  socket.emit("player:update", {
                    roomId: streamId,
                    data: {
                      time: currentTime,
                      state: "paused",
                      volume,
                      muted: isMuted,
                    },
                  });
                  setIsPlaying(false);
                }
              }}
              onPlay={() => {
                if (isHost && socket) {
                  const currentTime = playerRef.current?.getCurrentTime() || 0;
                  console.log("[StreamPage] Host retomou, emitindo player:update com estado playing");
                  socket.emit("player:update", {
                    roomId: streamId,
                    data: {
                      time: currentTime,
                      state: "playing",
                      volume,
                      muted: isMuted,
                    },
                  });
                  setIsPlaying(true);
                }
              }}
              onError={handlePlayerError}
            />
          )}

          {/* Interface de espera (overlay) sobre o player */}
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

          {/* Renderização das reações */}
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
            <Button variant="ghost" size="icon" onClick={toggleReactionPicker}>
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
                    {displayedViewers > (isHost ? 1 : 2) && (
                      <div className="flex items-center">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          +{displayedViewers - (isHost ? 1 : 2)}
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
                {debug && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium">Informações de Debug</h3>
                      <div className="mt-2 space-y-1 text-xs">
                        <p>URL original: {stream?.videoUrl}</p>
                        <p>URL do player: {videoUrl}</p>
                        <p>É YouTube: {isYT ? "Sim" : "Não"}</p>
                        <p>É HLS: {videoIsHLS ? "Sim" : "Não"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} streamId={streamId} />
      {(debug || forceShowDebug) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="fixed bottom-0 left-0 bg-black text-white p-2 text-xs z-50 max-w-xs"
        >
          <div>Tempo atual: {playerRef.current ? playerRef.current.getCurrentTime().toFixed(2) : "-"}</div>
          <div>Última emissão: {lastEmitTimeRef.current}</div>
          <div>Queued Time: {queuedPlayerTimeRef.current ?? "-"}</div>
          <div>Viewers: {viewers}</div>
          <div>Player Ready: {playerReady ? "Sim" : "Não"}</div>
          <div>URL: {videoUrl.substring(0, 30)}...</div>
        </motion.div>
      )}
    </div>
  );
}
