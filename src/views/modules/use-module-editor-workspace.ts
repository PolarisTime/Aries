import dayjs from 'dayjs'
import i18next from 'i18next'
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  allocateBusinessPrimaryNo,
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  saveBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business'
import {
  fetchSettlementCompanyOptions,
  getCompanySettingProfile,
} from '@/api/company-settings'
import { readRequestError } from '@/api/request-errors'
import { ERROR_CODE } from '@/constants/error-codes'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
  trimEditorItemsForModule,
} from '@/module-system/module-adapter-editor'
import {
  buildOccupiedParentMap,
  buildParentImportState,
} from '@/module-system/module-adapter-parent-import'
import {
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from '@/module-system/module-adapter-shared'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import {
  type ClientAutosaveReason,
  registerClientAutosaveHandler,
} from '@/utils/client-autosave-registry'
import { cloneLineItems } from '@/utils/clone-utils'
import { parseDateTimeValue } from '@/utils/formatters'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'
import {
  buildModuleEditorDraftSnapshot,
  getModuleEditorDraftRecordId,
  readModuleEditorDraft,
  removeModuleEditorDraft,
  resolveModuleEditorDraftUserKey,
  writeModuleEditorDraft,
} from '@/views/modules/module-editor-draft-storage'

const SYSTEM_GENERATED_PRIMARY_NO_MODULES = new Set([
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'purchase-contract',
  'sales-contract',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'invoice-receipt',
  'invoice-issue',
  'ledger-adjustment',
])

const EDITOR_DRAFT_DEBOUNCE_MS = 500

function sumLineItemsBy(nextItems: ModuleLineItem[], key: string) {
  return nextItems.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

interface AuditTarget {
  key: string
  value: string
}

interface EditorWorkspaceState {
  items: ModuleLineItem[]
  primaryNoLoading: boolean
  authoritativePrimaryNo: string
}

interface WorkspaceFormApi {
  validateFields: () => Promise<ModuleRecord>
  getFieldsValue: (all?: boolean) => ModuleRecord
  setFieldsValue: (values: Partial<ModuleRecord>) => void
  resetFields: () => void
}

type FormChangedValues = Partial<ModuleRecord>

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  moduleKey: string
  editorAuditTarget: AuditTarget | null
  form: WorkspaceFormApi
  onClose: () => void
  onSaved: () => void
  autoInsertBlankItemOnCreate: boolean
}

function normalizeRecordForEditor(
  config: ModulePageConfig,
  record: ModuleRecord,
): ModuleRecord {
  let normalized: ModuleRecord = {
    ...record,
  }

  const normalizeEditorRecord = getBehaviorValue(
    config.key,
    'normalizeEditorRecord',
  )
  if (normalizeEditorRecord) {
    normalized = normalizeEditorRecord(normalized)
  }

  hydrateFinanceStatementSource(config.key, normalized)

  for (const [key, value] of Object.entries(normalized)) {
    normalized[key] = normalizeLabeledValueObject(value)
  }

  for (const field of config.formFields || []) {
    if (
      field.type === 'select' ||
      field.type === 'multiSelect' ||
      field.type === 'autoComplete'
    ) {
      normalized[field.key] = normalizeSelectLikeValue(normalized[field.key])
      continue
    }

    if (field.type !== 'date') {
      continue
    }
    const rawValue = normalized[field.key]
    if (rawValue == null || rawValue === '' || dayjs.isDayjs(rawValue)) {
      continue
    }

    const parsed = parseDateTimeValue(rawValue)
    normalized[field.key] = parsed ?? undefined
  }

  return normalized
}

function hydrateFinanceStatementSource(
  moduleKey: string,
  record: ModuleRecord,
) {
  if (moduleKey === 'ledger-adjustment') {
    record.customerId =
      record.counterpartyType === '客户' ? record.counterpartyId : undefined
  }

  const firstItem = Array.isArray(record.items) ? record.items[0] : undefined
  if (!firstItem) {
    return
  }

  if (moduleKey === 'receipt' && !record.sourceCustomerStatementId) {
    record.sourceCustomerStatementId =
      firstItem.sourceCustomerStatementId ?? firstItem.sourceStatementId
    return
  }

  if (moduleKey !== 'payment') {
    return
  }

  if (
    !record.sourceSupplierStatementId &&
    firstItem.sourceSupplierStatementId
  ) {
    record.sourceSupplierStatementId = firstItem.sourceSupplierStatementId
  }
  if (!record.sourceFreightStatementId && firstItem.sourceFreightStatementId) {
    record.sourceFreightStatementId = firstItem.sourceFreightStatementId
  }

  if (
    !record.sourceSupplierStatementId &&
    !record.sourceFreightStatementId &&
    firstItem.sourceStatementId
  ) {
    const targetField =
      record.counterpartyType === '物流商'
        ? 'sourceFreightStatementId'
        : 'sourceSupplierStatementId'
    record[targetField] = firstItem.sourceStatementId
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSelectLikeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSelectLikeValue(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return asString(value)
  }
  return value
}

function normalizeLabeledValueObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLabeledValueObject(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  return value
}

function normalizeLineItemsForEditor(items: ModuleLineItem[]) {
  return items.map((item) => ({
    ...item,
    materialCode: normalizeLabeledValueObject(item.materialCode),
    settlementMode: normalizeSelectLikeValue(item.settlementMode),
    warehouseName: normalizeSelectLikeValue(item.warehouseName),
    settlementCompanyId: normalizeSelectLikeValue(item.settlementCompanyId),
  }))
}

function hasExplicitTimePart(value: unknown): boolean {
  if (dayjs.isDayjs(value) || value instanceof Date) {
    return true
  }

  if (typeof value === 'number') {
    return String(Math.trunc(value)).length !== 8
  }

  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  return /\d{1,2}:\d{2}/.test(normalized) || /^\d{14}$/.test(normalized)
}

function parseValidDateTime(value: unknown) {
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null
  }
  return parseDateTimeValue(value)
}

function mergeDateOnlyFieldTimesForSave(
  config: ModulePageConfig,
  values: ModuleRecord,
  sourceRecord: ModuleRecord | null,
): ModuleRecord {
  if (!config.formFields?.length) {
    return values
  }

  const fallbackTime = dayjs()
  const next: ModuleRecord = { ...values }

  for (const field of config.formFields) {
    if (field.type !== 'date' || field.showTime === true) {
      continue
    }

    const value = next[field.key]
    if (!dayjs.isDayjs(value) || !value.isValid()) {
      continue
    }

    const sourceValue = sourceRecord?.[field.key]
    const sourceTime = hasExplicitTimePart(sourceValue)
      ? parseValidDateTime(sourceValue)
      : null
    const timeSource = sourceTime || fallbackTime
    next[field.key] = value
      .hour(timeSource.hour())
      .minute(timeSource.minute())
      .second(timeSource.second())
  }

  return next
}

function isAntdFormValidationError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const obj = err as Record<string, unknown>
  return (
    Array.isArray(obj.errorFields) &&
    typeof obj.values === 'object' &&
    obj.values !== null
  )
}

