const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const iconv = require('iconv-lite');

// Função para tentar corrigir encoding caso a string contenha caracteres indesejados (ex.: "Ã")
function fixString(str) {
  if (typeof str !== 'string') return str;
  if (str.includes('Ã')) {
    return Buffer.from(str, 'binary').toString('utf8');
  }
  return str;
}

function convertCsvToJson() {
  return new Promise((resolve, reject) => {
    const csvFilePath = path.join(__dirname, 'stream.csv');
    const grouped = {};
    let totalRegistros = 0;

    fs.createReadStream(csvFilePath)
      // Converte a codificação de latin1 para utf8 para corrigir acentuação
      .pipe(iconv.decodeStream('latin1'))
      .pipe(csv())
      .on('data', (row) => {
        totalRegistros++;

        // Aplica a correção de encoding para os campos de texto
        const contentRow = {
          id: row.id,
          nome: fixString(row.nome),
          poster: fixString(row.poster),
          categoria: fixString(row.categoria),
          subcategoria: fixString(row.subcategoria),
          url: fixString(row.url),
          temporadas: fixString(row.temporadas),
          episodios: fixString(row.episodios),
          criado_em: fixString(row.criado_em),
        };

        const categoria = contentRow.categoria || 'Sem Categoria';
        if (!grouped[categoria]) {
          grouped[categoria] = { series: {}, filmes: [] };
        }

        if (contentRow.subcategoria === 'Serie') {
          // Remove o sufixo " SxxExx" para agrupar episódios da mesma série
          const baseName = contentRow.nome.replace(/\s+S\d+E\d+$/i, '').trim();
          if (!grouped[categoria].series[baseName]) {
            grouped[categoria].series[baseName] = {
              nome: baseName,
              poster: contentRow.poster, // adiciona o campo poster
              url: contentRow.url,
              temporadas: contentRow.temporadas,
              episodios: [],
            };
          }

          // Tenta extrair season e episode do nome
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
          // Adiciona filmes diretamente, mantendo todos os campos (inclusive poster)
          grouped[categoria].filmes.push(contentRow);
        }
      })
      .on('end', () => {
        let totalGerado = 0;
        const finalGrouped = {};

        for (const categoria in grouped) {
          const filmesCount = grouped[categoria].filmes.length;
          let seriesEpisodesCount = 0;
          const seriesArray = [];
          for (const baseName in grouped[categoria].series) {
            const serie = grouped[categoria].series[baseName];
            seriesEpisodesCount += serie.episodios.length;
            seriesArray.push(serie);
          }
          // totalGerado: soma de todos os filmes e de cada episódio das séries
          totalGerado += filmesCount + seriesEpisodesCount;
          finalGrouped[categoria] = {
            filmes: grouped[categoria].filmes,
            series: seriesArray,
          };
        }

        const aggregatedData = {
          totalRegistros,
          totalGerado,
          contents: finalGrouped,
        };

        resolve(aggregatedData);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function runConversion() {
  convertCsvToJson()
    .then((aggregatedData) => {
      const outputPath = path.join(__dirname, 'output.json');
      fs.writeFileSync(outputPath, JSON.stringify(aggregatedData, null, 2), 'utf8');
      console.log(`CSV convertido para JSON com sucesso em: ${outputPath}`);
    })
    .catch((err) => {
      console.error('Erro na conversão do CSV para JSON:', err);
    });
}

runConversion();
