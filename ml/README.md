# Sequence — local image training and generation

This folder is a small CLI product living next to the static site. It is not run by the web server; use a terminal (and a GPU is strongly recommended for training).

**Suggested stack:** [Stable Diffusion 1.5](https://huggingface.co/runwayml/stable-diffusion-v1-5) as the base generative model, plus **LoRA** trained on your research images (DreamBooth-style). That matches how people adapt diffusion models to a small personal image set.

**Not the same as** `public/251205_cc8_gpu_accelator.py`, which is *feature visualization* (gradient ascent in a classifier). It does not learn weights from your `4_Research` folder.

## Setup

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
accelerate config
```

## Data

`public/4_Research` is nested. The official DreamBooth script expects a **single folder of image files**. Run:

```bash
python collect_instance_images.py
```

## Train LoRA

```bash
./launch_train.sh
```

First run downloads HuggingFace’s `train_dreambooth_lora.py` (pinned tag) into `ml/vendor/`.

## Generate

```bash
python generate.py --lora outputs/lora-run --prompt "a sksseq photograph, abstract diagram, high contrast" --out-dir outputs/gen --count 2
```

Omit `--lora` to use only the base model.

Site documentation: [ml-train.html](../ml-train.html) and [ml-generate.html](../ml-generate.html).
