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
