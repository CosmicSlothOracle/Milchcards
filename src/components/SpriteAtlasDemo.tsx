import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Frame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
}

interface AtlasData {
  frames: Record<string, Frame>;
  animations: Record<string, string[]>;
  meta: {
    image: string;
    size: {
      w: number;
      h: number;
    };
    scale: number;
    tileSize: [number, number];
    fps: number;
  };
}

interface CharacterAtlas {
  name: string;
  displayName: string;
  jsonPath: string;
  imagePath: string;
  emoji: string;
}

const CHARACTER_ATLASES: CharacterAtlas[] = [
  {
    name: 'cyborg',
    displayName: 'Cyborg',
    jsonPath: '/qte/cyboard/atlas2.json',
    imagePath: '/qte/cyboard/atlas2.png',
    emoji: '🦾'
  },
  {
    name: 'ninja',
    displayName: 'Ninja',
    jsonPath: '/qte/ninja/atlas.json',
    imagePath: '/qte/ninja/atlas.png',
    emoji: '🥷'
  },
  {
    name: 'granny',
    displayName: 'Granny',
    jsonPath: '/qte/granny/atlas3.json',
    imagePath: '/qte/granny/atlas3.png',
    emoji: '👵'
  }
];

const SpriteAtlasDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlasCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const [selectedCharacter, setSelectedCharacter] = useState<string>('cyborg');
  const [atlasData, setAtlasData] = useState<AtlasData | null>(null);
  const [atlasImage, setAtlasImage] = useState<HTMLImageElement | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<string>('idle');
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showFrameNumbers, setShowFrameNumbers] = useState<boolean>(true);
  const [animationSpeed, setAnimationSpeed] = useState<number>(12);
  const [scale, setScale] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'atlas' | 'animation' | 'combined'>('combined');
  const [highlightedFrame, setHighlightedFrame] = useState<string | null>(null);

  // Frame sequence editor state
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [frameSequences, setFrameSequences] = useState<Record<string, string[]>>({});
  const [draggedFrame, setDraggedFrame] = useState<string | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  const [dragOverFrame, setDragOverFrame] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [frameBoxes, setFrameBoxes] = useState<Record<string, Array<{frameName: string, x: number, y: number, index: number}>>>({});
  const [draggedBoxIndex, setDraggedBoxIndex] = useState<number | null>(null);

  // Get current character atlas info
  const currentAtlas = CHARACTER_ATLASES.find(char => char.name === selectedCharacter) || CHARACTER_ATLASES[0];

  // Load atlas data and image when character changes
  useEffect(() => {
    const loadAtlasData = async () => {
      try {
        const response = await fetch(currentAtlas.jsonPath);
        const data = await response.json();
        setAtlasData(data);

        // Reset animation state when switching characters
        setSelectedAnimation('idle');
        setCurrentFrame(0);
        setIsPlaying(false);

        // Initialize frame sequences and boxes for this character
        const sequences: Record<string, string[]> = {};
        const boxes: Record<string, Array<{frameName: string, x: number, y: number, index: number}>> = {};
        if (data.animations) {
          Object.keys(data.animations).forEach(animName => {
            sequences[animName] = data.animations[animName] || [];
            boxes[animName] = [];
          });
        }
        setFrameSequences(sequences);
        setFrameBoxes(boxes);
      } catch (error) {
        console.error('Failed to load atlas data:', error);
      }
    };

    const img = new Image();
    img.onload = () => setAtlasImage(img);
    img.onerror = () => console.error('Failed to load atlas image:', currentAtlas.imagePath);
    img.src = currentAtlas.imagePath;

    loadAtlasData();
  }, [selectedCharacter, currentAtlas.jsonPath, currentAtlas.imagePath]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !atlasData) return;

    let lastTime = 0;
    const frameInterval = 1000 / animationSpeed; // Convert FPS to milliseconds

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
        setCurrentFrame(prev => {
          const animation = atlasData.animations ?
            atlasData.animations[selectedAnimation] :
            Object.keys(atlasData.frames)
              .filter(key => key.startsWith(selectedAnimation + '_'))
              .sort();
          if (!animation || animation.length === 0) return 0;
          return (prev + 1) % animation.length;
        });
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, selectedAnimation, animationSpeed, atlasData]);

  // Draw animation frame
  const drawAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !atlasImage || !atlasData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();
    if (!animation || animation.length === 0 || currentFrame >= animation.length) return;

    const currentFrameName = animation[currentFrame];
    const frame = atlasData.frames[currentFrameName];
    if (!frame) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw current frame
    const displaySize = 256 * scale;
    ctx.drawImage(
      atlasImage,
      frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h,
      (canvas.width - displaySize) / 2, (canvas.height - displaySize) / 2,
      displaySize, displaySize
    );

    // Draw grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        (canvas.width - displaySize) / 2,
        (canvas.height - displaySize) / 2,
        displaySize, displaySize
      );
    }

    // Draw frame info
    if (showFrameNumbers) {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${selectedAnimation} - Frame ${currentFrame + 1}/${animation.length}`,
        10, 30
      );
    }
  }, [atlasImage, atlasData, selectedAnimation, currentFrame, scale, showGrid, showFrameNumbers]);

  // Draw atlas overview
  const drawAtlas = useCallback(() => {
    const canvas = atlasCanvasRef.current;
    if (!canvas || !atlasImage || !atlasData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale factor for atlas display
    const atlasScale = Math.min(canvas.width / atlasData.meta.size.w, canvas.height / atlasData.meta.size.h) * 0.8;
    const atlasWidth = atlasData.meta.size.w * atlasScale;
    const atlasHeight = atlasData.meta.size.h * atlasScale;
    const atlasX = (canvas.width - atlasWidth) / 2;
    const atlasY = (canvas.height - atlasHeight) / 2;

    // Draw atlas image
    ctx.drawImage(atlasImage, atlasX, atlasY, atlasWidth, atlasHeight);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      // Handle different atlas formats - some have tileSize array, others don't
      const tileSize = (atlasData.meta.tileSize && Array.isArray(atlasData.meta.tileSize))
        ? atlasData.meta.tileSize[0] * atlasScale
        : 256 * atlasScale; // Default to 256px tiles
      const cols = Math.floor(atlasWidth / tileSize);
      const rows = Math.floor(atlasHeight / tileSize);

      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(atlasX + i * tileSize, atlasY);
        ctx.lineTo(atlasX + i * tileSize, atlasY + atlasHeight);
        ctx.stroke();
      }

      for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(atlasX, atlasY + i * tileSize);
        ctx.lineTo(atlasX + atlasWidth, atlasY + i * tileSize);
        ctx.stroke();
      }
    }

    // Highlight current animation frames
    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();
    if (animation) {
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
      ctx.lineWidth = 3;

      animation.forEach((frameName, index) => {
        const frame = atlasData.frames[frameName];
        if (frame) {
          const x = atlasX + (frame.frame.x * atlasScale);
          const y = atlasY + (frame.frame.y * atlasScale);
          const w = frame.frame.w * atlasScale;
          const h = frame.frame.h * atlasScale;

          // Different colors for editor mode
          if (isEditorMode) {
            if (dragOverFrame === frameName && isDragging) {
              ctx.strokeStyle = 'rgba(255, 0, 255, 0.9)'; // Magenta for drop target
              ctx.lineWidth = 4;
            } else if (selectedFrames.has(frameName)) {
              ctx.strokeStyle = 'rgba(255, 193, 7, 0.9)'; // Yellow for selected
              ctx.lineWidth = 4;
            } else if (frameSequences[selectedAnimation]?.includes(frameName)) {
              ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)'; // Green for in sequence
              ctx.lineWidth = 3;
            } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // White for available
              ctx.lineWidth = 2;
            }
          }

          ctx.strokeRect(x, y, w, h);

          // Highlight current frame
          if (index === currentFrame) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.fillRect(x, y, w, h);
          }
        }
      });
    }

    // Draw frame boxes in editor mode
    if (isEditorMode && frameBoxes[selectedAnimation]) {
      frameBoxes[selectedAnimation].forEach((box, index) => {
        const boxX = atlasX + (box.x * atlasScale);
        const boxY = atlasY + (box.y * atlasScale);
        const boxW = 256 * atlasScale;
        const boxH = 256 * atlasScale;

        // Draw green frame box
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Draw green border
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Draw frame number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`${index}`, boxX + 5, boxY + 20);

        // Draw frame name
        ctx.font = '10px Arial';
        ctx.fillText(box.frameName, boxX + 5, boxY + boxH - 5);
      });
    }

    // Draw frame numbers
    if (showFrameNumbers) {
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText('Atlas Overview', 10, 20);
    }
  }, [atlasImage, atlasData, selectedAnimation, currentFrame, showGrid, showFrameNumbers]);

  useEffect(() => {
    drawAnimation();
  }, [drawAnimation]);

  useEffect(() => {
    drawAtlas();
  }, [drawAtlas]);

  // Helper function to get frame at coordinates
  const getFrameAtCoordinates = useCallback((x: number, y: number) => {
    if (!atlasData || !atlasCanvasRef.current) return null;

    const canvas = atlasCanvasRef.current;
    const atlasScale = Math.min(canvas.width / atlasData.meta.size.w, canvas.height / atlasData.meta.size.h) * 0.8;
    const atlasWidth = atlasData.meta.size.w * atlasScale;
    const atlasHeight = atlasData.meta.size.h * atlasScale;
    const atlasX = (canvas.width - atlasWidth) / 2;
    const atlasY = (canvas.height - atlasHeight) / 2;

    // Check if coordinates are within atlas bounds
    if (x < atlasX || x > atlasX + atlasWidth || y < atlasY || y > atlasY + atlasHeight) return null;

    // Find frame at coordinates
    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();

    if (animation) {
      for (const frameName of animation) {
        const frame = atlasData.frames[frameName];
        if (frame) {
          const frameX = atlasX + (frame.frame.x * atlasScale);
          const frameY = atlasY + (frame.frame.y * atlasScale);
          const frameW = frame.frame.w * atlasScale;
          const frameH = frame.frame.h * atlasScale;

          if (x >= frameX && x <= frameX + frameW && y >= frameY && y <= frameY + frameH) {
            return frameName;
          }
        }
      }
    }
    return null;
  }, [atlasData, selectedAnimation]);

  // Handle atlas canvas mouse events for drag & drop
  const handleAtlasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditorMode || !atlasData) return;

    const canvas = atlasCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate atlas scale and position
    const atlasScale = Math.min(canvas.width / atlasData.meta.size.w, canvas.height / atlasData.meta.size.h) * 0.8;
    const atlasWidth = atlasData.meta.size.w * atlasScale;
    const atlasHeight = atlasData.meta.size.h * atlasScale;
    const atlasX = (canvas.width - atlasWidth) / 2;
    const atlasY = (canvas.height - atlasHeight) / 2;

    // Check if click is within atlas bounds
    if (x < atlasX || x > atlasX + atlasWidth || y < atlasY || y > atlasY + atlasHeight) return;

    // Find clicked frame
    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();

    if (animation) {
      for (const frameName of animation) {
        const frame = atlasData.frames[frameName];
        if (frame) {
          const frameX = atlasX + (frame.frame.x * atlasScale);
          const frameY = atlasY + (frame.frame.y * atlasScale);
          const frameW = frame.frame.w * atlasScale;
          const frameH = frame.frame.h * atlasScale;

          if (x >= frameX && x <= frameX + frameW && y >= frameY && y <= frameY + frameH) {
            // Check if we're clicking on an existing frame box
            const currentBoxes = frameBoxes[selectedAnimation] || [];
            const clickedBox = currentBoxes.find(box =>
              Math.abs(box.x - frame.frame.x) < 128 && Math.abs(box.y - frame.frame.y) < 128
            );

            if (clickedBox) {
              // Start dragging existing box
              setDraggedBoxIndex(clickedBox.index);
              setIsDragging(true);
            } else {
              // Start dragging new frame
              setDraggedFrame(frameName);
              setIsDragging(true);
              setSelectedFrames(new Set([frameName]));
            }
            break;
          }
        }
      }
    }
  }, [isEditorMode, atlasData, selectedAnimation]);

  const handleAtlasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !isEditorMode || !atlasData) return;

    const canvas = atlasCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate atlas scale and position
    const atlasScale = Math.min(canvas.width / atlasData.meta.size.w, canvas.height / atlasData.meta.size.h) * 0.8;
    const atlasWidth = atlasData.meta.size.w * atlasScale;
    const atlasHeight = atlasData.meta.size.h * atlasScale;
    const atlasX = (canvas.width - atlasWidth) / 2;
    const atlasY = (canvas.height - atlasHeight) / 2;

    // Check if mouse is within atlas bounds
    if (x >= atlasX && x <= atlasX + atlasWidth && y >= atlasY && y <= atlasY + atlasHeight) {
      // Convert canvas coordinates to atlas coordinates
      const atlasX_coord = (x - atlasX) / atlasScale;
      const atlasY_coord = (y - atlasY) / atlasScale;

      // Snap to grid (256x256 frames)
      const snappedX = Math.floor(atlasX_coord / 256) * 256;
      const snappedY = Math.floor(atlasY_coord / 256) * 256;

      // Check if we're over an existing frame box
      const currentBoxes = frameBoxes[selectedAnimation] || [];
      const overBox = currentBoxes.find(box =>
        Math.abs(box.x - snappedX) < 128 && Math.abs(box.y - snappedY) < 128
      );

      if (overBox) {
        setDragOverFrame(overBox.frameName);
      } else {
        setDragOverFrame(null);
      }
    } else {
      setDragOverFrame(null);
    }
  }, [isDragging, isEditorMode, atlasData, frameBoxes, selectedAnimation]);

  const handleAtlasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !atlasData) return;

    const canvas = atlasCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate atlas scale and position
    const atlasScale = Math.min(canvas.width / atlasData.meta.size.w, canvas.height / atlasData.meta.size.h) * 0.8;
    const atlasWidth = atlasData.meta.size.w * atlasScale;
    const atlasHeight = atlasData.meta.size.h * atlasScale;
    const atlasX = (canvas.width - atlasWidth) / 2;
    const atlasY = (canvas.height - atlasHeight) / 2;

    // Check if drop is within atlas bounds
    if (x >= atlasX && x <= atlasX + atlasWidth && y >= atlasY && y <= atlasY + atlasHeight) {
      // Convert canvas coordinates to atlas coordinates
      const atlasX_coord = (x - atlasX) / atlasScale;
      const atlasY_coord = (y - atlasY) / atlasScale;

      // Snap to grid (256x256 frames)
      const snappedX = Math.floor(atlasX_coord / 256) * 256;
      const snappedY = Math.floor(atlasY_coord / 256) * 256;

      if (draggedBoxIndex !== null) {
        // Moving existing box
        setFrameBoxes(prev => {
          const currentBoxes = [...(prev[selectedAnimation] || [])];
          currentBoxes[draggedBoxIndex] = {
            ...currentBoxes[draggedBoxIndex],
            x: snappedX,
            y: snappedY
          };
          return {
            ...prev,
            [selectedAnimation]: currentBoxes
          };
        });
      } else if (draggedFrame) {
        // Adding new frame box
        setFrameBoxes(prev => {
          const currentBoxes = [...(prev[selectedAnimation] || [])];
          const newBox = {
            frameName: draggedFrame,
            x: snappedX,
            y: snappedY,
            index: currentBoxes.length
          };

          return {
            ...prev,
            [selectedAnimation]: [...currentBoxes, newBox]
          };
        });

        // Also update frame sequences
        setFrameSequences(prev => ({
          ...prev,
          [selectedAnimation]: [...(prev[selectedAnimation] || []), draggedFrame]
        }));
      }
    }

    setDraggedFrame(null);
    setDraggedBoxIndex(null);
    setIsDragging(false);
    setDragOverFrame(null);
  }, [isDragging, draggedFrame, draggedBoxIndex, atlasData, selectedAnimation]);

  // Handle frame sequence operations
  const addSelectedFramesToSequence = useCallback(() => {
    if (selectedFrames.size === 0) return;

    setFrameSequences(prev => ({
      ...prev,
      [selectedAnimation]: [...(prev[selectedAnimation] || []), ...Array.from(selectedFrames)]
    }));
    setSelectedFrames(new Set());
  }, [selectedFrames, selectedAnimation]);

  const removeSelectedFramesFromSequence = useCallback(() => {
    if (selectedFrames.size === 0) return;

    setFrameSequences(prev => ({
      ...prev,
      [selectedAnimation]: (prev[selectedAnimation] || []).filter(frame => !selectedFrames.has(frame))
    }));
    setSelectedFrames(new Set());
  }, [selectedFrames, selectedAnimation]);

  const clearSequence = useCallback(() => {
    setFrameSequences(prev => ({
      ...prev,
      [selectedAnimation]: []
    }));
    setFrameBoxes(prev => ({
      ...prev,
      [selectedAnimation]: []
    }));
  }, [selectedAnimation]);

  const removeFrameFromSequence = useCallback((frameIndex: number) => {
    setFrameSequences(prev => {
      const currentSequence = [...(prev[selectedAnimation] || [])];
      currentSequence.splice(frameIndex, 1);
      return {
        ...prev,
        [selectedAnimation]: currentSequence
      };
    });
    setFrameBoxes(prev => {
      const currentBoxes = [...(prev[selectedAnimation] || [])];
      currentBoxes.splice(frameIndex, 1);
      // Update indices
      const updatedBoxes = currentBoxes.map((box, index) => ({
        ...box,
        index
      }));
      return {
        ...prev,
        [selectedAnimation]: updatedBoxes
      };
    });
  }, [selectedAnimation]);

  const exportConfiguration = useCallback(() => {
    if (!atlasData) return;

    const config = {
      character: selectedCharacter,
      animations: Object.keys(frameSequences).map(animName => ({
        name: animName,
        frames: frameSequences[animName] || [],
        fps: 12,
        loop: true
      })),
      atlas: {
        jsonPath: currentAtlas.jsonPath,
        imagePath: currentAtlas.imagePath
      },
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCharacter}_animation_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedCharacter, frameSequences, atlasData, currentAtlas]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const nextFrame = () => {
    if (!atlasData) return;
    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();
    if (animation && animation.length > 0) {
      setCurrentFrame((prev) => (prev + 1) % animation.length);
    }
  };

  const prevFrame = () => {
    if (!atlasData) return;
    const animation = atlasData.animations ?
      atlasData.animations[selectedAnimation] :
      Object.keys(atlasData.frames)
        .filter(key => key.startsWith(selectedAnimation + '_'))
        .sort();
    if (animation && animation.length > 0) {
      setCurrentFrame((prev) => (prev - 1 + animation.length) % animation.length);
    }
  };

  if (!atlasData || !atlasImage) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
        Loading {currentAtlas.displayName} Sprite Atlas...
      </div>
    );
  }

  // Get animations - handle both formats (with animations section or without)
  const animations = atlasData.animations ? Object.keys(atlasData.animations) :
    Object.keys(atlasData.frames)
      .map(key => key.split('_')[0])
      .filter((value, index, self) => self.indexOf(value) === index);

  const currentAnimation = atlasData.animations ?
    atlasData.animations[selectedAnimation] :
    Object.keys(atlasData.frames)
      .filter(key => key.startsWith(selectedAnimation + '_'))
      .sort();

  return (
    <div style={{
      padding: '20px',
      background: '#0a0a0a',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        {currentAtlas.emoji} {currentAtlas.displayName} Sprite Atlas & Animation Viewer
      </h1>

      {/* Character Selection */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {CHARACTER_ATLASES.map(char => (
          <button
            key={char.name}
            onClick={() => setSelectedCharacter(char.name)}
            style={{
              padding: '10px 20px',
              background: selectedCharacter === char.name ? '#4caf50' : '#333',
              color: 'white',
              border: selectedCharacter === char.name ? '2px solid #66bb6a' : '1px solid #555',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{char.emoji}</span>
            <span>{char.displayName}</span>
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {/* Animation Canvas */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #444'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Animation Preview</h3>
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            style={{
              border: '1px solid #666',
              background: '#111',
              display: 'block'
            }}
          />
        </div>

        {/* Atlas Overview Canvas */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #444'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Atlas Overview</h3>
          <canvas
            ref={atlasCanvasRef}
            width={400}
            height={400}
            onMouseDown={handleAtlasMouseDown}
            onMouseMove={handleAtlasMouseMove}
            onMouseUp={handleAtlasMouseUp}
            style={{
              border: '1px solid #666',
              background: '#111',
              display: 'block',
              cursor: isEditorMode ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          />
        </div>

        {/* Controls */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #444',
          minWidth: '300px'
        }}>
          <h3 style={{ marginTop: 0 }}>Controls</h3>

          {/* Animation Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Animation:</label>
            <select
              value={selectedAnimation}
              onChange={(e) => {
                setSelectedAnimation(e.target.value);
                setCurrentFrame(0);
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            >
              {animations.map(anim => {
                const frameCount = atlasData.animations ?
                  (atlasData.animations[anim] ? atlasData.animations[anim].length : 0) :
                  Object.keys(atlasData.frames)
                    .filter(key => key.startsWith(anim + '_'))
                    .length;
                return (
                  <option key={anim} value={anim}>
                    {anim} ({frameCount} frames)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Frame Controls */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Frame: {currentFrame + 1} / {currentAnimation?.length || 0}
            </label>
            <input
              type="range"
              min="0"
              max={(currentAnimation?.length || 1) - 1}
              value={currentFrame}
              onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Playback Controls */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button
                onClick={prevFrame}
                style={{
                  padding: '8px 12px',
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⏮️
              </button>
              <button
                onClick={togglePlayback}
                style={{
                  padding: '8px 16px',
                  background: isPlaying ? '#d32f2f' : '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button
                onClick={nextFrame}
                style={{
                  padding: '8px 12px',
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⏭️
              </button>
            </div>
            <button
              onClick={resetAnimation}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Reset
            </button>
          </div>

          {/* Animation Speed */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Speed: {animationSpeed} FPS
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Scale */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Scale: {scale}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Display Options */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Grid
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={showFrameNumbers}
                onChange={(e) => setShowFrameNumbers(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Frame Info
            </label>
          </div>

          {/* Editor Mode Toggle */}
          <div style={{ marginBottom: '15px', borderTop: '1px solid #444', paddingTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={isEditorMode}
                onChange={(e) => {
                  setIsEditorMode(e.target.checked);
                  setSelectedFrames(new Set());
                }}
                style={{ marginRight: '8px' }}
              />
              <strong>Frame Sequence Editor</strong>
            </label>

            {isEditorMode && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
                  Drag frames from atlas to place green frame boxes over the sprite image. Click and drag existing green boxes to move them. Frames snap to 256x256 grid.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                  <button
                    onClick={clearSequence}
                    style={{
                      padding: '6px 12px',
                      background: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Clear Sequence
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
                  Current sequence: {frameSequences[selectedAnimation]?.length || 0} frames
                </div>

                <button
                  onClick={exportConfiguration}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  💾 Export JSON
                </button>
              </div>
            )}
          </div>

          {/* Atlas Info */}
          <div style={{
            background: '#333',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '15px'
          }}>
            <div><strong>Atlas Size:</strong> {atlasData.meta.size.w}x{atlasData.meta.size.h}</div>
            <div><strong>Tile Size:</strong> {
              (atlasData.meta.tileSize && Array.isArray(atlasData.meta.tileSize))
                ? `${atlasData.meta.tileSize[0]}x${atlasData.meta.tileSize[1]}`
                : '256x256 (default)'
            }</div>
            <div><strong>Total Frames:</strong> {Object.keys(atlasData.frames).length}</div>
            <div><strong>Animations:</strong> {animations.length}</div>
          </div>
        </div>
      </div>

      {/* Animation List */}
      <div style={{
        background: '#222',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #444',
        marginTop: '20px'
      }}>
        <h3>Available Animations</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginTop: '15px'
        }}>
          {animations.map(anim => (
            <div
              key={anim}
              onClick={() => {
                setSelectedAnimation(anim);
                setCurrentFrame(0);
              }}
              style={{
                background: selectedAnimation === anim ? '#4caf50' : '#333',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: selectedAnimation === anim ? '2px solid #66bb6a' : '1px solid #555',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{anim}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {atlasData.animations ?
                  (atlasData.animations[anim] ? atlasData.animations[anim].length : 0) :
                  Object.keys(atlasData.frames)
                    .filter(key => key.startsWith(anim + '_'))
                    .length
                } frames
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frame Sequence Display */}
      {isEditorMode && (
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #444',
          marginTop: '20px'
        }}>
          <h3>Current Frame Sequence: {selectedAnimation}</h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            marginTop: '15px',
            minHeight: '60px',
            padding: '10px',
            background: '#333',
            borderRadius: '4px',
            border: '1px solid #555'
          }}>
            {frameSequences[selectedAnimation]?.map((frameName, index) => (
              <div
                key={`${frameName}-${index}`}
                style={{
                  background: '#4caf50',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ minWidth: '20px' }}>{index}</span>
                <span style={{ opacity: 0.8, flex: 1 }}>{frameName}</span>
                <button
                  onClick={() => removeFrameFromSequence(index)}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '2px 4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove frame"
                >
                  ×
                </button>
              </div>
            )) || (
              <div style={{
                color: '#666',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                No frames in sequence. Drag frames from the atlas above to place green frame boxes over the sprite image.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpriteAtlasDemo;