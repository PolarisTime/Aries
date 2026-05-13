import { useQuery, useQueryClient } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useCallback, useMemo, useState } from 'react'
import {
  listSystemSettings,
  saveSystemSetting,
  updateSystemUploadRule,
} from '@/api/system-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { NumberRulesEditorModal } from '@/views/system/NumberRulesEditorModal'
import { NumberRulesTableCard } from '@/views/system/NumberRulesTableCard'
import {
  isNumberRule,
  isUploadRule,
  matchesNumberRuleKeyword,
  type NumberRuleEditorKind,
} from '@/views/system/number-rules-view-utils'

export function NumberRulesView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('general-setting', 'update')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorKind, setEditorKind] =
    useState<NumberRuleEditorKind>('number-rule')
  const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: ['number-rules'],
    queryFn: () => listSystemSettings(),
  })

  const filteredRows = useMemo(
    () =>
      rows.filter((record) => {
        if (statusFilter && String(record.status || '') !== statusFilter) {
          return false
        }
        return matchesNumberRuleKeyword(record, keyword)
      }),
    [rows, keyword, statusFilter],
  )

  const numberRuleRows = useMemo(
    () => filteredRows.filter(isNumberRule),
    [filteredRows],
  )
  const uploadRuleRows = useMemo(
    () => filteredRows.filter(isUploadRule),
    [filteredRows],
  )

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['number-rules'] })
  }, [queryClient])

  const openNumberRuleEditor = useCallback(
    (record: ModuleRecord) => {
      if (!canEdit) {
        message.warning('暂无编辑权限')
        return
      }
      setEditingRecord(record)
      setEditorKind('number-rule')
      form.setFieldsValue({
        settingCode: record.settingCode,
        settingName: record.settingName,
        billName: record.billName,
        prefix: record.prefix || '',
        dateRule: record.dateRule || 'yyyy',
        serialLength: record.serialLength || 6,
        resetRule: record.resetRule || 'YEARLY',
        status: record.status || '正常',
        remark: record.remark || '',
      })
      setEditorOpen(true)
    },
    [canEdit, form],
  )

  const openUploadRuleEditor = useCallback(
    (record: ModuleRecord) => {
      if (!canEdit) {
        message.warning('暂无编辑权限')
        return
      }
      setEditingRecord(record)
      setEditorKind('upload-rule')
      form.setFieldsValue({
        moduleKey: record.moduleKey,
        moduleName: record.moduleName || record.billName,
        ruleCode: record.ruleCode || record.settingCode,
        ruleName: record.ruleName || record.settingName,
        renamePattern: record.renamePattern || record.prefix || '',
        status: record.status || '正常',
        remark: record.remark || '',
      })
      setEditorOpen(true)
    },
    [canEdit, form],
  )

  const handleSave = useCallback(async () => {
    if (!editingRecord) return
    setSaving(true)
    try {
      const values = await form.validateFields()
      if (editorKind === 'number-rule') {
        await saveSystemSetting({
          id: editingRecord.id,
          settingCode: values.settingCode,
          settingName: values.settingName,
          billName: values.billName,
          prefix: values.prefix,
          dateRule: values.dateRule,
          serialLength: values.serialLength,
          resetRule: values.resetRule,
          status: values.status,
          remark: values.remark,
        })
      } else {
        await updateSystemUploadRule({
          renamePattern: values.renamePattern,
          status: values.status,
          remark: values.remark,
        })
      }
      message.success('保存成功')
      refresh()
      setEditorOpen(false)
    } catch (error) {
      showError(error, '保存失败')
    } finally {
      setSaving(false)
    }
  }, [editingRecord, editorKind, form, refresh, showError])

  return (
    <div className="page-stack">
      <NumberRulesTableCard
        keyword={keyword}
        statusFilter={statusFilter}
        rows={rows}
        numberRuleRows={numberRuleRows}
        uploadRuleRows={uploadRuleRows}
        loading={isLoading}
        canEdit={canEdit}
        onKeywordChange={setKeyword}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refresh}
        onEditNumberRule={openNumberRuleEditor}
        onEditUploadRule={openUploadRuleEditor}
      />

      {editorOpen ? (
        <NumberRulesEditorModal
          open={editorOpen}
          kind={editorKind}
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
