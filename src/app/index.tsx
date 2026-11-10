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
import { ChevronDown, Lock, LockOpen } from 'lucide-react'
import { Button, IconButton } from '#components/ui/button'
import { Menu, MenuItem, MenuSeparator } from '#components/ui/menu'
import { adapter } from '../adapter'
import { Draggable } from '../components/draggable'
import { Logo } from '../components/logo'
import { useConfigBoolean } from '../lib/config'
import { SeasonContext } from '../lib/season'
import { trackVersion } from '../lib/track'
import type { OverlayProps } from './interface'
import { ActWsNotice } from './notice/actws'
import { WelcomeNotice } from './notice/welcome'
import { CactpotOverlay } from './overlay/cactpot'
import { FishingOverlay } from './overlay/fishing'
import { GearsetOverlay } from './overlay/gearset'
import { MarketOverlay } from './overlay/market'
import { SubmarineOverlay } from './overlay/submarine'
import { TreasureOverlay } from './overlay/treasure'

interface Tab {
  title: string
  /** Only in ACT, where its troubleshooting steps apply */
  actOnly?: boolean
  Component: (props: OverlayProps) => ReactElement | null
}

const tabs: Record<string, Tab> = {
  market: { title: '物价对比', Component: MarketOverlay },
  gearset: { title: '配装比较', Component: GearsetOverlay },
  cactpot: { title: '仙人微彩', Component: CactpotOverlay },
  treasure: { title: '寻宝', Component: TreasureOverlay },
  fishing: { title: '钓鱼', Component: FishingOverlay },
  submarine: { title: '部队潜水艇', Component: SubmarineOverlay },
  welcome: { title: '关于', actOnly: true, Component: WelcomeNotice },
}
const available = Object.entries(tabs).filter(
  ([, tab]) => !tab.actOnly || adapter.name === 'ACT',
)
const defaultTab = adapter.name === 'ACT' ? 'welcome' : 'market'

function Header({
  activeTab,
  setActiveTab,
  setMinified,
  lock,
  setLock,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  setMinified: (minified: boolean) => void
  lock: boolean
  setLock: (lock: boolean) => void
}) {
  const features = available.filter(([, tab]) => !tab.actOnly)
  const about = available.filter(([, tab]) => tab.actOnly)
  return (
    <header className="app-header">
      <Draggable onClick={() => setMinified(true)}>
        <span className="app-logo" title="收起">
          <Logo />
        </span>
      </Draggable>
      <Menu
        trigger={
          <Button variant="ghost" className="app-title">
            {tabs[activeTab]?.title}
            <ChevronDown />
          </Button>
        }
      >
        {features.map(([key, { title }]) => (
          <MenuItem
            key={key}
            checked={key === activeTab}
            onClick={() => setActiveTab(key)}
          >
            {title}
          </MenuItem>
        ))}
        {about.length > 0 && <MenuSeparator />}
        {about.map(([key, { title }]) => (
          <MenuItem
            key={key}
            checked={key === activeTab}
            onClick={() => setActiveTab(key)}
          >
            {title}
          </MenuItem>
        ))}
      </Menu>
      <span className="flex-1" />
      <IconButton
        label={lock ? '已锁定当前功能，点击解锁' : '锁定当前功能'}
        className={lock ? 'text-lime hover:text-lime' : undefined}
        onClick={() => setLock(!lock)}
      >
        {lock ? <Lock /> : <LockOpen />}
      </IconButton>
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
  const [activeTab, setActiveTab] = useState(defaultTab)
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

  const content = available.map(([key, { Component }]) => (
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

  if (minified) {
    return (
      <div className={`app app-minified ${className ?? ''}`} style={style}>
        <Draggable onClick={() => setMinified(false)}>
          <span className="app-logo" title="展开">
            <Logo />
          </span>
        </Draggable>
        {/* Panels stay mounted, so events keep their state while the overlay is folded */}
        <div hidden>{content}</div>
      </div>
    )
  }

  return (
    <div className={`app ${className ?? ''}`} style={style}>
      {isActWS ? (
        <>
          <header className="app-header">
            <span className="app-logo">
              <Logo />
            </span>
          </header>
          <ActWsNotice />
        </>
      ) : (
        <>
          <Header
            {...{ activeTab, setActiveTab, setMinified, lock, setLock }}
          />
          <main className="app-body">{content}</main>
        </>
      )}
    </div>
  )
}

export default App
