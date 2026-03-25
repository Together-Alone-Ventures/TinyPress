/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DFX_NETWORK?: string;
  readonly VITE_INTERNET_IDENTITY_CANISTER_ID?: string;
  readonly VITE_TINYPRESS_CANISTER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
