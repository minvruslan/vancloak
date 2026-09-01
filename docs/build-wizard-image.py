#!/usr/bin/env python3
"""Compose docs/images/wizard-{1..4}.png into one iPhone mockup strip."""

import subprocess
from pathlib import Path
from PIL import Image

# --- knobs ---------------------------------------------------------------
SCREEN_WIDTH = 300          # css px of the phone screen
COLUMNS = 4                 # 4 = one row, 2 = a 2x2 grid
GAP = 56                    # space between phones
ROW_GAP = 64                # space between rows
MARGIN_X = 100              # canvas padding left and right
MARGIN_Y = 74               # canvas padding top and bottom
CLOCK = "12:30"
DOMAIN = "vancloak.com"
TABS = "12"
# very dark tints of the brand blue oklch(0.527 0.245 264) = #1b55f5 from the app icon
CORNER_RADIUS = 30       # rounded corners of the whole card
BACKGROUND = "linear-gradient(155deg, #081b4d 0%, #020925 45%, #000105 100%)"
CHROME = "#212226"
CHROME_BOTTOM = "#232429"
PILL = "#32343a"
BEZEL = "linear-gradient(150deg, #45454e, #1b1b20 24%, #17171b 66%, #3b3b44)"
# -------------------------------------------------------------------------

# iPhone 15 Pro portrait, points
DEVICE_WIDTH = 393
DEVICE_HEIGHT = 852
TOP_CHROME = 109.2
BOTTOM_CHROME = 77.9
PILL_TOP = 62.6
PILL_HEIGHT = 36.7
PILL_INSET = 10
ISLAND_WIDTH = 122
ISLAND_HEIGHT = 36.5
ISLAND_TOP = 11
STATUS_CENTER = 29

ROOT = Path(__file__).resolve().parent
IMAGES = ROOT / "images"
BUILD = IMAGES / "build"
SOURCES = [IMAGES / f"wizard-{n}.png" for n in range(1, 5)]


def longest_constant_band(image):
    """Rows that repeat the row above — cutting there is invisible."""
    width, height = image.size
    pixels = image.load()
    best = (0, 0)
    run = 0
    start = 0
    for y in range(1, height):
        same = True
        for x in range(0, width, 3):
            a, b = pixels[x, y], pixels[x, y - 1]
            if abs(a[0] - b[0]) > 2 or abs(a[1] - b[1]) > 2 or abs(a[2] - b[2]) > 2:
                same = False
                break
        if same:
            if run == 0:
                start = y
            run += 1
            if run > best[0]:
                best = (run, start)
        else:
            run = 0
    return best


