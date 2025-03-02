"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { Film, Link, Upload, Youtube } from 'lucide-react';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const router = useRouter();
  const [streamType, setStreamType] = useState('youtube');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate stream creation
    setTimeout(() => {
      setIsLoading(false);
      router.push('/stream/new-stream-123');
    }, 1500);
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
          <h2 className="text-2xl font-bold text-center mb-6 neon-text">Criar Nova Transmissão</h2>
          
          <form onSubmit={handleCreateStream} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="streamTitle">Título da Transmissão</Label>
              <Input id="streamTitle" placeholder="Ex: Noite de Filme com Amigos" required />
            </div>
            
            <div className="space-y-3">
              <Label>Tipo de Conteúdo</Label>
              <RadioGroup 
                value={streamType} 
                onValueChange={setStreamType}
                className="grid grid-cols-1 gap-4"
              >
                <div className="flex items-center space-x-2 border border-border rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="youtube" id="youtube" />
                  <Label htmlFor="youtube" className="flex items-center cursor-pointer">
                    <Youtube className="mr-2 h-4 w-4 text-red-500" />
                    Link do YouTube
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border border-border rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="flex items-center cursor-pointer">
                    <Link className="mr-2 h-4 w-4 text-blue-500" />
                    URL de Vídeo
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border border-border rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="file" id="file" />
                  <Label htmlFor="file" className="flex items-center cursor-pointer">
                    <Upload className="mr-2 h-4 w-4 text-green-500" />
                    Arquivo Local
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="streamSource">
                {streamType === 'youtube' ? 'Link do YouTube' : 
                 streamType === 'url' ? 'URL do Vídeo' : 'Selecionar Arquivo'}
              </Label>
              {streamType === 'file' ? (
                <Input id="streamSource" type="file" accept="video/*" required />
              ) : (
                <Input 
                  id="streamSource" 
                  placeholder={streamType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                  required 
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="streamDescription">Descrição (opcional)</Label>
              <Input id="streamDescription" placeholder="Descreva sua transmissão..." />
            </div>
            
            <div className="flex space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Criando..." : "Criar Transmissão"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}