import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  createCompanySetting,
  deleteCompanySetting,
  listCompanySettings,
  updateCompanySetting,
} from '@/api/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { useRequestError } from '@/hooks/useRequestError'
import { validateForm } from '@/lib/antd-form'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { CompanySettingsHeader } from '@/views/system/CompanySettingsHeader'
import { CompanySettlementAccountsCard } from '@/views/system/CompanySettlementAccountsCard'
import { CompanySubjectCard } from '@/views/system/CompanySubjectCard'
import {
  normalizeSettlementAccounts,
  type SettlementAccountFormRow,
} from '@/views/system/company-settings-view-utils'

type CompanySettingFormValues = {
  id?: string
  companyName: string
  taxNo: string
  status: string
  remark?: string
  settlementAccounts: SettlementAccountFormRow[]
  [key: string]: unknown
}

function buildCompanySettingFormValues(
  profile: CompanySettingProfile | null,
): CompanySettingFormValues {
  return {
    id: profile?.id,
    companyName: profile?.companyName ?? '',
    taxNo: profile?.taxNo ?? '',
    status: profile?.status || STATUS.NORMAL,
    remark: profile?.remark || '',
    settlementAccounts: normalizeSettlementAccounts(
      profile?.settlementAccounts,
    ),
  }
}

function buildPayload(values: CompanySettingFormValues) {
  const settlementAccounts = values.settlementAccounts || []
  return {
    companyName: values.companyName.trim(),
    taxNo: values.taxNo.trim(),
    settlementAccounts: settlementAccounts.map((account) => ({
      id:
        account.id == null || account.id === ''
          ? undefined
          : String(account.id),
      accountName: account.accountName.trim(),
      bankName: account.bankName.trim(),
      bankAccount: account.bankAccount.trim(),
      usageType: account.usageType || SETTLEMENT_TYPE.GENERAL,
      status: account.status || STATUS.NORMAL,
      remark: account.remark?.trim() || '',
    })),
    status: values.status || STATUS.NORMAL,
    remark: values.remark?.trim() || '',
  }
}

interface CompanySubjectListProps {
  companies: CompanySettingProfile[]
  selectedId: string
  canCreate: boolean
  canDelete: boolean
  deletingId: string | null
  onCreate: () => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

function CompanySubjectList({
  companies,
  selectedId,
  canCreate,
  canDelete,
  deletingId,
  onCreate,
  onDelete,
  onSelect,
}: CompanySubjectListProps) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      title={t('system.company.subjectList')}
      extra={
        canCreate ? (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {t('system.company.addSubject')}
          </Button>
        ) : null
      }
    >
      <List
        size="small"
        dataSource={companies}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('system.company.noSubjects')}
            />
          ),
        }}
        renderItem={(item) => {
          const active = item.id === selectedId
          const actions = canDelete
            ? [
                <Popconfirm
                  key="delete"
                  title={t('system.company.deleteSubject')}
                  description={t('system.company.deleteSubjectConfirm')}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                  onConfirm={() => onDelete(item.id)}
                >
                  <Button
                    danger
                    type="text"
                    size="small"
                    loading={deletingId === item.id}
                    icon={<DeleteOutlined />}
                    onClick={(event) => event.stopPropagation()}
                  />
                </Popconfirm>,
              ]
            : []
          return (
            <List.Item
              className="rounded cursor-pointer px-8"
              style={
                active ? { background: 'var(--theme-primary-soft)' } : undefined
              }
              actions={actions}
              onClick={() => onSelect(item.id)}
            >
              <List.Item.Meta
                title={
                  <Space size={8}>
                    <Typography.Text strong={active}>
                      {item.companyName ||
                        t('system.companySubject.pendingCompany')}
                    </Typography.Text>
                    <Tag
                      color={
                        item.status === STATUS.NORMAL ? 'processing' : 'default'
                      }
                    >
                      {item.status || STATUS.NORMAL}
                    </Tag>
                  </Space>
                }
                description={
                  item.taxNo || t('system.companySubject.pendingTaxNo')
                }
              />
            </List.Item>
          )
        }}
      />
    </Card>
  )
}

interface CompanySettingsFormProps {
  canView: boolean
  canCreate: boolean
  canSave: boolean
  canDelete: boolean
  companies: CompanySettingProfile[]
  isLoading: boolean
  selectedId: string
  onRefresh: () => void
  onSelect: (id: string) => void
  onSelectSaved: (id: string) => void
  onCreateDraft: () => void
}

