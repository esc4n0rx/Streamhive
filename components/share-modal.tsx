"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCode from 'react-qr-code';
import { Copy, Facebook, Link, Mail, Twitter } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
}

export function ShareModal({ isOpen, onClose, streamId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  const streamUrl = `https://streamhive.app/stream/${streamId}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    toast({
      title: "Link copiado!",
      description: "O link da transmissão foi copiado para a área de transferência.",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = (platform: string) => {
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=Assista comigo no StreamHive!&url=${encodeURIComponent(streamUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(streamUrl)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=Convite para StreamHive&body=Olá! Estou te convidando para assistir comigo no StreamHive: ${streamUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
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
          <h2 className="text-2xl font-bold text-center mb-6 neon-text">Compartilhar Transmissão</h2>
          
          <Tabs defaultValue="link">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="qrcode">QR Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="space-y-4">
              <div className="flex space-x-2">
                <Input value={streamUrl} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-6">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-20"
                  onClick={() => handleShare('twitter')}
                >
                  <Twitter className="h-6 w-6 mb-2 text-blue-400" />
                  <span className="text-xs">Twitter</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-20"
                  onClick={() => handleShare('facebook')}
                >
                  <Facebook className="h-6 w-6 mb-2 text-blue-600" />
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-20"
                  onClick={() => handleShare('email')}
                >
                  <Mail className="h-6 w-6 mb-2 text-red-400" />
                  <span className="text-xs">Email</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-20"
                  onClick={handleCopyLink}
                >
                  <Link className="h-6 w-6 mb-2 text-green-400" />
                  <span className="text-xs">Copiar</span>
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="qrcode" className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode value={streamUrl} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escaneie este QR Code com a câmera do seu celular para entrar na transmissão
              </p>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}