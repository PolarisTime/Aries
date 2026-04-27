/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface CLodopLicenseConfig {
  companyName?: string
  licenseA?: string
  companyNameB?: string
  licenseB?: string
}

interface CLodopInstance {
  PRINT_INIT(title: string): void
  PRINT_INITA(top: string | number, left: string | number, width: string | number, height: string | number, title: string): void
  SET_LICENSES(companyName: string, licenseA: string, companyNameB: string, licenseB: string): void
  GET_PRINTER_COUNT(): number
  GET_PRINTER_NAME(index: number): string
  SET_PRINT_PAGESIZE(orient: number, width: number | string, height: number | string, pageSize: string): void
  SET_PRINTER_INDEX(printer: string | number): void
  SET_PRINT_COPIES(copies: number): void
  ADD_PRINT_HTM(top: number | string, left: number | string, width: number | string, height: number | string, html: string): void
  PREVIEW(): void
  PRINT(): void
}

declare const CLODOP: CLodopInstance | undefined

interface Window {
  _CONFIG?: {
    clodopLicense?: CLodopLicenseConfig
  } & Record<string, unknown>
  getCLodop?: () => CLodopInstance | null
}
