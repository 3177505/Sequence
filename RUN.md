# Sequence — how to run the site and the ML training

## Website (this repository)

**Requirements:** Node.js 18+ recommended.

1. **Install** (once, from the project root):

   ```bash
   npm install
   ```

2. **Develop** — dev server with SCSS compile, live reload, and API routes (including `/api/research-images` and research gallery data):

   ```bash
   npm run dev
   ```

   Open **http://localhost:3000** (or the port printed in the terminal; override with `PORT=8080` if needed).

3. **Regenerate static JSON** used by the gallery and other pages (run after you change `scripts/lib/sequence-notes.mjs` or folder structure, if you host without the dev server):

   ```bash
   npm run build:public-tree
   ```

4. **Optional — static only** (no custom APIs — some features need step 2):

   ```bash
   npm run build:public-tree
   npx serve . -l 3000
   ```

Main entry pages: `index.html` (dual-pane prototype), `research.html` (research gallery). Navigation is in `partials/site-nav.html`.

**Environment:** `SEQUENCE_RESEARCH_PAIR` selects which preset from `researchPairPresets` in `scripts/lib/sequence-notes.mjs` (only affects dev server and fresh gallery build if you set the var when building).

---

## ML — train LoRA and generate (folder `ml/`)

Python runs **outside** the Node server. You need a **GPU** for practical training; Apple Silicon can run it on **MPS** but training will be slow.

1. **Environment** (from project root):

   ```bash
   cd ml
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   accelerate config
   ```

2. **Train** — downloads the official DreamBooth LoRA script on first run, flattens `public/4_Research` into `ml/data/instance_flat`, and writes weights under `ml/outputs/lora-run` (configurable in `ml/launch_train.sh`):

   ```bash
   ./launch_train.sh
   ```

   The script must see `accelerate` on your `PATH` (use the activated venv).

3. **Generate** images with the base model plus your LoRA:

   ```bash
   python generate.py --lora outputs/lora-run --prompt "a sksseq photograph, your words here" --out-dir outputs/gen --count 2
   ```

4. **Documentation pages** in the same site: `ml-train.html` and `ml-generate.html` (open via the dev server in step 1).

For more detail, read `ml/README.md`.

## ML — průvodce v prohlížeči (stejný dev server)

With `npm run dev`, open **`ml-dashboard.html`**: buttons call `/api/ml/*` to run `ml/launch_train.py` and `ml/generate.py` using `ml/.venv`. Disable with `SEQUENCE_ML_API=0`. Does not work with static `serve` alone.

## ML — Gradio (volitelné, samostatná app)

From `ml-gui/`: `pip install -r requirements.txt` in a small venv, then `python app.py`. See `ml-gui/README.md`. Uses the same `ml/.venv` for PyTorch and training.
