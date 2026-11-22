import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'site-store.json');

interface GuestbookEntry {
  id: string;
  type: 'doodle' | 'note';
  author: string;
  createdAt: string;
  imageDataUrl?: string;
  message?: string;
  noteTone?: 'cream' | 'blush' | 'sky' | 'butter';
}

interface SiteStore {
  passcodeHash: string | null;
  ownerToken: string | null;
  document: Record<string, unknown> | null;
  draftDocument: Record<string, unknown> | null;
  draftDirty: boolean;
  draftUpdatedAt: string | null;
  guestbook: GuestbookEntry[];
}

function hashPasscode(passcode: string): string {
  return crypto.createHash('sha256').update(`lace_straw_${passcode}`).digest('hex');
}

function readStore(): SiteStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SiteStore>;
      return {
        passcodeHash: parsed.passcodeHash || null,
        ownerToken: parsed.ownerToken || null,
        document: parsed.document || null,
        draftDocument: parsed.draftDocument || null,
        draftDirty: Boolean(parsed.draftDirty),
        draftUpdatedAt: parsed.draftUpdatedAt || null,
        guestbook: Array.isArray(parsed.guestbook) ? parsed.guestbook : [],
      };
    }
  } catch {
    // Fallback to empty store
  }
  return {
    passcodeHash: null,
    ownerToken: null,
    document: null,
    draftDocument: null,
    draftDirty: false,
    draftUpdatedAt: null,
    guestbook: [],
  };
}

function writeStore(store: SiteStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  // Public read: returns published page canvas & whether an owner passcode has been claimed
  app.get('/api/page', (_req, res) => {
    const store = readStore();
    res.json({
      hasPasscode: Boolean(store.passcodeHash),
      document: store.document,
    });
  });

  // Check if current client token is valid owner
  app.get('/api/owner/session', (req, res) => {
    const store = readStore();
    const token = req.header('x-owner-token');
    const isOwner = Boolean(
      store.ownerToken && token && token === store.ownerToken
    );
    res.json({
      hasPasscode: Boolean(store.passcodeHash),
      isOwner,
    });
  });

  // Owner read: get saved draft if any
  app.get('/api/owner/draft', (req, res) => {
    const store = readStore();
    const token = req.header('x-owner-token');
    if (store.passcodeHash && (!token || token !== store.ownerToken)) {
      res.status(401).json({ error: 'Owner authentication required.' });
      return;
    }
    res.json({
      draft: store.draftDocument,
      draftDirty: store.draftDirty,
      updatedAt: store.draftUpdatedAt,
    });
  });

  // Owner save/auto-save draft without affecting public page until Save/Publish
  app.put('/api/owner/draft', (req, res) => {
    const store = readStore();
    const token = req.header('x-owner-token');
    if (store.passcodeHash && (!token || token !== store.ownerToken)) {
      res.status(401).json({ error: 'Owner authentication required.' });
      return;
    }

    const doc = req.body?.document;
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.items)) {
      res.status(400).json({ error: 'Invalid draft document.' });
      return;
    }

    store.draftDocument = doc;
    store.draftDirty = true;
    store.draftUpdatedAt = new Date().toISOString();
    writeStore(store);
    res.json({ ok: true, updatedAt: store.draftUpdatedAt });
  });

  // Claim ownership with a passcode (first time) or verify existing passcode
  app.post('/api/owner/login', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 4) {
      res.status(400).json({ error: 'Passcode must be at least 4 characters.' });
      return;
    }

    const store = readStore();
    const incomingHash = hashPasscode(passcode);

    if (!store.passcodeHash) {
      const token = crypto.randomBytes(24).toString('hex');
      store.passcodeHash = incomingHash;
      store.ownerToken = token;
      writeStore(store);
      res.json({ ok: true, token, claimed: true });
      return;
    }

    if (store.passcodeHash !== incomingHash) {
      res.status(401).json({ error: 'Incorrect passcode.' });
      return;
    }

    if (!store.ownerToken) {
      store.ownerToken = crypto.randomBytes(24).toString('hex');
      writeStore(store);
    }

    res.json({ ok: true, token: store.ownerToken, claimed: false });
  });

  // Save/Publish updated canvas layout (Owner only once passcode is set)
  app.put('/api/page', (req, res) => {
    const store = readStore();
    const token = req.header('x-owner-token');

    if (store.passcodeHash && (!token || token !== store.ownerToken)) {
      res.status(401).json({ error: 'Owner authentication required to publish changes.' });
      return;
    }

    const doc = req.body?.document;
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.items)) {
      res.status(400).json({ error: 'Invalid page document.' });
      return;
    }

    store.document = doc;
    store.draftDocument = doc;
    store.draftDirty = false;
    store.draftUpdatedAt = new Date().toISOString();
    writeStore(store);
    res.json({ ok: true });
  });

  // Public Guestbook: list entries
  app.get('/api/guestbook', (_req, res) => {
    const store = readStore();
    res.json({ entries: store.guestbook });
  });

  // Public Guestbook: add doodle or note from any visitor
  app.post('/api/guestbook', (req, res) => {
    const body = req.body || {};
    const type = body.type === 'doodle' ? 'doodle' : 'note';
    const author =
      typeof body.author === 'string' && body.author.trim()
        ? body.author.trim().slice(0, 32)
        : 'Visitor';

    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const entry: GuestbookEntry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      author,
      createdAt: `${mm}/${dd} · ${time}`,
    };

    if (type === 'doodle') {
      if (typeof body.imageDataUrl !== 'string' || !body.imageDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Invalid doodle image.' });
        return;
      }
      entry.imageDataUrl = body.imageDataUrl;
    } else {
      if (typeof body.message !== 'string' || !body.message.trim()) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }
      entry.message = body.message.trim().slice(0, 240);
      entry.noteTone = ['cream', 'blush', 'sky', 'butter'].includes(body.noteTone)
        ? body.noteTone
        : 'butter';
    }

    const store = readStore();
    store.guestbook = [entry, ...store.guestbook].slice(0, 60);
    writeStore(store);
    res.json({ ok: true, entry });
  });

  // Owner-only Guestbook delete
  app.delete('/api/guestbook/:id', (req, res) => {
    const store = readStore();
    const token = req.header('x-owner-token');
    if (store.passcodeHash && (!token || token !== store.ownerToken)) {
      res.status(401).json({ error: 'Owner authentication required.' });
      return;
    }
    store.guestbook = store.guestbook.filter((g) => g.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
