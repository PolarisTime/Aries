import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/types/module-page', () => ({}))

vi.mock('./ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => <div data-testid="attachment-modal" />,
}))

vi.mock('./ModuleEditorWorkspace', () => ({
  ModuleEditorWorkspace: () => <div data-testid="editor-workspace" />,
}))

vi.mock('./ModuleFreightPickupListOverlay', () => ({
  ModuleFreightPickupListOverlay: () => <div data-testid="freight-pickup" />,
}))

vi.mock('./ModuleRecordDetailOverlay', () => ({
  ModuleRecordDetailOverlay: () => <div data-testid="detail-overlay" />,
}))

vi.mock('./ModuleStatementGenerator', () => ({
  ModuleStatementGenerator: () => <div data-testid="statement-generator" />,
}))

import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'

describe('BusinessGridOverlays', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    config: {
      key: 'test',
      title: 'Test',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    },
    editRecord: null,
    editorOpen: false,
    attachOpen: false,
    attachRecordId: '',
    detailOpen: false,
    detailRecord: null,
    detailLoading: false,
    supplierStatementOpen: false,
    customerStatementOpen: false,
    freightStatementOpen: false,
    freightPickupOpen: false,
    selectedRows: [],
    canSave: true,
    canAudit: true,
    lineItemsLocked: false,
    lockedLineItemsNotice: '',
    onCloseEditor: vi.fn(),
    onSaved: vi.fn(),
    onCloseDetail: vi.fn(),
    onCloseAttachment: vi.fn(),
    onCloseSupplierStatement: vi.fn(),
    onCloseCustomerStatement: vi.fn(),
    onCloseFreightStatement: vi.fn(),
    onCloseFreightPickup: vi.fn(),
    onGenerateSupplierStatement: vi.fn(),
    onGenerateCustomerStatement: vi.fn(),
    onGenerateFreightStatement: vi.fn(),
  }

  it('renders nothing when all overlays are closed', () => {
    const { container } = render(<BusinessGridOverlays {...defaultProps} />)
    expect(container.textContent).toBe('')
  })

  it('renders editor workspace when editorOpen is true', async () => {
    render(<BusinessGridOverlays {...defaultProps} editorOpen={true} />)
    expect(await screen.findByTestId('editor-workspace')).toBeTruthy()
  })

  it('renders detail overlay when detailOpen is true', async () => {
    render(<BusinessGridOverlays {...defaultProps} detailOpen={true} />)
    expect(await screen.findByTestId('detail-overlay')).toBeTruthy()
  })

  it('renders attachment modal when attachOpen is true', async () => {
    render(<BusinessGridOverlays {...defaultProps} attachOpen={true} />)
    expect(await screen.findByTestId('attachment-modal')).toBeTruthy()
  })
})
