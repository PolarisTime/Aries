import {
  Badge,
  Button,
  Empty,
  Flex,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { DesignSheet } from './DesignSheet'
import type { DesignState } from './useDesignState'

const { Text } = Typography

/** 方案 C: 单行极简工具条 + 无卡片全屏表格(数据密集型)。 */
export function DesignC({ state }: { state: DesignState }) {
  const {
    projectGroups,
    sheets,
    activeId,
    setActiveId,
    createBatch,
    patchSheet,
    active,
    missingOf,
  } = state

  return (
    <Flex vertical gap={8}>
      <Flex
        gap={8}
        align="center"
        wrap="wrap"
        style={{
          padding: '6px 8px',
          background: '#fff',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
        }}
      >
        <Text strong>比价</Text>
        <Select
          size="small"
          style={{ width: 150 }}
          value={active?.projectId || undefined}
          placeholder="项目"
          options={projectGroups.map((group) => ({
            value: group.projectId,
            label: group.projectName || '未指定项目',
          }))}
          onChange={(projectId) => {
            const group = projectGroups.find(
              (item) => item.projectId === projectId,
            )
            if (group?.sheets[0]) setActiveId(group.sheets[0].id)
          }}
        />
        <Select
          size="small"
          style={{ width: 150 }}
          value={activeId}
          options={(() => {
            const options = []
            for (const sheet of sheets) {
              if (sheet.projectId !== active?.projectId) continue
              options.push({
                value: sheet.id,
                label: (
                  <span>
                    {sheet.name}
                    {missingOf(sheet) > 0 ? (
                      <Badge
                        count={missingOf(sheet)}
                        size="small"
                        color="#faad14"
                      />
                    ) : null}
                  </span>
                ),
              })
            }
            return options
          })()}
          onChange={(value) => setActiveId(String(value))}
        />
        <Tag color="green">
          参照 {active?.refDate} {active?.refPeriod}
        </Tag>
        <Space size={4}>
          <Button
            size="small"
            onClick={() =>
              createBatch(active?.projectId ?? '', active?.projectName ?? '')
            }
          >
            ＋批次
          </Button>
          <Button
            size="small"
            onClick={() =>
              active && patchSheet(active.id, { locked: !active.locked })
            }
          >
            {active?.locked ? '解锁' : '锁定'}
          </Button>
        </Space>
      </Flex>

      {active ? (
        <DesignSheet state={state} density="small" chrome={false} />
      ) : (
        <Empty description="暂无批次" />
      )}
    </Flex>
  )
}
