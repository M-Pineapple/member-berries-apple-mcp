#!/usr/bin/env python3
"""Render a scripted Member Berries README demo GIF.

This is a simulated transcript, not a live macOS capture. It shows the real
product loop: notes.create writes a preference to Apple Notes, then a later
session notes.search reads it back. Run from the repo root:

    python3 docs/render-demo.py
"""

from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "demo.gif"

W, H = 960, 540
SCALE = 2  # draw at 2x, then downscale for cleaner edges

BG = (15, 23, 42)
WINDOW = (17, 24, 39)
CHROME = (30, 41, 59)
BORDER = (51, 65, 85)
TEXT = (226, 232, 240)
MUTED = (148, 163, 184)
DIM = (100, 116, 139)
BERRY = (124, 58, 237)
USER_BG = (30, 41, 59)
AI_BG = (30, 27, 75)
PILL_BG = (49, 46, 129)
NOTE_PAPER = (255, 251, 235)
NOTE_RULE = (253, 230, 138)
NOTE_INK = (41, 37, 36)
NOTE_HEAD = (28, 25, 23)
GREEN = (74, 222, 128)
RED = (248, 113, 113)
AMBER = (251, 191, 36)

FONT_DIR = Path("/usr/share/fonts/truetype/macos")
MONO_DIR = Path("/usr/share/fonts/truetype/jetbrains-mono")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / name
    if not path.exists():
        path = MONO_DIR / name
    return ImageFont.truetype(str(path), size * SCALE)


def load_fonts() -> dict[str, ImageFont.FreeTypeFont]:
    return {
        "title": font("Inter-SemiBold.ttf", 18),
        "label": font("Inter-Medium.ttf", 12),
        "body": font("Inter-Regular.ttf", 15),
        "body_sm": font("Inter-Regular.ttf", 13),
        "bold": font("Inter-SemiBold.ttf", 15),
        "mono": ImageFont.truetype(
            str(MONO_DIR / "JetBrainsMono-Medium.ttf"), 12 * SCALE
        ),
        "note_title": font("Inter-SemiBold.ttf", 16),
        "note_body": font("Inter-Regular.ttf", 14),
        "footer": font("Inter-Regular.ttf", 12),
        "chip": font("Inter-Medium.ttf", 11),
    }


