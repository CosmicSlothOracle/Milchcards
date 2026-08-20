import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntroVideo } from '../components/IntroVideo';
import { AudioProvider } from '../context/AudioContext';

describe('IntroVideo', () => {
  const mockOnComplete = jest.fn();
  let originalPlay: typeof HTMLVideoElement.prototype.play;

  const renderVideo = () =>
    render(
      <AudioProvider>
        <IntroVideo
          onComplete={mockOnComplete}
          videoSrc="/test-video.mp4"
          musicSrc="/test-music.mp3"
        />
      </AudioProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    originalPlay = HTMLVideoElement.prototype.play;
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      value: jest.fn().mockResolvedValue(undefined),
      configurable: true,
    });
    jest.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
    jest.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      value: originalPlay,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  it('should render video element with correct props', () => {
    renderVideo();
    const video = screen.getByTestId('intro-video');
    expect(video).toHaveAttribute('src', '/test-video.mp4');
    expect(video).toHaveAttribute('playsInline');
  });

  it('should show mute button after delay', async () => {
    renderVideo();

    // Initially, mute button should not be visible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Fast-forward time to show mute button
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should call onComplete when video ends and is clicked', () => {
    renderVideo();
    const video = screen.getByTestId('intro-video');
    const container = screen.getByTestId('intro-video-container');

    // Simulate video ending
    fireEvent.ended(video);

    // Click on the video container
    fireEvent.click(container);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should call onComplete when video container is clicked', () => {
    renderVideo();
    const container = screen.getByTestId('intro-video-container');

    // Clicking anywhere on the container skips the intro.
    fireEvent.click(container);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should show skip intro message', () => {
    renderVideo();
    const video = screen.getByTestId('intro-video');

    // Simulate video ending
    fireEvent.ended(video);

    expect(screen.getByText('Click anywhere to skip intro')).toBeInTheDocument();
  });
});
