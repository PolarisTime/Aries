import { BankOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import type { SettlementAccountFormRow } from '@/views/system/company-settings-view-utils'

type Props = {
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
  return (
    <Card
      size="small"
      style={{ background: '#fafafa', borderRadius: 12 }}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            <BankOutlined /> 结算信息
          </span>
          {canSave && (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAdd}
            >
              新增银行
            </Button>
          )}
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {settlementAccounts.map((account, index) => (
          <div
            key={account.localKey}
            style={{
              padding: 16,
              border: '1px solid #ebeef5',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Typography.Text strong>结算账户 {index + 1}</Typography.Text>
              {canSave && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(index)}
                >
                  删除
                </Button>
              )}
            </div>
            <Row gutter={12}>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">
                    账户名称 <span style={{ color: '#ff4d4f' }}>*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.accountName}
                  disabled={!canSave}
                  placeholder="如：基本户 / 收款户"
                  onChange={(event) =>
                    onUpdate(index, 'accountName', event.target.value)
                  }
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">
                    用途 <span style={{ color: '#ff4d4f' }}>*</span>
                  </Typography.Text>
                </div>
                <Select
                  value={account.usageType}
                  disabled={!canSave}
                  style={{ width: '100%' }}
                  onChange={(value) => onUpdate(index, 'usageType', value)}
                  options={[
                    { label: '通用', value: '通用' },
                    { label: '收款', value: '收款' },
                    { label: '付款', value: '付款' },
                  ]}
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">
                    开户银行 <span style={{ color: '#ff4d4f' }}>*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.bankName}
                  disabled={!canSave}
                  placeholder="输入开户银行"
                  onChange={(event) =>
                    onUpdate(index, 'bankName', event.target.value)
                  }
                />
              </Col>
            </Row>
            <Row gutter={12} style={{ marginTop: 8 }}>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">
                    银行账号 <span style={{ color: '#ff4d4f' }}>*</span>
                  </Typography.Text>
                </div>
                <Input
                  value={account.bankAccount}
                  disabled={!canSave}
                  placeholder="输入银行账号"
                  onChange={(event) =>
                    onUpdate(index, 'bankAccount', event.target.value)
                  }
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">
                    状态 <span style={{ color: '#ff4d4f' }}>*</span>
                  </Typography.Text>
                </div>
                <Select
                  value={account.status}
                  disabled={!canSave}
                  style={{ width: '100%' }}
                  onChange={(value) => onUpdate(index, 'status', value)}
                  options={[
                    { label: '正常', value: '正常' },
                    { label: '禁用', value: '禁用' },
                  ]}
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">备注</Typography.Text>
                </div>
                <Input
                  value={account.remark}
                  disabled={!canSave}
                  placeholder="补充账户用途或说明"
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
