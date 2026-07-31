import { test, expect } from '@playwright/test';

test.describe('Navegação e páginas base', () => {
  test('a página inicial carrega com CTA de cadastro', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AgendaF[áa]cil/i);
    // Existe pelo menos um link/botão levando ao login/cadastro
    const cta = page.locator('a[href*="/login"]').first();
    await expect(cta).toBeVisible({ timeout: 15000 });
  });

  test('a tela de login tem abas Entrar e Criar conta', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
  });

  test('em Criar conta aparecem os perfis Empresa e Funcionário', async ({ page }) => {
    await page.goto('/login?view=sign_up');
    await expect(page.getByText('Empresa', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Funcionário', { exact: true }).first()).toBeVisible();
  });

  test('rota desconhecida mostra a página 404', async ({ page }) => {
    await page.goto('/rota/que/nao/existe/mesmo');
    await expect(page.getByText('404')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/não encontrada/i)).toBeVisible();
  });
});
