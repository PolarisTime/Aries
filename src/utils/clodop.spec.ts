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

  it('handles script control flow (hasScriptControlFlow path)', () => {
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
    expect(success).toBe(true)
    expect(lodop.ADD_PRINT_BARCODE).toHaveBeenCalled()
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

  it('handles printer option with control flow script', () => {
    const _lodop = setupLodop()
    const code = 'var x = 1; LODOP.PRINT_INIT("test");'
    const success = execPrintCode(code, { preview: true, printer: 'HP' })
    expect(success).toBe(true)
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

  it('handles code with boolean and mixed argument types', () => {
    const _lodop = setupLodop()
    const code =
      'LODOP.PRINT_INIT("test");LODOP.SET_PRINT_MODE("RESELECT_PRINTER",true);'
    execPrintCode(code, { preview: true })
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

  it('handles code with only control flow (var) and safe LODOP calls', () => {
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
    expect(success).toBe(true)
    expect(lodop.ADD_PRINT_TABLE).toHaveBeenCalled()
  })

  it('handles control flow script with printer option', () => {
    const _lodop = setupLodop(
      makeLodop({
        ADD_PRINT_BARCODE: vi.fn(),
      }),
    )
    const code = 'var x = 1; LODOP.ADD_PRINT_BARCODE(0,0,100,20,"123456");'
    const success = execPrintCode(code, { preview: true, printer: 'Thermal' })
    expect(success).toBe(true)
  })
})

describe('loadCLodop', () => {
  afterEach(() => {
    delete window.getCLodop
    delete (window as any).CLODOP
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
})
