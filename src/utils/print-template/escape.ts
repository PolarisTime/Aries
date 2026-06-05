export function escapeJs(value: string): string {
  if (!value) return ''
  let result = ''
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    switch (c) {
      case '"':
        result += '\\"'
        break
      case "'":
        result += "\\'"
        break
      case '\\':
        result += '\\\\'
        break
      case '\n':
        result += '\\n'
        break
      case '\r':
        result += '\\r'
        break
      case '\t':
        result += '\\t'
        break
      case '<':
        result += '\\x3c'
        break
      case '>':
        result += '\\x3e'
        break
      default: {
        const code = c.charCodeAt(0)
        result += code < 0x20 ? `\\x${code.toString(16).padStart(2, '0')}` : c
      }
    }
  }
  return result
}
