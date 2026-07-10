/* eslint-disable */
import { t } from 'i18next'
import { type LodopInstruction, parseLodopScript } from '@/utils/lodop-script'
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

const TEMPLATE_CONTROL_METHODS = new Set([
  'PRINT_INIT',
  'PRINT_INITA',
  'PREVIEW',
  'PRINT',
])

function getLodopMethod(lodop: CLodopInstance, method: string) {
  return (lodop as unknown as Record<string, unknown>)[method]
}

function assertRequiredMethods(
  lodop: CLodopInstance,
  instructions: LodopInstruction[],
  options: LodopPrintOptions,
) {
  const requiredMethods = new Set(
    instructions
      .filter(({ method }) => method !== 'PREVIEW' && method !== 'PRINT')
      .map(({ method }) => method),
  )
  if (!instructions.some(({ method }) => method.startsWith('PRINT_INIT'))) {
    requiredMethods.add('PRINT_INIT')
  }
  requiredMethods.add(options.preview === false ? 'PRINT' : 'PREVIEW')
  if (options.printer) requiredMethods.add('SET_PRINTER_INDEX')

  for (const method of requiredMethods) {
    if (typeof getLodopMethod(lodop, method) !== 'function') {
      throw new Error(t('print.clodopTemplatePrintFailed'))
    }
  }
}

function callInit(
  lodop: CLodopInstance,
  instructions: LodopInstruction[],
  fallbackTitle: string,
) {
  const init = instructions.find(({ method }) =>
    method.startsWith('PRINT_INIT'),
  )
  if (init?.method === 'PRINT_INITA') {
    const [top, left, width, height, title] = init.args
    lodop.PRINT_INITA(
      top as string | number,
      left as string | number,
      width as string | number,
      height as string | number,
      String(title),
    )
    return
  }
  lodop.PRINT_INIT(
    init?.method === 'PRINT_INIT' ? String(init.args[0]) : fallbackTitle,
  )
}

function executeLodopCalls(
  lodop: CLodopInstance,
  instructions: LodopInstruction[],
) {
  for (const { args, method } of instructions) {
    if (TEMPLATE_CONTROL_METHODS.has(method)) continue
    const fn = getLodopMethod(lodop, method) as (...args: unknown[]) => void
    fn.apply(lodop, args)
  }
}

export interface LodopPrintOptions {
  title?: string
  printer?: string
  preview?: boolean
}

export function execPrintCode(code: string, options: LodopPrintOptions = {}) {
  const lodop = getCLodopInstance()
  if (!lodop) {
    return false
  }

  const { preview = true, printer, title = t('print.defaultTitle') } = options

  try {
    const instructions = parseLodopScript(code)
    assertRequiredMethods(lodop, instructions, { preview, printer, title })
    callInit(lodop, instructions, title)
    if (printer) {
      lodop.SET_PRINTER_INDEX(printer)
    }
    executeLodopCalls(lodop, instructions)
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
