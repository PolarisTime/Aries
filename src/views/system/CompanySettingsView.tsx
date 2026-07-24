import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Form,
  Input,
  List,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  createCompanySetting,
  deleteCompanySetting,
  listCompanySettings,
  updateCompanySetting,
} from '@/api/company-settings'
import { AppProPage } from '@/components/AppProPage'
import { AppResult } from '@/components/AppResult'
import { QUERY_KEYS } from '@/constants/query-keys'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { useRequestError } from '@/hooks/useRequestError'
import { validateForm } from '@/lib/antd-form'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import {
  createEmptySettlementAccount,
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

const EMPTY_COMPANY_SETTINGS: CompanySettingProfile[] = []

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

function normalizeSubmittedSettlementAccounts(
  accounts: SettlementAccountFormRow[],
) {
  const normalizedAccounts = []
  for (const account of accounts) {
    const accountName = asString(account.accountName).trim()
    const bankName = asString(account.bankName).trim()
    const bankAccount = asString(account.bankAccount).trim()
    const remark = asString(account.remark).trim()
    if (!accountName && !bankName && !bankAccount && !remark) {
      continue
    }
    normalizedAccounts.push({
      id:
        account.id == null || account.id === ''
          ? undefined
          : String(account.id),
      accountName,
      bankName,
      bankAccount,
      usageType: asString(account.usageType).trim() || SETTLEMENT_TYPE.GENERAL,
      status: asString(account.status).trim() || STATUS.NORMAL,
      remark,
    })
  }
  return normalizedAccounts
}

function buildPayload(values: CompanySettingFormValues) {
  const settlementAccounts = normalizeSubmittedSettlementAccounts(
    values.settlementAccounts || [],
  )
  return {
    companyName: values.companyName.trim(),
    taxNo: values.taxNo.trim(),
    settlementAccounts,
    status: values.status || STATUS.NORMAL,
    remark: values.remark?.trim() || '',
  }
}

interface CompanySettingsPageActionsProps {
  canSave: boolean
  loading: boolean
  saving: boolean
  onRefresh: () => void
  onSave: () => void
}

function CompanySettingsPageActions({
  canSave,
  loading,
  saving,
  onRefresh,
  onSave,
}: CompanySettingsPageActionsProps) {
  const { t } = useTranslation()
  return (
    <Space size={8} wrap>
      <Button loading={loading} icon={<ReloadOutlined />} onClick={onRefresh}>
        {t('common.refresh')}
      </Button>
      {canSave ? (
        <Button
          type="primary"
          loading={saving}
          icon={<SaveOutlined />}
          onClick={onSave}
        >
          {t('common.save')}
        </Button>
      ) : null}
    </Space>
  )
}

interface CompanySettingsPageShellProps {
  children: React.ReactNode
  extra?: React.ReactNode
}

function CompanySettingsPageShell({
  children,
  extra,
}: CompanySettingsPageShellProps) {
  const { t } = useTranslation()
  return (
    <AppProPage
      title={t('system.companyHeader.title')}
      description={t('system.companyHeader.description')}
      extra={extra}
    >
      <div className="settings-standard-page">{children}</div>
    </AppProPage>
  )
}

interface CompanySubjectListProps {
  companies: CompanySettingProfile[]
  selectedId: string
  deletingId: string | null
  onCreate: () => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

function CompanySubjectList({
  companies,
  selectedId,
  deletingId,
  onCreate,
  onDelete,
  onSelect,
}: CompanySubjectListProps) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      className="company-subject-selector-card"
      title={t('system.company.subjectList')}
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={onCreate}>
          {t('system.company.addSubject')}
        </Button>
      }
    >
      {companies.length > 0 ? (
        <List
          className="company-subject-selector-list"
          dataSource={companies}
          rowKey={(item) => item.id}
          split={false}
          renderItem={(item) => {
            const active = item.id === selectedId
            return (
              <List.Item
                className={`company-subject-selector-item${active ? ' is-active' : ''}`}
                key={item.id}
                actions={[
                  <Button
                    key="delete"
                    danger
                    type="text"
                    size="small"
                    loading={deletingId === item.id}
                    icon={<DeleteOutlined />}
                    aria-label={t('system.company.deleteSubject')}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(item.id)
                    }}
                  />,
                ]}
              >
                <button
                  type="button"
                  className="company-subject-selector-main"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <Space size={8} wrap>
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
                  <Typography.Text type="secondary">
                    {item.taxNo || t('system.companySubject.pendingTaxNo')}
                  </Typography.Text>
                </button>
              </List.Item>
            )
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('system.company.noSubjects')}
        />
      )}
    </Card>
  )
}

