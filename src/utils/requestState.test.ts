import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginRequestState,
  cancelRequestState,
  createStatusNotice,
  failRequestState,
  getViewLoadingLabel,
  sanitizeUserErrorMessage,
  succeedRequestState,
} from './requestState';

test('request lifecycle transitions cover loading, success, error, and cancelled states', () => {
  const loading = beginRequestState('กำลังโหลดรายการ...');
  assert.equal(loading.status, 'loading');
  assert.equal(loading.canCancel, true);
  assert.equal(loading.errorMessage, null);

  const ok = succeedRequestState();
  assert.equal(ok.status, 'success');
  assert.equal(ok.canCancel, false);

  const failed = failRequestState('เชื่อมต่อขัดข้อง');
  assert.equal(failed.status, 'error');
  assert.equal(failed.errorMessage, 'เชื่อมต่อขัดข้อง');

  const cancelled = cancelRequestState();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.errorMessage, 'ยกเลิกรายการแล้ว');
});

test('sanitizeUserErrorMessage strips URLs, API paths, tokens, and stack traces', () => {
  const fallback = 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
  assert.equal(
    sanitizeUserErrorMessage('Failed to fetch https://secret.api.cn/vod?key=abc'),
    fallback
  );
  assert.equal(
    sanitizeUserErrorMessage('GET /api/catalog 502 ECONNREFUSED'),
    fallback
  );
  assert.equal(
    sanitizeUserErrorMessage('Invalid Bearer token in Authorization header'),
    fallback
  );
  assert.equal(
    sanitizeUserErrorMessage('TypeError at server.ts:45'),
    fallback
  );
  assert.equal(
    sanitizeUserErrorMessage('ไม่พบรายการที่ต้องการ'),
    'ไม่พบรายการที่ต้องการ'
  );
});

test('createStatusNotice sanitizes details and preserves retry flag', () => {
  const notice = createStatusNotice(
    'error',
    'โหลดข้อมูลล้มเหลว',
    'Error calling https://internal.host/api/list',
    true
  );
  assert.equal(notice.status, 'error');
  assert.equal(notice.canRetry, true);
  assert.equal(notice.detail, 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
});

test('getViewLoadingLabel returns Thai loading labels for all views', () => {
  assert.equal(getViewLoadingLabel('home'), 'กำลังเปิดหน้าหลัก...');
  assert.equal(getViewLoadingLabel('player'), 'กำลังเตรียมเครื่องเล่นวิดีโอ...');
  assert.equal(getViewLoadingLabel('unknown'), 'กำลังโหลดข้อมูล...');
});
