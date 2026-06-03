import { describe, expect, it, vi } from 'vitest'
import { http, authHttp } from './http'

vi.mock('@/utils/env', () => ({
  apiBaseUrl: 'http://test-api.example.com',
}))

describe('http client', () => {
  it('has get method', () => {
    expect(typeof http.get).toBe('function')
  })

  it('has post method', () => {
    expect(typeof http.post).toBe('function')
  })

  it('has put method', () => {
    expect(typeof http.put).toBe('function')
  })

  it('has patch method', () => {
    expect(typeof http.patch).toBe('function')
  })

  it('has delete method', () => {
    expect(typeof http.delete).toBe('function')
  })

  it('exposes underlying axios instance', () => {
    expect(http.instance).toBeDefined()
    expect(typeof http.instance.get).toBe('function')
  })

  it('get makes a GET request and returns data', async () => {
    const mockData = { id: 1, name: 'test' }
    vi.spyOn(http.instance, 'get').mockResolvedValue(mockData)

    const result = await http.get('/test', { params: { q: 'foo' } })
    expect(result).toEqual(mockData)
    expect(http.instance.get).toHaveBeenCalledWith('/test', { params: { q: 'foo' } })
  })

  it('post sends data and returns result', async () => {
    const mockResponse = { success: true }
    vi.spyOn(http.instance, 'post').mockResolvedValue(mockResponse)

    const result = await http.post('/test', { name: 'bar' })
    expect(result).toEqual(mockResponse)
    expect(http.instance.post).toHaveBeenCalledWith('/test', { name: 'bar' }, undefined)
  })

  it('put sends data and returns result', async () => {
    const mockResponse = { updated: true }
    vi.spyOn(http.instance, 'put').mockResolvedValue(mockResponse)

    const result = await http.put('/test/1', { name: 'updated' }, { headers: {} })
    expect(result).toEqual(mockResponse)
    expect(http.instance.put).toHaveBeenCalledWith('/test/1', { name: 'updated' }, { headers: {} })
  })

  it('patch sends data and returns result', async () => {
    const mockResponse = { patched: true }
    vi.spyOn(http.instance, 'patch').mockResolvedValue(mockResponse)

    const result = await http.patch('/test/1', { name: 'patched' })
    expect(result).toEqual(mockResponse)
  })

  it('delete makes a DELETE request', async () => {
    const mockResponse = { deleted: true }
    vi.spyOn(http.instance, 'delete').mockResolvedValue(mockResponse)

    const result = await http.delete('/test/1')
    expect(result).toEqual(mockResponse)
  })

  it('authHttp is a separate instance', () => {
    expect(authHttp).toBeDefined()
    expect(authHttp).not.toBe(http.instance)
    expect(typeof authHttp.get).toBe('function')
  })
})
