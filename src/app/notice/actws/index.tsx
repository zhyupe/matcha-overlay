export function ActWsNotice() {
  return (
    <div style={{ padding: '0 10px' }}>
      <p>检测到您可能启用了 ACTWS 兼容模式，在此模式下本页面无法正常工作。请尝试通过以下操作进行修复</p>
      <ol>
        <li>
          在<span className="tag">ngld 悬浮窗插件</span>中找到本悬浮窗
        </li>
        <li>
          取消选中<span className="tag">ACTWS</span>选项卡下
          <span className="tag">ACTWS 兼容性</span>复选框
        </li>
        <li>
          移除<span className="tag">通用</span>选项卡下悬浮窗路径中的
          <code className="tag query">{window.location.search}</code>
        </li>
      </ol>
    </div>
  )
}
