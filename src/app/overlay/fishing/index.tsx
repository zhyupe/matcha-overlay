import { AlertDialog } from '@base-ui/react/alert-dialog'
import { type CSSProperties, useRef, useState } from 'react'
import { Button } from '#components/ui/button'
import type { OverlayProps } from '../../interface'
import {
  elapsed,
  type FishingEvent,
  hooksetName,
  isMoochBait,
  itemName,
  placeName,
  predict,
  tugName,
} from './model'
import { statisticsMessage } from './statistics'
import { useFishing } from './use-fishing'
import './index.css'

const stateNames: Record<FishingEvent['action'], string> = {
  cast: '等待咬钩',
  place: '等待咬钩',
  bite: '有鱼上钩',
  hook: '正在提竿',
  reel: '正在收竿',
  catch: '成功钓获',
  end: '本竿结束',
  quit: '已停止钓鱼',
  reset: '等待抛竿',
  bait: '已更换鱼饵',
}
const seconds = (ms: number) => (ms / 1000).toFixed(1)

export function FishingPanel({
  fishing,
}: {
  fishing: ReturnType<typeof useFishing>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const cancelClear = useRef<HTMLButtonElement>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const {
    cast,
    statistics,
    archive,
    now,
    baseBait,
    running,
    message,
    messageDetail,
    hasInvalidArchive,
    clearing,
    clearInvalidArchive,
    importArchive,
    exportArchive,
  } = fishing
  const duration = cast ? elapsed(cast, now) : 0
  const candidates = cast
    ? predict(cast, archive, now, 1500, undefined, statistics)
    : []
  const axis = Math.max(
    30_000,
    duration + 3000,
    ...candidates.map((c) => (c.allBaitsMaxMs ?? c.maxMs ?? 0) + 3000),
  )

  return (
    <section className="map-fishing" aria-label="钓鱼计时与预测">
      <div className="fishing-heading">
        <span
          className="fishing-place"
          title={placeName(cast?.placeId ?? null)}
        >
          {placeName(cast?.placeId ?? null)}
        </span>
        <span className="fishing-clock">
          <span>{seconds(duration)}</span>
          <small> 秒</small>
        </span>
      </div>
      <div className="fishing-summary">
        <span
          className="fishing-bait"
          title={itemName(cast ? cast.baitId : baseBait)}
        >
          {itemName(cast ? cast.baitId : baseBait)}
          {cast && isMoochBait(cast.baitId, archive) && ' · 以小钓大'}
          {cast?.chum && ' · 撒饵'}
          {cast?.snagging && ' · 钓组'}
        </span>
        <span className="fishing-state" aria-live="polite">
          {cast?.tug ? `${tugName(cast.tug)} · ` : ''}
          {cast ? stateNames[cast.action] : '等待抛竿'}
        </span>
      </div>
      {statisticsMessage(statistics, cast) && (
        <p className="fishing-timing-note" role="status">
          {statisticsMessage(statistics, cast)}
        </p>
      )}
      {cast && cast.chum == null && (
        <p className="fishing-timing-note">撒饵状态未知，显示未撒饵区间</p>
      )}
      <div
        className="fishing-candidates"
        style={
          { '--fish-count': Math.max(1, candidates.length) } as CSSProperties
        }
      >
        {candidates.length === 0 ? (
          <p className="fishing-empty">
            {cast
              ? '暂无此钓场数据，可导入已有观测。'
              : '抛竿后自动计时并显示钓场鱼种。'}
          </p>
        ) : (
          candidates.map((candidate) => {
            const {
              fishId,
              name,
              tug,
              hookset,
              minMs,
              maxMs,
              allBaitsMinMs,
              allBaitsMaxMs,
              result,
              reason,
              note,
            } = candidate
            const range =
              minMs != null && maxMs != null
                ? `${seconds(minMs)}–${seconds(maxMs)} 秒`
                : '时间未知'
            const timeLabel =
              minMs != null && maxMs != null
                ? range
                : cast?.baitId == null
                  ? '鱼饵信息未知'
                  : allBaitsMinMs != null && allBaitsMaxMs != null
                    ? '当前饵无区间'
                    : '暂无时间数据'
            const allBaitsRange =
              allBaitsMinMs != null && allBaitsMaxMs != null
                ? `${seconds(allBaitsMinMs)}–${seconds(allBaitsMaxMs)} 秒`
                : '时间未知'
            return (
              <div
                className={`fishing-candidate fishing-${result}${cast?.fishId === fishId ? ' fishing-caught' : ''}`}
                data-tug={tug ?? 0}
                data-fish-id={fishId}
                key={fishId}
                title={`${name} · ${tugName(tug)}${hookset ? ` · ${hooksetName(hookset)}` : ''} · 所有钓饵：${allBaitsRange} · 当前钓饵：${range} · ${reason}${note ? ` · ${note}` : ''}${candidate.source === 'community' ? ` · 鱼漂 ${candidate.count} 样本 · 全部 ${seconds(candidate.sampleMinMs!)}–${seconds(candidate.sampleMaxMs!)} 秒 · 中位数 ${seconds(candidate.medianMs!)} 秒 · 更新 ${statistics?.cachedAt ? new Date(statistics.cachedAt).toLocaleTimeString() : '未知'}` : ''}`}
              >
                {allBaitsMinMs != null && allBaitsMaxMs != null && (
                  <span
                    className="fishing-window fishing-window-all"
                    aria-hidden="true"
                    style={{
                      left: `${(allBaitsMinMs / axis) * 100}%`,
                      width: `${Math.max(0.5, ((allBaitsMaxMs - allBaitsMinMs) / axis) * 100)}%`,
                    }}
                  />
                )}
                {minMs != null && maxMs != null && (
                  <span
                    className="fishing-window fishing-window-current"
                    aria-hidden="true"
                    style={{
                      left: `${(minMs / axis) * 100}%`,
                      width: `${Math.max(0.5, ((maxMs - minMs) / axis) * 100)}%`,
                    }}
                  />
                )}
                <span
                  className="fishing-cursor"
                  aria-hidden="true"
                  style={{
                    left: `${Math.min(99.5, (duration / axis) * 100)}%`,
                  }}
                />
                <span className="fishing-tug" aria-label={tugName(tug)}>
                  {tug ? '!'.repeat(tug) : '?'}
                </span>
                <span className="fishing-name">
                  {name}
                  {hookset && ` · ${hooksetName(hookset)}`}
                </span>
                <span className="fishing-time">
                  {timeLabel}
                  {candidate.source !== 'none' && (
                    <small className="fishing-source">
                      {candidate.source === 'manual'
                        ? '手动'
                        : candidate.source === 'community'
                          ? `鱼漂 · ${candidate.count}`
                          : `本地 · ${candidate.count}`}
                    </small>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
      <footer className="fishing-actions">
        {(message || (running && duration > 180000)) && (
          <p
            className="fishing-message"
            role="status"
            title={
              messageDetail || message || '长时间未收到后续事件，请检查连接。'
            }
          >
            {message || '请检查连接。'}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label="导入钓鱼数据"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importArchive(file)
          }}
        />
        <Button
          variant="ghost"
          size="xs"
          onClick={() => fileInput.current?.click()}
        >
          导入
        </Button>
        <Button variant="ghost" size="xs" onClick={exportArchive}>
          导出
        </Button>
        {hasInvalidArchive && (
          <AlertDialog.Root
            open={clearOpen}
            onOpenChange={(open) => {
              if (!clearing) setClearOpen(open)
            }}
          >
            <AlertDialog.Trigger render={<Button variant="ghost" size="xs" />}>
              清理
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
              <AlertDialog.Popup
                initialFocus={cancelClear}
                className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-24px)] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-panel border border-line bg-pop p-4 text-fg shadow-pop"
              >
                <AlertDialog.Title className="text-sm font-semibold">
                  清理钓鱼存档？
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-fg-2">
                  将删除异常的本地钓鱼存档（鱼获及导入资料），无法恢复。其他功能数据及鱼漂统计不受影响。
                </AlertDialog.Description>
                <p className="mt-2 text-xs text-fg-3" role="status">
                  {messageDetail || message}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button onClick={exportArchive} disabled={clearing}>
                    导出
                  </Button>
                  <AlertDialog.Close
                    render={<Button ref={cancelClear} disabled={clearing} />}
                  >
                    取消
                  </AlertDialog.Close>
                  <Button
                    className="text-danger"
                    disabled={clearing}
                    onClick={async () => {
                      if (await clearInvalidArchive()) setClearOpen(false)
                    }}
                  >
                    {clearing ? '清理中…' : '清理'}
                  </Button>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        )}
      </footer>
    </section>
  )
}

export function FishingOverlay(props: OverlayProps) {
  const fishing = useFishing(props)
  if (!props.active) return null
  return (
    <div className="overlay overlay-fishing">
      <FishingPanel fishing={fishing} />
    </div>
  )
}
