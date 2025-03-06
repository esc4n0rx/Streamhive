"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { Link, Youtube, Lightbulb } from 'lucide-react';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContentSuggestion {
  nome: string;
  poster: string;
  categoria: string;
  subcategoria: 'Filme' | 'Serie';
  url: string;
  temporadas?: number;
  episodios?: { season: number; episode: number; url: string }[];
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const router = useRouter();
  const [streamType, setStreamType] = useState('youtube');
  const [isLoading, setIsLoading] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  // Para sugestões, armazenamos um objeto com nome e url
  const [streamSource, setStreamSource] = useState<{ name: string; url: string } | string>('');
  const [streamDescription, setStreamDescription] = useState('');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Se streamSource for objeto, use sua url; senão, use o valor diretamente.
      const videoUrl = typeof streamSource === 'object' ? streamSource.url : streamSource;
      const response = await fetch('https://backend-streamhive.onrender.com/api/streams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          title: streamTitle,
          description: streamDescription,
          isPublic: true,
          videoUrl: videoUrl
        })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Erro ao criar a transmissão.');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      onClose();
      router.push(`/stream/${data.streamId}`);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar a transmissão.');
      setIsLoading(false);
    }
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
            <h2 className="text-2xl font-bold text-center mb-6 neon-text">Criar Nova Transmissão</h2>
            <form onSubmit={handleCreateStream} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="streamTitle">Título da Transmissão</Label>
                <Input
                  id="streamTitle"
                  placeholder="Ex: Noite de Filme com Amigos"
                  required
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                />
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
                    <RadioGroupItem value="suggestion" id="suggestion" />
                    <Label htmlFor="suggestion" className="flex items-center cursor-pointer">
                      <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                      Está sem ideias? Use nossa base de conteúdos para escolher algo.
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streamSource">
                  {streamType === 'youtube'
                    ? 'Link do YouTube'
                    : streamType === 'url'
                    ? 'URL do Vídeo'
                    : 'Conteúdo Selecionado'}
                </Label>
                {streamType === 'suggestion' ? (
                  <div>
                    {streamSource ? (
                      <div className="p-3 border rounded-md">
                        <p className="font-semibold">
                          {typeof streamSource === 'object' ? streamSource.name : streamSource}
                        </p>
                        <Button variant="outline" className="mt-2" onClick={() => setIsSubModalOpen(true)}>
                          Alterar Seleção
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" onClick={() => setIsSubModalOpen(true)}>
                        Escolher da base de conteúdos
                      </Button>
                    )}
                  </div>
                ) : (
                  <Input
                    id="streamSource"
                    placeholder={streamType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                    required
                    value={typeof streamSource === 'string' ? streamSource : (streamSource?.name || '')}
                    onChange={(e) => setStreamSource(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="streamDescription">Descrição (opcional)</Label>
                <Input
                  id="streamDescription"
                  placeholder="Descreva sua transmissão..."
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                />
              </div>

              <div className="flex space-x-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Transmissão"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {isSubModalOpen && (
        <ContentSuggestionSubModal 
          onSelectContent={(suggestion: { name: string, url: string }) => {
            setStreamSource(suggestion);
            setIsSubModalOpen(false);
          }}
          onClose={() => setIsSubModalOpen(false)}
        />
      )}
    </>
  );
}

interface ContentSuggestionSubModalProps {
  onSelectContent: (suggestion: { name: string, url: string }) => void;
  onClose: () => void;
}

function flattenGroupedContents(grouped: any, type: 'Filme' | 'Serie'): ContentSuggestion[] {
  const result: ContentSuggestion[] = [];
  for (const categoria in grouped) {
    if (type === 'Filme') {
      grouped[categoria].filmes.forEach((item: any) => {
        result.push({ ...item, categoria });
      });
    } else {
      grouped[categoria].series.forEach((item: any) => {
        result.push({ ...item, categoria });
      });
    }
  }
  return result;
}

function ContentSuggestionSubModal({ onSelectContent, onClose }: ContentSuggestionSubModalProps) {
  const [groupedContents, setGroupedContents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentType, setContentType] = useState<'Filme' | 'Serie'>('Filme');
  const [selectedContent, setSelectedContent] = useState<ContentSuggestion | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  useEffect(() => {
    async function fetchContents() {
      setLoading(true);
      try {
        const response = await fetch('https://backend-streamhive.onrender.com/api/contents');
        const data = await response.json();
        // data.contents é o objeto agrupado retornado pelo backend
        setGroupedContents(data.contents || {});
      } catch (error) {
        console.error('Erro ao buscar conteúdos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchContents();
  }, []);

  const flattened = groupedContents ? flattenGroupedContents(groupedContents, contentType) : [];
  const suggestions = flattened
    .filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5);

  const handleSelect = (item: ContentSuggestion) => {
    if (item.subcategoria === 'Filme') {
      // Para filmes, seleciona imediatamente (passando o nome e a url)
      onSelectContent({ name: item.nome, url: item.url });
    } else if (item.subcategoria === 'Serie') {
      // Para séries, abre a seleção de temporada e episódio
      setSelectedContent(item);
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
  };

  const confirmSeriesSelection = () => {
    if (selectedContent) {
      const episodesForSeason = selectedContent.episodios?.filter(ep => ep.season === selectedSeason) || [];
      const chosenEpisode = episodesForSeason.find(ep => ep.episode === selectedEpisode);
      if (chosenEpisode) {
        onSelectContent({ name: selectedContent.nome, url: chosenEpisode.url });
      } else {
        onSelectContent({ name: selectedContent.nome, url: selectedContent.url });
      }
    }
  };

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
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl neon-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-center mb-4 neon-text">Escolha um Conteúdo</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <Input
              placeholder="Buscar conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Label>Filme</Label>
              <input
                type="checkbox"
                checked={contentType === 'Serie'}
                onChange={(e) => setContentType(e.target.checked ? 'Serie' : 'Filme')}
              />
              <Label>Série</Label>
            </div>
          </div>
          {loading ? (
            <p>Carregando conteúdos...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  className="border border-border rounded-md p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelect(item)}
                >
                  <img src={item.poster} alt={item.nome} className="w-full h-32 object-cover rounded-md mb-2" />
                  <p className="text-sm font-semibold text-center">{item.nome}</p>
                  {item.subcategoria === 'Filme' && (
                    <p className="text-xs text-center">{item.categoria}</p>
                  )}
                </div>
              ))}
              {suggestions.length === 0 && (
                <p className="col-span-4 text-center">Nenhum conteúdo encontrado.</p>
              )}
            </div>
          )}

          {selectedContent && selectedContent.subcategoria === 'Serie' && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-lg font-semibold mb-2">Selecione Temporada e Episódio</h4>
              <div className="flex space-x-4 mb-4">
                <div>
                  <Label>Temporada</Label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                    className="border border-border rounded-md p-2"
                  >
                    {Array.from(new Set(selectedContent.episodios?.map(ep => ep.season))).map(season => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Episódio</Label>
                  <select
                    value={selectedEpisode}
                    onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                    className="border border-border rounded-md p-2"
                  >
                    {selectedContent.episodios
                      ?.filter(ep => ep.season === selectedSeason)
                      .map(ep => ep.episode)
                      .map(episode => (
                        <option key={episode} value={episode}>
                          {episode}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <Button onClick={confirmSeriesSelection}>
                Confirmar Seleção
              </Button>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
