import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type ContentRow = {
  id: string;
  nome: string;
  poster: string;
  categoria: string;
  subcategoria: string;
  url: string;
  temporadas: string;
  episodios: string;
  criado_em: string;
};

type SerieEpisode = {
  season: number | null;
  episode: number | null;
  url: string;
};

type Serie = {
  nome: string;
  url: string;
  temporadas: string;
  episodios: SerieEpisode[];
};

type GroupedCategory = {
  series: Serie[];
  filmes: ContentRow[];
};

type GroupedContents = {
  [categoria: string]: GroupedCategory;
};

type AggregatedData = {
  totalRegistros: number;
  totalGerado: number;
  contents: GroupedContents;
};

let cachedData: AggregatedData | null = null;
let cacheExpires = 0;

async function readOutputJson(): Promise<AggregatedData> {
  const filePath = path.join(process.cwd(), 'lib', 'output.json');
  const fileData = await fs.promises.readFile(filePath, 'utf8');
  const jsonData = JSON.parse(fileData);
  return jsonData as AggregatedData;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedData && cacheExpires > now) {
      return NextResponse.json(cachedData);
    }

    const aggregatedData = await readOutputJson();
    cachedData = aggregatedData;
    cacheExpires = now + 3600000;

    return NextResponse.json(aggregatedData);
  } catch (error) {
    console.error('Erro ao ler o JSON:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
