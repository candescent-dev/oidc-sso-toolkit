import axios, { AxiosInstance } from 'axios';

export interface RuntimeConfig {
  baseURL: string;
}

// Runtime state
let runtimeConfig: RuntimeConfig = { baseURL: 'http://localhost:9000' }; // default
let api: AxiosInstance | null = null;
let configLoaded = false;

/**
 * Initialize API: load config.json and create Axios instance
 */
export async function initializeApi(): Promise<void> {
  if (configLoaded) return; // only load once
  try {
    const res = await fetch('/config.json');
    if (res.ok) {
      const data = await res.json();
      runtimeConfig.baseURL = data.baseURL || runtimeConfig.baseURL;
      console.log('Loaded runtime config:', runtimeConfig);
    } else {
      console.warn('config.json not found, using default backend URL');
    }
  } catch (error) {
    console.warn('Error loading config.json, using default backend URL', error);
  }
  // Create Axios instance once
  api = axios.create({
    baseURL: `${runtimeConfig.baseURL}/api/`,
    timeout: 5000,
    withCredentials: true,
  });
  configLoaded = true;
}

/**
 * Get Axios instance (after initialization)
 */
export function getApi(): AxiosInstance {
  if (!api) {
    throw new Error('API not initialized. Call initializeApi() before calling getApi().');
  }
  return api;
}
