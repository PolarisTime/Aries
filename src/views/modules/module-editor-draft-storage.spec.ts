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
      authoritativePrimaryNo: 'SO-001',
      now: 1000,
    })

    writeModuleEditorDraft(snapshot)

    expect(readModuleEditorDraft('user-1', 'sales-order', 'new', 1000)).toEqual(
      snapshot,
    )
    expect(snapshot.version).toBe(2)
  })

  it('preserves draft UI ids and exact entity ids across nested identity paths', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'freight-bill',
      recordId: 'new',
      values: {
        id: '',
        carrierId: '308251467645452289',
        attachmentIds: ['308251467645452290'],
        source: {
          sourceFreightBillItemId: '308251467645452291',
        },
      },
      items: [
        {
          id: 'line-local',
          sourceSalesOutboundItemId: '308251467645452292',
          attachmentIds: ['308251467645452293'],
          source: {
            sourceFreightBillItemId: '308251467645452294',
          },
        },
      ],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    writeModuleEditorDraft(snapshot)

    expect(
      readModuleEditorDraft('user-1', 'freight-bill', 'new', 1000),
    ).toEqual(snapshot)
    expect(snapshot.values.id).toBe('')
    expect(snapshot.items[0].id).toBe('line-local')
    expect(snapshot.values.carrierId).toBe('308251467645452289')
  })

  it('fails closed when building a draft with an unsafe numeric entity id', () => {
    expect(() =>
      buildModuleEditorDraftSnapshot({
        userKey: 'user-1',
        moduleKey: 'sales-order',
        recordId: 'new',
        values: {
          id: '',
          customerId: 9_007_199_254_740_992,
        },
        items: [{ id: 'line-1' }],
        authoritativePrimaryNo: '',
        now: 1000,
      }),
    ).toThrow('实体 ID 契约无效：values.customerId')
  })

  it('removes a stored v2 draft containing an unsafe nested entity id', () => {
    const key = 'aries-module-editor-draft:user-1:freight-bill:new'
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 2,
        userKey: 'user-1',
        moduleKey: 'freight-bill',
        recordId: 'new',
        values: { id: '' },
        items: [
          {
            id: 'line-1',
            source: {
              sourceSalesOutboundItemId: 9_007_199_254_740_992,
            },
          },
        ],
        authoritativePrimaryNo: '',
        updatedAt: 1000,
      }),
    )

    expect(
      readModuleEditorDraft('user-1', 'freight-bill', 'new', 1000),
    ).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('isolates draft scopes with encoded user, module, and record keys', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user/1',
      moduleKey: 'sales:order',
      recordId: 'record 1',
      values: { id: '308251467645452295', orderNo: 'SO-001' },
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
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values,
      items: [item],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    values.orderNo = 'SO-CHANGED'
    item.quantity = 9

    expect(snapshot.values.orderNo).toBe('SO-001')
    expect(snapshot.items).toEqual([{ id: 'line-1', quantity: 2 }])
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
        version: 2,
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

  it('removes legacy v1 drafts instead of restoring them', () => {
    localStorage.setItem(
      'aries-module-editor-draft:user-1:sales-order:new',
      JSON.stringify({
        version: 1,
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
        version: 2,
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
        1000 + 25 * 60 * 60 * 1000,
      ),
    ).toBeNull()
  })

  it('omits sensitive and oversized values from a draft snapshot', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: {
        id: '',
        customerName: '客户A',
        setupToken: 'secret-token',
        attachmentContent: 'x'.repeat(70 * 1024),
      },
      items: [
        {
          id: 'line-1',
          material: '钢材',
          fileContent: 'data:application/pdf;base64,secret',
        },
      ],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    expect(snapshot.values).toEqual({ id: '', customerName: '客户A' })
    expect(snapshot.items).toEqual([{ id: 'line-1', material: '钢材' }])
  })

  it('rejects a draft that exceeds the total storage limit', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `notes${index}`,
          'x'.repeat(60 * 1024),
        ]),
      ),
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })

    expect(() => writeModuleEditorDraft(snapshot)).toThrow(
      'Editor draft exceeds storage limit',
    )
    expect(localStorage.length).toBe(0)
  })

  it('resolves stable user and record keys', () => {
    expect(resolveModuleEditorDraftUserKey({ id: 12, loginName: 'u' })).toBe(
      '12',
    )
    expect(resolveModuleEditorDraftUserKey({ loginName: 'u' })).toBe('u')
    expect(resolveModuleEditorDraftUserKey({})).toBeNull()
    expect(resolveModuleEditorDraftUserKey(null)).toBeNull()
    expect(getModuleEditorDraftRecordId({ id: 'record-1' })).toBe('record-1')
    expect(getModuleEditorDraftRecordId(null)).toBe('new')
  })

  it('removes a stored editor draft by scope', () => {
    const snapshot = buildModuleEditorDraftSnapshot({
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: '308251467645452296',
      values: { id: '308251467645452296' },
      items: [],
      authoritativePrimaryNo: '',
      now: 1000,
    })
    writeModuleEditorDraft(snapshot)

    removeModuleEditorDraft('user-1', 'sales-order', '308251467645452296')

    expect(
      readModuleEditorDraft('user-1', 'sales-order', '308251467645452296'),
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
