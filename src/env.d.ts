/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_RELEASE_BATCH?: string;
  readonly VITE_ROOM_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