function getCurrentOperatorName() {
  const user = getStoredUser()
  if (user) {
    return String(
      user.userName ||
        user.loginName ||
        i18next.t('modules.editorWorkspace.currentUserFallback'),
    )
  }
  return i18next.t('modules.editorWorkspace.currentUserFallback')
}

function normalizeOptionalString(value: unknown) {
  return asString(value).trim()
}

function shouldUseAuthoritativePrimaryNo(
  moduleKey: string,
  primaryNoKey?: string,
) {
  return Boolean(
    primaryNoKey && SYSTEM_GENERATED_PRIMARY_NO_MODULES.has(moduleKey),
  )
}

function getAuthoritativePrimaryNo(
  moduleKey: string,
  primaryNoKey: string | undefined,
  record: ModuleRecord | null | undefined,
) {
  if (
    !record ||
    !primaryNoKey ||
    !shouldUseAuthoritativePrimaryNo(moduleKey, primaryNoKey)
  ) {
    return ''
  }
  return normalizeOptionalString(record[primaryNoKey])
}

function applyAuthoritativePrimaryNo(
  record: ModuleRecord,
  primaryNoKey: string | undefined,
  authoritativePrimaryNo: string,
) {
  if (!primaryNoKey || !authoritativePrimaryNo) {
    return record
  }
  record[primaryNoKey] = authoritativePrimaryNo
  return record
}

async function resolveDefaultSettlementCompany() {
  const currentProfile = await getCompanySettingProfile().catch(() => null)
  const currentId = currentProfile?.id?.trim()
  if (currentProfile?.companyName && currentId) {
    return {
      settlementCompanyId: currentId,
      settlementCompanyName: currentProfile.companyName,
    }
  }

  const options = await fetchSettlementCompanyOptions()
  const firstOption = options[0]
  if (!firstOption) {
    return {}
  }
  return {
    settlementCompanyId: firstOption.value,
    settlementCompanyName: firstOption.companyName,
  }
}

