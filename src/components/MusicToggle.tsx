import React from 'react';
import { useAudio } from '../context/AudioContext';

interface MusicToggleProps {
  style?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

export const MusicToggle: React.FC<MusicToggleProps> = ({
  style,
  size = 'medium',
}) => {
  const { isMuted, toggleMute } = useAudio();

  const dim =
    size === 'small' ? 40 : size === 'large' ? 56 : 48;

  return (
    <button
      type="button"
      className="mc-icon-btn"
      onClick={toggleMute}
      style={{ width: dim, height: dim, borderRadius: '50%', ...style }}
      title={isMuted ? 'Unmute music' : 'Mute music'}
      aria-label={isMuted ? 'Unmute music' : 'Mute music'}
      aria-pressed={isMuted}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {isMuted ? (
          <>
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M16 9l5 5M21 9l-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 8.5a5 5 0 010 7M18.5 6a8 8 0 010 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
};
