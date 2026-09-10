import { AppstoreOutlined, InboxOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, Layout, Menu, Typography } from 'antd'
import { DesignSheet } from './DesignSheet'
import type { DesignState } from './useDesignState'

const { Sider, Content } = Layout
const { Text } = Typography

/** 方案 A: 左侧项目/批次导航 + 右侧单据。 */
export function DesignA({ state }: { state: DesignState }) {
  const { projectGroups, activeId, setActiveId, createBatch, missingOf } = state

  const menuItems = projectGroups.map((group) => ({
    key: `p:${group.projectId}`,
    icon: <AppstoreOutlined />,
    label: group.projectName || '未指定项目',
    children: group.sheets.map((sheet) => ({
      key: sheet.id,
      icon: <InboxOutlined />,
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
    })),
  }))

  return (
    <Layout
      style={{ minHeight: 'calc(100vh - 90px)', background: 'transparent' }}
    >
      <Sider
        width={230}
        theme="light"
        style={{
          borderRadius: 8,
          marginRight: 12,
          border: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong>项目 / 批次</Text>
          <Button
            size="small"
            type="text"
            onClick={() =>
              createBatch(
                projectGroups[0]?.projectId ?? '',
                projectGroups[0]?.projectName ?? '',
              )
            }
          >
            ＋
          </Button>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeId]}
          defaultOpenKeys={projectGroups.map((group) => `p:${group.projectId}`)}
          items={menuItems}
          onSelect={({ key }) => setActiveId(key)}
          style={{ borderInlineEnd: 0 }}
        />
      </Sider>
      <Content>
        {state.active ? (
          <DesignSheet state={state} density="small" />
        ) : (
          <Empty description="暂无批次" />
        )}
      </Content>
    </Layout>
  )
}
