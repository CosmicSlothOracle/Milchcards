// Central asset registry for QTE demo – can later be replaced by JSON generated list
export type AnimationOverride = Partial<{
  src: string;
  frames: number;
  fps: number;
  loop: boolean;
  frameW: number;
  frameH: number;
}>;

// --- Asset paths per character folder ----
// Asset paths are resolved relative to the location of the HTML file (public/qte/index.html).
// We use relative URLs (no leading slash) to avoid issues when the demo is deployed under a sub-path.
export const P1_PROJECTILE_SRC = "ninja/projectile_256x256_6.png";
export const P1_BLAST_SRC = "ninja/blast_256x256_4.png";

export const P2_PROJECTILE_SRC = "cyboard/projectile_256x256_6.png";
// cyboard currently has no dedicated blast sprite – fallback to the neutral ninja blast
export const P2_BLAST_SRC = "cyboard/blast_256x256_4.png";

function framesFromFilename(src: string, fallback: number): number {
  const m = /_(\d+)\.(png|jpg|jpeg|webp)$/i.exec(src || "");
  const n = m ? parseInt(m[1], 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function buildSpriteConfig(
  folder: string,
  overrides?: Record<string, AnimationOverride>
) {
  // Ensure no trailing slashes and keep the path RELATIVE (no leading '/')
  const base = folder.replace(/\/+$|\/+$/g, "");
  const anims: Record<string, AnimationOverride> = {
    idle: {
      src: `${base}/idle_256x256_6.png`,
      frames: framesFromFilename(`${base}/idle_256x256_6.png`, 6),
      fps: 6,
      loop: true,
      frameW: 256,
      frameH: 256,
    },
    walk: {
      src: `${base}/walk_256x256_6.png`,
      frames: framesFromFilename(`${base}/walk_256x256_6.png`, 6),
      fps: 10,
      loop: true,
      frameW: 256,
      frameH: 256,
    },
    jump: {
      src: `${base}/jump_256x256_8.png`,
      frames: framesFromFilename(`${base}/jump_256x256_8.png`, 8),
      fps: 12,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    attack: {
      src: `${base}/attack_256x256_7.png`,
      frames: framesFromFilename(`${base}/attack_256x256_7.png`, 7),
      fps: 12,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    parry: {
      src: `${base}/parry_256x256_6.png`,
      frames: framesFromFilename(`${base}/parry_256x256_6.png`, 6),
      fps: 10,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    spawn: {
      src: `${base}/spawn_256x256_6.png`,
      frames: framesFromFilename(`${base}/spawn_256x256_6.png`, 6),
      fps: 8,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    defeat: {
      src: `${base}/defeat_256x256_4.png`,
      frames: framesFromFilename(`${base}/defeat_256x256_4.png`, 4),
      fps: 6,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    projectile: {
      src: `${base}/projectile_256x256_6.png`,
      frames: framesFromFilename(`${base}/projectile_256x256_6.png`, 6),
      fps: 15, // Match the improved projectile animation FPS
      loop: true,
      frameW: 256,
      frameH: 256,
    },
    ranged: {
      src: `${base}/ranged_256x256_4.png`,
      frames: framesFromFilename(`${base}/ranged_256x256_4.png`, 4),
      fps: 12,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
    blast: {
      src: `${base}/blast_256x256_4.png`,
      frames: framesFromFilename(`${base}/blast_256x256_4.png`, 4),
      fps: 12,
      loop: false,
      frameW: 256,
      frameH: 256,
    },
  };
  if (overrides) {
    for (const k of Object.keys(overrides)) {
      anims[k] = { ...anims[k], ...overrides[k] };
    }
  }
  return { frameW: 256, frameH: 256, animations: anims };
}
