import { describe, expect, it } from 'vitest'

describe('module-editor-line-items barrel', () => {
  it('re-exports recalculateEditorLineItem', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.recalculateEditorLineItem).toBeInstanceOf(Function)
  })

  it('re-exports getEditorItemMin', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.getEditorItemMin).toBeInstanceOf(Function)
  })

  it('re-exports getEditorItemPrecision', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.getEditorItemPrecision).toBeInstanceOf(Function)
  })

  it('re-exports isNumberEditorColumn', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.isNumberEditorColumn).toBeInstanceOf(Function)
  })

  it('re-exports moveEditorLineItemByDrag', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.moveEditorLineItemByDrag).toBeInstanceOf(Function)
  })

  it('re-exports trimEditorItemsForModule', async () => {
    const mod = await import('./module-editor-line-items')
    expect(mod.trimEditorItemsForModule).toBeInstanceOf(Function)
  })
})
