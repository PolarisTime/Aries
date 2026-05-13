import Alert from 'antd/es/alert'

export function ApiKeyUsageAlert() {
  return (
    <Alert
      type="info"
      showIcon
      className="mb-4"
      title="API Key 使用说明"
      description={
        <div style={{ display: 'grid', gap: 4, lineHeight: 1.7 }}>
          <div>
            1. 生成后会返回完整密钥，仅显示一次，关闭弹窗后无法再次查看。
          </div>
          <div>
            2. 调用接口时请在请求头中传入 <code>X-API-Key</code>，值为完整 API
            Key。
          </div>
          <div>
            3. 使用范围说明：只读接口仅允许 GET / HEAD /
            OPTIONS，请求写接口会被拒绝。
          </div>
          <div>
            4. 业务接口仅允许访问业务数据接口，不允许访问系统管理类接口。
          </div>
          <div>
            5.
            允许访问资源留空时，按使用范围放行；选择资源后，只允许访问白名单资源接口。
          </div>
          <div>
            6. 仅允许为已启用 2FA 的账号生成 API
            Key，且生成时需要验证当前操作人的 2FA。
          </div>
          <div>
            7. 建议按用途分开创建，例如订单同步、报表读取，便于后续排查和禁用。
          </div>
          <div>8. 禁用后立即失效，已过期或已禁用的密钥无法继续调用接口。</div>
        </div>
      }
    />
  )
}
