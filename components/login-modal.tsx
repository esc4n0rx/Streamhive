"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { PwaInstallModal } from '@/components/PwaInstallModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  const [registerName, setRegisterName] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');

  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  const storeUserData = (data: any) => {
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.id);
      console.log(data.id);
    }
    if (data.user) {
      localStorage.setItem('userId', data.id);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://zccw48s0oko0sg4ogows0008.195.35.17.111.sslip.io/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Erro ao fazer login.');
        setIsLoading(false);
        return;
      }
      storeUserData(data);
      setIsLoading(false);
      setShowInstallModal(true);
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer login.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://zccw48s0oko0sg4ogows0008.195.35.17.111.sslip.io/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Erro ao criar conta.');
        setIsLoading(false);
        return;
      }
      // Salva token e informações do usuário
      storeUserData(data);
      setIsLoading(false);
      setShowInstallModal(true);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar conta.');
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    try {
      // Simulação de social login: suponha que o backend retorne também os dados do usuário
      setTimeout(() => {
        const fakeData = {
          token: "social-login-token",
          user: {
            id: "social_user_id",
            email: "social@example.com",
            name: "Social User"
          }
        };
        storeUserData(fakeData);
        setIsLoading(false);
        setShowInstallModal(true);
      }, 1500);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md neon-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-6 neon-text">
              Bem-vindo ao StreamHive
            </h2>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastro</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showInstallModal && (
        <PwaInstallModal onClose={() => setShowInstallModal(false)} />
      )}
    </>
  );
}
