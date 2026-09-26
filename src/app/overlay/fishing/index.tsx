import { type CSSProperties, useRef } from 'react'
import {
  elapsed,
  type FishingEvent,
  itemName,
  placeName,
  predict,
  tugName,
} from './model'
import type { useFishing } from './use-fishing'
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
  const {
    cast,
    archive,
    now,
    baseBait,
    running,
    message,
    importArchive,
    exportArchive,
  } = fishing
  const duration = cast ? elapsed(cast, now) : 0
  const candidates = cast ? predict(cast, archive, now) : []
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
          <span className="tag">[钓鱼]</span>
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
          {cast?.mooch && ' · 以小钓大'}
          {cast?.chum && ' · 撒饵'}
          {cast?.snagging && ' · 钓组'}
        </span>
        <span className="fishing-state" aria-live="polite">
          {cast?.tug ? `${tugName(cast.tug)} · ` : ''}
          {cast ? stateNames[cast.action] : '等待抛竿'}
        </span>
      </div>
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
                title={`${name} · ${tugName(tug)} · 所有钓饵：${allBaitsRange} · 当前钓饵：${range} · ${reason}${note ? ` · ${note}` : ''}`}
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
                <span className="fishing-name">{name}</span>
                <span className="fishing-tug" aria-label={tugName(tug)}>
                  {tug ? '!'.repeat(tug) : '?'}
                </span>
                <span className="fishing-time">{range}</span>
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
            title={message || '长时间未收到后续事件，请检查连接。'}
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
        <button
          type="button"
          className="button"
          onClick={() => fileInput.current?.click()}
        >
          导入
        </button>
        <button type="button" className="button" onClick={exportArchive}>
          导出
        </button>
      </footer>
    </section>
  )
}
