// mock api module before any imports that use it
jest.mock('../api', () => ({
  initializeApi: jest.fn().mockResolvedValue(undefined),
  getApi: jest.fn().mockReturnValue({
    post: jest.fn().mockResolvedValue({
      data: { client_id: 'test-client-id', client_secret: 'test-client-secret' },
    }),
  }),
}));

import React from "react"; 
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../pages/Home/HomePage';
import { Provider } from 'react-redux';
import { store } from './../app/store';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';

// Removed per-test jest.mock for the API — global mock lives in src/setupTests.js

describe('MetadataDownload functionality', () => {
  test('validate metadata json gets downloaded on clicking the button', async () => {
    jest.useFakeTimers();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </Provider>
    );

    // Wait for component to finish loading and show the metadata button
    const metaButton = await screen.findByTestId('metadata-button');

    // ensure the anchor has correct href/download attrs (verifies what will be downloaded)
    const anchor = metaButton.closest('a') as HTMLAnchorElement | null;
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', '/metadata.json');
    expect(anchor).toHaveAttribute('download', 'metadata.json');

    // trigger click + advance timers inside act to show toast
    React.act(() => {
      fireEvent.click(metaButton);
      jest.advanceTimersByTime(2000);
    });

    // wait for toast
    await waitFor(() => {
      const msg = screen.getByTestId('message');
      expect(msg.textContent).toContain('metadata.json downloaded');
    });

    // Optional: verify actual JSON file exists in project's public folder and is valid JSON
    const metadataPath = path.join(process.cwd(), 'public', 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath, 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow(); // file is valid JSON
      const parsed = JSON.parse(raw);
      console.log('Downloaded metadata.json content:', parsed);
      expect(parsed).toBeDefined();
      // optional: assert expected keys, e.g. expect(parsed).toHaveProperty('issuer');
    } else {
      // fallback: you can add a test fixture at public/metadata.json or assert the anchor only
      // console.warn('public/metadata.json not found; skipping file content check');
    }

    jest.useRealTimers();
  });
});