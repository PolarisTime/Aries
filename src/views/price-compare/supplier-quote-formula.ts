/**
 * 单元格算式解析（Excel 式录入）。
 *
 * <p>报价表允许直接敲算式：`3200+50`、`(3200+50)*2`、`*1.02`（在当前值上乘）。解析用本文件里
 * 手写的递归下降解析器，**不使用 `eval` / `new Function`**：输入来自键盘与剪贴板，`eval` 会把
 * 「数据」当「代码」执行（代码注入），在启用 CSP 的部署里也会被直接拦掉；而且业务只需要四则运算，
 * 引入通用 JS 求值器会顺带把 `window`、`fetch` 这类能力交给一段文本。</p>
 *
 * <p>「以运算符开头」= 在当前值上运算：Excel 里输入 `+50` 是在原值上加 50，而不是等于 50。
 * 因此 `*1.02`、`-30` 这类输入必须由调用方传入该格当前价格 {@link FormulaOptions.base}。</p>
 */

export type FormulaFailureReason =
  | 'empty'
  | 'syntax'
  | 'no-base'
  | 'divide-by-zero'
  | 'not-finite'
  | 'negative'

export type FormulaResult =
  | { ok: true; value: number }
  | { ok: false; reason: FormulaFailureReason }

/**
 * 是不是「一个普通数字」的文本（空串也算）。
 *
 * <p>单元格逐键录入时用它分流：普通数字立即落草稿（保持「敲完即存」），含运算符的文本要等
 * 回车/失焦再整体求值，否则敲到 `3200+` 这种半截算式时会被当成一次改价。</p>
 */
export function isPlainPriceText(text: string): boolean {
  return /^\d*\.?\d*$/.test(text.trim())
}

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'operator'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = []
  let index = 0
  while (index < text.length) {
    const char = text.charAt(index)
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ kind: 'operator', value: char })
      index += 1
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char })
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      const start = index
      while (index < text.length && /[0-9.]/.test(text.charAt(index))) {
        index += 1
      }
      const raw = text.slice(start, index)
      // `1.2.3` / `.` 这类不是合法数字：整条算式判语法错误，不做"尽力解析"
      if (!/^\d*\.?\d*$/.test(raw) || raw === '.') return null
      tokens.push({ kind: 'number', value: Number(raw) })
      continue
    }
    return null
  }
  return tokens
}

/**
 * 递归下降求值器。
 *
 * <pre>
 * expression := term (('+' | '-') term)*
 * term       := factor (('*' | '/') factor)*
 * factor     := ('+' | '-') factor | number | '(' expression ')'
 * </pre>
 */
class ExpressionParser {
  private readonly tokens: Token[]
  private index = 0
  private dividedByZero = false

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  /** 除以 0 与普通语法错误要分开报：一个能改（换个除数），一个只能重敲。 */
  get hasDivisionByZero(): boolean {
    return this.dividedByZero
  }

  run(): number | null {
    const value = this.expression()
    if (value === null) return null
    // 还有剩余 token（例如 `3200 50`）说明整条算式没被读完
    return this.index === this.tokens.length ? value : null
  }

  private peek(): Token | undefined {
    return this.tokens[this.index]
  }

  private expression(): number | null {
    let left = this.term()
    if (left === null) return null
    for (;;) {
      const token = this.peek()
      if (!token || token.kind !== 'operator') return left
      if (token.value !== '+' && token.value !== '-') return left
      this.index += 1
      const right = this.term()
      if (right === null) return null
      left = token.value === '+' ? left + right : left - right
    }
  }

  private term(): number | null {
    let left = this.factor()
    if (left === null) return null
    for (;;) {
      const token = this.peek()
      if (!token || token.kind !== 'operator') return left
      if (token.value !== '*' && token.value !== '/') return left
      this.index += 1
      const right = this.factor()
      if (right === null) return null
      if (token.value === '*') {
        left *= right
      } else {
        if (right === 0) {
          this.dividedByZero = true
          return null
        }
        left /= right
      }
    }
  }

  private factor(): number | null {
    const token = this.peek()
    if (!token) return null
    if (token.kind === 'operator') {
      if (token.value !== '+' && token.value !== '-') return null
      this.index += 1
      const value = this.factor()
      if (value === null) return null
      return token.value === '-' ? -value : value
    }
    if (token.kind === 'number') {
      this.index += 1
      return token.value
    }
    if (token.value !== '(') return null
    this.index += 1
    const value = this.expression()
    if (value === null) return null
    const closing = this.peek()
    if (!closing || closing.kind !== 'paren' || closing.value !== ')') {
      return null
    }
    this.index += 1
    return value
  }
}

export type FormulaOptions = { base?: number | null }

/**
 * 求一条价格算式的值。
 *
 * @param options.base 该格当前价格：只有「以运算符开头」的算式（`+50` / `*1.02`）会用到它。
 */
export function evaluatePriceFormula(
  input: string,
  options: FormulaOptions = {},
): FormulaResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  // `=` 前缀是 Excel 习惯；千分位与货币符号是粘贴时带来的噪声，不是运算的一部分
  const text = trimmed.replace(/^=/, '').replace(/[,¥￥\s]/g, '')
  if (!text) return { ok: false, reason: 'empty' }

  let expression = text
  if (/^[+\-*/]/.test(text)) {
    const base = options.base
    if (typeof base !== 'number' || !Number.isFinite(base)) {
      return { ok: false, reason: 'no-base' }
    }
    // 用括号包住 base，避免 `-` 被解析成一元负号（`(-3300)-100` 是错的语义）
    expression = `(${base})${text}`
  }

  const tokens = tokenize(expression)
  if (!tokens) return { ok: false, reason: 'syntax' }
  const parser = new ExpressionParser(tokens)
  const value = parser.run()
  if (value === null) {
    return {
      ok: false,
      reason: parser.hasDivisionByZero ? 'divide-by-zero' : 'syntax',
    }
  }
  if (!Number.isFinite(value)) return { ok: false, reason: 'not-finite' }
  if (value < 0) return { ok: false, reason: 'negative' }
  return { ok: true, value }
}
