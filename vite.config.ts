import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

interface TournamentState {
  version: number;
  lastUpdated: string;
  updatedBy: string;
  deskPin: string;
  referees: Array<{ name: string; pin: string }>;
  categoryFormats: Record<string, string>;
  matches: Array<any>;
}

const STORAGE_FILE = path.resolve(__dirname, 'tournament_state.json');

const INITIAL_REFEREES = [
  { name: 'CANAN ÇAPLIK', pin: '1212' },
  { name: 'FURKAN GÖK', pin: '1313' },
  { name: 'DERİN GÜLER', pin: '1414' },
];

const INITIAL_CATEGORY_FORMATS = {
  'Kadın 8 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Erkek 9 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Kadın 9 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Erkek 10 Yaş T': '3 Kısa Set',
  'Kadın 10 Yaş T': '3 Kısa Set',
  '12 Yaş Erkek': '3 Normal Set',
  '12 Yaş Kadın': '3 Normal Set',
  '14 Yaş': '3 Normal Set',
  'Büyükler': '3 Normal Set',
};

const INITIAL_MATCHES = [
  {
    id: 'm-1',
    Kort: 'KAPALI KORT 2',
    Saat: '09:30',
    'Oyuncu 1': 'NIL ÇOLAKOĞLU',
    'Oyuncu 2': 'ELA DEREN INAM',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Bitti',
    Skor: '4/0 4/2 0/0',
    Kura_Kazanan: 'NIL ÇOLAKOĞLU',
    Kura_Tercih: 'Karşılama',
    Saha_Tarafi: 'Sandalyenin Sağı',
    Baslangic_Saati: '09:35',
    Bitis_Saati: '21:00',
    Son_Hakem: 'CANAN ÇAPLIK',
    Kazanan: 'NIL ÇOLAKOĞLU',
  },
  {
    id: 'm-2',
    Kort: 'KAPALI KORT 2',
    Saat: '10:00',
    'Oyuncu 1': 'ZEYNEP ERVA ATAMAN',
    'Oyuncu 2': 'DEREN BEKTAŞ',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Bitti',
    Skor: '4/0 4/0 0/0',
    Kura_Kazanan: 'ZEYNEP ERVA ATAMAN',
    Kura_Tercih: 'Servis',
    Saha_Tarafi: 'Sandalyenin Solu',
    Baslangic_Saati: '20:50',
    Bitis_Saati: '21:00',
    Son_Hakem: 'FURKAN GÖK',
    Kazanan: 'ZEYNEP ERVA ATAMAN',
  },
  {
    id: 'm-3',
    Kort: 'KAPALI KORT 2',
    Saat: '10:30',
    'Oyuncu 1': 'DURU TAŞ',
    'Oyuncu 2': 'MELİS ŞAHİN',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-4',
    Kort: 'KAPALI KORT 2',
    Saat: '11:00',
    'Oyuncu 1': 'LİNA VARDAR',
    'Oyuncu 2': 'ALİNA YILDIZ',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Bitti',
    Skor: '4/1 4/2 0/0',
    Kura_Kazanan: 'LİNA VARDAR',
    Kura_Tercih: 'Karşılama',
    Saha_Tarafi: 'Sandalyenin Solu',
    Baslangic_Saati: '21:10',
    Bitis_Saati: '21:30',
    Son_Hakem: 'DERİN GÜLER',
    Kazanan: 'LİNA VARDAR',
  },
  {
    id: 'm-5',
    Kort: 'KAPALI KORT 2',
    Saat: '11:30',
    'Oyuncu 1': 'ASYA KAYA',
    'Oyuncu 2': 'ELİF DEMİR',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-6',
    Kort: 'KAPALI KORT 2',
    Saat: '12:00',
    'Oyuncu 1': 'DEFNE YILMAZ',
    'Oyuncu 2': 'BEREN ÇELİK',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-7',
    Kort: 'KAPALI KORT 2',
    Saat: '12:30',
    'Oyuncu 1': 'MAVİ GÜN',
    'Oyuncu 2': 'ADA YALÇIN',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Oynaniyor',
    Skor: '0/0 0/0 0/0',
    Kura_Kazanan: 'MAVİ GÜN',
    Kura_Tercih: 'Servis',
    Saha_Tarafi: 'Sandalyenin Sağı',
    Baslangic_Saati: '21:35',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: 'CANAN ÇAPLIK',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-8',
    Kort: 'KAPALI KORT 2',
    Saat: '13:00',
    'Oyuncu 1': 'ZÜMRA KOÇ',
    'Oyuncu 2': 'NEHİR AY',
    Kategori: 'Kadın 8 Yaş T',
    Skor_Formati: '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
    Durum: 'Bitti',
    Skor: '4/1 4/1 0/0',
    Kura_Kazanan: 'ZÜMRA KOÇ',
    Kura_Tercih: 'Karşılama',
    Saha_Tarafi: 'Sandalyenin Solu',
    Baslangic_Saati: '21:00',
    Bitis_Saati: '21:30',
    Son_Hakem: 'DERİN GÜLER',
    Kazanan: 'ZÜMRA KOÇ',
  },
  {
    id: 'm-9',
    Kort: 'KAPALI KORT 3',
    Saat: '09:30',
    'Oyuncu 1': 'DENİZ ÇETİN',
    'Oyuncu 2': 'BORA POLAT',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Oynaniyor',
    Skor: '3/1 0/0 0/0',
    Kura_Kazanan: 'DENİZ ÇETİN',
    Kura_Tercih: 'Servis',
    Saha_Tarafi: 'Sandalyenin Sağı',
    Baslangic_Saati: '21:40',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: 'FURKAN GÖK',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-10',
    Kort: 'KAPALI KORT 3',
    Saat: '10:30',
    'Oyuncu 1': 'EMİR YILDIZ',
    'Oyuncu 2': 'SARP BULUT',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-11',
    Kort: 'KAPALI KORT 3',
    Saat: '11:30',
    'Oyuncu 1': 'KEREM DEMİR',
    'Oyuncu 2': 'ARAS ŞEN',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-12',
    Kort: 'KAPALI KORT 3',
    Saat: '12:30',
    'Oyuncu 1': 'MERT ÖZTÜRK',
    'Oyuncu 2': 'KAAN ÇELİK',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-13',
    Kort: 'KAPALI KORT 3',
    Saat: '13:30',
    'Oyuncu 1': 'YİĞİT ASLAN',
    'Oyuncu 2': 'CAN BERK',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Oynaniyor',
    Skor: '1/0 0/0 0/0',
    Kura_Kazanan: 'YİĞİT ASLAN',
    Kura_Tercih: 'Karşılama',
    Saha_Tarafi: 'Sandalyenin Solu',
    Baslangic_Saati: '21:45',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: 'CANAN ÇAPLIK',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-14',
    Kort: 'KAPALI KORT 3',
    Saat: '14:30',
    'Oyuncu 1': 'EFE GÜLER',
    'Oyuncu 2': 'DORUK KAYA',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-15',
    Kort: 'KAPALI KORT 3',
    Saat: '15:30',
    'Oyuncu 1': 'BATUHAN ŞEN',
    'Oyuncu 2': 'ALP DOĞAN',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
  {
    id: 'm-16',
    Kort: 'KAPALI KORT 3',
    Saat: '16:30',
    'Oyuncu 1': 'TUNA AYDIN',
    'Oyuncu 2': 'BURAK KOÇ',
    Kategori: 'Erkek 10 Yaş T',
    Skor_Formati: '3 Kısa Set',
    Durum: 'Baslamadi',
    Skor: '-',
    Kura_Kazanan: 'Secilmedi',
    Kura_Tercih: 'Secilmedi',
    Saha_Tarafi: 'Secilmedi',
    Baslangic_Saati: 'Secilmedi',
    Bitis_Saati: 'Secilmedi',
    Son_Hakem: '-',
    Kazanan: 'Secilmedi',
  },
];

function loadState(): TournamentState {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.matches) && data.matches.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to read tournament_state.json:', err);
  }

  const initial: TournamentState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Sistem Başlatıcı',
    deskPin: '9999',
    referees: INITIAL_REFEREES,
    categoryFormats: INITIAL_CATEGORY_FORMATS,
    matches: INITIAL_MATCHES,
  };
  saveState(initial);
  return initial;
}

