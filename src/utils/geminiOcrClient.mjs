const STORAGE_KEY = 'keishin-ocr-api-url-v1';
const ACCESS_CODE_KEY = 'keishin-ocr-access-code-v1';
const LEGACY_OCR_PATH = '/api/gemini-ocr';
const OCR_PATH = '/api/keishin-ocr';
const SUPPORTED_PATHS = new Set([OCR_PATH, LEGACY_OCR_PATH]);
const PRODUCTION_OCR_URL = `https://ai-interview.replit.app${OCR_PATH}`;
let memoryAccessCode = '';
let memoryApiUrl = '';

function buildEnv() {
  return import.meta.env || {};
}

function pageProtocol() {
  return typeof window !== 'undefined' ? window.location.protocol : '';
}

function pageOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

function readStoredUrl() {
  try {
    return typeof localStorage === 'undefined' ? memoryApiUrl : localStorage.getItem(STORAGE_KEY) || memoryApiUrl;
  } catch {
    return memoryApiUrl;
  }
}

function normalizePath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return SUPPORTED_PATHS.has(path) ? path : '';
}

/** Validate an OCR endpoint, allowing only the two supported API paths. */
export function validateOcrApiUrl(value, { currentProtocol = pageProtocol(), origin = pageOrigin() } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const isRelative = raw.startsWith('/');
  let url;
  try {
    url = new URL(raw, origin || 'http://localhost');
  } catch {
    throw new Error('OCRサーバーURLは http:// または https:// から始まる完全なURLを入力してください。');
  }
  if ((!isRelative && url.protocol !== 'http:' && url.protocol !== 'https:') || raw.startsWith('//')) {
    throw new Error('OCRサーバーURLは http:// または https:// のURLを指定してください。');
  }
  if (!normalizePath(url.pathname)) {
    throw new Error(`OCRサーバーURLには ${OCR_PATH} または ${LEGACY_OCR_PATH} を指定してください。`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('OCRサーバーURLにユーザー情報、クエリ、ハッシュは指定できません。');
  }
  if (currentProtocol === 'https:' && url.protocol !== 'https:') {
    throw new Error('HTTPSで開いている画面からは、HTTPSのOCRサーバーURLを指定してください。');
  }
  return isRelative ? normalizePath(url.pathname) : url.toString();
}

/** Resolve a URL without touching browser storage. Exported for focused tests. */
export function resolveOcrApiUrl({ storedUrl = '', configuredUrl = '', dev = false, origin = '' } = {}) {
  const selected = String(storedUrl || configuredUrl || '').trim();
  if (selected) return selected;
  if (dev && origin) return new URL(LEGACY_OCR_PATH, origin).toString();
  return PRODUCTION_OCR_URL;
}

export function getConfiguredOcrApiUrl() {
  const env = buildEnv();
  return resolveOcrApiUrl({
    storedUrl: readStoredUrl(),
    configuredUrl: env.VITE_OCR_API_URL || '',
    dev: Boolean(env.DEV),
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });
}

export function setConfiguredOcrApiUrl(value) {
  const normalized = validateOcrApiUrl(value);
  memoryApiUrl = normalized;
  try {
    if (typeof localStorage !== 'undefined') {
      if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
      else localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // A private browsing policy should not prevent text-PDF import from working.
  }
  return normalized;
}

function readAccessCode() {
  try {
    return typeof sessionStorage === 'undefined' ? memoryAccessCode : sessionStorage.getItem(ACCESS_CODE_KEY) || memoryAccessCode;
  } catch {
    return memoryAccessCode;
  }
}

export function getOcrAccessCode() {
  return readAccessCode();
}

export function setOcrAccessCode(value) {
  const code = String(value ?? '');
  memoryAccessCode = code;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (code) sessionStorage.setItem(ACCESS_CODE_KEY, code);
      else sessionStorage.removeItem(ACCESS_CODE_KEY);
    }
  } catch {
    // Memory fallback keeps the code tab-session-only when storage is blocked.
  }
  return code;
}

export function clearOcrAccessCode() {
  return setOcrAccessCode('');
}

function redactSecret(message, secret) {
  const text = String(message || '');
  return secret ? text.split(secret).join('[OCR利用コード]') : text;
}

function isExternalEndpoint(url) {
  if (url.startsWith('/')) return false;
  try {
    return !pageOrigin() || new URL(url).origin !== pageOrigin();
  } catch {
    return true;
  }
}

function endpointPath(url) {
  try {
    return normalizePath(new URL(url, pageOrigin() || 'http://localhost').pathname);
  } catch {
    return '';
  }
}

export async function requestGeminiOcr(images, { forcedIndustry, apiUrl, accessCode } = {}) {
  const configuredUrl = apiUrl || getConfiguredOcrApiUrl();
  const validated = validateOcrApiUrl(configuredUrl);
  const url = validated.startsWith('/') && pageOrigin() ? new URL(validated, pageOrigin()).toString() : validated;
  const code = accessCode ?? getOcrAccessCode();
  const external = isExternalEndpoint(url);
  const requiresCode = external || endpointPath(url) === OCR_PATH;
  if (requiresCode && !code) throw new Error('OCR利用コードを入力してください。Gemini APIキーは入力しないでください。');

  let response;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (requiresCode) headers.Authorization = `Bearer ${code}`;
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ images, forcedIndustry }),
    });
  } catch {
    throw new Error('OCRサーバーに接続できませんでした。サーバーの起動状態、URL、CORS設定を確認してください。');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new Error(redactSecret(payload?.error || 'OCRサーバーから有効な結果を受け取れませんでした。', code));
  }
  return payload;
}

export {
  ACCESS_CODE_KEY as OCR_ACCESS_CODE_STORAGE_KEY,
  LEGACY_OCR_PATH,
  OCR_PATH,
  PRODUCTION_OCR_URL,
  STORAGE_KEY as OCR_API_URL_STORAGE_KEY,
};
