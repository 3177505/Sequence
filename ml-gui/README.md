# Sequence ML — browser UI (buttons)

Small **Gradio** app that talks to the same **`ml/`** virtualenv and scripts as the terminal. Works on **Windows** (double-click friendly after one setup) and macOS.

## What you need first

1. A working **`ml/.venv`** with `pip install -r ml/requirements.txt` (PyTorch, diffusers, accelerate, etc.).
2. A separate **light** venv for this UI (only Gradio), or install Gradio into `ml/.venv` if you prefer one environment.

**Recommended (Windows):**

```text
cd path\to\Sequence\ml
py -3 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
cd ..\ml-gui
py -3 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

## Run the app

**Windows:**

```text
cd path\to\Sequence\ml-gui
.venv\Scripts\python app.py
```

**macOS / Linux:**

```bash
cd ml-gui
source .venv/bin/activate
python app.py
```

A browser tab opens at **http://127.0.0.1:7860** (set `SEQUENCE_ML_GUI_PORT=8080` to change the port).

- **Train LoRA** — starts `ml/launch_train.py` in the background; log tail in the page, also written to `ml/outputs/training-gui.log`.
- **Generate** — calls `ml/generate.py` and shows images from `ml/outputs/gen/`.

Training is still heavy on **CPU**; for speed use a **PC with an NVIDIA GPU** and the same repo layout.

## One venv only

If you do not want two venvs:

```bash
cd ml && source .venv/bin/activate && pip install "gradio>=4,<6"
cd ../ml-gui && ../ml/.venv/bin/python app.py
```

## Security note

The UI binds to **localhost** only. Do not expose this port to the internet without authentication.
