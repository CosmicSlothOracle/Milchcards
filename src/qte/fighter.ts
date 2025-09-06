import { SpriteAnimator } from "./spriteAnimator";
import {
  P1_PROJECTILE_SRC,
  P2_PROJECTILE_SRC,
  P1_BLAST_SRC,
  P2_BLAST_SRC,
} from "./assetRegistry";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FighterOptions {
  x: number;
  y: number;
  color: string;
  keys: Record<string, string>; // keycodes mapping
  name: string;
  spriteConfig: { frameW: number; frameH: number; animations: any };
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  muzzleOffset?: { x: number; y: number };
}

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive = true;
  age = 0;
  lifespan = 1.0;
  owner: Fighter;
  anim: SpriteAnimator;
  displayW = 256;
  displayH = 256;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    owner: Fighter,
    imgSrc: string,
    framesHint: number,
    atlasImage: HTMLImageElement | null = null,
    atlasRects: Rect[] | null = null
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    const animationDef: any = {
      src: imgSrc,
      frames: framesHint,
      fps: 12,
      loop: true,
      frameW: 256,
      frameH: 256,
    };

    if (atlasImage && atlasRects) {
      animationDef.image = atlasImage;
      animationDef.rects = atlasRects;
      animationDef.frames = atlasRects.length;
      animationDef.imageLoaded = true;
      animationDef.imageBroken = false;
    }

    this.anim = new SpriteAnimator(atlasImage, 256, 256, {
      fly: animationDef,
    });
    this.anim.setState("fly");
    // Simplified debug for fly animation
    const a = this.anim.animations["fly"];
    // eslint-disable-next-line no-console
    console.debug("[qte] projectile fly", { frames: a?.rects?.length ?? a?.frames, hasRects: !!a?.rects });
  }

  update(dt: number) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.anim.update(dt);
    if (this.age >= this.lifespan) this.alive = false;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const alpha = Math.max(0, 1 - this.age / this.lifespan);
    ctx.globalAlpha = alpha;
    // Debug image load state if available
    const a = this.anim.animations["fly"];
    // eslint-disable-next-line no-console
    if (a && a.image && !a.image.complete) console.debug("[qte] projectile image not complete", { src: a.src, complete: a.image.complete, broken: a.imageBroken });
    this.anim.draw(ctx, this.x, this.y, this.displayW, this.displayH, this.vx < 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  rect(): Rect {
    return { x: this.x, y: this.y, w: this.displayW, h: this.displayH };
  }
}

export class Blast {
  x: number;
  y: number;
  alive = true;
  timer: number;
  anim: SpriteAnimator;
  w = 256;
  h = 256;
  constructor(x: number, y: number, imgSrc: string, framesHint: number, atlasImage: HTMLImageElement | null = null, atlasRects: Rect[] | null = null) {
    this.x = x;
    this.y = y;
    this.timer = framesHint / 12;

    const animationDef: any = {
      src: imgSrc,
      frames: framesHint,
      fps: 12,
      loop: false,
      frameW: 256,
      frameH: 256,
    };

    if (atlasImage && atlasRects) {
      animationDef.image = atlasImage;
      animationDef.rects = atlasRects;
      animationDef.frames = atlasRects.length;
      animationDef.imageLoaded = true;
      animationDef.imageBroken = false;
    }

    this.anim = new SpriteAnimator(atlasImage, 256, 256, {
      boom: animationDef,
    });
    this.anim.setState("boom");
  }
  update(dt: number) {
    this.timer -= dt;
    this.anim.update(dt);
    if (this.timer <= 0) this.alive = false;
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.anim.draw(ctx, this.x - this.w * 0.5, this.y - this.h * 0.5, this.w, this.h);
  }
}

export class Fighter {
  private ctx: CanvasRenderingContext2D;
  private canvasW: number;
  private canvasH: number;

  x: number;
  y: number;
  w = 256;
  h = 256;
  vx = 0;
  vy = 0;
  facing = 1;
  hp = 100;
  onGround = false;

  state: string = "idle";
  name: string;
  color: string;
  keys: Record<string, string>;
  anim: SpriteAnimator;

  // action flags
  attacking = false;
  parrying = false;
  ranging = false;
  attackLaunched = false;
  rangedLaunched = false;
  muzzleOffset: { x: number; y: number };

  // timers
  attackTimer = 0;
  rangedTimer = 0;
  parryTimer = 0;
  parryFreezeTimer = 0;
  stunTimer = 0;
  parryConsumed = false;
  parryDurationDefault = 0.4;
  parryWindowLength = this.parryDurationDefault * 0.25;
  stunned = false;

