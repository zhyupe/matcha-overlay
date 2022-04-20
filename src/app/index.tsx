import { useState, useEffect, useMemo } from 'react'
import './index.css'
import { addOverlayListener, startOverlayEvents } from '../ngld'
import { LogEvent, OverlayProps } from './interface'
import { EventEmitter } from 'events'
import { Logo } from '../components/logo'
import { Draggable } from '../components/draggable'
import { CactpotOverlay } from './overlay/cactpot'
import { GearsetOverlay } from './overlay/gearset'
import { MarketOverlay } from './overlay/market'
import { MapEventOverlay } from './overlay/map-event'
import { ActWsNotice } from './notice/actws'
import { WelcomeNotice } from './notice/welcome'
import { LockClosed, LockOpen } from '../components/icon'
import { getAppSeason } from '../lib/season'
import { useConfigBoolean } from '../lib/config'

interface Tab {
  title: string | null
  right?: boolean
  Component: (props: OverlayProps) => JSX.Element | null
}

const tabs: Record<string, Tab> = {
  market: {
    title: '物价对比',
    Component: MarketOverlay,
  },
  gearset: {
    title: '配装比较',
    Component: GearsetOverlay,
  },
  cactpot: {
    title: '仙人微彩',
    Component: CactpotOverlay,
  },
  treasure: {
    title: '地图事件',
    Component: MapEventOverlay,
  },
  welcome: {
    title: '关于',
    right: true,
    Component: WelcomeNotice,
  },
}

interface HeaderProps {
  isActWS: boolean
  minified: boolean
  setMinified: (minified: boolean) => void
  activeTab: string
  setActiveTab: (activeTab: string) => void
  lock: boolean
  setLock: (lock: boolean) => void
}

function Header({ isActWS, minified, setMinified, activeTab, setActiveTab, lock, setLock }: HeaderProps) {
  const [menuVisible, setMenuVisible] = useState<boolean>(false)
  const logo = (
    <Draggable onClick={() => setMinified(!minified)}>
      <Logo />
    </Draggable>
  )

  if (minified) {
    return logo
  }

  if (isActWS) {
    return <header className="header">{logo}</header>
  }

  const activeTabItem = tabs[activeTab] || tabs.welcome
  const tabEntries = Object.entries(tabs)

  const onMenuClick = (key: string) => {
    setActiveTab(key)
    setMenuVisible(false)
  }

  return (
    <header className="header">
      {logo}
      <Draggable onClick={() => setMenuVisible(!menuVisible)}>
        <span className={`tab left ${activeTabItem.right ? '' : ' active'}`}>
          {activeTabItem.right ? '功能' : activeTabItem.title}
          <Draggable onClick={() => setLock(!lock)}>
            <span className={`header-lock${lock ? ' locked' : ''}`}>{lock ? <LockClosed /> : <LockOpen />}</span>
          </Draggable>
        </span>
      </Draggable>
      <div className="header-menu" style={{ display: menuVisible ? '' : 'none' }}>
        {tabEntries
          .filter(([, tab]) => !tab.right && tab.title)
          .map(([key, { title }]) => (
            <Draggable key={key} onClick={() => onMenuClick(key)}>
              <span>{title}</span>
            </Draggable>
          ))}
      </div>
      {tabEntries
        .filter(([, tab]) => tab.right && tab.title)
        .map(([key, { title }]) => (
          <Draggable key={key} onClick={() => setActiveTab(key)}>
            <span className={key === activeTab ? 'tab active' : 'tab'}>{title}</span>
          </Draggable>
        ))}
    </header>
  )
}

function App() {
  const isActWS = window.location.search.includes('HOST_PORT')
  const eventEmitter = useMemo(() => new EventEmitter(), [])
  const [minified, { set: setMinified }] = useConfigBoolean('app-minified', false)
  const [activeTab, setActiveTab] = useState('welcome')
  const [version, setVersion] = useState<string>()
  const [language, setLanguage] = useState<string>('chs')
  const [lock, setLock] = useState<boolean>(false)

  useEffect(() => {
    if (isActWS) {
      // eslint-disable-next-line
      (window as any).__OverlayPlugin_ws_faker = () => {}
      return
    }

    addOverlayListener('LogLine', ({ line }: LogEvent) => {
      if (!line || line.length !== 5 || line[0] !== '00') return

      const label = line[3]
      if (!label.startsWith('Matcha')) return

      const typePos = label.indexOf('-')
      if (typePos === -1) return

      const type = label.substr(typePos + 1)

      const [, logVersion, logLanguage] = label.substr(0, typePos).split('#')
      const normalizedVersion = logVersion || 'Legacy'
      const normalizedLanguage = logLanguage || 'chs'

      let content = line[4]
      try {
        // eslint-disable-next-line
        content = JSON.parse(content)
      } catch (e) {
        // ignore
      }

      const event = {
        time: new Date(line[1]),
        type,
        version: logVersion,
        content,
      }

      setVersion(normalizedVersion)
      setLanguage(normalizedLanguage)
      eventEmitter.emit(type, event)
    })

    startOverlayEvents()
  }, [eventEmitter, isActWS])

  return (
    <div className={`app app-${minified ? 'minified' : 'wrap'}${getAppSeason()}`}>
      <Header
        {...{
          isActWS,
          minified,
          setMinified,
          activeTab,
          setActiveTab,
          lock,
          setLock,
        }}
      />
      {isActWS ? (
        <ActWsNotice />
      ) : (
        Object.entries(tabs).map(([key, { Component }]) => (
          <Component
            {...{
              key,
              version,
              language,
              eventEmitter,
              active: !minified && key === activeTab,
              setActive: () => minified || lock || setActiveTab(key),
            }}
          />
        ))
      )}
    </div>
  )
}

export default App
