import { test, expect, request } from '@playwright/test';
import fs from 'fs';

const backend_url = 'http://localhost:9000';
const frontend_url = 'http://localhost:8000';
const issuer = 'https://www.digitalinsight.com';

test('backend should return status 200 for /api/health', async () => {
  const apiContext = await request.newContext();
  const response = await apiContext.get(backend_url + '/api/health');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty('status', 'ok');
});

test('downloads metadata JSON and validates content', async ({ page }) => {

    await page.goto(frontend_url);

    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 50000 }),
        page.click('[data-testid="metadata-button"]')
    ]);

    const filePath = await download.path();
    if (!filePath) {
        throw new Error("Download failed: file path is null");
    }
    const content = fs.readFileSync(filePath, 'utf8');
    console.log("Downloaded metadata content:", content);
    const json = JSON.parse(content);
    console.log("Parsed JSON:", json);

    await new Promise(resolve => setTimeout(resolve, 10000));

    const authorization_endpoint = backend_url + '/api/auth/authorize';
    const token_endpoint = backend_url + '/api/auth/token';

    expect(json).toHaveProperty('authorization_endpoint', authorization_endpoint);
    expect(json).toHaveProperty('token_endpoint', token_endpoint);
    expect(json).toHaveProperty('issuer', issuer);

});