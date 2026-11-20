import { Button, Flex, InputNumber, Modal, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { modal } from '@/utils/antd-app'
import {
  applyFreightDraft,
  createFreightDraft,
  DEFAULT_FREIGHT,
  type FreightDraft,
  isFreightDraftDirty,
} from './project-config-draft'
import type { ProjectConfig, Variety } from './types'

const { Text } = Typography

type Props = {
  open: boolean
  config: ProjectConfig
  onClose: () => void
  onSave: (config: ProjectConfig) => void
  /**
   * @deprecated 品牌清单改由项目资料派生（`GET /quote-project-configs` 返回值），
   * 弹层不再自己维护品牌。保留可选签名只为不动现有调用点，下一个版本删除。
   */
  brandOptions?: string[]
  /** @deprecated 同上：品牌范围只在项目资料维护。 */
  projectAllowedBrands?: string[]
  /** @deprecated 同上：品种/规格只在项目资料维护。 */
  varieties?: Variety[]
}

/**
 * 报单比价「项目配置」弹层 —— **只剩每品牌运费**。
 *
 * <p>2026-11-16 用户定稿：品牌、品种、规格、定尺加价、抗震牌号代取、指定品牌都在
 * 「基础数据 → 项目资料」维护；本弹层品牌**只读**（来自服务端由项目资料派生的配置），
 * 保存时 `PUT /quote-project-configs/{id}` **只发运费**（`{brands:[{brandName,freight}], remark?}`）。</p>
 *
 * <p>不在本弹层再放一套品牌增删/品类/商品控件：同一配置两处可改，必然出现两份互相打架的值。</p>
 */
export function ProjectConfigModal({ open, config, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<FreightDraft>(() =>
    createFreightDraft(config),
  )
  const wasOpenRef = useRef(false)

  // 仅在 open 由 false → true 时初始化草稿；打开期间 config 后台刷新不重置用户正在编辑的内容
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(createFreightDraft(config))
    }
    wasOpenRef.current = open
  }, [open, config])

  const setFreight = (brand: string, value: number | null) => {
    setDraft((current) => ({
      ...current,
      freightMap: {
        ...current.freightMap,
        [brand]: value === null ? DEFAULT_FREIGHT : value,
      },
    }))
  }

  const handleCancel = () => {
    if (!isFreightDraftDirty(config, draft)) {
      onClose()
      return
    }
    modal.confirm({
      title: t('priceCompare.config.discardTitle'),
      okText: t('priceCompare.config.abandon'),
      cancelText: t('priceCompare.config.continueEditing'),
      onOk: onClose,
    })
  }

  return (
    <Modal
      title={t('priceCompare.config.title')}
      open={open}
      width={560}
      destroyOnHidden
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={() => {
        onSave(applyFreightDraft(config, draft))
        onClose()
      }}
      onCancel={handleCancel}
      styles={{
        body: {
          maxHeight: '64vh',
          overflowY: 'auto',
          paddingRight: 'var(--space-xs)',
        },
      }}
    >
      <Flex gap={8} vertical>
        <Text type="secondary">{t('priceCompare.config.freightOnlyHint')}</Text>
        {/* 只有数字没有计量口径时，用户不知道「30」是运费、加价还是别的什么 */}
        <Text type="secondary">{t('priceCompare.config.freightIntro')}</Text>
        <Button
          className="price-compare-config-goto-project"
          href="/project"
          size="small"
          type="link"
        >
          {t('priceCompare.config.gotoProject')}
        </Button>

        {draft.brands.length === 0 ? (
          <Text type="secondary">{t('priceCompare.config.noBrands')}</Text>
        ) : (
          <div className="pc-freight-table">
            {/* 列头：品牌 / 运费(元/吨)。没有它，输入框里的 30.00 看不出是什么口径 */}
            <div className="pc-freight-head">
              <span>{t('priceCompare.config.freightColumnBrand')}</span>
              <span className="pc-freight-head-value">
                {t('priceCompare.config.freight')}
              </span>
            </div>
            {draft.brands.map((brand) => (
              <div className="pc-brand-row" key={brand}>
                <Text className="pc-brand-name" title={brand}>
                  {brand}
                </Text>
                <InputNumber
                  aria-label={`${brand} ${t('priceCompare.config.freight')}`}
                  className="pc-freight-input"
                  min={0}
                  precision={2}
                  step={1}
                  suffix={
                    <span className="pc-freight-unit">
                      {t('priceCompare.config.freightUnit')}
                    </span>
                  }
                  value={draft.freightMap[brand] ?? DEFAULT_FREIGHT}
                  onChange={(value) => setFreight(brand, value)}
                />
              </div>
            ))}
          </div>
        )}
      </Flex>
    </Modal>
  )
}
