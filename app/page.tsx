"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/login-modal';
import { Beef as Bee } from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        className="video-background"
      >
        <source src="https://cdn.pixabay.com/video/2021/04/01/69645-531604963.mp4" type="video/mp4" />
      </video>
      
      <div className="honeycomb-overlay"></div>
      
      <div className="z-10 w-full max-w-5xl flex flex-col items-center justify-center gap-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <Bee size={48} className="text-primary mr-2" />
            <h1 className="text-5xl md:text-7xl font-bold neon-text">
              Stream<span className="text-primary">Hive</span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground mt-4">
            Assista conteúdos com amigos em tempo real
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 glow-effect pulse-button"
            onClick={() => setShowModal(true)}
          >
            Vamos Começar
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-center text-muted-foreground"
        >
          <p>Transmita filmes, vídeos, eventos ao vivo e muito mais</p>
          <p className="mt-2">Convide amigos para assistir juntos em tempo real</p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <LoginModal 
            isOpen={showModal} 
            onClose={() => setShowModal(false)} 
          />
        )}
      </AnimatePresence>

      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>© 2025 StreamHive. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}