  constructor(opts: FighterOptions) {
    this.x = opts.x;
    this.y = opts.y;
    this.color = opts.color;
    this.keys = opts.keys;
    this.name = opts.name;
    this.ctx = opts.ctx;
    this.canvasW = opts.canvasWidth;
    this.canvasH = opts.canvasHeight;
    this.muzzleOffset = opts.muzzleOffset ?? { x: 36, y: -48 };

    const img = new Image();
    img.src = opts.spriteConfig.animations.idle.src;
    this.anim = new SpriteAnimator(img, opts.spriteConfig.frameW, opts.spriteConfig.frameH, opts.spriteConfig.animations);
    this.anim.setState("idle");
  }

  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hitbox(): Rect | null {
    if (this.state === "attack") {
      const aw = 60,
        ah = 40;
      const ax = this.facing > 0 ? this.x + this.w - 10 : this.x - (aw - 10);
      const ay = this.y + this.h * 0.55 - ah * 0.5;
      return { x: ax, y: ay, w: aw, h: ah };
    }
    return null;
  }

  update(dt: number, input: Record<string, boolean>, projectiles: Projectile[]) {
    // Movement & gravity
    if (input[this.keys.left]) {
      this.vx = -150;
      this.facing = -1;
    } else if (input[this.keys.right]) {
      this.vx = 150;
      this.facing = 1;
    } else this.vx = 0;
    if (this.onGround && input[this.keys.up]) {
      this.vy = -350;
      this.onGround = false;
    }
    this.vy += 900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ground collision
    if (this.y + this.h >= this.canvasH - 40) {
      this.y = this.canvasH - 40 - this.h;
      this.vy = 0;
      this.onGround = true;
    }

    // Attack input
    if (input[this.keys.attack] && !this.attacking) {
      this.attacking = true;
      this.state = "attack";
      this.anim.setState("attack");
      this.attackTimer = 0.35;
    }
    if (this.attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    // Ranged input
    if (input[this.keys.ranged] && !this.ranging) {
      this.ranging = true;
      this.state = "ranged";
      this.anim.setState("ranged");
      this.rangedTimer = 0.4;
      this.rangedLaunched = false;
    }
    if (this.ranging) {
      this.rangedTimer -= dt;
      if (!this.rangedLaunched && this.anim.state === "ranged" && this.anim.frame === this.anim.animations["ranged"].frames - 1) {
        this.rangedLaunched = true;
        // spawn point (muzzle) – use configured muzzleOffset (mirrored by facing)
        const projW = 256, projH = 256;
        const muzzle = this.muzzleOffset || { x: 36, y: -48 };
        const centerX = this.x + this.w * 0.5 + muzzle.x * this.facing;
        const centerY = this.y + this.h * 0.5 + muzzle.y;
        const startX = Math.round(centerX - projW * 0.5);
        const startY = Math.round(centerY - projH * 0.5);
        const speed = 600;
        const vx = this.facing > 0 ? speed : -speed;
        const imgSrc = this.name === "P1" ? P1_PROJECTILE_SRC : P2_PROJECTILE_SRC;
        // Use atlas for projectile if available
        let projectileImage = null;
        let projectileRects = null;
        let projectileFrames = 6;

        // Try to get atlas from owner's animator (will be set after atlas loads)
        if (this.anim && this.anim.animations.projectile && this.anim.animations.projectile.rects) {
          projectileImage = this.anim.animations.projectile.image;
          projectileRects = this.anim.animations.projectile.rects;
          projectileFrames = this.anim.animations.projectile.rects.length;
          console.log(`[qte] Projectile using atlas frames from ${this.name}`);
        } else {
          console.log(`[qte] Projectile: No atlas frames for 'projectile' in ${this.name}, falling back to individual image.`);
          // If atlas isn't available yet, at least pass the already-preloaded per-animation image
          if (this.anim && this.anim.animations.projectile && this.anim.animations.projectile.image) {
            projectileImage = this.anim.animations.projectile.image;
            console.log(`[qte] Projectile: using per-animation image for ${this.name}`);
          }
        }

        const proj = new Projectile(startX, startY, vx, 0, this, imgSrc, projectileFrames, projectileImage, projectileRects);
        // Debug log projectile spawn
        // eslint-disable-next-line no-console
        console.debug("[qte] spawnProjectile", { owner: this.name, startX, startY, imgSrc, facing: this.facing });
        const distanceToEdge = this.facing > 0 ? this.canvasW - startX : startX;
        proj.lifespan = Math.min(1.2, Math.abs(distanceToEdge / speed));
        projectiles.push(proj);
      }
      if (this.rangedTimer <= 0) this.ranging = false;
    }

    // State machine fallbacks
    if (!this.attacking && !this.ranging) {
      if (!this.onGround) this.setState("jump");
      else if (Math.abs(this.vx) > 1) this.setState("walk");
      else this.setState("idle");
    }

    // animator update
    this.anim.update(dt);
  }

  draw() {
    this.anim.draw(this.ctx, this.x, this.y, this.w, this.h, this.facing < 0);
  }

  private setState(s: string) {
    if (this.state === s) return;
    this.state = s;
    this.anim.setState(s);
  }
}
