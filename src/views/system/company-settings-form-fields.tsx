import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { FormListFieldData, TableColumnsType } from 'antd'
import { Button, Col, Empty, Form, Input, Row, Select, Table } from 'antd'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import { createEmptySettlementAccount } from '@/views/system/company-settings-view-utils'

export function SubjectProfileFields() {
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

export function SettlementAccountsTable({
  onChange,
}: {
  onChange: () => void
}) {
  const { t } = useTranslation()
  // remove 来自 Form.List 回调作用域，通过 ref 转发给组件体定义的列 render
  const removeFieldRef = useRef<((name: number) => void) | null>(null)
  const columns: TableColumnsType<FormListFieldData> = [
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
            removeFieldRef.current?.(field.name)
            onChange()
          }}
        />
      ),
    },
  ]
  const {
    columnSizes,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport(
    'company:settlement-accounts',
    undefined,
    columns.length,
  )
  // 操作列固定右侧，不参与列宽拖拽
  const { columns: resizableColumns, components } =
    useColumnResizing<FormListFieldData>({
      columns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
      isResizable: (column) => column.key !== 'action',
    })
  const tableScrollX = sumColumnWidths(
    resizableColumns.map((column) => column.width),
  )

  return (
    <Form.List name="settlementAccounts">
      {(fields, { add, remove }) => {
        removeFieldRef.current = remove
        return (
          <div className="company-settings-bank-section">
            <Table
              size="small"
              bordered
              rowKey="key"
              columns={resizableColumns}
              components={components}
              dataSource={fields}
              pagination={false}
              scroll={{ x: tableScrollX }}
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

export function CompanyRemarkField() {
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
