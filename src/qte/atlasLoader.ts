// src/qte/atlasLoader.ts - simple runtime loader for TexturePacker JSON (ARRAY) format
// The JSON layout we expect (TexturePacker "JSON (Hash)" or "JSON (Array)" works):
// {
//   "frames": {
//      "idle_0": { "frame": {"x":0,"y":0,"w":256,"h":256}, ... },
//      "idle_1": {...},
//      "walk_0": {...}
//   },
//   "meta": { "image": "atlas.png" }
// }
// Each frame key is expected to be <state>_<index> (index starting at 0).
// We group them into an array per state and keep the order of index.

export interface Rect { x: number; y: number; w: number; h: number }
export interface AtlasAnimation {
  frames: Rect[];
  fps: number;
  loop: boolean;
}

export interface LoadedAtlas {
  image: HTMLImageElement;
  animations: Record<string, AtlasAnimation>;
  frameW: number;
  frameH: number;
  frames?: Record<string, any>; // Raw frames data for fallback frame counting
}

export async function loadAtlas(basePath: string): Promise<LoadedAtlas> {
  // basePath may be a directory or a path to a JSON file (e.g. "/qte/ninja" or "/qte/ninja/atlas2.json")
  const cacheBuster = Date.now();

  const candidates: string[] = [];
  if (basePath.match(/\.json$/i)) {
    candidates.push(basePath);
  } else {
    candidates.push(`${basePath}/atlas.json`);
    candidates.push(`${basePath}.json`);
    // allow explicit atlas2 naming (common in this project)
    candidates.push(`${basePath}/atlas2.json`);
    candidates.push(`${basePath}/atlas2`);
  }

  let text: string | null = null;
  let usedJsonUrl: string | null = null;
  const tried: string[] = [];

  for (const cand of candidates) {
    const url = `${cand}?v=${cacheBuster}`;
    tried.push(url);
    console.log(`[atlas] Trying ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`[atlas] ${url} responded ${res.status}`);
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const body = await res.text();
      // If server returned HTML (e.g. index.html), skip and try next candidate
      if (contentType.includes('text/html') || body.trim().startsWith('<!DOCTYPE')) {
        console.warn(`[atlas] ${url} looks like HTML (skipping)`);
        continue;
      }

      text = body;
      usedJsonUrl = url.replace(/\?v=\d+$/, '');
      console.log(`[atlas] Loaded JSON from ${url} (len=${text.length})`);
      break;
    } catch (e) {
      console.warn(`[atlas] fetch failed for ${url}`, e);
      continue;
    }
  }

  if (!text || !usedJsonUrl) {
    throw new Error(`Atlas JSON not found. Tried: ${tried.join(', ')}`);
  }

  console.log(`[atlas] JSON response length: ${text.length}, starts with: ${text.substring(0, 100)}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error(`[atlas] JSON parse error:`, e);
    console.error(`[atlas] Invalid JSON text:`, text.substring(0, 200));
    throw e;
  }

  const framesData = data.frames;
  const meta = data.meta || {};
  // compute base directory from usedJsonUrl
  const baseDir = usedJsonUrl.replace(/\/[^/]*$/, '');
  const imgPath = `${baseDir}/${meta.image || 'atlas.png'}?v=${cacheBuster}`;
  console.log(`[atlas] Loading image ${imgPath}`);
  const image = await loadImage(imgPath);

  const stateMap: Record<string, Rect[]> = {};
  for (const key in framesData) {
    const state = key.replace(/_\d+$/, "");
    const idxMatch = /_(\d+)$/.exec(key);
    const idx = idxMatch ? parseInt(idxMatch[1], 10) : 0;
    if (!stateMap[state]) stateMap[state] = [];
    const f = framesData[key].frame as { x: number; y: number; w: number; h: number };
    stateMap[state][idx] = { x: f.x, y: f.y, w: f.w, h: f.h };
  }

  // Sort frames by index to ensure correct order
  for (const state in stateMap) {
    stateMap[state].sort((a, b) => {
      // Find the original indices for sorting
      const aIdx = Object.keys(framesData).find(k => k.startsWith(`${state}_`) && framesData[k].frame.x === a.x && framesData[k].frame.y === a.y);
      const bIdx = Object.keys(framesData).find(k => k.startsWith(`${state}_`) && framesData[k].frame.x === b.x && framesData[k].frame.y === b.y);
      if (aIdx && bIdx) {
        const aNum = parseInt(aIdx.split('_')[1], 10);
        const bNum = parseInt(bIdx.split('_')[1], 10);
        return aNum - bNum;
      }
      return 0;
    });
  }

  // Determine frame size: prefer meta.tileSize if provided
  const firstState = Object.keys(stateMap)[0];
  const firstFrame = firstState ? stateMap[firstState][0] : { w: 64, h: 64 };
  const tileSize = (meta.tileSize && Array.isArray(meta.tileSize) && meta.tileSize.length >= 2) ? meta.tileSize : [firstFrame.w, firstFrame.h];
  const frameW = tileSize[0];
  const frameH = tileSize[1];

  // Build animations; prefer loop/fps from data.animations if present
  const providedAnims = data.animations || {};
  const animations: Record<string, AtlasAnimation> = {};
  for (const s of Object.keys(stateMap)) {
    const provided = providedAnims[s] || providedAnims[s + ''];
    const fps = provided && provided.fps ? provided.fps : (meta.fps || 12);
    const loop = provided && typeof provided.loop === 'boolean' ? provided.loop : true;
    animations[s] = { frames: stateMap[s], fps, loop };
  }

  return { image, animations, frameW, frameH, frames: framesData };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
