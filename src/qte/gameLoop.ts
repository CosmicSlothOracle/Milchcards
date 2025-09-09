import { createKeyboardListener, readGamepadsUnified, P1_KEYS, P2_KEYS } from "./input";
import { buildSpriteConfig, P1_PROJECTILE_SRC, P2_PROJECTILE_SRC, P1_BLAST_SRC, P2_BLAST_SRC } from "./assetRegistry";
import { loadAtlas } from "./atlasLoader";
import { Fighter, Projectile, Blast } from "./fighter";
import { getAnimationViewer } from "./animationViewer";

export function createGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const WIDTH = canvas.width, HEIGHT = canvas.height;
  // Debug: log when this module is actually instantiated so we can confirm if the rebuilt module is loaded
  // Visible in the browser console immediately after page load
  // eslint-disable-next-line no-console
  console.debug("[qte] createGame initialized", { WIDTH, HEIGHT });

  function clamp(v: number, min: number, max: number) {
    return v < min ? min : v > max ? max : v;
  }

  const input = createKeyboardListener(canvas);

  // Create animation viewer button
  const animationViewerBtn = document.createElement('button');
  animationViewerBtn.textContent = '🎬 View Animations';
  animationViewerBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  `;
  animationViewerBtn.onclick = () => getAnimationViewer().show();
  document.body.appendChild(animationViewerBtn);

  const p1Sprite = buildSpriteConfig("ninja");
  const p2Sprite = buildSpriteConfig("cyboard", {
    idle: { src: "cyboard/idle_256x256_4.png", frames: 4, fps: 6 },
    walk: { src: "cyboard/walk_256x256_4.png", frames: 4, fps: 10 },
    ranged: { src: "cyboard/ranged_256x256_4.png", frames: 4, fps: 12 },
    parry: { src: "", frames: 6, fps: 12 }, // Will be patched by atlas
    blast: { src: "cyboard/blast_256x256_4.png", frames: 4, fps: 12 },
    projectile: { src: "cyboard/projectile_256x256_6.png", frames: 6, fps: 15, loop: true },
    hurt: { src: "cyboard/hurt_256x256_4.png", frames: 4, fps: 15 },
  });

  const projectiles: Projectile[] = [];
  const blasts: Blast[] = [];

  // Game state
  let gameOver = false;
  let winner: Fighter | null = null;

  const p1 = new Fighter({ x: 100, y: HEIGHT - 40 - 256, color: "#4aa3ff", keys: P1_KEYS as any, name: "P1", spriteConfig: p1Sprite, ctx, canvasWidth: WIDTH, canvasHeight: HEIGHT, muzzleOffset: { x: 36, y: -48 } });
  const p2 = new Fighter({ x: WIDTH - 100 - 256, y: HEIGHT - 40 - 256, color: "#ff7a7a", keys: P2_KEYS as any, name: "P2", spriteConfig: p2Sprite, ctx, canvasWidth: WIDTH, canvasHeight: HEIGHT, muzzleOffset: { x: -36, y: -48 } });
  p2.facing = -1;

  // Preload stage background
  const stageImg = new Image();
  stageImg.src = "/qte/background/ninjastage0.png";

  // Store atlases globally for projectiles/blasts
  let globalAtlas1: any = null;
  let globalAtlas2: any = null;

  // Asynchronously load atlases and patch animators once ready
  (async () => {
    try {
      console.log("[qte] Starting atlas load...");
      console.log("[qte] Loading ninja atlas from /qte/ninja");
      console.log("[qte] Loading cyboard atlas from /qte/cyboard/atlas2");
      const [atlas1, atlas2] = await Promise.all([
        loadAtlas("/qte/ninja"),
        loadAtlas("/qte/cyboard/atlas2"),
      ]);

      globalAtlas1 = atlas1;
      globalAtlas2 = atlas2;
      console.log("[qte] Atlases loaded successfully:", {
        ninja: !!atlas1,
        cyboard: !!atlas2,
        ninjaAnimations: Object.keys(atlas1.animations),
        cyboardAnimations: Object.keys(atlas2.animations),
        cyboardParryFrames: atlas2.animations.parry?.frames?.length || 0
      });

      // helper to merge atlas into animator
      const patchAnimator = (anim: any, atlas: any) => {
        // ensure default fallback is atlas image
        anim.defaultImage = atlas.image;
        const allStates = Object.keys(anim.animations);
        for (const state of allStates) {
          const atlasState = atlas.animations[state];
          if (!anim.animations[state]) anim.animations[state] = {} as any;
          const dest = anim.animations[state];
          if (atlasState) {
            const a = atlasState;
            dest.rects = a.frames;
            dest.image = atlas.image;
            dest.src = atlas.image?.src || dest.src || '';
            dest.frameW = atlas.frameW;
            dest.frameH = atlas.frameH;
            dest.frames = a.frames.length;
            (dest as any).imageLoaded = true;
            (dest as any).imageBroken = false;
            console.log(`[qte] Patched ${state} with ${a.frames.length} atlas frames (image src=${atlas.image?.src})`);
            if (state === "parry") {
              console.log(`[qte] PARRY ANIMATION DEBUG:`, {
                state,
                frames: a.frames.length,
                rects: a.frames,
                image: atlas.image?.src,
                frameW: atlas.frameW,
                frameH: atlas.frameH,
                atlasAnimations: Object.keys(atlas.animations)
              });
            }
          } else {
            // No atlas frames but still ensure image reference so it's not broken
            dest.image = atlas.image;
            dest.src = atlas.image?.src || dest.src || '';
            (dest as any).imageLoaded = true;
            (dest as any).imageBroken = false;
            // keep existing frameW/frameH if present, otherwise use atlas values
            dest.frameW = dest.frameW || atlas.frameW;
            dest.frameH = dest.frameH || atlas.frameH;
            console.log(`[qte] No atlas frames for ${state}, using atlas image fallback`);
            if (state === "parry") {
              console.warn(`[qte] PARRY ANIMATION MISSING in atlas!`, {
                availableStates: Object.keys(atlas.animations),
                atlasAnimations: atlas.animations
              });
            }
          }
        }
      };
      patchAnimator(p1.anim, atlas1);
      patchAnimator(p2.anim, atlas2);
      console.log("[qte] atlases loaded and patched successfully");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[qte] atlas load failed", e);
    }
  })();

  // Asset diagnostics: after a short delay log the loaded/broken state of important images
  setTimeout(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug("[qte] asset diagnostics: checking sprite images");
      const dump = (animName: string, spriteConfig: any) => {
        const keys = Object.keys(spriteConfig.animations || {});
        keys.forEach((k) => {
          const a = spriteConfig.animations[k];
          // eslint-disable-next-line no-console
          console.debug(`[qte] sprite ${animName}.${k}`, { src: a.src, frames: a.frames, fps: a.fps, loaded: !!a.imageLoaded, broken: !!a.imageBroken });
        });
      };
      dump("p1", p1Sprite);
      dump("p2", p2Sprite);
      // also log projectile/blast constants
      // eslint-disable-next-line no-console
      console.debug("[qte] constants", { P1_PROJECTILE_SRC, P2_PROJECTILE_SRC, P1_BLAST_SRC, P2_BLAST_SRC });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[qte] asset diagnostics failed", e);
    }
  }, 500);

  function framesFromFilename(src: string, fallback: number) {
    try {
      const m = /_(\d+)\.(png|jpg|jpeg|webp)$/i.exec(src);
      const n = m ? parseInt(m[1], 10) : NaN;
      return Number.isFinite(n) ? n : fallback;
    } catch (e) {
      return fallback;
    }
  }

  let last = performance.now();
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // merge inputs
    const gp = readGamepadsUnified(P1_KEYS as any, P2_KEYS as any);
    const mergedInput: Record<string, boolean> = {};
    function getKeyboard(code: string) {
      return !!input[code];
    }
    [P1_KEYS.left, P1_KEYS.right, P1_KEYS.up, P1_KEYS.down, P1_KEYS.attack, P1_KEYS.parry, P1_KEYS.ranged].forEach((k) => {
      if (k) mergedInput[k] = !!gp[k] || getKeyboard(k);
    });
    [P2_KEYS.left, P2_KEYS.right, P2_KEYS.up, P2_KEYS.down, P2_KEYS.attack, P2_KEYS.parry, P2_KEYS.ranged].forEach((k) => {
      if (k) mergedInput[k] = !!gp[k] || getKeyboard(k);
    });

    // Debug parry input (only log once per press)
    if ((mergedInput[P1_KEYS.parry] && !p1.parrying) || (mergedInput[P2_KEYS.parry] && !p2.parrying)) {
      console.log(`[qte] PARRY INPUT DETECTED:`, {
        P1_parry: mergedInput[P1_KEYS.parry],
        P2_parry: mergedInput[P2_KEYS.parry],
        P1_key: P1_KEYS.parry,
        P2_key: P2_KEYS.parry
      });
    }

    // draw background
    if (stageImg.complete && stageImg.naturalWidth > 0) {
      ctx.drawImage(stageImg, 0, 0, WIDTH, HEIGHT);
    } else {
      ctx.fillStyle = "#071428";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.fillStyle = "#333";
    ctx.fillRect(0, HEIGHT - 40, WIDTH, 40);

    // update
    p1.update(dt, mergedInput, projectiles);
    p2.update(dt, mergedInput, projectiles);

    projectiles.forEach((pr) => pr.update(dt));
    blasts.forEach((b) => b.update(dt));

    // cleanup
    for (let i = projectiles.length - 1; i >= 0; i--) if (!projectiles[i].alive) projectiles.splice(i, 1);
    for (let i = blasts.length - 1; i >= 0; i--) if (!blasts[i].alive) blasts.splice(i, 1);

    // draw
    p1.draw();
    p2.draw();
    projectiles.forEach((pr) => pr.draw(ctx));
    blasts.forEach((b) => b.draw(ctx));

    // Draw health bars
    drawHealthBar(ctx, 20, 20, p1.hp, 3, p1.color, "P1");
    drawHealthBar(ctx, WIDTH - 120, 20, p2.hp, 3, p2.color, "P2");

    // Draw parry indicators
    if (p1.parrying) {
      drawParryIndicator(ctx, p1.x + p1.w/2, p1.y - 20, p1.parryTimer, p1.parryDurationDefault, p1.parryWindowLength, p1.color);
    }
    if (p2.parrying) {
      drawParryIndicator(ctx, p2.x + p2.w/2, p2.y - 20, p2.parryTimer, p2.parryDurationDefault, p2.parryWindowLength, p2.color);
    }

    // Draw game over screen
    if (gameOver && winner) {
      drawGameOverScreen(ctx, WIDTH, HEIGHT, winner);
    }

    // collisions
    const h1 = p1.hitbox(), h2 = p2.hitbox();
    if (h1 && aabb(h1, p2.rect())) {
      // Check if P2 can parry P1's attack
      const parryWindowStart = p2.parryDurationDefault - p2.parryWindowLength;
      const parryWindowEnd = p2.parryWindowLength;
      if (p2.parrying && !p2.parryConsumed && p2.parryTimer <= parryWindowStart && p2.parryTimer >= parryWindowEnd) {
        // Successful parry - no damage, stun attacker
        p2.parryConsumed = true;
        p2.parryFreezeTimer = 0.15;
        p1.stunTimer = 1.2;
        console.log(`[qte] P2 successfully parried P1's attack! (parry window active)`);
      } else if (!p2.parrying || p2.parryConsumed) {
        // No parry or parry already consumed - take damage (melee lethal: 3 HP)
        p2.takeDamage(3);
      }
    }
    if (h2 && aabb(h2, p1.rect())) {
      // Check if P1 can parry P2's attack
      const parryWindowStart = p1.parryDurationDefault - p1.parryWindowLength;
      const parryWindowEnd = p1.parryWindowLength;
      if (p1.parrying && !p1.parryConsumed && p1.parryTimer <= parryWindowStart && p1.parryTimer >= parryWindowEnd) {
        // Successful parry - no damage, stun attacker
        p1.parryConsumed = true;
        p1.parryFreezeTimer = 0.15;
        p2.stunTimer = 1.2;
        console.log(`[qte] P1 successfully parried P2's attack! (parry window active)`);
      } else if (!p1.parrying || p1.parryConsumed) {
        // No parry or parry already consumed - take damage (melee lethal: 3 HP)
        p1.takeDamage(3);
      }
    }

    for (const pr of projectiles) {
      if (!pr.alive) continue;
      if (pr.owner !== p1 && aabb(pr.rect(), p1.rect())) {
        // Check if P1 can parry the projectile
        const parryWindowStart = p1.parryDurationDefault - p1.parryWindowLength;
        const parryWindowEnd = p1.parryWindowLength;
        if (p1.parrying && !p1.parryConsumed && p1.parryTimer <= parryWindowStart && p1.parryTimer >= parryWindowEnd) {
          // Successful parry - no damage, stun attacker
          p1.parryConsumed = true;
          p1.parryFreezeTimer = 0.15;
          pr.owner.stunTimer = 1.2;
          pr.alive = false;
          console.log(`[qte] P1 successfully parried P2's projectile! (parry window active)`);
        } else if (!p1.parrying || p1.parryConsumed) {
          // No parry or parry already consumed - take damage
          p1.takeDamage(1);
          pr.alive = false;
        }
        // Debug: log hit and blast chosen
        // eslint-disable-next-line no-console
        console.debug("[qte] projectile hit P1", { projectileSrc: pr.anim.animations["fly"]?.src, blastSrc: P2_BLAST_SRC });
        // Use atlas for blast if available
        let blastImage = null;
        let blastRects = null;
        let blastFrames = 4;

        if (globalAtlas2 && globalAtlas2.animations.blast) {
          blastImage = globalAtlas2.image;
          blastRects = globalAtlas2.animations.blast.frames;
          blastFrames = globalAtlas2.animations.blast.frames.length;
          console.log(`[qte] Blast using atlas frames from cyboard`);
        } else {
          console.log(`[qte] Blast: No atlas frames for 'blast' in cyboard, falling back to individual image.`);
        }

        blasts.push(new Blast(p1.x + p1.w * 0.5, p1.y + p1.h * 0.5, P2_BLAST_SRC, blastFrames, blastImage, blastRects));
      }
      if (pr.owner !== p2 && aabb(pr.rect(), p2.rect())) {
        // Check if P2 can parry the projectile
        const parryWindowStart = p2.parryDurationDefault - p2.parryWindowLength;
        const parryWindowEnd = p2.parryWindowLength;
        if (p2.parrying && !p2.parryConsumed && p2.parryTimer <= parryWindowStart && p2.parryTimer >= parryWindowEnd) {
          // Successful parry - no damage, stun attacker
          p2.parryConsumed = true;
          p2.parryFreezeTimer = 0.15;
          pr.owner.stunTimer = 1.2;
          pr.alive = false;
          console.log(`[qte] P2 successfully parried P1's projectile! (parry window active)`);
        } else if (!p2.parrying || p2.parryConsumed) {
          // No parry or parry already consumed - take damage
          p2.takeDamage(1);
          pr.alive = false;
        }
        // Debug: log hit and blast chosen
        // eslint-disable-next-line no-console
        console.debug("[qte] projectile hit P2", { projectileSrc: pr.anim.animations["fly"]?.src, blastSrc: P1_BLAST_SRC });
        // Use atlas for blast if available
        let blastImage = null;
        let blastRects = null;
        let blastFrames = 4;

        if (globalAtlas1 && globalAtlas1.animations.blast) {
          blastImage = globalAtlas1.image;
          blastRects = globalAtlas1.animations.blast.frames;
          blastFrames = globalAtlas1.animations.blast.frames.length;
          console.log(`[qte] Blast using atlas frames from ninja`);
        } else {
          console.log(`[qte] Blast: No atlas frames for 'blast' in ninja, falling back to individual image.`);
        }

        blasts.push(new Blast(p2.x + p2.w * 0.5, p2.y + p2.h * 0.5, P1_BLAST_SRC, blastFrames, blastImage, blastRects));
      }
    }

    // auto-defeat and game over logic
    if (p1.isDefeated() && p1.state !== "defeat") {
      p1.state = "defeat";
      p1.attacking = false;
      p1.parrying = false;
      p1.ranging = false;
      p1.vx = 0;
      p1.vy = 0;
      p1.anim.setState("defeat");
      gameOver = true;
      winner = p2;
      console.log(`[qte] P1 DEFEATED! P2 WINS!`);
    }
    if (p2.isDefeated() && p2.state !== "defeat") {
      p2.state = "defeat";
      p2.attacking = false;
      p2.parrying = false;
      p2.ranging = false;
      p2.vx = 0;
      p2.vy = 0;
      p2.anim.setState("defeat");
      gameOver = true;
      winner = p1;
      console.log(`[qte] P2 DEFEATED! P1 WINS!`);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function aabb(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, currentHp: number, maxHp: number, color: string, playerName: string) {
    const barWidth = 80;
    const barHeight = 20;
    const heartSize = 16;
    const heartSpacing = 20;

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health bar
    const healthPercent = currentHp / maxHp;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Player name
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(playerName, x, y - 5);

    // Hearts
    for (let i = 0; i < maxHp; i++) {
      const heartX = x + (i * heartSpacing);
      const heartY = y + barHeight + 5;

      if (i < currentHp) {
        // Full heart
        ctx.fillStyle = "#ff4444";
        drawHeart(ctx, heartX, heartY, heartSize);
      } else {
        // Empty heart
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;
        drawHeartOutline(ctx, heartX, heartY, heartSize);
      }
    }
  }

  function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size);
    ctx.bezierCurveTo(x, y + size, x, y + size/2, x + size/2, y + size/2);
    ctx.bezierCurveTo(x + size, y + size/2, x + size, y + size, x + size/2, y + size);
    ctx.bezierCurveTo(x + size, y + size/2, x + size, y, x + size/2, y);
    ctx.bezierCurveTo(x, y, x, y + size/2, x + size/2, y + size/2);
    ctx.fill();
  }

  function drawHeartOutline(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size);
    ctx.bezierCurveTo(x, y + size, x, y + size/2, x + size/2, y + size/2);
    ctx.bezierCurveTo(x + size, y + size/2, x + size, y + size, x + size/2, y + size);
    ctx.bezierCurveTo(x + size, y + size/2, x + size, y, x + size/2, y);
    ctx.bezierCurveTo(x, y, x, y + size/2, x + size/2, y + size/2);
    ctx.stroke();
  }

  function drawParryIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, currentTimer: number, totalDuration: number, windowLength: number, color: string) {
    const barWidth = 60;
    const barHeight = 8;

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);

    // Progress bar
    const progress = (totalDuration - currentTimer) / totalDuration;
    ctx.fillStyle = color;
    ctx.fillRect(x - barWidth/2, y, barWidth * progress, barHeight);

    // Parry window indicator
    const windowStart = (totalDuration - windowLength) / totalDuration;
    const windowEnd = 1.0;
    const windowX = x - barWidth/2 + barWidth * windowStart;
    const windowW = barWidth * (windowEnd - windowStart);

    ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
    ctx.fillRect(windowX, y, windowW, barHeight);

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth/2, y, barWidth, barHeight);

    // "PARRY" text
    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PARRY", x, y - 5);
    ctx.textAlign = "left";
  }

  function drawGameOverScreen(ctx: CanvasRenderingContext2D, width: number, height: number, winner: Fighter) {
    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // Victory text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", width / 2, height / 2 - 60);

    // Winner text
    ctx.fillStyle = winner.color;
    ctx.font = "bold 36px Arial";
    ctx.fillText(`${winner.name} WINS!`, width / 2, height / 2);

    // Restart instruction
    ctx.fillStyle = "#ccc";
    ctx.font = "24px Arial";
    ctx.fillText("Press F5 to restart", width / 2, height / 2 + 60);

    // Reset text alignment
    ctx.textAlign = "left";
  }

  return { ctx, p1, p2 };
}
