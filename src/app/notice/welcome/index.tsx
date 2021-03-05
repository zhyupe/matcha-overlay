import React from 'react'
import { OverlayProps } from '../../interface'
import './index.css'

const year = new Date().getFullYear()
const build = process.env.build

export function WelcomeNotice({ version, language, active }: OverlayProps) {
  if (!active) return null

  return (
    <div className="notice-welcome">
      <p>欢迎使用 Matcha 悬浮窗。点击左上角图标可进入最小化模式。</p>
      <p>如遇功能异常，请检查：</p>
      <ol>
        <li>
          悬浮窗在<span className="tag">ngld 悬浮窗插件</span>中正确设置
        </li>
        <li>
          已经安装最新版本的<span className="tag">抹茶 Matcha</span>插件
        </li>
      </ol>
      <p>
        本地版本：{version || '<等待数据>'} / 数据语言：{language}
      </p>
      <p className="copyright">
        &copy; {year} FFCafe / Build: {build}
      </p>
    </div>
  )
}
