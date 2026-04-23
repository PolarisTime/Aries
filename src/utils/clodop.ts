let loadPromise: Promise<boolean> | null = null
let licenseApplied = false

const scriptUrls = [
  'http://localhost:8000/CLodopfuncs.js?priority=1',
  'http://localhost:18000/CLodopfuncs.js?priority=1',
  'https://localhost:8443/CLodopfuncs.js?priority=1',
]

function appendScript(src: string, onDone: (success: boolean) => void) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-clodop-src="${src}"]`)
  if (existing) {
    if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
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

    scriptUrls.forEach((src) => appendScript(src, finish))

    window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(isCLodopAvailable())
      }
    }, 3000)
  })

  return loadPromise
}

export function resetCLodop() {
  loadPromise = null
  licenseApplied = false
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
    console.warn('CLodop 注册信息注入失败', error)
  }
}

export function getCLodopInstance() {
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

export function isCLodopAvailable() {
  return getCLodopInstance() !== null
}

export function getPrinterList() {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return []
  }

  try {
    const count = lodop.GET_PRINTER_COUNT()
    return Array.from({ length: count }, (_, index) => lodop.GET_PRINTER_NAME(index))
  } catch {
    return []
  }
}

function wrapHtml(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 12mm; }
    html, body { margin: 0; padding: 0; color: #000; font-family: SimSun, serif; font-size: 12px; }
    body { padding: 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; vertical-align: top; word-break: break-all; }
    th { background: #f5f5f5; font-weight: 700; }
    h1 { margin: 0 0 10px; text-align: center; font-size: 20px; }
    .print-subtitle { margin: 0 0 12px; text-align: center; font-size: 12px; }
    .print-block { margin-top: 12px; }
    .print-footnote { margin-top: 12px; text-align: right; font-size: 11px; }
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
  const matched = code.match(/LODOP\s*\.\s*PRINT_INIT\s*\(\s*["']([^"']*)["']\s*\)/)
  if (matched) {
    title = matched[1]
  }
  return { title, inita }
}

function cleanTemplateCode(code: string) {
  return code
    .replace(/LODOP\s*\.\s*PRINT_INITA?\s*\([^)]*\)\s*;?/g, '')
    .replace(/LODOP\s*\.\s*PREVIEW\s*\([^)]*\)\s*;?/g, '')
    .replace(/LODOP\s*\.\s*PRINT\s*\([^)]*\)\s*;?/g, '')
}

function callInit(lodop: CLodopInstance, title: string, inita: string[] | null) {
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

export function isCLodopCode(template: string) {
  const lines = template.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('//')) {
      continue
    }
    return line.startsWith('LODOP.')
  }
  return false
}

export function execPrintCode(code: string, options: PrintHtmlOptions = {}) {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return false
  }

  const { preview = true, printer, title = '打印' } = options

  try {
    const parsed = parseInitCall(code)
    callInit(lodop, parsed.title || title, parsed.inita)
    if (printer) {
      lodop.SET_PRINTER_INDEX(printer)
    }
    const cleaned = cleanTemplateCode(code)
    new Function('LODOP', cleaned)(lodop)
    if (preview) {
      lodop.PREVIEW()
    } else {
      lodop.PRINT()
    }
    return true
  } catch (error) {
    console.error('CLodop 模板打印失败', error)
    return false
  }
}

export function printHtml(renderedHtml: string, options: PrintHtmlOptions = {}) {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return false
  }

  const {
    title = '打印',
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
    console.error('CLodop 打印失败', error)
    return false
  }
}
