import React from 'react';

/** Shown on phones in portrait during gameplay — board needs landscape width. */
export const RotateDeviceOverlay: React.FC = () => (
  <div className="rotate-overlay" role="dialog" aria-label="Gerät drehen">
    <div className="rotate-overlay__card">
      <div className="rotate-overlay__icon" aria-hidden>
        📱↻
      </div>
      <h2 className="rotate-overlay__title">Bitte Gerät drehen</h2>
      <p className="rotate-overlay__body">
        Milchcards ist für Querformat optimiert. Drehe dein Handy horizontal, um zu spielen.
      </p>
    </div>
  </div>
);
