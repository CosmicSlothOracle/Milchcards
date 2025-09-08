import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playMusic: (src: string, loop?: boolean) => void;
  stopMusic: () => void;
  setVolume: (volume: number) => void;
  currentTrack: string | null;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const playMusic = (src: string, loop: boolean = true) => {
    // Stop current music if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = isMuted ? 0 : 0.7; // Default volume
    audioRef.current = audio;
    setCurrentTrack(src);

    // Play the audio
    audio.play().catch(error => {
      console.warn('Audio autoplay prevented:', error);
      // Audio autoplay might be blocked, we'll handle this gracefully
    });
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTrack(null);
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  };

  // Update volume when mute state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.7;
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const value: AudioContextType = {
    isMuted,
    toggleMute,
    playMusic,
    stopMusic,
    setVolume,
    currentTrack,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
