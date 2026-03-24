# Sequence

Dual-screen kiosk prototype: one page, two columns. Each column plays its own randomized sequence (colors for now; videos later). A **trigger** switches both columns to a second pair of sequences for **15 seconds** (faster cadence in the current build).

---

## Run locally

```bash
npm install
npm run build:css
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SCSS edits: `npm run watch:css` in another terminal.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Static server on port 3000 |
| `npm run build:css` | Compile `scss/main.scss` → `css/main.css` |
| `npm run watch:css` | Watch and rebuild CSS |

---

## Project layout

```
index.html
js/app.js          # sequences, trigger timing (see constants at top)
scss/_vars.scss    # colors / UI tokens
scss/main.scss
css/main.css       # generated — run build:css after SCSS changes
```

---

## Behavior

| Phase | Left column | Right column |
|-------|-------------|--------------|
| Baseline | Group **A** (folder 1) | Group **B** (folder 2) |
| After trigger (~15 s) | Group **C** | Group **D** |

Always **A+B** together, then **C+D** — one clip (or color) per screen at a time. Logic lives in `js/app.js` (`SLIDE_MS`, `TRIGGER_SLIDE_MS`, `TRIGGER_MS`).

---

## Raspberry Pi

**Board:** **Raspberry Pi 4 or 5** with **4 GB RAM** and **two micro-HDMI** ports is the simplest way to drive two displays. Use a **good microSD** (32–64 GB, A2 if possible), **official PSU** (Pi 4: ~5.1 V / 3 A; Pi 5: follow current Raspberry Pi spec), and **heatsink or fan** for long video runs.

**OS:** Raspberry Pi OS (64-bit) with desktop; enable auto-login; disable screen blanking for kiosk use.

---

## Shopping list

**Core:** Pi 4/5 (4 GB) · official power supply · microSD · case / cooling  

**Displays:** two HDMI monitors · **2× micro-HDMI → HDMI** cables (length for your install)

**Trigger (browser-first, no Python on the Pi):** small USB MCU (**Arduino Nano**, **Pi Pico**, or **ESP32**) · **PIR** (e.g. HC-SR501) or other sensor · Dupont wires · USB cable for the MCU  

**Setup:** USB keyboard + mouse for first install (borrow if you can)

**Optional — power bank:** only if you need battery power. Must deliver **stable 5 V** at **≥3 A** (Pi 4) or **≥5 A** (Pi 5) on the Pi port. Many phone banks sag under load (reboots, SD risk). Prefer **short, thick** USB cable. For **24/7** installs, **mains + official PSU** is more reliable — test under **both screens + video** before trusting a bank.

---

## Page, two screens, and the trigger

Playback can stay **entirely in Chromium** (two `<video>` elements or two columns, fullscreen across both monitors).

**GPIO:** JavaScript in a normal page **cannot** read the Pi’s GPIO. Options:

1. **Web Serial (recommended to avoid Python on the Pi):** sensor → **microcontroller** → **USB** → Pi → Chromium **Web Serial API** in JS → same trigger as the on-screen button. You may need a one-time **“Connect sensor”** click for permission. Firmware on the MCU is small (Arduino/C), not Python on the Pi.

2. **GPIO only on the Pi:** a **service** on the device must read GPIO (Python, **Node** + `onoff`, etc.) and talk to the page — not “page only.”

```
Sensor → MCU → USB → Pi → Chromium → your page (Web Serial) → trigger
Videos  → files on disk → static server or file URLs → <video>
```

---

## Video folders (when you switch from colors)

```
videos/
  baseline-left/    # group A
  baseline-right/   # group B
  trigger-left/     # group C
  trigger-right/    # group D
```

Prefer **H.264 in MP4** for Pi + Chromium.

---

## Sensors (short)

| Sensor | Use case |
|--------|----------|
| PIR HC-SR501 | Motion / someone passed |
| IR break-beam | Line crossed |
| Ultrasonic | Distance threshold (more tuning) |

Debounce in software (e.g. ignore repeats for 1–3 s on PIR).

---

## Kiosk on boot (outline)

1. Serve the built site (`serve`, nginx, or similar) on `127.0.0.1`.
2. Autostart Chromium in kiosk/fullscreen to that URL.
3. If using Web Serial, keep a visible **Connect** control for the first interaction.

Exact autostart commands depend on Pi OS version — search for current “Raspberry Pi Chromium kiosk autostart” docs.

---

## Checklist

- [ ] Pi with two working HDMI outputs (or tested USB display path)
- [ ] OS, network, auto-login
- [ ] Four video folders + H.264 MP4 (when implemented)
- [ ] Fullscreen app; baseline + trigger behave as expected
- [ ] Trigger: Web Serial + MCU, or GPIO + small service
- [ ] Autostart: server (if any) + Chromium

---

## Next steps (code)

Replace color arrays in `js/app.js` with video playlists from the four folders, keep baseline vs 15 s trigger behavior, then add **Web Serial** handling that calls the same function as the trigger button.
