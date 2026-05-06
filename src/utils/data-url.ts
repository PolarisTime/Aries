export function toDataImageUrl(
  rawValue: string | null | undefined,
  mimeType = 'image/png',
) {
  const value = String(rawValue || '').trim()
  if (!value) {
    return ''
  }
  if (
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value) ||
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith('/')
  ) {
    return value
  }
  return `data:${mimeType};base64,${value}`
}
