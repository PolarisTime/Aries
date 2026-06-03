import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { downloadBlob } from './download'

describe('downloadBlob', () => {
  const mockCreateObjectURL = vi.fn()
  const mockRevokeObjectURL = vi.fn()
  const mockClick = vi.fn()
  const mockAppendChild = vi.fn()
  const mockRemoveChild = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates object URL from blob', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    downloadBlob(blob, 'test.txt')
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
  })

  it('creates anchor element with correct attributes', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    downloadBlob(blob, 'test.txt')
    expect(document.createElement).toHaveBeenCalledWith('a')
  })

  it('sets href and download on anchor', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    const anchor = {
      href: '',
      download: '',
      click: mockClick,
    }
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement)
    downloadBlob(blob, 'test.txt')
    expect(anchor.href).toBe('blob:mock-url')
    expect(anchor.download).toBe('test.txt')
  })

  it('appends anchor to body, clicks, and removes', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    downloadBlob(blob, 'test.txt')
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
  })

  it('revokes object URL after download', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    downloadBlob(blob, 'test.txt')
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})