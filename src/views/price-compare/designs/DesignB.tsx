import { Badge, Button, Empty, Flex, Segmented, Tag, Typography } from 'antd'
import { DesignSheet } from './DesignSheet'
import type { DesignState } from './useDesignState'

const { Text } = Typography

/** 方案 B: 顶部项目/批次胶囊 + 大留白内容区。 */
export function DesignB({ state }: { state: DesignState }) {
  const {
    projectGroups,
    sheets,
    activeId,
    setActiveId,
    createBatch,
    missingOf,
  } = state
  const activeSheet = sheets.find((sheet) => sheet.id === activeId)
  const currentGroup =
    projectGroups.find((group) => group.projectId === activeSheet?.projectId) ??
    projectGroups[0]

  return (
    <Flex vertical gap={12}>
      <Flex gap={8} align="center" wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12 }}>
          项目
        </Text>
        {projectGroups.map((group) => (
          <Tag.CheckableTag
            key={group.projectId}
            checked={group.projectId === currentGroup?.projectId}
            onChange={() => group.sheets[0] && setActiveId(group.sheets[0].id)}
          >
            {group.projectName || '未指定项目'} ({group.sheets.length})
          </Tag.CheckableTag>
        ))}
      </Flex>

      <Flex gap={12} align="center" wrap="wrap" justify="space-between">
        <Flex gap={8} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            批次
          </Text>
          <Segmented
            value={activeId}
            onChange={(value) => setActiveId(String(value))}
            options={(currentGroup?.sheets ?? []).map((sheet) => ({
              value: sheet.id,
              label: (
                <span>
                  {sheet.name}
                  {missingOf(sheet) > 0 ? (
                    <Badge
                      count={missingOf(sheet)}
                      size="small"
                      color="#faad14"
                      style={{ marginLeft: 6 }}
                    />
                  ) : null}
                </span>
              ),
            }))}
          />
        </Flex>
        <Button
          size="small"
          onClick={() =>
            createBatch(
              currentGroup?.projectId ?? '',
              currentGroup?.projectName ?? '',
            )
          }
        >
          ＋ 新批次
        </Button>
      </Flex>

      {state.active ? (
        <DesignSheet state={state} density="small" />
      ) : (
        <Empty description="暂无批次" />
      )}
    </Flex>
  )
}
