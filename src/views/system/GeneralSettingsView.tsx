import { useQuery } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useState } from 'react'
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

export function GeneralSettingsView() {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('general-setting', 'update')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
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
    setEditingRecord(record)
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
    setEditorOpen(true)
  }

  const handleToggle = async (record: ModuleRecord) => {
    setToggling(true)
    const nextStatus = asString(record.status) === '正常' ? '禁用' : '正常'
    try {
      await saveSystemSetting({
        id: record.id,
        settingCode: record.settingCode,
        settingName: record.settingName,
        billName: record.billName,
        prefix: 'SYS',
        dateRule: 'NONE',
        serialLength: 6,
        resetRule: 'NEVER',
        sampleNo: record.sampleNo || 'ON',
        status: nextStatus,
        remark: record.remark,
      })
      message.success(
        nextStatus === '正常'
          ? t('system.generalSettings.enabled')
          : t('system.generalSettings.closed'),
      )
      refresh()
      setToggling(false)
    } catch (error) {
      showError(error, t('table.operationFailed'))
      setToggling(false)
    }
  }

  const handleSave = async () => {
    if (!editingRecord) return
    setSaving(true)
    try {
      const values = await form.validateFields()
      let sampleNo = ''
      if (isWatermarkContentSetting(editingRecord)) {
        sampleNo = String(values.numericValue || 'ON')
      } else if (isNumericSetting(editingRecord)) {
        sampleNo = String(values.numericValue || 0)
      } else if (isToggleSetting(editingRecord)) {
        sampleNo = values.selectedActions?.join(',') || ''
      }
      await saveSystemSetting({
        id: editingRecord.id,
        settingCode: values.settingCode,
        settingName: values.settingName,
        billName: values.billName,
        prefix: 'SYS',
        dateRule: 'NONE',
        serialLength: 6,
        resetRule: 'NEVER',
        remark: values.remark,
        status: values.enabled ? '正常' : '禁用',
        sampleNo: sampleNo || 'ON',
      })
      message.success(t('common.saveSuccess'))
      refresh()
      setEditorOpen(false)
      setSaving(false)
    } catch (error) {
      showError(error, t('api.saveFailed'))
      setSaving(false)
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
        onKeywordChange={setKeyword}
        onStatusFilterChange={setStatusFilter}
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
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  )
}
