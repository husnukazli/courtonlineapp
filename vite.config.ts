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
    console.error('State okunamadi:', err);
  }

  let startingMatches = INITIAL_MATCHES;
  try {
    const macProgramiPath = path.resolve(__dirname, 'mac_programi.json');
    if (fs.existsSync(macProgramiPath)) {
      const rawMac = fs.readFileSync(macProgramiPath, 'utf-8');
      const parsedMac = JSON.parse(rawMac);
      if (Array.isArray(parsedMac) && parsedMac.length > 0) {
        startingMatches = parsedMac.map((m: any, index: number) => ({
          id: `m-${index + 1}`,
          ...m
        }));
      }
    }
  } catch (err) {
    console.error('mac_programi.json okunamadi:', err);
  }

  const initial: TournamentState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Sistem Başlatıcı',
    deskPin: '9999',
    referees: INITIAL_REFEREES,
    categoryFormats: INITIAL_CATEGORY_FORMATS,
    matches: startingMatches,
  };
  saveState(initial);
  return initial;
}

function saveState(state: TournamentState) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('State kaydedilemedi:', err);
  }
}

function tournamentSyncPlugin(): Plugin {
  let tournamentState: TournamentState = loadState();
  const sseClients = new Set<ServerResponse>();

  const broadcastEvent = (eventData: any) => {
    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try { client.write(message); } catch { sseClients.delete(client); }
    }
  };

  setInterval(() => {
    for (const client of sseClients) {
      try { client.write(': keepalive\n\n'); } catch { sseClients.delete(client); }
    }
  }, 15000);

  const readBody = (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body ? JSON.parse(body) : {}));
      req.on('error', reject);
    });
  };

  // API Yönlendirme Motoru (Hem Dev hem Canlı için ortak)
  const apiMiddleware = async (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0] || '';

    if (url === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', tournament: tournamentState })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (url === '/api/tournament' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(tournamentState));
      return;
    }

    if (url === '/api/sync-match' && req.method === 'POST') {
      try {
        const { match, author } = await readBody(req);
        if (!match || !match.id) {
          res.writeHead(400); res.end(JSON.stringify({ error: 'Eksik veri' })); return;
        }
        const matchIndex = tournamentState.matches.findIndex(m => m.id === match.id);
        if (matchIndex >= 0) {
          tournamentState.matches[matchIndex] = { ...tournamentState.matches[matchIndex], ...match, Son_Guncelleme: new Date().toISOString() };
        } else {
          tournamentState.matches.push({ ...match, Son_Guncelleme: new Date().toISOString() });
        }
        saveState(tournamentState);
        broadcastEvent({ type: 'MATCH_UPDATED', match: tournamentState.matches[matchIndex >= 0 ? matchIndex : tournamentState.matches.length - 1] });
        res.writeHead(200); res.end(JSON.stringify({ success: true }));
        return;
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Server error' })); return;
      }
    }

    if (url === '/api/batch-matches' && req.method === 'POST') {
      try {
        const { matches } = await readBody(req);
        if (Array.isArray(matches)) {
          tournamentState.matches = matches;
          saveState(tournamentState);
          broadcastEvent({ type: 'MATCHES_UPDATED', matches: tournamentState.matches });
        }
        res.writeHead(200); res.end(JSON.stringify({ success: true }));
        return;
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Server error' })); return;
      }
    }

    if (url === '/api/tournament' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        if (body.matches) tournamentState.matches = body.matches;
        if (body.referees) tournamentState.referees = body.referees;
        if (body.categoryFormats) tournamentState.categoryFormats = body.categoryFormats;
        if (body.deskPin) tournamentState.deskPin = body.deskPin;
        saveState(tournamentState);
        broadcastEvent({ type: 'TOURNAMENT_UPDATED', tournament: tournamentState });
        res.writeHead(200); res.end(JSON.stringify({ success: true }));
        return;
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Server error' })); return;
      }
    }

    next();
  };

  return {
    name: 'tournament-sync-server',
    // Hem bilgisayardaki test (dev) hem de Render'daki canlı (preview) sunucuya API'yi zorla ekliyoruz
    configureServer(server) { server.middlewares.use(apiMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(apiMiddleware); }
  };
}

export default defineConfig({
  plugins: [react(), tournamentSyncPlugin()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true,
    watch: { ignored: ['**/tournament_state.json'] }
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true,
  }
});
