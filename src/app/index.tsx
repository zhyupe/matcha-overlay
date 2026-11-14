import clsx from 'clsx'
import { EventEmitter } from 'events'
import { ChevronDown, Lock, LockOpen } from 'lucide-react'
import {
  type ReactElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button, IconButton } from '#components/ui/button'
import { Menu, MenuItem, MenuSeparator } from '#components/ui/menu'
import { adapter } from '../adapter'
import { Draggable } from '../components/draggable'
import { Logo } from '../components/logo'
import { catalogRevision, subscribeCatalog } from '../data/catalog'
import { useConfigBoolean } from '../lib/config'
import { SeasonContext } from '../lib/season'
import { trackVersion } from '../lib/track'
import './index.css'
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
  minified,
  setMinified,
  lock,
  setLock,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  minified: boolean
  setMinified: (minified: boolean) => void
  lock: boolean
  setLock: (lock: boolean) => void
}) {
  const features = available.filter(([, tab]) => !tab.actOnly)
  const about = available.filter(([, tab]) => tab.actOnly)

  return (
    <header className="app-header">
      <Draggable onClick={() => setMinified(!minified)}>
        <span className="app-logo" title={minified ? '展开' : '收起'}>
          <Logo />
        </span>
      </Draggable>
      {minified ? null : (
        <>
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
        </>
      )}
    </header>
  )
}

function App() {
  const dataRevision = useSyncExternalStore(subscribeCatalog, catalogRevision)
  const {
    version,
    language,
    status,
    message,
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Catalog changes remount panels; restore their retained event snapshot.
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
  }, [eventEmitter, dataRevision])

  useEffect(() => {
    if (!version) return
    trackVersion('plugin', version)
  }, [version])

  const content = available.map(([key, { Component }]) => (
    <Component
      key={`${key}:${dataRevision}`}
      {...{
        version,
        language,
        eventEmitter,
        active: !minified && key === activeTab,
        setActive: () => minified || lock || setActiveTab(key),
      }}
    />
  ))

  if (isActWS) {
    return (
      <div className={`app ${className ?? ''}`} style={style}>
        <header className="app-header">
          <span className="app-logo">
            <Logo />
          </span>
        </header>
        <ActWsNotice />
      </div>
    )
  }

  return (
    <div
      className={clsx('app', className, minified && 'app-minified')}
      style={style}
    >
      <Header
        {...{ activeTab, setActiveTab, minified, setMinified, lock, setLock }}
      />
      <main className="app-body" hidden={minified}>
        {status === 'error' && <div role="status">{message}</div>}
        {content}
      </main>
    </div>
  )
}

export default App