function SubjectProfileFields() {
  const { t } = useTranslation()
  return (
    <Row gutter={[16, 0]}>
      <Col span={12}>
        <Form.Item
          name="companyName"
          label={t('system.companySubject.companyName')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('system.companySubject.companyNamePlaceholder'),
            },
          ]}
        >
          <Input
            allowClear
            placeholder={t('system.companySubject.companyNamePlaceholder')}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="taxNo"
          label={t('system.companySubject.taxNo')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('system.companySubject.taxNoPlaceholder'),
            },
          ]}
        >
          <Input
            allowClear
            placeholder={t('system.companySubject.taxNoPlaceholder')}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="status"
          label={t('system.companySubject.status')}
          rules={[
            {
              required: true,
              message: t('system.companySubject.status'),
            },
          ]}
        >
          <Select
            options={[
              {
                label: t('system.companySubject.statusNormal'),
                value: STATUS.NORMAL,
              },
              {
                label: t('system.companySubject.statusDisabled'),
                value: STATUS.DISABLED,
              },
            ]}
          />
        </Form.Item>
      </Col>
    </Row>
  )
}

function SettlementAccountsTable({ onChange }: { onChange: () => void }) {
  const { t } = useTranslation()
  return (
    <Form.List name="settlementAccounts">
      {(fields, { add, remove }) => {
        const columns: TableColumnsType<(typeof fields)[number]> = [
          {
            title: t('system.company.accountName'),
            dataIndex: 'accountName',
            width: 150,
            render: (_, field) => (
              <>
                <Form.Item name={[field.name, 'id']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, 'accountName']}
                  className="company-settings-table-form-item"
                >
                  <Input
                    allowClear
                    placeholder={t('system.company.accountNamePlaceholder')}
                  />
                </Form.Item>
              </>
            ),
          },
          {
            title: t('system.company.usageType'),
            dataIndex: 'usageType',
            width: 110,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'usageType']}
                className="company-settings-table-form-item"
              >
                <Select
                  options={[
                    {
                      label: t('system.company.usageGeneral'),
                      value: SETTLEMENT_TYPE.GENERAL,
                    },
                    {
                      label: t('system.company.usageReceive'),
                      value: SETTLEMENT_TYPE.RECEIPT,
                    },
                    {
                      label: t('system.company.usagePay'),
                      value: SETTLEMENT_TYPE.PAYMENT,
                    },
                  ]}
                />
              </Form.Item>
            ),
          },
          {
            title: t('system.company.bankName'),
            dataIndex: 'bankName',
            width: 180,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'bankName']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  placeholder={t('system.company.bankNamePlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('system.company.bankAccount'),
            dataIndex: 'bankAccount',
            width: 190,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'bankAccount']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  placeholder={t('system.company.bankAccountPlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.status'),
            dataIndex: 'status',
            width: 100,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'status']}
                className="company-settings-table-form-item"
              >
                <Select
                  options={[
                    {
                      label: t('system.company.statusNormal'),
                      value: STATUS.NORMAL,
                    },
                    {
                      label: t('system.company.statusDisabled'),
                      value: STATUS.DISABLED,
                    },
                  ]}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.remark'),
            dataIndex: 'remark',
            width: 180,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'remark']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  placeholder={t('system.company.remarkPlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.operation'),
            key: 'action',
            width: 72,
            align: 'center',
            fixed: 'right',
            render: (_, field) => (
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                aria-label={t('common.delete')}
                onClick={() => {
                  remove(field.name)
                  onChange()
                }}
              />
            ),
          },
        ]

        return (
          <div className="company-settings-bank-section">
            <Table
              size="small"
              bordered
              rowKey="key"
              columns={columns}
              dataSource={fields}
              pagination={false}
              scroll={{ x: 980 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('system.company.noSettlementAccounts')}
                  >
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        add(createEmptySettlementAccount())
                        onChange()
                      }}
                    >
                      {t('system.company.addBank')}
                    </Button>
                  </Empty>
                ),
              }}
            />
          </div>
        )
      }}
    </Form.List>
  )
}

