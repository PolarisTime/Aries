# ADR-001：鉴权会话持久化与离线恢复

## 状态

已采纳，2026-07-26。

## 背景

Aries 需要在页面刷新后恢复会话，并在 Leo 暂时不可用时避免立即中断仍处于有效期内的工作。与此同时，任何可被 JavaScript 读取的令牌都会放大 XSS 的影响，因此持久化便利性与令牌暴露面需要明确取舍。

Leo 当前签发的 access token 有效期为 10 分钟。refresh token 只通过 `HttpOnly`、`SameSite=Strict` Cookie 传输，前端代码不能读取；生产 HTTPS 环境同时依赖 `Secure` 属性保护传输。

## 决策

1. access token 在运行时保留内存副本，并根据“记住登录”选择 `localStorage` 或 `sessionStorage`，用于页面刷新后的会话恢复。两种 Web Storage 都不能抵御同源 XSS；`sessionStorage` 只缩短持久化范围。
2. refresh token 不进入 JavaScript、Zustand 或 Web Storage。刷新继续使用 HttpOnly Cookie、轮换、重放冲突宽限、single-flight 请求与 session epoch，避免并发刷新覆盖新会话。
3. `restoreSession` 优先向 Leo 刷新会话。刷新失败时，仅保留本地仍有 access token、用户快照且 token 尚未过期的会话；离线窗口上限跟随 Leo 的 access token 剩余有效期，当前最多 10 分钟，不在前端另设更长宽限。
4. SPA 由 Nginx 下发 CSP、`frame-ancestors 'none'`、`nosniff`、Referrer Policy 与 Permissions Policy。CSP 约束脚本来源，可降低注入脚本执行概率，但不能消除 XSS，也不能替代输入输出编码、依赖治理和代码审查。

当前 `setAuthSession` 总会写入 token 到期时间。为兼容历史存储，现有实现对缺少到期时间的旧会话仍按可用处理；这不是新的安全保证，应在停止兼容旧会话时改为缺少到期时间即失败关闭。

## 权衡

- 保留 Web Storage 使刷新恢复和短时离线工作更稳定，但成功执行的同源恶意脚本可以窃取 access token，并在其剩余有效期内调用 API。
- HttpOnly refresh cookie 限制了长期凭据泄露，但服务端撤销会话后，离线页面可能在 access token 剩余有效期内继续显示登录态；恢复联网后的受保护请求仍以服务端鉴权结果为准。
- 改为仅内存保存 access token 可减少静态令牌暴露面，但每次页面刷新都必须依赖 refresh 接口，Leo 不可用时无法恢复当前工作。本阶段不接受这项可用性退化。

## 缓解措施

- CSP 的脚本源除同源外，仅放行现有本机 CLodop 服务 `http://localhost:8000/18000`，并仅为 Ant Design 运行时样式保留 `style-src 'unsafe-inline'`；新增脚本源必须经过安全审查。
- access token 有效期由 Leo 控制并保持短期，前端严格按服务端返回的 `expiresIn` 写入到期时间。
- refresh token 保持 HttpOnly、SameSite 和轮换机制；鉴权失败提示按会话去重，只在登录或刷新成功建立新会话后复位。
- 持续执行依赖扫描、输出编码审查和安全响应头检查。CSP 告警或 XSS 事件不得仅以“令牌有效期短”为理由降级处理。

## 重新评估条件

出现以下任一情况时，应重新评估为“access token 仅存内存”或 BFF/全 Cookie 会话，并评估取消离线恢复：

- 发生 XSS、供应链脚本污染或 access token 泄露事件；
- CSP 需要新增第三方脚本、放宽 `script-src`，或无法继续稳定执行；
- Leo 将 access token 有效期提高到 10 分钟以上；
- 系统进入多人共用终端、高敏感数据或更严格合规场景；
- 产品不再接受服务端撤销后最多一个 access token 剩余周期的本地登录态；
- Leo 提供可替代 Web Storage 且不损害刷新恢复体验的会话方案。