function saveState(state: TournamentState) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save tournament_state.json:', err);
  }
}

function tournamentSyncPlugin(): Plugin {
  let tournamentState: TournamentState = loadState();
  const sseClients = new Set<ServerResponse>();

  const broadcastEvent = (eventData: any) => {
    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(message);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const readBody = (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  };

  return {
    name: 'tournament-sync-server',
    configureServer(server) {
      // Heartbeat to keep SSE alive through mobile carrier NAT/proxies
      // Buraya taşıdık! Artık derleme (build) sırasında sistemi kilitlemeyecek.
      setInterval(() => {
        for (const client of sseClients) {
          try {
            client.write(': keepalive\n\n');
          } catch {
            sseClients.delete(client);
          }
        }
      }, 15000);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        // 1. SSE Real-time Stream
        if (url === '/api/events' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write(`data: ${JSON.stringify({ type: 'CONNECTED', tournament: tournamentState })}\n\n`);
          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. GET full tournament state
        if (url === '/api/tournament' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(tournamentState));
          return;
        }

        // 3. POST single match update (Fine-grained per-court concurrency)
        if (url === '/api/sync-match' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            const { match, author } = body;
            if (!match || !match.id) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing match object or match.id' }));
              return;
            }

            const matchIndex = tournamentState.matches.findIndex((m) => m.id === match.id);
            if (matchIndex >= 0) {
              tournamentState.matches[matchIndex] = {
                ...tournamentState.matches[matchIndex],
                ...match,
                Son_Guncelleme: new Date().toISOString(),
                Son_Hakem: author || match.Son_Hakem || 'Saha Gözlemcisi',
              };
            } else {
              tournamentState.matches.push({
                ...match,
                Son_Guncelleme: new Date().toISOString(),
                Son_Hakem: author || 'Saha Gözlemcisi',
              });
            }

            tournamentState.version = (tournamentState.version || 1) + 1;
            tournamentState.lastUpdated = new Date().toISOString();
            tournamentState.updatedBy = author || match.Son_Hakem || 'Saha Gözlemcisi';

            saveState(tournamentState);

            // Broadcast instantly to ALL phone and desktop screens!
            broadcastEvent({
              type: 'MATCH_UPDATED',
              match: tournamentState.matches[matchIndex >= 0 ? matchIndex : tournamentState.matches.length - 1],
              version: tournamentState.version,
              lastUpdated: tournamentState.lastUpdated,
              updatedBy: tournamentState.updatedBy,
            });

            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ success: true, version: tournamentState.version }));
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
            return;
          }
        }

        // 4. POST batch matches
        if (url === '/api/batch-matches' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            const { matches, author } = body;
            if (Array.isArray(matches)) {
              tournamentState.matches = matches;
              tournamentState.version = (tournamentState.version || 1) + 1;
              tournamentState.lastUpdated = new Date().toISOString();
              tournamentState.updatedBy = author || 'Saha Gözlemcisi';

              saveState(tournamentState);

              broadcastEvent({
                type: 'MATCHES_UPDATED',
                matches: tournamentState.matches,
                version: tournamentState.version,
                lastUpdated: tournamentState.lastUpdated,
                updatedBy: tournamentState.updatedBy,
              });
            }

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, version: tournamentState.version }));
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message }));
            return;
          }
        }

        // 5. POST full tournament replacement
        if (url === '/api/tournament' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            if (body.matches) tournamentState.matches = body.matches;
            if (body.referees) tournamentState.referees = body.referees;
            if (body.categoryFormats) tournamentState.categoryFormats = body.categoryFormats;
            if (body.deskPin) tournamentState.deskPin = body.deskPin;

            tournamentState.version = (tournamentState.version || 1) + 1;
            tournamentState.lastUpdated = new Date().toISOString();
            tournamentState.updatedBy = body.author || 'Başhakem Masası';

            saveState(tournamentState);

            broadcastEvent({
              type: 'TOURNAMENT_UPDATED',
              tournament: tournamentState,
            });

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, version: tournamentState.version }));
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tournamentSyncPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
