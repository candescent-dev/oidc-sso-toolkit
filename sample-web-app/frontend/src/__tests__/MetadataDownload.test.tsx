import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../app/store';
import HomePage from '../pages/Home/HomePage';
import * as api from '../services/api';

// Mock the api module
vi.mock('../services/api', () => ({
  initializeApi: vi.fn().mockResolvedValue(undefined),
  getApi: vi.fn().mockReturnValue({
    post: vi.fn().mockResolvedValue({
      data: { client_id: 'test-client-id', client_secret: 'test-client-secret' },
    }),
  }),
}));

describe('MetadataDownload functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validate metadata json download button exists', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </Provider>
    );

    // Wait for component to finish loading and show the metadata button
    const metaButton = await screen.findByTestId('metadata-button');
    expect(metaButton).toBeDefined();
  });
});
