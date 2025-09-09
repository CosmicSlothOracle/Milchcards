export interface Rect { x: number; y: number; w: number; h: number }

interface AnimationDef {
  src: string; // optional when using atlas
  frames: number;
  fps: number;
  loop: boolean;
  frameW: number;
  frameH: number;
  rects?: Rect[]; // atlas-based frames
  image?: HTMLImageElement;
  imageLoaded?: boolean;
  imageBroken?: boolean;
}

/**
 * Utility: extract frame count from filename pattern *_XX.png.
 */
function defaultFramesFromFilename(src: string, fallback: number): number {
  try {
    const m = /_(\d+)\.(png|jpg|jpeg|webp)$/i.exec(src);
    const n = m ? parseInt(m[1], 10) : NaN;
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * SpriteAnimator – verwaltet Frame-basierte Sprite-Sheet-Animationen.
 *  ‑ Jede Animation liegt in einer PNG-Reihe (Frames horizontal).
 *  ‑ draw(ctx, x, y, w, h) rendert den aktuellen Frame.
 */
export class SpriteAnimator {
  private defaultImage: HTMLImageElement | null;
  private frameW: number;
  private frameH: number;
  public animations: Record<string, AnimationDef>;
  public state: string = "idle";
  public frame = 0;
  private acc = 0; // Sekunden-Accumulator
  private fps = 12;
  private loop = true;

  constructor(
    defaultImage: HTMLImageElement | null,
    frameW: number,
    frameH: number,
    animations: Record<string, Partial<AnimationDef>> = {}
  ) {
    this.defaultImage = defaultImage;
    this.frameW = frameW;
    this.frameH = frameH;
    // Merge defaults
    this.animations = {};
    for (const key of Object.keys(animations)) {
      const a = animations[key];
      const full: AnimationDef = {
        src: a.src || "",
        frames: a.frames ?? defaultFramesFromFilename(a.src || "", 1),
        fps: a.fps ?? 12,
        loop: a.loop ?? true,
        frameW: a.frameW ?? frameW,
        frameH: a.frameH ?? frameH,
        // Preserve atlas data if provided
        image: a.image,
        rects: a.rects,
        imageLoaded: a.imageLoaded,
        imageBroken: a.imageBroken,
      } as AnimationDef;
      // Preload image (optional) - only if no atlas image is provided
      if (full.src && !full.image) {
        const img = new Image();
        full.image = img;
        full.imageLoaded = false;
        full.imageBroken = false;
        img.onload = () => (full.imageLoaded = true);
        img.onerror = () => (full.imageBroken = true);
        img.src = full.src;
      }
      this.animations[key] = full;
    }
  }

  setState(state: string) {
    if (this.state === state) return;
    this.state = state;
    this.frame = 0;
    this.acc = 0;
    const a = this.animations[state];
    if (a) {
      this.fps = a.fps;
      this.loop = a.loop;
      // Only log state changes for important animations
      if (state === "parry" || state === "attack" || state === "defeat") {
        console.log(`[SpriteAnimator] State changed to "${state}"`, {
          frames: a.frames,
          fps: a.fps,
          loop: a.loop,
          hasImage: !!a.image,
          hasRects: !!a.rects,
          imageLoaded: a.imageLoaded,
          imageBroken: a.imageBroken
        });
      }
    } else {
      console.warn(`[SpriteAnimator] Animation "${state}" not found!`, {
        availableStates: Object.keys(this.animations)
      });
    }
  }

  /**
   * Fixed-timestep Update.
   * @param dt Delta-Zeit in Sekunden
   */
  update(dt: number) {
    const a = this.animations[this.state];
    if (!a) return;
    this.acc += dt;
    const frameTime = 1 / (a.fps || this.fps);
    while (this.acc >= frameTime) {
      this.acc -= frameTime;
      this.frame++;
      if (this.frame >= a.frames) {
        if (a.loop) this.frame = 0;
        else this.frame = a.frames - 1;
      }
    }

    // Debug parry animation specifically
    if (this.state === "parry" && this.frame % 2 === 0) { // Log every 2nd frame to reduce spam
      console.log(`[SpriteAnimator] PARRY UPDATE:`, {
        state: this.state,
        frame: this.frame,
        frames: a.frames,
        fps: a.fps,
        loop: a.loop,
        acc: this.acc,
        frameTime
      });
    }
  }

  /**
   * Rendert aktuellen Frame.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    flip = false
  ) {
    const a = this.animations[this.state];
    const img = (a && a.image) || this.defaultImage;

    // Debug parry animation specifically
    if (this.state === "parry") {
      console.log(`[SpriteAnimator] DRAWING PARRY:`, {
        state: this.state,
        frame: this.frame,
        hasAnimation: !!a,
        hasImage: !!img,
        hasRects: !!a?.rects,
        rectsLength: a?.rects?.length,
        frames: a?.frames,
        imageComplete: img?.complete,
        imageBroken: a?.imageBroken,
        imageSrc: img?.src
      });
    }

    if (!a || !img || a.imageBroken || !img.complete || img.naturalWidth === 0) {
      // Fallback: graue Box
      console.warn(`[SpriteAnimator] FALLBACK GREY BOX for state "${this.state}":`, {
        hasAnimation: !!a,
        hasImage: !!img,
        imageBroken: a?.imageBroken,
        imageComplete: img?.complete,
        naturalWidth: img?.naturalWidth,
        imageSrc: img?.src,
        animationSrc: a?.src
      });
      ctx.fillStyle = "#666";
      ctx.fillRect(x, y, w, h);
      return;
    }
    let sx = this.frame * (a.frameW || this.frameW);
    let sy = 0;

    // Atlas mode: use rects array if provided
    let frameW = a.frameW || this.frameW;
    let frameH = a.frameH || this.frameH;

    if (a.rects && a.rects.length > 0) {
      const r = a.rects[this.frame % a.rects.length];
      sx = r.x;
      sy = r.y;
      frameW = r.w;
      frameH = r.h;
    }

    ctx.save();
    if (flip) {
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      x = 0;
    }
    ctx.drawImage(img, sx, sy, frameW, frameH, x, y, w, h);
    ctx.restore();
  }
}
