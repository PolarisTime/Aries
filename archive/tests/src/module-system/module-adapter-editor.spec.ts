import { describe, expect, it } from 'vitest'

describe('module-adapter-editor barrel', () => {
  it('re-exports applyFormFieldDefaultDraftValues', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.applyFormFieldDefaultDraftValues).toBeInstanceOf(Function)
  })

  it('re-exports applyModuleDefaultEditorDraft', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.applyModuleDefaultEditorDraft).toBeInstanceOf(Function)
  })

  it('re-exports canManageEditorLineItems', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.canManageEditorLineItems).toBeInstanceOf(Function)
  })

  it('re-exports isEditorFieldDisabledForModule', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.isEditorFieldDisabledForModule).toBeInstanceOf(Function)
  })

  it('re-exports isEditorItemColumnEditableForModule', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.isEditorItemColumnEditableForModule).toBeInstanceOf(Function)
  })

  it('re-exports isModuleLineItemsLocked', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.isModuleLineItemsLocked).toBeInstanceOf(Function)
  })

  it('re-exports normalizeDraftRecordForModule', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.normalizeDraftRecordForModule).toBeInstanceOf(Function)
  })

  it('re-exports syncDerivedEditorFormValuesForModule', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.syncDerivedEditorFormValuesForModule).toBeInstanceOf(Function)
  })

  it('re-exports getEditorItemMin', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.getEditorItemMin).toBeInstanceOf(Function)
  })

  it('re-exports getEditorItemPrecision', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.getEditorItemPrecision).toBeInstanceOf(Function)
  })

  it('re-exports isNumberEditorColumn', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.isNumberEditorColumn).toBeInstanceOf(Function)
  })

  it('re-exports moveEditorLineItemByDrag', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.moveEditorLineItemByDrag).toBeInstanceOf(Function)
  })

  it('re-exports recalculateEditorLineItem', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.recalculateEditorLineItem).toBeInstanceOf(Function)
  })

  it('re-exports trimEditorItemsForModule', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.trimEditorItemsForModule).toBeInstanceOf(Function)
  })

  it('re-exports buildDefaultEditorLineItem', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.buildDefaultEditorLineItem).toBeInstanceOf(Function)
  })

  it('re-exports getEditorValidationMessage', async () => {
    const mod = await import('./module-adapter-editor')
    expect(mod.getEditorValidationMessage).toBeInstanceOf(Function)
  })
})
