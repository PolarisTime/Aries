export type LodopArgument = boolean | number | string

export interface LodopInstruction {
  args: LodopArgument[]
  method: string
}

type ArgumentKind =
  | 'boolean'
  | 'number'
  | 'numberOrString'
  | 'primitive'
  | 'string'

const METHOD_ARGUMENTS: Readonly<Record<string, readonly ArgumentKind[]>> = {
  PRINT_INIT: ['string'],
  PRINT_INITA: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'string',
  ],
  SET_PRINT_PAGESIZE: ['number', 'numberOrString', 'numberOrString', 'string'],
  SET_PRINT_STYLE: ['string', 'primitive'],
  SET_PRINT_STYLEA: ['numberOrString', 'string', 'primitive'],
  ADD_PRINT_TEXT: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'string',
  ],
  ADD_PRINT_LINE: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'number',
    'number',
  ],
  ADD_PRINT_BARCODE: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'string',
    'string',
  ],
  ADD_PRINT_RECT: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'number',
    'number',
  ],
  ADD_PRINT_ELLIPSE: [
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'numberOrString',
    'number',
    'number',
  ],
  NEWPAGE: [],
  NewPage: [],
  PREVIEW: [],
  PRINT: [],
}

const LODOP_CALL_RE = /^LODOP\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/

function invalidScript(): never {
  throw new Error('Invalid LODOP script')
}

function splitStatements(code: string): string[] {
  const statements: string[] = []
  let current = ''
  let depth = 0
  let escaped = false
  let quote = ''

  for (const char of code) {
    if (quote) {
      current += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
    } else if (char === '(') {
      depth += 1
      current += char
    } else if (char === ')') {
      depth -= 1
      if (depth < 0) invalidScript()
      current += char
    } else if (char === ';' && depth === 0) {
      if (current.trim()) statements.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (quote || depth !== 0) invalidScript()
  if (current.trim()) statements.push(current.trim())
  if (!statements.length) invalidScript()
  return statements
}

function splitArguments(source: string): string[] {
  if (!source.trim()) return []

  const args: string[] = []
  let current = ''
  let depth = 0
  let escaped = false
  let quote = ''

  for (const char of source) {
    if (quote) {
      current += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
    } else if (char === '(') {
      depth += 1
      current += char
    } else if (char === ')') {
      depth -= 1
      if (depth < 0) invalidScript()
      current += char
    } else if (char === ',' && depth === 0) {
      if (!current.trim()) invalidScript()
      args.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (quote || depth !== 0 || !current.trim()) invalidScript()
  args.push(current.trim())
  return args
}

function decodeHex(source: string, start: number, length: number): string {
  const value = source.slice(start, start + length)
  if (value.length !== length || !/^[0-9a-f]+$/i.test(value)) {
    invalidScript()
  }
  return String.fromCharCode(Number.parseInt(value, 16))
}

function parseStringLiteral(source: string): string {
  const quote = source[0]
  if ((quote !== '"' && quote !== "'") || source.at(-1) !== quote) {
    invalidScript()
  }

  let result = ''
  for (let index = 1; index < source.length - 1; index += 1) {
    const char = source[index]
    if (char === quote || char.charCodeAt(0) < 0x20) invalidScript()
    if (char !== '\\') {
      result += char
      continue
    }

    index += 1
    if (index >= source.length - 1) invalidScript()
    const escaped = source[index]
    const simpleEscapes: Record<string, string> = {
      '"': '"',
      "'": "'",
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
    }
    if (Object.hasOwn(simpleEscapes, escaped)) {
      result += simpleEscapes[escaped]
      continue
    }
    if (escaped === 'x') {
      result += decodeHex(source, index + 1, 2)
      index += 2
      continue
    }
    if (escaped === 'u') {
      result += decodeHex(source, index + 1, 4)
      index += 4
      continue
    }
    invalidScript()
  }
  return result
}

function parseNumericExpression(source: string): number | null {
  let index = 0

  const skipSpaces = () => {
    while (/\s/.test(source[index] || '')) index += 1
  }

  const parsePrimary = (): number => {
    skipSpaces()
    if (source[index] === '(') {
      index += 1
      const value = parseExpression()
      skipSpaces()
      if (source[index] !== ')') invalidScript()
      index += 1
      return value
    }

    const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
    if (!match) invalidScript()
    index += match[0].length
    return Number(match[0])
  }

  const parseUnary = (): number => {
    skipSpaces()
    if (source[index] === '+') {
      index += 1
      return parseUnary()
    }
    if (source[index] === '-') {
      index += 1
      return -parseUnary()
    }
    return parsePrimary()
  }

  const parseTerm = (): number => {
    let value = parseUnary()
    while (true) {
      skipSpaces()
      const operator = source[index]
      if (operator !== '*' && operator !== '/') return value
      index += 1
      const right = parseUnary()
      value = operator === '*' ? value * right : value / right
      if (!Number.isFinite(value)) invalidScript()
    }
  }

  const parseExpression = (): number => {
    let value = parseTerm()
    while (true) {
      skipSpaces()
      const operator = source[index]
      if (operator !== '+' && operator !== '-') return value
      index += 1
      const right = parseTerm()
      value = operator === '+' ? value + right : value - right
      if (!Number.isFinite(value)) invalidScript()
    }
  }

  try {
    const value = parseExpression()
    skipSpaces()
    return index === source.length && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function parseArgument(source: string): LodopArgument {
  if (source.startsWith('"') || source.startsWith("'")) {
    return parseStringLiteral(source)
  }
  if (source === 'true') return true
  if (source === 'false') return false
  const numericValue = parseNumericExpression(source)
  if (numericValue === null) invalidScript()
  return numericValue
}

function matchesKind(value: LodopArgument, kind: ArgumentKind): boolean {
  if (kind === 'primitive') return true
  if (kind === 'numberOrString') {
    return typeof value === 'number' || typeof value === 'string'
  }
  return typeof value === kind
}

function parseInstruction(statement: string): LodopInstruction {
  const match = statement.match(LODOP_CALL_RE)
  if (!match) invalidScript()
  const method = match[1]
  if (!Object.hasOwn(METHOD_ARGUMENTS, method)) invalidScript()
  const expectedArguments = METHOD_ARGUMENTS[method]
  const args = splitArguments(match[2]).map(parseArgument)
  if (
    args.length !== expectedArguments.length ||
    args.some((value, index) => !matchesKind(value, expectedArguments[index]))
  ) {
    invalidScript()
  }
  return { args, method }
}

export function parseLodopScript(code: string): LodopInstruction[] {
  const instructions = splitStatements(code).map(parseInstruction)
  const initCount = instructions.filter(
    ({ method }) => method === 'PRINT_INIT' || method === 'PRINT_INITA',
  ).length
  if (initCount > 1) invalidScript()
  return instructions
}
