#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

TAG = "v0.32.0"
VENDOR_NAME = f"https://raw.githubusercontent.com/huggingface/diffusers/{TAG}/examples/dreambooth/train_dreambooth_lora.py"


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def ml_venv_python(ml: Path) -> Path:
    if sys.platform == "win32":
        p = ml / ".venv" / "Scripts" / "python.exe"
    else:
        p = ml / ".venv" / "bin" / "python3"
        if not p.is_file():
            p = ml / ".venv" / "bin" / "python"
    return p


def main() -> None:
    root = repo_root()
    ml = root / "ml"
    py = ml_venv_python(ml)
    if not py.is_file():
        print("Missing ml/.venv. Create it: cd ml && python -m venv .venv && pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)
    vendor = ml / "vendor"
    train_script = vendor / "train_dreambooth_lora.py"
    instance_src = root / "public" / "4_Research"
    instance_flat = ml / "data" / "instance_flat"
    out = ml / "outputs" / "lora-run"
    instance_prompt = "a sksseq photograph from the Sequence research set"

    vendor.mkdir(parents=True, exist_ok=True)
    if not train_script.is_file():
        print(f"Downloading DreamBooth LoRA trainer ({TAG})…")
        req = urllib.request.Request(VENDOR_NAME, headers={"User-Agent": "Sequence-ml/1.0"})
        with urllib.request.urlopen(req) as r:
            train_script.write_bytes(r.read())

    def flat_ready() -> bool:
        if not instance_flat.is_dir():
            return False
        for p in instance_flat.iterdir():
            if p.is_file() and p.name != ".gitkeep":
                return True
        return False

    if not flat_ready() and instance_src.is_dir():
        print(f"Preparing flat instance folder from {instance_src}…")
        subprocess.check_call(
            [str(py), str(ml / "collect_instance_images.py"), "--src", str(instance_src), "--dst", str(instance_flat)],
            cwd=root,
        )

    mixed = "no"
    if shutil.which("nvidia-smi"):
        mixed = "fp16"

    max_steps = int(os.environ.get("MAX_TRAIN_STEPS", "800"))
    resume = bool(os.environ.get("RESUME", "").strip())
    out.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {out}")
    print(f"max_train_steps={max_steps}")
    if resume:
        print(f"Resuming from latest checkpoint in {out}")
    acc_cmd = [str(py), "-m", "accelerate.commands.launch"]
    args = acc_cmd + [
        str(train_script),
        f"--pretrained_model_name_or_path=runwayml/stable-diffusion-v1-5",
        f"--instance_data_dir={instance_flat}",
        f"--output_dir={out}",
        f"--instance_prompt={instance_prompt}",
        "--resolution=512",
        "--center_crop",
        "--train_batch_size=1",
        "--gradient_accumulation_steps=1",
        "--gradient_checkpointing",
        f"--max_train_steps={max_steps}",
        "--learning_rate=1e-4",
        "--lr_scheduler=constant",
        "--lr_warmup_steps=0",
        f"--mixed_precision={mixed}",
        "--rank=8",
        "--checkpointing_steps=200",
        "--report_to=tensorboard",
    ]
    if resume:
        args.append("--resume_from_checkpoint=latest")
    env = {**os.environ, "TOKENIZERS_PARALLELISM": "false"}
    os.chdir(root)
    subprocess.check_call(args, env=env)
    print(f"Done. LoRA weights under: {out}")


if __name__ == "__main__":
    main()
