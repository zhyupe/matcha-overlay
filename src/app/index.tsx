import {
  type ReactElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import './index.css'
import { EventEmitter } from 'events'
import { adapter } from '../adapter'
import { Draggable } from '../components/draggable'
import { LockClosed, LockOpen } from '../components/icon'
import { Logo } from '../components/logo'
import { useConfigBoolean } from '../lib/config'
import { SeasonContext } from '../lib/season'
import { trackVersion } from '../lib/track'
import type { OverlayProps } from './interface'
import { ActWsNotice } from './notice/actws'
import { WelcomeNotice } from './notice/welcome'
import { CactpotOverlay } from './overlay/cactpot'
import { GearsetOverlay } from './overlay/gearset'
import { MapEventOverlay } from './overlay/map-event'
import { MarketOverlay } from './overlay/market'
import { SubmarineOverlay } from './overlay/submarine'

interface Tab {
  title: string | null
  right?: boolean
  Component: (props: OverlayProps) => ReactElement | null
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
  submarine: {
    title: '部队潜水艇',
    Component: SubmarineOverlay,
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

function Header({
  isActWS,
  minified,
  setMinified,
  activeTab,
  setActiveTab,
  lock,
  setLock,
}: HeaderProps) {
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
            <span className={`header-lock${lock ? ' locked' : ''}`}>
              {lock ? <LockClosed /> : <LockOpen />}
            </span>
          </Draggable>
        </span>
      </Draggable>
      <div
        className="header-menu"
        style={{ display: menuVisible ? '' : 'none' }}
      >
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
            <span className={key === activeTab ? 'tab active' : 'tab'}>
              {title}
            </span>
          </Draggable>
        ))}
    </header>
  )
}

function App() {
  const {
    version,
    language,
    unsupportedActWebSocket: isActWS,
  } = useSyncExternalStore(adapter.subscribeState, adapter.getState)
  const eventEmitter = useMemo(() => new EventEmitter(), [])
  const [minified, { set: setMinified }] = useConfigBoolean(
    'app-minified',
    false,
  )
  const [activeTab, setActiveTab] = useState('welcome')
  const [lock, setLock] = useState<boolean>(false)
  const { className, style } = useContext(SeasonContext)

  useEffect(() => {
    let stopped = false
    let dispose: (() => void) | undefined
    void adapter
      .subscribeEvents((event) => {
        if (!stopped) eventEmitter.emit(event.type, event)
      })
      .then((cleanup) => {
        if (stopped) cleanup()
        else dispose = cleanup
      })
      .catch(console.error)
    return () => {
      stopped = true
      dispose?.()
    }
  }, [eventEmitter])

  useEffect(() => {
    if (!version) return
    trackVersion('plugin', version)
  }, [version])

  return (
    <div
      className={`app app-${minified ? 'minified' : 'wrap'} ${className}`}
      style={style}
    >
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
            key={key}
            {...{
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