def main():
    images = [Image.open(path).convert("RGB") for path in SOURCES]
    source_width, source_height = images[0].size
    scale = SCREEN_WIDTH / DEVICE_WIDTH

    # how much of the screenshot must go so the phone keeps real proportions
    wanted = source_height - (DEVICE_HEIGHT - TOP_CHROME - BOTTOM_CHROME) / DEVICE_WIDTH * source_width
    bands = [longest_constant_band(image) for image in images]
    cut = int(min(wanted, min(run for run, _ in bands) - 12))

    BUILD.mkdir(parents=True, exist_ok=True)
    for image, (_, start), path in zip(images, bands, SOURCES):
        top = image.crop((0, 0, source_width, start))
        bottom = image.crop((0, start + cut, source_width, source_height))
        cropped = Image.new("RGB", (source_width, source_height - cut))
        cropped.paste(top, (0, 0))
        cropped.paste(bottom, (0, top.height))
        cropped.save(BUILD / path.name)

    content_height = (source_height - cut) / source_width * SCREEN_WIDTH
    screen_height = TOP_CHROME * scale + content_height + BOTTOM_CHROME * scale
    phone_width = SCREEN_WIDTH + 20
    phone_height = screen_height + 20
    rows = -(-4 // COLUMNS)
    canvas_width = round(COLUMNS * phone_width + (COLUMNS - 1) * GAP + 2 * MARGIN_X)
    canvas_height = round(rows * phone_height + (rows - 1) * ROW_GAP + 2 * MARGIN_Y)

    def px(points):
        return round(points * scale, 2)

    icons = (
        '<svg class="bars" viewBox="0 0 17 11" fill="currentColor">'
        '<rect x="0" y="7.5" width="3" height="3.5" rx="1"/>'
        '<rect x="4.6" y="5.5" width="3" height="5.5" rx="1"/>'
        '<rect x="9.2" y="3" width="3" height="8" rx="1"/>'
        '<rect x="13.8" y="0" width="3" height="11" rx="1"/></svg>'
        '<svg class="wifi" viewBox="0 0 16 11" fill="none" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round">'
        '<path d="M1 3.6a10.5 10.5 0 0 1 14 0"/><path d="M3.6 6.4a6.8 6.8 0 0 1 8.8 0"/>'
        '<circle cx="8" cy="9.4" r="1.1" fill="currentColor" stroke="none"/></svg>'
        '<svg class="battery" viewBox="0 0 25 12" fill="none">'
        '<rect x="0.6" y="0.6" width="21" height="10.8" rx="3.2" stroke="currentColor" '
        'stroke-opacity="0.45" stroke-width="1.2"/>'
        '<rect x="2.2" y="2.2" width="17.8" height="7.6" rx="2" fill="currentColor"/>'
        '<path d="M23.2 4.2v3.6c1-.4 1.4-1 1.4-1.8s-.4-1.4-1.4-1.8z" fill="currentColor" '
        'fill-opacity="0.45"/></svg>'
    )

    sparkle = (
        '<svg class="sparkle" viewBox="0 0 24 24" fill="currentColor">'
        '<path d="M12 2.5 13.7 9 20 10.8 13.7 12.6 12 19 10.3 12.6 4 10.8 10.3 9z"/>'
        '<path d="M18.6 15.4 19.4 18l2.6.8-2.6.8-.8 2.6-.8-2.6L15.2 19l2.6-.8z"/></svg>'
    )
    share = (
        '<svg class="share" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M12 3v11"/><path d="M8.5 6.5 12 3l3.5 3.5"/>'
        '<path d="M6 11.5H4.8v8.2h14.4v-8.2H18"/></svg>'
    )
    toolbar = (
        '<svg class="nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M19 12H5"/><path d="M11 6 5 12l6 6"/></svg>'
        '<svg class="nav dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>'
        '<span class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/>'
        '</svg></span>'
        f'<span class="tabs">{TABS}</span>'
        '<svg class="nav" viewBox="0 0 24 24" fill="currentColor">'
        '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/>'
        '<circle cx="19" cy="12" r="2"/></svg>'
    )

    phones = "\n".join(
        f'''    <figure class="phone">
      <div class="screen">
        <div class="chrome">
          <div class="status"><span class="clock">{CLOCK}</span><span class="icons">{icons}</span></div>
          <div class="island"></div>
          <div class="pill">{sparkle}<span class="domain">{DOMAIN}</span>{share}</div>
        </div>
        <img src="build/wizard-{n}.png" alt="">
        <div class="toolbar">{toolbar}</div>
      </div>
    </figure>'''
        for n in range(1, 5)
    )

    html = f'''<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>VanCloak wizard</title>
<style>
  html, body {{
    margin: 0;
    width: {canvas_width}px;
    height: {canvas_height}px;
    overflow: hidden;
    font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  }}

  .stage {{
    width: {canvas_width}px;
    height: {canvas_height}px;
    display: grid;
    grid-template-columns: repeat({COLUMNS}, auto);
    align-content: center;
    justify-content: center;
    column-gap: {GAP}px;
    row-gap: {ROW_GAP}px;
    background: {BACKGROUND};
    border-radius: {CORNER_RADIUS}px;
  }}

  .phone {{
    flex: none;
    margin: 0;
    padding: 10px;
    border-radius: 46px;
    background: {BEZEL};
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 0 0 1px rgba(0, 0, 0, 0.6),
      0 30px 60px -20px rgba(0, 0, 0, 0.65);
  }}

  .screen {{
    position: relative;
    width: {SCREEN_WIDTH}px;
    border-radius: 37px;
    overflow: hidden;
    background: #181818;
  }}

  .chrome {{
    position: relative;
    height: {px(TOP_CHROME)}px;
    background: {CHROME};
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
  }}

  .status {{
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: {px(STATUS_CENTER * 2)}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 {px(22)}px 0 {px(30)}px;
    color: #fff;
  }}

  .clock {{ font-size: {px(17)}px; font-weight: 600; letter-spacing: 0.2px; }}

  .icons {{ display: flex; align-items: center; gap: {px(6)}px; }}
  .icons .bars {{ width: {px(18)}px; }}
  .icons .wifi {{ width: {px(17)}px; }}
  .icons .battery {{ width: {px(27)}px; }}

  .island {{
    position: absolute;
    top: {px(ISLAND_TOP)}px;
    left: 50%;
    transform: translateX(-50%);
    width: {px(ISLAND_WIDTH)}px;
    height: {px(ISLAND_HEIGHT)}px;
    border-radius: {px(ISLAND_HEIGHT / 2)}px;
    background: #000;
  }}

  .island::after {{
    content: "";
    position: absolute;
    top: 50%;
    right: {px(9)}px;
    transform: translateY(-50%);
    width: {px(9)}px;
    height: {px(9)}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
  }}

  .pill {{
    position: absolute;
    top: {px(PILL_TOP)}px;
    left: {px(PILL_INSET)}px;
    right: {px(PILL_INSET)}px;
    height: {px(PILL_HEIGHT)}px;
    border-radius: {px(PILL_HEIGHT / 2)}px;
    background: {PILL};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 {px(12)}px;
    color: #fff;
  }}

  .pill .domain {{
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    font-size: {px(17)}px;
    letter-spacing: 0.1px;
  }}

  .pill .sparkle {{ width: {px(20)}px; position: relative; }}
  .pill .share {{ width: {px(19)}px; position: relative; }}

  .screen img {{ display: block; width: 100%; height: auto; }}

  .toolbar {{
    height: {px(BOTTOM_CHROME)}px;
    background: {CHROME_BOTTOM};
    box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 {px(26)}px;
    padding-bottom: {px(16)}px;
    color: #fff;
  }}

  .toolbar .nav {{ width: {px(23)}px; }}
  .toolbar .dim {{ color: rgba(255, 255, 255, 0.32); }}

  .toolbar .plus {{
    width: {px(34)}px;
    height: {px(34)}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .toolbar .plus svg {{ width: {px(19)}px; }}

  .toolbar .tabs {{
    width: {px(24)}px;
    height: {px(24)}px;
    border: {max(1, round(2 * scale))}px solid #fff;
    border-radius: {px(7)}px;
    font-size: {px(13)}px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
</style>
</head>
<body>
  <div class="stage">
{phones}
  </div>
</body>
</html>
'''

    page = IMAGES / "compose.html"
    page.write_text(html)

    output = IMAGES / "wizard.png"
    subprocess.run(
        [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=2",
            "--default-background-color=00000000",
            f"--window-size={canvas_width},{canvas_height}",
            f"--screenshot={output}",
            f"file://{page}",
        ],
        check=True,
        capture_output=True,
    )

    print(f"cut {cut}px from each screenshot")
    print(f"canvas {canvas_width}x{canvas_height} -> {output} at 2x")


if __name__ == "__main__":
    main()
