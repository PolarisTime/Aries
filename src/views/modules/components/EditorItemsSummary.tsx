import { Col, Row, Statistic } from 'antd'

interface Props {
  items: Record<string, unknown>[]
  weightKey?: string
  amountKey?: string
  countKey?: string
}

export function EditorItemsSummary({ items, weightKey = 'weightTon', amountKey = 'amount', countKey = 'quantity' }: Props) {
  const totalWeight = items.reduce((sum, item) => sum + (Number(item[weightKey]) || 0), 0)
  const totalAmount = items.reduce((sum, item) => sum + (Number(item[amountKey]) || 0), 0)
  const totalCount = items.reduce((sum, item) => sum + (Number(item[countKey]) || 0), 0)

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <Statistic title="行数" value={items.length} />
      </Col>
      {totalCount > 0 && (
        <Col xs={12} md={6}>
          <Statistic title="数量" value={totalCount} />
        </Col>
      )}
      {totalWeight > 0 && (
        <Col xs={12} md={6}>
          <Statistic title="重量(吨)" value={totalWeight} precision={3} />
        </Col>
      )}
      {totalAmount > 0 && (
        <Col xs={12} md={6}>
          <Statistic title="金额" value={totalAmount} precision={2} />
        </Col>
      )}
    </Row>
  )
}
