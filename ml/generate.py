#!/usr/bin/env python3
import argparse
import random
import sys
from pathlib import Path

import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionPipeline


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main() -> None:
    p = argparse.ArgumentParser(description="Text-to-image with SD1.5 + optional LoRA weights.")
    p.add_argument(
        "--pretrained",
        type=str,
        default="runwayml/stable-diffusion-v1-5",
        help="Base model id or local path.",
    )
    p.add_argument(
        "--lora",
        type=str,
        default=None,
        help="Path to LoRA folder or .safetensors from training.",
    )
    p.add_argument("--prompt", type=str, required=True)
    p.add_argument(
        "--negative",
        type=str,
        default="",
        help="Optional negative prompt.",
    )
    p.add_argument("--out-dir", type=Path, default=Path("outputs/gen"))
    p.add_argument("--count", type=int, default=1, help="How many images to sample.")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--steps", type=int, default=28)
    p.add_argument(
        "--guidance",
        type=float,
        default=7.5,
        help="Classifier-free guidance scale.",
    )
    a = p.parse_args()
    dev = pick_device()
    dtype = torch.float16 if dev in ("cuda", "mps") else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained(
        a.pretrained,
        torch_dtype=dtype,
        safety_checker=None,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    if a.lora:
        pipe.load_lora_weights(a.lora)
    pipe = pipe.to(dev)
    a.out_dir.mkdir(parents=True, exist_ok=True)
    seed = a.seed
    for i in range(a.count):
        g = torch.Generator(device=dev)
        if seed is None:
            s = random.randint(0, 2**31 - 1)
        else:
            s = seed + i
        g.manual_seed(s)
        kwargs = {
            "prompt": a.prompt,
            "num_inference_steps": a.steps,
            "guidance_scale": a.guidance,
            "generator": g,
        }
        if a.negative:
            kwargs["negative_prompt"] = a.negative
        try:
            out = pipe(**kwargs)
        except Exception as e:
            print("Inference failed:", e, file=sys.stderr)
            if dev == "mps":
                print(
                    "On some macOS / MPS builds, long prompts or memory spikes can fail; try --steps 20 or a smaller resolution pipeline.",
                    file=sys.stderr,
                )
            raise
        im = out.images[0]
        path = a.out_dir / f"out_{i:02d}.png"
        im.save(path)
        print(path)


if __name__ == "__main__":
    main()
