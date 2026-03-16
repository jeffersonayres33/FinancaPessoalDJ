import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Carrega as variáveis de ambiente, incluindo as do sistema (como as do GitHub Actions)
    const env = loadEnv(mode, process.cwd(), '');
    
    // Pega a chave da variável GEMINI_API_KEY ou API_KEY
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    const defineObj: Record<string, any> = {};
    if (apiKey) {
      defineObj['process.env.API_KEY'] = JSON.stringify(apiKey);
      defineObj['process.env.GEMINI_API_KEY'] = JSON.stringify(apiKey);
    }

    return {
      base: process.env.GITHUB_ACTIONS ? '/FinancaPessoalDJ/' : '/', // Caminho base para GitHub Pages ou AI Studio
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: defineObj,
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