function CompanyRemarkField() {
  const { t } = useTranslation()
  return (
    <Form.Item name="remark" className="mb-0">
      <Input.TextArea
        allowClear
        rows={5}
        placeholder={t('system.company.subjectRemarkPlaceholder')}
      />
    </Form.Item>
  )
}

interface CompanySettingsFormProps {
  companies: CompanySettingProfile[]
  isFetching: boolean
  selectedId: string
  onRefresh: () => void
  onSelect: (id: string) => void
  onSelectSaved: (id: string) => void
  onCreateDraft: () => void
}

function CompanySettingsForm({
  companies,
  isFetching,
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

  const handleAddSettlementAccount = () => {
    const current = form.getFieldValue('settlementAccounts')
    form.setFieldValue('settlementAccounts', [
      ...(Array.isArray(current) ? current : []),
      createEmptySettlementAccount(),
    ])
    markDirty()
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
      clearDirty()
      if (data) {
        queryClient.setQueryData<CompanySettingProfile[]>(
          QUERY_KEYS.companySettings,
          (current = []) => {
            const exists = current.some((item) => item.id === data.id)
            return exists
              ? current.map((item) => (item.id === data.id ? data : item))
              : [...current, data]
          },
        )
      }
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
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
      const remainingCompanies = companies.filter(
        (item) => item.id !== deletedId,
      )
      queryClient.setQueryData<CompanySettingProfile[]>(
        QUERY_KEYS.companySettings,
        remainingCompanies,
      )
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      if (selectedId === deletedId) {
        clearDirty()
        const next = remainingCompanies[0]
        onSelectSaved(next?.id ?? '')
      }
    },
    onError: (err: Error) => showError(err, t('api.deleteFailed')),
  })

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
    } catch {
      /* validation failed */
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

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState('')

  const companyQuery = useQuery({
    queryKey: QUERY_KEYS.companySettings,
    queryFn: listCompanySettings,
  })
  const companies = companyQuery.data ?? EMPTY_COMPANY_SETTINGS

  const effectiveSelectedId = useMemo(() => {
    if (selectedId === 'new') {
      return selectedId
    }
    if (companies.some((item) => item.id === selectedId)) {
      return selectedId
    }
    return companies[0]?.id ?? ''
  }, [companies, selectedId])

  if (companyQuery.isPending) {
    return (
      <CompanySettingsPageShell>
        <Skeleton active paragraph={{ rows: 10 }} />
      </CompanySettingsPageShell>
    )
  }

  if (companyQuery.isError) {
    return (
      <CompanySettingsPageShell>
        <AppResult
          status="error"
          title={t('system.company.loadFailed')}
          subTitle={t('result.error.subTitle')}
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={companyQuery.isFetching}
              onClick={() => {
                void companyQuery.refetch()
              }}
            >
              {t('error.retry')}
            </Button>
          }
        />
      </CompanySettingsPageShell>
    )
  }

  return (
    <CompanySettingsForm
      companies={companies}
      isFetching={companyQuery.isFetching}
      selectedId={effectiveSelectedId}
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