function CompanySettingsForm({
  canView,
  canCreate,
  canSave,
  canDelete,
  companies,
  isLoading,
  selectedId,
  onRefresh,
  onSelect,
  onSelectSaved,
  onCreateDraft,
}: CompanySettingsFormProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const [form] = Form.useForm<CompanySettingFormValues>()
  const selectedProfile = useMemo(
    () => companies.find((item) => item.id === selectedId) ?? null,
    [companies, selectedId],
  )
  const isDraft = selectedId === 'new'
  const canEditCurrent = isDraft ? canCreate : canSave
  const initialValues = buildCompanySettingFormValues(selectedProfile)
  const statusValue = Form.useWatch('status', form)
  const watchedSettlementAccounts = Form.useWatch('settlementAccounts', form)
  const settlementAccountCount = Array.isArray(watchedSettlementAccounts)
    ? watchedSettlementAccounts.length
    : initialValues.settlementAccounts.length
  const activeCount = companies.filter(
    (item) => item.status === STATUS.NORMAL,
  ).length

  useEffect(() => {
    form.setFieldsValue(buildCompanySettingFormValues(selectedProfile))
  }, [form, selectedProfile])

  const invalidateCompanyQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.companySettings,
    })
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.companySetting,
    })
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    })
  }

  const saveMutation = useMutation({
    mutationFn: async (values: CompanySettingFormValues) => {
      const payload = buildPayload(values)
      return isDraft
        ? createCompanySetting(payload)
        : updateCompanySetting(selectedId, payload)
    },
    onSuccess: (data) => {
      message.success(t('common.saveSuccess'))
      invalidateCompanyQueries()
      if (data?.id) {
        onSelectSaved(data.id)
      }
    },
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCompanySetting,
    onSuccess: (_, deletedId) => {
      message.success(t('common.deleteSuccess'))
      invalidateCompanyQueries()
      if (selectedId === deletedId) {
        const next = companies.find((item) => item.id !== deletedId)
        onSelectSaved(next?.id ?? '')
      }
    },
    onError: (err: Error) => showError(err, t('common.deleteConfirm')),
  })

  const handleSave = async () => {
    if (!canEditCurrent) {
      message.warning(t('common.noPermission'))
      return
    }

    try {
      const values = await validateForm<CompanySettingFormValues>(form)
      const settlementAccounts = values.settlementAccounts || []
      const usedBankAccounts = new Set<string>()
      for (const account of settlementAccounts) {
        const bankAccount = account.bankAccount.trim()
        if (usedBankAccounts.has(bankAccount)) {
          message.warning(
            t('system.company.duplicateBankAccount', { account: bankAccount }),
          )
          return
        }
        usedBankAccounts.add(bankAccount)
      }
      saveMutation.mutate(values)
    } catch {
      /* validation failed */
    }
  }

  const overviewItems = [
    {
      label: t('system.company.enterpriseMode'),
      value: t('system.company.countUnit', { count: companies.length }),
    },
    {
      label: t('system.company.activeSubjects'),
      value: t('system.company.countUnit', { count: activeCount }),
    },
    {
      label: t('system.company.subjectStatus'),
      value: asString(statusValue ?? initialValues.status) || '--',
    },
    {
      label: t('system.company.settlementBanks'),
      value: t('system.company.countUnit', {
        count: settlementAccountCount,
      }),
    },
  ]

  return (
    <div className="page-stack">
      <CompanySettingsHeader
        loading={isLoading}
        canSave={canEditCurrent}
        saving={saveMutation.isPending}
        overviewItems={overviewItems}
        onRefresh={onRefresh}
        onSave={() => {
          void handleSave()
        }}
      />

      <Alert
        type="info"
        showIcon
        title={t('system.company.title')}
        description={t('system.company.lockedByOobe')}
      />
      {!canView && (
        <Alert
          type="warning"
          showIcon
          title={t('common.noPermission')}
          description={t('system.company.noViewPermission')}
        />
      )}
      {isLoading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : (
        <Row gutter={[16, 16]} align="top">
          <Col xs={24} lg={7} xl={6}>
            <CompanySubjectList
              companies={companies}
              selectedId={selectedId}
              canCreate={canCreate}
              canDelete={canDelete}
              deletingId={
                deleteMutation.isPending
                  ? String(deleteMutation.variables ?? '')
                  : null
              }
              onCreate={onCreateDraft}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSelect={onSelect}
            />
          </Col>
          <Col xs={24} lg={17} xl={18}>
            {selectedId ? (
              <Form form={form} layout="vertical" initialValues={initialValues}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={8}>
                    <CompanySubjectCard canSave={canEditCurrent} />
                  </Col>
                  <Col xs={24} lg={16}>
                    <CompanySettlementAccountsCard canSave={canEditCurrent} />
                  </Col>
                </Row>
                <Card
                  size="small"
                  className="mt-16"
                  title={t('system.company.supplementNote')}
                  extra={
                    canEditCurrent ? (
                      <Button
                        type="primary"
                        size="small"
                        loading={saveMutation.isPending}
                        icon={<SaveOutlined />}
                        onClick={() => {
                          void handleSave()
                        }}
                      >
                        {t('common.save')}
                      </Button>
                    ) : null
                  }
                >
                  <Form.Item name="remark" label={t('common.remark')}>
                    <Input.TextArea
                      disabled={!canEditCurrent}
                      rows={4}
                      placeholder={t('system.company.subjectRemarkPlaceholder')}
                    />
                  </Form.Item>
                </Card>
              </Form>
            ) : (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('system.company.noSubjects')}
                >
                  {canCreate ? (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={onCreateDraft}
                    >
                      {t('system.company.addSubject')}
                    </Button>
                  ) : null}
                </Empty>
              </Card>
            )}
          </Col>
        </Row>
      )}
    </div>
  )
}

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const permissionStore = usePermissionStore()
  const canView = permissionStore.can('company-setting', 'read')
  const canCreate = permissionStore.can('company-setting', 'create')
  const canSave = permissionStore.can('company-setting', 'update')
  const canDelete = permissionStore.can('company-setting', 'delete')
  const [selectedId, setSelectedId] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.companySettings,
    queryFn: listCompanySettings,
    enabled: canView,
  })

  useEffect(() => {
    if (!canView) {
      setSelectedId('')
      return
    }
    if (selectedId === 'new') {
      return
    }
    if (companies.some((item) => item.id === selectedId)) {
      return
    }
    setSelectedId(companies[0]?.id ?? '')
  }, [canView, companies, selectedId])

  return (
    <CompanySettingsForm
      canView={canView}
      canCreate={canCreate}
      canSave={canSave}
      canDelete={canDelete}
      companies={companies}
      isLoading={isLoading}
      selectedId={selectedId}
      onRefresh={() => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.companySettings,
        })
      }}
      onSelect={setSelectedId}
      onSelectSaved={setSelectedId}
      onCreateDraft={() => setSelectedId('new')}
    />
  )
}
