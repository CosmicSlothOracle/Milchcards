import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntroVideo } from '../components/IntroVideo';
import { AudioProvider } from '../context/AudioContext';

// Mock HTMLVideoElement
const mockVideo = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 10,
  ended: false,
  muted: false,
  playsInline: true,
};

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

// Mock video ref
const mockVideoRef = {
  current: mockVideo,
};

// Mock useRef
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useRef: jest.fn(() => mockVideoRef),
}));

describe('IntroVideo', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render video element with correct props', () => {
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

    const video = screen.getByRole('video');
    expect(video).toHaveAttribute('src', '/test-video.mp4');
    expect(video).toHaveAttribute('playsInline');
  });

  it('should show mute button after delay', async () => {
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

    // Initially, mute button should not be visible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Fast-forward time to show mute button
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should call onComplete when video ends and is clicked', () => {
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

    // Simulate video ending
    fireEvent.ended(screen.getByRole('video'));

    // Click on the video container
    fireEvent.click(screen.getByRole('video').parentElement!);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should not call onComplete when video is still playing', () => {
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

    // Click on the video container before video ends
    fireEvent.click(screen.getByRole('video').parentElement!);

    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should show click to continue message when video ends', () => {
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

    // Simulate video ending
    fireEvent.ended(screen.getByRole('video'));

    expect(screen.getByText('Click anywhere to continue to Deck Builder')).toBeInTheDocument();
  });
});
