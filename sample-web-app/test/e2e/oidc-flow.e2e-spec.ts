
import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

const frontendURL = 'http://localhost:8000';
const validatorBaseURL = 'http://localhost:7000/api/auth-validator';

const configFilePath = path.resolve(process.cwd(), 'auto-dbk-devex-oidc-sso-toolkit', 'client-web-app', 'src', 'authValidatorConfig', 'config.json');
const downloadsDir = path.resolve(process.cwd(), 'sample-web-app', 'downloads'); // Custom folder for downloads
let targetPath:any;
const clientwebappDir = path.resolve(process.cwd(), 'client-web-app');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

test.describe.serial('OIDC Semi-Automated Flow', () => {

    // TC-001: Verify UI Elements
    test('Verify UI elements on Client Configuration page', async ({ page }) => {
        await page.goto(frontendURL);
        await expect(page.locator('//input[@id="initUrl"]')).toBeVisible();
        await expect(page.locator('//input[@id="callbackHost"]')).toBeVisible();
        await expect(page.locator('//button[normalize-space()="Meta Data"]')).toBeVisible();
        await expect(page.locator('//button[normalize-space()="JWK"]')).toBeVisible();
    });


    // TC-002 & TC-003: JWK Button & File Download
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

    //TC-003: Validate happy flow, open UI, copy credentials to config file, restart client web app server, and generate token and validate if it is valid json and token.
    test('Fully automated OIDC flow: Fetch creds → update config → restart backend → continue UI', async ({ page }) => {
        // ---------------- CONFIG ----------------
        const endpoint = 'http://localhost:9000/api/client';
        targetPath = path.resolve(
            process.env.HOME || '',
            configFilePath
        );

        const client = {
            name: 'client-web-app',
            cwd: path.resolve(process.env.HOME || '', clientwebappDir),
            startCommand: 'npm start',
            port: 7000,
            healthUrl: 'http://localhost:7000/api/health'
        };

        const healthTimeoutMs = 60_000;
        const healthPollIntervalMs = 1500;

        // ---------------- STEP 1: Open Frontend ----------------
        await page.goto(frontendURL);
        console.log(`[INFO] Frontend opened and will remain loaded: ${frontendURL}`);

        // ---------------- STEP 2: Fetch Credentials ----------------
        console.log(`[INFO] Fetching credentials from ${endpoint}`);
        await page.waitForTimeout(10000); // Wait 10 seconds for credentials to be generated
        const resp = await page.request.get(endpoint);
        if (!resp.ok()) throw new Error(`Failed to fetch ${endpoint}: ${resp.status()} ${resp.statusText()}`);
        const body = await resp.json();
        const credsCandidate = body.credentials ?? body;
        const clientId = credsCandidate.client_id ?? credsCandidate.clientId ?? body.client_id;
        const clientSecret = credsCandidate.client_secret ?? credsCandidate.clientSecret ?? body.client_secret;
        if (!clientId || !clientSecret) throw new Error(`Missing client_id or client_secret in response: ${JSON.stringify(body)}`);
        console.log(`[INFO] Credentials fetched: client_id=${clientId}`);

        // ---------------- STEP 3: Backup & Update Config ----------------
        if (!fs.existsSync(targetPath)) throw new Error(`Config file not found: ${targetPath}`);
        const originalText = fs.readFileSync(targetPath, 'utf-8');
        const backupPath = `${targetPath}.bak-${Date.now()}`;
        fs.writeFileSync(backupPath, originalText, 'utf-8');
        console.log(`[INFO] Backup saved: ${backupPath}`);

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

        // ---------------- STEP 4: Identify & Kill Services on Port 7000 ----------------
        console.log(`[INFO] Checking for services running on port ${client.port}...`);
        let servicesInfo = '';
        try {
            servicesInfo = execSync(`lsof -i tcp:${client.port}`, { encoding: 'utf8' }).trim();
            if (servicesInfo) {
                console.log(`[INFO] Services currently running on port ${client.port}:\n${servicesInfo}`);
            } else {
                console.log(`[INFO] No services found on port ${client.port}.`);
            }
        } catch (e) {
            console.warn(`[WARN] Unable to list services: ${e.message}`);
        }

        try {
            const killOutput = execSync(`lsof -ti tcp:${client.port} | xargs kill -9 || true`, { encoding: 'utf8' }).trim();
            if (killOutput) {
                console.log(`[INFO] Killed processes with PIDs: ${killOutput}`);
            } else {
                console.log(`[INFO] No processes to kill on port ${client.port}.`);
            }
        } catch (e) {
            console.warn(`[WARN] Error killing processes: ${e.message}`);
        }

        // ---------------- STEP 5: Restart Backend ----------------
        console.log(`[INFO] Starting backend: ${client.startCommand}`);
        const [startCmd, ...startArgs] = client.startCommand.split(' ');
        const child = spawn(startCmd, startArgs, {
            cwd: client.cwd,
            env: process.env,
            shell: true,
            detached: true
        });
        child.unref();
        console.log(`[INFO] Backend started (pid: ${child.pid})`);

        // ---------------- STEP 6: Wait for Health ----------------
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

        // ---------------- STEP 7: Continue UI Flow ----------------

        // Fill inputs and trigger OIDC flow
        await page.fill('#initUrl', 'http://localhost:7000/api/auth-validator/call-authorize-and-token');
        await page.fill('#callbackHost', 'http://localhost:7000/api/auth-validator/call-authorize-and-token/callback');
        await page.click('text=Open in new tab');
        await page.click('button.submit-btn');
        await page.click('text=Start OIDC SSO');

        // ---------------- Handle New Tab ----------------
        const [newPage] = await Promise.all([
            page.context().waitForEvent('page'), // Wait for new tab
            page.click('text=Start OIDC SSO')    // Trigger the action that opens it
        ]);

        await newPage.waitForLoadState('domcontentloaded');
        console.log('[INFO] New tab opened for OIDC SSO');

        // Wait for JWKS/token details to appear
        await newPage.waitForSelector('pre', { timeout: 60000 });
        const tokenResponse = await newPage.locator('pre').textContent();
        console.log(`[INFO] Token Response from new tab: ${tokenResponse}`);

        // Validate token response
        expect(tokenResponse).toContain('id_token');
        expect(tokenResponse).toContain('access_token');
    });

    // TC-007: Validate ID Token via API
    test('Validate ID Token via API', async ({ request }) => {
        const tokenResponse = await request.get(`${validatorBaseURL}/call-authorize-and-token`);
        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;

        const validateResponse = await request.get(`${validatorBaseURL}/validate-id-token?token=${idToken}`);
        const validateData = await validateResponse.json();

        expect(validateData.valid).toBe(true);
        expect(validateData.payload).toHaveProperty('iss');
        expect(validateData.payload).toHaveProperty('sub');
    });

    // TC-008: Negative case - Invalid credentials
    test('Ensure error when Client ID or Secret Key is incorrect', async ({ request }) => {
        const invalidConfig = { client_id: 'invalid', client_secret: 'invalid' };
        fs.writeFileSync(configFilePath, JSON.stringify(invalidConfig, null, 2));

        const response = await request.get(`${validatorBaseURL}/call-authorize-and-token`);
        expect(response.status()).toBe(400);
    });

    // TC-009: Token expiry behavior
    test('Validate system behavior when token is expired', async ({ request }) => {
        const tokenResponse = await request.get(`${validatorBaseURL}/call-authorize-and-token`);
        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;

        console.log('Waiting for token expiry...');
        await new Promise(resolve => setTimeout(resolve, 310000)); // Wait ~5 mins

        const validateResponse = await request.get(`${validatorBaseURL}/validate-id-token?token=${idToken}`);
        const validateData = await validateResponse.json();
        expect(validateData.valid).toBe(false);
    });
});