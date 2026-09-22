import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createOcrMiddleware } from './server/ocr-api.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const ocrApi = () => createOcrMiddleware({ getApiKey: () => process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY });
  return {
    plugins: [react(), {
      name: 'gemini-ocr-api',
      configureServer(server) { server.middlewares.use(ocrApi()); },
      configurePreviewServer(server) { server.middlewares.use(ocrApi()); },
    }],
    server: { host: '0.0.0.0', port: Number(process.env.PORT) || 5173 },
  };
});
