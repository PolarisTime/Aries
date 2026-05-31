import { BankOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import type { SettlementAccountFormRow } from '@/views/system/company-settings-view-utils'

interface Props {
  canSave: boolean
  settlementAccounts: SettlementAccountFormRow[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (
    index: number,
    field: keyof SettlementAccountFormRow,
    value: string,
  ) => void
}

export function CompanySettlementAccountsCard({
  canSave,
  settlementAccounts,
  onAdd,
  onRemove,
  onUpdate,
}: Props) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      className="bg-secondary rounded-lg"
      title={
        <div className="flex flex-wrap items-center justify-between gap-8">
          <span>
            <BankOutlined /> {t('system.company.settlementInfo')}
          </span>
          {canSave && (
            <Button
              type="default"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAdd}
            >
              {t('system.company.addBank')}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-12">
        {settlementAccounts.map((account, index) => (
          <div
            key={account.localKey}
            className="p-16 rounded-lg bg-default border border-[var(--theme-card-border)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-8 mb-12">
              <Typography.Text strong>
                {t('system.company.settlementAccount')} {index + 1}
              </Typography.Text>
              {canSave && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(index)}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('system.company.accountName')}{' '}
                    <span className="text-error">*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.accountName}
                  disabled={!canSave}
                  placeholder={t('system.company.accountNamePlaceholder')}
                  onChange={(event) =>
                    onUpdate(index, 'accountName', event.target.value)
                  }
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('system.company.usageType')}{' '}
                    <span className="text-error">*</span>
                  </Typography.Text>
                </div>
                <Select
                  value={account.usageType}
                  disabled={!canSave}
                  className="w-full"
                  onChange={(value) => onUpdate(index, 'usageType', value)}
                  options={[
                    {
                      label: t('system.company.usageGeneral'),
                      value: '通用',
                    },
                    {
                      label: t('system.company.usageReceive'),
                      value: '收款',
                    },
                    {
                      label: t('system.company.usagePay'),
                      value: '付款',
                    },
                  ]}
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('system.company.bankName')}{' '}
                    <span className="text-error">*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.bankName}
                  disabled={!canSave}
                  placeholder={t('system.company.bankNamePlaceholder')}
                  onChange={(event) =>
                    onUpdate(index, 'bankName', event.target.value)
                  }
                />
              </Col>
            </Row>
            <Row gutter={[12, 12]} className="mt-8">
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('system.company.bankAccount')}{' '}
                    <span className="text-error">*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.bankAccount}
                  disabled={!canSave}
                  placeholder={t('system.company.bankAccountPlaceholder')}
                  onChange={(event) =>
                    onUpdate(index, 'bankAccount', event.target.value)
                  }
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('common.status')}{' '}
                    <span className="text-error">*</span>
                  </Typography.Text>
                </div>
                <Select
                  value={account.status}
                  disabled={!canSave}
                  className="w-full"
                  onChange={(value) => onUpdate(index, 'status', value)}
                  options={[
                    {
                      label: t('system.company.statusNormal'),
                      value: '正常',
                    },
                    {
                      label: t('system.company.statusDisabled'),
                      value: '禁用',
                    },
                  ]}
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-8">
                  <Typography.Text type="secondary">
                    {t('common.remark')}
                  </Typography.Text>
                </div>
                <Input
                  value={account.remark}
                  disabled={!canSave}
                  placeholder={t('system.company.remarkPlaceholder')}
                  onChange={(event) =>
                    onUpdate(index, 'remark', event.target.value)
                  }
                />
              </Col>
            </Row>
          </div>
        ))}
      </div>
    </Card>
  )
}
