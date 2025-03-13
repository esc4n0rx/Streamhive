"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Beef as Bee, Users, Video } from 'lucide-react';
import { CreateStreamModal } from '@/components/create-stream-modal';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface StreamType {
  id: string;
  title: string;
  description: string;
  host: string;
  isPublic: boolean;
  videoUrl: string;
  viewers: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [streams, setStreams] = useState<StreamType[]>([]);
  const [viewers, setViewers] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setShowLoginModal(true); 
    } else {
      fetch('http://zccw48s0oko0sg4ogows0008.195.35.17.111.sslip.io/api/streams', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
        .then((response) => response.json())
        .then((data) => {
          setStreams(data);
          setViewers(data.viewers || 1);
        })
        .catch((error) => console.error("Erro ao buscar streams: ", error));
    }
  }, []);

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
          <h1 className="text-2xl font-bold neon-text">
            Stream<span className="text-primary">Hive</span>
          </h1>
        </div>
        <Button onClick={() => router.push('/')} variant="ghost">
          Sair
        </Button>
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
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
        </motion.div>
      </main>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogTitle>Atenção</DialogTitle>
          <p>Você não está logado. Faça login para continuar.</p>
          <DialogFooter>
            <Button onClick={() => router.push('/')}>Fazer Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateStreamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
