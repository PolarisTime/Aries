export function buildFormControlId(prefix: string, key: string) {
  const normalizedPrefix = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const normalizedKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return [normalizedPrefix, normalizedKey].filter(Boolean).join('-')
}
