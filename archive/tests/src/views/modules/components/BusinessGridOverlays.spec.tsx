import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const overlayMocks = vi.hoisted(() => ({
  attachment: vi.fn(),
  detail: vi.fn(),
  editor: vi.fn(),
  freightPickup: vi.fn(),
  statement: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/types/module-page', () => ({}))

vi.mock('./ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: (props: unknown) => {
    overlayMocks.attachment(props)
    return <div data-testid="attachment-modal" />
  },
}))

vi.mock('./ModuleEditorWorkspace', () => ({
  ModuleEditorWorkspace: (props: unknown) => {
    overlayMocks.editor(props)
    return <div data-testid="editor-workspace" />
  },
}))

vi.mock('./ModuleFreightPickupListOverlay', () => ({
  ModuleFreightPickupListOverlay: (props: unknown) => {
    overlayMocks.freightPickup(props)
    return <div data-testid="freight-pickup" />
  },
}))

vi.mock('./ModuleRecordDetailOverlay', () => ({
  ModuleRecordDetailOverlay: (props: unknown) => {
    overlayMocks.detail(props)
    return <div data-testid="detail-overlay" />
  },
}))

vi.mock('./ModuleStatementGenerator', () => ({
  ModuleStatementGenerator: (props: unknown) => {
    overlayMocks.statement(props)
    return <div data-testid="statement-generator" />
  },
}))

import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'

describe('BusinessGridOverlays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    const editRecord = { id: 'edit-1' }
    render(
      <BusinessGridOverlays
        {...defaultProps}
        editorOpen={true}
        editRecord={editRecord}
        canSave={false}
        lineItemsLocked={true}
        lockedLineItemsNotice="locked"
      />,
    )
    expect(await screen.findByTestId('editor-workspace')).toBeTruthy()
    expect(overlayMocks.editor).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        config: defaultProps.config,
        record: editRecord,
        moduleKey: 'test-module',
        canSave: false,
        canAudit: true,
        lineItemsLocked: true,
        lockedLineItemsNotice: 'locked',
        onClose: defaultProps.onCloseEditor,
        onSaved: defaultProps.onSaved,
      }),
    )
  })

  it('renders detail overlay when detailOpen is true', async () => {
    const detailRecord = { id: 'detail-1' }
    render(
      <BusinessGridOverlays
        {...defaultProps}
        detailOpen={true}
        detailRecord={detailRecord}
        detailLoading={true}
      />,
    )
    expect(await screen.findByTestId('detail-overlay')).toBeTruthy()
    expect(overlayMocks.detail).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        config: defaultProps.config,
        record: detailRecord,
        loading: true,
        canPrint: false,
        onClose: defaultProps.onCloseDetail,
      }),
    )
  })

  it('renders attachment modal when attachOpen is true', async () => {
    render(
      <BusinessGridOverlays
        {...defaultProps}
        attachOpen={true}
        resourceKey="resource-a"
        attachRecordId="record-a"
      />,
    )
    expect(await screen.findByTestId('attachment-modal')).toBeTruthy()
    expect(overlayMocks.attachment).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        moduleKey: 'test-module',
        resourceKey: 'resource-a',
        recordId: 'record-a',
        onClose: defaultProps.onCloseAttachment,
      }),
    )
  })

  it('renders all statement overlays with the matching statement type', async () => {
    const selectedRows = [{ id: 'row-1' }]
    render(
      <BusinessGridOverlays
        {...defaultProps}
        supplierStatementOpen={true}
        customerStatementOpen={true}
        freightStatementOpen={true}
        selectedRows={selectedRows}
      />,
    )

    expect(await screen.findAllByTestId('statement-generator')).toHaveLength(3)
    expect(overlayMocks.statement).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        statementType: 'supplier',
        selectedRows,
        onClose: defaultProps.onCloseSupplierStatement,
        onGenerate: defaultProps.onGenerateSupplierStatement,
      }),
    )
    expect(overlayMocks.statement).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        statementType: 'customer',
        selectedRows,
        onClose: defaultProps.onCloseCustomerStatement,
        onGenerate: defaultProps.onGenerateCustomerStatement,
      }),
    )
    expect(overlayMocks.statement).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        statementType: 'freight',
        selectedRows,
        onClose: defaultProps.onCloseFreightStatement,
        onGenerate: defaultProps.onGenerateFreightStatement,
      }),
    )
  })

  it('renders freight pickup overlay with default records', async () => {
    render(<BusinessGridOverlays {...defaultProps} freightPickupOpen={true} />)

    expect(await screen.findByTestId('freight-pickup')).toBeTruthy()
    expect(overlayMocks.freightPickup).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        moduleKey: 'test-module',
        records: [],
        onClose: defaultProps.onCloseFreightPickup,
      }),
    )
  })

  it('passes provided freight pickup records', async () => {
    const freightPickupRecords = [{ id: 'pickup-1' }]
    render(
      <BusinessGridOverlays
        {...defaultProps}
        freightPickupOpen={true}
        freightPickupRecords={freightPickupRecords}
      />,
    )

    expect(await screen.findByTestId('freight-pickup')).toBeTruthy()
    expect(overlayMocks.freightPickup).toHaveBeenCalledWith(
      expect.objectContaining({
        records: freightPickupRecords,
      }),
    )
  })
})
