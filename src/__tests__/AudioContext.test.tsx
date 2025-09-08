import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioProvider, useAudio } from '../context/AudioContext';

// Mock HTMLAudioElement
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 0.7,
  currentTime: 0,
  loop: false,
};

// Mock Audio constructor
global.Audio = jest.fn().mockImplementation(() => mockAudio);

// Test component that uses the audio context
const TestComponent: React.FC = () => {
  const { isMuted, toggleMute, playMusic, stopMusic } = useAudio();

  return (
    <div>
      <div data-testid="mute-status">{isMuted ? 'muted' : 'unmuted'}</div>
      <button data-testid="toggle-mute" onClick={toggleMute}>
        Toggle Mute
      </button>
      <button data-testid="play-music" onClick={() => playMusic('/test.mp3')}>
        Play Music
      </button>
      <button data-testid="stop-music" onClick={stopMusic}>
        Stop Music
      </button>
    </div>
  );
};

describe('AudioContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide audio context to children', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    expect(screen.getByTestId('mute-status')).toHaveTextContent('unmuted');
  });

  it('should toggle mute state', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    const toggleButton = screen.getByTestId('toggle-mute');
    const muteStatus = screen.getByTestId('mute-status');

    expect(muteStatus).toHaveTextContent('unmuted');

    fireEvent.click(toggleButton);
    expect(muteStatus).toHaveTextContent('muted');

    fireEvent.click(toggleButton);
    expect(muteStatus).toHaveTextContent('unmuted');
  });

  it('should play music when playMusic is called', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    const playButton = screen.getByTestId('play-music');
    fireEvent.click(playButton);

    expect(global.Audio).toHaveBeenCalledWith('/test.mp3');
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('should stop music when stopMusic is called', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    const stopButton = screen.getByTestId('stop-music');
    fireEvent.click(stopButton);

    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it('should throw error when useAudio is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAudio must be used within an AudioProvider');

    consoleSpy.mockRestore();
  });
});
