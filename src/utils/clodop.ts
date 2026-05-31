/* eslint-disable */
import { t } from 'i18next'
import { logger } from '@/utils/logger'

let loadPromise: Promise<boolean> | null = null
let licenseApplied = false

const scriptUrls = [
  'http://localhost:8000/CLodopfuncs.js?priority=1',
  'http://localhost:18000/CLodopfuncs.js?priority=1',
  // 'https://localhost:8443/CLodopfuncs.js?priority=1',
]

function appendScript(src: string, onDone: (success: boolean) => void) {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-clodop-src="${src}"]`,
  )
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      onDone(true)
      return
    }
    existing.addEventListener('load', () => onDone(true), { once: true })
    existing.addEventListener('error', () => onDone(false), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = src
  script.async = true
  script.dataset.clodopSrc = src
  script.addEventListener(
    'load',
    () => {
      script.dataset.loaded = 'true'
      onDone(true)
    },
    { once: true },
  )
  script.addEventListener('error', () => onDone(false), { once: true })
  document.head.appendChild(script)
}

export function loadCLodop() {
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise<boolean>((resolve) => {
    let completed = 0
    let settled = false

    const finish = (success: boolean) => {
      if (settled) {
        return
      }
      if (success) {
        settled = true
        resolve(true)
        return
      }
      completed += 1
      if (completed >= scriptUrls.length) {
        settled = true
        resolve(false)
      }
    }

    for (const src of scriptUrls) {
      appendScript(src, finish)
    }

    window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(isCLodopAvailable())
      }
    }, 3000)
  })

  return loadPromise
}


function applyLicense(lodop: CLodopInstance) {
  if (licenseApplied) {
    return
  }

  licenseApplied = true
  const config = window._CONFIG?.clodopLicense
  if (!config?.companyName || !config?.licenseA) {
    return
  }

  try {
    lodop.SET_LICENSES(
      config.companyName,
      config.licenseA,
      config.companyNameB || '',
      config.licenseB || '',
    )
  } catch (error) {
    logger.warn(t('print.clodopLicenseInjectFailed'), error)
  }
}

function getCLodopInstance() {
  let lodop: CLodopInstance | null = null

  try {
    if (typeof CLODOP !== 'undefined' && CLODOP) {
      lodop = CLODOP
    } else if (typeof window.getCLodop === 'function') {
      lodop = window.getCLodop()
    }
  } catch {
    lodop = null
  }

  if (lodop) {
    applyLicense(lodop)
  }

  return lodop
}

function isCLodopAvailable() {
  return getCLodopInstance() !== null
}


function wrapHtml(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #1f2329; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 12px; }
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #111827; padding: 7px 8px; font-size: 12px; vertical-align: middle; word-break: break-all; }
    th { background: #eff4f9; font-weight: 700; }
    h1 { margin: 0 0 10px; text-align: center; font-size: 20px; }
    .print-subtitle { margin: 0 0 12px; text-align: center; font-size: 12px; }
    .print-block { margin-top: 12px; }
    .print-footnote { margin-top: 12px; text-align: right; font-size: 11px; }
    .print-page { page-break-after: always; break-after: page; }
    .print-page:last-child { page-break-after: auto; break-after: auto; }
  </style></head><body>${body}</body></html>`
}

const reParam = `(?:["']([^"']*)["']|(\\d+))`

function parseInitCall(code: string) {
  let title = ''
  let inita: string[] | null = null
  const reA = new RegExp(
    `LODOP\\s*\\.\\s*PRINT_INITA\\s*\\(` +
      `\\s*${reParam}\\s*,` +
      `\\s*${reParam}\\s*,` +
      `\\s*${reParam}\\s*,` +
      `\\s*${reParam}\\s*,` +
      `\\s*["']([^"']*)["']` +
      `\\s*\\)`,
  )
  const matchedA = code.match(reA)
  if (matchedA) {
    inita = [
      matchedA[1] != null ? matchedA[1] : matchedA[2],
      matchedA[3] != null ? matchedA[3] : matchedA[4],
      matchedA[5] != null ? matchedA[5] : matchedA[6],
      matchedA[7] != null ? matchedA[7] : matchedA[8],
    ]
    title = matchedA[9]
    return { title, inita }
  }
  const matched = code.match(
    /LODOP\s*\.\s*PRINT_INIT\s*\(\s*["']([^"']*)["']\s*\)/,
  )
  if (matched) {
    title = matched[1]
  }
  return { title, inita }
}

