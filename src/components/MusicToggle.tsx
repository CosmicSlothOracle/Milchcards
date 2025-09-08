import React from 'react';
import { useAudio } from '../context/AudioContext';

interface MusicToggleProps {
  style?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

export const MusicToggle: React.FC<MusicToggleProps> = ({
  style,
  size = 'medium'
}) => {
  const { isMuted, toggleMute } = useAudio();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: '40px',
          height: '40px',
          fontSize: '16px',
        };
      case 'large':
        return {
          width: '80px',
          height: '80px',
          fontSize: '32px',
        };
      default: // medium
        return {
          width: '60px',
          height: '60px',
          fontSize: '24px',
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <button
      onClick={toggleMute}
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        border: '2px solid #fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        transition: 'all 0.2s ease',
        ...sizeStyles,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={isMuted ? 'Unmute music' : 'Mute music'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );
};
