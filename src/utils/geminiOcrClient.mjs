export async function requestGeminiOcr(images, { forcedIndustry } = {}) {
  const response = await fetch('/api/gemini-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, forcedIndustry }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error || 'OCRサーバーに接続できませんでした。');
  }
  return payload;
}
