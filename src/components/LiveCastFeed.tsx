import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FEEDBACK_EVENT, FeedbackPayload, FeedbackTone } from '../utils/feedback';

export type LiveCastSide = 'left' | 'right' | 'combined';

export interface LiveCastLine {
  id: string;
  text: string;
  tone?: FeedbackTone | 'log' | 'guide';
  at: number;
}

interface LiveCastFeedProps {
  side: LiveCastSide;
  /** Which player this feed primarily represents (1 = left, 2 = right). */
  player: 1 | 2;
  /** Sticky guidance line (former actionHint). */
  guidance?: { title: string; body: string } | null;
  /** Engine log lines; parent passes full array, feed diffs. */
  log?: string[];
  maxLines?: number;
  className?: string;
}

const TONE_CLASS: Record<string, string> = {
  success: 'live-cast__line--success',
  fail: 'live-cast__line--fail',
  info: 'live-cast__line--info',
  lead: 'live-cast__line--lead',
  warn: 'live-cast__line--warn',
  guide: 'live-cast__line--guide',
  log: 'live-cast__line--log',
};

/** Assign a log/feedback string to player 1, 2, or both (null = both / system). */
export function inferLogPlayer(text: string): 1 | 2 | null {
  const t = text;
  const hasP1 = /\bP1\b|Spieler\s*1|SPIELER\s*1|\(1\)/i.test(t);
  const hasP2 = /\bP2\b|Spieler\s*2|SPIELER\s*2|\(2\)|Gegner|KI\b/i.test(t);
  if (hasP1 && !hasP2) return 1;
  if (hasP2 && !hasP1) return 2;
  return null;
}

function lineBelongsToPlayer(text: string, player: 1 | 2, payloadPlayer?: 1 | 2): boolean {
  if (payloadPlayer === 1 || payloadPlayer === 2) return payloadPlayer === player;
  const inferred = inferLogPlayer(text);
  if (inferred == null) return true; // system → both sides
  return inferred === player;
}

export const LiveCastFeed: React.FC<LiveCastFeedProps> = ({
  side,
  player,
  guidance = null,
  log = [],
  maxLines = 12,
  className = '',
}) => {
  const [lines, setLines] = useState<LiveCastLine[]>([]);
  const logLenRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackPayload & { player?: 1 | 2 }>).detail;
      if (!detail?.title) return;
      const text = detail.body ? `${detail.title} — ${detail.body}` : detail.title;
      if (!lineBelongsToPlayer(text, player, detail.player)) return;
      const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setLines((prev) => [...prev, { id, text, tone: detail.tone, at: Date.now() }].slice(-maxLines));
    };
    window.addEventListener(FEEDBACK_EVENT, onFeedback as EventListener);
    return () => window.removeEventListener(FEEDBACK_EVENT, onFeedback as EventListener);
  }, [player, maxLines]);

  useEffect(() => {
    if (!log || log.length === 0) {
      logLenRef.current = 0;
      return;
    }
    if (log.length < logLenRef.current) {
      logLenRef.current = 0;
    }
    const fresh = log.slice(logLenRef.current);
    logLenRef.current = log.length;
    if (fresh.length === 0) return;
    const additions: LiveCastLine[] = [];
    fresh.forEach((msg, i) => {
      if (!lineBelongsToPlayer(msg, player)) return;
      additions.push({
        id: `log-${logLenRef.current}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        text: msg,
        tone: 'log',
        at: Date.now(),
      });
    });
    if (additions.length === 0) return;
    setLines((prev) => [...prev, ...additions].slice(-maxLines));
  }, [log, player, maxLines]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, guidance]);

  const label = useMemo(() => {
    if (side === 'combined') return 'LIVE CAST';
    return player === 1 ? 'P1 CAST' : 'P2 CAST';
  }, [side, player]);

  return (
    <div className={`live-cast live-cast--${side} ${className}`.trim()} aria-live="polite">
      <div className="live-cast__header">
        <span className="live-cast__title">{label}</span>
        <span className="live-cast__live">LIVE</span>
      </div>
      {guidance && (
        <div className="live-cast__guidance">
          <div className="live-cast__guidance-title">{guidance.title}</div>
          <div className="live-cast__guidance-body">{guidance.body}</div>
        </div>
      )}
      <div className="live-cast__scroller" ref={scrollerRef}>
        {lines.length === 0 && !guidance && (
          <div className="live-cast__empty">Warte auf Spielzüge…</div>
        )}
        {lines.map((line) => (
          <div key={line.id} className={`live-cast__line ${TONE_CLASS[line.tone || 'log'] || ''}`}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};
