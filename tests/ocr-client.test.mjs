import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearOcrAccessCode,
  getConfiguredOcrApiUrl,
  PRODUCTION_OCR_URL,
  requestGeminiOcr,
  resolveOcrApiUrl,
  setConfiguredOcrApiUrl,
  setOcrAccessCode,
  validateOcrApiUrl,
} from '../src/utils/geminiOcrClient.mjs';

const images = [{ mimeType: 'image/jpeg', data: '/9j/2Q==' }];

test('OCR endpoint defaults and URL validation stay constrained', () => {
  assert.equal(resolveOcrApiUrl({ dev: true, origin: 'http://localhost:5173' }), 'http://localhost:5173/api/gemini-ocr');
  assert.equal(resolveOcrApiUrl({}), PRODUCTION_OCR_URL);
  assert.equal(validateOcrApiUrl('https://ai-interview.replit.app/api/keishin-ocr'), 'https://ai-interview.replit.app/api/keishin-ocr');
  assert.equal(validateOcrApiUrl('/api/gemini-ocr'), '/api/gemini-ocr');
  for (const value of [
    'https://example.test/api/other',
    'https://user:password@example.test/api/keishin-ocr',
    'https://example.test/api/keishin-ocr?code=secret',
    'https://example.test/api/keishin-ocr#secret',
  ]) {
    assert.throws(() => validateOcrApiUrl(value), /URL|指定|指定できません/);
  }
  assert.throws(
    () => validateOcrApiUrl('http://example.test/api/keishin-ocr', { currentProtocol: 'https:' }),
    /HTTPS/
  );
});

test('external OCR sends the access code only as a Bearer header', async t => {
  const accessCode = 'tab-only-code-123';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://ai-interview.replit.app/api/keishin-ocr');
    assert.equal(options.headers.Authorization, `Bearer ${accessCode}`);
    assert.ok(!url.includes(accessCode));
    assert.ok(!options.body.includes(accessCode));
    return new Response(JSON.stringify({ data: { scores: { p: 600 } }, model: 'test' }), { status: 200 });
  });

  const result = await requestGeminiOcr(images, {
    apiUrl: PRODUCTION_OCR_URL,
    accessCode,
    forcedIndustry: '建築一式',
  });
  assert.equal(result.data.scores.p, 600);
});

test('external OCR requires a code without making a request', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('must not call OCR without a code'));
  await assert.rejects(
    requestGeminiOcr(images, { apiUrl: PRODUCTION_OCR_URL, accessCode: '' }),
    error => error instanceof Error && /OCR利用コード/.test(error.message) && !error.message.includes('secret')
  );
});

test('current server path uses Bearer auth even same-origin, legacy path does not', async t => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: 'http://localhost:5173', protocol: 'http:' } };
  t.after(() => { globalThis.window = previousWindow; });
  let call = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    call += 1;
    if (call === 1) assert.equal(options.headers.Authorization, 'Bearer local-code');
    else assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify({ data: { scores: { p: 600 } } }), { status: 200 });
  });

  await requestGeminiOcr(images, { apiUrl: 'http://localhost:5173/api/keishin-ocr', accessCode: 'local-code' });
  await requestGeminiOcr(images, { apiUrl: 'http://localhost:5173/api/gemini-ocr' });
  assert.equal(call, 2);
});

test('server errors cannot echo the access code to the browser', async t => {
  const accessCode = 'do-not-leak-this-code';
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: `bad token ${accessCode}` }), { status: 401 }));
  await assert.rejects(
    requestGeminiOcr(images, { apiUrl: PRODUCTION_OCR_URL, accessCode }),
    error => error instanceof Error && !error.message.includes(accessCode) && error.message.includes('[OCR利用コード]')
  );
});

test('access code memory fallback is session-only and clearable', () => {
  setOcrAccessCode('memory-code');
  // Importing the getter here avoids putting the value in any scenario or app state.
  return import('../src/utils/geminiOcrClient.mjs').then(({ getOcrAccessCode }) => {
    assert.equal(getOcrAccessCode(), 'memory-code');
    clearOcrAccessCode();
    assert.equal(getOcrAccessCode(), '');
  });
});

test('configured URL uses memory fallback when local storage is unavailable', () => {
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() { throw new Error('storage blocked'); },
      setItem() { throw new Error('storage blocked'); },
      removeItem() { throw new Error('storage blocked'); },
    },
  });
  try {
    const url = 'https://example.test/api/keishin-ocr';
    setConfiguredOcrApiUrl(url);
    assert.equal(getConfiguredOcrApiUrl(), url);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
    setConfiguredOcrApiUrl('');
  }
});
