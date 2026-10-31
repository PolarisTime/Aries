# [14.7.0](https://github.com/PolarisTime/Aries/compare/v14.6.0...v14.7.0) (2026-10-31)


### Bug Fixes

* **master-data:** 材料类别需求无人声明，单据侧一直走硬编码兜底 ([0dc99dc](https://github.com/PolarisTime/Aries/commit/0dc99dca3422bc993c4b471415ab697720987793))
* **master-data:** 经营品牌穿梭弹窗被撑出视口（两栏定高 + 表体滚动） ([db40412](https://github.com/PolarisTime/Aries/commit/db40412b7abe310cd61dc1a311ce206a413f6403))
* **material:** 商品编辑表单的「类别」下拉为空 ([1d00a4a](https://github.com/PolarisTime/Aries/commit/1d00a4a480c9af561ecf78f1b0662a0fdccd9373))
* **material:** 商品资料的材质/类别筛选改为真实主数据（此前永远只有 HRB400/HRB500） ([51a8c03](https://github.com/PolarisTime/Aries/commit/51a8c0399a8c44a6d106ce1f7606c2fadca75b52))
* **modules:** 主数据保存回执不再说「已保存为草稿，尚未提交审核」 ([3b35673](https://github.com/PolarisTime/Aries/commit/3b356732f9d990c0ba7ac1530ccc704e23084411))
* **system:** 公司设置菜单补权限门禁，系统设置可见页统一校验 ([2244b52](https://github.com/PolarisTime/Aries/commit/2244b52749c4b3a4aa105e9bc5125a9702c92f9d))
* **ui:** 修复弹窗关闭按钮错位（全局按钮定位补丁压过 antd 绝对定位） ([570ead8](https://github.com/PolarisTime/Aries/commit/570ead8471b2e8f4330ce577d246d7ca91dd8a4a))


### Features

* **master:** 供应商列表页接入通用列表页，经营品牌并入主数据选项体系 ([265b070](https://github.com/PolarisTime/Aries/commit/265b0700f6a7754c437c599a8966bef007255d52))
* **master:** 商品资料/材料类别/客户/仓库列表页接入通用列表页 ([5e69552](https://github.com/PolarisTime/Aries/commit/5e695529d3d5a29b35ec54dbdbfc4c2ada47fe46))
* **master:** 基础数据子页面合并为宿主页标签 ([4ca336c](https://github.com/PolarisTime/Aries/commit/4ca336c065ef3ddb9a1e3d363aac7d494103fe0a))
* **master:** 定尺主数据驱动材料录入与比价，修正字段长度与尺寸规范 ([5739ac1](https://github.com/PolarisTime/Aries/commit/5739ac18f67ef703d054e145203a4d1352bf9500))
* **master:** 物流商列表页接入通用列表页，补 vehicleType/priceMode 表单字段 ([ced403e](https://github.com/PolarisTime/Aries/commit/ced403ec7c19c922221ebb2de9edae0f68740557))
* **master:** 项目资料列表页接入通用列表页，补齐 12 个取价/允许范围字段 ([2a755ef](https://github.com/PolarisTime/Aries/commit/2a755efe130ab142bd62105441de5d71160a6e04))
* **material:** 商品资料支持启用/禁用，选商品类请求只取启用商品 ([9aea183](https://github.com/PolarisTime/Aries/commit/9aea183c2fdbeb612b3c3900152aaa1b45ae8615))
* **modules:** 强制结单未选中时隐藏；工具行纯图标按钮补文字 ([00c7503](https://github.com/PolarisTime/Aries/commit/00c750328a264e08282c8258d8a18880fa07760f))
* **ui:** 二级/三级弹窗统一层级规范（尺寸递减、遮罩加深、焦点落在可操作区） ([ca57308](https://github.com/PolarisTime/Aries/commit/ca57308d02c125b89c5b9189673b227f8a013ed7))

# [14.6.0](https://github.com/PolarisTime/Aries/compare/v14.5.0...v14.6.0) (2026-10-29)


### Bug Fixes

* **master-data:** 表单分区 key 改用字段名派生，避免数组下标 ([c8ef7ab](https://github.com/PolarisTime/Aries/commit/c8ef7ab3d092b81f4ec9a4298ab4b281855912b4))
* **modules:** 修复单据表头缺失字段并统一表头顺序 ([21bbe36](https://github.com/PolarisTime/Aries/commit/21bbe36c1fc4ec252bb3066172e57a82afc36221))
* **price-compare:** 供应商报价表没铺满内容区（表体高度写死 560px） ([83e5dde](https://github.com/PolarisTime/Aries/commit/83e5dded956744ef221a6abb7d113599f8117b7a))
* **price-compare:** 修复「从价格表带价」对螺纹钢一类永远取不到价（类别别名未归一） ([244d6cf](https://github.com/PolarisTime/Aries/commit/244d6cf05592ea66148b9c68138541b0982fffe2))
* **price-compare:** 去掉「不分定尺」列、定尺列可隐藏、规格去掉 Φ、去掉步进箭头、框线加深 ([60e9bd3](https://github.com/PolarisTime/Aries/commit/60e9bd3ca0481b0b9c81e3397cf1ec286f18dd69)), closes [#d9d9d9](https://github.com/PolarisTime/Aries/issues/d9d9d9)
* **price-compare:** 无定尺的品类（盘螺）不再多出全是「—」的第三行表头 ([829ab9d](https://github.com/PolarisTime/Aries/commit/829ab9da9f78961d346896e87eb1ccb8349408ce))
* **schemas:** 销售退货保存请求改用 strictObject 拒绝未知字段 ([e2227b6](https://github.com/PolarisTime/Aries/commit/e2227b66d76635059d2860d1a99db7f068d1c3bb))
* **ui:** 主按钮禁用态被主色覆盖（保存按钮"深蓝底+灰字"） ([fcc1346](https://github.com/PolarisTime/Aries/commit/fcc134643a9d3314a4eec3d3ca6c58de47632b19)), closes [#0958d9](https://github.com/PolarisTime/Aries/issues/0958d9) [#1677ff](https://github.com/PolarisTime/Aries/issues/1677ff) [#0958d9](https://github.com/PolarisTime/Aries/issues/0958d9) [#fff](https://github.com/PolarisTime/Aries/issues/fff)


### Features

* **master-data:** 供应商编辑弹层按四列栅格重排 ([9c50cc4](https://github.com/PolarisTime/Aries/commit/9c50cc459869e706c67c93a2089e3f78ed7807ca))
* **master-data:** 其余主数据弹层对齐四列栅格与分区 ([6804faa](https://github.com/PolarisTime/Aries/commit/6804faa3d239cab623b2137dc3679df898897c91))
* **master-data:** 经营品牌改用 antd 表格穿梭框选择 ([c020c2c](https://github.com/PolarisTime/Aries/commit/c020c2cbc6f233f420f613b24f79d973f9acb7fc))
* **price-compare:** 「列显示」可按「材质 × 定尺」隐藏整列（如 HRB400 12米） ([65962ce](https://github.com/PolarisTime/Aries/commit/65962ce068d9a29f9d6865f33a4c4dee7306c699))
* **price-compare:** 供应商报价表支持「基价模式 / 手填模式」两种录价方式 ([228d1e0](https://github.com/PolarisTime/Aries/commit/228d1e0cb6d60c746c4f6a4709a88a52d1ef77f9))
* **price-compare:** 供应商报价表的「列显示」现在能配任意列，含序号/类别/材质/规格 ([4fe651e](https://github.com/PolarisTime/Aries/commit/4fe651ec3bd2cc3b011fc545828192301a46177f))
* **price-compare:** 供应商报价表重做「选择品牌」，行分组、9米/12米按定尺分列 ([bc9a22e](https://github.com/PolarisTime/Aries/commit/bc9a22e4ee8a04e5fd7f93a77cf0047b12b5bf95))
* **price-compare:** 报价网格垂直居中、金额列按 5 位数收窄、去掉金额的 .00 ([03da932](https://github.com/PolarisTime/Aries/commit/03da9322688d649c5a4396d571b80ebd78755b67))
* **price-compare:** 报价行高压缩并跟随字号缩放；规格横置改为「定尺进表头」 ([162f1bd](https://github.com/PolarisTime/Aries/commit/162f1bdf36153703dc03e8689a0607ee50f39b99))
* **price-compare:** 材质抽到表头，品牌成列变成「品牌 → 材质 → 定尺」三层表头 ([c0e2841](https://github.com/PolarisTime/Aries/commit/c0e2841616e287bc482f054af01b351562ab7828))

# [14.5.0](https://github.com/PolarisTime/Aries/compare/v14.4.0...v14.5.0) (2026-10-28)


### Bug Fixes

* **ci:** 修复阻断 frontend-ci / frontend-release 的 3 类 lint 报错 ([330ff28](https://github.com/PolarisTime/Aries/commit/330ff2859601596817a10fc76acca5cb4141e85d))
* **price-compare:** 修复供应商报价表规格行拉取 422 导致无可录入行 ([aa639e2](https://github.com/PolarisTime/Aries/commit/aa639e211c572968b44c5d7668a8843fc1e6555c))
* **price-compare:** 修复报价网格列宽被拉伸与新增品牌入口不可用 ([cbab7e8](https://github.com/PolarisTime/Aries/commit/cbab7e894129b78f0e72b7b6d40807ef6cb650ad))
* **version:** 页脚版本查询改为带鉴权，并支持失败后自动恢复 ([a677326](https://github.com/PolarisTime/Aries/commit/a677326b11817c6f0ac6ad747dca12554d987fac))


### Features

* **modules:** 「单据流」按钮改为默认隐藏、勾选后出现 ([d7471d1](https://github.com/PolarisTime/Aries/commit/d7471d132134c15ada41b1043ac76db091fb6b3e))
* **modules:** 行右键菜单补齐批量动作，并在个人设置里新增「右键菜单」配置 ([89f2056](https://github.com/PolarisTime/Aries/commit/89f20568ed1e6a971f4154a29395645720dc55c5))
* **operation-log:** 操作日志页重做（筛选/概览/趋势/详情抽屉/导出） ([0565603](https://github.com/PolarisTime/Aries/commit/0565603db1ed917ffe3fb67a9d3725d8eeba3e04))
* **operation-log:** 补充操作日志页与相对时间文案（中/英） ([6065d09](https://github.com/PolarisTime/Aries/commit/6065d09d97e972fa587606c40ac76eb5275b493e))
* **price-compare:** 供应商报价表支持「规格横置」视图 ([492a0db](https://github.com/PolarisTime/Aries/commit/492a0db56c97d5c8cc81cf82808ab5791b35bcc9))
* **price-compare:** 供应商报价表支持品牌级「基价加价」 ([8e4af99](https://github.com/PolarisTime/Aries/commit/8e4af996b9c0e5339af2a8077a7b765792be394c))
* **price-compare:** 报价网格增加列显示、拖拽排序等表格操作 ([bad9aea](https://github.com/PolarisTime/Aries/commit/bad9aeac4efa5bcd4371264a905d23265cd7cfe7))
* **price-compare:** 报价网格改为「一行规格、格内多定尺」 ([6ea59eb](https://github.com/PolarisTime/Aries/commit/6ea59eb32ed071a73c4ca0b11d812508036d9f30))
* **price-compare:** 报价表补权限门禁、撤销重做、草稿恢复与保存/粘贴确认 ([5575b75](https://github.com/PolarisTime/Aries/commit/5575b75d4d197ec6488a485af866dcaa7b33a85a))

# [14.4.0](https://github.com/PolarisTime/Aries/compare/v14.3.2...v14.4.0) (2026-10-28)


### Features

* **layout:** 个人设置里新增「导航面包屑」显示开关 ([a6dc170](https://github.com/PolarisTime/Aries/commit/a6dc170a4291623177532b4d960672522113c08e))
* **market:** 重做行情同步页面 UI 与交互，覆盖矩阵支持前后翻段 ([0d25042](https://github.com/PolarisTime/Aries/commit/0d25042a9d4804ee7293947392f2f99404d625aa))

## [14.3.2](https://github.com/PolarisTime/Aries/compare/v14.3.1...v14.3.2) (2026-10-27)


### Performance Improvements

* **modules:** 网价核查的上游数据走 react-query 缓存，重复展开不再重拉行情 ([51f015a](https://github.com/PolarisTime/Aries/commit/51f015aab7d55cb3d564284decad138e6e1355e9))

## [14.3.1](https://github.com/PolarisTime/Aries/compare/v14.3.0...v14.3.1) (2026-10-27)


### Bug Fixes

* **modules:** 修列宽拖拽「先被拉大、继续拖才变小」 ([3c76b57](https://github.com/PolarisTime/Aries/commit/3c76b57ff1dae86de83539c37469d6e13bb01733))

# [14.3.0](https://github.com/PolarisTime/Aries/compare/v14.2.0...v14.3.0) (2026-10-27)


### Bug Fixes

* **modules:** 列宽有富余的页面不再把身份列撑宽（采购入库 92 → 72） ([1d8ebac](https://github.com/PolarisTime/Aries/commit/1d8ebac3498e5be0d28016b5925b17c5224decca))


### Features

* **modules:** 业务列表开启网格线，能看出列边界 ([162e7ee](https://github.com/PolarisTime/Aries/commit/162e7eefb1fd48af8670887fdcedb20a46c52034)), closes [#f0f0f0](https://github.com/PolarisTime/Aries/issues/f0f0f0) [#d9d9d9](https://github.com/PolarisTime/Aries/issues/d9d9d9)

# [14.2.0](https://github.com/PolarisTime/Aries/compare/v14.1.2...v14.2.0) (2026-10-27)


### Bug Fixes

* **modules:** 身份列表头勾选框与行内序号/勾选框对不齐 ([5988914](https://github.com/PolarisTime/Aries/commit/5988914bfd84a420fb135cfe0b6224e58cd8166f))


### Features

* **modules:** 列表页支持按住行拖拽批量勾选，表体不再划词 ([834439f](https://github.com/PolarisTime/Aries/commit/834439f6b32a5fd44d587ad2df15b0fd841f8898))

## [14.1.2](https://github.com/PolarisTime/Aries/compare/v14.1.1...v14.1.2) (2026-10-27)


### Bug Fixes

* **parent-selector:** 移除选单行内「复制单号」与「单据流转」图标 ([99fe292](https://github.com/PolarisTime/Aries/commit/99fe2922077abc445a31f5758b6cb1ecc55bd7bf))

## [14.1.1](https://github.com/PolarisTime/Aries/compare/v14.1.0...v14.1.1) (2026-10-27)


### Bug Fixes

* **parent-selector:** 选单弹层动作按钮移到左侧，并与已选面板对齐 ([3461cb3](https://github.com/PolarisTime/Aries/commit/3461cb3ac4b437d61fe38024f9979d3e385a9499))

# [14.1.0](https://github.com/PolarisTime/Aries/compare/v14.0.0...v14.1.0) (2026-10-26)


### Bug Fixes

* **modules:** 列表页合并首位身份列，修正筛选区按钮与页脚统计显示 ([3469c75](https://github.com/PolarisTime/Aries/commit/3469c757db7725ca37c682e62faa886770bf0e40))


### Features

* **project-name:** 四业务列表「项目名称」列显示「项目简称（全称）」 ([5ea6bfa](https://github.com/PolarisTime/Aries/commit/5ea6bfa4533e393d21703157c6b6247abbc613ad))

# [14.0.0](https://github.com/PolarisTime/Aries/compare/v13.7.0...v14.0.0) (2026-10-26)


* feat(purchase-order)!: 移除下游引用图标与「下游引用」筛选 ([f7a9544](https://github.com/PolarisTime/Aries/commit/f7a954417ba38029f031930219e17a041ee6e84a))


### BREAKING CHANGES

* 前端不再发送 referenced/referencedBy 查询参数，也不再解析
referencedBy* 响应字段；需与后端 16190ce8 同批上线。

# [13.7.0](https://github.com/PolarisTime/Aries/compare/v13.6.0...v13.7.0) (2026-10-26)


### Bug Fixes

* **build:** vite 开启 strictPort，避免静默改用 3101 ([9ec2e21](https://github.com/PolarisTime/Aries/commit/9ec2e21d8d9f557ba8138e7218a8d88d1f3e54ec))
* **freight-bill:** 单据信息表头按语义重排，派生字段紧跟来源字段 ([3fc6141](https://github.com/PolarisTime/Aries/commit/3fc6141e8d277b7f6bad1dcfc32ae60e3882eba5))
* **freight-bill:** 取消「先选物流商才能选销售订单导入」的前置门槛 ([14d18f4](https://github.com/PolarisTime/Aries/commit/14d18f46d4234f15a8f528acc271e7a3a386067e))
* **freight-bill:** 表头按「填写区 / 只读信息区」分区，并去掉行中空洞 ([45abb00](https://github.com/PolarisTime/Aries/commit/45abb0082f2b2537399d5cbf0d959ac70b858942))
* **lint:** 修复阻塞前端 release 的两处 biome 错误 ([c3a594b](https://github.com/PolarisTime/Aries/commit/c3a594ba7a9b4d3cad783dfe8a297dbf95b24c1a))
* **price-compare:** 代取来源材质随保存下发，落库闭环不再断裂 ([7d45416](https://github.com/PolarisTime/Aries/commit/7d454168c3d859cf3c6a8855abc7847aa2d37f2a))
* **price-compare:** 代取来源落库补齐写入口径与读回映射 ([ea7a8ae](https://github.com/PolarisTime/Aries/commit/ea7a8aeaf33fb2a1800e0d4d598c0dcea82f9ae4))
* **price-compare:** 矩阵区改为自滚动, 顶部已选进度与「只看已选」不再被顶出视野 ([41aff9c](https://github.com/PolarisTime/Aries/commit/41aff9ceb7acaa38b2dcaf72ed22b62a09d8587c))
* **quote-sheets:** 归一化层透传 spotSourceMaterial ([5643213](https://github.com/PolarisTime/Aries/commit/5643213ad0d14421f97bfc67aea2eb538173ff1c))
* **sales-order:** 整单取网价后行金额与合计金额不刷新 ([c8107d1](https://github.com/PolarisTime/Aries/commit/c8107d17729e6bd3fc76074b79ee86fcc180c021))


### Features

* **master-data:** 客户资料移除结算主体，改由项目资料唯一选择 ([630ea03](https://github.com/PolarisTime/Aries/commit/630ea03ab973782990439a39ad0aa9b943c915f8))
* **module-selector:** 选择上游单据支持双击直接导入这一张 ([80d75ff](https://github.com/PolarisTime/Aries/commit/80d75fffc8daacff24f05b19f040ca5b1fbbde4c))
* **price-compare:** 品牌列取源改为「有效品牌集合」并显示回退提示 ([8046d40](https://github.com/PolarisTime/Aries/commit/8046d404a3c842cbc627e31d670f192ce79a90ba))
* **price-compare:** 支持单格取消抗震牌号代取标记 ([961ae00](https://github.com/PolarisTime/Aries/commit/961ae00588043800727ff7a33a57d1441303fb42))
* **price-compare:** 新增行级「按 E 价」开关，让现货代取手工路径可达 ([effafd4](https://github.com/PolarisTime/Aries/commit/effafd450339c3a421a93032136f3a87836cb64b))
* **price-compare:** 现货价支持按抗震牌号代取并标注来源 ([491fdc7](https://github.com/PolarisTime/Aries/commit/491fdc7cc450bf8fa1dc0b094911ea0646d28006))
* **price-compare:** 项目配置弹层改为规格×材质矩阵, 品牌行精简为三列 ([6f76f7e](https://github.com/PolarisTime/Aries/commit/6f76f7e69076c4f2f4dc7051425003d3a4736051))
* **pricing:** 项目/单据休市取价支持「往前/延后 + X 个交易日」 ([fb3ae42](https://github.com/PolarisTime/Aries/commit/fb3ae425d231cb60a5d8f2f8c6d2501592eaf756))
* **sales-order:** 详情页网价匹配列自动核查并展示真实结论 ([0e3f29d](https://github.com/PolarisTime/Aries/commit/0e3f29df22ca65d11d0ffb6aba4c024be869e1c8))
* **supplier-price:** 品牌价格表前端页面 + 报单比价「从价格表带价」 ([83f4706](https://github.com/PolarisTime/Aries/commit/83f470670139b010fb9b62d4fa1b80da9ab2ed72))

# [13.6.0](https://github.com/PolarisTime/Aries/compare/v13.5.0...v13.6.0) (2026-10-22)


### Bug Fixes

* **price-compare:** 一单货覆盖多个批次时按本单分摊封顶已开货，并支持手动分配吨位 ([beae8a8](https://github.com/PolarisTime/Aries/commit/beae8a8ecd1d78204275eeb5fbdcedc6fc23b6e1))
* **price-compare:** 单据头部标签字号过小、报单/参照网价日期被截断 ([0278f4e](https://github.com/PolarisTime/Aries/commit/0278f4e373ec5b21e6286547cf77ed506b695fa7))
* **price-compare:** 现货同步支持抗震牌号代取，HRB400 能同步到 HRB400E 的价 ([7602b80](https://github.com/PolarisTime/Aries/commit/7602b801a12a0d61c145d06f93117a3e409a2b1b))
* **tabs:** 修复页签改名被守卫拒绝后地址栏在两页间反复跳转 ([46286bd](https://github.com/PolarisTime/Aries/commit/46286bd7441034315feda251d48407807a0f3f0b))


### Features

* **forms:** 单据编辑器标签改为横向同行，收窄结算方式分段控件 ([5062fbd](https://github.com/PolarisTime/Aries/commit/5062fbdd932f726be4dd0ceabf4335c7e68d1290))

# [13.5.0](https://github.com/PolarisTime/Aries/compare/v13.4.1...v13.5.0) (2026-10-21)


### Bug Fixes

* **tabs:** 修三处标签机制缺陷（保护标记不清除 / 关闭请求被丢弃 / pathname 可重复） ([683d28c](https://github.com/PolarisTime/Aries/commit/683d28c111ffdd3c97879b5c91084d4443c3a7dc))
* **tabs:** 消除切换标签时的空白窗口与整页骨架闪烁（"像 SPA 重载"） ([120e6dd](https://github.com/PolarisTime/Aries/commit/120e6dd870e0f22fe79fce62376fc35c6487afc4))


### Features

* **prefetch:** 菜单/标签悬停时预热页面 chunk 与首屏数据，减少点开即等骨架 ([3d7c842](https://github.com/PolarisTime/Aries/commit/3d7c842553639abbaf4822a61f386d903a62cf2d))
* **price-compare:** 报单比价支持批次重命名 ([620b559](https://github.com/PolarisTime/Aries/commit/620b559a2a84764810c46fb99b40b2306112f1bb))

## [13.4.1](https://github.com/PolarisTime/Aries/compare/v13.4.0...v13.4.1) (2026-10-20)


### Bug Fixes

* **editor:** 单据表单行内字段数超 24 栅格导致第 5 个字段孤立换行 ([95d132c](https://github.com/PolarisTime/Aries/commit/95d132c13b02240e7250838ddcbf72639d2a34f7))
* **format:** 金额小数位收敛到 DISPLAY_AMOUNT_PRECISION 单点控制 ([0ef7918](https://github.com/PolarisTime/Aries/commit/0ef79182cf0754163f66629f887c54d03bd5a01e))
* **table:** 选中行固定列错位 64px —— position:relative 压掉了 sticky ([992a911](https://github.com/PolarisTime/Aries/commit/992a91116dc97bdecfa150b09198c1c3ea78ad29))
* **table:** 选中行高亮改为「底色 + 左侧实心主色条」，去掉外发光与呼吸动画 ([a66c53a](https://github.com/PolarisTime/Aries/commit/a66c53aa8a52beec7ab30b0ad10e297054633d68)), closes [#1677ff](https://github.com/PolarisTime/Aries/issues/1677ff)
* **ui:** 汇总口径分组显示、筛选提示并入工具栏、金额去掉千分位 ([3c3218d](https://github.com/PolarisTime/Aries/commit/3c3218dcfe15b5233a96e2c30f3df9965c1cdece))

# [13.4.0](https://github.com/PolarisTime/Aries/compare/v13.3.1...v13.4.0) (2026-10-20)


### Bug Fixes

* **lint:** 修复 4 处 eslint 错误并排除产物目录，恢复 CI Lint 门禁 ([a29252d](https://github.com/PolarisTime/Aries/commit/a29252d4d77d562407132ab67a60901562d1b466))
* **module-page:** 商品信息筛选接入真实页面配置并补防漂移守卫 ([305c460](https://github.com/PolarisTime/Aries/commit/305c4608f276e06f2088c66ac70dea9090dec5f5))
* **modules:** 单据编辑器的保存按钮移回明细工具栏 ([62815a5](https://github.com/PolarisTime/Aries/commit/62815a5bea19eeeaa5285c5a635ca4f6c738394d))
* **price-compare:** 修复新建批次后录入明细报 itemId 参数格式错误 ([21234f2](https://github.com/PolarisTime/Aries/commit/21234f226b8c08981f7d8dba9a69dd21645cad80))


### Features

* **module-page:** 采购/入库/退货/物流单列表接入「商品信息」筛选 ([10192fa](https://github.com/PolarisTime/Aries/commit/10192fa3616ec7b8da1d131d6071816c9f1666c6))
* **price-compare:** 参与品牌以项目资料的「允许的品牌」为上限 ([32046a9](https://github.com/PolarisTime/Aries/commit/32046a988132c73da9430546cfe717fb099ed32b))
* **price-compare:** 新增现货价三档作用域同步按钮 ([cdc2d86](https://github.com/PolarisTime/Aries/commit/cdc2d86ad6c13b3f5208d82cccd415b79b7299f8))
* **system:** 角色权限编辑器重做为业务域矩阵 + 角色模板 ([5a9319f](https://github.com/PolarisTime/Aries/commit/5a9319fea36d7facb7f8094bcc53d710a088ce49))


### Performance Improvements

* **system:** 权限矩阵按 action 建索引，去掉循环内 find ([a857208](https://github.com/PolarisTime/Aries/commit/a8572089a0f6b04349b074f69da016ffb241b4e4))

## [13.3.1](https://github.com/PolarisTime/Aries/compare/v13.3.0...v13.3.1) (2026-10-19)


### Bug Fixes

* **price-compare:** 项目清单改为读取后端, 新建项目不再需要发版 ([32f34eb](https://github.com/PolarisTime/Aries/commit/32f34ebe5a3a810477ce8f23f93b861b2bc9aef2))

# [13.3.0](https://github.com/PolarisTime/Aries/compare/v13.2.1...v13.3.0) (2026-10-19)


### Bug Fixes

* **a11y:** 修复列宽把手 0 高度、测量行焦点陷阱与标签栏 aria 结构 ([9436ffd](https://github.com/PolarisTime/Aries/commit/9436ffdc5c041de9f4952c4fbc4ec6aed999194e))
* **a11y:** 危险确认补齐 antd 6 焦点 API 并覆盖保存并审核 ([bc3fe2e](https://github.com/PolarisTime/Aries/commit/bc3fe2e1016a3b4860bd5f555aba2ea6cc95ce32))
* **audit:** 审核确认框默认焦点改到取消并说清状态变化 ([6c50ff5](https://github.com/PolarisTime/Aries/commit/6c50ff59ba98ec1c4b42709d089149a0d81f6fe8))
* **ci:** 清理 eslint 阻断发布的 7 处多余类型断言与 1 处未使用导入 ([b7e7411](https://github.com/PolarisTime/Aries/commit/b7e7411a31905eb9b6025dea7ac784cfad6bce18))
* **master:** 取价地区与定尺加价契约恢复审计时间必填并补回归测试 ([c24b7d8](https://github.com/PolarisTime/Aries/commit/c24b7d8010d733e81acf1d12a4560455f6ea0452))
* **modules:** 交付核定状态允许拖拽调整明细行顺序 ([ff774c2](https://github.com/PolarisTime/Aries/commit/ff774c286237e99086200c077e70c6fc519f679a))
* **modules:** 修复单据编辑器保存入口/退出确认/删除可逆与回执口径 ([2b93f72](https://github.com/PolarisTime/Aries/commit/2b93f72fe226cf0fe981cd763d18bac4922b1086))
* **modules:** 手动清空搜索框后同步清 URL, 修复刷新后单号复活 ([92b5584](https://github.com/PolarisTime/Aries/commit/92b558491f45fdd20a8c0144f1a43cfa37accc54))
* **modules:** 汇总口径显式标注并修复筛选重置/固定列/触屏入口 ([b2c8d99](https://github.com/PolarisTime/Aries/commit/b2c8d99ce1601ea0204664cceffc7edc33dcba53))
* **price-compare:** 收敛吨位列显隐与选单额度口径, 修交叉错位与同屏矛盾 ([65ccb2a](https://github.com/PolarisTime/Aries/commit/65ccb2af9df2087456eeb0bfda46d9bf9d5d95cf))
* **test:** 排空 rc useDelayState 的挂起定时器, 避免 jsdom 销毁后抛未处理异常 ([6825ff0](https://github.com/PolarisTime/Aries/commit/6825ff07941e073c80e9de26d457c6082805bb39))


### Features

* **a11y:** 对比度全面达标 AA 并收敛危险操作确认出口 ([a4501ce](https://github.com/PolarisTime/Aries/commit/a4501cee48073e2e7d3b6d7d15f80cb69ef03a3a)), closes [#874d00](https://github.com/PolarisTime/Aries/issues/874d00) [#fffbe6](https://github.com/PolarisTime/Aries/issues/fffbe6) [d48806/#fffbe6](https://github.com/PolarisTime/Aries/issues/fffbe6) [#0958d9](https://github.com/PolarisTime/Aries/issues/0958d9)

## [13.2.1](https://github.com/PolarisTime/Aries/compare/v13.2.0...v13.2.1) (2026-10-17)


### Bug Fixes

* **price-compare:** 差价最优并列时全部高亮, 不再只标第一个品牌 ([f05f2b9](https://github.com/PolarisTime/Aries/commit/f05f2b9adbb24d5b176ddddcbc7fe6ce872ab816))

# [13.2.0](https://github.com/PolarisTime/Aries/compare/v13.1.0...v13.2.0) (2026-10-17)


### Features

* **modules:** 整单取价支持抗震牌号代取, 报 HRB400 可按 HRB400E 取价 ([5035dd7](https://github.com/PolarisTime/Aries/commit/5035dd728c01f9b66611c728f204c8965ce4e085))

# [13.1.0](https://github.com/PolarisTime/Aries/compare/v13.0.1...v13.1.0) (2026-10-17)


### Features

* **modules:** 下拉支持字段级空态, 项目选择器说明"先选客户" ([6190243](https://github.com/PolarisTime/Aries/commit/619024350bd49a4bb0356058a3a5ea305122333e))

## [13.0.1](https://github.com/PolarisTime/Aries/compare/v13.0.0...v13.0.1) (2026-10-16)


### Bug Fixes

* **modules:** 新建销售订单时「整单取网价」不再被误置灰 ([615943f](https://github.com/PolarisTime/Aries/commit/615943f53106ae5b746a3050fd711c481b291a64))

# [13.0.0](https://github.com/PolarisTime/Aries/compare/v12.1.0...v13.0.0) (2026-10-16)


* fix(price-compare)!: 已开货改取真实入库量, 剩余未开 = 锁定的报单吨位 − 已开货 ([d2f71b4](https://github.com/PolarisTime/Aries/commit/d2f71b4b4f9b81ef73d384114a828d242e60e947))


### Bug Fixes

* **price-compare:** 整单覆盖后回填服务端行 id, 修掉行级保存 400 ([4746322](https://github.com/PolarisTime/Aries/commit/4746322074cdfe6d258aba868660d68a719f0d05))


### BREAKING CHANGES

* 「已开货」与「剩余未开」两列的数据源从"别家报价单的报单占用"
(issuedWeight) 改为"该明细行的真实已开货"(actualWeightTon, 入库审核回写)。
依赖旧数字的下游需按新口径解读。

用户澄清的原始口径: 填报单吨位并锁定后关联订单行, 已开列显示真实开出去多少货,
剩余列显示"我报的量还差多少没开货"。此前三次改口径(10-13 报单−已开、10-14 订货−已开、
10-15 额度−已占用)都在调基准, 却始终把 issuedWeight 当成"已开货" —— 数据源错了, 换基准
只是换一种错法; 这也解释了为什么会出现 −10.02 与"报单请求超额度 21.456"这类读不懂的数字。

- 已开货 = 关联明细行 actualWeightTon(Σ生效入库单过磅重量)合计; null 按 0, 不回退到
  订货量或 issuedWeight;
- 剩余未开 = 本单据报单吨位合计 − 已开货合计, 可为负(已开货是订单行级事实、报单是单据级
  需求, 订单行被多张单据共享或本单只报一部分时必然为负), 按业务要求原样显示负值并标红;
- 订货吨位退回参考位(仅弹层展示), 不再参与剩余未开的减法;
- 选单弹窗继续用 issuedWeight/remainingWeight 判断额度, 不受影响;
- 恢复采购订单明细行的「已开完」手动开关(默认隐藏已开完的行); 该标记是人工裁定,
  与吨位无关, 不根据已开货自动判定;
- 口径仍收敛在 ton-progress-text.ts 单一出口, 渲染/弹层/读屏/列宽四处同源。

验证: 比价与 API 定向集 621 项全绿; 新增区分性用例(报单占用与真实已开货刻意取不同值,
把已开货接回 issuedWeight 或把剩余夹到 0 都必然变红); tsc、biome、eslint、antd lint 均通过。

# [12.1.0](https://github.com/PolarisTime/Aries/compare/v12.0.0...v12.1.0) (2026-10-15)


### Bug Fixes

* **ci:** 修掉阻断 CI 的三类问题: biome 依赖告警 / rc 延迟定时器 / eslint 断言与 async ([7569829](https://github.com/PolarisTime/Aries/commit/756982983f260e7da8d5e10eefbd8db7362b4fa4))
* **price-compare:** 去掉锁定态勾选格右侧那条"蓝色下横线" ([a3b6184](https://github.com/PolarisTime/Aries/commit/a3b6184a502016740e4185ff63c5d85778d8f7bf))
* **price-compare:** 吨位列可隐藏并持久化, 修掉刷新后列显隐复位 ([bff32de](https://github.com/PolarisTime/Aries/commit/bff32de5f2ffa97a33dfbd3bff85f70784add194))
* **price-compare:** 吨位改按「已占用(本单分配+其他单据)」口径, 剩余可开不再出现负值 ([a51cdd3](https://github.com/PolarisTime/Aries/commit/a51cdd36c81697fca7c676454ae2bb7997fbdecb))
* **price-compare:** 拖拽状态收敛到唯一出口 resetDragState, 并让落点线真正画出来 ([2237633](https://github.com/PolarisTime/Aries/commit/2237633b824f104bd39b58fda41730fd4ae63b3b))
* **tabs:** 非激活面板外壳退出布局, 修掉多标签下页面内容整体下移 ([27366ed](https://github.com/PolarisTime/Aries/commit/27366ed8fe383748d9230626b4677a124b284896))


### Features

* **price-compare:** 明细表整行任意位置可拖拽排序 ([eafff41](https://github.com/PolarisTime/Aries/commit/eafff417a8f6206862149168d84279e82548acaf))
* **price-compare:** 项目/批次两行统一为分段控件并分组, 突出当前选中 ([9f621fc](https://github.com/PolarisTime/Aries/commit/9f621fcbadad9d8ac7024abb5ede0083f3af1b2e)), closes [#d9d9d9](https://github.com/PolarisTime/Aries/issues/d9d9d9) [#f0f0f0](https://github.com/PolarisTime/Aries/issues/f0f0f0)


### Performance Improvements

* **theme:** 展开类动效提速, 下拉与浮层不再「慢半拍」 ([52c193f](https://github.com/PolarisTime/Aries/commit/52c193f3ba2b2ef68678e4095454478f87131f66))

# [12.0.0](https://github.com/PolarisTime/Aries/compare/v11.13.1...v12.0.0) (2026-10-15)


* fix(price-compare)!: 吨位两列语义对调 —— 已开吨位显示开出了多少, 剩余未开显示订单还能开多少 ([ee8745c](https://github.com/PolarisTime/Aries/commit/ee8745c229460778145300f5a85421702df8fc84))


### Bug Fixes

* **ci:** 修掉 Lint 门禁的 Biome 3 处与 ESLint 37 处报错 ([2d2d11c](https://github.com/PolarisTime/Aries/commit/2d2d11c56cd246950709017e94a124cd9e2f7eed))
* **e2e:** outputDir 按 run 派生以隔离并发产物 ([98276f2](https://github.com/PolarisTime/Aries/commit/98276f2dcea401a2e16042eeb19ef7f23385e02c))
* **editor:** 编辑器初始化改幂等, 表单重置移到会话清理侧 ([91f5c2c](https://github.com/PolarisTime/Aries/commit/91f5c2cbd398a3550b46eab6cbc1c6ec955b64c9))
* **freight-bill:** 结算方式分段控件按 24 栅格合并两列 ([1070d6a](https://github.com/PolarisTime/Aries/commit/1070d6af400665d670f73d16b29cdc9d0cd01140))
* **market:** 取价基准响应 projectId 收紧为十进制雪花 ID 字符串 ([75f658e](https://github.com/PolarisTime/Aries/commit/75f658ed26b3574f6620b13b59fcb7110021ad51))
* **master-archive:** 补齐项目弹层必填提示的 i18n key ([a8d7e2a](https://github.com/PolarisTime/Aries/commit/a8d7e2a9018915a0797779dcba6b23e96e98f54d))
* **master-data:** 商品版本历史改为弹层对话框并修好表格布局与显示 ([f90e7e1](https://github.com/PolarisTime/Aries/commit/f90e7e12eb91f0b569a20ae5ecdbfa6af82f6d0d))
* **master-options:** 承运商实体下拉解析器补主数据需求标记 ([b7a7e9f](https://github.com/PolarisTime/Aries/commit/b7a7e9f8f5f4554a4045cd1b383a36484f72fb3c))
* **material:** 导入预览与导入结果弹层改为覆盖层容器内尺寸并内部滚动 ([cbcfdf4](https://github.com/PolarisTime/Aries/commit/cbcfdf47c84276a8012ec10e39e0a712776bb9f0))
* **module-system:** 交付核定提示文案改由白名单派生 ([0b42aca](https://github.com/PolarisTime/Aries/commit/0b42aca6470d66f65d178b257a580eb5eac6656d))
* **modules:** 保存回执副标题按动作区分，不再三态共用「编辑成功」 ([f88d948](https://github.com/PolarisTime/Aries/commit/f88d94866b7083c26198f902657dbd74a6ef1671))
* **modules:** 保存回执按提交动作与结果状态区分标题与按钮 ([f19107c](https://github.com/PolarisTime/Aries/commit/f19107cc4ff7dd528656b5060abc7b9b9a16e7f6))
* **modules:** 回执标题动作词与主按钮同源，核定文案改为完成销售 ([3f3dca9](https://github.com/PolarisTime/Aries/commit/3f3dca96f4a8e6736ee2adfe2fb5d7dd5c4dc590))
* **modules:** 项目允许范围提示去重键加入 projectId 并按新项目重判 ([a4b5603](https://github.com/PolarisTime/Aries/commit/a4b5603abe116e2478084f4a36692749018986b3))
* **price-compare:** sr-only 行操作触发器在键盘聚焦时还原可见 ([adcf298](https://github.com/PolarisTime/Aries/commit/adcf298c1e634cb940c10408259d82c06d44873e))
* **price-compare:** 剩余未开吨位列改按关联行合计渲染 ([5ce26fa](https://github.com/PolarisTime/Aries/commit/5ce26fa19d5d8f148deed326890bf8b3223a6194))
* **price-compare:** 吨位关联改三态判定并给出欠额提示 ([31d67f6](https://github.com/PolarisTime/Aries/commit/31d67f61af745e26154243432903275114b77f1e))
* **price-compare:** 吨位短状态与主数据长说明改为键盘可达 ([4d4f7fe](https://github.com/PolarisTime/Aries/commit/4d4f7fe8a8164f55fb939cba2863d3738a33e6d8))
* **price-compare:** 品牌价格列只在订货量覆盖本行报单吨位后才遮蔽 ([67b296a](https://github.com/PolarisTime/Aries/commit/67b296abe3445cbdeb83d6344ccd06abfd84e776))
* **price-compare:** 清除关联与单选不再保留旧关联集合 ([7611ef4](https://github.com/PolarisTime/Aries/commit/7611ef415e8d20c1be7f54822466d4e5aeaf7b10))
* **sales-order:** 取价弹层说明块可折叠, 错误就地替换说明位消除错误态位移 ([b065429](https://github.com/PolarisTime/Aries/commit/b06542995ee5fcd7dc3df9f84245f9b103e6db2d))
* **sales-order:** 取价弹层高度不再随解析状态上下缩放 ([2018430](https://github.com/PolarisTime/Aries/commit/20184304c7ef6632f5e18b5eba74e72733eb9836))
* **styles:** 列表页筛选区到表格的纵向留白被算了两遍 ([c7da681](https://github.com/PolarisTime/Aries/commit/c7da6815a839ed21aebd386e6523f7cfde17a8e0))
* **system:** 权限选择器恢复「过滤时展开命中分组」的派生逻辑 ([002b2a6](https://github.com/PolarisTime/Aries/commit/002b2a64bf86f73a69beed066429a23566448a38))
* **system:** 角色权限选择器过滤期折叠标题改为可操作 ([a3d2121](https://github.com/PolarisTime/Aries/commit/a3d21212e7de359df48ee1b2f9dc5c6d7761c771))
* **tabs:** 右键菜单不再激活被右键标签并修正焦点归还 ([cb156a5](https://github.com/PolarisTime/Aries/commit/cb156a5a05df9e2c9652100cdaefd4aad6392b74))
* **tabs:** 深链标签初始化竞态收口, hydrate 前移并统一幂等建标签入口 ([c485637](https://github.com/PolarisTime/Aries/commit/c4856378aae00ba765253b5e02a721160ff59985))
* **tabs:** 深链落地标签转非激活时不再卸载重建面板 ([8fe9430](https://github.com/PolarisTime/Aries/commit/8fe943034a560ce3c1faf2a0b2a740f237c11817))
* **tabs:** 超限淘汰的受保护标签不再被重载截断 ([3c7edc8](https://github.com/PolarisTime/Aries/commit/3c7edc8dcea4d7a63cb3fbb6ea664c9496f183a8))
* **version:** 编译时间注入改为单一来源并对占位值免疫, 渲染口径收敛到一处 ([33af601](https://github.com/PolarisTime/Aries/commit/33af601f3a52ee1a7d26e962a13744f087b8c13d))
* **表格:** 明细行序从「上游导入锁定」里取出, 销售订单编辑态可拖动排序 ([2c15001](https://github.com/PolarisTime/Aries/commit/2c15001e3b557cc8c4bf42953965f49bd8ff911a))
* **表格:** 编辑器明细列支持声明式自定义渲染(renderInEditor) ([dcb37ff](https://github.com/PolarisTime/Aries/commit/dcb37ffb975a306892c05284194a9103152cb95d))


### Features

* **freight-bill:** 新建物流单增加结算方式（按吨位 / 固定运费） ([543bb2c](https://github.com/PolarisTime/Aries/commit/543bb2c04ac9fc35c5e671f2d3592454deb38df3))
* **master-data:** 新增取价地区与定尺加价维护页 ([88e555c](https://github.com/PolarisTime/Aries/commit/88e555c351893ce77879c2577d7f417254cd682a))
* **modules:** 打印明细行补单指针重排替代与中文读屏播报 ([890a813](https://github.com/PolarisTime/Aries/commit/890a81368240cf9d3da6501c01a0a103cdc99023))
* **price-compare:** 关联采购订单时按行的材质/规格/长度自动筛选候选明细行 ([26ae969](https://github.com/PolarisTime/Aries/commit/26ae9697aeef349093f5268bf8fd82fcfe5ac996))
* **price-compare:** 吨位两列改按关联行合计计算(支持一行挂多张明细行) ([7215141](https://github.com/PolarisTime/Aries/commit/7215141f27daf38201ef16b535b4a1836d73eae9))
* **price-compare:** 吨位关联打通多张订单明细行(模型/接口/累计口径) ([ac10f4c](https://github.com/PolarisTime/Aries/commit/ac10f4c96564b29316f0ae372d5d01f0a178433c))
* **price-compare:** 选单器支持勾选多张订单明细行并自动分摊吨位 ([7c687e7](https://github.com/PolarisTime/Aries/commit/7c687e7f138d43ac366c5f540725b9863663adbb))
* **row-drag:** 明细排序补可点击上移下移并把键盘统一到 Space/Enter 状态机 ([c80cdd8](https://github.com/PolarisTime/Aries/commit/c80cdd8c7f02c792dfa753bea7c6e18831a53c12))
* **sales-contract:** 销售合同增加附件功能 ([1dd2953](https://github.com/PolarisTime/Aries/commit/1dd2953e6cae64cbe04af3b3185266a9c38c71f0))
* **sales-order:** 草稿订单支持整单去网价并提示网价匹配状态 ([1cde6f7](https://github.com/PolarisTime/Aries/commit/1cde6f70a55cd2f48590c5af61abdb9a98fe4203))
* **tabs:** 标签右键菜单补齐关闭左侧与固定标签页 ([2be89fe](https://github.com/PolarisTime/Aries/commit/2be89fe05893ed57c09ceeb6b1b371b009fd56df))
* **tabs:** 非激活面板接入 React Activity, 隐藏态与会话生命周期收口 ([600fbb3](https://github.com/PolarisTime/Aries/commit/600fbb3d649eabba2e7ca56df6b0a79b4832f2eb))
* **value-alias:** 新增值映射/别名维护页 ([4ab0df8](https://github.com/PolarisTime/Aries/commit/4ab0df8f84d88c179038fd25df65d07108b4b7d3))
* **表格:** 可编辑明细表支持整行长按拖动排序(共享能力, 先落地模块编辑器) ([e228151](https://github.com/PolarisTime/Aries/commit/e228151238b5a48783d25b2b4580bc762ca419e9))
* **表格:** 附加费用明细接入整行长按拖动(去掉假抓手)并补网格行封装 ([fcf4447](https://github.com/PolarisTime/Aries/commit/fcf4447a11b9784e79a0422e95df76261b8556e2))


### BREAKING CHANGES

* 「已开吨位」与「剩余未开吨位」两列的口径互换, 依赖旧数字的下游需按新口径解读。

原口径下「已开吨位」只显示**其他**报单占用量, 于是关联了有效订单明细行之后这一列常年是
0.000, 而「未开吨位」显示的是"本单报单 − 其他报单"—— 用户直读语义完全对不上:
已经开出的货没有出现在"已开"列里。

新口径(业务确认):
- 已开吨位 = 本单据该明细行报单吨位合计 + 其他已保存报单占用(服务端 issuedWeight 只含"其他")
- 剩余未开吨位 = 订货吨位 − 已开吨位(负值 = 这条明细行被超开, 唯一需要干预的状态)

因此:
- 三列并排即为「报单吨位」(本行报了多少) →「剩余未开吨位」(订单还能开多少) →「已开吨位」(开出了多少)
- 标红条件从"已开 > 本单报单"改为"已开合计 > 订货吨位"(超开)
- ⓘ 弹层与悬浮明细行序同步: 本单报单 → 其他报单已开 → 已开吨位 → 剩余未开 → 订货吨位 → 品牌
- 口径说明文案改写; 列宽按新文案重算(已开列含品牌、剩余列只放数字)
- 全部相关断言按新口径重写(含边界: 已开恰好等于订货量 ⇒ 剩余 0 不标红)

验证: 356 项比价用例与全量 2040 项通过; 真实环境表头实测为「报单吨位 | 剩余未开吨位 | 已开吨位」。

## [11.13.1](https://github.com/PolarisTime/Aries/compare/v11.13.0...v11.13.1) (2026-10-13)


### Bug Fixes

* **price-compare:** 吨位弹层未开吨位改回「本单报单 − 已开」, 与相邻列同口径 ([e17fea3](https://github.com/PolarisTime/Aries/commit/e17fea30f44626cf1dc97d3369a41c85d90edcea))
* **tabs:** 超限指示器移出 tablist, 修掉 tabBarExtraContent 的 aria-required-children 违规 ([438ca87](https://github.com/PolarisTime/Aries/commit/438ca87df22492d8591bf8680554beeba5db979c)), closes [react-component/tabs#1013](https://github.com/react-component/tabs/issues/1013) [antd#49502](https://github.com/antd/issues/49502) [antd#53584](https://github.com/antd/issues/53584)

# [11.13.0](https://github.com/PolarisTime/Aries/compare/v11.12.0...v11.13.0) (2026-10-13)


### Bug Fixes

* **hooks:** pre-commit 的 react-doctor 加 --no-telemetry, 修复提交无限挂起 ([59fc49c](https://github.com/PolarisTime/Aries/commit/59fc49cd0ff0468d27dcea9d05e1f612f83e7518))
* **styles:** 接入苹方 500/600/700 真字面并子集化, 三个字重合计比原先更小 ([bc9cfc3](https://github.com/PolarisTime/Aries/commit/bc9cfc38ed32ce112513e0c713f313592d2662db))
* **styles:** 苹方字体补全中文回退链, 避免未安装苹方时落到浏览器默认字体 ([4fbc9c2](https://github.com/PolarisTime/Aries/commit/4fbc9c2ce201d4aed57e94224683f0719d4ea6b9))
* **tabs:** 批量关闭确认框取消后不再切走当前标签 ([79eeeba](https://github.com/PolarisTime/Aries/commit/79eeebaf1735932bc4f303ad14506e41469b1096))
* **tabs:** 标签超上限淘汰不再静默丢弃未保存内容 ([cedcfda](https://github.com/PolarisTime/Aries/commit/cedcfda3fbea9210e05fdfd9e79a0e22b528156b))
* **tabs:** 面板外壳常驻修复 ARIA 悬空引用, 键盘关闭交还框架 ([8c373b5](https://github.com/PolarisTime/Aries/commit/8c373b52f5ba2b28840fb0fd34bfd1da952a255c))


### Features

* **master-data:** 主数据编辑弹层按语义分区, 与项目资料页排版对齐 ([b55c301](https://github.com/PolarisTime/Aries/commit/b55c30169e0685fdbd1190140172b439c7ad47d9))
* **tabs:** 补齐标签超限的用户可见反馈与中英文案 ([8c72f36](https://github.com/PolarisTime/Aries/commit/8c72f368790a1649a8bc5a49b86e1f8a4834e598))
* **tabs:** 重建标签与真实内容面板的 ARIA 关联并补 Delete 关闭 ([4eaec13](https://github.com/PolarisTime/Aries/commit/4eaec13e4cc41a6f377397e1d7ec44ea4eae995a))

# [11.12.0](https://github.com/PolarisTime/Aries/compare/v11.11.0...v11.12.0) (2026-10-13)


### Bug Fixes

* **price-compare:** 未开吨位改按「锁定后的报单吨位 − 已开吨位」, 订货量退回参考位 ([289c1c4](https://github.com/PolarisTime/Aries/commit/289c1c4c74c5c66cb0132bd25dc1d64e2125ac33))


### Features

* **price-compare:** 吨位口径两列未关联时给出「未关联/已删除」短状态 ([524e298](https://github.com/PolarisTime/Aries/commit/524e2989b564deb924aa99ae8a9e53c5e2473585))
* **sales-order:** 交付核定状态允许编辑报单日期 ([6b85cf5](https://github.com/PolarisTime/Aries/commit/6b85cf5425bff448fd9cd14ab1a08dfd5e7484df))

# [11.11.0](https://github.com/PolarisTime/Aries/compare/v11.10.1...v11.11.0) (2026-10-13)


### Bug Fixes

* **price-compare:** 剩余吨位改按「本单报单吨位 − 已开吨位」口径, 修正报 12 吨被判超额 ([aef9b44](https://github.com/PolarisTime/Aries/commit/aef9b4444351d52ca2b217479b05b5e0cac64414))


### Features

* **price-compare:** 吨位列拆成报单吨位/已开吨位/未开吨位三列 ([121dcf2](https://github.com/PolarisTime/Aries/commit/121dcf2b413c2511ad8d5f2a390c3866fb73dd51))

## [11.10.1](https://github.com/PolarisTime/Aries/compare/v11.10.0...v11.10.1) (2026-10-13)


### Bug Fixes

* **module-system:** 主数据下拉需求判定改用打包安全标记 ([3760dbc](https://github.com/PolarisTime/Aries/commit/3760dbc1065b90fc6ef0a2668fa514fab780dbe5))
* **module-system:** 修复编辑器表单控件非受控导致下拉值不进表单 ([7319feb](https://github.com/PolarisTime/Aries/commit/7319feb0a7c05ebad136b7b42f759cccd83e7e66))

# [11.10.0](https://github.com/PolarisTime/Aries/compare/v11.9.0...v11.10.0) (2026-10-13)


### Features

* **sales-order:** 手工加行/改品牌材质时即时提示项目允许范围 ([75ba02b](https://github.com/PolarisTime/Aries/commit/75ba02b663f920e6d04cf2c1bbfe46231a1713bb))

# [11.9.0](https://github.com/PolarisTime/Aries/compare/v11.8.0...v11.9.0) (2026-10-12)


### Features

* **sales-order:** 新增可编辑的报单日期字段(默认落单当天) ([ffb2a8c](https://github.com/PolarisTime/Aries/commit/ffb2a8c79a982be8817a7dece804d8e36ff58181))

# [11.8.0](https://github.com/PolarisTime/Aries/compare/v11.7.0...v11.8.0) (2026-10-12)


### Features

* **sales-order:** 项目取价基准配置与交付核定按日期自动取价 ([5ce01a8](https://github.com/PolarisTime/Aries/commit/5ce01a853856f7d28b3efce69224141b678f4b47))

# [11.7.0](https://github.com/PolarisTime/Aries/compare/v11.6.0...v11.7.0) (2026-10-12)


### Bug Fixes

* **market-sync:** 覆盖矩阵把有行情的调休上班日显示成休市 ([a5ed2dd](https://github.com/PolarisTime/Aries/commit/a5ed2ddf06c1cb818b24ce12108407d4ee6f2bf9))
* **price-compare:** 吨位列按单据实际内容定宽, 已开进度与品牌完整显示 ([51a60b4](https://github.com/PolarisTime/Aries/commit/51a60b46856bbae083caf2ab7c18013245e663ab))
* **price-compare:** 小字号档吨位进度比值被省略号截断 ([a148171](https://github.com/PolarisTime/Aries/commit/a1481714f5fe76bb32aaa6ef5964210e17d78e6a))


### Features

* **market-sync:** 按后端休市标记渲染休市, 并清掉 React Compiler 违规 ([624dcf7](https://github.com/PolarisTime/Aries/commit/624dcf70142ecd8b768e19df01847b66eef8fa34))
* **project:** 项目资料支持维护允许品牌与材质并在导入采购订单时预警 ([12ab046](https://github.com/PolarisTime/Aries/commit/12ab046446059dcb49cdbc69789a4f510b82e16b))
* **project:** 项目资料支持配置允许范围的处理方式并据此阻断或提醒导入 ([d5f04f6](https://github.com/PolarisTime/Aries/commit/d5f04f61327e680fe76a1654b8b7a0044549eeb0))

# [11.6.0](https://github.com/PolarisTime/Aries/compare/v11.5.0...v11.6.0) (2026-10-10)


### Bug Fixes

* **purchase-pickup-list:** 修复换成 MouseSensor 后鼠标整行拖动没接线 ([830b662](https://github.com/PolarisTime/Aries/commit/830b662914ecfc8e2568876f14979336922b4408))


### Features

* **purchase-pickup-list:** 移除可见操作图标与拖动手柄，改为整行拖动 ([5c6a489](https://github.com/PolarisTime/Aries/commit/5c6a489998d22804f9860d25b35b0d4d986bb551))

# [11.5.0](https://github.com/PolarisTime/Aries/compare/v11.4.0...v11.5.0) (2026-10-10)


### Bug Fixes

* **price-compare:** 修复低分辨率下报单比价无法向下滚动 ([6fc10d3](https://github.com/PolarisTime/Aries/commit/6fc10d3b68629204b509bef33bbf40050bae188f)), closes [#price-compare-root](https://github.com/PolarisTime/Aries/issues/price-compare-root)
* **price-compare:** 锁定规格和数量后无法关联采购订单 ([d015ed4](https://github.com/PolarisTime/Aries/commit/d015ed45b6f51b9274e2b9de8861ada8d0462912))


### Features

* **market:** 重做行情同步页布局与覆盖矩阵 ([9226169](https://github.com/PolarisTime/Aries/commit/9226169cb55058f73cfc630ba0fbe74d656700f1))
* **purchase-order:** 采购订单新增强制结单入口与结单标记 ([d77b9f6](https://github.com/PolarisTime/Aries/commit/d77b9f6ea78e713ac700786b5e1989518fc4b71b))

# [11.4.0](https://github.com/PolarisTime/Aries/compare/v11.3.1...v11.4.0) (2026-10-09)


### Features

* **market:** 补数结果区展示跳过天数与跳过日期，进度按区间总天数计算 ([78e5082](https://github.com/PolarisTime/Aries/commit/78e5082ee62bfbabf92e68560723e8a03be61242))
* **price-compare:** 报单比价展示保存时间与版本 ([c83cf35](https://github.com/PolarisTime/Aries/commit/c83cf35edb8bae214e0b0ca4681cdc65991a5063))

## [11.3.1](https://github.com/PolarisTime/Aries/compare/v11.3.0...v11.3.1) (2026-10-08)


### Bug Fixes

* **price-compare:** 修复下拉选项被省略号截断 ([0b4e30b](https://github.com/PolarisTime/Aries/commit/0b4e30b8ead67b5300c487c01e4b84b351d6c228))

# [11.3.0](https://github.com/PolarisTime/Aries/compare/v11.2.0...v11.3.0) (2026-10-08)


### Features

* **react:** 修正采购订单引用图标并新增单据流入口 ([d809f01](https://github.com/PolarisTime/Aries/commit/d809f01c11650d0155f20c1bdd0c8cf8e8ebc488))
* **react:** 单据流向图可读性优化 ([a411600](https://github.com/PolarisTime/Aries/commit/a41160067934ddc6c7576f4267f981aaf66e243f))
* **react:** 采购订单展示实际货值、差额与入库进度 ([62d1ead](https://github.com/PolarisTime/Aries/commit/62d1ead117d34d4bb0abb1e641e7347e0744715f))
* **react:** 采购订单展示未入库件数并统一明细展开图标 ([e946ba8](https://github.com/PolarisTime/Aries/commit/e946ba8cc6fdf5783ebce741ee29a7e31c632aca))

# [11.2.0](https://github.com/PolarisTime/Aries/compare/v11.1.2...v11.2.0) (2026-10-07)


### Features

* **project:** 取价地区下拉支持搜索 ([c035694](https://github.com/PolarisTime/Aries/commit/c035694be9614a4a73fa571a96ee74554e4f8752))

## [11.1.2](https://github.com/PolarisTime/Aries/compare/v11.1.1...v11.1.2) (2026-10-07)


### Bug Fixes

* **project:** 取价地区下拉改为读取后端动态地区 ([9090d5d](https://github.com/PolarisTime/Aries/commit/9090d5dd64fb0df5b8f3f9c9be1ae47084d93c98))

## [11.1.1](https://github.com/PolarisTime/Aries/compare/v11.1.0...v11.1.1) (2026-10-07)


### Bug Fixes

* **layouts:** 面包屑跳转由整页重载改为客户端路由 ([2b39417](https://github.com/PolarisTime/Aries/commit/2b3941710f43f261388be9685ce8e5d6762f104e))
* **price-compare:** 简称列加宽到能完整显示 4 个汉字 ([ba8046b](https://github.com/PolarisTime/Aries/commit/ba8046b73fc92877bb6cdfcd5ef3f86562223788))

# [11.1.0](https://github.com/PolarisTime/Aries/compare/v11.0.1...v11.1.0) (2026-10-03)


### Features

* **constants:** 同步后端错误码 IDEMPOTENCY_CONFLICT 与 SERVICE_UNAVAILABLE ([e8db8a6](https://github.com/PolarisTime/Aries/commit/e8db8a6199e00e0321d4468db2a3080f4c3046d5))

## [11.0.1](https://github.com/PolarisTime/Aries/compare/v11.0.0...v11.0.1) (2026-09-29)


### Bug Fixes

* **modules:** 修复选单器滚动时表格固定列穿透筛选与已选面板 ([3753577](https://github.com/PolarisTime/Aries/commit/37535779b03801bf5f353ce4c19eb8c96a8480a0))
* **tabs:** 未挂载页签不再丢失跳转携带的一次性意图 ([d3ec440](https://github.com/PolarisTime/Aries/commit/d3ec44095ee105256afe89de49f3eca3226e88d1))


### Reverts

* **pricelist:** 回退供应商价格表改造, 比价恢复手填现货价与供应商 ([0016e49](https://github.com/PolarisTime/Aries/commit/0016e497ff66111c7e1158dc190975e72219054d))

# [11.0.0](https://github.com/PolarisTime/Aries/compare/v10.37.0...v11.0.0) (2026-09-28)


* refactor(master-data)!: 供应商价格表矩阵转置为「品牌标签页 + 供应商列」 ([d55111a](https://github.com/PolarisTime/Aries/commit/d55111a0193acd6b583f051acc36b29af199f2e6))
* refactor(price-compare)!: 删除「一键填入供应商」入口与保存载荷 prices[] ([b5f4804](https://github.com/PolarisTime/Aries/commit/b5f4804789b79cfb5b4dbbed2a2c5e3c2e139917))
* refactor(price-compare)!: 删除现货价手填覆盖, 现货列改为只读展示 ([cc1d2a0](https://github.com/PolarisTime/Aries/commit/cc1d2a0eea91f995c632e0af1ee30f7be0aef156))


### Features

* **master-data:** 供应商价格表改为供应商标签页 + 品牌矩阵并取消版本 ([9104970](https://github.com/PolarisTime/Aries/commit/91049704a788b79152419c8693db78a2a6bcae73))


### BREAKING CHANGES

* 比价页品牌列头不再有「一键填入供应商」入口, 供应商无法再人工填入;
单据保存(整体保存与行级保存)请求体不再携带 prices[], 现货价与来源供应商只由供应商
价格表在读取时推导。
* 比价页不再支持手填现货价覆盖与「恢复为价格表价」, 旧覆盖接口
PUT/DELETE /quote-sheets/{sheetId}/items/{itemId}/price-overrides/{brandName}
在前端不再调用(后端已删除, 返回 404); 已落库的手填价彻底不再参与读路径。
* 价格表维护页的矩阵轴向与上一版相反——页级维度由供应商改为品牌，
列由品牌改为供应商。数据键不变（仍是 供应商 + 品牌 + 类别 + 材质 + 规格 + 长度 → 单价），
后端无 schema 变化；仅前端视图转置，旧的「供应商标签页 + 品牌列」界面不再提供。

- 顶部改为**品牌标签页**（已有价格表的品牌 + 「新增品牌价格表」入口，新建时选品牌名 + 供应商），
  标签上带该品牌下已维护的供应商数。
- 表格左侧固定只读列 `类别/材质/规格(直径)/长度`（来自 spec-catalog）不变；
  右侧每个**供应商**一列，列头是供应商名 + 已填数，列内只填该供应商对该品牌的单价。
- 默认供应商列 = 经营品牌包含该品牌（md_supplier_brand，经供应商选项接口带出的 brands）
  且尚无该品牌价格表者，避免几十个空列；其余供应商可手工添加列或整块粘贴。
- 单元格留空 = 不报价（提交 null，绝不写 0），失焦即按该（供应商, 品牌）表全量替换提交；
  首次填价时 POST 建表，同键已存在由后端 409，前端兜底取回现表后改用 PUT。
- **整表加减放到列头菜单**（一次只作用于该供应商的这张价格表）：保留先预览、跳过不报价条目、
  负数阻断、未落库的价提示先保存；不发明跨供应商批量接口。
- TSV 粘贴支持两种模式：按列粘贴（选定供应商列）与整块粘贴（供应商 / 材质 / 规格 / 长度 / 单价，
  按供应商名拆列后各自落表；识别不到的供应商名单独提示且不写入）。
- 仍**没有版本**：无发布时刻/生效区间/ACTIVE-ARCHIVED/状态列/备注列，展示改用更新时间。
- 键盘与无障碍：单价列内 Tab/Shift+Tab 纵向连续录入，单价单元格可访问名带供应商 + 行规格，
  列头菜单触发器 role=button + tabIndex=0（Shift+F10/Enter/Space 打开）、≥24×24，
  「不报价/未填写」用文字标记而非只靠颜色（WCAG 1.4.1 / 2.5.8）。
- 文件重命名：SupplierPriceListMatrixEditor.tsx → SupplierPriceListBrandMatrixEditor.tsx（含 spec）。

验证：pnpm typecheck 通过；pnpm lint 0 error；pnpm antd:lint "No issues found"；
pnpm vitest run 全量 232 文件 / 1810 用例全绿。

# [10.37.0](https://github.com/PolarisTime/Aries/compare/v10.36.0...v10.37.0) (2026-09-28)


### Features

* **deploy:** 新增镜像端口 Nginx 安装脚本(默认 7777 + TLS) ([db19ef6](https://github.com/PolarisTime/Aries/commit/db19ef6191fffef1fc528fc5b86c443e979895ec))

# [10.36.0](https://github.com/PolarisTime/Aries/compare/v10.35.0...v10.36.0) (2026-09-28)


### Features

* **modules:** 行右键菜单新增单条审核与反审核 ([ce7f04d](https://github.com/PolarisTime/Aries/commit/ce7f04da18cf5db95e8934fb725afce0921fa58f))
* **price-compare:** 现货价改由供应商价格表自动带出并支持显式手填覆盖 ([8a319e2](https://github.com/PolarisTime/Aries/commit/8a319e2163f51ea0f928d26308d37305e940a581))

# [10.35.0](https://github.com/PolarisTime/Aries/compare/v10.34.0...v10.35.0) (2026-09-28)


### Features

* **api:** 新增供应商品牌价格表 API 与编辑器纯逻辑 ([895b532](https://github.com/PolarisTime/Aries/commit/895b5322e2cb518cefba42c7b9b6399dcc032253))
* **master-data:** 新增供应商价格表维护页与固定规格全集编辑器 ([9843f16](https://github.com/PolarisTime/Aries/commit/9843f16092b916f06b9f964d0bc6c4b10b3f111d))
* **router:** 注册供应商价格表页面路由与中英文案 ([10c1c5a](https://github.com/PolarisTime/Aries/commit/10c1c5aa0bfdcb7275a845ec2933310ca9f42052))

# [10.34.0](https://github.com/PolarisTime/Aries/compare/v10.33.2...v10.34.0) (2026-09-28)


### Bug Fixes

* **price-compare:** 深色超额色覆盖规则移到基准规则之后 ([7b991f0](https://github.com/PolarisTime/Aries/commit/7b991f01815dbe9bceae436617fbf0142b039609)), closes [#ff7875](https://github.com/PolarisTime/Aries/issues/ff7875) [#d9363e](https://github.com/PolarisTime/Aries/issues/d9363e)


### Features

* **price-compare:** 现货价接入供应商价格表推导结果 ([2bc1524](https://github.com/PolarisTime/Aries/commit/2bc1524fceec9d691c2bb2a93a30314099ccfc02))

## [10.33.2](https://github.com/PolarisTime/Aries/compare/v10.33.1...v10.33.2) (2026-09-28)


### Bug Fixes

* **price-compare:** 吨位气泡改不透明浮层底色, 修复半透明与重影 ([d17b09f](https://github.com/PolarisTime/Aries/commit/d17b09f003c89af8a8dc0cbd0f20b9c26eec24c2))

## [10.33.1](https://github.com/PolarisTime/Aries/compare/v10.33.0...v10.33.1) (2026-09-28)


### Bug Fixes

* **price-compare:** 吨位列改单行紧凑显示并加宽数字列 ([0ae35b7](https://github.com/PolarisTime/Aries/commit/0ae35b70a7f6c1f27939fde95e00017fe10996ed))

# [10.33.0](https://github.com/PolarisTime/Aries/compare/v10.32.0...v10.33.0) (2026-09-28)


### Bug Fixes

* **a11y:** 复选框中文可访问名、搜索按钮名与列表选择语义 ([c11a2c1](https://github.com/PolarisTime/Aries/commit/c11a2c1d919c8039d2bf8c017196a9b8c124365e))


### Features

* **components:** 新增右键菜单基元与列头/行菜单键盘交互 ([24aa3f0](https://github.com/PolarisTime/Aries/commit/24aa3f08af8c1c13bb5a0a3196278ddbcc0e46a6))
* **export:** 导出选中改为服务端按记录 id 生成 xlsx ([825669b](https://github.com/PolarisTime/Aries/commit/825669b8efa7e85aac18ebe6430cc76e0970bd66))
* **modules:** 列表去操作列并补齐批量/编辑器便利性 ([a3fee79](https://github.com/PolarisTime/Aries/commit/a3fee79cc3d03b016137bb58274e336d7bbb068a))
* **price-compare:** 锁定层级、列宽自适应与吨位品牌展示 ([18aed4e](https://github.com/PolarisTime/Aries/commit/18aed4eb32dcc95e27c6f0999000baa1c9e8691e))

# [10.32.0](https://github.com/PolarisTime/Aries/compare/v10.31.0...v10.32.0) (2026-09-27)


### Bug Fixes

* **components:** 菜单内 Tab/Shift+Tab 关闭菜单并把焦点交还页面 ([ba7ac94](https://github.com/PolarisTime/Aries/commit/ba7ac9477176b749fa9fcfb7d81d08a05dc1f06e))
* **master-data:** 「列设置」弹层改为 click 触发, 修复列头菜单项点不开 ([99e8189](https://github.com/PolarisTime/Aries/commit/99e8189a78448deeeea4e7eb7af86d6e55f9067a))
* **modules:** 批量删除确认框列出将被删除的单据号 ([3192109](https://github.com/PolarisTime/Aries/commit/31921090e7e0d83f4e3da59e32cdf670fce77893))
* **right-click:** 修掉列头移序边界、比价分隔行右键与虚拟行组件三处缺陷 ([ebd6ca0](https://github.com/PolarisTime/Aries/commit/ebd6ca0308850e695d061a72de0702b5be858da0))


### Features

* **components:** 列头菜单键盘可达, 比价品牌列头改用共享基元 ([69932e1](https://github.com/PolarisTime/Aries/commit/69932e14fba3b2003a016c3f40d40229878bddcb))
* **components:** 新增 ContextMenu 基元并补齐标签栏右键菜单键盘契约 ([b41b214](https://github.com/PolarisTime/Aries/commit/b41b214966886048ef3d24f6095c2f6630902abb))
* **master-data:** 基础数据与资料表列头支持右键菜单 ([b75220a](https://github.com/PolarisTime/Aries/commit/b75220a83595abf7407c55bf9ee9f3184f2e16c5))
* **modules:** 便利性第一批: 保存快捷键、复制本行、复制单号、附件拖拽多传、导出选中 ([8014326](https://github.com/PolarisTime/Aries/commit/801432661cf654799035f177c2b2f345dc192bc9))
* **modules:** 右键同步选中态, 并为隐藏列与列设置重置补反馈 ([7db48ca](https://github.com/PolarisTime/Aries/commit/7db48ca56400510c892ec185caf135bd24b2ce08))
* **modules:** 行尾恢复可见「更多」按钮, 与行右键共用同一份菜单 ([b3d6da4](https://github.com/PolarisTime/Aries/commit/b3d6da403265cf07fe308b6c0d8ec8cb426fde0d))
* **modules:** 通用业务列表列头支持右键菜单 ([68da5c9](https://github.com/PolarisTime/Aries/commit/68da5c9ce5f794d205ddc9ee19215853aad35fa3))
* **modules:** 通用业务列表行支持右键菜单 ([9568a14](https://github.com/PolarisTime/Aries/commit/9568a14e694de43d2fd2084059d49c2af55ec691))
* **price-compare:** 报单比价数据行与品牌列头支持右键菜单 ([5dd68dd](https://github.com/PolarisTime/Aries/commit/5dd68dd2305e9b61862f57bf084f15e55e995297))
* **purchase-order-pickup-list:** 提货清单明细行与分组头支持右键菜单 ([5334f43](https://github.com/PolarisTime/Aries/commit/5334f43cebe420acb8bfcb86fcad341c7b8f1720))

# [10.31.0](https://github.com/PolarisTime/Aries/compare/v10.30.2...v10.31.0) (2026-09-27)


### Bug Fixes

* **i18n:** antd 语言包以官方 zh_CN 为基底, 修复中文界面下的英文回落 ([8c25e93](https://github.com/PolarisTime/Aries/commit/8c25e93e842961bd1486431885ece801e7597dc3))
* **price-compare:** 修复吨位/现货列的键盘焦点陷阱, 现货价与供应商列恢复 Tab 可达 ([bb2e738](https://github.com/PolarisTime/Aries/commit/bb2e7383d70a884f0901b5983b45525781d35d06))
* **price-compare:** 拖动调整行顺序后刷新不再恢复原顺序 ([35b5f93](https://github.com/PolarisTime/Aries/commit/35b5f93f8cadb1fe95a4698e6fbf14a975e5c965))
* **price-compare:** 编辑锁不再 fail-open, 并给 409 锁冲突补"放弃本地改动并重载"出口 ([c81f044](https://github.com/PolarisTime/Aries/commit/c81f044490e349add30638b09b21397f923bdae7))
* **price-compare:** 补齐表格无障碍名称与 24px 命中区并修正低对比度文字 ([ac69c9d](https://github.com/PolarisTime/Aries/commit/ac69c9d2451daf0490f36c1a09093043e6065ccd))
* **price-compare:** 采购订单明细入口与选择弹窗改为键盘可达 ([62bae3a](https://github.com/PolarisTime/Aries/commit/62bae3a97082d692d5c861b39bc3dc667c70fc4c))
* **purchase-pickup-list:** 「拆分数量」操作列移到拖动列右侧 ([f92a707](https://github.com/PolarisTime/Aries/commit/f92a70789cf3051b581b2415475b749bcb993618))


### Features

* **price-compare:** 保存状态可见并拦截未保存的标签页关闭 ([c83b719](https://github.com/PolarisTime/Aries/commit/c83b719390787465b87de1f22f2e7911699b8844))

## [10.30.2](https://github.com/PolarisTime/Aries/compare/v10.30.1...v10.30.2) (2026-09-27)


### Bug Fixes

* **price-compare:** 「添加一行」恢复为直接追加空行, 商品在行内搜索选择 ([4704a6a](https://github.com/PolarisTime/Aries/commit/4704a6a9f2898504d01a26e05d6482d9f82ed337))
* **price-compare:** 行级锁定收入「更多操作」菜单, 取消常驻锁图标 ([db1e541](https://github.com/PolarisTime/Aries/commit/db1e5410038c3a8180e7ed7b04b649c3129238c0))

## [10.30.1](https://github.com/PolarisTime/Aries/compare/v10.30.0...v10.30.1) (2026-09-27)


### Bug Fixes

* **deps:** 修复前端传递依赖安全漏洞 ([c55b130](https://github.com/PolarisTime/Aries/commit/c55b130c92e123cd699dc936892b91b8e957e19b))
* **i18n:** 修复生产构建页面标题为 undefined 导致标签页显示路由路径 ([3583a59](https://github.com/PolarisTime/Aries/commit/3583a59b5bff16dc3157b931268d5096f3d47d72))

# [10.30.0](https://github.com/PolarisTime/Aries/compare/v10.29.0...v10.30.0) (2026-09-26)


### Bug Fixes

* **observability:** 业务错误日志改走 logger 上报 Sentry, 性能指标不再用 error ([be4f466](https://github.com/PolarisTime/Aries/commit/be4f466cc0b8aeb52d5e657667cd6a754c42ad15))
* **react:** 修复 AppResult 子元素间距被 antd 覆盖失效 ([08a32d8](https://github.com/PolarisTime/Aries/commit/08a32d8f7c04b1d72a88ac47523ce284f366471b))
* **react:** 修复保存失败/锁冲突时 toast 叠加 ([464a53e](https://github.com/PolarisTime/Aries/commit/464a53e64bb659dc2029b0f3c395a20f7ad8221e))
* **react:** 区分瞬时/持久未保存, 避免误报服务器有更新 ([a736fc2](https://github.com/PolarisTime/Aries/commit/a736fc2cfa230a5db248bcf810a2a4fee9551ae2))
* **react:** 单独切换行锁定未落库 ([15a6032](https://github.com/PolarisTime/Aries/commit/15a6032003deac67da30c770987ffdda2e9f01e2))
* **react:** 批量填入供应商改为按现货价实际变动判定 ([7d1ec42](https://github.com/PolarisTime/Aries/commit/7d1ec42e7f237cbe4f32c268ff518ed1f7412277))
* **react:** 解锁行未下发 locked=false 导致解锁不落库 ([0f55d7f](https://github.com/PolarisTime/Aries/commit/0f55d7f77af21d4cff79b121efe16bbceb97eb5d))
* **system:** 权限矩阵剔除全局通配 * 分组 ([8d26313](https://github.com/PolarisTime/Aries/commit/8d263139a0bb20114c9e73d335fb42fad8922e9b))


### Features

* **price-compare:** 吨位按规格关联采购订单明细行, 添加行改下拉选商品 ([4b9ce97](https://github.com/PolarisTime/Aries/commit/4b9ce973b0f034a8e0c4c65134f69a9c0ff93b26))
* **print:** 打印模板按项目记忆上次选择 ([c4fd03a](https://github.com/PolarisTime/Aries/commit/c4fd03ad48bd666b20320912e3e43956d070cacb))
* **react:** 报价明细行级锁定与关联门禁 ([7eab5c0](https://github.com/PolarisTime/Aries/commit/7eab5c00173233ecfa6f36d2153a909668a32592))

# [10.29.0](https://github.com/PolarisTime/Aries/compare/v10.28.2...v10.29.0) (2026-09-24)


### Features

* **layout:** 新增全局面包屑导航, 与多标签页导航互补 ([35f1298](https://github.com/PolarisTime/Aries/commit/35f1298ce2c8b54c02f892d7d73f02770119bae3))

## [10.28.2](https://github.com/PolarisTime/Aries/compare/v10.28.1...v10.28.2) (2026-09-24)


### Bug Fixes

* **modules:** 自动打开详情意图打开后清除 openDetail, 避免重复弹开 ([e35d796](https://github.com/PolarisTime/Aries/commit/e35d7964aed55a08715edcdf6dcb1f03442ca22a))

## [10.28.1](https://github.com/PolarisTime/Aries/compare/v10.28.0...v10.28.1) (2026-09-24)


### Bug Fixes

* **purchase:** 前往采购入库不再重复填入上次明细 ([eb7bcb3](https://github.com/PolarisTime/Aries/commit/eb7bcb309f7964ac53f2ed976f51604d08f2b212))

# [10.28.0](https://github.com/PolarisTime/Aries/compare/v10.27.0...v10.28.0) (2026-09-24)


### Features

* **purchase:** 提货清单拆分改为弹窗指定每份件数, 并恢复数量默认只读外观 ([e61ad4a](https://github.com/PolarisTime/Aries/commit/e61ad4a94cbe371b416026e206bd6628e2a2d741))

# [10.27.0](https://github.com/PolarisTime/Aries/compare/v10.26.0...v10.27.0) (2026-09-24)


### Bug Fixes

* **price-compare:** 未保存批次不传 excludeSheetId, 修复吨位加载失败 ([f22ef81](https://github.com/PolarisTime/Aries/commit/f22ef81eebf81c7be2cf791f99d0a7c9d8c3eed6))


### Features

* **price-compare:** 吨位右侧展示已开吨位, 采购订单改弹窗选择 + 明细 popover ([84d5e5d](https://github.com/PolarisTime/Aries/commit/84d5e5d220347fce6fc18af3f8ff29359d971e54))

# [10.26.0](https://github.com/PolarisTime/Aries/compare/v10.25.2...v10.26.0) (2026-09-24)


### Bug Fixes

* **price-compare:** 已采购合并为采购订单关联推导, 修复反标记刷新复现 ([3f5b168](https://github.com/PolarisTime/Aries/commit/3f5b1689641a382a884926b2425e5acc157023f0))
* **price-compare:** 订单删除时回退订单号快照, 吨位改用实时缓存 ([0135d66](https://github.com/PolarisTime/Aries/commit/0135d662687500c884f411d61a2a5e6576df38ee))
* **price-compare:** 采购订单吨位加载失败时给出可见提示 ([482e32e](https://github.com/PolarisTime/Aries/commit/482e32ef5575a768e9742586b252d2cb29ee6ae1))


### Features

* **price-compare:** 吨位列关联采购订单并展示已开/剩余吨位 ([3e8002d](https://github.com/PolarisTime/Aries/commit/3e8002dd29b51e266af029494077e91f78ae8350))
* **purchase:** 提货清单移除卸货目标并支持拆分商品数量 ([f7f2d22](https://github.com/PolarisTime/Aries/commit/f7f2d22a31cfbaa74488870cb096bbaaa9ad3c13))

## [10.25.2](https://github.com/PolarisTime/Aries/compare/v10.25.1...v10.25.2) (2026-09-23)


### Bug Fixes

* **sales-order:** 修复交付核定后销售订单契约校验失败 ([2a42443](https://github.com/PolarisTime/Aries/commit/2a42443c1b580933f21921247ca31647df3131ff))

## [10.25.1](https://github.com/PolarisTime/Aries/compare/v10.25.0...v10.25.1) (2026-09-23)


### Bug Fixes

* **price-compare:** 切换西本后参照网价未跟随 ([d58ebe3](https://github.com/PolarisTime/Aries/commit/d58ebe3c3ea9f07abfa52fa0c722eca3d54cf991))

# [10.25.0](https://github.com/PolarisTime/Aries/compare/v10.24.0...v10.25.0) (2026-09-22)


### Features

* **market:** 行情同步页支持切换 Mysteel/西本数据源 ([dfdb88f](https://github.com/PolarisTime/Aries/commit/dfdb88f9a2098b92b3c06ed51a4acef3c9f3553d))

# [10.24.0](https://github.com/PolarisTime/Aries/compare/v10.23.0...v10.24.0) (2026-09-22)


### Features

* **price-compare:** 西本项目取消品牌列, 按规格单组取价 ([df9c362](https://github.com/PolarisTime/Aries/commit/df9c36261bf0b8ad1d09acb92a59fc7e6b7a5bf8))

# [10.23.0](https://github.com/PolarisTime/Aries/compare/v10.22.0...v10.23.0) (2026-09-22)


### Features

* **market:** 项目可配置取价数据源与地区并支持西本取价 ([771c4c7](https://github.com/PolarisTime/Aries/commit/771c4c742acf173f2baad94cd94924d33d8d2879))

# [10.22.0](https://github.com/PolarisTime/Aries/compare/v10.21.1...v10.22.0) (2026-09-22)


### Features

* **sales-order:** 交付核定支持选择项目价格规定 ([0d20c3c](https://github.com/PolarisTime/Aries/commit/0d20c3c05c82813f884d8f2ab95c429dfb378821))

## [10.21.1](https://github.com/PolarisTime/Aries/compare/v10.21.0...v10.21.1) (2026-09-22)


### Bug Fixes

* **sales-order:** 取网价按钮改用单据状态并修正日期解析 ([2b0b3d5](https://github.com/PolarisTime/Aries/commit/2b0b3d59afd743f2732f7eb6ed514e31e81f2b68))

# [10.21.0](https://github.com/PolarisTime/Aries/compare/v10.20.0...v10.21.0) (2026-09-22)


### Features

* **sales-order:** 交付核定支持整单按网价赋单价 ([4d5cbf8](https://github.com/PolarisTime/Aries/commit/4d5cbf83728c62e50f0ea04d2e7c79f92db25163))

# [10.20.0](https://github.com/PolarisTime/Aries/compare/v10.19.0...v10.20.0) (2026-09-22)


### Features

* **price-compare:** 支持标记已采购并遮蔽吨位后的品牌价格列 ([0762e72](https://github.com/PolarisTime/Aries/commit/0762e7251e42c73747fdf5b1a087626fc3ed9ac2))

# [10.19.0](https://github.com/PolarisTime/Aries/compare/v10.18.0...v10.19.0) (2026-09-22)


### Features

* **price-compare:** 批量填入供应商仅更新本次改过价的行 ([d7a2b9f](https://github.com/PolarisTime/Aries/commit/d7a2b9f09d290e5ab5328cd2ae2955fdb5ebda11))

# [10.18.0](https://github.com/PolarisTime/Aries/compare/v10.17.1...v10.18.0) (2026-09-22)


### Features

* **price-compare:** 支持按品牌列批量填入供应商 ([7d86f4c](https://github.com/PolarisTime/Aries/commit/7d86f4caae2ccc1c4e7ce21dc70492680a49d113))

## [10.17.1](https://github.com/PolarisTime/Aries/compare/v10.17.0...v10.17.1) (2026-09-22)


### Bug Fixes

* **price-compare:** 锁定后保留控件正常外观 ([5eeedf9](https://github.com/PolarisTime/Aries/commit/5eeedf9ee6b715345172daa417453d4d796b5031))
* **ui:** 修复下拉选择框清除按钮错位并改为与框体等高 ([a8ebaed](https://github.com/PolarisTime/Aries/commit/a8ebaed521394867b637bb9e7fbec8c87ae1a1eb))

# [10.17.0](https://github.com/PolarisTime/Aries/compare/v10.16.0...v10.17.0) (2026-09-22)


### Features

* **price-compare:** 支持临时隐藏备注列与整组品牌列 ([2a7d494](https://github.com/PolarisTime/Aries/commit/2a7d494c40f32c64d876ac50dadcbe7778f4a356))

# [10.16.0](https://github.com/PolarisTime/Aries/compare/v10.15.0...v10.16.0) (2026-09-21)


### Features

* **purchase:** 前端支持多采购订单合并导入 ([0a5a763](https://github.com/PolarisTime/Aries/commit/0a5a763ecf6f77d48d064ccdac7ac35154954708))

# [10.15.0](https://github.com/PolarisTime/Aries/compare/v10.14.1...v10.15.0) (2026-09-21)


### Bug Fixes

* **logistics:** 物流行级保存不下发重量由后端换算 ([89b5870](https://github.com/PolarisTime/Aries/commit/89b5870e497ed84736a2b65780e6bf43cd6e727e))


### Features

* **logistics:** 前端适配物流行级拆分与候选剩余量 ([eae1bdb](https://github.com/PolarisTime/Aries/commit/eae1bdb1a748e0d412f4cc89583be2489cc7dd5f))

## [10.14.1](https://github.com/PolarisTime/Aries/compare/v10.14.0...v10.14.1) (2026-09-21)


### Bug Fixes

* **price-compare:** Tab 可穿过隔断行继续移动焦点 ([6b8f752](https://github.com/PolarisTime/Aries/commit/6b8f7528d84e61b7fe649e6bc3cce842ce096171))

# [10.14.0](https://github.com/PolarisTime/Aries/compare/v10.13.0...v10.14.0) (2026-09-21)


### Features

* **price-compare:** 类别列前新增行备注列并修复吨位列居中 ([76d7ef7](https://github.com/PolarisTime/Aries/commit/76d7ef73aae50a464f11cccf0a24a42e5f3e2837))

# [10.13.0](https://github.com/PolarisTime/Aries/compare/v10.12.0...v10.13.0) (2026-09-20)


### Features

* **price-compare:** 报单比价支持隔断行 ([e7d6386](https://github.com/PolarisTime/Aries/commit/e7d6386cedf907489a82a5c892d26874cac7d10e))

# [10.12.0](https://github.com/PolarisTime/Aries/compare/v10.11.1...v10.12.0) (2026-09-20)


### Bug Fixes

* **price-compare:** 空行隔断刷新后不再被静默丢弃 ([c12dcb6](https://github.com/PolarisTime/Aries/commit/c12dcb6ce4bb7e5d84151d64aab26669683fd9d5))
* **price-compare:** 锁定参照后刷新不再丢失网价 ([1555e92](https://github.com/PolarisTime/Aries/commit/1555e92da384845c08a856866fd19dacb5f0c918))


### Features

* **price-compare:** 供应商简称下拉支持拼音索引 ([ae24eca](https://github.com/PolarisTime/Aries/commit/ae24eca82eb215c218ff220aad4eec91ad0768ad))

## [10.11.1](https://github.com/PolarisTime/Aries/compare/v10.11.0...v10.11.1) (2026-09-20)


### Bug Fixes

* **price-compare:** 加宽供应商简称列宽度 ([0beeb64](https://github.com/PolarisTime/Aries/commit/0beeb649ee2ed67760316169c1c62912a1b2622b))

# [10.11.0](https://github.com/PolarisTime/Aries/compare/v10.10.0...v10.11.0) (2026-09-19)


### Bug Fixes

* **ci:** 修复 biome 格式与 import 顺序以恢复前端流水线 ([7b271f1](https://github.com/PolarisTime/Aries/commit/7b271f189428d17637848d8ab1db28ba29a26689))
* **editor:** 数量单位缺失不再静默回落, 改为阻止保存并提示补全 ([217cae7](https://github.com/PolarisTime/Aries/commit/217cae71353ebd5f75ad8cb101062475f9c3b1db))
* **price-compare:** 收敛编辑锁迟到响应与释放竞态 ([4125994](https://github.com/PolarisTime/Aries/commit/4125994051869ce5d824a9baaf9739cb3d851513))
* **price-compare:** 编辑锁操作串行化并在收尾保存后释放 ([f85d665](https://github.com/PolarisTime/Aries/commit/f85d6659de18a0afadf553998a4864cbb31ec85d))
* **rbac:** 权限矩阵区分字段级权限, 消除重复的「查看/编辑」 ([2b13dfe](https://github.com/PolarisTime/Aries/commit/2b13dfe69d20f75849e9203c877b6a61ff71631b))
* **sales-contract:** 修复编辑器误清空项目并接入状态国际化 ([5b9ab04](https://github.com/PolarisTime/Aries/commit/5b9ab043baf23ccfd1da5ef75f7a158143d5e406))
* **sales-order:** 导入上游后允许调整数量以支持部分销售 ([135fe10](https://github.com/PolarisTime/Aries/commit/135fe105d25ce6dbec1ad722748e64f323400682))
* **search:** 完善单据流弹窗容错、可访问性与连线去重 ([8a4df4b](https://github.com/PolarisTime/Aries/commit/8a4df4bb72788c79af228c2564bd43cf34f4b971))
* **supplier:** 供应商下拉品牌字段宽松解析 ([d9a4963](https://github.com/PolarisTime/Aries/commit/d9a496376691eb5acfc2fac32772922f6f84d444))


### Features

* **print:** 拆分打印改为逐行勾选并在明细表预览拆分 ([4486d70](https://github.com/PolarisTime/Aries/commit/4486d7003170ba87b9ec818ad2ab278c6e7c9578))
* **rbac:** 字段级权限前端落地(金额/成本列按权限隐藏, 单价只读) ([cd445f4](https://github.com/PolarisTime/Aries/commit/cd445f42f42c6a60b24ba2d2d2f2d6133b8ac549))
* **rbac:** 新增前端权限模型并接入菜单与按钮 ([08acece](https://github.com/PolarisTime/Aries/commit/08acece69dd65d1288534c1ae2fc9f0822608368))
* **rbac:** 用户配置改为「基本信息→角色」两步向导 ([e027c86](https://github.com/PolarisTime/Aries/commit/e027c86e5dbb7205c91f08a127e70c318f4562a2))
* **rbac:** 角色支持克隆并在用户向导增加有效权限预览 ([a42d25e](https://github.com/PolarisTime/Aries/commit/a42d25e78064547f60dcc6374c91e2ec8c71f224))
* **rbac:** 角色配置改为「基本信息→权限」两步向导 ([18d5015](https://github.com/PolarisTime/Aries/commit/18d5015c3141fd9a2458d63b27db31971a86b4bc))
* **system:** 个人账号并入右上角个人设置并移除侧边栏入口 ([4a11919](https://github.com/PolarisTime/Aries/commit/4a119199f01f05a1e6181629fc867cba732c2430))

# [10.10.0](https://github.com/PolarisTime/Aries/compare/v10.9.4...v10.10.0) (2026-09-17)


### Bug Fixes

* **editor:** 明细数量单位改为跟随商品单位 ([096c450](https://github.com/PolarisTime/Aries/commit/096c450a4d2971c0689a6e8ff097c8190a47df7c))
* **editor:** 明细数量单位真源纠正为商品 quantityUnit ([a39c45c](https://github.com/PolarisTime/Aries/commit/a39c45cef2eab6558f29d25cad315ca68537f4db))


### Features

* **price-compare:** 新增供应商简称列并压缩品牌列宽 ([a4c35fd](https://github.com/PolarisTime/Aries/commit/a4c35fdf45961668dfd36f1d02ae738f8c0e4a28))
* **sales-contract:** 对齐销售合同后端契约并新增管理页 ([ee34fed](https://github.com/PolarisTime/Aries/commit/ee34fed8d87818756b5e0f95493a5064c76fb10e))
* **search:** 全局搜索支持查看采购销售物流单据流向 ([df9d9fd](https://github.com/PolarisTime/Aries/commit/df9d9fd67eb2a2142c9da244af0fe762cb9b606c))
* **supplier:** 新增经营品牌并在报单比价按品牌过滤供应商 ([e69ceb0](https://github.com/PolarisTime/Aries/commit/e69ceb0115b8af7d70fd784bd986d0e52d5cfa5f))

## [10.9.4](https://github.com/PolarisTime/Aries/compare/v10.9.3...v10.9.4) (2026-09-17)


### Bug Fixes

* **supplier:** 供应商资料表单补全供应商简称字段 ([83daf5e](https://github.com/PolarisTime/Aries/commit/83daf5e7469d4b569da86a24113bfe3e78d44ba8))

## [10.9.3](https://github.com/PolarisTime/Aries/compare/v10.9.2...v10.9.3) (2026-09-17)


### Bug Fixes

* **price-compare:** 离开比价路由释放编辑锁并补强多角色 E2E ([ae116c7](https://github.com/PolarisTime/Aries/commit/ae116c7075cf690229109b39b00db3faa597a152))
* **price-compare:** 离开路由后新批次不再后台签出编辑锁 ([0578a38](https://github.com/PolarisTime/Aries/commit/0578a387a6557f40b206a5868e29b4778272e13b))

## [10.9.2](https://github.com/PolarisTime/Aries/compare/v10.9.1...v10.9.2) (2026-09-17)


### Bug Fixes

* **price-compare:** 禁止锁定规格数量后撤销回退并补充极端场景 E2E ([7496138](https://github.com/PolarisTime/Aries/commit/74961384604cef5c345ce4c28f1ae21750570aea))

## [10.9.1](https://github.com/PolarisTime/Aries/compare/v10.9.0...v10.9.1) (2026-09-16)


### Bug Fixes

* **price-compare:** 修复编辑锁竞态与被跳过保存的刷新覆盖 ([5e5dc7a](https://github.com/PolarisTime/Aries/commit/5e5dc7a12e41d1e11535c658977b7802d2b38a4f))
* **price-compare:** 修复编辑锁误删与保存失败后刷新回滚 ([5868e22](https://github.com/PolarisTime/Aries/commit/5868e22eb42b2e86cb969768485664ed04b9a07e))

# [10.9.0](https://github.com/PolarisTime/Aries/compare/v10.8.1...v10.9.0) (2026-09-16)


### Features

* **price-compare:** 支持锁定报单规格和数量 ([d73a363](https://github.com/PolarisTime/Aries/commit/d73a3630093e8dd569d329a6048274d5e1a1b349))

# [10.8.0](https://github.com/PolarisTime/Aries/compare/v10.7.0...v10.8.0) (2026-09-16)


### Bug Fixes

* **price-compare:** 并发前置条件改用 X-Resource-Version 并区分 412/409 ([be91dad](https://github.com/PolarisTime/Aries/commit/be91dad4c96986d9746b79deb8a617fdf538b9df))
* **price-compare:** 收敛并发冲突弹窗，避免重复弹出 ([695c22a](https://github.com/PolarisTime/Aries/commit/695c22ac1a6e2993b232e1eff6a097161b3bc96a))


### Features

* **price-compare:** 行级增量保存与编辑签出体验 ([01d34cf](https://github.com/PolarisTime/Aries/commit/01d34cf8a8e85d9be7d1f454205e98623448466a))

# [10.7.0](https://github.com/PolarisTime/Aries/compare/v10.6.1...v10.7.0) (2026-09-16)


### Features

* **price-compare:** 乐观并发冲突提示与聚焦/轮询刷新 ([716ee97](https://github.com/PolarisTime/Aries/commit/716ee974c97cb305c148fdea883d9a3c63378ba0))

## [10.6.1](https://github.com/PolarisTime/Aries/compare/v10.6.0...v10.6.1) (2026-09-16)


### Bug Fixes

* **price-compare:** 单据与项目配置保存串行化，避免并发 PUT 触发 409 ([b61ab0e](https://github.com/PolarisTime/Aries/commit/b61ab0e83672b6fee49a19703b86d43df1d11e40))

# [10.6.0](https://github.com/PolarisTime/Aries/compare/v10.5.0...v10.6.0) (2026-09-16)


### Features

* **master:** 供应商资料新增简称，比价现货价下拉优先展示简称 ([485efd6](https://github.com/PolarisTime/Aries/commit/485efd6f983243a53a33bd82f03e5881c15450c4))

# [10.5.0](https://github.com/PolarisTime/Aries/compare/v10.4.0...v10.5.0) (2026-09-16)


### Features

* **price-compare:** 比价单服务端持久化，支持参照锁定与现货供应商 ([e26bf34](https://github.com/PolarisTime/Aries/commit/e26bf346d993072c1ddd4b9c6ca6b817339ce47f))

# [10.4.0](https://github.com/PolarisTime/Aries/compare/v10.3.2...v10.4.0) (2026-09-16)


### Bug Fixes

* **market:** 时段缺失比对改用 Set 避免循环内重复查找 ([be32743](https://github.com/PolarisTime/Aries/commit/be327438d584e5b2941e8f5aca51c058dcdaa73e))


### Features

* **market:** 行情同步支持选择时段(上午/中午/下午) ([ce8ef3a](https://github.com/PolarisTime/Aries/commit/ce8ef3a5398c7480a112106ef5f3ae1b9e9e783b))

## [10.3.2](https://github.com/PolarisTime/Aries/compare/v10.3.1...v10.3.2) (2026-09-16)


### Bug Fixes

* **price-compare:** 静态数据目录改名避免遮蔽 SPA 路由导致 403 ([d2de312](https://github.com/PolarisTime/Aries/commit/d2de312f540d35a425879ddee0817d87af210e09))

## [10.3.1](https://github.com/PolarisTime/Aries/compare/v10.3.0...v10.3.1) (2026-09-16)


### Bug Fixes

* **master:** 商品下拉分页拉全以支持前端拼音过滤全量商品 ([580c346](https://github.com/PolarisTime/Aries/commit/580c3469b9caa4ac40634bc18c5300fe7da8e437))

# [10.3.0](https://github.com/PolarisTime/Aries/compare/v10.2.0...v10.3.0) (2026-09-16)


### Bug Fixes

* **e2e:** 修复 E2E_COVERAGE=1 因 typescript JS API 缺失导致的覆盖率失败 ([2781179](https://github.com/PolarisTime/Aries/commit/27811797455b061703799641b80159b49cd2810f))
* **lint:** 排除 E2E 与 Playwright 配置以修复 ESLint project service 解析错误 ([4ffc8dc](https://github.com/PolarisTime/Aries/commit/4ffc8dc31dac80e79bf9e634d18e62725e755eec))
* **master,finance:** 物流商/项目编码签发与收付款保存账户字段 ([d69541e](https://github.com/PolarisTime/Aries/commit/d69541e32ab3b77256e1ff53d3eb53f9dc996f70))
* **master:** 商品编码下拉支持服务端搜索全量商品 ([4025e1f](https://github.com/PolarisTime/Aries/commit/4025e1f7c7b13546efa5515e0ce23f0b86f2b88b))
* **modules:** 费用下拉支持服务端搜索，打印/项目/结算主体改为分页拉全 ([d31e53a](https://github.com/PolarisTime/Aries/commit/d31e53afd1c112e19eb4552d9205229c9006cde6))
* **price-compare:** 移除失焦回调中冗余的输入元素类型断言 ([5984ab3](https://github.com/PolarisTime/Aries/commit/5984ab3100691cbb8b7c606a29dd06c6f27d8969))
* **sales-return:** 出库来源服务端搜索、订单行级派生数量与单据流关系展示 ([be75e5b](https://github.com/PolarisTime/Aries/commit/be75e5ba5604cfa0217c0413e5304e6cccaff1eb))
* **ui:** 修复主数据与档案页面表格无法纵向滚动 ([5136fff](https://github.com/PolarisTime/Aries/commit/5136fff7ef014ca4adf71801face6e8b10f9f792))
* **ui:** 修复可访问性对比度与 i18n 硬编码并复用库存表格组件 ([2321b1c](https://github.com/PolarisTime/Aries/commit/2321b1c41103f0f79a52f9e2fd33639c44433253))


### Features

* **inventory:** 库存流水展示物料信息 ([42e1c29](https://github.com/PolarisTime/Aries/commit/42e1c29df00a921047a8e3a4f48f630b37b74f50))
* **inventory:** 新增库存查询页（余额/流水） ([d8a0f3b](https://github.com/PolarisTime/Aries/commit/d8a0f3b5ea4ddf241dc4846361c042ec9ec797cf))
* **master-data:** 商品版本历史、导入预览与批次回滚前端 ([e4fe914](https://github.com/PolarisTime/Aries/commit/e4fe914600939f3ca77e6d53befe97337358a876))
* **price-compare:** 项目配置新增指定品牌并于比价单展示 ([a872929](https://github.com/PolarisTime/Aries/commit/a872929b496bf5076b2d0c178b0031d23d62eda5))
* **print,price-compare:** 打印拆分件数选项与比价标题品牌限定/备注 ([5b715f9](https://github.com/PolarisTime/Aries/commit/5b715f9f4541ffef062f0ae4b92b28815c1beb84))
* **print:** 注册销售退货单为可打印模块并补齐打印明细字段 ([8d61981](https://github.com/PolarisTime/Aries/commit/8d619811cd903d6b49134c4c1f2e61f434499c23))
* **sales-outbound:** 支持部分出库录入与剩余可出量展示 ([e565fa7](https://github.com/PolarisTime/Aries/commit/e565fa76970c54c8bc09118d21698f2f788b48a8))
* **sales-return:** 新增销售退货单页面、来源导入与订单单据流 ([42d3323](https://github.com/PolarisTime/Aries/commit/42d332380ee4117d518dc086e4d0aec6e385ddb4))
* **security:** 新增角色管理与权限矩阵界面(RBAC0) ([1102047](https://github.com/PolarisTime/Aries/commit/110204776786ff74aa6a02308efb28eabf944be7))
* **statement:** 客户对账单支持蓝字/红字方向展示与筛选 ([02c83f8](https://github.com/PolarisTime/Aries/commit/02c83f89566c48443a462f3c3a27651786f62cab))
* **system:** 新增多用户账号管理与角色分配界面并补齐端到端用例 ([d734676](https://github.com/PolarisTime/Aries/commit/d73467610fe266e69ff7bb7c2b47773505145067))


### Performance Improvements

* **api:** 分页拉取并行请求并消除 React Doctor 告警 ([6007772](https://github.com/PolarisTime/Aries/commit/600777219c2b302ed3db4d81cace419ed34e16bd))

# [10.2.0](https://github.com/PolarisTime/Aries/compare/v10.1.0...v10.2.0) (2026-09-12)


### Bug Fixes

* **ci:** 修复前端发布流水线格式与 a11y 用例悬空定时器 ([580facc](https://github.com/PolarisTime/Aries/commit/580faccf172c6c07ab9e0a10e6d9c9e874de4d84))
* **document:** 修正附加费用下拉取数与商品表单字段 ([2f58835](https://github.com/PolarisTime/Aries/commit/2f58835df082da95147b56c0a75482dca437e411))


### Features

* **print:** 打印模板默认选择与文件托管上传限制 ([d4aa7ad](https://github.com/PolarisTime/Aries/commit/d4aa7add4310493dd1834e64ccd0c0c41977566d))

# [10.1.0](https://github.com/PolarisTime/Aries/compare/v10.0.1...v10.1.0) (2026-09-12)


### Bug Fixes

* **a11y:** useFocusTrap 避免在渲染期写入 ref ([753be2f](https://github.com/PolarisTime/Aries/commit/753be2f150ffd4954b346ff063c51d9bc40953bf))
* **a11y:** 增强错误边界分类展示与恢复引导 ([c08695d](https://github.com/PolarisTime/Aries/commit/c08695d32b95ff007616314bd45e7d941bc824fc))
* **a11y:** 补全焦点管理缺口 ([55b42c0](https://github.com/PolarisTime/Aries/commit/55b42c014b95d1a4cb433666dff17adcb1255c94))
* **api:** 查询错误改为页内呈现，写操作保留全局提示 ([63595ef](https://github.com/PolarisTime/Aries/commit/63595ef4f4779b49abf05fbd7722487ef73382a3))
* **attachments:** 直传回退改为状态码判定、去重提示并兜底校验 rejection ([8a0d674](https://github.com/PolarisTime/Aries/commit/8a0d6745e70d4b05d085278d37b87cbc5050869c))
* **finance:** 修正 ReceiptReconcileModal 的 antd 6 API 用法 ([c86db79](https://github.com/PolarisTime/Aries/commit/c86db79f21859c9fe45fdccac1488c37b881168f))
* **i18n:** 修复英文界面硬编码与占位 key、antd 语言跟随，物料表单加 maxLength ([dd536d1](https://github.com/PolarisTime/Aries/commit/dd536d189e8b65603671e9f3e716faf84e9608d0))
* **master,query:** 修复实体编码生成、结算主体/账户下拉与会话查询回归 ([319e0c1](https://github.com/PolarisTime/Aries/commit/319e0c12b6a193cd30784f8daf11b28073f0fc3e))
* **master:** 商品选项分页 size 限制在后端上限内 ([3c7e936](https://github.com/PolarisTime/Aries/commit/3c7e9362ea32d6b385af76dd90f0a6aac8ddb8b0))
* **price-compare:** 修复特定窗口下商品列被拉伸 ([47440fa](https://github.com/PolarisTime/Aries/commit/47440fae0bd7e419c2cb9b4fc21574704f62dd9e))
* **price-compare:** 修复行情分页响应契约校验 ([a731fe6](https://github.com/PolarisTime/Aries/commit/a731fe6a013b2fdfdc937638868c79cf176db2fe))
* **price-compare:** 修复行情同步解析失败 ([bc4eca6](https://github.com/PolarisTime/Aries/commit/bc4eca67914a52b5cf98a7a06049f956b4dea0fa))
* **price-compare:** 修复表格框线错位并统一实线 ([ca383ef](https://github.com/PolarisTime/Aries/commit/ca383efb1e33b064ec8e2e64f20ac81487c1d86e)), closes [#d9d9d9](https://github.com/PolarisTime/Aries/issues/d9d9d9)
* **price-compare:** 修正商品类别别名并暴露行情匹配问题 ([e8f6335](https://github.com/PolarisTime/Aries/commit/e8f633504e7c8319984b25ea8ad4d78f9cd76672))
* **price-compare:** 切换参照日期时按该日可用时段读取 ([8e8c678](https://github.com/PolarisTime/Aries/commit/8e8c6786c8bd15b463e9405a9ff75a7ca58be453))
* **price-compare:** 去掉分组间多余分隔线并修复组序错乱 ([b1745e6](https://github.com/PolarisTime/Aries/commit/b1745e6ec5b438a683512ad4e870615d51d93b94))
* **price-compare:** 同商品现货价自动联动，避免重复输入 ([8aa3d56](https://github.com/PolarisTime/Aries/commit/8aa3d5627c9b7a5bd554b8a31651dee370a64d38))
* **price-compare:** 商品类别按基础数据规范化(螺纹钢=直条) ([232af12](https://github.com/PolarisTime/Aries/commit/232af12eb4d6b4dfd83f689da05a29bb15f4f1bd))
* **price-compare:** 多标签页通过 storage 事件同步单据状态 ([3433fa8](https://github.com/PolarisTime/Aries/commit/3433fa8837b58582920a8d61bd198b78c2528a2e))
* **price-compare:** 恢复分组删除(悬停显现) ([3d0d94c](https://github.com/PolarisTime/Aries/commit/3d0d94c253c758346e4abc31532be41b68b0d03e))
* **price-compare:** 本地存储升级 v3 并加固设置兜底 ([3f04916](https://github.com/PolarisTime/Aries/commit/3f04916b7bb4cc0b0c0e971d92416d29044a3c48))
* **price-compare:** 非法现货回滚、吨位撤销回显与删除清理输入 ([1db553b](https://github.com/PolarisTime/Aries/commit/1db553b49ec9637fce74b68c087247620ff2cd05))
* **price-compare:** 项目配置交互优化 ([5e83bef](https://github.com/PolarisTime/Aries/commit/5e83bef0019d72110ffab8f457ac2cdd61e64646))
* **query:** 修复主数据选项刷新双请求/闪空并统一查询 key ([142af4d](https://github.com/PolarisTime/Aries/commit/142af4ded00b8e4842906aca9aeea4f0958cf78a))
* **query:** 轮询接入页面可见性并为切换列表保留上一页数据 ([1e8d97d](https://github.com/PolarisTime/Aries/commit/1e8d97d95bb5e27c9815285b3bf6506ccbc354d6))


### Features

* **a11y:** 增强空状态设计，区分无数据与筛选无结果 ([cf94287](https://github.com/PolarisTime/Aries/commit/cf9428781749362c9abbdda87c0a004a792ec91a))
* **a11y:** 统一全局键盘焦点环并新增焦点令牌 ([a583f30](https://github.com/PolarisTime/Aries/commit/a583f30a1abc5dedfecce15e6ab077dd8c797038))
* **a11y:** 统一加载状态反馈 ([2dfee95](https://github.com/PolarisTime/Aries/commit/2dfee9582f5557d4d24f7df389e2a49245434e37))
* **api:** 所有副作用写请求补齐幂等键 ([077c6da](https://github.com/PolarisTime/Aries/commit/077c6da94326a8e125d4b79d473d07bfdfccda03))
* **demo:** 比价模块 UI 设计 demo（mock 数据） ([b546b3f](https://github.com/PolarisTime/Aries/commit/b546b3f6e034b509b7ebd5ed5e99b9bce4889994))
* **finance:** 新增客户对账单智能核销工作台弹窗组件 ([d8ffe4a](https://github.com/PolarisTime/Aries/commit/d8ffe4a6876043c19149d1064e8cf0a9359074b5))
* **i18n:** 比价模块接入中英文文案 ([373462e](https://github.com/PolarisTime/Aries/commit/373462ec87728c5ffba83814dc7fed1645a8d6a4))
* **market:** 新增「行情同步」管理页 ([814e2af](https://github.com/PolarisTime/Aries/commit/814e2afafac122d972bf7db253c1bfe65636a02e))
* **market:** 行情同步页交互完善 ([762eb8d](https://github.com/PolarisTime/Aries/commit/762eb8d707d8920c2133e4469c14e473209e9409))
* **market:** 行情同步页展示补数任务状态 ([a182abc](https://github.com/PolarisTime/Aries/commit/a182abc7743321bd560a743a9f15e68c9d66e5bf))
* **market:** 行情明细交互增强 ([1619cc5](https://github.com/PolarisTime/Aries/commit/1619cc5875d03a51b01a10570bb3359be781509e))
* **master-data:** 专属商品页补回导入入口 ([e56a48e](https://github.com/PolarisTime/Aries/commit/e56a48e84555a794d8ae1b21f9799ac4ebaac070))
* **master:** 项目与物流方迁移为专用页面（渐进式迁移试点） ([d8b0ecc](https://github.com/PolarisTime/Aries/commit/d8b0ecc73f60868a5bf2872ca0908492bce0e37e))
* **price-compare:** HRB400 无网价时可用 HRB400E 兜底 ([d314dd6](https://github.com/PolarisTime/Aries/commit/d314dd64feb26fc73971ec4de01c5286bb22799c))
* **price-compare:** 三级结构 项目Tab -> 批次Tab -> 类别分组 ([3d160ad](https://github.com/PolarisTime/Aries/commit/3d160adf8c361051d4c506484adbacad9f0a1b54))
* **price-compare:** 价格同步改调后端行情并整理商品下拉 ([54228d5](https://github.com/PolarisTime/Aries/commit/54228d52d94085cbc9c118876d03ce5a50dfae72))
* **price-compare:** 允许删除当前批次 ([9db0084](https://github.com/PolarisTime/Aries/commit/9db00841f754bd0e978cfa68d792cba04217db71))
* **price-compare:** 分组同页堆叠显示并联动现货价 ([2d18489](https://github.com/PolarisTime/Aries/commit/2d18489b0b36ccea60fdbae91aec2fcf3ce357fd))
* **price-compare:** 去掉类别分组并支持一键最优 ([6e93706](https://github.com/PolarisTime/Aries/commit/6e93706bdfe0897af93b064a1438b54131636564))
* **price-compare:** 参照网价日历显示上/中/下午点位 ([bd11e4e](https://github.com/PolarisTime/Aries/commit/bd11e4ee6395c13be38a9a0f2ea85d5c27ee31b3))
* **price-compare:** 同步后拉取并合并后端行情 ([1cf092d](https://github.com/PolarisTime/Aries/commit/1cf092dec80a915d3eb05c4ea2c86fdf303456e2))
* **price-compare:** 品牌列支持拖拽排序 ([2e306e8](https://github.com/PolarisTime/Aries/commit/2e306e887e1dea3776659d925b0df331975bf7de))
* **price-compare:** 报价总设置抽屉 + 录入性能优化 ([155efab](https://github.com/PolarisTime/Aries/commit/155efabffede7c7cef300a9c80f7ca8f016564d2))
* **price-compare:** 报单吨位居中并统一 Tab 同列下移 ([42af3bf](https://github.com/PolarisTime/Aries/commit/42af3bf7aa6c1fb68dbaeb9e6aa3384fa813b064))
* **price-compare:** 按业务确认调整计算与交互 ([cea7372](https://github.com/PolarisTime/Aries/commit/cea7372d2091e4c468b52ef068e686039838ad73))
* **price-compare:** 新增三版布局草案对比页(免登录预览) ([01c9145](https://github.com/PolarisTime/Aries/commit/01c9145e6868ff39288befc1d097b356f8ee9c6e))
* **price-compare:** 新增价格同步按钮 ([348ab7f](https://github.com/PolarisTime/Aries/commit/348ab7f4cb977ddb58d2103e8a2f45f30a60a896))
* **price-compare:** 新增类别列与差价最优切换 ([885c7cd](https://github.com/PolarisTime/Aries/commit/885c7cdfe413eb4c5d0df2354c8e46ea48fa77b6))
* **price-compare:** 新建批次默认仅一行空行 ([0387ffb](https://github.com/PolarisTime/Aries/commit/0387ffb22648be2316cb85c813a36431460e85ce))
* **price-compare:** 正式页改用顶部胶囊布局并支持行拖拽 ([8e6a0d9](https://github.com/PolarisTime/Aries/commit/8e6a0d92e2da0a31fa451e3dcb5e63ef85e5fa69))
* **price-compare:** 比价注册为独立模块, 菜单位于基础数据之后 ([82d12ed](https://github.com/PolarisTime/Aries/commit/82d12ed43e344394b1860e67d4fad0f587eeba3c))
* **price-compare:** 比价页重做为工程实现(antd 6 + React 19) ([eca2349](https://github.com/PolarisTime/Aries/commit/eca23499db13e20729e37ffd5452ed97c32dd5b4))
* **price-compare:** 比价页面合入开发测试前端 ([061c2c1](https://github.com/PolarisTime/Aries/commit/061c2c1126a2a12ae1704a7eaacc95c77bc53dfb))
* **price-compare:** 移除导出并引入表内分组 ([d51cda5](https://github.com/PolarisTime/Aries/commit/d51cda5312cbe90b8a9821065ac95acbc2a7892d))
* **price-compare:** 精简单据表头与操作 ([996ea75](https://github.com/PolarisTime/Aries/commit/996ea757a1afdfd47a2b407e2260d1fc55073784))
* **price-compare:** 网价完全走后端并新增报单吨位列 ([5ae304c](https://github.com/PolarisTime/Aries/commit/5ae304cc0e73d30a0d8a989c1e9babf5e6923fdf))
* **price-compare:** 行删除改为复选框批量删除 ([d6573ba](https://github.com/PolarisTime/Aries/commit/d6573ba5ea19631475bae95ea44b9fdce0bf9f99))
* **price-compare:** 行情填充改用商品匹配接口并统一时段 ([8197bfd](https://github.com/PolarisTime/Aries/commit/8197bfd6655712fbb6817bea38a7ee9eadca5300))
* **price-compare:** 行拖拽增加整行拖起与落点指示 ([de11c34](https://github.com/PolarisTime/Aries/commit/de11c342b6311330a8fc7d12ba8fada63c9a2862))
* **price-compare:** 行随单据独立与批次 Tab 增强 ([d9fd2e4](https://github.com/PolarisTime/Aries/commit/d9fd2e4060cbdc8c708d7d7bfd04a15814ccea1b))
* **price-compare:** 项目级配置(品牌/品种/运费/12米加价) ([26a0840](https://github.com/PolarisTime/Aries/commit/26a08400cec9c9ddb118251ad0e7d1482f6f5a4a))
* **price-compare:** 项目配置新增可选商品, 精简表格下拉 ([d642a13](https://github.com/PolarisTime/Aries/commit/d642a13c9f731aeb2bad097f1b443bb3ec9c596c))
* **theme:** 建立语义化设计令牌与统一动效令牌 ([46f094b](https://github.com/PolarisTime/Aries/commit/46f094b0fd92e588b87736f157cde8c987d9415d))
* **ux:** 优化列宽拖拽交互、选中动画与骨架屏对齐 ([366d863](https://github.com/PolarisTime/Aries/commit/366d863c9131f8b22a62a5c5af6abb054b9efa5d))
* **ux:** 增强搜索框交互状态与响应式断点 ([adcc476](https://github.com/PolarisTime/Aries/commit/adcc476c618fe2de3bf514afef832c1d8ca54f12))

## [10.0.1](https://github.com/PolarisTime/Aries/compare/v10.0.0...v10.0.1) (2026-09-09)


### Bug Fixes

* **a11y:** 修复触摸目标热区与文本对比度不满足 WCAG AA ([f587dd3](https://github.com/PolarisTime/Aries/commit/f587dd37b5c0f92be12ec2fec0ae79adc3beeda9))
* **a11y:** 表单错误状态补充 ARIA 关联与焦点管理 ([dc1e11a](https://github.com/PolarisTime/Aries/commit/dc1e11afae851e018095ad2500f912d8d24ae921))
* **layout:** 修复多标签页状态保存的三处逻辑缺陷 ([b2e9129](https://github.com/PolarisTime/Aries/commit/b2e9129b7362a2630ceb23a91ebb7ae2db36b02c))

# [10.0.0](https://github.com/PolarisTime/Aries/compare/v9.27.0...v10.0.0) (2026-09-09)


* feat(modules)!: 重构选单器选择交互与信息层级 ([50563c2](https://github.com/PolarisTime/Aries/commit/50563c2f8e295778a5246382c2c3b918637c9437))


### BREAKING CHANGES

* 选单器单选模式点击行不再直接导入，需点击底部「确认导入」完成选择

# [9.27.0](https://github.com/PolarisTime/Aries/compare/v9.26.1...v9.27.0) (2026-09-08)


### Features

* **modules:** 选单器明细行默认展开显示 ([9314a87](https://github.com/PolarisTime/Aries/commit/9314a87c583fb967892e32857cfc4f45e844f658))
* **modules:** 选单器表格增加常驻查看明细按钮与行内明细展开 ([c209cc7](https://github.com/PolarisTime/Aries/commit/c209cc7e3c4ed24409924494487dcaab564ddd2e))

## [9.26.1](https://github.com/PolarisTime/Aries/compare/v9.26.0...v9.26.1) (2026-09-08)


### Bug Fixes

* **layout:** 修复多标签页 SPA 导航丢失深链查询串导致筛选失效与乒乓卡死 ([a9432e5](https://github.com/PolarisTime/Aries/commit/a9432e59219bbfb7d243ba4d6f9a9fe0c0c2b17b))

# [9.26.0](https://github.com/PolarisTime/Aries/compare/v9.25.0...v9.26.0) (2026-09-08)


### Features

* **dashboard:** 显性化采购订单入库履约状态，降低筛选理解成本 ([251674b](https://github.com/PolarisTime/Aries/commit/251674bc1a17fac5a523ba765221c98dcd44b300))

# [9.25.0](https://github.com/PolarisTime/Aries/compare/v9.24.0...v9.25.0) (2026-09-08)


### Features

* **dashboard:** 工作台重构为信息密度优先的新布局 ([33088aa](https://github.com/PolarisTime/Aries/commit/33088aac3f913cbefee0e006103835109682fc9e))

# [9.24.0](https://github.com/PolarisTime/Aries/compare/v9.23.0...v9.24.0) (2026-09-08)


### Features

* **modules:** 筛选区重构为 Filter Chips 布局并规范下游引用文案 ([321fa7c](https://github.com/PolarisTime/Aries/commit/321fa7c493a31b0d23aeb94805cd4eefd2a44e0d))

# [9.23.0](https://github.com/PolarisTime/Aries/compare/v9.22.0...v9.23.0) (2026-09-07)


### Bug Fixes

* **details:** 允许同时展开多个单据明细 ([fbd12f6](https://github.com/PolarisTime/Aries/commit/fbd12f693ca3e221ca9d63b6b5394305054563c6))
* **filters:** 移除订单日期快捷选择器 ([0e12b49](https://github.com/PolarisTime/Aries/commit/0e12b49657b4cf827b77cf7addac76ef56ea8429))


### Features

* **modules:** 被什么关联筛选改为按实际下游模块筛选 ([62ea9f8](https://github.com/PolarisTime/Aries/commit/62ea9f88c0078179183ee2af5ea69d62bd807c32))

# [9.22.0](https://github.com/PolarisTime/Aries/compare/v9.21.0...v9.22.0) (2026-09-04)


### Bug Fixes

* **filters:** 修复单选筛选参数格式错误 ([dc7ee18](https://github.com/PolarisTime/Aries/commit/dc7ee1809981e7b46f7df396a21fc22f835a9bf7))


### Features

* **frontend:** 支持同时打开多个单据明细 ([a68758d](https://github.com/PolarisTime/Aries/commit/a68758dfaae1a84fd12091f26dceff1a20e0ebc4))

# [9.21.0](https://github.com/PolarisTime/Aries/compare/v9.20.0...v9.21.0) (2026-09-03)


### Features

* **frontend:** 调整采购订单筛选布局 ([c47ba4d](https://github.com/PolarisTime/Aries/commit/c47ba4d72bf051e391fcf112119eb9244fe45821))

# [9.20.0](https://github.com/PolarisTime/Aries/compare/v9.19.1...v9.20.0) (2026-09-03)


### Features

* **filters:** 关联状态改用分段控制器并调整重置位置 ([8a375a8](https://github.com/PolarisTime/Aries/commit/8a375a86300995887ceb72e731c3165f20cc8a51))

## [9.19.1](https://github.com/PolarisTime/Aries/compare/v9.19.0...v9.19.1) (2026-09-03)


### Bug Fixes

* **filters:** 消除订单隐藏待处理默认筛选 ([d201d18](https://github.com/PolarisTime/Aries/commit/d201d185ddd0dbaf727bfacf51091d9eb3677762))

# [9.19.0](https://github.com/PolarisTime/Aries/compare/v9.18.0...v9.19.0) (2026-09-03)


### Features

* **filters:** 移除重复快捷筛选并增加日期快捷选择 ([5ce70b4](https://github.com/PolarisTime/Aries/commit/5ce70b45d51575a8251c6def1f27bf5d6759b132))

# [9.18.0](https://github.com/PolarisTime/Aries/compare/v9.17.1...v9.18.0) (2026-09-02)


### Features

* **filters:** 移除展开收起按钮并直接展示全部筛选字段 ([918bfd9](https://github.com/PolarisTime/Aries/commit/918bfd9a0bd1e0362b32eb2bc56afcd4fa5e2fa5))

## [9.17.1](https://github.com/PolarisTime/Aries/compare/v9.17.0...v9.17.1) (2026-09-02)


### Bug Fixes

* **filters:** 合并快捷筛选与分段控制器避免重复行 ([6fd835c](https://github.com/PolarisTime/Aries/commit/6fd835c3aab2adaa0a619ba620594e0bbf2736b6))

# [9.17.0](https://github.com/PolarisTime/Aries/compare/v9.16.0...v9.17.0) (2026-09-02)


### Features

* **filters:** 销售订单与销售出库筛选移除商品关键字与结算主体 ([b9a6782](https://github.com/PolarisTime/Aries/commit/b9a67822eb054f1ac36d51f5b6841191b23b0e60))

# [9.16.0](https://github.com/PolarisTime/Aries/compare/v9.15.0...v9.16.0) (2026-09-02)


### Features

* **filters:** 采购订单、采购入库与物流单筛选改用分段控制器 ([4acb744](https://github.com/PolarisTime/Aries/commit/4acb74448a8d5a5902f4faa2358704cde251ce16))

# [9.15.0](https://github.com/PolarisTime/Aries/compare/v9.14.1...v9.15.0) (2026-09-02)


### Features

* **filters:** 销售订单单据状态与结算主体改用分段控制器 ([33894e2](https://github.com/PolarisTime/Aries/commit/33894e26588d82f19b81c7d33b29d4f27dc5464c))

## [9.14.1](https://github.com/PolarisTime/Aries/compare/v9.14.0...v9.14.1) (2026-09-02)


### Bug Fixes

* **grid:** 查看明细按钮移动到复选框右侧 ([c553be1](https://github.com/PolarisTime/Aries/commit/c553be1ec7ebf771980ad1a7eb0392788024a392))

# [9.14.0](https://github.com/PolarisTime/Aries/compare/v9.13.1...v9.14.0) (2026-09-02)


### Bug Fixes

* **orders:** 被引用时才显示引用状态图标 ([a180c4b](https://github.com/PolarisTime/Aries/commit/a180c4b4fa5a00d66df6aefae8335a3a6f11b289))


### Features

* **filters:** 增加订单关联状态筛选 ([86c0ffe](https://github.com/PolarisTime/Aries/commit/86c0ffec264989de99a6ab3e50c3d0cbc187bd85))

## [9.13.1](https://github.com/PolarisTime/Aries/compare/v9.13.0...v9.13.1) (2026-09-01)


### Bug Fixes

* **api:** 兼容订单引用状态字段缺失 ([ceb8660](https://github.com/PolarisTime/Aries/commit/ceb866028a14310d2a6614f7b55b602915339c44))
* **filters:** 保留销售订单未来日期范围 ([2ce7bb1](https://github.com/PolarisTime/Aries/commit/2ce7bb135d75cb40be124aa32bf2a02db02448dc))
* **filters:** 修复订单状态筛选被待处理条件覆盖 ([0448426](https://github.com/PolarisTime/Aries/commit/0448426463769cf8b473fac08ae6f19f7bbea723))
* **filters:** 统一日期筛选默认范围 ([c427ade](https://github.com/PolarisTime/Aries/commit/c427ade6e6f01ed62cb864c89faee82f783a9b3f))
* **filters:** 设置资金流水日期默认范围 ([3528e89](https://github.com/PolarisTime/Aries/commit/3528e89ec76c2fe9a1f1533e67912ac6edb1fc39))

# [9.13.0](https://github.com/PolarisTime/Aries/compare/v9.12.2...v9.13.0) (2026-09-01)


### Bug Fixes

* **grid:** 列表明细改为行内展开 ([658724f](https://github.com/PolarisTime/Aries/commit/658724fec08fc8676f6f8b565aaf22ebcd1b09ce))
* **material:** 修复商品品牌拼音首字母匹配 ([ace2dbe](https://github.com/PolarisTime/Aries/commit/ace2dbe54e74714c8f008d31176e8ad37babba96))


### Features

* **orders:** 增加订单下游引用状态与待处理筛选 ([04beded](https://github.com/PolarisTime/Aries/commit/04bededc5d02d5f047f1df5f3989837d593f238b))

## [9.12.2](https://github.com/PolarisTime/Aries/compare/v9.12.1...v9.12.2) (2026-09-01)


### Bug Fixes

* **business-pages:** 修复交易明细配置投影与元数据一致性 ([a1a7c43](https://github.com/PolarisTime/Aries/commit/a1a7c435e3b33b25bd3bd9c2fe77b4a949c1d2da))
* **sales-order:** 恢复隐藏编码后的物料选择 ([7d8835b](https://github.com/PolarisTime/Aries/commit/7d8835b2b639fea5d1c21765a26fbf905aad0abd))
* **sales-order:** 调整销售订单明细列展示 ([d1d1d3b](https://github.com/PolarisTime/Aries/commit/d1d1d3bb497b7f6ffc81f2409a65d2c368c6e024))

## [9.12.1](https://github.com/PolarisTime/Aries/compare/v9.12.0...v9.12.1) (2026-09-01)


### Bug Fixes

* **statement:** 修复物流对账单日期排序与分组展示 ([d40c9ee](https://github.com/PolarisTime/Aries/commit/d40c9eead8852fa7e219ea29d1ceb6991bdf6aee))

# [9.12.0](https://github.com/PolarisTime/Aries/compare/v9.11.5...v9.12.0) (2026-08-31)


### Bug Fixes

* **overview:** 补充业务汇总指标单位 ([bc7ce29](https://github.com/PolarisTime/Aries/commit/bc7ce29bba4de67e90006a4e2d42a8195164f734))


### Features

* **grid:** 列表页新增明细查看图标 ([991c890](https://github.com/PolarisTime/Aries/commit/991c890e050ac16d0d8cb7cb11db9651e22b2281))

## [9.11.5](https://github.com/PolarisTime/Aries/compare/v9.11.4...v9.11.5) (2026-08-31)


### Bug Fixes

* **freight:** 调整物流单明细列顺序 ([f18bbc6](https://github.com/PolarisTime/Aries/commit/f18bbc64bc25d4cc7f90c589076b1678e51b27bf))
* **status:** 区分审核与完成状态标签颜色 ([3cac2a9](https://github.com/PolarisTime/Aries/commit/3cac2a937e298245a500792137015a8da6e43a60))
* **status:** 区分核定与完成状态标签颜色 ([c8dfb71](https://github.com/PolarisTime/Aries/commit/c8dfb71ba591fccda044f1a42be05cc8cb875816))

## [9.11.4](https://github.com/PolarisTime/Aries/compare/v9.11.3...v9.11.4) (2026-08-31)


### Bug Fixes

* **layout:** 收紧页面内容顶部间距 ([f4d8e40](https://github.com/PolarisTime/Aries/commit/f4d8e40b2bf0199ee6eb2289e0d178f341d4fdb6))

## [9.11.3](https://github.com/PolarisTime/Aries/compare/v9.11.2...v9.11.3) (2026-08-31)


### Bug Fixes

* **frontend:** 消除表格布局震荡 ([83cc05e](https://github.com/PolarisTime/Aries/commit/83cc05e37c12e48424412d9350dfcc0a6849f150))

## [9.11.2](https://github.com/PolarisTime/Aries/compare/v9.11.1...v9.11.2) (2026-08-31)


### Bug Fixes

* **freight:** 调整物流单明细列顺序 ([7f596bb](https://github.com/PolarisTime/Aries/commit/7f596bb3f2cb48e588659d221c5603dd357f1e5e))

## [9.11.1](https://github.com/PolarisTime/Aries/compare/v9.11.0...v9.11.1) (2026-08-31)


### Bug Fixes

* **freight-bill:** 移除明细重复名称列 ([6cb9e4c](https://github.com/PolarisTime/Aries/commit/6cb9e4c14122f8902eea4a189e8bc2fa2774704e))

# [9.11.0](https://github.com/PolarisTime/Aries/compare/v9.10.4...v9.11.0) (2026-08-29)


### Bug Fixes

* **freight-bill:** 移除商品编码展示列 ([150c29d](https://github.com/PolarisTime/Aries/commit/150c29d4a63e2b9518e1769a56b9c3045ad86116))
* **print:** 限制对账明细滚动高度 ([32811c2](https://github.com/PolarisTime/Aries/commit/32811c29ed7bad48e1de58339ed8a3f003d8a340))


### Features

* **statement:** 增加物流对账单自动排序选项 ([34a7cb6](https://github.com/PolarisTime/Aries/commit/34a7cb6507649affd37ef7719f8b3e4a5893f763))

## [9.10.4](https://github.com/PolarisTime/Aries/compare/v9.10.3...v9.10.4) (2026-08-27)


### Bug Fixes

* **dashboard:** 移除快捷新建并支持清理标签页刷新 ([5b2d05c](https://github.com/PolarisTime/Aries/commit/5b2d05cd905981d74fbbdb5cbe3ac562fbec622a))
* **freight-bill:** 按项目分组展示物流明细 ([229d020](https://github.com/PolarisTime/Aries/commit/229d020c14cc39274c4b255da6bdfa6b2714aac2))

## [9.10.3](https://github.com/PolarisTime/Aries/compare/v9.10.2...v9.10.3) (2026-08-26)


### Bug Fixes

* **master:** 修复项目资料客户名称显示 ([35b5ff1](https://github.com/PolarisTime/Aries/commit/35b5ff1462c3b4dedad55535d7fb968c03a85c2a))

## [9.10.2](https://github.com/PolarisTime/Aries/compare/v9.10.1...v9.10.2) (2026-08-26)


### Bug Fixes

* **router:** 修复创建跳转循环与雪花ID精度丢失 ([de365f3](https://github.com/PolarisTime/Aries/commit/de365f349e61ce8e0ac76ae3102d9f7aabadc1f2))

## [9.10.1](https://github.com/PolarisTime/Aries/compare/v9.10.0...v9.10.1) (2026-08-26)


### Bug Fixes

* **print:** 兼容 PDF 输出空字段 ([2a5ba44](https://github.com/PolarisTime/Aries/commit/2a5ba44f07192d47dbabeb90e7795f6889adc909))

# [9.10.0](https://github.com/PolarisTime/Aries/compare/v9.9.0...v9.10.0) (2026-08-25)


### Bug Fixes

* **finance:** 优化财务概览台账排版 ([de27a42](https://github.com/PolarisTime/Aries/commit/de27a429f8b71c623d7c8705ee1140b939df687f))
* **finance:** 将对账明细改为弹窗 ([b76d41e](https://github.com/PolarisTime/Aries/commit/b76d41eaf312a0eda1a22a747a43589260f804d6))
* **finance:** 调整客户对账单筛选区 ([b0f9508](https://github.com/PolarisTime/Aries/commit/b0f9508cccfb9a735da346a621e4da23af28cb95))
* **finance:** 调整客户对账单表单与明细滚动 ([3d3e23c](https://github.com/PolarisTime/Aries/commit/3d3e23cd9e75597fe8bef912ebb9148158617aeb))
* **layout:** 修复快捷入口关闭标签卡死 ([755b52f](https://github.com/PolarisTime/Aries/commit/755b52fe8526b5dd71c9ce69e20329df43f84b60))
* **master:** 保存项目后失效项目选项缓存 ([a7dafd9](https://github.com/PolarisTime/Aries/commit/a7dafd98dc2510a281999e07444ed059f8ba1e98))
* **master:** 同步项目客户筛选深链 ([c6dc905](https://github.com/PolarisTime/Aries/commit/c6dc9053f07464c39fd1a3e33779e2f04b5c8120))
* **master:** 选择项目时同步结算主体 ([12bbd80](https://github.com/PolarisTime/Aries/commit/12bbd8005e020372ca8c4dde439bdcd14709216e))
* **print:** 适配对账单打印明细分组 ([127e881](https://github.com/PolarisTime/Aries/commit/127e881e07c49531c016769647d75d2d9d0c23a5))
* **purchase:** 标注卸货目标并居中项目选择 ([3aa568f](https://github.com/PolarisTime/Aries/commit/3aa568fb340dd7813a693f834bc292253bf457d4))
* **react:** 修复前端 Actions lint 门禁 ([76952b2](https://github.com/PolarisTime/Aries/commit/76952b262c269e60b2982d8b7891c0e5bbb6a7fb))
* **react:** 修复物流候选销售订单无法显示 ([3f445e3](https://github.com/PolarisTime/Aries/commit/3f445e352352937de9100614fc9da1cd8f032a70))
* **search:** 修正防抖器生命周期初始化 ([bb7c19e](https://github.com/PolarisTime/Aries/commit/bb7c19e5e0780e9c5c701cbd64cb6807ebf505ac))
* **search:** 延迟初始化搜索防抖器 ([c7ab6a0](https://github.com/PolarisTime/Aries/commit/c7ab6a04305b710ae6a1bf73a95a4e70897c0077))
* **search:** 防止全局单据搜索触发请求风暴 ([d256dd7](https://github.com/PolarisTime/Aries/commit/d256dd7a9c098a1666040d74567422a984d3f6df))
* **statement:** 按项目配置选择客户对账单主体 ([634bd6e](https://github.com/PolarisTime/Aries/commit/634bd6e9bae0ce001910c3643389ed058b2a0b8d))


### Features

* **dashboard:** 快捷入口直接打开新建弹窗 ([7f129dc](https://github.com/PolarisTime/Aries/commit/7f129dc2e832aecde49a25b1942e111e1f9e793a))
* **finance:** 按销售订单分组展示客户对账单 ([9129408](https://github.com/PolarisTime/Aries/commit/912940816a992ab0fc087cde6293d08c2b800c4b))
* **master:** 新增独立项目资料页面 ([20a4168](https://github.com/PolarisTime/Aries/commit/20a4168a9eead7b3f1f31cf937ffe10ceb572728))
* **purchase:** 支持提货清单分组选择项目简称 ([bfb8b29](https://github.com/PolarisTime/Aries/commit/bfb8b296e5ec1092e9fa620c03d3e34abaec7808))
* **react:** 统一单据关联号下钻浮层展示 ([4fbc59a](https://github.com/PolarisTime/Aries/commit/4fbc59ac7d46da9c6103768faca1fd1f88fb3e03))

# [9.9.0](https://github.com/PolarisTime/Aries/compare/v9.8.1...v9.9.0) (2026-08-24)


### Bug Fixes

* **layout:** 修复持久化业务标签页无法关闭 ([caac8e0](https://github.com/PolarisTime/Aries/commit/caac8e081eab5c2c24a68e02671d3d8829255ff1))


### Features

* **finance:** 重构收付款录入与往来台账交互 ([ce027e5](https://github.com/PolarisTime/Aries/commit/ce027e5ec274aa058e8a6353ce44a4e303cfa2c8))

## [9.8.1](https://github.com/PolarisTime/Aries/compare/v9.8.0...v9.8.1) (2026-08-24)


### Bug Fixes

* **dashboard:** 接入真实业务待办数据 ([a3b7f9f](https://github.com/PolarisTime/Aries/commit/a3b7f9f61316caae8214a2454c96d29cac21ea84))
* **react:** 稳定项目选项空数组引用 ([75695df](https://github.com/PolarisTime/Aries/commit/75695df42e2ce6bbf0fb66dd8ba98ae527016359))
* **sales-order:** 修复项目名称下拉异步刷新 ([3c81fce](https://github.com/PolarisTime/Aries/commit/3c81fcebcff5d43ce2c2842e571adcc8ee37d8e1))

# [9.8.0](https://github.com/PolarisTime/Aries/compare/v9.7.0...v9.8.0) (2026-08-24)


### Bug Fixes

* **ci:** 修复前端质量门禁 ([7e1b152](https://github.com/PolarisTime/Aries/commit/7e1b152de5a0b64f34f5840fa00b72421e1d1725))
* **layout:** 修复多标签导航栏幽灵占位与双层边框 ([4197699](https://github.com/PolarisTime/Aries/commit/4197699c550a863eb0e9237bbadccac0443e4b79))
* **layout:** 强化导航标签激活态 ([fbc6733](https://github.com/PolarisTime/Aries/commit/fbc67331a5c1fe58cd79719c39a9c9bc25f95523))
* **layout:** 收紧标签页与主内容间距 ([4f03394](https://github.com/PolarisTime/Aries/commit/4f033946204130bd38b60ac0f2422da59c8e5ac3))
* **material:** 商品类型文案落入 pages.material 节修复本地化 ([33b2ac9](https://github.com/PolarisTime/Aries/commit/33b2ac90f7b22b8171b6604d724befe55ed7096e))
* **modules:** 恢复筛选次级栅格 4 列规则修复展开布局失控 ([4b47fa3](https://github.com/PolarisTime/Aries/commit/4b47fa3a61473b6442d1bc08ef32d85f91e1fc89))
* **modules:** 状态变更成功提示按模块标题动态生成 ([4903cdc](https://github.com/PolarisTime/Aries/commit/4903cdc54fcd4d066bd09e20692e9b23c2f7b15d))
* **print:** 修复合计件数显示并增强打印链路健壮性 ([c1df553](https://github.com/PolarisTime/Aries/commit/c1df5532ff4224f0d3e3691fce4ace661b242459))
* **print:** 费用表本地化与单元格对齐 ([210c2e6](https://github.com/PolarisTime/Aries/commit/210c2e6eff46616e8913d2652ac90b7a7435c047))
* **ui:** 优化业务筛选与编辑表头布局 ([59eb873](https://github.com/PolarisTime/Aries/commit/59eb873785e9b9c9f434febfc52f49feccc33ec9))


### Features

* **dashboard:** 工作台重构为业务驱动型看板（mock 契约先行） ([20e3ed1](https://github.com/PolarisTime/Aries/commit/20e3ed14eae2cfa2b13d847b80204a575967c895))
* **document:** 单据附加费用多 Tab 架构与三通道统一 ([048c80c](https://github.com/PolarisTime/Aries/commit/048c80cd7d7993d2362563e92e1b94cd8777db64))
* **layout:** 新增全局多标签页导航与 Keep-Alive 页面缓存 ([cd9e454](https://github.com/PolarisTime/Aries/commit/cd9e454eceadd20951bef8ad8aa62e3f7ea15a4a))
* **material:** 商品资料前端支持商品类型 ([a565893](https://github.com/PolarisTime/Aries/commit/a565893212b18f55c1979fb66aecd23740c710c8))
* **sales:** 销售订单导入上游后锁定行项目并支持自动排序 ([df547d6](https://github.com/PolarisTime/Aries/commit/df547d647f72ed38b4cccea0788865957eaa6488))
* **setup:** 初始化账号适配后端 201 摘要响应 ([867c5b5](https://github.com/PolarisTime/Aries/commit/867c5b593d40ccf5383338d0a029403119d30b56))

# [9.7.0](https://github.com/PolarisTime/Aries/compare/v9.6.4...v9.7.0) (2026-08-21)


### Bug Fixes

* **ci:** 将 vitest.config.ts 纳入 tsconfig.node 项目 ([ee43054](https://github.com/PolarisTime/Aries/commit/ee4305429a53d7acaea6e2a16ba3613ddef1b734))


### Features

* **material:** 商品导入结果弹窗展示行级新增更新失败明细 ([7e4dfac](https://github.com/PolarisTime/Aries/commit/7e4dface23f87e121dc6721f7d91a8d2e1e50023))
* **material:** 商品选择下拉改为结构化多词过滤 ([ac30444](https://github.com/PolarisTime/Aries/commit/ac3044479bdc1ddc0543a84fe0899a0c4bd359c2))

## [9.6.4](https://github.com/PolarisTime/Aries/compare/v9.6.3...v9.6.4) (2026-08-09)


### Bug Fixes

* **freight-statement:** 修复详情运费单价显示 ([c6cbbfa](https://github.com/PolarisTime/Aries/commit/c6cbbfa15fb4ddea4bd27e0d21ba0d9842c6a22c))

## [9.6.3](https://github.com/PolarisTime/Aries/compare/v9.6.2...v9.6.3) (2026-08-07)


### Bug Fixes

* **print:** 打印作业明细复选框移至序号左侧 ([b553417](https://github.com/PolarisTime/Aries/commit/b5534174f31e7052fb2996184719c6d3acbd1545))

## [9.6.2](https://github.com/PolarisTime/Aries/compare/v9.6.1...v9.6.2) (2026-08-07)


### Bug Fixes

* **editor:** 商品编码只读态显示中文物料快照 ([727aaf0](https://github.com/PolarisTime/Aries/commit/727aaf01b838c8251905f219dd1309c40c4cd749))

## [9.6.1](https://github.com/PolarisTime/Aries/compare/v9.6.0...v9.6.1) (2026-08-07)


### Bug Fixes

* **doctor:** 消除 refs 诊断并关闭 Compiler todo 误报 ([57cb29d](https://github.com/PolarisTime/Aries/commit/57cb29d4f437a183aa00c7da79e09a993054f1de))

# [9.6.0](https://github.com/PolarisTime/Aries/compare/v9.5.2...v9.6.0) (2026-08-06)


### Bug Fixes

* **eslint:** hooks 层列宽解析工具移至 utils 层 ([3c1dd95](https://github.com/PolarisTime/Aries/commit/3c1dd95f345fb3ba6a6d0997a92a347122455234))


### Features

* **column-resize:** 列表页列宽拖拽调整并持久化 ([868f8c7](https://github.com/PolarisTime/Aries/commit/868f8c7edc0afae1383cf335803cd633e465165e))
* **column-resize:** 编辑器明细/采购拣货/结算账户表接入列宽拖拽 ([8580235](https://github.com/PolarisTime/Aries/commit/85802359f8e781f4b0bbca92735dba8ba27cbd0f))

## [9.5.2](https://github.com/PolarisTime/Aries/compare/v9.5.1...v9.5.2) (2026-08-05)


### Bug Fixes

* **frontend:** 修复销售出库/物流单明细保存的实体 ID 契约校验失败 ([954f3c2](https://github.com/PolarisTime/Aries/commit/954f3c2969ebd60dc6d691ee694c5d645148078c))

## [9.5.1](https://github.com/PolarisTime/Aries/compare/v9.5.0...v9.5.1) (2026-08-05)


### Bug Fixes

* **freight-statement:** 同步 schema 明细保存字段使精简生效 ([f0ea4bd](https://github.com/PolarisTime/Aries/commit/f0ea4bd41262ef66002217e1cbfe78ddaae9c4a2))

# [9.5.0](https://github.com/PolarisTime/Aries/compare/v9.4.0...v9.5.0) (2026-08-05)


### Features

* **freight-statement:** 物流对账单明细分组展示优化 ([368d6ec](https://github.com/PolarisTime/Aries/commit/368d6ec95250e5f131850ea51bf696bb9ec52c4a))

# [9.4.0](https://github.com/PolarisTime/Aries/compare/v9.3.1...v9.4.0) (2026-08-05)


### Features

* **freight-statement:** 物流对账单明细按单据与项目分组展示 ([ee6fbf9](https://github.com/PolarisTime/Aries/commit/ee6fbf9183a19d79b16bd57d5bee442ae907373c))

## [9.3.1](https://github.com/PolarisTime/Aries/compare/v9.3.0...v9.3.1) (2026-08-04)


### Bug Fixes

* **frontend:** 打印模板契约对齐与预览优化 ([db4c4eb](https://github.com/PolarisTime/Aries/commit/db4c4eb2f19354aee5b8105ad0c03dcfcb0e7510))
* **purchase-inbound:** 移除表头仓库和结算方式限制 ([e89e15e](https://github.com/PolarisTime/Aries/commit/e89e15e091988c662120f00aabcdd8b440a04634))

## [9.3.1](https://github.com/PolarisTime/Aries/compare/v9.3.0...v9.3.1) (2026-08-03)


### Bug Fixes

* **purchase-inbound:** 移除表头仓库和结算方式限制 ([e89e15e](https://github.com/PolarisTime/Aries/commit/e89e15e091988c662120f00aabcdd8b440a04634))

# [9.3.0](https://github.com/PolarisTime/Aries/compare/v9.2.1...v9.3.0) (2026-08-01)


### Bug Fixes

* **print:** 防止交货日期显示换行 ([8b79c6c](https://github.com/PolarisTime/Aries/commit/8b79c6c18f06fea13c2a651275caaf51fc87ea4d))


### Features

* **frontend:** 增加版本更新强制刷新 ([e382bf9](https://github.com/PolarisTime/Aries/commit/e382bf9ae3d11a7b1006edf5cfd1c632e51a8259))

## [9.2.1](https://github.com/PolarisTime/Aries/compare/v9.2.0...v9.2.1) (2026-08-01)


### Bug Fixes

* **print:** 优化打印作业窗口及明细状态展示 ([e953613](https://github.com/PolarisTime/Aries/commit/e953613fa51302c7898052e84ad4e608ea98ff5c))

# [9.2.0](https://github.com/PolarisTime/Aries/compare/v9.1.0...v9.2.0) (2026-08-01)


### Features

* **print:** 支持切换销售订单明细合并模式 ([9677ca6](https://github.com/PolarisTime/Aries/commit/9677ca611dd2d9d41626456d0835abc998dbb9c5))

# [9.1.0](https://github.com/PolarisTime/Aries/compare/v9.0.4...v9.1.0) (2026-08-01)


### Bug Fixes

* **editor:** 统一商品编码和品牌最小列宽 ([8f461c5](https://github.com/PolarisTime/Aries/commit/8f461c5528373f9710b61cc227ca3ce5a4f22b86))


### Features

* **print:** 标识A4打印明细合并组 ([c15b63c](https://github.com/PolarisTime/Aries/commit/c15b63c23dcad9c79f385e2b15d14b86af6cd682))

## [9.0.4](https://github.com/PolarisTime/Aries/compare/v9.0.3...v9.0.4) (2026-08-01)


### Bug Fixes

* **deps:** 修复前端依赖安全漏洞 ([f4f5325](https://github.com/PolarisTime/Aries/commit/f4f53252abaa6a7feab8f1cbdc9f1d9d39dd513b))

## [9.0.3](https://github.com/PolarisTime/Aries/compare/v9.0.2...v9.0.3) (2026-08-01)


### Bug Fixes

* **api:** 统一实体 ID 响应解析 ([5081c36](https://github.com/PolarisTime/Aries/commit/5081c3681f72943fd0a6a0bd23922e295129465c))

## [9.0.2](https://github.com/PolarisTime/Aries/compare/v9.0.1...v9.0.2) (2026-08-01)


### Bug Fixes

* **ci:** 清理自托管前端部署工作区 ([bb25455](https://github.com/PolarisTime/Aries/commit/bb25455050f34a29dbd43e3c18c5ea43ef86ed2a))

## [9.0.1](https://github.com/PolarisTime/Aries/compare/v9.0.0...v9.0.1) (2026-08-01)


### Bug Fixes

* **ci:** 重试前端部署产物下载 ([e4c5fb7](https://github.com/PolarisTime/Aries/commit/e4c5fb7b990722eb22c4abaa25ca5be084370170))

# [9.0.0](https://github.com/PolarisTime/Aries/compare/v8.9.0...v9.0.0) (2026-07-31)


* feat(api)!: 仅保留 V2 接口契约 ([2929f95](https://github.com/PolarisTime/Aries/commit/2929f95a211e262157e771c5cda5f4cdf3137e83))


### BREAKING CHANGES

* 前端不再兼容 V1 API，后端必须提供 /api/v2.0 契约。

# [8.9.0](https://github.com/PolarisTime/Aries/compare/v8.8.0...v8.9.0) (2026-07-31)


### Features

* **purchase:** 增强提货清单分组排序 ([064aea4](https://github.com/PolarisTime/Aries/commit/064aea473937dde4285fcfc21258f5828b984c11))

# [8.8.0](https://github.com/PolarisTime/Aries/compare/v8.7.0...v8.8.0) (2026-07-30)


### Features

* **purchase:** 新增采购订单提货清单自由分组 ([d0b68c1](https://github.com/PolarisTime/Aries/commit/d0b68c190445562320743375a1145ae7950c432c))

# [8.7.0](https://github.com/PolarisTime/Aries/compare/v8.6.0...v8.7.0) (2026-07-30)


### Features

* **ui:** 完善打印作业状态与列表序号展示 ([6b5a2fc](https://github.com/PolarisTime/Aries/commit/6b5a2fc82300db69d4b2b6eec3c358b2c9a89404))

# [8.6.0](https://github.com/PolarisTime/Aries/compare/v8.5.0...v8.6.0) (2026-07-29)


### Features

* **editor:** 支持订单保存后自动创建出入库 ([7acab92](https://github.com/PolarisTime/Aries/commit/7acab922e1043cba7f5ce18cbf1cca6391de83be))

# [8.5.0](https://github.com/PolarisTime/Aries/compare/v8.4.0...v8.5.0) (2026-07-29)


### Bug Fixes

* **print:** 调整打印明细摘要为两行布局 ([9002660](https://github.com/PolarisTime/Aries/commit/9002660f369de560603d3c0c39d6420f3df93b83))


### Features

* **editor:** 支持保存后再做一张单据 ([8bb322c](https://github.com/PolarisTime/Aries/commit/8bb322c53397c6faa71e175d32561a630408024c))
* **print:** 增加打印明细序号列 ([5d10417](https://github.com/PolarisTime/Aries/commit/5d10417ad07890d628a06def84a66206e3e5c348))

# [8.4.0](https://github.com/PolarisTime/Aries/compare/v8.3.0...v8.4.0) (2026-07-29)


### Features

* **frontend:** 全局统一使用苹方字体 ([b7858f3](https://github.com/PolarisTime/Aries/commit/b7858f3879f353cedff77762fc9818452337f875))
* **frontend:** 统一日期展示格式 ([f23002e](https://github.com/PolarisTime/Aries/commit/f23002e44026f550d0d07ecc4cdd6baea81dea02))

# [8.3.0](https://github.com/PolarisTime/Aries/compare/v8.2.0...v8.3.0) (2026-07-28)


### Bug Fixes

* **editor:** 修复明细拖拽丢行问题 ([5d52246](https://github.com/PolarisTime/Aries/commit/5d522468437d3ac387f1a71b028cb83ff886c3b7))


### Features

* **print:** 打印明细显示交货日期 ([2ec9c80](https://github.com/PolarisTime/Aries/commit/2ec9c80f82e9dd6b36b6d43383080deed477705a))

# [8.2.0](https://github.com/PolarisTime/Aries/compare/v8.1.3...v8.2.0) (2026-07-28)


### Features

* **sales-order:** 支持多选导入采购订单明细 ([5c379c0](https://github.com/PolarisTime/Aries/commit/5c379c0759036d891c1592ba37d0c12d094f3da3))

## [8.1.3](https://github.com/PolarisTime/Aries/compare/v8.1.2...v8.1.3) (2026-07-27)


### Bug Fixes

* **master-data:** 复用客户资料管理关联项目 ([f4fbb29](https://github.com/PolarisTime/Aries/commit/f4fbb29bf5858efb5a5b0b3f8a699dca24fecfec))

## [8.1.2](https://github.com/PolarisTime/Aries/compare/v8.1.1...v8.1.2) (2026-07-27)


### Bug Fixes

* **frontend:** 修复级联选择残留条件 ([c5f0024](https://github.com/PolarisTime/Aries/commit/c5f0024339efc3f0b8016ad7027f22bb65cdf993))

## [8.1.1](https://github.com/PolarisTime/Aries/compare/v8.1.0...v8.1.1) (2026-07-26)


### Bug Fixes

* **frontend:** 修复业务筛选与身份字段契约 ([f25c521](https://github.com/PolarisTime/Aries/commit/f25c521556d1bdc9947416912b82e52d45b8ea7a))

# [8.1.0](https://github.com/PolarisTime/Aries/compare/v8.0.2...v8.1.0) (2026-07-26)


### Bug Fixes

* **frontend:** 修复生产边界并收敛前端架构 ([be8a27a](https://github.com/PolarisTime/Aries/commit/be8a27a8a20c1e6983d96d1bb6685ee3be7a817b))


### Features

* **statement:** 恢复对账菜单并新增客户汇总 ([7a0307d](https://github.com/PolarisTime/Aries/commit/7a0307da906abc6cf0380f54764e6514c01db745))

## [8.0.2](https://github.com/PolarisTime/Aries/compare/v8.0.1...v8.0.2) (2026-07-25)


### Bug Fixes

* **sales-order:** 扩展默认交货日期筛选范围 ([19e66d9](https://github.com/PolarisTime/Aries/commit/19e66d9d3542650cd051b0d8c24cc2fa0cd1794c))

## [8.0.1](https://github.com/PolarisTime/Aries/compare/v8.0.0...v8.0.1) (2026-07-25)


### Bug Fixes

* **frontend:** 修复客户项目联动和打印模板加载 ([a904342](https://github.com/PolarisTime/Aries/commit/a9043428d319c48bb95c20d471ae157546a6c58b))

# [8.0.0](https://github.com/PolarisTime/Aries/compare/v7.2.0...v8.0.0) (2026-07-25)


* refactor(frontend)!: 移除导航标签并统一编辑会话 ([e469f4b](https://github.com/PolarisTime/Aries/commit/e469f4b07c490f5efcf71b6d2133930c796f1256))


### Bug Fixes

* **build:** 统一 Node 版本并迁移 pnpm 配置 ([3b71d0c](https://github.com/PolarisTime/Aries/commit/3b71d0c2a92d64465dc0459bd47c59e1045d37e9))


### BREAKING CHANGES

* 移除导航标签栏、编辑任务抽屉及其本地持久化状态。

# [7.2.0](https://github.com/PolarisTime/Aries/compare/v7.1.0...v7.2.0) (2026-07-22)


### Features

* **purchase:** 优化采购订单明细录入 ([a4bed90](https://github.com/PolarisTime/Aries/commit/a4bed909ada1c956cbe2173f8fb3d0b095da354e))

# [7.1.0](https://github.com/PolarisTime/Aries/compare/v7.0.5...v7.1.0) (2026-07-22)


### Features

* **print:** 使用后端导出文件名 ([8c070f5](https://github.com/PolarisTime/Aries/commit/8c070f56433ed0388ac7d1410f6ed8b0a4ff2eb9))

## [7.0.5](https://github.com/PolarisTime/Aries/compare/v7.0.4...v7.0.5) (2026-07-22)


### Bug Fixes

* **workflow:** 统一单据审核与核定交互 ([dadcb4e](https://github.com/PolarisTime/Aries/commit/dadcb4efa642fb0d75822588538fabcb96f5aa0b))

## [7.0.4](https://github.com/PolarisTime/Aries/compare/v7.0.3...v7.0.4) (2026-07-22)


### Bug Fixes

* **frontend:** 修复编辑任务切换与页面状态同步 ([45aa5de](https://github.com/PolarisTime/Aries/commit/45aa5de1f8cbe199d95bafe4a75abba6da3b1a07))

## [7.0.3](https://github.com/PolarisTime/Aries/compare/v7.0.2...v7.0.3) (2026-07-21)


### Bug Fixes

* **purchase:** 允许采购入库混合理算与过磅 ([336ab0c](https://github.com/PolarisTime/Aries/commit/336ab0cf7d2c64a1a25ba3733ebaa8ca9a2ea5dc))

## [7.0.2](https://github.com/PolarisTime/Aries/compare/v7.0.1...v7.0.2) (2026-07-20)


### Bug Fixes

* **document:** 增加已删除单据状态筛选 ([cbaf8b4](https://github.com/PolarisTime/Aries/commit/cbaf8b40aa8f7b6d2281164cdd2772bda3649058))

## [7.0.1](https://github.com/PolarisTime/Aries/compare/v7.0.0...v7.0.1) (2026-07-20)


### Bug Fixes

* **frontend:** 修复候选筛选与认证刷新竞态 ([d673184](https://github.com/PolarisTime/Aries/commit/d67318451d9c9e5dcbd0e433f706ba6a07265149))

# [7.0.0](https://github.com/PolarisTime/Aries/compare/v6.0.0...v7.0.0) (2026-07-20)


* fix(import)!: 统一上级单据候选准入逻辑 ([22eb122](https://github.com/PolarisTime/Aries/commit/22eb122fb3c757e2e8103092e11dcbcaecc9867c))


### BREAKING CHANGES

* 前端改用 /purchase-orders/inbound-import-candidates，不再支持采购预付款候选和旧 usage 参数。

# [6.0.0](https://github.com/PolarisTime/Aries/compare/v5.0.0...v6.0.0) (2026-07-20)


* refactor(master)!: 统一基础资料编码展示并移除部门入口 ([d60f217](https://github.com/PolarisTime/Aries/commit/d60f217de3a9f86791b9a4a72a9ae103f95e8c53))


### BREAKING CHANGES

* 基础资料编码不再允许手工录入；部门管理入口与用户部门字段已移除。

# [5.0.0](https://github.com/PolarisTime/Aries/compare/v4.1.0...v5.0.0) (2026-07-18)


* refactor(purchase)!: 简化采购入库编辑流程 ([a7f058f](https://github.com/PolarisTime/Aries/commit/a7f058f19a39940ad3968e881fdd57f45d3bd1ce))


### Features

* **layout:** 优化编辑工作区标签栏 ([4895e05](https://github.com/PolarisTime/Aries/commit/4895e05be0b8f2076f0b3a6a38389984945a1c83))


### BREAKING CHANGES

* 移除采购入库拆分批次、超差原因审核和逐件重量前端接口。

# [4.1.0](https://github.com/PolarisTime/Aries/compare/v4.0.0...v4.1.0) (2026-07-18)


### Bug Fixes

* **finance:** 消除财务概览级联渲染 ([20cb116](https://github.com/PolarisTime/Aries/commit/20cb116203dc03efa7b8627be8878507cf12ac88))


### Features

* **finance:** 新增财务概览并简化收付款页面 ([2afc999](https://github.com/PolarisTime/Aries/commit/2afc999b3a35efd4910f68b15e013c801ef2bc90))

# [4.0.0](https://github.com/PolarisTime/Aries/compare/v3.0.0...v4.0.0) (2026-07-18)


* refactor(batch)!: 固定批号管理并自动生成采购批号 ([9221006](https://github.com/PolarisTime/Aries/commit/92210061d103cdd8e200d1ce0cd73c89e7d77b9e))
* refactor(frontend)!: 移除权限与安全中心功能 ([b98edb5](https://github.com/PolarisTime/Aries/commit/b98edb5389f0f6e908f887cfc71173c30c7c9885))
* refactor(report)!: 移除报表模块 ([8687910](https://github.com/PolarisTime/Aries/commit/8687910a3df6d049fa770f6876d0a1f4acacbaa4))
* refactor(security)!: 全量切换纯 RBAC 并移除安全设置 ([51b281e](https://github.com/PolarisTime/Aries/commit/51b281eaa3689b2026c875ebc2a3126b707ecd11))
* refactor(security)!: 移除数据范围配置与前端契约 ([c890c78](https://github.com/PolarisTime/Aries/commit/c890c78ba94182b795f77a914624f01039fdd1bd))
* refactor(settings)!: 移除设置页面与公司初始化引导 ([a02df45](https://github.com/PolarisTime/Aries/commit/a02df45995157ee5aee47794615f9ed4c129cece))
* refactor(settings)!: 移除默认税率 ([f08833f](https://github.com/PolarisTime/Aries/commit/f08833f09ba371fdf586c748f362d83306d1ddce))
* refactor(system)!: 移除数据库管理界面 ([25e18bb](https://github.com/PolarisTime/Aries/commit/25e18bbfbbd1314db3fbae26e03decf90c3f16b3))


### Bug Fixes

* **access-control:** 对齐权限管理页面与后端契约 ([c4bd70b](https://github.com/PolarisTime/Aries/commit/c4bd70b59bd18228cd499374575b8ca4d6679f76))
* **editor:** 修正上级单据导入按钮状态 ([07a5fe5](https://github.com/PolarisTime/Aries/commit/07a5fe5b3cc1beaa69695c2eb91083310971960b))
* **material:** 展示商品导入跳过数量 ([8041216](https://github.com/PolarisTime/Aries/commit/80412163e582945d12b87676562e018c287f3cbb))


### Features

* **frontend:** 完成 ProComponents 分阶段改造 ([2079dd8](https://github.com/PolarisTime/Aries/commit/2079dd8331f97dce7a1321d077ac520f25017680))
* **frontend:** 接入 ProComponents 与前端可观测性 ([212562d](https://github.com/PolarisTime/Aries/commit/212562d0ac09d969cb58874f7a99e6477803ebff))
* **logistics:** 迁移物流单与物流对账交互 ([78e5021](https://github.com/PolarisTime/Aries/commit/78e50214f9c49b75b0d332528a97b132b5167916))


### BREAKING CHANGES

* 删除动态设置页面及 OOBE 公司初始化流程，旧页面路由和公司初始化接口不再可用。
* 前端删除 RBAC 权限状态、角色权限管理、访问控制和账户安全页面，仅保留身份认证流程。
* 商品资料不再展示或提交 batchNoEnabled。
* 移除 inventory-report 与 io-report 前端页面和相关导航入口。
* 首次初始化、公司资料和运行时配置不再包含 taxRate/defaultTaxRate 字段。
* 移除旧安全中心、API Key、动态编号及限流配置接口。
* 前端不再读取或提交 dataScope/dataScopes 字段，角色与用户管理界面不再支持数据范围配置。
* 前端不再提供数据库管理入口及相关操作。

# [3.0.0](https://github.com/PolarisTime/Aries/compare/v2.4.0...v3.0.0) (2026-07-15)


* feat(finance)!: 重构财务为资金流水模式 ([678cb2a](https://github.com/PolarisTime/Aries/commit/678cb2a5e7251013438bffc1a08bfbf07aed2962))
* feat(order-flow)!: 重构采购销售物流及财务交互 ([3afb321](https://github.com/PolarisTime/Aries/commit/3afb32123fae0176816f9bf645cce9221dac2cbb))


### Bug Fixes

* **editor:** 修复保存后重复提示未保存草稿 ([13aae37](https://github.com/PolarisTime/Aries/commit/13aae37c40849383c5b7055dbc492fcd51027652))
* **system:** 修复系统参数加载失败误显示为空 ([d258a41](https://github.com/PolarisTime/Aries/commit/d258a4104a782d5eb307f5c8f63c886f3f16ebc2))


### Features

* **contract:** 完善合同状态操作与终态保护 ([2ff52f3](https://github.com/PolarisTime/Aries/commit/2ff52f3d2ae37c9b84f35f706402fb570177456f))


### BREAKING CHANGES

* 删除旧财务辅助单据页面，原应收应付页面替换为资金流水。
* 移除采购退款单、供应商退款到账及本地草稿接口，调整采购完成和财务单据交互契约。

# [2.4.0](https://github.com/PolarisTime/Aries/compare/v2.3.5...v2.4.0) (2026-07-13)


### Features

* **import:** 接入服务端来源候选与完成状态反审核 ([dd5272f](https://github.com/PolarisTime/Aries/commit/dd5272f04d5cc355d28d636d5dcf49fa7109c720))

## [2.3.5](https://github.com/PolarisTime/Aries/compare/v2.3.4...v2.3.5) (2026-07-13)


### Bug Fixes

* **sales-order:** 修复草稿订单被无关出库锁定 ([60aed81](https://github.com/PolarisTime/Aries/commit/60aed81792a31a00fe9c6bd909e06691b0f88310))

## [2.3.4](https://github.com/PolarisTime/Aries/compare/v2.3.3...v2.3.4) (2026-07-13)


### Bug Fixes

* **layout:** 修复激活编辑标签无法重新打开单据 ([61a8c5f](https://github.com/PolarisTime/Aries/commit/61a8c5f80ed980486e55dd63d08b2adfa268a1c1))

## [2.3.3](https://github.com/PolarisTime/Aries/compare/v2.3.2...v2.3.3) (2026-07-13)


### Bug Fixes

* **ci:** 修复前端类型检查和格式校验 ([aea4afa](https://github.com/PolarisTime/Aries/commit/aea4afa51cc7fd3006f12a90b0fee98100bd7ee0))
* **sales-order:** 修复完成采购订单无法选择 ([32b7265](https://github.com/PolarisTime/Aries/commit/32b72654d8a09a01ec8c677b7251f4aa743e15de))

## [2.3.2](https://github.com/PolarisTime/Aries/compare/v2.3.1...v2.3.2) (2026-07-13)


### Bug Fixes

* **sales-order:** 允许导入完成采购订单 ([d6fd474](https://github.com/PolarisTime/Aries/commit/d6fd4740323242e10ab93ef214616eef9a402045))

## [2.3.1](https://github.com/PolarisTime/Aries/compare/v2.3.0...v2.3.1) (2026-07-13)


### Bug Fixes

* **react:** 修复草稿日期恢复与下拉选项显示 ([79b9bdb](https://github.com/PolarisTime/Aries/commit/79b9bdb36579b407b00160961222bff6962970f3))

# [2.3.0](https://github.com/PolarisTime/Aries/compare/v2.2.0...v2.3.0) (2026-07-13)


### Bug Fixes

* **api:** 后端离线时统一跳转错误页 ([ce4fe8b](https://github.com/PolarisTime/Aries/commit/ce4fe8bba059f1512e2d6285865f245e3a599dc1))
* **react:** 完善编辑草稿保存与恢复逻辑 ([3a3c1f8](https://github.com/PolarisTime/Aries/commit/3a3c1f8ab357f2bacdfd60feaff8399599db6427))
* **ui:** 恢复业务列表交互与分页展示 ([8941a3e](https://github.com/PolarisTime/Aries/commit/8941a3e8b6cc58a17abf91389ea30b5a9bbef69b))


### Features

* **auth:** 重设计登录与初始化引导界面 ([e92fa88](https://github.com/PolarisTime/Aries/commit/e92fa885dacbd99bd1463fdc607afbf96a838c81))
* **frontend:** 统一业务单据交互并补齐退款与预付款流程 ([f18132d](https://github.com/PolarisTime/Aries/commit/f18132de8b979e7e08d8af0072fc0d3828e0be78))
* **identity:** 完成前端稳定身份链路收口 ([ac7b7ba](https://github.com/PolarisTime/Aries/commit/ac7b7ba1af6f16828ac5728f4aec389afe276649))
* **identity:** 收口前端稳定身份业务链 ([9542a25](https://github.com/PolarisTime/Aries/commit/9542a25fc31b12b659a901f65fb4b5594d012d51))
* **layout:** 重构工作台与编辑任务导航 ([3d2ed06](https://github.com/PolarisTime/Aries/commit/3d2ed066e00318e99af0d39d4105bdcd3256cf83))
* **react:** 统一业务结果页与列表交互 ([9d4af0d](https://github.com/PolarisTime/Aries/commit/9d4af0d7bd7af9f9233171aff9cdf9de60b88c13))
* **react:** 重做财务工作台交互与布局 ([8307a37](https://github.com/PolarisTime/Aries/commit/8307a37a4828950103e31e2067b6b736e3382e48))
* **sales:** 新增交付核定操作界面 ([4f669aa](https://github.com/PolarisTime/Aries/commit/4f669aaf30e2340a9dea592b23ec9ea6be6ea128))
* **table:** 优化列表选中与命令区交互 ([e8bf232](https://github.com/PolarisTime/Aries/commit/e8bf232e28fffc07560b2ec9ca8bff885f002e99))
* **table:** 补充业务列表追溯列 ([bee707f](https://github.com/PolarisTime/Aries/commit/bee707f63a4fc7a4b0ece12f61719b3b0dc4e95c))
* **ui:** 优化业务列表交互与分页信息 ([8ae23a1](https://github.com/PolarisTime/Aries/commit/8ae23a10ac669ff45d410e50598ce30189b8dc2b))

# [2.2.0](https://github.com/PolarisTime/Aries/compare/v2.1.3...v2.2.0) (2026-07-10)


### Bug Fixes

* **frontend:** 对齐后端安全与数据一致性契约 ([ef1a3df](https://github.com/PolarisTime/Aries/commit/ef1a3df7fb7bd8d54c044a19ebc95b54b2fd06bc))
* **react:** 修复 React Doctor 检查问题 ([74f3e63](https://github.com/PolarisTime/Aries/commit/74f3e63f8bf227777d038559751a0cd2e1a1bd9c))
* **system:** 补充关闭 2FA 的验证码校验 ([b5bede7](https://github.com/PolarisTime/Aries/commit/b5bede753d4c9e0e0b2e20886b0974f10b179930))


### Features

* **order:** 自动带出往来方默认结算主体 ([c89b126](https://github.com/PolarisTime/Aries/commit/c89b12692d07dc046170bda3952dcc9367fd0cc2))

## [2.1.3](https://github.com/PolarisTime/Aries/compare/v2.1.2...v2.1.3) (2026-07-10)


### Bug Fixes

* **frontend:** 完成前端安全整改与业务修复 ([30165d6](https://github.com/PolarisTime/Aries/commit/30165d682bbc5d624241303c11acf5c30af0ee3e))

## [2.1.2](https://github.com/PolarisTime/Aries/compare/v2.1.1...v2.1.2) (2026-07-10)


### Bug Fixes

* **frontend:** 过滤已删除的锁定关联行 ([e4d4139](https://github.com/PolarisTime/Aries/commit/e4d4139d487a4aa49f76c85c18a2a15eaa40c229))
* **ui:** 派生展示软删除状态 ([bf3882f](https://github.com/PolarisTime/Aries/commit/bf3882f2d4d06ccfba2c5fe800e358637cebdd79))

## [2.1.1](https://github.com/PolarisTime/Aries/compare/v2.1.0...v2.1.1) (2026-07-09)


### Bug Fixes

* **editor:** 修复采购订单草稿恢复显示与保存 ([59da677](https://github.com/PolarisTime/Aries/commit/59da677c64e69b557a0f5100ce76928cf42c4ab6))
* **editor:** 调整明细列宽和数字输入居中 ([3cb06b7](https://github.com/PolarisTime/Aries/commit/3cb06b7238cc3ebdc69d129dabcc0169cb48fb4d))
* **material:** 商品编码检索排除类别 ([afd2aeb](https://github.com/PolarisTime/Aries/commit/afd2aeb27f4ea6bda74f963acd8725e3f8960e9f))
* **table:** 调整业务表格列宽 ([7faafa1](https://github.com/PolarisTime/Aries/commit/7faafa14683f921f88e1254b5e3f3b1b170a42c7))

# [2.1.0](https://github.com/PolarisTime/Aries/compare/v2.0.3...v2.1.0) (2026-07-09)


### Bug Fixes

* **frontend:** 修复发布校验失败 ([61acd7d](https://github.com/PolarisTime/Aries/commit/61acd7d64856ec5e0bbfd19e496f56f61f544d30))
* **frontend:** 增加采购入库重量冲突提示 ([5076391](https://github.com/PolarisTime/Aries/commit/507639103dae63106f17171930c33da00e22cc28))


### Features

* **layout:** 增加页脚构建信息展示 ([21856d0](https://github.com/PolarisTime/Aries/commit/21856d0ef9c6e0d74ea816c28a42a557c96c58df))
* **logistics:** 支持预出库提货清单交互 ([c0627fb](https://github.com/PolarisTime/Aries/commit/c0627fb585f0d61998e17cba5edd0ffc9bd358b0))
* **modules:** 新增单据费用编辑与保存 ([3137dd6](https://github.com/PolarisTime/Aries/commit/3137dd62c940d3c6fa4ef170d73249d641c89c4d))
* **purchase-order:** 支持盘螺线材件重编辑 ([999e938](https://github.com/PolarisTime/Aries/commit/999e9383b318226c7b5fa2ef71ca802e277114e1))


### Reverts

* **modules:** 回退单据费用编辑功能 ([eb18f96](https://github.com/PolarisTime/Aries/commit/eb18f96c0f3ae4b361e6c2b450b4683195e8f8a3))

## [2.0.3](https://github.com/PolarisTime/Aries/compare/v2.0.2...v2.0.3) (2026-07-08)


### Bug Fixes

* **api:** 对齐后端接口契约路径 ([b6a91b5](https://github.com/PolarisTime/Aries/commit/b6a91b5dceb74de34571a1aa5fac8f86272cdbc5))

## [2.0.2](https://github.com/PolarisTime/Aries/compare/v2.0.1...v2.0.2) (2026-07-07)


### Bug Fixes

* **api:** 修正上传规则接口路径 ([d2db1e3](https://github.com/PolarisTime/Aries/commit/d2db1e34c4bc9e110a647be098a2d79ba46f9143))

## [2.0.1](https://github.com/PolarisTime/Aries/compare/v2.0.0...v2.0.1) (2026-07-06)


### Bug Fixes

* **deploy:** 修复前端本机部署脚本获取方式 ([5ed4a8f](https://github.com/PolarisTime/Aries/commit/5ed4a8fe5bccf4685c3ae633f10a4240b1d6b702))

# [2.0.0](https://github.com/PolarisTime/Aries/compare/v1.1.1...v2.0.0) (2026-07-06)


* feat(react)!: 切换客户端运行时配置接口 ([8ada357](https://github.com/PolarisTime/Aries/commit/8ada3570cc5f3ea99d50a8a6aa27f0dd21fcaf1b))


### Bug Fixes

* **react:** 修复初始化完成后登录跳转 ([83ee13c](https://github.com/PolarisTime/Aries/commit/83ee13c54843b1f3ceedc3c82bd62f23956f2c01))


### Features

* **react:** 接入后端版本信息 ([972f121](https://github.com/PolarisTime/Aries/commit/972f12135fcd9c658bbb4bad1b4d47133370b6c2))


### BREAKING CHANGES

* 前端不再调用 /general-settings/client-setting，运行时配置统一改为 /runtime-config。
