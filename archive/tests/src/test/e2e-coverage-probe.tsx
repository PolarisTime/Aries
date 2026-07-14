import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/lib/query-client'
import {
  businessNoResultSchema,
  documentStatusSchema,
  enabledStatusSchema,
  materialInfoSchema,
  weightPriceSchema,
} from '@/shared/schemas/api'
import {
  captchaDataSchema,
  dataScopeSchema,
  login2faPayloadSchema,
  loginPayloadSchema,
  loginResponseDataSchema,
  loginStep1ResponseSchema,
  totpSetupResponseSchema,
} from '@/shared/schemas/auth'
import { materialImportResultSchema } from '@/shared/schemas/material'
import {
  moduleRecordSchema,
  purchaseInboundItemSchema,
  salesOrderItemSchema,
  salesOutboundItemSchema,
} from '@/shared/schemas/module-record'
import {
  printTemplateRecordSchema,
  savePrintTemplatePayloadSchema,
} from '@/shared/schemas/print-template'
import {
  initialSetupAdminPayloadSchema,
  initialSetupCompanyPayloadSchema,
  initialSetupStatusSchema,
  initialSetupTotpPayloadSchema,
  initialSetupTotpResultSchema,
} from '@/shared/schemas/setup'
import {
  departmentOptionRecordSchema,
  roleOptionRecordSchema,
  userAccountCreateResultSchema,
  userAccountFormPayloadSchema,
} from '@/shared/schemas/user-account'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import '@/i18n'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'
import { ModuleStatementGenerator } from '@/views/modules/components/ModuleStatementGenerator'

const probeFreightRecord: ModuleRecord = {
  id: 'e2e-freight-probe',
  billNo: 'FB-E2E-PROBE',
  carrierName: '测试物流',
  vehiclePlate: '沪A00000',
  projectName: '测试项目',
  totalWeight: 1,
  totalFreight: 2,
  items: [
    {
      id: 'e2e-freight-probe-item',
      warehouseName: '测试仓库',
      brand: '测试品牌',
      material: '测试材质',
      spec: '10*20',
      length: '6',
      quantity: 1,
      weightTon: 1,
    },
  ],
}

const probeStatementRows: ModuleRecord[] = [
  {
    id: 'e2e-statement-probe',
    customerName: '测试客户',
    deliveryDate: '2026-07-03',
  },
]

function ProbeOverlays() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModuleAttachmentModal
        open
        moduleKey="sales-order"
        resourceKey="sales-order"
        recordId="e2e-attachment-probe"
        onClose={() => {}}
      />
      <ModuleFreightPickupListOverlay
        open
        moduleKey="freight-bill"
        records={[probeFreightRecord]}
        onClose={() => {}}
      />
      <ModuleStatementGenerator
        open
        statementType="customer"
        selectedRows={probeStatementRows}
        onClose={() => {}}
        onGenerate={async () => {}}
      />
    </QueryClientProvider>
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function exerciseSharedSchemas() {
  businessNoResultSchema.safeParse({})
  materialInfoSchema.safeParse({ materialCode: 'M001' })
  weightPriceSchema.safeParse({ quantity: 1, weightTon: '1' })
  documentStatusSchema.safeParse('草稿')
  enabledStatusSchema.safeParse('正常')

  loginPayloadSchema.safeParse({ loginName: 'test', password: '123456' })
  captchaDataSchema.safeParse({
    captchaId: 'captcha',
    captchaImage: 'data',
    required: true,
  })
  login2faPayloadSchema.safeParse({ tempToken: 'token', totpCode: '123456' })
  dataScopeSchema.safeParse('all')
  loginResponseDataSchema.safeParse({
    accessToken: 'token',
    tokenType: 'Bearer',
    expiresIn: 1800,
    user: { id: '1', loginName: 'test' },
  })
  loginStep1ResponseSchema.safeParse({
    requires2fa: true,
    tempToken: 'temp',
  })
  totpSetupResponseSchema.safeParse({ qrCodeBase64: 'qr', secret: 'secret' })

  materialImportResultSchema.safeParse({
    totalRows: 1,
    successCount: 1,
    createdCount: 1,
    updatedCount: 0,
    failedCount: 0,
    failures: [],
  })
  moduleRecordSchema.safeParse({ id: 'record-1' })
  salesOrderItemSchema.safeParse({
    id: 'item-1',
    quantity: 1,
    unitPrice: 1,
    pieceWeightTon: 1,
  })
  purchaseInboundItemSchema.safeParse({
    id: 'item-2',
    quantity: 1,
    unitPrice: 1,
    pieceWeightTon: 1,
  })
  salesOutboundItemSchema.safeParse({
    id: 'item-3',
    quantity: 1,
    unitPrice: 1,
    pieceWeightTon: 1,
  })
  printTemplateRecordSchema.safeParse({
    id: '1',
    templateName: '模板',
    templateHtml: '<div />',
  })
  savePrintTemplatePayloadSchema.safeParse({
    billType: 'sales-order',
    templateName: '模板',
    templateHtml: '<div />',
  })
  initialSetupStatusSchema.safeParse({
    setupRequired: false,
    adminConfigured: true,
    companyConfigured: true,
  })
  initialSetupAdminPayloadSchema.safeParse({
    loginName: 'admin',
    password: '123456',
    userName: '管理员',
  })
  initialSetupTotpPayloadSchema.safeParse({ loginName: 'admin' })
  initialSetupTotpResultSchema.safeParse({
    qrCodeBase64: 'qr',
    secret: 'secret',
  })
  initialSetupCompanyPayloadSchema.safeParse({ companyName: '测试公司' })
  userAccountFormPayloadSchema.safeParse({
    loginName: 'user',
    userName: '用户',
    mobile: '',
    roleIds: ['1'],
    dataScope: 'all',
    permissionSummary: '全部权限',
    status: '正常',
    remark: '',
  })
  userAccountCreateResultSchema.safeParse({
    loginName: 'user',
    password: '123456',
  })
  departmentOptionRecordSchema.safeParse({ id: '1', departmentName: '部门' })
  roleOptionRecordSchema.safeParse({
    id: '1',
    roleName: '角色',
    roleCode: 'ROLE',
  })
}

export async function runE2eCoverageProbe() {
  exerciseSharedSchemas()

  usePermissionStore.getState().setPermissions([
    { resource: 'sales-order', actions: ['read', 'update', 'delete'] },
    { resource: 'freight-bill', actions: ['read'] },
  ])

  const host = document.createElement('div')
  host.setAttribute('data-e2e-coverage-probe', 'true')
  document.body.appendChild(host)

  const root = createRoot(host)
  root.render(<ProbeOverlays />)
  await sleep(800)

  const generateButton = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.includes('生成'),
  )
  generateButton?.click()
  await sleep(300)

  root.unmount()
  host.remove()
}
