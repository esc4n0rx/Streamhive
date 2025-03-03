"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PwaInstallModalProps {
  onClose: () => void;
}

export function PwaInstallModal({ onClose }: PwaInstallModalProps) {
  const [installable, setInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const beforeInstallHandler = (e: any) => {
      // Previne o mini-infobar padrão
      e.preventDefault();
      console.log("[PWAInstall] Evento beforeinstallprompt capturado.");
      setDeferredPrompt(e);
      setInstallable(true);
    };

    const appInstalledHandler = () => {
      console.log("[PWAInstall] PWA instalado com sucesso.");
    };

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      console.log("[PWAInstall] Abrindo prompt de instalação.");
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWAInstall] Resposta do usuário: ${outcome}`);
      setDeferredPrompt(null);
      setInstallable(false);
      // Após instalar, podemos redirecionar para o dashboard, por exemplo:
      router.push("/dashboard");
    } else {
      alert(
        'Para instalar, clique no menu do seu navegador e escolha "Adicionar à tela inicial".'
      );
    }
  };

  return (
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
        {installable ? (
          <Button onClick={handleInstallClick} className="w-full">
            Instalar App
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Não há prompt de instalação disponível.
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onClose}>
            Pular
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
