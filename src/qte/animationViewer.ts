// Animation Viewer Modal for QTE System
import { SpriteAnimator } from "./spriteAnimator";
import { loadAtlas } from "./atlasLoader";

export interface AnimationInfo {
  name: string;
  character: string;
  frames: number;
  fps: number;
  loop: boolean;
}

export class AnimationViewer {
  private modal!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private currentAnimationIndex = 0;
  private animations: AnimationInfo[] = [];
  private animators: Map<string, SpriteAnimator> = new Map();
  private isVisible = false;
  private animationId: number | null = null;
  private currentCharacter = "ninja";

  constructor() {
    this.createModal();
    this.setupEventListeners();
    this.loadAnimations();
  }

  private createModal() {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 20px;
      min-width: 600px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
    `;

    const title = document.createElement('h2');
    title.textContent = 'QTE Animation Viewer';
    title.style.cssText = `
      color: #fff;
      margin: 0;
      font-size: 24px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 4px;
      width: 30px;
      height: 30px;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create character selector
    const characterSelector = document.createElement('div');
    characterSelector.style.cssText = `
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    const characterLabel = document.createElement('label');
    characterLabel.textContent = 'Character:';
    characterLabel.style.cssText = 'color: #fff; font-weight: bold;';

    const characterSelect = document.createElement('select');
    characterSelect.style.cssText = `
      background: #333;
      color: #fff;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 14px;
    `;
    characterSelect.innerHTML = `
      <option value="ninja">Ninja</option>
      <option value="cyboard">Cyboard</option>
    `;
    characterSelect.onchange = (e) => {
      this.currentCharacter = (e.target as HTMLSelectElement).value;
      this.loadAnimations();
      this.currentAnimationIndex = 0;
      this.updateDisplay();
    };

    characterSelector.appendChild(characterLabel);
    characterSelector.appendChild(characterSelect);

    // Create animation display area
    const displayArea = document.createElement('div');
    displayArea.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    `;

    // Create canvas for animation
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.canvas.style.cssText = `
      border: 2px solid #555;
      border-radius: 4px;
      background: #000;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    `;
    this.ctx = this.canvas.getContext('2d')!;

    // Create animation info display
    const infoDisplay = document.createElement('div');
    infoDisplay.id = 'animation-info';
    infoDisplay.style.cssText = `
      color: #fff;
      text-align: center;
      font-size: 16px;
      min-height: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    `;

    // Create navigation controls
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
    `;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ Previous';
    prevBtn.style.cssText = `
      background: #444;
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    `;
    prevBtn.onclick = () => this.previousAnimation();

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next ▶';
    nextBtn.style.cssText = `
      background: #444;
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    `;
    nextBtn.onclick = () => this.nextAnimation();

    const playPauseBtn = document.createElement('button');
    playPauseBtn.id = 'play-pause-btn';
    playPauseBtn.textContent = '⏸ Pause';
    playPauseBtn.style.cssText = `
      background: #0066cc;
      color: white;
      border: 1px solid #0088ff;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    `;
    playPauseBtn.onclick = () => this.togglePlayPause();

    controls.appendChild(prevBtn);
    controls.appendChild(playPauseBtn);
    controls.appendChild(nextBtn);

    // Create animation list
    const animationList = document.createElement('div');
    animationList.id = 'animation-list';
    animationList.style.cssText = `
      margin-top: 20px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #333;
      border-radius: 4px;
      background: #222;
    `;

    displayArea.appendChild(this.canvas);
    displayArea.appendChild(infoDisplay);
    displayArea.appendChild(controls);
    displayArea.appendChild(animationList);

    content.appendChild(header);
    content.appendChild(characterSelector);
    content.appendChild(displayArea);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
  }

