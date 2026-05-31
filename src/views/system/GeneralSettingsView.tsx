import { useQuery } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { listSystemSettings, saveSystemSetting } from '@/api/system-settings'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { GeneralSettingsEditorModal } from '@/views/system/GeneralSettingsEditorModal'
import { GeneralSettingsTableCard } from '@/views/system/GeneralSettingsTableCard'
import {
  isDefaultTaxRateSetting,
  isNumericSetting,
  isToggleSetting,
  isWatermarkContentSetting,
  isWatermarkPropSetting,
  matchesGeneralSettingKeyword,
} from '@/views/system/general-settings-view-utils'
import { isSystemSwitch } from '@/views/system/number-rules-view-utils'
import { RateLimitRulesCard } from '@/views/system/RateLimitRulesCard'

interface GeneralSettingsState {
  keyword: string
  statusFilter: string | undefined
  editorOpen: boolean
  editingRecord: ModuleRecord | null
  saving: boolean
  toggling: boolean
}

const generalSettingsInitialState: GeneralSettingsState = {
  keyword: '',
  statusFilter: undefined,
  editorOpen: false,
  editingRecord: null,
  saving: false,
  toggling: false,
}

export function buildSystemSettingPayload(
  record: ModuleRecord,
  patch: Partial<ModuleRecord>,
): ModuleRecord {
  return {
    id: record.id,
    settingCode: record.settingCode,
    settingName: record.settingName,
    billName: record.billName,
    prefix: record.prefix || 'SYS',
    dateRule: record.dateRule || 'NONE',
    serialLength: record.serialLength || 1,
    resetRule: record.resetRule || 'NEVER',
    sampleNo: record.sampleNo || 'ON',
    status: asString(record.status) || '正常',
    remark: record.remark,
    ...patch,
  }
}

export function GeneralSettingsView() {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('general-setting', 'update')

  const [state, setState] = useReducer(
    (prev: GeneralSettingsState, patch: Partial<GeneralSettingsState>) => ({
      ...prev,
      ...patch,
    }),
    generalSettingsInitialState,
  )
  const { keyword, statusFilter, editorOpen, editingRecord, saving, toggling } =
    state
  const [form] = Form.useForm()

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: QUERY_KEYS.generalSetting,
    queryFn: () => listSystemSettings(),
  })

  const filteredRows = rows.filter((record) => {
    if (!isSystemSwitch(record)) return false
    if (statusFilter && asString(record.status) !== statusFilter) return false
    return matchesGeneralSettingKeyword(record, keyword)
  })

  const basicSettingRows = filteredRows.filter(isNumericSetting)
  const switchRows = filteredRows.filter(isToggleSetting)

  const refresh = useRefreshQuery('general-setting')

  const openEditor = (record: ModuleRecord) => {
    if (!canEdit) {
      message.warning(t('common.noPermission'))
      return
    }
    setState({ editingRecord: record })
    form.setFieldsValue({
      settingCode: record.settingCode,
      settingName: record.settingName,
      billName: record.billName,
      remark: record.remark,
      enabled: asString(record.status) === '正常',
      numericValue: isWatermarkContentSetting(record)
        ? asString(record.sampleNo)
        : isWatermarkPropSetting(record) || isDefaultTaxRateSetting(record)
          ? Number(record.sampleNo || 0.13)
          : Number(record.sampleNo || 0),
      selectedActions: asString(record.sampleNo).split(',').filter(Boolean),
    })
    setState({ editorOpen: true })
  }

  const handleToggle = async (record: ModuleRecord) => {
    setState({ toggling: true })
    const nextStatus = asString(record.status) === '正常' ? '禁用' : '正常'
    try {
      await saveSystemSetting(buildSystemSettingPayload(record, {
        sampleNo: record.sampleNo || 'ON',
        status: nextStatus,
      }))
      message.success(
        nextStatus === '正常'
          ? t('system.generalSettings.enabled')
          : t('system.generalSettings.closed'),
      )
      refresh()
      setState({ toggling: false })
    } catch (error) {
      showError(error, t('table.operationFailed'))
      setState({ toggling: false })
    }
  }

  const handleSave = async () => {
    if (!editingRecord) return
    setState({ saving: true })
    try {
      const values = await form.validateFields()
      const isToggle = isToggleSetting(editingRecord)
      let sampleNo = ''
      if (isWatermarkContentSetting(editingRecord)) {
        sampleNo = String(values.numericValue || '').trim()
      } else if (isNumericSetting(editingRecord)) {
        sampleNo = String(values.numericValue || 0)
      } else if (isToggle) {
        sampleNo = values.selectedActions?.join(',') || ''
      }
      await saveSystemSetting(buildSystemSettingPayload(editingRecord, {
        settingCode: values.settingCode,
        settingName: values.settingName,
        billName: values.billName,
        remark: values.remark,
        status: isToggle
          ? values.enabled
            ? '正常'
            : '禁用'
          : asString(editingRecord.status) || '正常',
        sampleNo: sampleNo || 'ON',
      }))
      message.success(t('common.saveSuccess'))
      refresh()
      setState({ editorOpen: false, saving: false })
    } catch (error) {
      showError(error, t('api.saveFailed'))
      setState({ saving: false })
    }
  }

  return (
    <div className="page-stack">
      <GeneralSettingsTableCard
        keyword={keyword}
        statusFilter={statusFilter}
        filteredRows={filteredRows}
        basicSettingRows={basicSettingRows}
        switchRows={switchRows}
        loading={isLoading}
        canEdit={canEdit}
        toggling={toggling}
        onKeywordChange={(value) => setState({ keyword: value })}
        onStatusFilterChange={(value) => setState({ statusFilter: value })}
        onRefresh={refresh}
        onEdit={openEditor}
        onToggle={(record) => {
          void handleToggle(record)
        }}
      />

      <RateLimitRulesCard />

      {editorOpen ? (
        <GeneralSettingsEditorModal
          open={editorOpen}
          record={editingRecord}
          form={form}
          saving={saving}
          onSave={() => {
            void handleSave()
          }}
          onClose={() => setState({ editorOpen: false })}
        />
      ) : null}
    </div>
  )
}
