import React, { useEffect, useState, useCallback } from 'react';
import { FEEDBACK_EVENT, FeedbackPayload, FeedbackTone } from '../utils/feedback';

interface ToastItem extends FeedbackPayload {
  id: number;
}

const TONE_LABEL: Record<FeedbackTone, string> = {
  success: 'Erfolg',
  fail: 'Fehlschlag',
  info: 'Hinweis',
  lead: 'Führung',
  warn: 'Achtung',
};

export const ActionFeedback: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [flashTone, setFlashTone] = useState<FeedbackTone | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackPayload>).detail;
      if (!detail?.title) return;

      const id = Date.now() + Math.floor(Math.random() * 1000);
      const item: ToastItem = {
        ...detail,
        id,
        durationMs: detail.durationMs ?? 2200,
      };

      setToasts((prev) => [...prev.slice(-3), item]);

      if (detail.flash !== false && (detail.tone === 'success' || detail.tone === 'fail' || detail.tone === 'lead' || detail.flash)) {
        setFlashTone(detail.tone);
        window.setTimeout(() => setFlashTone(null), 420);
      }

      if (item.durationMs && item.durationMs > 0) {
        window.setTimeout(() => dismiss(id), item.durationMs);
      }
    };

    window.addEventListener(FEEDBACK_EVENT, onFeedback as EventListener);
    return () => window.removeEventListener(FEEDBACK_EVENT, onFeedback as EventListener);
  }, [dismiss]);

  return (
    <>
      {flashTone && (
        <div
          className={`action-flash action-flash--${flashTone}`}
          aria-hidden="true"
        />
      )}
      <div className="action-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`action-toast action-toast--${t.tone}`}
            role="status"
            onClick={() => dismiss(t.id)}
          >
            <span className="action-toast__label">{TONE_LABEL[t.tone]}</span>
            <div className="action-toast__title">{t.title}</div>
            {t.body && <div className="action-toast__body">{t.body}</div>}
          </div>
        ))}
      </div>
    </>
  );
};
