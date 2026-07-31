import { test, expect } from '@playwright/test';

test.describe('Página pública do profissional', () => {
  test('mostra erro quando o profissional não existe', async ({ page }) => {
    await page.goto('/empresa-inexistente-xyz/profissional-xyz');
    await expect(
      page.getByText(/não encontrad/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
