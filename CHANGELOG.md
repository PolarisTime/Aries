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
