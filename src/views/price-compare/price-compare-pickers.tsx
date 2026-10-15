import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Badge, Button, Flex, Segmented, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { countMissing, resolveRef } from './core'
import { ProjectConfigModal } from './ProjectConfigModal'
import { projectAbbrOf } from './price-compare-support'
import { PriceCompareTour } from './price-compare-tour'
import type { Brand, PriceData, PriceSheet, ProjectOption } from './types'
import './price-compare-context-bar.css'

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
      className="price-compare-context-row"
      gap={8}
      align="center"
      wrap="wrap"
    >
      <span className="price-compare-context-label">
        {t('priceCompare.picker.project')}
      </span>
      {/* 项目与批次同为「互斥单选」, 统一用 Segmented: 原先项目行是可勾选胶囊(Tag),
          未选中态几乎没有边界, 与批次行的分段控件也不一致。 */}
      <div className="price-compare-context-scroll">
        <Segmented
          size="small"
          className="price-compare-project-segmented"
          aria-label={t('priceCompare.picker.a11y.project')}
          value={currentGroup?.projectId}
          onChange={(projectId) => {
            const group = projectGroups.find(
              (item) => item.projectId === String(projectId),
            )
            if (group?.sheets[0]) onSelectSheet(group.sheets[0].id)
          }}
          options={projectGroups.map((group) => ({
            value: group.projectId,
            label: projectAbbrOf(projects, group.projectId, group.projectName),
          }))}
        />
      </div>
      <Select
        size="small"
        style={{ width: 150 }}
        aria-label={t('priceCompare.sheet.a11y.projectBatch')}
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
    <Flex
      className="price-compare-context-row"
      gap={8}
      align="center"
      wrap="wrap"
    >
      <span className="price-compare-context-label">
        {t('priceCompare.picker.batch')}
      </span>
      <div className="price-compare-context-scroll">
        <Segmented
          size="small"
          className="price-compare-batch-segmented"
          aria-label={t('priceCompare.picker.a11y.batch')}
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
                    color="var(--color-warning)"
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
              </span>
            ),
          }))}
        />
      </div>
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

/** 比价页浮层(项目配置弹窗 + 引导)。 */
export function PriceCompareOverlays({
  configOpen,
  onCloseConfig,
  brandOptions,
  varieties,
  config,
  onSaveConfig,
  tourOpen,
  onCloseTour,
  spotRef,
}: {
  configOpen: boolean
  onCloseConfig: () => void
  brandOptions: React.ComponentProps<typeof ProjectConfigModal>['brandOptions']
  varieties: React.ComponentProps<typeof ProjectConfigModal>['varieties']
  config: React.ComponentProps<typeof ProjectConfigModal>['config']
  onSaveConfig: React.ComponentProps<typeof ProjectConfigModal>['onSave']
  tourOpen: boolean
  onCloseTour: () => void
  spotRef: React.RefObject<HTMLSpanElement | null>
}) {
  return (
    <>
      <ProjectConfigModal
        open={configOpen}
        brandOptions={brandOptions}
        varieties={varieties}
        config={config}
        onClose={onCloseConfig}
        onSave={onSaveConfig}
      />
      <PriceCompareTour
        open={tourOpen}
        onClose={onCloseTour}
        spotRef={spotRef}
      />
    </>
  )
}
