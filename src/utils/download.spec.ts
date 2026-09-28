import { describe, expect, it } from 'vitest'
import { resolveDownloadFileName } from './download'

/**
 * `Content-Disposition` 文件名解析(RFC 6266 / RFC 5987)。
 *
 * 后端 Spring 用 `ContentDisposition.attachment().filename(name, UTF_8)` 输出,
 * 中文名走 `filename*=UTF-8''...`; 这里固定各分支, 避免改名或换实现后下载出乱码/错扩展名。
 */
describe('resolveDownloadFileName', () => {
  it('优先使用 RFC 5987 的 filename*(中文名解码正确)', () => {
    const header = `attachment; filename="fallback.xlsx"; filename*=UTF-8''${encodeURIComponent('中文报表.xlsx')}`
    expect(resolveDownloadFileName(header, 'fallback.xlsx')).toBe(
      '中文报表.xlsx',
    )
  })

  it('filename* 带引号时同样解析(去掉包裹引号)', () => {
    expect(
      resolveDownloadFileName(
        'attachment; filename*=UTF-8\'\'"a%20b.xlsx"',
        'fallback.xlsx',
      ),
    ).toBe('a b.xlsx')
  })

  it('参数名大小写不敏感(FILENAME*)', () => {
    expect(
      resolveDownloadFileName(
        "attachment; FILENAME*=UTF-8''%E5%A4%87%E6%B3%A8.xlsx",
        'fallback.xlsx',
      ),
    ).toBe('备注.xlsx')
  })

  it('filename* 之后仍可跟其它参数(只在分号处截断)', () => {
    expect(
      resolveDownloadFileName(
        `attachment; filename*=UTF-8''${encodeURIComponent('票据.xlsx')}; size=1024`,
        'fallback.xlsx',
      ),
    ).toBe('票据.xlsx')
  })

  it('filename* 百分号编码非法时退回普通 filename', () => {
    expect(
      resolveDownloadFileName(
        'attachment; filename="safe.xlsx"; filename*=UTF-8\'\'%E4%B8',
        'fallback.xlsx',
      ),
    ).toBe('safe.xlsx')
  })

  it('filename* 无编码非法但无普通 filename 时退回兜底名', () => {
    expect(
      resolveDownloadFileName(
        "attachment; filename*=UTF-8''%zz%zz",
        'fallback.xlsx',
      ),
    ).toBe('fallback.xlsx')
  })

  it('只有普通带引号 filename 时直接使用', () => {
    expect(
      resolveDownloadFileName('attachment; filename="PO-2026.xlsx"', 'x.xlsx'),
    ).toBe('PO-2026.xlsx')
  })

  it('filename 不带引号时退回兜底名(当前契约: 只认带引号形式)', () => {
    expect(
      resolveDownloadFileName('attachment; filename=plain.xlsx', 'x.xlsx'),
    ).toBe('x.xlsx')
  })

  it('没有 filename 参数时退回兜底名', () => {
    expect(resolveDownloadFileName('attachment', 'x.xlsx')).toBe('x.xlsx')
    expect(resolveDownloadFileName('', 'x.xlsx')).toBe('x.xlsx')
  })

  it('响应头缺失(null/undefined)时退回兜底名', () => {
    expect(resolveDownloadFileName(null, 'x.xlsx')).toBe('x.xlsx')
    expect(resolveDownloadFileName(undefined, 'x.xlsx')).toBe('x.xlsx')
  })

  it('非字符串头值按字符串处理', () => {
    expect(resolveDownloadFileName(123, 'x.xlsx')).toBe('x.xlsx')
  })

  it('RFC 5987 用 %20 表示空格; "+" 不做空格解码', () => {
    expect(
      resolveDownloadFileName(
        "attachment; filename*=UTF-8''a+b%20c.xlsx",
        'x.xlsx',
      ),
    ).toBe('a+b c.xlsx')
  })
})
