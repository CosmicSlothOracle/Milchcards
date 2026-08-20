import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioProvider, useAudio } from '../context/AudioContext';

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
    jest.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
    jest.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});
    jest.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    expect(HTMLAudioElement.prototype.play).toHaveBeenCalled();
  });

  it('should stop music when stopMusic is called', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    // Start music first so there is an audio element to pause.
    fireEvent.click(screen.getByTestId('play-music'));
    expect(HTMLAudioElement.prototype.play).toHaveBeenCalled();

    const stopButton = screen.getByTestId('stop-music');
    fireEvent.click(stopButton);

    expect(HTMLAudioElement.prototype.pause).toHaveBeenCalled();
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
