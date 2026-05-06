export function isApiKeyToken(token: string | null | undefined) {
  return /^leo_[A-Za-z0-9_-]+$/.test(String(token || '').trim())
}

