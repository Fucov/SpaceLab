/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY: string
  readonly VITE_API_ENDPOINTS: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_AGENT_ENGINE_FRAMEWORK?: string
  readonly VITE_AGENT_ENGINE_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
