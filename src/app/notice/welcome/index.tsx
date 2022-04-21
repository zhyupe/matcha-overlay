import { useMemo } from 'react'
import { Dialog } from '../../../components/dialog'
import { getSeasonFooter, getSeasonTitle } from '../../../lib/season'
import { OverlayProps } from '../../interface'
import './index.css'

const year = new Date().getFullYear()
const build = process.env.build

const appointedVersion = '22.4.15.1906'
const parseVersion = (version: string) => version.split('.').map((item) => +item)
function VersionCheck({ version }: { version: string | undefined }) {
  const showNotice = useMemo(() => {
    if (!version) return false

    const current = parseVersion(version)
    const appointed = parseVersion(appointedVersion)

    for (let i = 0; i < 4; ++i) {
      if (current[i] < appointed[i]) return true
    }

    return false
  }, [version])

  return showNotice ? <Dialog direction="top-left">您的插件版本较旧，请到插件中心更新</Dialog> : null
}

export function WelcomeNotice({ version, language, active }: OverlayProps) {
  if (!active) return null

  return (
    <div className="notice-welcome">
      <p>欢迎使用 {getSeasonTitle(true) || 'Matcha'} 悬浮窗。点击左上角图标可进入最小化模式。</p>
      <p>如遇功能异常，请检查：</p>
      <ol>
        <li>
          悬浮窗在<span className="tag">ngld 悬浮窗插件</span>中正确设置
        </li>
        <li>
          已经安装最新版本的<span className="tag">{getSeasonTitle() || '抹茶 Matcha'}</span>插件
        </li>
      </ol>
      <p>
        本地版本：{version || '<等待数据>'} / 数据语言：{language}
      </p>
      <VersionCheck version={version} />
      <p className="copyright">
        &copy; {year} FFCafe / Build: {build}
        {getSeasonFooter()}
      </p>
    </div>
  )
}
