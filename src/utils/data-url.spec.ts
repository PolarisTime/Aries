import { describe, expect, it } from 'vitest'
import { toDataImageUrl } from './data-url'

describe('toDataImageUrl', () => {
  it('returns empty string for null or undefined', () => {
    expect(toDataImageUrl(null)).toBe('')
    expect(toDataImageUrl(undefined)).toBe('')
  })

  it('returns empty string for empty or whitespace', () => {
    expect(toDataImageUrl('')).toBe('')
    expect(toDataImageUrl('   ')).toBe('')
  })

  it('returns data URL as-is', () => {
    const dataUrl = 'data:image/png;base64,abc123'
    expect(toDataImageUrl(dataUrl)).toBe(dataUrl)
  })

  it('returns blob URL as-is', () => {
    const blobUrl = 'blob:http://example.com/123'
    expect(toDataImageUrl(blobUrl)).toBe(blobUrl)
  })

  it('returns http URL as-is', () => {
    const httpUrl = 'http://example.com/image.png'
    expect(toDataImageUrl(httpUrl)).toBe(httpUrl)
  })

  it('returns https URL as-is', () => {
    const httpsUrl = 'https://example.com/image.png'
    expect(toDataImageUrl(httpsUrl)).toBe(httpsUrl)
  })

  it('returns protocol-relative URL as-is', () => {
    const protocolRelative = '//example.com/image.png'
    expect(toDataImageUrl(protocolRelative)).toBe(protocolRelative)
  })

  it('returns absolute path as-is', () => {
    const absolutePath = '/images/photo.jpg'
    expect(toDataImageUrl(absolutePath)).toBe(absolutePath)
  })

  it('wraps raw base64 with data URL prefix', () => {
    const base64 = 'abc123'
    expect(toDataImageUrl(base64)).toBe('data:image/png;base64,abc123')
  })

  it('uses custom mime type', () => {
    const base64 = 'abc123'
    expect(toDataImageUrl(base64, 'image/jpeg')).toBe('data:image/jpeg;base64,abc123')
  })

  it('trims whitespace', () => {
    const base64 = '  abc123  '
    expect(toDataImageUrl(base64)).toBe('data:image/png;base64,abc123')
  })

  it('handles case-insensitive data URL check', () => {
    const dataUrl = 'DATA:IMAGE/PNG;BASE64,abc123'
    expect(toDataImageUrl(dataUrl)).toBe(dataUrl)
  })

  it('handles case-insensitive blob URL check', () => {
    const blobUrl = 'BLOB:http://example.com/123'
    expect(toDataImageUrl(blobUrl)).toBe(blobUrl)
  })
})