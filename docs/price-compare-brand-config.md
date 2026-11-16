# 报单比价的品牌从哪来（2026-11-16 收敛后）

## 一句话

品牌、品种、商品规格、定尺加价、抗震代取、指定品牌都在**项目资料**维护；报单比价的「项目配置」
弹层只剩每品牌运费。前端不再有「自动回填品牌」「回退提示条」这类隐式行为。

## 读取链

```
GET /api/v2/quote-project-configs/{projectId}
   └─ 服务端按项目资料派生（品牌与顺序=allowed_brands，categories=quote_brand_categories，
      lengthPremium/products/designatedBrands/hrb400eFallback=项目 quote_*，freight=运费表）
        ↓
buildConfigFromRecord(record)        // 已删除 fallbackBrands 兜底分支
        ↓
useSheetsStore.configs[projectId]    // ProjectConfig
        ↓
PriceCompareView: brands = config.brands
        ↓
SheetPanel / sheet-columns 渲染品牌列（现货价列 + 简称列）
```

- **品牌列 = 服务端派生结果**，前端不写回、不兜底；
- 没有 `effectiveBrands` 二次请求、「暂用比价配置品牌」提示条、`brandAutoFilledRef` 自动回填；
- 每品牌 `categories`（品种）为空表示该品牌全部品种参与比价；
- 个人列显隐（`SHEET_HIDEABLE_COLUMN.brand`）只影响本机显示，不改变项目级清单。

## 写入链

```
项目资料（模块编辑器第二步「比价配置」）
  ├─ 允许品牌 allowedBrands（沿用）
  ├─ 每品牌启用品种 quoteBrandCategories（品牌 × 品类矩阵）
  ├─ 参与比价的商品规格 quoteProducts
  ├─ 定尺加价 quoteLengthPremium
  ├─ 抗震牌号代取 quoteHrb400eFallback
  └─ 指定品牌 quoteDesignatedBrands
        ↓
GET/PUT /api/v2/projects...

报单比价「项目配置」弹层
  └─ 只编辑每品牌运费 → PUT /api/v2/quote-project-configs/{id}
       { brands: [{ brandName, freight }], remark? }
```

## 容易踩的坑

1. **不要在前端补齐品牌**：服务端恒返回项目资料品牌；前端若再写回配置，会重新产生「清空后不再回填」
   这类隐式状态。
2. **不要给配置弹层加增删品牌/品种控件**：品牌越界 PUT 会 422，错误文案指向项目资料。
3. **报价单保存也读项目资料品牌**（后端 `QuoteSheetStore`）：项目资料新增品牌、运费行未补时，
   行级写价仍应通过，快照按项目资料补齐（运费 0）。
4. i18n：项目资料「比价配置」区块文案在 `modules.pages.project.sectionQuote*` / `quote*`；
   弹层文案在 `priceCompare.config.freightOnlyHint|gotoProject|noBrands`，zh-CN/en-US 必须两侧同步。

## 相关提交

- `leo 0dd646e5`：V220 迁移 + 项目资料 5 字段 + 配置投影/只写运费 + effective-brands 去回退
- `leo ebc36b67`：报价单品牌校验与快照改读项目资料
- `aries b7c1a422`：项目资料「比价配置」区块 + 配置弹层只留运费 + 载荷收窄
- `aries f8491363`：删除自动回填与回退提示条
