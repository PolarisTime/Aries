import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildModuleEditorDraftSnapshot,
  getModuleEditorDraftRecordId,
  readModuleEditorDraft,
  removeModuleEditorDraft,
  resolveModuleEditorDraftUserKey,
  writeModuleEditorDraft,
} from './module-editor-draft-storage'

describe('module-editor-draft-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when no editor draft exists for the scope', () => {
    expect(readModuleEditorDraft('user-1', 'sales-order', 'new')).toBeNull()
  })

  it('persists and reads the current editor draft snapshot', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '', orderNo: 'SO-001', customerName: '客户A' },
      items: [{ id: 'line-1', quantity: 2 }],
      chargeItems: [{ id: 'charge-1', chargeName: '卸货费', amount: 120 }],
      authoritativePrimaryNo: 'SO-001',
      now: 1000,
    })

    writeModuleEditorDraft(snapshot)

    expect(readModuleEditorDraft('user-1', 'sales-order', 'new', 1000)).toEqual(
      snapshot,
    )
  })

  it('isolates draft scopes with encoded user, module, and record keys', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user/1',
      moduleKey: 'sales:order',
      recordId: 'record 1',
      values: { id: 'record 1', orderNo: 'SO-001' },
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    writeModuleEditorDraft(snapshot)

    expect(
      readModuleEditorDraft('user/1', 'sales:order', 'record 1', 1000),
    ).toEqual(snapshot)
    expect(
      readModuleEditorDraft('user-1', 'sales:order', 'record 1'),
    ).toBeNull()
  })

  it('builds a snapshot with cloned top-level values and items', () => {
    const values = { id: '', orderNo: 'SO-001' }
    const item = { id: 'line-1', quantity: 2 }
    const chargeItem = { id: 'charge-1', chargeName: '卸货费', amount: 120 }
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values,
      items: [item],
      chargeItems: [chargeItem],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    values.orderNo = 'SO-CHANGED'
    item.quantity = 9
    chargeItem.amount = 9

    expect(snapshot.values.orderNo).toBe('SO-001')
    expect(snapshot.items).toEqual([{ id: 'line-1', quantity: 2 }])
    expect(snapshot.chargeItems).toEqual([
      { id: 'charge-1', chargeName: '卸货费', amount: 120 },
    ])
  })

  it('removes malformed stored drafts instead of returning unsafe data', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      '{broken',
    )

    expect(readModuleEditorDraft('user-1', 'sales-order', 'new')).toBeNull()
    expect(
      localStorage.getItem('aries-module-editor-draft:user-1:sales-order:new'),
    ).toBeNull()
  })

  it('removes stored drafts with an invalid schema shape', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      JSON.stringify({
        version: 1,
        userKey: 'user-1',
        moduleKey: 'sales-order',
        recordId: 'new',
        values: [],
        items: [],
        updatedAt: 1000,
      }),
    )

    expect(
      readModuleEditorDraft('user-1', 'sales-order', 'new', 1000),
    ).toBeNull()
    expect(
      localStorage.getItem('aries-module-editor-draft:user-1:sales-order:new'),
    ).toBeNull()
  })

  it('removes stored drafts with non-object snapshot payloads', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      JSON.stringify(null),
    )

    expect(
      readModuleEditorDraft('user-1', 'sales-order', 'new', 1000),
    ).toBeNull()
    expect(
      localStorage.getItem('aries-module-editor-draft:user-1:sales-order:new'),
    ).toBeNull()
  })

  it('removes stored drafts from unsupported snapshot versions', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      JSON.stringify({
        version: 0,
        userKey: 'user-1',
        moduleKey: 'sales-order',
        recordId: 'new',
        values: { id: '' },
        items: [],
        updatedAt: 1000,
      }),
    )

    expect(
      readModuleEditorDraft('user-1', 'sales-order', 'new', 1000),
    ).toBeNull()
    expect(
      localStorage.getItem('aries-module-editor-draft:user-1:sales-order:new'),
    ).toBeNull()
  })

  it('normalizes missing authoritative primary number to an empty string', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      JSON.stringify({
        version: 1,
        userKey: 'user-1',
        moduleKey: 'sales-order',
        recordId: 'new',
        values: { id: '', orderNo: 'SO-001' },
        items: [],
        updatedAt: 1000,
      }),
    )

    expect(readModuleEditorDraft('user-1', 'sales-order', 'new', 1000)).toEqual(
      expect.objectContaining({ authoritativePrimaryNo: '' }),
    )
  })

  it('drops expired editor drafts', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '', orderNo: 'SO-001' },
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    writeModuleEditorDraft(snapshot)

    expect(
      readModuleEditorDraft(
        'user-1',
        'sales-order',
        'new',
        1000 + 8 * 24 * 60 * 60 * 1000,
      ),
    ).toBeNull()
  })

  it('resolves stable user and record keys', () => {
    expect(resolveModuleEditorDraftUserKey({ id: 12, loginName: 'u' })).toBe(
      '12',
    )
    expect(resolveModuleEditorDraftUserKey({ loginName: 'u' })).toBe('u')
    expect(resolveModuleEditorDraftUserKey({})).toBe('anonymous')
    expect(resolveModuleEditorDraftUserKey(null)).toBe('anonymous')
    expect(getModuleEditorDraftRecordId({ id: 'record-1' })).toBe('record-1')
    expect(getModuleEditorDraftRecordId(null)).toBe('new')
  })

  it('removes a stored editor draft by scope', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'record-1',
      values: { id: 'record-1' },
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })
    writeModuleEditorDraft(snapshot)

    removeModuleEditorDraft('user-1', 'sales-order', 'record-1')

    expect(
      readModuleEditorDraft('user-1', 'sales-order', 'record-1'),
    ).toBeNull()
  })

  it('skips browser storage access when rendered without window', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '' },
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    vi.stubGlobal('window', undefined)

    expect(() => writeModuleEditorDraft(snapshot)).not.toThrow()
    expect(readModuleEditorDraft('user-1', 'sales-order', 'new')).toBeNull()
    expect(() =>
      removeModuleEditorDraft('user-1', 'sales-order', 'new'),
    ).not.toThrow()
  })
})
