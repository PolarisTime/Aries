import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Collapse, Empty, Form, Row } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { CompanySettingProfile } from '@/api/system/company-settings'
import { validateForm } from '@/lib/antd-form'
import { message, modal } from '@/utils/antd-app'
import {
  focusFirstInvalidField,
  readAntdFormValidationErrorFields,
} from '@/utils/form-control-a11y'
import {
  CompanyRemarkField,
  SettlementAccountsTable,
  SubjectProfileFields,
} from './company-settings-form-fields'
import {
  buildCompanySettingFormValues,
  type CompanySettingFormValues,
  normalizeSubmittedSettlementAccounts,
} from './company-settings-form-model'
import {
  CompanySettingsPageActions,
  CompanySettingsPageShell,
} from './company-settings-page-shell'
import { createEmptySettlementAccount } from './company-settings-view-utils'
import { CompanySubjectList } from './company-subject-list'
import { useCompanySettingsMutations } from './use-company-settings-mutations'

interface CompanySettingsFormProps {
  companies: CompanySettingProfile[]
  isFetching: boolean
  selectedId: string
  onRefresh: () => void
  onSelect: (id: string) => void
  onSelectSaved: (id: string) => void
  onCreateDraft: () => void
}

export function CompanySettingsForm({
  companies,
  isFetching,
  selectedId,
  onRefresh,
  onSelect,
  onSelectSaved,
  onCreateDraft,
}: CompanySettingsFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<CompanySettingFormValues>()
  const isDirtyRef = useRef(false)
  const markDirty = () => {
    isDirtyRef.current = true
  }
  const clearDirty = () => {
    isDirtyRef.current = false
  }
  const selectedProfile = useMemo(
    () => companies.find((item) => item.id === selectedId) ?? null,
    [companies, selectedId],
  )
  const isDraft = selectedId === 'new'
  const initialValues = useMemo(
    () => buildCompanySettingFormValues(selectedProfile),
    [selectedProfile],
  )

  useEffect(() => {
    if (isDirtyRef.current) return
    form.resetFields()
    form.setFieldsValue(initialValues)
  }, [form, initialValues])

  const { saveMutation, deleteMutation } = useCompanySettingsMutations({
    companies,
    isDraft,
    selectedId,
    onSelectSaved,
    clearDirty,
  })

  const handleAddSettlementAccount = () => {
    const current = form.getFieldValue('settlementAccounts')
    form.setFieldValue('settlementAccounts', [
      ...(Array.isArray(current) ? current : []),
      createEmptySettlementAccount(),
    ])
    markDirty()
  }

  const handleSave = async () => {
    try {
      const values = await validateForm<CompanySettingFormValues>(form)
      const settlementAccounts = normalizeSubmittedSettlementAccounts(
        values.settlementAccounts || [],
      )
      const usedBankAccounts = new Set<string>()
      for (const account of settlementAccounts) {
        const bankAccount = account.bankAccount.trim()
        if (!bankAccount) {
          continue
        }
        if (usedBankAccounts.has(bankAccount)) {
          message.warning(
            t('system.company.duplicateBankAccount', { account: bankAccount }),
          )
          return
        }
        usedBankAccounts.add(bankAccount)
      }
      saveMutation.mutate(values)
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(form, errorFields)
      }
    }
  }

  const confirmDiscardChanges = (onConfirm: () => void) => {
    if (!isDirtyRef.current) {
      onConfirm()
      return
    }
    modal.confirm({
      title: t('common.unsavedChangesTitle'),
      content: t('common.unsavedChangesContent'),
      okText: t('common.discardChanges'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        clearDirty()
        onConfirm()
      },
    })
  }

  const handleSelect = (id: string) => {
    if (id === selectedId) return
    confirmDiscardChanges(() => onSelect(id))
  }

  const handleCreateDraft = () => {
    if (isDraft) return
    confirmDiscardChanges(onCreateDraft)
  }

  const handleDelete = (id: string) => {
    const deletesCurrentDirtyDraft = id === selectedId && isDirtyRef.current
    modal.confirm({
      title: t('system.company.deleteSubject'),
      content: deletesCurrentDirtyDraft
        ? t('system.company.deleteSubjectDirtyConfirm')
        : t('system.company.deleteSubjectConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMutation.mutateAsync(id)
      },
    })
  }

  const handleRefresh = () => {
    confirmDiscardChanges(() => {
      form.resetFields()
      form.setFieldsValue(initialValues)
      onRefresh()
    })
  }

  const collapseItems = [
    {
      key: 'profile',
      label: t('system.companySubject.sectionTitle'),
      children: <SubjectProfileFields />,
    },
    {
      key: 'banks',
      label: t('system.company.settlementBanks'),
      extra: (
        <Button
          type="link"
          size="small"
          icon={<PlusOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            handleAddSettlementAccount()
          }}
        >
          {t('system.company.addBank')}
        </Button>
      ),
      children: <SettlementAccountsTable onChange={markDirty} />,
    },
    {
      key: 'remark',
      label: t('system.company.supplementNote'),
      children: <CompanyRemarkField />,
    },
  ]

  return (
    <CompanySettingsPageShell
      extra={
        <CompanySettingsPageActions
          canSave={Boolean(selectedId)}
          loading={isFetching}
          saving={saveMutation.isPending}
          onRefresh={handleRefresh}
          onSave={() => {
            void handleSave()
          }}
        />
      }
    >
      <div className="company-settings-page">
        <Row gutter={[12, 12]} align="top">
          <Col span={6}>
            <CompanySubjectList
              companies={companies}
              selectedId={selectedId}
              deletingId={
                deleteMutation.isPending
                  ? String(deleteMutation.variables ?? '')
                  : null
              }
              onCreate={handleCreateDraft}
              onDelete={handleDelete}
              onSelect={handleSelect}
            />
          </Col>
          <Col span={18}>
            {selectedId ? (
              <Form
                key={selectedId}
                form={form}
                layout="vertical"
                initialValues={initialValues}
                onValuesChange={markDirty}
              >
                <Card className="company-settings-editor-card" size="small">
                  <Collapse
                    defaultActiveKey={['profile', 'banks', 'remark']}
                    size="small"
                    items={collapseItems}
                  />
                </Card>
              </Form>
            ) : (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('system.company.noSubjects')}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateDraft}
                  >
                    {t('system.company.addSubject')}
                  </Button>
                </Empty>
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </CompanySettingsPageShell>
  )
}
