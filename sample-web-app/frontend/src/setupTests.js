import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder if needed (optional, keep if you had issues)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
  if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
} catch (e) {
  // ignore
}

// Global mock for src/api so components that call initializeApi/getApi don't perform network IO.
// Adjust returned values if tests need different responses.
// mock api module before any imports that use it
jest.mock('../api', () => ({
  initializeApi: jest.fn().mockResolvedValue(undefined),
  getApi: jest.fn().mockReturnValue({
    post: jest.fn().mockResolvedValue({
      data: { client_id: 'test-client-id', client_secret: 'test-client-secret' },
    }),
  }),
}));
