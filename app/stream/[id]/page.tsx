"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import ReactPlayer from 'react-player';
import dynamic from 'next/dynamic';
import io from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { ShareModal } from '@/components/share-modal';
import { ArrowLeft, Beef, Heart, Share2, ThumbsUp, Users, Smile, Send } from 'lucide-react';
import Link from 'next/link';

// Componente HLSPlayer para streams não YouTube
const HLSPlayer = dynamic(() => import('@/components/HLSPlayer'), { ssr: false });

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
  const { id = '' } = useParams();
  const streamId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { toast } = useToast();

  console.log("[StreamPage] streamId:", streamId);
  if (!streamId) {
    console.error("[StreamPage] Nenhum streamId fornecido.");
    return <div>Stream não encontrado</div>;
  }

  // Estados
  const [stream, setStream] = useState<StreamDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    console.log("[Socket] Conectando ao socket...");
    const socket = io('https://backend-streamhive.onrender.com');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("[Socket] Conectado:", socket.id);
      socket.emit('join-room', streamId);
      console.log("[Socket] Emitido 'join-room' para", streamId);
    });

    socket.on('chat:new-message', (msg: Message) => {
      console.log("[Socket] Recebida nova mensagem:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('reaction:sent', (data: { emoji: string; user: string; roomId?: string }) => {
      console.log("[Socket] Recebida reação:", data);
      if (!playerContainerRef.current) return;
      const containerRect = playerContainerRef.current.getBoundingClientRect();
      const reaction = {
        id: Date.now().toString(),
        emoji: data.emoji,
        x: Math.random() * containerRect.width,
        y: containerRect.height - 20
      };
      setReactions((prev) => [...prev, reaction]);
    });

    socket.on('player:update', (data: any) => {
      console.log("[Socket] Recebido player:update:", data);
      if (playerRef.current && stream && localStorage.getItem('userId') !== stream.host_id) {
        const currentTime = playerRef.current.getCurrentTime();
        if (Math.abs(currentTime - data.data.time) > 1) {
          console.log("[Socket] Sincronizando player para o tempo:", data.data.time);
          playerRef.current.seekTo(data.data.time, 'seconds');
        }
      }
    });

    socket.on('user:joined', (data: { username: string; roomId: string }) => {
      console.log("[Socket] Novo usuário entrou:", data.username);
      setViewers((prev) => prev + 1);
    });

    socket.on('user:left', (data: { username: string; roomId: string }) => {
      console.log("[Socket] Usuário saiu:", data.username);
      setViewers((prev) => Math.max(prev - 1, 0));
    });

    socket.on('disconnect', () => {
      console.log("[Socket] Desconectado:", socket.id);
    });

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, [streamId, stream]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("[StreamPage] Token não encontrado, redirecionando para /");
      router.push('/');
      return;
    }
    console.log("[StreamPage] Buscando detalhes da transmissão...");
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data: StreamDetails) => {
        console.log("[StreamPage] Dados da transmissão:", data);
        setStream(data);
        setViewers(data.viewers || 1);
      })
      .catch((error) => console.error("Erro ao buscar transmissão:", error));
  }, [streamId, router]);

  // Busca as mensagens do chat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    console.log("[StreamPage] Buscando mensagens do chat...");
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data: Message[]) => {
        console.log("[StreamPage] Mensagens recebidas:", data);
        setMessages(data);
      })
      .catch((error) => console.error("Erro ao buscar mensagens:", error));
  }, [streamId]);

  // Limpeza de reações antigas
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setReactions((prev) => prev.filter(r => Date.now() - parseInt(r.id) < 2000));
    }, 2000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // Envia mensagem ao chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    console.log("[StreamPage] Enviando mensagem:", newMessage);
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: newMessage, roomId: streamId })
    })
      .then(res => res.json())
      .then((data) => {
        console.log("[StreamPage] Mensagem enviada:", data);
        // Caso o backend não emita via socket, adiciona localmente
        const message: Message = {
          id: Date.now().toString(),
          user: "Você",
          text: newMessage,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, message]);
        setNewMessage('');
      })
      .catch((error) => console.error("Erro ao enviar mensagem:", error));
  };

  // Toggle do seletor de reações
  const toggleReactionPicker = () => {
    setShowReactionPicker(prev => !prev);
  };

  // Envia reação via socket
  const handleReaction = (emoji: string) => {
    console.log("[StreamPage] Enviando reação:", emoji);
    if (socketRef.current) {
      socketRef.current.emit('reaction:sent', { roomId: streamId, emoji });
    }
    if (!playerContainerRef.current) return;
    const containerRect = playerContainerRef.current.getBoundingClientRect();
    const reaction = {
      id: Date.now().toString(),
      emoji,
      x: Math.random() * containerRect.width,
      y: containerRect.height - 20
    };
    setReactions((prev) => [...prev, reaction]);
    setShowReactionPicker(false);
  };

  // Função para deletar a stream (para o host)
  const handleDeleteStream = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      console.log("[StreamPage] Deletando transmissão...");
      const res = await fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.message || "Erro ao encerrar a transmissão." });
        return;
      }
      toast({ title: "Transmissão encerrada", description: "A transmissão foi encerrada com sucesso." });
      router.push('/dashboard');
    } catch (error) {
      console.error("Erro ao deletar a transmissão:", error);
      toast({ title: "Erro", description: "Erro ao encerrar a transmissão." });
    }
  };

  // Abre modal de compartilhamento
  const handleShare = () => {
    console.log("[StreamPage] Abrindo modal de compartilhamento");
    setShowShareModal(true);
  };

  // Copia link da transmissão
  const handleCopyLink = () => {
    const link = `https://streamhive.app/stream/${streamId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link da transmissão foi copiado para a área de transferência.",
    });
    console.log("[StreamPage] Link copiado:", link);
  };

  // Define qual player usar: YouTube ou HLS
  const isYouTube = stream?.videoUrl.includes('youtube.com') || stream?.videoUrl.includes('youtu.be');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
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
          {/* Botão para encerrar a transmissão, exibido apenas para o host */}
          {stream && localStorage.getItem('userId') === stream.host_id && (
            <Button variant="destructive" size="sm" onClick={handleDeleteStream}>
              Encerrar
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 bg-black relative" ref={playerContainerRef}>
          {isYouTube ? (
            <ReactPlayer
              ref={playerRef}
              url={stream?.videoUrl || ''}
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              controls
              config={{
                youtube: { playerVars: { showinfo: 1 } }
              }}
            />
          ) : (
            <HLSPlayer
              url={stream?.videoUrl || ''}
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              controls
            />
          )}

          {/* Exibe reações flutuantes */}
          <AnimatePresence>
            {reactions.map(reaction => (
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

          {/* Botão para abrir seletor de reações sobre o player */}
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={toggleReactionPicker}>
              <Smile className="h-5 w-5" />
            </Button>
            {showReactionPicker && (
              <div className="absolute right-0 mt-2 bg-card border border-border rounded shadow-lg p-2 z-50">
                {['👍', '❤️', '😂', '😮', '👏'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna do chat e informações */}
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
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="chat-message-enter"
                    >
                      <div className="flex items-start">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          {msg.user.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{msg.user}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{msg.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>

              {/* Chat input fixo no rodapé para mobile */}
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
                  {/* Botão extra para enviar reação direto do chat */}
                  <Button variant="ghost" size="icon" onClick={() => handleReaction('❤️')}>
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
                    {stream ? `Iniciada por ${stream.host}` : 'Carregando...'}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium">Participantes ({viewers})</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <div className="bg-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                        {stream ? stream.host.charAt(0) : 'C'}
                      </div>
                      <span>{stream ? `${stream.host} (anfitrião)` : 'Carregando...'}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                        V
                      </div>
                      <span>Você</span>
                    </div>
                    {viewers > 2 && (
                      <div className="flex items-center">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          +{viewers - 2}
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
    </div>
  );
}
