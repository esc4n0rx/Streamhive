"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Beef as Bee, Film, Users, Video, Youtube } from 'lucide-react';
import { CreateStreamModal } from '@/components/create-stream-modal';

export default function Dashboard() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const handleJoinStream = (id: string) => {
    router.push(`/stream/${id}`);
  };
  
  const handleCreateStream = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <Bee size={32} className="text-primary mr-2" />
          <h1 className="text-2xl font-bold neon-text">Stream<span className="text-primary">Hive</span></h1>
        </div>
        <Button onClick={() => router.push('/')} variant="ghost">Sair</Button>
      </header>

      <main className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-6">Bem-vindo de volta!</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="mr-2 text-primary" />
                  Criar Transmissão
                </CardTitle>
                <CardDescription>
                  Inicie uma nova transmissão e convide amigos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 glow-effect"
                    onClick={handleCreateStream}
                  >
                    Criar Nova Transmissão
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
            
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 text-primary" />
                  Entrar em Transmissão
                </CardTitle>
                <CardDescription>
                  Entre em uma transmissão existente com um código
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  className="flex flex-col space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem('streamCode') as HTMLInputElement;
                    handleJoinStream(input.value);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="streamCode">Código da Transmissão</Label>
                    <Input id="streamCode" placeholder="Digite o código" required />
                  </div>
                  <Button type="submit">Entrar</Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="recent">
            <TabsList className="mb-6">
              <TabsTrigger value="recent">Recentes</TabsTrigger>
              <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: '123', title: 'Noite de Filme', type: 'Filme', participants: 5, date: '2 horas atrás' },
                  { id: '456', title: 'Maratona de Série', type: 'Série', participants: 3, date: 'Ontem' },
                  { id: '789', title: 'Evento ao Vivo', type: 'Live', participants: 12, date: '3 dias atrás' },
                ].map((stream) => (
                  <motion.div
                    key={stream.id}
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border border-border h-full flex flex-col">
                      <CardHeader>
                        <CardTitle>{stream.title}</CardTitle>
                        <CardDescription className="flex items-center">
                          <Film className="mr-1 h-4 w-4" />
                          {stream.type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {stream.participants} participantes • {stream.date}
                        </p>
                      </CardContent>
                      <CardFooter className="mt-auto">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleJoinStream(stream.id)}
                        >
                          Continuar Assistindo
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="favorites">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: '321', title: 'Clube do Filme', type: 'Filme', participants: 8, date: 'Semanal' },
                  { id: '654', title: 'Podcast Favorito', type: 'Podcast', participants: 4, date: 'Mensal' },
                ].map((stream) => (
                  <motion.div
                    key={stream.id}
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border border-border h-full flex flex-col">
                      <CardHeader>
                        <CardTitle>{stream.title}</CardTitle>
                        <CardDescription className="flex items-center">
                          <Film className="mr-1 h-4 w-4" />
                          {stream.type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {stream.participants} participantes • {stream.date}
                        </p>
                      </CardContent>
                      <CardFooter className="mt-auto">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleJoinStream(stream.id)}
                        >
                          Entrar
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <CreateStreamModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}