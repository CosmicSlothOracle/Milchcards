import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

interface SequentialVideoPlayerProps {
  onComplete: () => void;
  brandVideoSrc: string;
  introVideoSrc: string;
  musicSrc: string;
}

export const SequentialVideoPlayer: React.FC<SequentialVideoPlayerProps> = ({
  onComplete,
  brandVideoSrc,
  introVideoSrc,
  musicSrc
}) => {
  const [currentVideo, setCurrentVideo] = useState<'brand' | 'intro'>('brand');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMuteButton, setShowMuteButton] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMuted, toggleMute, playMusic, stopMusic } = useAudio();

  const currentVideoSrc = currentVideo === 'brand' ? brandVideoSrc : introVideoSrc;

  useEffect(() => {
    // Start playing video and music when component mounts
    if (videoRef.current) {
      // Set video to muted for autoplay to work
      videoRef.current.muted = true;
      videoRef.current.play().catch(error => {
        console.warn('Video autoplay prevented:', error);
        // If autoplay fails, show play button or handle gracefully
      });
    }

    // Start music
    playMusic(musicSrc, true);

    // Show mute button after a short delay
    const muteTimer = setTimeout(() => {
      setShowMuteButton(true);
    }, 1000);

    return () => {
      clearTimeout(muteTimer);
    };
  }, [musicSrc, playMusic]);

  const handleVideoEnded = () => {
    if (currentVideo === 'brand') {
      // Brand video ended, transition to intro video
      setCurrentVideo('intro');
      setVideoEnded(false);
      // The video src will change and trigger a new play
    } else {
      // Intro video ended, complete the sequence
      setVideoEnded(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  const handleVideoClick = () => {
    if (currentVideo === 'brand') {
      // Skip brand video, go directly to intro
      setCurrentVideo('intro');
    } else {
      // Skip intro video, complete the sequence
      onComplete();
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  // Handle video source change
  useEffect(() => {
    if (videoRef.current && currentVideoSrc) {
      videoRef.current.load();
      videoRef.current.play().catch(error => {
        console.warn('Video autoplay prevented:', error);
      });
    }
  }, [currentVideoSrc]);

  const getSkipText = () => {
    if (currentVideo === 'brand') {
      return 'Click anywhere to skip to intro';
    } else {
      return 'Click anywhere to skip intro';
    }
  };

  const getVideoLabel = () => {
    if (currentVideo === 'brand') {
      return 'Brand Video';
    } else {
      return 'Intro Video';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        src={currentVideoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onEnded={handleVideoEnded}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        muted={true}
        autoPlay
        playsInline
        loop={false}
      />

      {/* Video Label */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {getVideoLabel()}
      </div>

      {/* Mute Button */}
      {showMuteButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
            // Also toggle video mute
            if (videoRef.current) {
              videoRef.current.muted = !videoRef.current.muted;
            }
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid #fff',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#fff',
            zIndex: 10000,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {(isMuted || (videoRef.current && videoRef.current.muted)) ? '🔇' : '🔊'}
        </button>
      )}

      {/* Click to Skip Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '600',
          textAlign: 'center',
          border: '2px solid #fff',
          animation: 'pulse 2s infinite',
        }}
      >
        {getSkipText()}
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-50%) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
