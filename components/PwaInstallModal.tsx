"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PwaInstallModalProps {
  onClose: () => void;
}

export function PwaInstallModal({ onClose }: PwaInstallModalProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setPlatform("ios");
      } else if (/android/.test(ua)) {
        setPlatform("android");
      } else if (/win|mac|linux/.test(ua)) {
        setPlatform("desktop");
      } else {
        setPlatform("unknown");
      }
    }
  }, []);

  const getInstructions = () => {
    if (platform === "ios") {
      return (
        <>
          <p className="text-center mb-2">
            No iPhone/iPad, abra o menu de compartilhamento no Safari (ícone de compartilhamento) e toque em "Adicionar à Tela de Início".
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Essa ação permitirá instalar o StreamHive como um app.
          </p>
        </>
      );
    } else if (platform === "android") {
      return (
        <>
          <p className="text-center mb-2">
            No Android, abra o menu do Chrome (três pontos no canto superior direito) e toque em "Adicionar a Tela Inicial".
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Essa ação permitirá instalar o StreamHive no seu dispositivo.
          </p>
        </>
      );
    } else if (platform === "desktop") {
      return (
        <p className="text-center text-sm text-muted-foreground">
          Para instalar, utilize o menu do seu navegador e escolha "Adicionar à tela inicial".
        </p>
      );
    } else {
      return (
        <p className="text-center text-sm text-muted-foreground">
          Para instalar, utilize o menu do seu navegador e escolha "Adicionar à tela inicial".
        </p>
      );
    }
  };

  const handleOk = () => {
    router.push("/dashboard");
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
          Para uma experiência completa, adicione nosso aplicativo à sua tela inicial.
        </p>
        {getInstructions()}
        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={handleOk}>OK</Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
