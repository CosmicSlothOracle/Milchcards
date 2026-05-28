# AI Asset Pipeline — Documentation

This document describes the external generative AI workflow used to produce card artwork for Milchcards. Generation and batch-processing scripts live in a **separate ComfyUI automation workspace** (not committed to this repo). Finished PNGs are committed under `public/assets/images/`.

---

## Pipeline Overview

```
Midjourney (raw generation)
  → Manual curation & quality review
  → Python analysis (OCR, layout regions, quality metrics)
  → ComfyUI + Python batch enhancement (upscale, sharpen, color)
  → Manual spot-check
  → public/assets/images/ (committed to this repo)
  → src/data/gameData.ts (filename mapping)
```

---

## Phase 1 — Midjourney Prompt Templates

Each card category uses a structured prompt architecture to maintain visual consistency across the deck.

### Politician Cards

```
[Full name], political portrait, editorial illustration style,
dramatic rim lighting, dark slate background, cyber-political aesthetic,
high detail face, professional headshot composition,
1024x1024 --ar 1:1 --style raw --seed [SEED]
```

### Initiatives (Sofort-Initiative / Dauerhaft-Initiative)

```
[Card concept], political campaign visual metaphor,
abstract symbolic illustration, neon accent colors on dark background,
editorial infographic style, no text, no logos,
1024x1024 --ar 1:1 --style raw --seed [SEED]
```

### Interventions

```
[Intervention concept], dramatic political event scene,
cinematic composition, high contrast, dark moody palette,
editorial news illustration style, no text,
1024x1024 --ar 1:1 --style raw --seed [SEED]
```

> **To fill in:** Add your actual prompt variations and category-specific modifiers as you document individual card batches.

---

## Phase 2 — Python Quality Analysis

Before batch enhancement, each curated image passes through analysis (implemented in `trading_card_optimizer.py` in the external ComfyUI workspace):

| Check | Method |
|-------|--------|
| Text readability | EasyOCR extraction |
| Layout regions | Border / artwork / text area detection |
| Edge quality | Sharpness scoring |
| Color consistency | Dominant palette extraction |

Images below the quality threshold were rejected or sent back for manual re-generation.

Category assignment (politician vs. initiative vs. intervention) was done manually — not via automated classification.

---

## Phase 3 — ComfyUI Batch Enhancement

Verified tooling in the external ComfyUI workspace:

### `trading_card_optimizer.py`

Documented purpose: *"Automatisierte Optimierung von Midjourney-generierten Trading Cards"*

Capabilities:
- OCR-based text extraction and layout analysis
- ComfyUI workflow integration with LoRA-based enhancement
- Edge sharpening and upscaling (RealESRGAN)
- Batch processing with configurable quality thresholds
- Structured logging per run

### `batch_optimize_cards.py`

Batch wrapper for an input directory:
- Region-based enhancement (border clarity, artwork saturation, text contrast)
- Unsharp mask sharpening
- Resize to target card dimensions
- Logs processing results per file

### Output folders in this repo

| Folder | Contents |
|--------|----------|
| `public/assets/images/politicians_1024x1024/` | Full-size politician card art |
| `public/assets/images/politicians_256x256/` | UI-scaled politician thumbnails |
| `public/assets/images/specials_1024x1024/` | Initiatives & interventions |
| `public/assets/images/specials_256x256/` | UI-scaled special card thumbnails |

Filename-to-card mapping: `FILENAME_MAPPING` in [`src/data/gameData.ts`](../src/data/gameData.ts).

---

## Generation Seeds

Seeds are recorded per card to ensure reproducibility.

| Card Key | Card Name | Midjourney Seed | Prompt Version | Notes |
|----------|-----------|-----------------|----------------|-------|
| _example_ | _Example Card_ | _1234567890_ | _v1_ | _Initial generation_ |

> **To fill in:** Export seeds from Midjourney and populate this table, or maintain a `docs/prompts/seeds.json` file.

### Planned JSON schema (`docs/prompts/seeds.json`)

```json
{
  "cards": [
    {
      "key": "Vladimir_Putin",
      "name": "Vladimir Putin",
      "seed": 0,
      "promptVersion": "v1",
      "category": "politician",
      "filename": "Vladimir_Putin.png",
      "curated": true,
      "notes": ""
    }
  ]
}
```

---

## What is NOT part of this pipeline

The external ComfyUI workspace contains many other experiments (sprite sheets, GIF pixel-art conversion, Pokemon TCG verification with Hugging Face ViT/DINOv2). Those tools were **not used** for Milchcards card production and are not referenced here.

---

## Commercial Use & Public Disclosure

### In-game (Credits screen)

The game includes an **AI-Assisted Content Disclosure** section in the Credits screen (`src/components/Credits.tsx`) with the following statement:

> Portions of this game's visual assets were created with generative AI tools and were reviewed, edited, and integrated by human creators.

> Certain artwork originated from images generated with Midjourney under a paid commercial subscription and was subsequently curated, refined, and incorporated by the developer. Commercial usage is subject to Midjourney's Terms of Service and applicable law.

### README / store page / publisher submission

For external documentation (GitHub, Steam, itch.io, portfolio):

```
AI-assisted content disclosure: Portions of the game's visual assets were created
with generative AI tools and were reviewed, edited, and integrated by human creators.

Artwork created with Midjourney and modified by the developer.
```

### Practical compliance checklist

| Step | Action |
|------|--------|
| Subscription proof | Keep records that a paid Midjourney plan was active when assets were generated |
| Prompt archive | Store prompts (see example below) alongside each card |
| Seed archive | Record Midjourney seeds per generation for traceability |
| Edit trail | Keep raw generations and post-processed versions |
| IP safety | Avoid recognizable copyrighted characters, brands, or franchise content |
| Legal review | For commercial release at scale, have a lawyer review asset pipeline and disclosures |

Paid Midjourney subscribers generally own assets they generate and may use them commercially, subject to Midjourney's current Terms of Service and applicable law.

### Example prompt (Spin Doctor initiative)

```
Spin Doctoring one forecourt tile with two faint light rings, a distant tile with one;
sunlit modernist courtyard; rule-of-thirds; ultramarine, white, cherry-red accents;
long shadows; clean geometry; ultra-sharp; smooth stone;
mood: selective persuasion; style: mid-century poster blended with contemporary realism
```

---

## Transparency Statement

- All card artwork in Milchcards is **AI-generated** via Midjourney
- Prompts and seeds are documented here for reproducibility and compliance
- Manual curation was applied wherever AI output did not meet quality standards
- No copyrighted likenesses were intentionally replicated; figures are stylized editorial illustrations

---

## Related Files in This Repo

| File | Purpose |
|------|---------|
| [`src/data/gameData.ts`](../src/data/gameData.ts) | `FILENAME_MAPPING` — maps card keys to PNG filenames |
| [`public/assets/images/`](../public/assets/images/) | Final assembled card artwork |
| [`public/screenshots/`](../public/screenshots/) | Product screenshots for README gallery |
