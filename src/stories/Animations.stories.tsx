import React from 'react';
import { Meta, Story } from '@storybook/react';
import DeckWithAnim from '../components/DeckWithAnim';
import DiscardWithAnim from '../components/DiscardWithAnim';

export default {
  title: 'Animations/CardFX',
} as Meta;

export const DrawFlipStory: Story = () => <DeckWithAnim />;
DrawFlipStory.storyName = 'DrawFlip (DOM flip + trail)';

export const DiscardBurnStory: Story = () => <DiscardWithAnim />;
DiscardBurnStory.storyName = 'DiscardBurn (Canvas fallback)';


