import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import * as path from 'path';

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
    const actualJSON = JSON.parse(content);
    console.log("Parsed JSON:", actualJSON);

    await new Promise(resolve => setTimeout(resolve, 10000));

    const authorization_endpoint = backend_url + '/api/auth/authorize';
    const token_endpoint = backend_url + '/api/auth/token';

    expect(actualJSON).toHaveProperty('authorization_endpoint', authorization_endpoint);
    expect(actualJSON).toHaveProperty('token_endpoint', token_endpoint);
    expect(actualJSON).toHaveProperty('issuer', issuer);

    //const expectedJSON = JSON.parse(fs.readFileSync('../sample-web-app/test/expected-metadata.json', 'utf8'));

    const expectedFilePath = path.resolve(__dirname, '../expected-metadata.json');
    const expectedJSON = JSON.parse(fs.readFileSync(expectedFilePath, 'utf8'));


    function getAllKeys(obj: any, prefix = ''): string[] {
    return Object.keys(obj).flatMap(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        return typeof obj[key] === 'object' && obj[key] !== null
        ? getAllKeys(obj[key], fullKey)
        : fullKey;
    });
    }

    const expectedKeys = getAllKeys(expectedJSON);
    const actualKeys = getAllKeys(actualJSON);

    expect(actualKeys).toEqual(expectedKeys);

});