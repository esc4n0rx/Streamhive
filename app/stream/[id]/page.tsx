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
  isPublic: boolean;
  videoUrl: string;
  viewers: number;
}

export default function StreamPage() {
  // Obtém o id da transmissão da URL
  const { id = '' } = useParams();
  const streamId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { toast } = useToast();

  // Estados para os dados da transmissão, chat, reações e controles do player
  const [stream, setStream] = useState<StreamDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // Conecta ao Socket.IO no backend para receber eventos em tempo real
  useEffect(() => {
    const socket = io('https://backend-streamhive.onrender.com');
    socketRef.current = socket;

    socket.on('chat:new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('reaction:sent', (data: { emoji: string; user: string }) => {
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
      // Exemplo: atualizar estado do player se necessário
      // setIsPlaying(data.state === 'playing');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Busca os detalhes da transmissão a partir do backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data: StreamDetails) => {
        setStream(data);
        setViewers(data.viewers);
      })
      .catch((error) => console.error("Erro ao buscar transmissão: ", error));
  }, [streamId, router]);

  // Busca as mensagens do chat do backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data: Message[]) => {
        setMessages(data);
      })
      .catch((error) => console.error("Erro ao buscar mensagens: ", error));
  }, [streamId]);

  // Limpeza de reações antigas
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setReactions((prev) => prev.filter(r => Date.now() - parseInt(r.id) < 2000));
    }, 2000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // Envia uma mensagem ao chat (também pode emitir via websocket, se necessário)
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`https://backend-streamhive.onrender.com/api/streams/${streamId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: newMessage })
    })
      .then(res => res.json())
      .then(() => {
        // Opcional: adicione localmente se o backend não emitir em tempo real
        const message: Message = {
          id: Date.now().toString(),
          user: "Você",
          text: newMessage,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, message]);
        setNewMessage('');
      })
      .catch((error) => console.error("Erro ao enviar mensagem: ", error));
  };

  // Emite reação via websocket e exibe animação local
  const handleReaction = (emoji: string) => {
    if (socketRef.current) {
      socketRef.current.emit('reaction:sent', { emoji });
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
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://streamhive.app/stream/${streamId}`);
    toast({
      title: "Link copiado!",
      description: "O link da transmissão foi copiado para a área de transferência.",
    });
  };

  // Determina qual player usar: se o videoUrl for do YouTube, usa ReactPlayer; senão, usa o HLSPlayer
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
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0">
        <div className="lg:col-span-3 bg-black relative" ref={playerContainerRef}>
          {isYouTube ? (
            <ReactPlayer
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

          {/* Animação das reações */}
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

          {/* Botões para enviar reações */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
            <TooltipProvider>
              {[
                { emoji: '👍', tooltip: 'Curtir', icon: <ThumbsUp className="h-4 w-4" /> },
                { emoji: '❤️', tooltip: 'Amei', icon: <Heart className="h-4 w-4" /> },
                { emoji: '😂', tooltip: 'Haha', icon: <Smile className="h-4 w-4" /> },
                { emoji: '😮', tooltip: 'Uau', icon: '😮' },
                { emoji: '👏', tooltip: 'Aplausos', icon: '👏' },
              ].map((r) => (
                <Tooltip key={r.emoji}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-10 w-10 hover:bg-primary/20"
                      onClick={() => handleReaction(r.emoji)}
                    >
                      {r.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{r.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>

        <div className="lg:col-span-1 border-l border-border flex flex-col h-[calc(100vh-65px)]">
          <Tabs defaultValue="chat" className="flex flex-col h-full">
            <TabsList className="mx-4 my-2 grid grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
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

              <Separator />

              <form onSubmit={handleSendMessage} className="p-4">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Envie uma mensagem..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="info" className="flex-1 p-4 m-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Sobre esta transmissão</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stream ? `Transmissão iniciada por ${stream.host}` : 'Carregando informações...'}
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
                        <span>outros espectadores</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium">Compartilhar</h3>
                  <div className="mt-2 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleCopyLink}
                    >
                      <Link href="#" className="mr-2 h-4 w-4" />
                      Copiar link
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleShare}
                    >
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
