import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listSystemSettings,
  saveSystemSetting,
  updateSystemUploadRule,
} from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STATUS } from '@/constants/status-constants'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { NumberRulesEditorModal } from '@/views/system/NumberRulesEditorModal'
import { NumberRulesTableCard } from '@/views/system/NumberRulesTableCard'
import {
  isNumberRule,
  isUploadRule,
  matchesNumberRuleKeyword,
  type NumberRuleEditorKind,
} from '@/views/system/number-rules-view-utils'

interface NumberRulesState {
  keyword: string
  statusFilter: string | undefined
  editorOpen: boolean
  editorKind: NumberRuleEditorKind
  saving: boolean
}

const numberRulesInitialState: NumberRulesState = {
  keyword: '',
  statusFilter: undefined,
  editorOpen: false,
  editorKind: 'number-rule',
  saving: false,
}

export function NumberRulesView() {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('general-setting', 'update')

  const [state, setState] = useReducer(
    (prev: NumberRulesState, patch: Partial<NumberRulesState>) => ({
      ...prev,
      ...patch,
    }),
    numberRulesInitialState,
  )
  const { keyword, statusFilter, editorOpen, editorKind, saving } = state
  const editingRecord = useRef<ModuleRecord | null>(null)
  const [form] = Form.useForm()

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: QUERY_KEYS.numberRules,
    queryFn: () => listSystemSettings(),
  })

  const filteredRows = rows.filter((record) => {
    if (statusFilter && asString(record.status) !== statusFilter) {
      return false
    }
    return matchesNumberRuleKeyword(record, keyword)
  })

  const numberRuleRows = filteredRows.filter(isNumberRule)
  const uploadRuleRows = filteredRows.filter(isUploadRule)

  const refresh = useRefreshQuery(QUERY_KEYS.numberRules)

  const openNumberRuleEditor = (record: ModuleRecord) => {
    if (!canEdit) {
      message.warning(t('system.numberRules.noEditPermission'))
      return
    }
    editingRecord.current = record
    setState({ editorKind: 'number-rule' })
    form.setFieldsValue({
      settingCode: record.settingCode,
      settingName: record.settingName,
      billName: record.billName,
      prefix: record.prefix || '',
      dateRule: record.dateRule || 'yyyy',
      serialLength: record.serialLength || 6,
      resetRule: record.resetRule || 'YEARLY',
      status: record.status || STATUS.NORMAL,
      remark: record.remark || '',
    })
    setState({ editorOpen: true })
  }

  const openUploadRuleEditor = (record: ModuleRecord) => {
    if (!canEdit) {
      message.warning(t('system.numberRules.noEditPermission'))
      return
    }
    editingRecord.current = record
    setState({ editorKind: 'upload-rule' })
    form.setFieldsValue({
      moduleKey: record.moduleKey,
      moduleName: record.moduleName || record.billName,
      ruleCode: record.ruleCode || record.settingCode,
      ruleName: record.ruleName || record.settingName,
      renamePattern: record.renamePattern || record.prefix || '',
      status: record.status || STATUS.NORMAL,
      remark: record.remark || '',
    })
    setState({ editorOpen: true })
  }

  const handleSave = async () => {
    if (!editingRecord.current) return
    setState({ saving: true })
    try {
      const values = await form.validateFields()
      if (editorKind === 'number-rule') {
        await saveSystemSetting({
          id: editingRecord.current.id,
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
      message.success(t('common.saveSuccess'))
      refresh()
      setState({ editorOpen: false, saving: false })
    } catch (error) {
      showError(error, t('system.numberRules.saveFailed'))
      setState({ saving: false })
    }
  }

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
        onKeywordChange={(value) => setState({ keyword: value })}
        onStatusFilterChange={(value) => setState({ statusFilter: value })}
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
          onClose={() => setState({ editorOpen: false })}
        />
      ) : null}
    </div>
  )
}
