
import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

const frontendURL = 'http://localhost:8000';
const validatorBaseURL = 'http://localhost:7080/api/auth-validator';

const rootDir = path.resolve(__dirname, '..', '..', '..'); // Goes up from sample-web-app to root
const configFilePath = path.resolve(rootDir, 'client-web-app', 'src', 'authValidatorConfig', 'config.json');
const downloadsDir = path.resolve(rootDir, 'sample-web-app', 'downloads'); // Custom folder for downloads
let targetPath:any;
const clientwebappDir = path.resolve(rootDir, 'client-web-app');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}
let backendProcess:any;

test.describe.serial('OIDC Semi-Automated Flow', () => {

    // TC-001: Verify UI Elements
    test('Verify UI elements on Client Configuration page', async ({ page }) => {
        await page.goto(frontendURL);
        await expect(page.locator('//input[@id="initUrl"]')).toBeVisible();
        await expect(page.locator('//input[@id="callbackHost"]')).toBeVisible();
        await expect(page.locator('//button[normalize-space()="Meta Data"]')).toBeVisible();
        await expect(page.locator('//button[normalize-space()="JWK"]')).toBeVisible();
    });


    // TC-002: JWK Button & File Download
    test('Download JWK and validate JSON structure', async ({ page }) => {
        await page.goto(frontendURL);

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 50000 }),
            page.click('//button[normalize-space()="JWK"]')
        ]);

        // Save file to custom folder
        const suggestedName = download.suggestedFilename();
        targetPath = path.join(downloadsDir, suggestedName);
        await download.saveAs(targetPath);

        console.log(`JWK file saved at: ${targetPath}`);

        // Validate file content
        const content = fs.readFileSync(targetPath, 'utf8');
        const jwkData = JSON.parse(content);

        // Handle both JWKS (keys array) and single JWK formats
        const firstKey = jwkData.keys?.[0] || jwkData;

        // Basic structure checks
        expect(firstKey).toHaveProperty('kty');
        expect(firstKey).toHaveProperty('kid');
        expect(firstKey).toHaveProperty('n');
        expect(firstKey).toHaveProperty('e');

        // Optional: Validate type and non-empty values
        expect(typeof firstKey.kty).toBe('string');
        expect(typeof firstKey.kid).toBe('string');
        expect(typeof firstKey.n).toBe('string');
        expect(typeof firstKey.e).toBe('string');
    });


    // TC-003: Validate happy flow, open UI, copy credentials to config file, start client web app server, and validate token
    test('Fully automated OIDC flow: Fetch creds → update config → start backend → continue UI', async ({ page }) => {
        // ---------------- CONFIG ----------------
        const endpoint = 'http://localhost:9000/api/client';
        targetPath = configFilePath;
        console.log("Path of the target file where client credentials have to be copied: "+targetPath);

        const client = {
            name: 'client-web-app',
            cwd: clientwebappDir,
            startCommand: 'npm start',
            healthUrl: 'http://localhost:7080/api/health'
        };
        console.log("Path of the client webapp directory folder from where we need to restart the server: "+clientwebappDir);

        const healthTimeoutMs = 60_000;
        const healthPollIntervalMs = 15000;

        // ---------------- STEP 1: Open Frontend ----------------
        await page.goto(frontendURL);
        console.log(`[INFO] Frontend opened and will remain loaded: ${frontendURL}`);

        // ---------------- STEP 2: Fetch Credentials ----------------
        console.log(`[INFO] Fetching credentials from ${endpoint}`);
        await page.waitForTimeout(10000); // Wait for credentials to be generated
        const resp = await page.request.get(endpoint);
        if (!resp.ok()) throw new Error(`Failed to fetch ${endpoint}: ${resp.status()} ${resp.statusText()}`);
        const body = await resp.json();
        const credsCandidate = body.credentials ?? body;
        const clientId = credsCandidate.client_id ?? credsCandidate.clientId ?? body.client_id;
        const clientSecret = credsCandidate.client_secret ?? credsCandidate.clientSecret ?? body.client_secret;
        if (!clientId || !clientSecret) throw new Error(`Missing client_id or client_secret in response: ${JSON.stringify(body)}`);
        console.log(`[INFO] Credentials fetched: client_id=${clientId}`);
        console.log(`[INFO] Credentials fetched: client_secret=${clientSecret}`);

        // ---------------- STEP 3: Backup & Update Config ----------------
        if (!fs.existsSync(targetPath)) throw new Error(`Config file not found: ${targetPath}`);
        const originalText = fs.readFileSync(targetPath, 'utf-8');

        let json = JSON.parse(originalText);
        if (json.credentials) {
            json.credentials.client_id = clientId;
            json.credentials.client_secret = clientSecret;
        } else {
            json.client_id = clientId;
            json.client_secret = clientSecret;
        }
        fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), 'utf-8');
        console.log(`[INFO] Config updated at ${targetPath}`);

        // ---------------- STEP 4: Start Backend ----------------
            backendProcess = spawn(client.startCommand, {
                cwd: client.cwd,
                env: process.env,
                detached: true,
                shell: true
            });
            backendProcess.unref();
            console.log(`[INFO] Backend started (pid: ${backendProcess.pid})`);

        // ---------------- STEP 5: Wait for Health ----------------
        const waitForHealth = async (url: string) => {
            const start = Date.now();
            while (Date.now() - start < healthTimeoutMs) {
                try {
                    const r = await page.request.get(url);
                    if (r.ok()) return true;
                } catch { }
                console.log(`[INFO] Waiting for health...`);
                await page.waitForTimeout(healthPollIntervalMs);
            }
            throw new Error(`Timed out waiting for health at ${url}`);
        };
        await waitForHealth(client.healthUrl);
        console.log(`[INFO] Backend health OK.`);
        await page.waitForTimeout(3000); // Wait for 3 seconds

        // ---------------- STEP 6: Continue UI Flow ----------------

        // Fill inputs and trigger OIDC flow
        await page.fill('#initUrl', 'http://localhost:7080/api/auth-validator/call-authorize-and-token');
        await page.fill('#callbackHost', 'http://localhost:7080/api/auth-validator/call-authorize-and-token/callback');
        await page.click('text=Open in new tab');
        await page.click('button.submit-btn');
        await page.waitForTimeout(3000); // Wait for 3 seconds
        await page.click('text=Start OIDC SSO');

        // ---------------- Handle New Tab ----------------
        const [newPage] = await Promise.all([
            page.context().waitForEvent('page'), // Wait for new tab
            page.click('text=Start OIDC SSO')    // Trigger the action that opens it
        ]);

        await newPage.waitForLoadState('domcontentloaded');
        console.log('[INFO] New tab opened for OIDC SSO');
                
        // Wait for JWKS/token details to appear in new tab
        
        await newPage.waitForSelector('pre', { timeout: 60000 });
        const rawTokenResponse = await newPage.locator('pre').textContent();

        if (!rawTokenResponse) {
            throw new Error('Token response is empty or not found in new tab');
        }

        console.log(`[INFO] Raw Token Response from new tab: ${rawTokenResponse}`);

        // Parse once and validate everything
        const tokenData = JSON.parse(rawTokenResponse);
        console.log('[INFO] Parsed Token Data:', tokenData);

        // Validate token presence and values
        expect(tokenData).toHaveProperty('id_token');
        expect(tokenData).toHaveProperty('access_token');
        expect(tokenData).toHaveProperty('token_type');
        expect(tokenData).toHaveProperty('expires_in');

        // Validate token_type and expires_in values
        expect(tokenData.token_type).toBe('Bearer');
        expect(tokenData.expires_in).toBe(900);

    });

    // TC-004: Validate ID Token via API
    test('Validate ID Token via API', async ({ request }) => {
        const tokenResponse = await request.get(`${validatorBaseURL}/call-authorize-and-token`);
        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;
        const validateResponse = await request.get(`${validatorBaseURL}/validate-id-token?token=${idToken}`);
        const validateData = await validateResponse.json();
        console.log("Token validity and claim data is as follows:\n" + JSON.stringify(validateData, null, 2));

        expect(validateData.isValid).toBe(true);
        expect(validateData.payload).toHaveProperty('iss');
        expect(validateData.payload).toHaveProperty('sub');
        expect(validateData.payload).toHaveProperty('aud');
        expect(validateData.payload).toHaveProperty('exp');
    });

    // TC-005: Token expiry behavior
    // test('Validate system behavior when token is expired', async ({ request }) => {
    //     const tokenResponse = await request.get(`${validatorBaseURL}/call-authorize-and-token`);
    //     const tokenData = await tokenResponse.json();
    //     const idToken = tokenData.id_token;

    //     console.log('Waiting for token expiry...');
    //     const waitTimeMs = 310_000;
    //     let remainingSec = Math.ceil(waitTimeMs / 1000);

    //     const interval = setInterval(() => {
    //     if (remainingSec % 30 === 0 || remainingSec <= 5) {
    //         console.log(`⏳ Time left: ${remainingSec}s`);
    //     }
    //     remainingSec--;
    //     if (remainingSec < 0) clearInterval(interval);
    //     }, 1000);

    //     await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    //     console.log('✅ Wait complete.');

    //     const validateResponse = await request.get(`${validatorBaseURL}/validate-id-token?token=${idToken}`);
    //     const validateData = await validateResponse.json();
    //     // Print the entire response object for debugging
    //     console.log('Response received:', validateData);

    //     expect(validateData.isValid).toBe(false);
    //     expect(validateData.error).toBe("\"exp\" claim timestamp check failed");
    // });

    test.afterAll(() => {
    if (backendProcess?.pid) {
        try {
            process.kill(-backendProcess.pid);  // Kill process group
        } catch {
            backendProcess.kill();              // Fallback
        }
        console.log('[CLEANUP] Backend process stopped.');
    }
    });

});