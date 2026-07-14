import { afterEach, describe, expect, it, vi } from 'vitest'
import { execPrintCode } from './clodop'

function makeLodop(overrides: Record<string, unknown> = {}) {
  return {
    PRINT_INITA: vi.fn(),
    PRINT_INIT: vi.fn(),
    SET_LICENSES: vi.fn(),
    SET_PRINT_PAGESIZE: vi.fn(),
    SET_PRINTER_INDEX: vi.fn(),
    SET_PRINT_COPIES: vi.fn(),
    SET_PRINT_MODE: vi.fn(),
    ADD_PRINT_HTM: vi.fn(),
    ADD_PRINT_TEXT: vi.fn(),
    PREVIEW: vi.fn(),
    PRINT: vi.fn(),
    ...overrides,
  }
}

function setupLodop(lodop: Record<string, unknown> = makeLodop()) {
  window.getCLodop = () => lodop
  return lodop
}

describe('execPrintCode', () => {
  afterEach(() => {
    delete window.getCLodop
    vi.restoreAllMocks()
  })

  it('evaluates simple numeric coordinate expressions before calling C-Lodop', () => {
    const lodop = setupLodop()
    const success = execPrintCode(
      [
        'LODOP.PRINT_INITA(0, 20, 2970, 2100, "A4打印模版（带备注）");',
        'LODOP.ADD_PRINT_TEXT(204+5,12,74,16,"抚顺新钢");',
      ].join('\n'),
      { preview: true },
    )
    expect(success).toBe(true)
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenCalledWith(
      209,
      12,
      74,
      16,
      '抚顺新钢',
    )
  })

  it('returns false when lodop is not available', () => {
    const success = execPrintCode('LODOP.PRINT_INIT("test");')
    expect(success).toBe(false)
  })

  it('calls PRINT when preview is false', () => {
    const lodop = setupLodop()
    const success = execPrintCode('LODOP.PRINT_INIT("test");', {
      preview: false,
    })
    expect(success).toBe(true)
    expect(lodop.PRINT).toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects JavaScript variable declarations in print templates', () => {
    const lodop = setupLodop(
      makeLodop({
        ADD_PRINT_BARCODE: vi.fn(),
      }),
    )
    const code = [
      'var x = 10;',
      'LODOP.ADD_PRINT_BARCODE(0,0,100,20,"123456");',
    ].join('\n')
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
    expect(lodop.ADD_PRINT_BARCODE).not.toHaveBeenCalled()
  })

  it('skips control methods in executeLodopCalls', () => {
    const lodop = setupLodop()
    const code = [
      'LODOP.PRINT_INIT("test");',
      'LODOP.ADD_PRINT_TEXT(10,10,80,16,"hello");',
    ].join('\n')
    execPrintCode(code, { preview: true })
    expect(lodop.PRINT_INIT).toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenCalledWith(10, 10, 80, 16, 'hello')
  })

  it('does not apply printer options for rejected control flow templates', () => {
    const lodop = setupLodop()
    const code = 'var x = 1; LODOP.PRINT_INIT("test");'
    const success = execPrintCode(code, { preview: true, printer: 'HP' })
    expect(success).toBe(false)
    expect(lodop.SET_PRINTER_INDEX).not.toHaveBeenCalled()
  })

  it('handles errors in execPrintCode gracefully', () => {
    const lodop = setupLodop()
    lodop.PRINT_INIT = vi.fn(() => {
      throw new Error('mock error')
    })
    const success = execPrintCode('LODOP.PRINT_INIT("test");')
    expect(success).toBe(false)
  })

  it('sets printer index for non-control-flow path', () => {
    const lodop = setupLodop()
    const code = 'LODOP.PRINT_INIT("test");'
    execPrintCode(code, { preview: true, printer: 'HP LaserJet' })
    expect(lodop.SET_PRINTER_INDEX).toHaveBeenCalledWith('HP LaserJet')
  })

  it('returns false when code contains blocked script keywords', () => {
    const _lodop = setupLodop()
    const code =
      'var x = 1; LODOP.ADD_PRINT_TEXT(10,10,80,16,"test"); window.alert("x");'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
  })

  it('returns false when code uses document keyword', () => {
    const _lodop = setupLodop()
    const code =
      'var x = 1; LODOP.ADD_PRINT_TEXT(10,10,80,16,"test"); document.title = "x";'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
  })

  it('returns false when code uses eval keyword', () => {
    const _lodop = setupLodop()
    const code =
      'var x = 1; LODOP.ADD_PRINT_TEXT(10,10,80,16,"test"); eval("1+1");'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
  })

  it('returns false when code uses unknown LODOP methods in control flow', () => {
    const _lodop = setupLodop()
    const code = 'var x = 1; LODOP.UNKNOWN_METHOD(10,10,80,16,"test");'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
  })

  it('handles code with PRINT_INITA', () => {
    const lodop = setupLodop()
    const code =
      'LODOP.PRINT_INITA(0,0,200,100,"Title");LODOP.ADD_PRINT_TEXT(10,10,80,16,"hello");'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(true)
    expect(lodop.PRINT_INITA).toHaveBeenCalled()
    const args = lodop.PRINT_INITA.mock.calls[0]
    expect(args[4]).toBe('Title')
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenCalled()
  })

  it('handles code with only PRINT_INIT and PREVIEW', () => {
    const lodop = setupLodop()
    const code = 'LODOP.PRINT_INIT("My Title");'
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(true)
    expect(lodop.PRINT_INIT).toHaveBeenCalledWith('My Title')
    expect(lodop.PREVIEW).toHaveBeenCalled()
  })

  it('handles code with multiple ADD_PRINT calls', () => {
    const lodop = setupLodop()
    const code = [
      'LODOP.PRINT_INIT("test");',
      'LODOP.ADD_PRINT_TEXT(10,10,80,16,"Line1");',
      'LODOP.ADD_PRINT_TEXT(30,10,80,16,"Line2");',
      'LODOP.ADD_PRINT_TEXT(50,10,80,16,"Line3");',
    ].join('\n')
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(true)
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenCalledTimes(3)
  })

  it('handles code with empty lines and whitespace', () => {
    const _lodop = setupLodop()
    const code = [
      'LODOP.PRINT_INIT("test");',
      '',
      '  ',
      'LODOP.ADD_PRINT_TEXT(10,10,80,16,"hello");',
    ].join('\n')
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(true)
  })

  it('handles code with numeric arguments including expressions', () => {
    const lodop = setupLodop()
    const code =
      'LODOP.PRINT_INIT("test");LODOP.ADD_PRINT_TEXT(100+5,20*2,80,16,"expr");'
    execPrintCode(code, { preview: true })
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenCalledWith(105, 40, 80, 16, 'expr')
  })

  it('rejects template-controlled print modes before initialization', () => {
    const lodop = setupLodop()
    const code =
      'LODOP.PRINT_INIT("test");LODOP.SET_PRINT_MODE("RESELECT_PRINTER",true);'

    expect(execPrintCode(code, { preview: true })).toBe(false)
    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.SET_PRINT_MODE).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('handles PRINT_INITA with quoted title containing spaces', () => {
    const lodop = setupLodop()
    const code =
      'LODOP.PRINT_INITA(0,0,2970,2100,"A4 打印模版");LODOP.ADD_PRINT_TEXT(10,10,80,16,"test");'
    execPrintCode(code, { preview: true })
    expect(lodop.PRINT_INITA).toHaveBeenCalled()
    const args = lodop.PRINT_INITA.mock.calls[0]
    expect(args[4]).toBe('A4 打印模版')
  })

  it('rejects control flow even when all LODOP calls are allowlisted', () => {
    const lodop = setupLodop(
      makeLodop({
        ADD_PRINT_TABLE: vi.fn(),
      }),
    )
    const code = [
      'var pageSize = "A4";',
      'LODOP.ADD_PRINT_TABLE("0mm","0mm","100%","100%","<html></html>");',
    ].join('\n')
    const success = execPrintCode(code, { preview: true })
    expect(success).toBe(false)
    expect(lodop.ADD_PRINT_TABLE).not.toHaveBeenCalled()
  })

  it('rejects compact control flow scripts with printer option', () => {
    const lodop = setupLodop(
      makeLodop({
        ADD_PRINT_BARCODE: vi.fn(),
      }),
    )
    const code = 'var x = 1; LODOP.ADD_PRINT_BARCODE(0,0,100,20,"123456");'
    const success = execPrintCode(code, { preview: true, printer: 'Thermal' })
    expect(success).toBe(false)
    expect(lodop.ADD_PRINT_BARCODE).not.toHaveBeenCalled()
    expect(lodop.SET_PRINTER_INDEX).not.toHaveBeenCalled()
  })

  it('injects configured license once before printing', async () => {
    vi.resetModules()
    const lodop = makeLodop()
    window.getCLodop = () => lodop
    window._CONFIG = {
      clodopLicense: {
        companyName: 'ACME',
        licenseA: 'A',
        companyNameB: 'ACME-B',
        licenseB: 'B',
      },
    } as any
    const { execPrintCode } = await import('./clodop')

    expect(execPrintCode('LODOP.PRINT_INIT("test");')).toBe(true)
    expect(execPrintCode('LODOP.PRINT_INIT("test");')).toBe(true)

    expect(lodop.SET_LICENSES).toHaveBeenCalledTimes(1)
    expect(lodop.SET_LICENSES).toHaveBeenCalledWith('ACME', 'A', 'ACME-B', 'B')
    delete window._CONFIG
  })

  it('logs warning when license injection fails', async () => {
    vi.resetModules()
    const warn = vi.fn()
    vi.doMock('@/utils/logger', () => ({
      logger: { warn, error: vi.fn() },
    }))
    const lodop = makeLodop({
      SET_LICENSES: vi.fn(() => {
        throw new Error('license failed')
      }),
    })
    window.getCLodop = () => lodop
    window._CONFIG = {
      clodopLicense: { companyName: 'ACME', licenseA: 'A' },
    } as any
    const { execPrintCode } = await import('./clodop')

    expect(execPrintCode('LODOP.PRINT_INIT("test");')).toBe(true)
    expect(warn).toHaveBeenCalled()
    vi.doUnmock('@/utils/logger')
    delete window._CONFIG
  })

  it('returns false when getCLodop throws', async () => {
    vi.resetModules()
    window.getCLodop = () => {
      throw new Error('unavailable')
    }
    const { execPrintCode } = await import('./clodop')

    expect(execPrintCode('LODOP.PRINT_INIT("test");')).toBe(false)
  })

  it('rejects unknown direct LODOP methods before executing valid ones', () => {
    const lodop = setupLodop(
      makeLodop({
        NewPage: vi.fn(),
      }),
    )
    const code = [
      'LODOP.PRINT_INIT("test");',
      'LODOP.UNKNOWN_METHOD(1);',
      'LODOP.NewPage();',
      'LODOP.ADD_PRINT_TEXT(10/2, 3-1, 80, 16, "ok");',
    ].join('\n')

    expect(execPrintCode(code, { preview: true })).toBe(false)
    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.NewPage).not.toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('does not treat Object prototype methods as allowlisted instructions', () => {
    const inheritedMethod = vi.fn()
    const lodop = setupLodop(makeLodop({ toString: inheritedMethod }))

    expect(execPrintCode('LODOP.toString();', { preview: true })).toBe(false)
    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(inheritedMethod).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('aborts without preview when an allowlisted LODOP method throws', () => {
    const lodop = setupLodop(
      makeLodop({
        SET_PRINT_STYLE: vi.fn(() => {
          throw new Error('broken style')
        }),
        NewPage: vi.fn(),
      }),
    )
    const code = [
      'LODOP.PRINT_INIT("test");',
      'LODOP.SET_PRINT_STYLE("FontSize", 12);',
      'LODOP.NewPage();',
      'LODOP.ADD_PRINT_TEXT(10/2, 3-1, 80, 16, "ok");',
    ].join('\n')

    expect(execPrintCode(code, { preview: true })).toBe(false)
    expect(lodop.SET_PRINT_STYLE).toHaveBeenCalled()
    expect(lodop.NewPage).not.toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects invalid numeric expressions before executing any instruction', () => {
    const lodop = setupLodop()

    expect(
      execPrintCode(
        'LODOP.PRINT_INIT("test");LODOP.ADD_PRINT_TEXT(10+, invalid+1, 80, 16, "raw");',
        { preview: true },
      ),
    ).toBe(false)
    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()

    expect(
      execPrintCode(
        'LODOP.PRINT_INIT("test");LODOP.ADD_PRINT_TEXT(*, 1, 2, 3, "operator");',
        { preview: true },
      ),
    ).toBe(false)
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
  })

  it('decodes escaped strings and finite arithmetic expressions', () => {
    const lodop = setupLodop()

    expect(
      execPrintCode(
        [
          'LODOP.PRINT_INITA("1mm","2mm","50%","100%","String Size");',
          String.raw`LODOP.ADD_PRINT_TEXT(.5, (12-2)/2, 20, 30, "a\"b\\c\n\x3cd\x3e;comma,");`,
        ].join('\n'),
        { preview: false },
      ),
    ).toBe(true)

    expect(lodop.PRINT_INITA).toHaveBeenCalledWith(
      '1mm',
      '2mm',
      '50%',
      '100%',
      'String Size',
    )
    expect(lodop.ADD_PRINT_TEXT).toHaveBeenNthCalledWith(
      1,
      0.5,
      5,
      20,
      30,
      'a"b\\c\n<d>;comma,',
    )
    expect(lodop.PRINT).toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects network, markup, and printer-control capabilities', () => {
    const lodop = setupLodop()
    const blockedScripts = [
      'LODOP.ADD_PRINT_URL(1,2,3,4,"http://127.0.0.1/private");',
      'LODOP.ADD_PRINT_HTML(1,2,3,4,"<p>unsafe</p>");',
      'LODOP.SET_PRINTER_INDEX("Other Printer");',
      'LODOP.SET_PRINT_COPIES(99);',
    ]

    for (const blockedScript of blockedScripts) {
      expect(
        execPrintCode(`LODOP.PRINT_INIT("test");${blockedScript}`, {
          preview: true,
        }),
      ).toBe(false)
    }

    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.SET_PRINTER_INDEX).not.toHaveBeenCalled()
    expect(lodop.SET_PRINT_COPIES).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects empty arguments and wrong method arity', () => {
    const lodop = setupLodop()

    expect(
      execPrintCode(
        'LODOP.PRINT_INIT("test");LODOP.ADD_PRINT_TEXT(,1,2,3,"empty");',
        { preview: true },
      ),
    ).toBe(false)
    expect(
      execPrintCode('LODOP.PRINT_INIT("test");LODOP.ADD_PRINT_TEXT(1,2,3,4);', {
        preview: true,
      }),
    ).toBe(false)

    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects a missing allowlisted method before initialization', () => {
    const lodop = setupLodop()
    const code = [
      'LODOP.PRINT_INIT("test");',
      'LODOP.ADD_PRINT_LINE(1,2,3,4,0,1);',
      'LODOP.ADD_PRINT_TEXT(1,2,3,4,"must not run");',
    ].join('\n')

    expect(execPrintCode(code, { preview: true })).toBe(false)
    expect(lodop.PRINT_INIT).not.toHaveBeenCalled()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('rejects control flow before executing any print instruction', () => {
    const lodop = setupLodop()
    const code = [
      'var x = 1;',
      'LODOP.ADD_PRINT_TEXT(1,2,3,4,String(x));',
      'LODOP.PRINT();',
    ].join('\n')

    expect(execPrintCode(code, { preview: true })).toBe(false)

    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
    expect(lodop.PRINT).not.toHaveBeenCalled()
    expect(lodop.PREVIEW).not.toHaveBeenCalled()
  })

  it('does not execute computed global property access from a template', () => {
    const lodop = setupLodop()
    const marker = '__clodopTemplateExecuted'
    delete (globalThis as Record<string, unknown>)[marker]
    const code = [
      'var root = this;',
      `root["${marker}"] = true;`,
      'LODOP.ADD_PRINT_TEXT(1,2,3,4,"unsafe");',
    ].join('\n')

    expect(execPrintCode(code, { preview: true })).toBe(false)
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined()
    expect(lodop.ADD_PRINT_TEXT).not.toHaveBeenCalled()
  })
})

describe('loadCLodop', () => {
  afterEach(() => {
    delete window.getCLodop
    delete (window as any).CLODOP
    document.querySelectorAll('script[data-clodop-src]').forEach((script) => {
      script.remove()
    })
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('resolves to true when CLODOP is available', async () => {
    vi.useFakeTimers()
    ;(window as any).CLODOP = makeLodop()
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    await vi.advanceTimersByTimeAsync(3100)
    await expect(promise).resolves.toBe(true)
  })

  it('resolves to true when getCLodop returns instance', async () => {
    vi.useFakeTimers()
    setupLodop()
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    await vi.advanceTimersByTimeAsync(3100)
    await expect(promise).resolves.toBe(true)
  })

  it('resolves to false when no lodop available after timeout', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    await vi.advanceTimersByTimeAsync(3100)
    await expect(promise).resolves.toBe(false)
  })

  it('returns cached promise on second call', async () => {
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const p1 = loadCLodop()
    const p2 = loadCLodop()
    expect(p1).toBe(p2)
  })

  it('resolves true when appended script loads', async () => {
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-clodop-src]',
    )

    expect(script).toBeTruthy()
    script?.dispatchEvent(new Event('load'))

    await expect(promise).resolves.toBe(true)
    expect(script?.dataset.loaded).toBe('true')
  })

  it('resolves false when all appended scripts fail', async () => {
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[data-clodop-src]'),
    )

    expect(scripts).toHaveLength(2)
    for (const script of scripts) {
      script.dispatchEvent(new Event('error'))
    }

    await expect(promise).resolves.toBe(false)
  })

  it('uses already loaded existing scripts without appending duplicates', async () => {
    const existing = document.createElement('script')
    existing.dataset.clodopSrc =
      'http://localhost:8000/CLodopfuncs.js?priority=1'
    existing.dataset.loaded = 'true'
    document.head.appendChild(existing)

    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()

    await expect(promise).resolves.toBe(true)
    expect(
      document.querySelectorAll(
        'script[data-clodop-src="http://localhost:8000/CLodopfuncs.js?priority=1"]',
      ),
    ).toHaveLength(1)
  })

  it('wires load and error listeners for existing pending scripts', async () => {
    const existing = document.createElement('script')
    existing.dataset.clodopSrc =
      'http://localhost:8000/CLodopfuncs.js?priority=1'
    document.head.appendChild(existing)

    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()

    existing.dispatchEvent(new Event('load'))

    await expect(promise).resolves.toBe(true)
  })

  it('ignores late script failures after another script has loaded', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[data-clodop-src]'),
    )

    scripts[0].dispatchEvent(new Event('load'))
    scripts[1].dispatchEvent(new Event('error'))
    await vi.advanceTimersByTimeAsync(3100)

    await expect(promise).resolves.toBe(true)
  })

  it('resolves false when existing pending scripts fail', async () => {
    for (const src of [
      'http://localhost:8000/CLodopfuncs.js?priority=1',
      'http://localhost:18000/CLodopfuncs.js?priority=1',
    ]) {
      const existing = document.createElement('script')
      existing.dataset.clodopSrc = src
      document.head.appendChild(existing)
    }

    vi.resetModules()
    const { loadCLodop } = await import('./clodop')
    const promise = loadCLodop()
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[data-clodop-src]'),
    )

    for (const script of scripts) {
      script.dispatchEvent(new Event('error'))
    }

    await expect(promise).resolves.toBe(false)
  })
})
