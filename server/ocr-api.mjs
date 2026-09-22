import { runGeminiOcr } from './gemini-ocr.mjs';

const MAX_BODY_BYTES = 20 * 1024 * 1024;

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export function createOcrMiddleware({ getApiKey = () => process.env.GEMINI_API_KEY, runOcr = runGeminiOcr } = {}) {
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/gemini-ocr') return next();
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'POSTを使用してください。' });
    }
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
      return json(res, 415, { error: 'JSON形式で送信してください。' });
    }
    const apiKey = String(getApiKey() || '').trim();
    if (!apiKey) return json(res, 503, { error: 'OCRが未設定です。管理者がReplit SecretsにGEMINI_API_KEYを登録してください。' });

    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) return json(res, 413, { error: 'OCR画像のサイズが大きすぎます。' });
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'リクエストを読み取れませんでした。' });
    }
    const { images, forcedIndustry } = body || {};
    if (!Array.isArray(images) || images.length < 1 || images.length > 6
      || images.some(image => !image || image.mimeType !== 'image/jpeg'
        || typeof image.data !== 'string' || !image.data.length || image.data.length % 4 !== 0
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))
      || (forcedIndustry != null && (typeof forcedIndustry !== 'string' || forcedIndustry.length > 40))) {
      return json(res, 400, { error: 'OCR画像または工事種別が不正です。' });
    }
    try {
      const result = await runOcr(images, apiKey, { forcedIndustry });
      return json(res, 200, result);
    } catch {
      // Never forward upstream errors: they may contain credentials or request data.
      return json(res, 502, { error: 'Gemini OCRに失敗しました。設定を確認するか、時間をおいて再試行してください。' });
    }
  };
}
