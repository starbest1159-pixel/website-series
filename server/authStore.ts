import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { UserSession } from '../src/types/series.ts';

export const SESSION_COOKIE_NAME = 'bannlai_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  isVip: boolean;
  vipExpiryLabel: string;
  createdAt: string;
}

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  isVip: boolean;
  vipExpiryLabel: string;
  exp: number;
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'server', 'data');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPasswordHash(password: string, salt: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserSession(user: StoredUserRecord): UserSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVip: user.isVip,
    vipExpiryLabel: user.vipExpiryLabel,
    provider: 'email',
  };
}

export class PersistentAuthStore {
  private readonly dataDir: string;
  private readonly usersPath: string;
  private readonly secretPath: string;
  private usersByEmail = new Map<string, StoredUserRecord>();
  private signingSecret = '';
  private loaded = false;

  constructor(dataDir: string = DEFAULT_DATA_DIR) {
    this.dataDir = dataDir;
    this.usersPath = path.join(dataDir, 'users.json');
    this.secretPath = path.join(dataDir, 'auth-secret.key');
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      ensureDir(this.dataDir);
    } catch {
      // Keep in-memory state active if filesystem is read-only
    }

    // Load or generate stable server HMAC secret
    const envSecret = (process.env.AUTH_SESSION_SECRET || '').trim();
    if (envSecret.length >= 16) {
      this.signingSecret = envSecret;
    } else if (fs.existsSync(this.secretPath)) {
      this.signingSecret = fs.readFileSync(this.secretPath, 'utf8').trim();
    } else {
      this.signingSecret = crypto.randomBytes(32).toString('hex');
      try {
        fs.writeFileSync(this.secretPath, this.signingSecret, { encoding: 'utf8', mode: 0o600 });
      } catch {
        // Keep in-memory secret if filesystem is read-only
      }
    }

    try {
      if (fs.existsSync(this.usersPath)) {
        const raw = fs.readFileSync(this.usersPath, 'utf8');
        const list = JSON.parse(raw) as StoredUserRecord[];
        if (Array.isArray(list)) {
          for (const rec of list) {
            if (rec && rec.email && rec.passwordHash && rec.passwordSalt) {
              this.usersByEmail.set(normalizeEmail(rec.email), rec);
            }
          }
        }
      }
    } catch {
      this.usersByEmail.clear();
    }
  }

  private saveUsers(): void {
    try {
      ensureDir(this.dataDir);
      const list = Array.from(this.usersByEmail.values());
      const tmp = `${this.usersPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmp, this.usersPath);
    } catch {
      // Keep in-memory state active if disk write fails
    }
  }

  public register(input: {
    name: string;
    email: string;
    password: string;
  }): { ok: true; user: UserSession; token: string } | { ok: false; message: string; status: number } {
    this.ensureLoaded();
    const cleanName = input.name.trim().slice(0, 60);
    const cleanEmail = normalizeEmail(input.email);
    const password = input.password;

    if (cleanName.length < 2) {
      return { ok: false, status: 400, message: 'กรุณากรอกชื่อผู้ใช้อย่างน้อย 2 ตัวอักษร' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, status: 400, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
    }
    if (password.length < 6) {
      return { ok: false, status: 400, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
    }
    if (this.usersByEmail.has(cleanEmail)) {
      return { ok: false, status: 409, message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const record: StoredUserRecord = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      name: cleanName,
      email: cleanEmail,
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      isVip: true,
      vipExpiryLabel: '31 ธ.ค. 2569',
      createdAt: new Date().toISOString(),
    };

    this.usersByEmail.set(cleanEmail, record);
    this.saveUsers();

    const user = toUserSession(record);
    return {
      ok: true,
      user,
      token: this.issueToken(record),
    };
  }

  public login(input: {
    email: string;
    password: string;
  }): { ok: true; user: UserSession; token: string } | { ok: false; message: string; status: number } {
    this.ensureLoaded();
    const cleanEmail = normalizeEmail(input.email);
    const password = input.password;

    if (!cleanEmail || !password) {
      return { ok: false, status: 400, message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' };
    }

    const record = this.usersByEmail.get(cleanEmail);
    if (!record || !verifyPasswordHash(password, record.passwordSalt, record.passwordHash)) {
      return { ok: false, status: 401, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }

    const user = toUserSession(record);
    return {
      ok: true,
      user,
      token: this.issueToken(record),
    };
  }

  public issueToken(user: StoredUserRecord): string {
    this.ensureLoaded();
    const payload: SessionPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      isVip: user.isVip,
      vipExpiryLabel: user.vipExpiryLabel,
      exp: Date.now() + SESSION_TTL_MS,
    };
    const body = toBase64Url(JSON.stringify(payload));
    const sig = toBase64Url(
      crypto.createHmac('sha256', this.signingSecret).update(body).digest()
    );
    return `${body}.${sig}`;
  }

  public verifyToken(token: string | null | undefined): UserSession | null {
    this.ensureLoaded();
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;

    const [body, sig] = parts;
    const expectedSig = toBase64Url(
      crypto.createHmac('sha256', this.signingSecret).update(body).digest()
    );

    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    try {
      const payload = JSON.parse(fromBase64Url(body)) as SessionPayload;
      if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
        return null;
      }
      const record = this.usersByEmail.get(normalizeEmail(payload.email));
      if (!record || record.id !== payload.sub) {
        return null;
      }
      return toUserSession(record);
    } catch {
      return null;
    }
  }
}

export function extractTokenFromHeaders(headers: {
  authorization?: string;
  cookie?: string;
}): string | null {
  const auth = headers.authorization;
  if (typeof auth === 'string' && /^bearer\s+/i.test(auth.trim())) {
    const token = auth.trim().replace(/^bearer\s+/i, '').trim();
    if (token) return token;
  }

  const cookieHeader = headers.cookie;
  if (typeof cookieHeader === 'string' && cookieHeader.trim()) {
    for (const part of cookieHeader.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      if (key === SESSION_COOKIE_NAME) {
        const val = decodeURIComponent(part.slice(idx + 1).trim());
        if (val) return val;
      }
    }
  }

  return null;
}

export function buildSessionCookieHeader(token: string, isProd = false): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const defaultAuthStore = new PersistentAuthStore();
