/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    // add other VITE_ env vars here as needed
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
