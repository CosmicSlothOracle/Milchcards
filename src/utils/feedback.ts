export type FeedbackTone = 'success' | 'fail' | 'info' | 'lead' | 'warn';

export interface FeedbackPayload {
  tone: FeedbackTone;
  title: string;
  body?: string;
  /** Auto-dismiss; default 2200ms. Use 0 to keep until replaced by victory UI. */
  durationMs?: number;
  /** Full-screen color flash matching tone */
  flash?: boolean;
  /** Prefer routing to this player's live-cast side */
  player?: 1 | 2;
}

export const FEEDBACK_EVENT = 'pc:feedback';

/** Fire instant player-facing feedback (toasts / flash). Safe outside React. */
export function emitFeedback(payload: FeedbackPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: payload }));
  } catch {
    /* ignore */
  }
}

export function feedbackSuccess(title: string, body?: string): void {
  emitFeedback({ tone: 'success', title, body, flash: true });
}

export function feedbackFail(title: string, body?: string): void {
  emitFeedback({ tone: 'fail', title, body, flash: true, durationMs: 2600 });
}

export function feedbackInfo(title: string, body?: string): void {
  emitFeedback({ tone: 'info', title, body, flash: false });
}

export function feedbackLead(title: string, body?: string): void {
  emitFeedback({ tone: 'lead', title, body, flash: true, durationMs: 2800 });
}
