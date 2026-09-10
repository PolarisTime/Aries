import { Card, Flex, Segmented, Skeleton, Typography } from 'antd'
import { useState } from 'react'
import { DesignA } from './DesignA'
import { DesignB } from './DesignB'
import { DesignC } from './DesignC'
import { useDesignState } from './useDesignState'

const { Text } = Typography

/** 比价布局草案对比页(免登录预览): 方案A 侧边导航 / B 顶部胶囊 / C 无壳全屏。 */
export function PriceCompareDesignPreview() {
  const [variant, setVariant] = useState<'A' | 'B' | 'C'>('B')
  const state = useDesignState()

  if (state.loading)
    return (
      <Card>
        <Skeleton active />
      </Card>
    )

  return (
    <Flex vertical gap={12} style={{ padding: 12 }}>
      <Flex gap={12} align="center" justify="space-between" wrap="wrap">
        <Flex gap={8} align="center">
          <Text strong>比价布局草案</Text>
          <Segmented
            value={variant}
            onChange={(value) => setVariant(value as 'A' | 'B' | 'C')}
            options={[
              { label: 'A 侧边导航', value: 'A' },
              { label: 'B 顶部胶囊', value: 'B' },
              { label: 'C 无壳全屏', value: 'C' },
            ]}
          />
        </Flex>
        <Text type="secondary" style={{ fontSize: 12 }}>
          真实数据 · 免登录预览 · 选定后我再并入正式页面
        </Text>
      </Flex>
      {variant === 'A' && <DesignA state={state} />}
      {variant === 'B' && <DesignB state={state} />}
      {variant === 'C' && <DesignC state={state} />}
    </Flex>
  )
}