/**
 * Safely execute LODOP API calls without eval / new Function.
 * Only allows LODOP.SET_*, LODOP.ADD_*, LODOP.SET_PRINT_* and similar safe methods.
 */
function executeLodopCalls(lodop: CLodopInstance, code: string) {
  const SAFE_METHOD =
    /^LODOP\.(SET_|ADD_|NEWPAGE|NewPage|SET_PRINT|SELECT_|DELETE_|PRINT_INIT|PRINT\b|PREVIEW|PRINT_DESIGN|PRINT_SETUP)[A-Za-z_]*\s*\(/i
  const CONTROL_METHODS = new Set([
    'PRINT_INIT',
    'PRINT_INITA',
    'PREVIEW',
    'PRINT',
    'PRINT_DESIGN',
    'PRINT_SETUP',
  ])
  const lines = code.split(/;\r?\n?/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('LODOP.')) continue
    if (!SAFE_METHOD.test(trimmed)) continue

    try {
      const openParen = trimmed.indexOf('(')
      const methodName = trimmed.substring(6, openParen)
      if (CONTROL_METHODS.has(methodName.toUpperCase())) continue
      const argsStr = trimmed.substring(openParen + 1, trimmed.lastIndexOf(')'))
      const args = parseArgs(argsStr)
      const fn = (
        lodop as unknown as Record<string, (...a: unknown[]) => void>
      )[methodName]
      if (typeof fn === 'function') fn.apply(lodop, args)
    } catch {
      // skip broken lines
    }
  }
}

function parseArgs(argsStr: string): unknown[] {
  if (!argsStr.trim()) return []
  const result: unknown[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i]
    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      while (j < argsStr.length && argsStr[j] !== quote) j++
      current = argsStr.substring(i + 1, j)
      i = j
      result.push(current)
      current = ''
      // skip comma
      while (i + 1 < argsStr.length && argsStr[i + 1] === ' ') i++
      if (i + 1 < argsStr.length && argsStr[i + 1] === ',') i++
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      const val = current.trim()
      if (val) result.push(coerceValue(val))
      current = ''
      continue
    }
    current += ch
  }
  const val = current.trim()
  if (val) result.push(coerceValue(val))
  return result
}

function coerceValue(v: string): unknown {
  if (v === '') return ''
  if (v === 'true') return true
  if (v === 'false') return false
  const num = Number(v)
  if (!Number.isNaN(num) && v !== '') return num
  const expressionValue = evaluateNumericExpression(v)
  if (expressionValue !== null) return expressionValue
  return v
}

function evaluateNumericExpression(expression: string): number | null {
  const tokens = expression
    .replace(/\s+/g, '')
    .match(/[+\-*/]|(?:\d+(?:\.\d*)?|\.\d+)/g)

  if (!tokens?.length || tokens.join('') !== expression.replace(/\s+/g, '')) {
    return null
  }
  if (tokens.length % 2 === 0) {
    return null
  }
  if (
    tokens.some((token, index) => index % 2 === 0 && Number.isNaN(Number(token)))
  ) {
    return null
  }
  if (
    tokens.some(
      (token, index) => index % 2 === 1 && !['+', '-', '*', '/'].includes(token),
    )
  ) {
    return null
  }

  const values: number[] = [Number(tokens[0])]
  const operators: string[] = []

  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i]
    const nextValue = Number(tokens[i + 1])
    if (operator === '*') {
      values[values.length - 1] *= nextValue
    } else if (operator === '/') {
      values[values.length - 1] /= nextValue
    } else {
      operators.push(operator)
      values.push(nextValue)
    }
  }

  const result = values.reduce((total, value, index) => {
    if (index === 0) return value
    return operators[index - 1] === '-' ? total - value : total + value
  }, 0)
  return Number.isFinite(result) ? result : null
}

const SCRIPT_METHOD_RE = /\bLODOP\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g
const BLOCKED_SCRIPT_RE =
  /\b(?:window|document|globalThis|localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|Function|eval|import|constructor|prototype|__proto__)\b/
const CONTROL_PRINT_RE =
  /\bLODOP\s*\.\s*(?:PREVIEW|PRINT|PRINTA|PRINT_DESIGN|PRINT_SETUP)\s*\([^)]*\)\s*;?/gi