def rr(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill=None,
    outline=None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(xy, radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def text_h(draw: ImageDraw.ImageDraw, lines: list[str], fnt: ImageFont.FreeTypeFont, gap: int) -> int:
    if not lines:
        return 0
    bbox = draw.textbbox((0, 0), "Ag", font=fnt)
    line_h = bbox[3] - bbox[1]
    return line_h * len(lines) + gap * (len(lines) - 1)


def draw_window_chrome(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    fonts: dict[str, ImageFont.FreeTypeFont],
    accent: str = "chat",
) -> int:
    x0, y0, x1, y1 = [c * SCALE for c in box]
    r = 16 * SCALE
    rr(draw, (x0, y0, x1, y1), 16, fill=WINDOW, outline=BORDER, width=1)
    # title bar (square bottom so it meets the body)
    draw.rectangle((x0, y0 + 18 * SCALE, x1, y0 + 36 * SCALE), fill=CHROME)
    rr(draw, (x0, y0, x1, y0 + 36 * SCALE), 16, fill=CHROME)
    draw.rectangle((x0, y0 + 20 * SCALE, x1, y0 + 36 * SCALE), fill=CHROME)

    cy = y0 + 18 * SCALE
    for i, colour in enumerate((RED, AMBER, GREEN)):
        cx = x0 + (18 + i * 16) * SCALE
        draw.ellipse((cx - 5 * SCALE, cy - 5 * SCALE, cx + 5 * SCALE, cy + 5 * SCALE), fill=colour)

    draw.text((x0 + 72 * SCALE, y0 + 10 * SCALE), title, font=fonts["label"], fill=MUTED)
    return 36  # chrome height in CSS pixels


def bubble(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    who: str,
    text: str,
    fonts: dict[str, ImageFont.FreeTypeFont],
    max_w: int,
    reveal: float = 1.0,
) -> int:
    """Draw a chat bubble. reveal in 0..1 controls typed characters. Returns height in CSS px."""
    x, y = xy
    shown = text[: max(0, math.ceil(len(text) * reveal))]
    fnt = fonts["body"]
    inner_w = max_w * SCALE - 28 * SCALE
    lines = wrap(draw, shown if shown else " ", fnt, inner_w)
    gap = 5 * SCALE
    th = text_h(draw, lines, fnt, gap)
    pad_x, pad_y = 14 * SCALE, 10 * SCALE
    bw = min(inner_w, max(draw.textlength(line, font=fnt) for line in lines)) + pad_x * 2
    bh = th + pad_y * 2
    x0, y0 = x * SCALE, y * SCALE

    if who == "you":
        fill = USER_BG
        label = "You"
        label_col = MUTED
        x0 = (x + max_w) * SCALE - bw
        label_x = x0 + bw - draw.textlength(label, font=fonts["chip"])
    else:
        fill = AI_BG
        label = "Member Berries"
        label_col = (196, 181, 253)
        label_x = x0

    draw.text((label_x, y0), label, font=fonts["chip"], fill=label_col)
    label_h = 16 * SCALE
    rr(draw, (x0, y0 + label_h, x0 + bw, y0 + label_h + bh), 12, fill=fill)

    ty = y0 + label_h + pad_y
    bbox = draw.textbbox((0, 0), "Ag", font=fnt)
    line_h = bbox[3] - bbox[1]
    for line in lines:
        draw.text((x0 + pad_x, ty), line, font=fnt, fill=TEXT)
        ty += line_h + gap

    return int((label_h + bh) / SCALE) + 12


def pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fonts: dict[str, ImageFont.FreeTypeFont],
    opacity: float = 1.0,
) -> int:
    x, y = xy
    fnt = fonts["mono"]
    tw = draw.textlength(text, font=fnt)
    pad_x, pad_y = 10 * SCALE, 6 * SCALE
    x0, y0 = x * SCALE, y * SCALE
    fill = tuple(int(c * opacity + WINDOW[i] * (1 - opacity)) for i, c in enumerate(PILL_BG))
    ink = tuple(int(c * opacity + WINDOW[i] * (1 - opacity)) for i, c in enumerate((221, 214, 254)))
    rr(draw, (x0, y0, x0 + tw + pad_x * 2, y0 + 24 * SCALE), 8, fill=fill)
    draw.text((x0 + pad_x, y0 + pad_y - 1 * SCALE), text, font=fnt, fill=ink)
    return 36


def notes_panel(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fonts: dict[str, ImageFont.FreeTypeFont],
    title: str,
    body: str,
    highlight: bool = False,
    appear: float = 1.0,
) -> None:
    x0, y0, x1, y1 = [c * SCALE for c in box]
    # paper
    rr(draw, (x0, y0, x1, y1), 12, fill=NOTE_PAPER)
    # yellow rule
    draw.rectangle((x0, y0, x1, y0 + 8 * SCALE), fill=NOTE_RULE)
    # clip the rule to rounded top by redrawing corners... skip, looks like a sticky tab

    if appear <= 0:
        draw.text(
            (x0 + 16 * SCALE, y0 + 40 * SCALE),
            "No notes yet",
            font=fonts["body_sm"],
            fill=(168, 162, 158),
        )
        return

    # fade-in by blending ink toward paper
    def fade(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
        return tuple(int(c * appear + NOTE_PAPER[i] * (1 - appear)) for i, c in enumerate(rgb))

    ink = fade(NOTE_INK)
    title_c = fade(NOTE_HEAD)
    draw.text((x0 + 16 * SCALE, y0 + 20 * SCALE), title, font=fonts["note_title"], fill=title_c)

    body_fnt = fonts["note_body"]
    lines = wrap(draw, body, body_fnt, (x1 - x0) - 32 * SCALE)
    ty = y0 + 52 * SCALE
    bbox = draw.textbbox((0, 0), "Ag", font=body_fnt)
    line_h = bbox[3] - bbox[1] + 6 * SCALE

    if highlight and appear > 0.8:
        hw = (x1 - x0) - 24 * SCALE
        hh = line_h * len(lines) + 8 * SCALE
        rr(
            draw,
            (x0 + 12 * SCALE, ty - 6 * SCALE, x0 + 12 * SCALE + hw, ty - 6 * SCALE + hh),
            6,
            fill=(237, 233, 254),
        )

    for line in lines:
        draw.text((x0 + 16 * SCALE, ty), line, font=body_fnt, fill=ink)
        ty += line_h

    folder = fade((120, 113, 108))
    draw.text(
        (x0 + 16 * SCALE, y1 - 28 * SCALE),
        "Folder · Member Berries",
        font=fonts["chip"],
        fill=folder,
    )


def scene(state: dict) -> Image.Image:
    """Render one frame from a high-level scene dict."""
    fonts = scene.fonts  # type: ignore[attr-defined]
    canvas = Image.new("RGB", (W * SCALE, H * SCALE), BG)
    draw = ImageDraw.Draw(canvas)

    # outer caption
    draw.text(
        (28 * SCALE, 16 * SCALE),
        state.get("kicker", "Scripted demo  ·  not a live Mac recording"),
        font=fonts["chip"],
        fill=DIM,
    )

    chat_box = (20, 40, 600, 500)
    notes_box = (620, 40, 940, 500)
    chat_inner_top = draw_window_chrome(draw, chat_box, state["chat_title"], fonts)
    draw_window_chrome(draw, notes_box, "Notes.app  ·  on this Mac", fonts)

    # session chip inside chat
    chip = state.get("chip", "")
    y = 40 + chat_inner_top + 12
    if chip:
        fnt = fonts["chip"]
        tw = draw.textlength(chip, font=fnt)
        x0 = 36 * SCALE
        y0 = y * SCALE
        rr(draw, (x0, y0, x0 + tw + 20 * SCALE, y0 + 22 * SCALE), 11, fill=(30, 41, 59), outline=BERRY, width=1)
        draw.text((x0 + 10 * SCALE, y0 + 4 * SCALE), chip, font=fnt, fill=(196, 181, 253))
        y += 34

    # messages
    x = 36
    max_w = 540
    for msg in state.get("messages", []):
        if msg["kind"] == "bubble":
            h = bubble(
                draw,
                (x, y),
                msg["who"],
                msg["text"],
                fonts,
                max_w,
                reveal=msg.get("reveal", 1.0),
            )
            y += h
        elif msg["kind"] == "pill":
            op = msg.get("opacity", 1.0)
            if op > 0.05:
                h = pill(draw, (x, y), msg["text"], fonts, opacity=op)
                y += h

    # notes body
    paper = (636, 92, 924, 470)
    notes_panel(
        draw,
        paper,
        fonts,
        title=state.get("note_title", ""),
        body=state.get("note_body", ""),
        highlight=state.get("note_highlight", False),
        appear=state.get("note_appear", 0.0),
    )
    if state.get("note_appear", 0.0) <= 0.02:
        # empty state already drawn inside notes_panel when appear==0
        pass

    # footer
    draw.text(
        (28 * SCALE, 512 * SCALE),
        "Member Berries MCP  ·  notes.create then notes.search  ·  data stays on your Mac",
        font=fonts["footer"],
        fill=DIM,
    )

    return canvas.resize((W, H), Image.Resampling.LANCZOS)


scene.fonts = load_fonts()  # type: ignore[attr-defined]


USER_1 = "Save this in Notes: dentist prefers Tuesday mornings."
AI_1 = "Saved. I'll 'member that next time."
USER_2 = "When should I book the dentist?"
AI_2 = "'Member — Tuesday mornings. I'll keep Fridays free."
NOTE_TITLE = "Dentist preference"
NOTE_BODY = "Prefers Tuesday mornings. Avoid Fridays."


def frames() -> list[tuple[Image.Image, int]]:
    """Return (image, duration_ms) pairs."""
    out: list[tuple[Image.Image, int]] = []

    def add(state: dict, ms: int) -> None:
        out.append((scene(state), ms))

    # 1. empty
    base_s1 = {
        "chat_title": "Chat  ·  Member Berries connected",
        "chip": "Session 1  ·  tonight",
        "messages": [],
        "note_appear": 0.0,
        "kicker": "Scripted demo  ·  two sessions, one Apple Note",
    }
    add(base_s1, 600)

    # 2. type user 1
    for i in range(1, 9):
        st = dict(base_s1)
        st["messages"] = [{"kind": "bubble", "who": "you", "text": USER_1, "reveal": i / 8}]
        add(st, 90 if i < 8 else 350)

    # 3. tool pill fades in
    for op in (0.35, 0.7, 1.0):
        st = dict(base_s1)
        st["messages"] = [
            {"kind": "bubble", "who": "you", "text": USER_1, "reveal": 1.0},
            {"kind": "pill", "text": "notes.create  →  Apple Notes", "opacity": op},
        ]
        add(st, 120)
    st = dict(base_s1)
    st["messages"] = [
        {"kind": "bubble", "who": "you", "text": USER_1, "reveal": 1.0},
        {"kind": "pill", "text": "notes.create  →  Apple Notes", "opacity": 1.0},
    ]
    add(st, 280)

    # 4. note appears
    for a in (0.25, 0.55, 1.0):
        st = dict(base_s1)
        st["messages"] = [
            {"kind": "bubble", "who": "you", "text": USER_1, "reveal": 1.0},
            {"kind": "pill", "text": "notes.create  →  Apple Notes", "opacity": 1.0},
        ]
        st["note_title"] = NOTE_TITLE
        st["note_body"] = NOTE_BODY
        st["note_appear"] = a
        add(st, 140)
    hold_note = dict(st)
    add(hold_note, 300)

    # 5. assistant reply
    for i in range(1, 7):
        st = dict(hold_note)
        st["messages"] = [
            {"kind": "bubble", "who": "you", "text": USER_1, "reveal": 1.0},
            {"kind": "pill", "text": "notes.create  →  Apple Notes", "opacity": 1.0},
            {"kind": "bubble", "who": "ai", "text": AI_1, "reveal": i / 6},
        ]
        add(st, 90 if i < 6 else 1100)

    # 6. session wipe
    for t in (0.3, 0.7, 1.0):
        st = {
            "chat_title": "Chat  ·  Member Berries connected",
            "chip": "Session 2  ·  next morning",
            "messages": [],
            "note_title": NOTE_TITLE,
            "note_body": NOTE_BODY,
            "note_appear": 1.0,
            "kicker": "New chat  ·  the note is still on this Mac",
        }
        add(st, 180)

    s2 = {
        "chat_title": "Chat  ·  Member Berries connected",
        "chip": "Session 2  ·  next morning",
        "messages": [],
        "note_title": NOTE_TITLE,
        "note_body": NOTE_BODY,
        "note_appear": 1.0,
        "kicker": "New chat  ·  the note is still on this Mac",
    }
    add(s2, 400)

    # 7. type user 2
    for i in range(1, 8):
        st = dict(s2)
        st["messages"] = [{"kind": "bubble", "who": "you", "text": USER_2, "reveal": i / 7}]
        add(st, 90 if i < 7 else 320)

    # 8. search pill + highlight
    for op in (0.4, 1.0):
        st = dict(s2)
        st["messages"] = [
            {"kind": "bubble", "who": "you", "text": USER_2, "reveal": 1.0},
            {"kind": "pill", "text": "notes.search  →  “Tuesday mornings”", "opacity": op},
        ]
        st["note_highlight"] = op > 0.8
        add(st, 160)

    search_hold = dict(st)
    search_hold["note_highlight"] = True
    add(search_hold, 280)

    # 9. assistant recall
    for i in range(1, 8):
        st = dict(search_hold)
        st["messages"] = [
            {"kind": "bubble", "who": "you", "text": USER_2, "reveal": 1.0},
            {"kind": "pill", "text": "notes.search  →  “Tuesday mornings”", "opacity": 1.0},
            {"kind": "bubble", "who": "ai", "text": AI_2, "reveal": i / 7},
        ]
        st["note_highlight"] = True
        add(st, 90 if i < 7 else 1800)

    return out


def save_gif(pairs: list[tuple[Image.Image, int]], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        durations = []
        for i, (im, ms) in enumerate(pairs):
            im.save(tmp_path / f"f{i:03d}.png")
            durations.append(ms)

        # concat demuxer with per-frame durations
        list_file = tmp_path / "frames.txt"
        lines = []
        for i, ms in enumerate(durations):
            lines.append(f"file 'f{i:03d}.png'")
            lines.append(f"duration {ms / 1000:.3f}")
        # last frame must be repeated for concat demuxer
        lines.append(f"file 'f{len(durations) - 1:03d}.png'")
        list_file.write_text("\n".join(lines) + "\n")

        palette = tmp_path / "palette.png"
        gif_raw = tmp_path / "raw.gif"
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-vf",
                "palettegen=max_colors=96:stats_mode=diff",
                str(palette),
            ],
            cwd=tmp_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-i",
                str(palette),
                "-lavfi",
                "paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
                "-loop",
                "0",
                str(gif_raw),
            ],
            cwd=tmp_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        # copy into dest; try gifsicle if present
        data = gif_raw.read_bytes()
        dest.write_bytes(data)


def main() -> None:
    pairs = frames()
    save_gif(pairs, OUT)
    size = OUT.stat().st_size
    print(f"wrote {OUT} ({size / 1024:.1f} KB, {len(pairs)} keyframes)")
    if size > 2 * 1024 * 1024:
        raise SystemExit(f"GIF too large: {size} bytes (limit 2 MB)")


if __name__ == "__main__":
    main()
