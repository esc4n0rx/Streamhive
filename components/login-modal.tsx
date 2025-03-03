"use client";

import { useState, useEffect } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pwa-install': any;
    }
  }
}
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Github, Mail } from 'lucide-react';
import '@pwabuilder/pwainstall';

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      console.log("[PWAInstall] beforeinstallprompt capturado.");
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('https://backend-streamhive.onrender.com/api/auth/login', {
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
      localStorage.setItem('token', data.token);
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
      const response = await fetch('https://backend-streamhive.onrender.com/api/auth/register', {
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
      localStorage.setItem('token', data.token);
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
      // Exemplo de social login
      setTimeout(() => {
        localStorage.setItem('token', 'social-login-token');
        setIsLoading(false);
        setShowInstallModal(true);
      }, 1500);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  // Função que chama o instalador PWA via pwa-install
  const handleInstallApp = async () => {
    console.log("[PWAInstall] Tentando abrir prompt de instalação.");
    // Se tivermos o deferredPrompt, podemos usá-lo
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resposta do usuário: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      // Se não tivermos o deferredPrompt, mostra uma mensagem alternativa
      alert('Para instalar, clique no menu do seu navegador e escolha "Adicionar à tela inicial".');
    }
    setShowInstallModal(false);
    router.push('/dashboard');
  };

  const handleSkipInstall = () => {
    setShowInstallModal(false);
    router.push('/dashboard');
  };

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
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
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

      {/* Modal de Instalação do PWA */}
      {showInstallModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md neon-border p-6"
          >
            <h2 className="text-2xl font-bold text-center mb-4 neon-text">
              Instale o StreamHive
            </h2>
            <p className="text-center mb-4">
              Adicione nosso aplicativo à sua tela inicial para uma experiência completa.
            </p>
            <pwa-install
              id="pwaInstall"
              manifestpath="manifest.json"
              explainer="Este app pode ser instalado no seu dispositivo."
              installbuttontext="Instalar"
              cancelbuttontext="Pular"
            ></pwa-install>
            <div className="flex justify-center gap-4 mt-4">
              <Button onClick={handleInstallApp}>
                Instalar App
              </Button>
              <Button variant="outline" onClick={handleSkipInstall}>
                Pular
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