const ALLOWED_SCRIPT_METHODS = new Set([
  'ADD_PRINT_BARCODE',
  'ADD_PRINT_CHART',
  'ADD_PRINT_ELLIPSE',
  'ADD_PRINT_HTM',
  'ADD_PRINT_HTML',
  'ADD_PRINT_IMAGE',
  'ADD_PRINT_LINE',
  'ADD_PRINT_RECT',
  'ADD_PRINT_SHAPE',
  'ADD_PRINT_TABLE',
  'ADD_PRINT_TEXT',
  'ADD_PRINT_URL',
  'NEWPAGE',
  'NewPage',
  'PRINT_INIT',
  'PRINT_INITA',
  'SELECT_PRINTER',
  'SET_PREVIEW_WINDOW',
  'SET_PRINT_COPIES',
  'SET_PRINT_MODE',
  'SET_PRINT_PAGESIZE',
  'SET_PRINT_STYLE',
  'SET_PRINT_STYLEA',
  'SET_PRINTER_INDEX',
])

function hasScriptControlFlow(code: string) {
  return /^\s*(?:var|let|const|for\s*\(|if\s*\(|while\s*\(|switch\s*\()/m.test(
    code,
  )
}

function sanitizeExecutableLodopScript(code: string, printer?: string) {
  if (BLOCKED_SCRIPT_RE.test(code)) {
    throw new Error(t('print.clodopTemplatePrintFailed'))
  }

  const withoutControlPrint = code.replace(CONTROL_PRINT_RE, '')
  const unknownMethods = new Set<string>()
  for (const match of withoutControlPrint.matchAll(SCRIPT_METHOD_RE)) {
    const method = match[1]
    if (!ALLOWED_SCRIPT_METHODS.has(method)) {
      unknownMethods.add(method)
    }
  }
  if (unknownMethods.size > 0) {
    throw new Error(
      `${t('print.clodopTemplatePrintFailed')}: ${Array.from(unknownMethods).join(', ')}`,
    )
  }

  if (!printer) {
    return withoutControlPrint
  }

  return `${withoutControlPrint}\nLODOP.SET_PRINTER_INDEX(${JSON.stringify(printer)});`
}

function executeLodopScript(
  lodop: CLodopInstance,
  code: string,
  options: Pick<PrintHtmlOptions, 'printer'>,
) {
  const script = sanitizeExecutableLodopScript(code, options.printer)
  const fn = new Function(
    'LODOP',
    'parseFloat',
    'parseInt',
    'isNaN',
    'String',
    'Number',
    'Math',
    script,
  )
  fn(lodop, parseFloat, parseInt, isNaN, String, Number, Math)
}

function callInit(
  lodop: CLodopInstance,
  title: string,
  inita: string[] | null,
) {
  if (inita) {
    lodop.PRINT_INITA(inita[0], inita[1], inita[2], inita[3], title)
    return
  }
  lodop.PRINT_INIT(title)
}

export interface PrintHtmlOptions {
  title?: string
  printer?: string
  copies?: number
  pageSize?: string
  preview?: boolean
}


export function execPrintCode(code: string, options: PrintHtmlOptions = {}) {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return false
  }

  const { preview = true, printer, title = t('print.defaultTitle') } = options

  try {
    if (hasScriptControlFlow(code)) {
      executeLodopScript(lodop, code, { printer })
    } else {
      const parsed = parseInitCall(code)
      callInit(lodop, parsed.title || title, parsed.inita)
      if (printer) {
        lodop.SET_PRINTER_INDEX(printer)
      }
      executeLodopCalls(lodop, code)
    }
    if (preview) {
      lodop.PREVIEW()
    } else {
      lodop.PRINT()
    }
    return true
  } catch (error) {
    logger.error(t('print.clodopTemplatePrintFailed'), error)
    return false
  }
}

export function printHtml(
  renderedHtml: string,
  options: PrintHtmlOptions = {},
) {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return false
  }

  const {
    title = t('print.defaultTitle'),
    printer,
    copies = 1,
    pageSize = 'A4',
    preview = false,
  } = options

  try {
    callInit(lodop, title, null)
    lodop.SET_PRINT_PAGESIZE(1, 0, 0, pageSize)
    if (printer) {
      lodop.SET_PRINTER_INDEX(printer)
    }
    if (copies > 1) {
      lodop.SET_PRINT_COPIES(copies)
    }
    lodop.ADD_PRINT_HTM('0mm', '0mm', '100%', '100%', wrapHtml(renderedHtml))
    if (preview) {
      lodop.PREVIEW()
    } else {
      lodop.PRINT()
    }
    return true
  } catch (error) {
    logger.error(t('print.clodopPrintFailed'), error)
    return false
  }
}
