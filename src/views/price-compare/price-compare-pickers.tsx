import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Badge, Button, Flex, Segmented, Select, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { countMissing, resolveRef } from './core'
import { projectAbbrOf } from './price-compare-support'
import type { Brand, PriceData, PriceSheet, ProjectOption } from './types'

const { Text } = Typography

type ProjectGroup = {
  projectId: string
  projectName: string
  sheets: PriceSheet[]
}

export function PriceCompareProjectPicker({
  currentGroup,
  onAddProject,
  onSelectSheet,
  projects,
  projectGroups,
}: {
  currentGroup: ProjectGroup | undefined
  onAddProject: (project: ProjectOption) => void
  onSelectSheet: (sheetId: string) => void
  projects: ProjectOption[]
  projectGroups: ProjectGroup[]
}) {
  const { t } = useTranslation()
  return (
    <Flex
      gap={8}
      align="center"
      wrap="wrap"
      justify="space-between"
      style={{ marginBottom: 8 }}
    >
      <Flex gap={8} align="center" wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('priceCompare.picker.project')}
        </Text>
        {projectGroups.map((group) => (
          <Tag.CheckableTag
            key={group.projectId}
            checked={group.projectId === currentGroup?.projectId}
            onChange={() =>
              group.sheets[0] && onSelectSheet(group.sheets[0].id)
            }
          >
            {projectAbbrOf(projects, group.projectId, group.projectName)}
          </Tag.CheckableTag>
        ))}
        <Select
          size="small"
          style={{ width: 150 }}
          placeholder={t('priceCompare.picker.addProjectBatch')}
          showSearch={{ optionFilterProp: 'label' }}
          value={null}
          options={projects.flatMap((project) =>
            projectGroups.some((group) => group.projectId === project.id)
              ? []
              : [
                  {
                    value: project.id,
                    label: `${project.abbr} · ${project.name}`,
                  },
                ],
          )}
          onChange={(projectId) => {
            const project = projects.find((item) => item.id === projectId)
            if (project) onAddProject(project)
          }}
        />
      </Flex>
    </Flex>
  )
}

export function PriceCompareBatchBar({
  active,
  activeId,
  brands,
  currentGroup,
  data,
  onAddBatch,
  onDeleteBatch,
  onSelectSheet,
  sheets,
}: {
  active: PriceSheet | undefined
  activeId: string
  brands: Brand[]
  currentGroup: ProjectGroup | undefined
  data: PriceData
  onAddBatch: () => void
  onDeleteBatch: (id: string) => void
  onSelectSheet: (id: string) => void
  sheets: PriceSheet[]
}) {
  const { t } = useTranslation()
  return (
    <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 8 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('priceCompare.picker.batch')}
      </Text>
      <Segmented
        size="small"
        value={activeId}
        onChange={(value) => onSelectSheet(String(value))}
        options={(currentGroup?.sheets ?? []).map((sheet) => ({
          value: sheet.id,
          label: (
            <span>
              {sheet.name}
              {countMissing(
                data,
                { ...sheet, ...resolveRef(data, sheet) },
                sheet.rows,
                brands,
              ) > 0 ? (
                <Badge
                  count={countMissing(
                    data,
                    { ...sheet, ...resolveRef(data, sheet) },
                    sheet.rows,
                    brands,
                  )}
                  size="small"
                  color="#faad14"
                  style={{ marginLeft: 6 }}
                />
              ) : null}
            </span>
          ),
        }))}
      />
      <Button size="small" icon={<PlusOutlined />} onClick={onAddBatch}>
        {t('priceCompare.picker.newBatch')}
      </Button>
      <Button
        size="small"
        danger
        icon={<DeleteOutlined />}
        disabled={!active || sheets.length <= 1}
        title={
          sheets.length <= 1
            ? t('priceCompare.picker.keepOneBatch')
            : t('priceCompare.picker.deleteCurrentBatch')
        }
        onClick={() => active && onDeleteBatch(active.id)}
      >
        {t('priceCompare.picker.deleteBatch')}
      </Button>
    </Flex>
  )
}