  private setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      switch (e.key) {
        case 'Escape':
          this.hide();
          break;
        case 'ArrowLeft':
          this.previousAnimation();
          break;
        case 'ArrowRight':
          this.nextAnimation();
          break;
        case ' ':
          e.preventDefault();
          this.togglePlayPause();
          break;
      }
    });
  }

  private async loadAnimations() {
    try {
      console.log(`[AnimationViewer] Loading animations for ${this.currentCharacter}`);
      // Load atlas for current character
      const atlas = await loadAtlas(`/qte/${this.currentCharacter}`);
      console.log(`[AnimationViewer] Atlas loaded:`, {
        hasImage: !!atlas.image,
        imageSrc: atlas.image?.src,
        animations: Object.keys(atlas.animations),
        frameW: atlas.frameW,
        frameH: atlas.frameH
      });

      // Clear previous animations
      this.animations = [];
      this.animators.clear();

      // Get actual frame counts from atlas data
      const getFrameCount = (animationName: string): number => {
        if (atlas.animations && atlas.animations[animationName]) {
          console.log(`[AnimationViewer] Found ${animationName} in animations: ${atlas.animations[animationName].frames.length} frames`);
          return atlas.animations[animationName].frames.length;
        }

        // Fallback: count frames in the frames object
        let count = 0;
        if (atlas.frames) {
          for (const key in atlas.frames) {
            if (key.startsWith(`${animationName}_`)) {
              count++;
            }
          }
        }
        console.log(`[AnimationViewer] Fallback count for ${animationName}: ${count} frames`);
        return count;
      };

      // Define animation configurations with actual frame counts
      const animationConfigs = [
        { name: 'idle', frames: getFrameCount('idle'), fps: 6, loop: true },
        { name: 'walk', frames: getFrameCount('walk'), fps: 10, loop: true },
        { name: 'jump', frames: getFrameCount('jump'), fps: 12, loop: false },
        { name: 'attack', frames: getFrameCount('attack'), fps: 12, loop: false },
        { name: 'parry', frames: getFrameCount('parry'), fps: 10, loop: false },
        { name: 'spawn', frames: getFrameCount('spawn'), fps: 8, loop: false },
        { name: 'defeat', frames: getFrameCount('defeat'), fps: 6, loop: false },
        { name: 'projectile', frames: getFrameCount('projectile'), fps: 12, loop: true },
        { name: 'ranged', frames: getFrameCount('ranged'), fps: 12, loop: false },
        { name: 'blast', frames: getFrameCount('blast'), fps: 12, loop: false },
      ];

      // Create animations and animators
      for (const config of animationConfigs) {
        // Skip animations with no frames
        if (config.frames === 0) {
          console.log(`[AnimationViewer] Skipping ${config.name} - no frames found`);
          continue;
        }

        const animationInfo: AnimationInfo = {
          name: config.name,
          character: this.currentCharacter,
          frames: config.frames,
          fps: config.fps,
          loop: config.loop
        };

        // Create sprite animator for this animation
        const animator = new SpriteAnimator(atlas.image, 256, 256, {
          [config.name]: {
            src: '', // No individual file needed when using atlas
            frames: config.frames,
            fps: config.fps,
            loop: config.loop,
            frameW: 256,
            frameH: 256,
            rects: atlas.animations[config.name]?.frames || [],
            image: atlas.image,
            imageLoaded: true,
            imageBroken: false
          }
        });

        // Ensure atlas data is properly set
        const animDef = animator.animations[config.name];
        if (atlas.animations[config.name]) {
          animDef.rects = atlas.animations[config.name].frames;
          animDef.frames = atlas.animations[config.name].frames.length;
        }
        animDef.image = atlas.image;
        (animDef as any).imageLoaded = true;
        (animDef as any).imageBroken = false;

        this.animations.push(animationInfo);
        this.animators.set(config.name, animator);
        console.log(`[AnimationViewer] Created animation: ${config.name} with ${config.frames} frames`);
      }

      console.log(`[AnimationViewer] Total animations loaded: ${this.animations.length}`);
      this.updateAnimationList();
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to load animations:', error);
    }
  }

  private updateAnimationList() {
    const list = document.getElementById('animation-list');
    if (!list) return;

    list.innerHTML = '';

    this.animations.forEach((anim, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #333;
        color: #fff;
        font-size: 14px;
        transition: background-color 0.2s;
      `;

      if (index === this.currentAnimationIndex) {
        item.style.backgroundColor = '#0066cc';
      }

      item.innerHTML = `
        <div style="font-weight: bold;">${anim.name}</div>
        <div style="font-size: 12px; color: #aaa;">
          ${anim.frames} frames • ${anim.fps} fps • ${anim.loop ? 'Loop' : 'Once'}
        </div>
      `;

      item.onclick = () => {
        this.currentAnimationIndex = index;
        this.updateDisplay();
        this.updateAnimationList();
      };

      item.onmouseenter = () => {
        if (index !== this.currentAnimationIndex) {
          item.style.backgroundColor = '#444';
        }
      };

      item.onmouseleave = () => {
        if (index !== this.currentAnimationIndex) {
          item.style.backgroundColor = 'transparent';
        }
      };

      list.appendChild(item);
    });
  }

  private updateDisplay() {
    if (this.animations.length === 0) return;

    const currentAnim = this.animations[this.currentAnimationIndex];
    const animator = this.animators.get(currentAnim.name);

    if (!animator) return;

    // Set the animation state
    animator.setState(currentAnim.name);

    // Update info display
    const infoDisplay = document.getElementById('animation-info');
    if (infoDisplay) {
      infoDisplay.innerHTML = `
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">
          ${currentAnim.name.toUpperCase()}
        </div>
        <div style="font-size: 14px; color: #aaa;">
          ${currentAnim.character} • ${currentAnim.frames} frames • ${currentAnim.fps} fps • ${currentAnim.loop ? 'Looping' : 'Single play'}
        </div>
      `;
    }

    // Start animation loop if not already running
    if (!this.animationId) {
      this.startAnimationLoop();
    }
  }

  private startAnimationLoop() {
    const animate = (timestamp: number) => {
      if (!this.isVisible) {
        this.animationId = null;
        return;
      }

      const currentAnim = this.animations[this.currentAnimationIndex];
      const animator = this.animators.get(currentAnim.name);

      if (animator) {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 256, 256);

        // Update and draw animation
        animator.update(1/60); // Assume 60fps
        animator.draw(this.ctx, 0, 0, 256, 256);
      } else {
        // Debug: draw a red box if no animator
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(0, 0, 256, 256);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('No animator found', 10, 30);
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private previousAnimation() {
    if (this.animations.length === 0) return;
    this.currentAnimationIndex = (this.currentAnimationIndex - 1 + this.animations.length) % this.animations.length;
    this.updateDisplay();
    this.updateAnimationList();
  }

  private nextAnimation() {
    if (this.animations.length === 0) return;
    this.currentAnimationIndex = (this.currentAnimationIndex + 1) % this.animations.length;
    this.updateDisplay();
    this.updateAnimationList();
  }

  private togglePlayPause() {
    const btn = document.getElementById('play-pause-btn');
    if (!btn) return;

    if (this.animationId) {
      // Pause
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      btn.textContent = '▶ Play';
      btn.style.background = '#0066cc';
    } else {
      // Play
      this.startAnimationLoop();
      btn.textContent = '⏸ Pause';
      btn.style.background = '#cc6600';
    }
  }

  public show() {
    this.isVisible = true;
    this.modal.style.display = 'block';
    this.updateDisplay();
  }

  public hide() {
    this.isVisible = false;
    this.modal.style.display = 'none';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Global instance
let animationViewer: AnimationViewer | null = null;

export function getAnimationViewer(): AnimationViewer {
  if (!animationViewer) {
    animationViewer = new AnimationViewer();
  }
  return animationViewer;
}

// Add global function for easy access
(window as any).showAnimationViewer = () => getAnimationViewer().show();
(window as any).hideAnimationViewer = () => getAnimationViewer().hide();
(window as any).toggleAnimationViewer = () => getAnimationViewer().toggle();