function applyPurchaseOrderDefaultSettlementCompany(
  moduleKey: string,
  form: WorkspaceFormApi,
  isActive: () => boolean,
) {
  if (moduleKey !== 'purchase-order') {
    return
  }

  void resolveDefaultSettlementCompany()
    .then((defaults) => {
      if (!isActive() || !defaults.settlementCompanyId) {
        return
      }
      const currentValues = form.getFieldsValue(true)
      if (currentValues.settlementCompanyId) {
        return
      }
      form.setFieldsValue(defaults)
    })
    .catch(() => {
      // 结算主体默认值不是创建草稿的硬依赖，保留必填校验兜底。
    })
}

function editorWorkspaceReducer(
  state: EditorWorkspaceState,
  patch: Partial<EditorWorkspaceState>,
): EditorWorkspaceState {
  return { ...state, ...patch }
}

function syncEditorFormValues(args: {
  config: ModulePageConfig
  form: WorkspaceFormApi
  moduleKey: string
  items: ModuleLineItem[]
  sumLineItemsBy: (nextItems: ModuleLineItem[], key: string) => number
  changedValues?: FormChangedValues
  defaultTaxRate: number
}) {
  const {
    config,
    form,
    moduleKey,
    items,
    sumLineItemsBy,
    changedValues,
    defaultTaxRate,
  } = args
  const currentValues = form.getFieldsValue(true)
  const changedKeys = new Set(Object.keys(changedValues || {}))
  const nextValues = syncDerivedEditorFormValuesForModule({
    moduleKey,
    record: { ...currentValues, ...changedValues },
    items,
    sumLineItemsBy,
    changedKeys,
  })
  if (moduleKey === 'invoice-receipt' || moduleKey === 'invoice-issue') {
    nextValues.taxRate = defaultTaxRate
    nextValues.taxAmount = Number(
      (Number(nextValues.amount || 0) * defaultTaxRate).toFixed(2),
    )
  }
  form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
}

function buildPreallocatedIdWarning(args: {
  isEdit: boolean
  snowflakeBusinessNoEnabled: boolean
  primaryNoKey?: string
  draftRecord: ModuleRecord
  savedRecord?: ModuleRecord
}) {
  const {
    isEdit,
    snowflakeBusinessNoEnabled,
    primaryNoKey,
    draftRecord,
    savedRecord,
  } = args

  if (isEdit || !snowflakeBusinessNoEnabled || !primaryNoKey) {
    return null
  }

  const expectedPreallocatedId = normalizeOptionalString(
    draftRecord._preallocatedId,
  )
  const expectedPrimaryNo = normalizeOptionalString(draftRecord[primaryNoKey])
  const actualPrimaryNo = savedRecord
    ? normalizeOptionalString(
        getModuleRecordPrimaryNo(savedRecord, primaryNoKey),
      )
    : ''
  const actualId = savedRecord ? normalizeOptionalString(savedRecord.id) : ''

  if (!expectedPreallocatedId) {
    return {
      title: i18next.t('modules.editorWorkspace.preallocatedNoMismatchTitle'),
      content:
        actualPrimaryNo || actualId
          ? i18next.t('modules.editorWorkspace.preallocatedNoMismatchContent', {
              primaryNo: actualPrimaryNo || actualId,
            })
          : i18next.t(
              'modules.editorWorkspace.preallocatedNoMismatchContentNoNo',
            ),
    }
  }

  const expectedIdentityNo = expectedPrimaryNo || expectedPreallocatedId
  const primaryNoMismatch =
    Boolean(actualPrimaryNo) && actualPrimaryNo !== expectedIdentityNo
  const entityIdMismatch =
    Boolean(actualId) && actualId !== expectedPreallocatedId

  if (!primaryNoMismatch && !entityIdMismatch) {
    return null
  }

  return {
    title: i18next.t('modules.editorWorkspace.preallocatedNoUpdatedTitle'),
    content: i18next.t('modules.editorWorkspace.preallocatedNoUpdatedContent', {
      expected: expectedIdentityNo,
      actual: actualPrimaryNo || actualId,
    }),
  }
}

function showPreOutboundGuidanceIfNeeded(
  moduleKey: string,
  errorMessage: string,
) {
  if (
    moduleKey !== 'sales-outbound' ||
    !errorMessage.includes('来源采购明细尚未完成采购入库')
  ) {
    return
  }
  modal.info({
    title: '请改用预出库流程',
    content: errorMessage,
    okText: '知道了',
  })
}

export function useModuleEditorWorkspace({
  open,
  config,
  record,
  moduleKey,
  editorAuditTarget,
  form,
  onClose,
  onSaved,
  autoInsertBlankItemOnCreate,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [parentSelectorSessionKey, setParentSelectorSessionKey] = useState<
    string | null
  >(null)
  const [parentSelectorFilters, setParentSelectorFilters] =
    useState<SearchParams>({})
  const [parentImporting, setParentImporting] = useState(false)
  const [workspaceState, dispatchWorkspaceState] = useReducer(
    editorWorkspaceReducer,
    {
      items: [],
      primaryNoLoading: false,
      authoritativePrimaryNo: '',
    },
  )
  const { items, primaryNoLoading, authoritativePrimaryNo } = workspaceState
  const { t } = useTranslation()
  const [saveResult, setSaveResult] = useState<{
    status: 'success' | 'error' | 'warning'
    message: string
    traceId?: string
    errorCode?: number
    record?: ModuleRecord
  } | null>(null)
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const isEdit = !!record
  const userKey = resolveModuleEditorDraftUserKey(getStoredUser())
  const draftRecordId = getModuleEditorDraftRecordId(record)
  const editorSessionKey = `${moduleKey}:${String(record?.id || 'new')}:${String(open)}`
  const parentSelectorOpen = parentSelectorSessionKey === editorSessionKey
  const { data: runtimeConfig } = useRuntimeConfig()
  const defaultTaxRate = runtimeConfig?.business.defaultTaxRate ?? 0.13
  const snowflakeBusinessNoEnabled =
    runtimeConfig?.business.businessNo.useSnowflakeId ?? false

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    const applyStoredDraft = (
      storedDraft: NonNullable<ReturnType<typeof readModuleEditorDraft>>,
    ) => {
      if (!active) {
        return
      }
      const restoredValues = normalizeRecordForEditor(
        config,
        storedDraft.values,
      )
      const restoredItems = normalizeLineItemsForEditor(storedDraft.items)

      if (!record && config.primaryNoKey && snowflakeBusinessNoEnabled) {
        const primaryNoKey = asString(config.primaryNoKey)
        form.setFieldsValue({
          ...restoredValues,
          _preallocatedId: '',
          [primaryNoKey]: '',
        })
        dispatchWorkspaceState({
          items: restoredItems,
          primaryNoLoading: true,
          authoritativePrimaryNo: '',
        })
        void allocateBusinessPrimaryNo(moduleKey)
          .then(({ generatedNo, generatedId }) => {
            if (!active) {
              return
            }
            form.setFieldsValue({
              ...restoredValues,
              _preallocatedId: generatedId || '',
              [primaryNoKey]: generatedNo,
            })
            dispatchWorkspaceState({
              authoritativePrimaryNo: shouldUseAuthoritativePrimaryNo(
                moduleKey,
                config.primaryNoKey,
              )
                ? generatedNo
                : '',
            })
          })
          .catch((err) => {
            if (!active) {
              return
            }
            message.error(
              err instanceof Error
                ? err.message
                : t('common.preallocateNoFailed'),
            )
          })
          .finally(() => {
            if (active) {
              dispatchWorkspaceState({ primaryNoLoading: false })
            }
          })
        return
      }

      form.setFieldsValue(restoredValues)
      dispatchWorkspaceState({
        items: restoredItems,
        primaryNoLoading: false,
        authoritativePrimaryNo: storedDraft.authoritativePrimaryNo,
      })
    }

    const initializeEditor = () => {
      if (!active) {
        return
      }

      if (record) {
        const nextAuthoritativePrimaryNo = getAuthoritativePrimaryNo(
          moduleKey,
          config.primaryNoKey,
          record,
        )
        form.setFieldsValue(normalizeRecordForEditor(config, record))
        dispatchWorkspaceState({
          items: normalizeLineItemsForEditor(record.items || []),
          primaryNoLoading: false,
          authoritativePrimaryNo: nextAuthoritativePrimaryNo,
        })
        return
      }

      form.resetFields()
      const defaultDraft: ModuleRecord = {} as ModuleRecord
      applyFormFieldDefaultDraftValues(defaultDraft, config.formFields)
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue(defaultDraft)
      applyPurchaseOrderDefaultSettlementCompany(moduleKey, form, () => active)
      const draftItems = autoInsertBlankItemOnCreate
        ? [buildDefaultEditorLineItem(undefined, moduleKey)]
        : []
      if (config.primaryNoKey) {
        dispatchWorkspaceState({
          items: draftItems,
          primaryNoLoading: true,
          authoritativePrimaryNo: '',
        })
        if (snowflakeBusinessNoEnabled) {
          void allocateBusinessPrimaryNo(moduleKey)
            .then(({ generatedNo, generatedId }) => {
              if (!active) {
                return
              }
              form.setFieldsValue({
                ...defaultDraft,
                _preallocatedId: generatedId || '',
                [asString(config.primaryNoKey)]: generatedNo,
              })
              dispatchWorkspaceState({
                authoritativePrimaryNo: shouldUseAuthoritativePrimaryNo(
                  moduleKey,
                  config.primaryNoKey,
                )
                  ? generatedNo
                  : '',
              })
            })
            .catch((err) => {
              if (!active) {
                return
              }
              message.error(
                err instanceof Error
                  ? err.message
                  : t('common.preallocateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                dispatchWorkspaceState({ primaryNoLoading: false })
              }
            })
        } else {
          void generateBusinessPrimaryNo(moduleKey)
            .then((generatedNo) => {
              if (!active) {
                return
              }
              form.setFieldsValue({
                ...defaultDraft,
                [asString(config.primaryNoKey)]: generatedNo,
              })
              dispatchWorkspaceState({
                authoritativePrimaryNo: shouldUseAuthoritativePrimaryNo(
                  moduleKey,
                  config.primaryNoKey,
                )
                  ? generatedNo
                  : '',
              })
            })
            .catch((err) => {
              if (!active) {
                return
              }
              message.error(
                err instanceof Error
                  ? err.message
                  : t('common.generateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                dispatchWorkspaceState({ primaryNoLoading: false })
              }
            })
        }
      } else {
        dispatchWorkspaceState({
          items: draftItems,
          primaryNoLoading: false,
          authoritativePrimaryNo: '',
        })
      }
    }

    const storedDraft = userKey
      ? readModuleEditorDraft(userKey, moduleKey, draftRecordId)
      : null
    if (storedDraft) {
      modal.confirm({
        title: t('modules.editorWorkspace.recoverDraftTitle'),
        content: t('modules.editorWorkspace.recoverDraftContent'),
        okText: t('modules.editorWorkspace.recoverDraftOk'),
        cancelText: t('modules.editorWorkspace.recoverDraftCancel'),
        onOk: () => applyStoredDraft(storedDraft),
        onCancel: () => {
          if (userKey) {
            removeModuleEditorDraft(userKey, moduleKey, draftRecordId)
          }
          initializeEditor()
        },
      })
      return () => {
        active = false
      }
    }

    initializeEditor()

    return () => {
      active = false
    }
  }, [
    autoInsertBlankItemOnCreate,
    config,
    form,
    draftRecordId,
    moduleKey,
    open,
    record,
    snowflakeBusinessNoEnabled,
    t,
    userKey,
  ])

  const draftDirtyRef = useRef(false)

  const writeCurrentDraftSnapshot = useCallback(
    (reason?: ClientAutosaveReason, nextItems?: ModuleLineItem[]) => {
      void reason
      if (!userKey || !draftDirtyRef.current) {
        return
      }

      const effectiveAuthoritativePrimaryNo =
        authoritativePrimaryNo ||
        getAuthoritativePrimaryNo(moduleKey, config.primaryNoKey, record)
      const currentValues = applyAuthoritativePrimaryNo(
        { ...form.getFieldsValue(true) },
        config.primaryNoKey,
        effectiveAuthoritativePrimaryNo,
      )

      try {
        writeModuleEditorDraft(
          buildModuleEditorDraftSnapshot({
            userKey,
            moduleKey,
            recordId: draftRecordId,
            values: currentValues,
            items: nextItems || items,
            authoritativePrimaryNo: effectiveAuthoritativePrimaryNo,
          }),
        )
        draftDirtyRef.current = false
      } catch {
        // 本地草稿是兜底能力，写入失败不应阻断用户编辑。
      }
    },
    [
      authoritativePrimaryNo,
      config.primaryNoKey,
      draftRecordId,
      form,
      items,
      moduleKey,
      record,
      userKey,
    ],
  )

  const draftWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDraftItemsRef = useRef<ModuleLineItem[] | undefined>(undefined)
  const draftWriterRef = useRef(writeCurrentDraftSnapshot)
  draftWriterRef.current = writeCurrentDraftSnapshot
  const editorOpenRef = useRef(open)
  editorOpenRef.current = open

  const flushScheduledDraft = useCallback((reason?: ClientAutosaveReason) => {
    if (draftWriteTimerRef.current) {
      clearTimeout(draftWriteTimerRef.current)
      draftWriteTimerRef.current = null
    }
    const pendingItems = pendingDraftItemsRef.current
    pendingDraftItemsRef.current = undefined
    if (!editorOpenRef.current) {
      return
    }
    draftWriterRef.current(reason, pendingItems)
  }, [])

  const scheduleDraftWrite = useCallback(
    (nextItems?: ModuleLineItem[]) => {
      if (!userKey) {
        return
      }
      draftDirtyRef.current = true
      pendingDraftItemsRef.current = nextItems
      if (draftWriteTimerRef.current) {
        clearTimeout(draftWriteTimerRef.current)
      }
      draftWriteTimerRef.current = setTimeout(() => {
        flushScheduledDraft('editor-change')
      }, EDITOR_DRAFT_DEBOUNCE_MS)
    },
    [flushScheduledDraft, userKey],
  )

  const flushScheduledDraftRef = useRef(flushScheduledDraft)
  flushScheduledDraftRef.current = flushScheduledDraft

  useEffect(() => {
    if (!open || !userKey) {
      return
    }
    const activeDraftWriter = draftWriterRef.current
    const unregister = registerClientAutosaveHandler((reason) => {
      flushScheduledDraftRef.current(reason)
    })
    return () => {
      if (draftWriteTimerRef.current) {
        clearTimeout(draftWriteTimerRef.current)
        draftWriteTimerRef.current = null
      }
      const pendingItems = pendingDraftItemsRef.current
      pendingDraftItemsRef.current = undefined
      activeDraftWriter('pagehide', pendingItems)
      unregister()
    }
  }, [open, userKey])

  const handleFormValuesChange = (changedValues: FormChangedValues) => {
    if (!open) {
      return
    }
    if (!Object.keys(changedValues).length) {
      return
    }
    syncEditorFormValues({
      config,
      form,
      moduleKey,
      items,
      sumLineItemsBy,
      changedValues,
      defaultTaxRate,
    })
    scheduleDraftWrite()
  }

  const handleSave = async (audit = false) => {
    try {
      if (primaryNoLoading) {
        message.warning(t('common.primaryNoGenerating'))
        return
      }

      const effectiveAuthoritativePrimaryNo =
        authoritativePrimaryNo ||
        getAuthoritativePrimaryNo(moduleKey, config.primaryNoKey, record)

      if (config.primaryNoKey && effectiveAuthoritativePrimaryNo) {
        form.setFieldsValue({
          [config.primaryNoKey]: effectiveAuthoritativePrimaryNo,
        })
      }

      const validatedFields = await form.validateFields()
      const validatedValues = applyAuthoritativePrimaryNo(
        { ...form.getFieldsValue(true), ...validatedFields },
        config.primaryNoKey,
        effectiveAuthoritativePrimaryNo,
      )
      const values = mergeDateOnlyFieldTimesForSave(
        config,
        validatedValues,
        record,
      )
      const trimmedItems = trimEditorItemsForModule(moduleKey, items)

      let occupiedParentMap: Record<string, ModuleRecord> = {}
      if (config.parentImport?.enforceUniqueRelation) {
        try {
          const existingRows = await listAllBusinessModuleRows(moduleKey, {})
          occupiedParentMap = buildOccupiedParentMap(
            existingRows,
            config.parentImport.parentFieldKey,
            record?.id ? String(record.id) : undefined,
          )
        } catch {
          // non-critical — skip uniqueness check if fetch fails
        }
      }

      const validationMessage = getEditorValidationMessage({
        moduleKey,
        fields: config.formFields || [],
        editorForm: values,
        hasItemColumns: Boolean(config.itemColumns?.length),
        itemColumns: config.itemColumns,
        items: trimmedItems,
        itemCount: trimmedItems.length,
        skipRequiredFieldKeys:
          snowflakeBusinessNoEnabled && config.primaryNoKey
            ? [config.primaryNoKey]
            : [],
        parentImportConfig: config.parentImport,
        occupiedParentMap,
        getPrimaryNo: (candidate) =>
          getModuleRecordPrimaryNo(candidate, config.primaryNoKey),
        collectAll: true,
      })
      if (validationMessage) {
        message.warning(validationMessage)
        return
      }

      // 销售订单独有提示: 明细 unitPrice 为 0 时提醒「价格待定」
      const zeroPriceItemCount =
        moduleKey === 'sales-order'
          ? trimmedItems.filter(
              (item) => !item.unitPrice || Number(item.unitPrice) === 0,
            ).length
          : 0
      if (zeroPriceItemCount > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: '价格待定提醒',
            content: `当前 ${zeroPriceItemCount} 条明细单价为 0，将以「待定价」状态保存。确认继续吗？`,
            okText: '继续保存',
            cancelText: '返回修改',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return
      }

      if (audit && editorAuditTarget) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: t('common.saveAndAudit'),
            content: t('common.auditConfirm'),
            okText: t('common.confirmAudit'),
            cancelText: t('common.cancel'),
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return
      }

      setSaving(true)
      const draftRecord: ModuleRecord = {
        ...(record || {}),
        ...values,
        id: record?.id || '',
        _preallocatedId:
          !record && snowflakeBusinessNoEnabled
            ? asString(values._preallocatedId)
            : undefined,
        items: trimmedItems,
      }
      applyAuthoritativePrimaryNo(
        draftRecord,
        config.primaryNoKey,
        effectiveAuthoritativePrimaryNo,
      )

      normalizeDraftRecordForModule({
        moduleKey,
        record: draftRecord,
        items: trimmedItems,
        primaryNoKey: config.primaryNoKey,
        currentOperatorName: getCurrentOperatorName(),
        sumLineItemsBy,
        formFields: config.formFields,
      })

      if (audit && editorAuditTarget) {
        const submittedStatus = asString(
          draftRecord[editorAuditTarget.key],
        ).trim()
        if (submittedStatus === editorAuditTarget.value) {
          const existingStatus = asString(
            record?.[editorAuditTarget.key],
          ).trim()
          const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
          const draftStatus =
            existingStatus && existingStatus !== editorAuditTarget.value
              ? existingStatus
              : typeof defaultStatus === 'string'
                ? defaultStatus.trim()
                : ''
          if (draftStatus) {
            draftRecord[editorAuditTarget.key] = draftStatus
          } else {
            delete draftRecord[editorAuditTarget.key]
          }
        }
      }

      const savedResult = await saveBusinessModule(moduleKey, draftRecord)
      let savedRecord = savedResult.data
      if (audit && editorAuditTarget) {
        const savedId = String(savedRecord?.id || draftRecord.id || '').trim()
        if (!savedId) {
          throw new Error('保存成功但未返回单据 ID，无法完成审核')
        }
        const statusResult = await updateBusinessModuleStatus(
          moduleKey,
          savedId,
          editorAuditTarget.value,
        )
        savedRecord = statusResult.data || savedRecord
      }
      const preallocatedIdWarning = buildPreallocatedIdWarning({
        isEdit,
        snowflakeBusinessNoEnabled,
        primaryNoKey: config.primaryNoKey,
        draftRecord,
        savedRecord,
      })
      draftDirtyRef.current = false
      if (draftWriteTimerRef.current) {
        clearTimeout(draftWriteTimerRef.current)
        draftWriteTimerRef.current = null
      }
      pendingDraftItemsRef.current = undefined
      if (userKey) {
        removeModuleEditorDraft(userKey, moduleKey, draftRecordId)
      }
      if (preallocatedIdWarning) {
        setSaveResult({
          status: 'warning',
          message: preallocatedIdWarning.content,
          record: savedRecord,
        })
      } else {
        setSaveResult({
          status: 'success',
          message: isEdit ? t('common.editSuccess') : t('common.addSuccess'),
          record: savedRecord,
        })
      }
      onSaved()
      try {
        await refreshModuleQueries()
      } catch (refreshError) {
        message.error(
          refreshError instanceof Error
            ? refreshError.message
            : t('common.loadFailed'),
        )
      }
      setSaving(false)
    } catch (err) {
      if (isAntdFormValidationError(err)) {
        // Form 已内联展示校验错误，不重复提示
      } else if (err instanceof Error) {
        const { code, traceId } = readRequestError(err)
        const errorMessage = err.message || t('common.saveFailed')
        showPreOutboundGuidanceIfNeeded(moduleKey, errorMessage)
        setSaveResult({
          status: 'error',
          message: errorMessage,
          traceId,
          ...(code !== undefined ? { errorCode: code } : {}),
        })
      } else {
        setSaveResult({
          status: 'error',
          message: t('common.saveFailedRetry'),
        })
      }
      setSaving(false)
    }
  }

  const reloadAfterConflict = async (): Promise<void> => {
    if (saveResult?.errorCode !== ERROR_CODE.CONCURRENT_MODIFICATION) {
      return
    }

    setSaving(true)
    if (userKey) {
      removeModuleEditorDraft(userKey, moduleKey, draftRecordId)
    }
    try {
      await refreshModuleQueries()
      setSaveResult(null)
      onClose()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('common.loadFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleImportParentRecord = async (selectedRecords: ModuleRecord[]) => {
    const parentImportConfig = config.parentImport
    if (!parentImportConfig) {
      return
    }
    if (!selectedRecords.length) {
      message.warning(
        t('common.pleaseSelectWith', { label: parentImportConfig.label }),
      )
      return
    }

    setParentImporting(true)
    try {
      const parentDetails = await Promise.all(
        selectedRecords.map(async (selectedRecord) => ({
          data: parentImportConfig.resolveParentRecord
            ? await parentImportConfig.resolveParentRecord(selectedRecord)
            : (
                await getBusinessModuleDetail(
                  parentImportConfig.parentModuleKey,
                  String(selectedRecord.id),
                )
              ).data,
        })),
      )

      let nextValues = form.getFieldsValue(true)
      let nextItems = items
      let importedParentCount = 0
      let importedItemCount = 0
      let importValidationError = ''

      for (const parentDetail of parentDetails) {
        const parentRecord = parentDetail.data
        const currentParentNos = parseParentRelationNos(
          nextValues[parentImportConfig.parentFieldKey],
        )
        const validationError = parentImportConfig.validateParentImport?.({
          currentRecord: nextValues,
          currentItems: nextItems,
          currentParentNos,
          parentRecord,
        })
        if (validationError) {
          importValidationError = validationError
          break
        }
        const importState = buildParentImportState({
          parentImportConfig,
          parentRecord,
          currentParentNos,
          currentItems: nextItems,
          cloneLineItems,
        })

        nextValues = {
          ...nextValues,
          [parentImportConfig.parentFieldKey]: importState.parentNosText,
        }
        if (importState.shouldApplyMappedValues) {
          Object.assign(nextValues, importState.mappedValues)
        }
        nextItems = importState.nextItems
        importedParentCount += importState.hasImportedCurrentParent ? 0 : 1
        importedItemCount += importState.importedItemCount
      }

      if (importValidationError) {
        message.error(importValidationError)
        setParentImporting(false)
        return
      }

      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        sumLineItemsBy,
        changedValues: nextValues,
        defaultTaxRate,
      })
      dispatchWorkspaceState({ items: nextItems })
      scheduleDraftWrite(nextItems)
      setParentSelectorSessionKey(null)
      message.success(
        importedParentCount > 1
          ? t('common.importParentSuccess', {
              parentCount: importedParentCount,
              itemCount: importedItemCount,
            })
          : t('common.importParentSuccessSimple', {
              itemCount: importedItemCount,
            }),
      )
      setParentImporting(false)
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t('common.importParentFailed'),
      )
      setParentImporting(false)
    }
  }

  const openParentSelector = () => {
    const parentImportConfig = config.parentImport
    if (!parentImportConfig) {
      return
    }
    const currentValues = form.getFieldsValue(true)
    const validationError =
      parentImportConfig.validateBeforeOpen?.(currentValues)
    if (validationError) {
      message.warning(validationError)
      return
    }
    const nextParentFilters =
      parentImportConfig.buildParentFilters?.(currentValues) || {}
    setParentSelectorFilters(nextParentFilters)
    setParentSelectorSessionKey(editorSessionKey)
  }

  const addItem = () => {
    const newItem = buildDefaultEditorLineItem(undefined, moduleKey)
    const nextItems = [...items, newItem]
    dispatchWorkspaceState({ items: nextItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        sumLineItemsBy,
        defaultTaxRate,
      })
    }
    scheduleDraftWrite(nextItems)
  }

  const updateItems: Dispatch<SetStateAction<ModuleLineItem[]>> = (
    nextItems,
  ) => {
    const resolvedItems =
      typeof nextItems === 'function' ? nextItems(items) : nextItems
    dispatchWorkspaceState({ items: resolvedItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: resolvedItems,
        sumLineItemsBy,
        defaultTaxRate,
      })
    }
    scheduleDraftWrite(resolvedItems)
  }

  return {
    addItem,
    closeParentSelector: () => setParentSelectorSessionKey(null),
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorFilters,
    parentSelectorOpen,
    primaryNoLoading,
    authoritativePrimaryNo,
    saveResult,
    clearSaveResult: () => setSaveResult(null),
    reloadAfterConflict,
    saving,
    setItems: updateItems,
    handleFormValuesChange,
    flushEditorDraft: flushScheduledDraft,
  }
}
