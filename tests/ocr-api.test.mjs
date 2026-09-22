import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createOcrMiddleware } from '../server/ocr-api.mjs';
import { runGeminiOcr } from '../server/gemini-ocr.mjs';

const images = [{ mimeType: 'image/jpeg', data: '/9j/2Q==' }];

async function withApi(t, options, action) {
  const middleware = createOcrMiddleware(options);
  const server = createServer((req, res) => middleware(req, res, () => res.writeHead(404).end()));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/gemini-ocr`;
  await action((body, method = 'POST') => fetch(url, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  }));
}

test('OCR uses only the server secret and returns OCR data without credentials', async t => {
  await withApi(t, {
    getApiKey: () => 'server-secret',
    runOcr: async (actualImages, key, options) => {
      assert.deepEqual(actualImages, images);
      assert.equal(key, 'server-secret');
      assert.equal(options.forcedIndustry, '建築一式');
      return { data: { scores: { p: 600 } }, text: '{}', model: 'test-model' };
    },
  }, async post => {
    const response = await post({ images, forcedIndustry: '建築一式', apiKey: 'client-secret' });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(JSON.parse(text).data.scores.p, 600);
    assert.ok(!text.includes('secret'));
  });
});

test('missing secret is actionable without an upstream call', async t => {
  await withApi(t, { getApiKey: () => '', runOcr: () => assert.fail('must not call Gemini') }, async post => {
    const response = await post({ images });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GEMINI_API_KEY/);
  });
});

test('rejects invalid JSON, images, oversized requests and unsupported methods', async t => {
  await withApi(t, { getApiKey: () => 'secret', runOcr: () => assert.fail('must not call Gemini') }, async post => {
    for (const body of ['{', { images: [] }, { images: Array(7).fill(images[0]) }, { images: [{ mimeType: 'text/plain', data: 'AAAA' }] }]) {
      assert.equal((await post(body)).status, 400);
    }
    assert.equal((await post({ images, padding: 'a'.repeat(20 * 1024 * 1024) })).status, 413);
    assert.equal((await post(null, 'GET')).status, 405);
  });
});

test('upstream failure details cannot expose the secret to the browser', async t => {
  await withApi(t, { getApiKey: () => 'secret', runOcr: () => { throw new Error('credential: secret'); } }, async post => {
    const response = await post({ images });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('secret'));
  });
});

test('Gemini request sends the key in a server header and preserves the industry prompt', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\//);
    assert.ok(!url.includes('server-secret'));
    assert.equal(options.headers['x-goog-api-key'], 'server-secret');
    const body = JSON.parse(options.body);
    assert.match(body.contents[0].parts[0].text, /建築一式/);
    assert.deepEqual(body.contents[0].parts[1].inline_data, { mime_type: 'image/jpeg', data: images[0].data });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"scores":{"p":600}}' }] } }] }));
  });
  const result = await runGeminiOcr(images, 'server-secret', { forcedIndustry: '建築一式' });
  assert.equal(result.data.scores.p, 600);
});
