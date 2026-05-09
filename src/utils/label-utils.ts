const CJK_REGEX = /[一-鿿㐀-䶿豈-﫿]/g
const FULLWIDTH_SPACE = '　'

function cjkLength(text: string): number {
  const matches = text.match(CJK_REGEX)
  return matches ? matches.length : 0
}

export function padLabel(text: string, targetCjk = 4): string {
  const cjk = cjkLength(text)
  if (cjk >= targetCjk) return text
  return FULLWIDTH_SPACE.repeat(targetCjk - cjk) + text
}
