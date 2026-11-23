import { RequestStatus, StatusNotice } from '../types/series';

export interface RequestLifecycleState {
  status: RequestStatus;
  loadingLabel: string;
  errorMessage: string | null;
  canCancel: boolean;
}

export const INITIAL_REQUEST_STATE: RequestLifecycleState = {
  status: 'idle',
  loadingLabel: 'กำลังโหลดข้อมูล...',
  errorMessage: null,
  canCancel: true,
};

export function beginRequestState(
  loadingLabel = 'กำลังโหลดข้อมูล...',
  canCancel = true
): RequestLifecycleState {
  return {
    status: 'loading',
    loadingLabel,
    errorMessage: null,
    canCancel,
  };
}

export function succeedRequestState(): RequestLifecycleState {
  return {
    status: 'success',
    loadingLabel: '',
    errorMessage: null,
    canCancel: false,
  };
}

export function failRequestState(rawMessage?: string): RequestLifecycleState {
  return {
    status: 'error',
    loadingLabel: '',
    errorMessage: sanitizeUserErrorMessage(rawMessage),
    canCancel: false,
  };
}

export function cancelRequestState(): RequestLifecycleState {
  return {
    status: 'cancelled',
    loadingLabel: '',
    errorMessage: 'ยกเลิกรายการแล้ว',
    canCancel: false,
  };
}

/**
 * Ensures no internal URLs, endpoints, stack traces, IP addresses, or secrets
 * can ever leak into user-facing error messages.
 */
export function sanitizeUserErrorMessage(raw?: unknown): string {
  const defaultMsg = 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
  if (typeof raw !== 'string') return defaultMsg;

  const trimmed = raw.trim();
  if (!trimmed) return defaultMsg;

  // Reject any technical / sensitive patterns so they never appear on screen
  const forbiddenPattern =
    /(https?:\/\/|\/api\/|localhost|127\.0\.0\.1|0\.0\.0\.0|api[_-]?key|token|bearer|secret|password|stack|at\s+\S+:\d+|econnrefused|enotfound|fetch failed|cors|authorization)/i;

  if (forbiddenPattern.test(trimmed) || trimmed.length > 140) {
    return defaultMsg;
  }

  return trimmed;
}

export function createStatusNotice(
  status: StatusNotice['status'],
  title: string,
  detail?: string,
  canRetry = false
): StatusNotice {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    status,
    title,
    detail: detail ? sanitizeUserErrorMessage(detail) : undefined,
    canRetry,
  };
}

export function getViewLoadingLabel(view: string): string {
  switch (view) {
    case 'home':
      return 'กำลังเปิดหน้าหลัก...';
    case 'catalog':
      return 'กำลังโหลดรายการซีรีส์...';
    case 'detail':
      return 'กำลังโหลดรายละเอียดซีรีส์...';
    case 'player':
      return 'กำลังเตรียมเครื่องเล่นวิดีโอ...';
    case 'favorites':
      return 'กำลังโหลดรายการโปรด...';
    case 'history':
      return 'กำลังโหลดประวัติการรับชม...';
    case 'settings':
      return 'กำลังเปิดหน้าตั้งค่า...';
    default:
      return 'กำลังโหลดข้อมูล...';
  }
}
