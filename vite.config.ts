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

// Hayalet verileri sildik! Artık sistem boş ve temiz bir sayfa açacak.
const INITIAL_MATCHES: any[] = [];

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

        // 3. POST single match update
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
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true,
    watch: {
      ignored: ['**/tournament_state.json'] // İŞTE HAYAT KURTARAN VE RESTARTI ENGELLEYEN SATIR
    }
  },
});
