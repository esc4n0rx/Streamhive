"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { ShareModal } from '@/components/share-modal';
import { ArrowLeft, Beef as Bee, Heart, MessageSquare, Share2, ThumbsUp, Users, Volume2, VolumeX, Smile, Send } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export default function StreamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Simulate loading stream data
  useEffect(() => {
    // Simulate viewers joining
    const viewerInterval = setInterval(() => {
      setViewers(prev => Math.min(prev + Math.floor(Math.random() * 2), 15));
    }, 10000);
    
    // Simulate initial messages
    const initialMessages: Message[] = [
      { id: '1', user: 'Ana', text: 'Oi pessoal! Cheguei!', timestamp: new Date(Date.now() - 300000) },
      { id: '2', user: 'Carlos', text: 'Esse filme é incrível!', timestamp: new Date(Date.now() - 180000) },
      { id: '3', user: 'Mariana', text: 'Alguém tem pipoca? 🍿', timestamp: new Date(Date.now() - 60000) },
    ];
    setMessages(initialMessages);
    
    // Simulate new messages
    const messageInterval = setInterval(() => {
      const users = ['Ana', 'Carlos', 'Mariana', 'João', 'Luiza'];
      const texts = [
        'Essa cena é demais!',
        'Não acredito nisso 😮',
        'Alguém entendeu o que aconteceu?',
        'Muito bom!',
        'hahaha 😂',
        '👏👏👏',
        'Incrível!'
      ];
      
      const newRandomMessage: Message = {
        id: Date.now().toString(),
        user: users[Math.floor(Math.random() * users.length)],
        text: texts[Math.floor(Math.random() * texts.length)],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newRandomMessage]);
    }, 15000);
    
    return () => {
      clearInterval(viewerInterval);
      clearInterval(messageInterval);
    };
  }, []);
  
  // Clean up old reactions
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setReactions(prev => prev.filter(r => Date.now() - parseInt(r.id) < 2000));
    }, 2000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      user: 'Você',
      text: newMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };
  
  const handleReaction = (emoji: string) => {
    if (!playerContainerRef.current) return;
    
    const containerRect = playerContainerRef.current.getBoundingClientRect();
    const x = Math.random() * containerRect.width;
    const y = containerRect.height - 20;
    
    const reaction: Reaction = {
      id: Date.now().toString(),
      emoji,
      x,
      y
    };
    
    setReactions(prev => [...prev, reaction]);
  };
  
  const handleShare = () => {
    setShowShareModal(true);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://streamhive.app/stream/${params.id}`);
    toast({
      title: "Link copiado!",
      description: "O link da transmissão foi copiado para a área de transferência.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center ml-2">
            <Bee size={24} className="text-primary mr-2" />
            <h1 className="text-xl font-bold neon-text">Stream<span className="text-primary">Hive</span></h1>
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
          <ReactPlayer
            url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            width="100%"
            height="100%"
            playing={isPlaying}
            volume={volume}
            muted={isMuted}
            controls
            config={{
              youtube: {
                playerVars: { showinfo: 1 }
              }
            }}
          />
          
          {/* Floating reactions */}
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
          
          {/* Reaction buttons */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
            <TooltipProvider>
              {[
                { emoji: '👍', tooltip: 'Curtir', icon: <ThumbsUp className="h-4 w-4" /> },
                { emoji: '❤️', tooltip: 'Amei', icon: <Heart className="h-4 w-4" /> },
                { emoji: '😂', tooltip: 'Haha', icon: <Smile className="h-4 w-4" /> },
                { emoji: '😮', tooltip: 'Uau', icon: null },
                { emoji: '👏', tooltip: 'Aplausos', icon: null },
              ].map(reaction => (
                <Tooltip key={reaction.emoji}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-10 w-10 hover:bg-primary/20"
                      onClick={() => handleReaction(reaction.emoji)}
                    >
                      {reaction.icon || reaction.emoji}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{reaction.tooltip}</p>
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
                  {messages.map(message => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="chat-message-enter"
                    >
                      <div className="flex items-start">
                        <div className="bg-secondary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                          {message.user.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{message.user}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{message.text}</p>
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
                    Transmissão iniciada por João às 19:30
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium">Participantes ({viewers})</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <div className="bg-primary rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium mr-2">
                        J
                      </div>
                      <span>João (anfitrião)</span>
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
      
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        streamId={params.id}
      />
    </div>
  );
}