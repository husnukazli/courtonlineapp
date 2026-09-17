import { test, expect } from '@playwright/test';

test('sayfa basariyla yukleniyor ve turnuva listesi geliyor', async ({ page }) => {
  // Uygulamanın ana sayfasına gidiyoruz
  await page.goto('/');

  // Sayfanın başlığının doğruluğunu kontrol ediyoruz
  await expect(page).toHaveTitle(/CourtOnline/);

  // Ekranda "Aktif Turnuvalar" yazısının görünmesini bekliyoruz
  await expect(page.locator('text=Aktif Turnuvalar')).toBeVisible();
});
