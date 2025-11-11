// tests/public-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Public Member Page', () => {
  test('should display an error message when the member is not found', async ({ page }) => {
    // Navega para uma página com um slug de membro que provavelmente não existe.
    await page.goto('/e/barbeariadogabe/p/membro-inexistente');

    // 1. Verifica se a mensagem de erro específica é exibida.
    const errorLocator = page.locator('h1:has-text("Profissional não encontrado para esta organização.")');

    // Aguarda o localizador estar visível, confirmando que a página carregou e mostrou o erro.
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // 2. Tira um screenshot para verificação visual do estado de erro.
    await page.screenshot({ path: 'tests/screenshots/public-page-error.png' });
  });
});
