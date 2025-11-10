import 'express-session';

declare module 'express-session' {
  interface SessionData {
    clientCredentials?: {
      client_id: string;
      client_secret: string;
      created_at: string;
    };
  }
}
