import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { listSystemSettings, saveSystemSetting } from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STATUS } from '@/constants/status-constants'
import { useRequestError } from '@/hooks/useRequestError'
import { useResourcePermissions } from '@/hooks/useResourcePermissions'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { GeneralSettingsEditorModal } from '@/views/system/GeneralSettingsEditorModal'
import { GeneralSettingsTableCard } from '@/views/system/GeneralSettingsTableCard'
import {
  buildSystemSettingPayload,
  HIDE_AUDITED_STATUS_VALUES,
  isHideAuditedListRecordsSetting,
  isNumericSetting,
  isSystemSwitch,
  isToggleSetting,
  matchesGeneralSettingKeyword,
  resolveHideAuditedStatusValues,
} from '@/views/system/general-settings-view-utils'
import { SystemSettingsLoadError } from '@/views/system/SystemSettingsLoadError'
import { useSystemSettingsRefresh } from '@/views/system/useSystemSettingsRefresh'

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

export function GeneralSettingsView() {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const { canUpdate: canEdit } = useResourcePermissions('general-setting')

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

  const {
    data: rows = [],
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<ModuleRecord[]>({
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

  const refresh = useSystemSettingsRefresh()

  const openEditor = (record: ModuleRecord) => {
    if (!canEdit) {
      message.warning(t('common.noPermission'))
      return
    }
    setState({ editingRecord: record })
    form.setFieldsValue({
      settingCode: record.settingCode,
      settingName: record.settingName,
      settingGroup: record.settingGroup,
      remark: record.remark,
      enabled: asString(record.status) === STATUS.NORMAL,
      numericValue: Number(record.settingValue || 0),
      selectedActions: isHideAuditedListRecordsSetting(record)
        ? resolveHideAuditedStatusValues(record.settingValue)
        : asString(record.settingValue).split(',').filter(Boolean),
    })
    setState({ editorOpen: true })
  }

  const handleToggle = async (record: ModuleRecord) => {
    setState({ toggling: true })
    const nextStatus =
      asString(record.status) === STATUS.NORMAL
        ? STATUS.DISABLED
        : STATUS.NORMAL
    try {
      await saveSystemSetting(
        buildSystemSettingPayload(record, {
          settingValue: record.settingValue || 'ON',
          status: nextStatus,
        }),
      )
      message.success(
        nextStatus === STATUS.NORMAL
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

  const handleSave = async (record: ModuleRecord) => {
    setState({ saving: true })
    try {
      const values = await form.validateFields()
      const isNumeric = isNumericSetting(record)
      const isToggle = !isNumeric
      let settingValue = ''
      if (isNumeric) {
        settingValue = String(values.numericValue || 0)
      } else {
        const selectedActions = Array.isArray(values.selectedActions)
          ? values.selectedActions
          : []
        if (
          isHideAuditedListRecordsSetting(record) &&
          selectedActions.length === HIDE_AUDITED_STATUS_VALUES.length
        ) {
          settingValue = HIDE_AUDITED_STATUS_VALUES.join(',')
        } else {
          settingValue = selectedActions.join(',')
        }
      }
      await saveSystemSetting(
        buildSystemSettingPayload(record, {
          settingCode: values.settingCode,
          settingName: values.settingName,
          settingGroup: values.settingGroup,
          remark: values.remark,
          status: isToggle
            ? values.enabled
              ? STATUS.NORMAL
              : STATUS.DISABLED
            : asString(record.status) || STATUS.NORMAL,
          settingValue: settingValue || 'ON',
        }),
      )
      message.success(t('common.saveSuccess'))
      refresh()
      setState({ editorOpen: false, saving: false })
    } catch (error) {
      showError(error, t('api.saveFailed'))
      setState({ saving: false })
    }
  }

  return (
    <div className="page-stack settings-section-page">
      {isError ? (
        <SystemSettingsLoadError
          retrying={isFetching}
          onRetry={() => void refetch()}
        />
      ) : (
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
      )}

      {editorOpen && editingRecord ? (
        <GeneralSettingsEditorModal
          open={editorOpen}
          record={editingRecord}
          form={form}
          saving={saving}
          onSave={() => {
            void handleSave(editingRecord)
          }}
          onClose={() => setState({ editorOpen: false })}
        />
      ) : null}
    </div>
  )
}
