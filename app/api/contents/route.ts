import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import iconv from 'iconv-lite';

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

async function readAndGroupCsv(): Promise<AggregatedData> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(process.cwd(), 'lib', 'stream.csv');

    const grouped: { [categoria: string]: { series: { [baseName: string]: Serie }, filmes: ContentRow[] } } = {};
    let totalRegistros = 0;

    fs.createReadStream(filePath)

      .pipe(iconv.decodeStream('latin1'))
      .pipe(csv())
      .on('data', (row: any) => {
        totalRegistros++;

        const contentRow: ContentRow = {
          id: row.id,
          nome: row.nome,
          poster: row.poster,
          categoria: row.categoria,
          subcategoria: row.subcategoria,
          url: row.url,
          temporadas: row.temporadas,
          episodios: row.episodios,
          criado_em: row.criado_em,
        };

        const categoria = contentRow.categoria || 'Sem Categoria';
        if (!grouped[categoria]) {
          grouped[categoria] = { series: {}, filmes: [] };
        }

        if (contentRow.subcategoria === 'Serie') {
          const baseName = contentRow.nome.replace(/\s+S\d+E\d+$/i, '').trim();
          if (!grouped[categoria].series[baseName]) {
            grouped[categoria].series[baseName] = {
              nome: baseName,
              url: contentRow.url, 
              temporadas: contentRow.temporadas,
              episodios: [],
            };
          }

          const match = contentRow.nome.match(/S(\d+)E(\d+)$/i);
          if (match) {
            const season = parseInt(match[1], 10);
            const episode = parseInt(match[2], 10);
            grouped[categoria].series[baseName].episodios.push({
              season,
              episode,
              url: contentRow.url,
            });
          } else {
            grouped[categoria].series[baseName].episodios.push({
              season: contentRow.temporadas ? parseInt(contentRow.temporadas, 10) : null,
              episode: contentRow.episodios ? parseInt(contentRow.episodios, 10) : null,
              url: contentRow.url,
            });
          }
        } else {
          grouped[categoria].filmes.push(contentRow);
        }
      })
      .on('end', () => {
        let totalGerado = 0;
        const finalGrouped: GroupedContents = {};

        for (const categoria in grouped) {
          const filmesCount = grouped[categoria].filmes.length;
          let seriesEpisodesCount = 0;
          const seriesArray: Serie[] = [];
          for (const baseName in grouped[categoria].series) {
            const serie = grouped[categoria].series[baseName];
            seriesEpisodesCount += serie.episodios.length;
            seriesArray.push(serie);
          }
          totalGerado += filmesCount + seriesEpisodesCount;
          finalGrouped[categoria] = {
            filmes: grouped[categoria].filmes,
            series: seriesArray,
          };
        }

        const aggregatedData: AggregatedData = {
          totalRegistros,
          totalGerado,
          contents: finalGrouped,
        };

        resolve(aggregatedData);
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedData && cacheExpires > now) {
      return NextResponse.json(cachedData);
    }

    const aggregatedData = await readAndGroupCsv();
    cachedData = aggregatedData;
    cacheExpires = now + 3600000; 

    return NextResponse.json(aggregatedData);
  } catch (error) {
    console.error('Erro ao processar o CSV:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
