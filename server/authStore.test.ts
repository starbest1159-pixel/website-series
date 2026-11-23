import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractTokenFromHeaders, PersistentAuthStore, SESSION_COOKIE_NAME } from './authStore';

test('PersistentAuthStore registers, hashes passwords, authenticates, persists, and rejects bad credentials or tampered tokens', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bannlai-auth-'));

  try {
    const auth = new PersistentAuthStore(tmpDir);

    const reg = auth.register({
      name: 'สมาชิกทดสอบ',
      email: 'member@example.com',
      password: 'secret-password-123',
    });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    assert.equal(reg.user.email, 'member@example.com');
    assert.ok(reg.token.includes('.'));

    // Ensure plaintext password is NEVER written to users.json
    const diskRaw = fs.readFileSync(path.join(tmpDir, 'users.json'), 'utf8');
    assert.equal(diskRaw.includes('secret-password-123'), false);

    // Duplicate email rejected
    const dup = auth.register({
      name: 'ซ้ำ',
      email: 'MEMBER@example.com',
      password: 'another-password',
    });
    assert.equal(dup.ok, false);

    // Wrong password rejected
    const badLogin = auth.login({
      email: 'member@example.com',
      password: 'wrong-password',
    });
    assert.equal(badLogin.ok, false);

    // Valid login succeeds on fresh reloaded store instance
    const reloadedAuth = new PersistentAuthStore(tmpDir);
    const goodLogin = reloadedAuth.login({
      email: 'member@example.com',
      password: 'secret-password-123',
    });
    assert.equal(goodLogin.ok, true);
    if (!goodLogin.ok) return;

    // Verify valid token & reject tampered token
    const verified = reloadedAuth.verifyToken(goodLogin.token);
    assert.equal(verified?.email, 'member@example.com');
    assert.equal(reloadedAuth.verifyToken(`${goodLogin.token}tampered`), null);

    // Header & cookie token extraction
    assert.equal(
      extractTokenFromHeaders({ authorization: `Bearer ${goodLogin.token}` }),
      goodLogin.token
    );
    assert.equal(
      extractTokenFromHeaders({
        cookie: `other=1; ${SESSION_COOKIE_NAME}=${encodeURIComponent(goodLogin.token)}`,
      }),
      goodLogin.token
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
