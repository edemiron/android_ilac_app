import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import remindersRoute from './routes/reminders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * DURUM: Bu Express servisi su an mobil uygulama tarafindan KULLANILMIYOR
 * (kod tabaninda /api/reminders veya :3001 cagrisi yok). Yine de repoda
 * durdugu icin guvenli varsayilanlarla calisir hale getirildi:
 *
 *  - CORS: onceden `cors()` ile TUM origin'lere aciykti; artik allowlist.
 *  - Kimlik dogrulama: uclar tamamen aciykti; artik Firebase ID token zorunlu.
 *    Aksi halde e-posta / WhatsApp / Slack gonderen acik bir relay olurdu.
 *  - Basit hiz siniri: kullanici basina dakikalik istek tavani.
 */

// ---------------------------------------------------------------------------
// Firebase Admin (ID token dogrulamasi icin)
// ---------------------------------------------------------------------------

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// ---------------------------------------------------------------------------
// CORS — allowlist
// ---------------------------------------------------------------------------

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Mobil/native istemcilerde Origin basligi yoktur — onlara izin verilir;
      // koruma kimlik dogrulama katmanindan gelir.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: bu origin izinli degil'));
    },
  })
);

app.use(express.json({ limit: '64kb' }));

// ---------------------------------------------------------------------------
// Kimlik dogrulama
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token.' });
  }
}

// ---------------------------------------------------------------------------
// Basit hiz siniri (kullanici basina)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.uid || req.ip || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Cok fazla istek. Lutfen biraz bekleyin.' });
  }

  entry.count += 1;
  return next();
}

// Bellek sizintisini onlemek icin suresi dolmus kayitlari periyodik temizle.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetAt) requestCounts.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/reminders', requireAuth, rateLimit, remindersRoute);

// Health check — yapilandirma detayi sizdirmaz.
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Ilac Hatirlatici API' });
});

// Error handling
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowlist: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '(yalnizca Origin gondermeyen istemciler)'}`);
});
