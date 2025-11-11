// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    // Define a URL base para todos os testes.
    // O servidor de desenvolvimento do Vite geralmente roda na porta 5173.
    // Se a sua porta for diferente, ajuste aqui.
    baseURL: 'http://localhost:5173',

    // Rastreia as execuções de teste para facilitar a depuração.
    trace: 'on-first-retry',
  },
  // Inicia o servidor de desenvolvimento antes de rodar os testes.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
