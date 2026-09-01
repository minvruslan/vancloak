#!/usr/bin/env python3
"""Generate docs/images/architecture.svg and architecture-dark.svg."""

from pathlib import Path

FONT = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

LIGHT = {
    "text": "#333333", "sub": "#6b6558", "line": "#7a6c52", "faint": "#d6cdb8",
    "app": ("#f4efe4", "#7a6c52"), "store": ("#fff5ad", "#e4db95"),
    "ops": ("#fff5ad", "#e4db95"), "who": ("#fff5ad", "#e4db95"),
    "node": ("#f4efe4", "#7a6c52"), "band": ("#fbf8f2", "#c3b79c"),
    "groupA": ("#fbf8f2", "#c3b79c"), "groupB": ("#fbf8f2", "#c3b79c"),
    "ink2": "#333333", "sub2": "#6b6558",
    "accent": "#7a6c52", "uid": "l", "r_box": 4, "r_group": 8, "r_pill": 4,
}

DARK = {
    "text": "#e6edf3", "sub": "#9aa4b8", "line": "#9aa4b8", "faint": "#3a424f",
    "app": ("#262b34", "#9aa4b8"), "store": ("#fff5ad", "#f9f7e6"),
    "ops": ("#fff5ad", "#f9f7e6"), "who": ("#fff5ad", "#f9f7e6"),
    "node": ("#262b34", "#9aa4b8"), "band": ("#1b1f26", "#4d5666"),
    "groupA": ("#1b1f26", "#4d5666"), "groupB": ("#1b1f26", "#4d5666"),
    "ink2": "#333333", "sub2": "#6b6558",
    "accent": "#9aa4b8", "uid": "d", "r_box": 4, "r_group": 8, "r_pill": 4,
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Draw:
    def __init__(self, theme, width, height):
        self.t = theme
        self.font = theme.get("font", FONT)
        self.uid = theme.get("uid", "a")
        self.view = None
        self.w = width
        self.h = height
        self.parts = []

    def rect(self, kind, x, y, w, h, r=12, dash=None):
        fill, stroke = self.t[kind]
        if self.t.get("sharp"):
            r = 0
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="1.5"{d}/>'
        )

    def text(self, x, y, s, size=15.5, weight=600, color="text", anchor="start", font=FONT):
        self.parts.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{font}" '
            f'font-size="{size}" font-weight="{weight}" fill="{self.t[color]}">{esc(s)}</text>'
        )

    def kicker(self, x, y, s, anchor="start"):
        self.parts.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{self.font}" '
            f'font-size="10.5" font-weight="700" letter-spacing="1.4" '
            f'fill="{self.t["sub"]}">{esc(s.upper())}</text>'
        )

    def line(self, points, both=False, dashed=False, color="line"):
        pts = " ".join(f"{x},{y}" for x, y in points)
        d = ' stroke-dasharray="5 4"' if dashed else ""
        s = f' marker-start="url(#back-{self.uid})"' if both else ""
        self.parts.append(
            f'<polyline points="{pts}" fill="none" stroke="{self.t[color]}" stroke-width="1.7" '
            f'stroke-linejoin="round" marker-end="url(#head-{self.uid})"{s}{d}/>'
        )

    def vnote(self, x, y, s):
        self.parts.append(
            f'<text x="{x}" y="{y}" text-anchor="middle" transform="rotate(-90 {x} {y})" '
            f'font-family="{self.font}" font-size="12" fill="{self.t["sub"]}">{esc(s)}</text>'
        )

    def note(self, x, y, s, anchor="middle"):
        self.parts.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{self.font}" '
            f'font-size="12" fill="{self.t["sub"]}">{esc(s)}</text>'
        )

    def svg(self, aria):
        head = self.t["line"]
        x0, y0, vw, vh = self.view or (0, 0, self.w, self.h)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {vw} {vh}" '
            f'width="{vw}" height="{vh}" role="img" aria-label="{esc(aria)}">'
            f'<defs>'
            f'<marker id="head-{self.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
            f'markerHeight="6.5" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{head}"/></marker>'
            f'<marker id="back-{self.uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
            f'markerHeight="6.5" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{head}"/></marker>'
            f'</defs>' + "".join(self.parts) + "</svg>"
        )


def architecture(theme):
    """Nested containers, equal column widths."""
    d = Draw(theme, 1085, 1000)

    r_box = theme.get("r_box", 12)
    r_group = theme.get("r_group", 18)
    r_pill = theme.get("r_pill", 10)

    def card(kind, x, y, w, h, title, tech=None):
        d.rect(kind, x, y, w, h, r_box)
        cx = x + w / 2
        ink = "ink2" if kind in ("ops", "store", "who") else "text"
        sub = "sub2" if kind in ("ops", "store", "who") else "sub"
        if tech:
            d.text(cx, y + h / 2 - 3, title, 15.5, 600, ink, "middle")
            d.text(cx, y + h / 2 + 16, tech, 12, 400, sub, "middle")
        else:
            d.text(cx, y + h / 2 + 6, title, 15.5, 600, ink, "middle")

    card("who", 575, 30, 170, 64, "Browser")

    d.rect("groupA", 275, 150, 770, 548, r_group)
    d.text(301, 182, "Web app", 14, 700)
    card("ops", 306, 206, 708, 68, "Caddy", "TLS, Reverse proxy")
    card("app", 306, 334, 324, 68, "Frontend")
    card("app", 690, 334, 324, 68, "Backend API")
    card("store", 690, 462, 153, 68, "PostgreSQL")
    card("store", 861, 462, 153, 68, "Redis")
    card("app", 690, 590, 324, 68, "Backend worker", "For long tasks")
    card("app", 306, 590, 324, 68, "RemoteServer", "Abstraction over server operations")

    d.rect("groupB", 275, 746, 770, 210, r_group)
    d.text(301, 778, "VPN servers", 14, 700)
    for x, name in ((306, "Amsterdam"), (690, "Frankfurt")):
        d.rect("node", x, 798, 324, 138, r_box)
        d.text(x + 162, 832, name, 15.5, 600, "text", "middle")
        d.rect("ops", x + 20, 854, 284, 56, r_pill)
        d.text(x + 162, 887, "AmneziaWG", 13, 500, "ink2", "middle")

    for dot in (652.5, 660, 667.5):
        d.parts.append(f'<circle cx="{dot}" cy="882" r="1.8" fill="{theme["sub"]}"/>')

    d.line([(660, 94), (660, 206)], both=True)
    d.line([(468, 274), (468, 334)], both=True)
    d.line([(852, 274), (852, 334)], both=True)
    d.line([(630, 368), (690, 368)], both=True)
    d.note(660, 356, "oRPC", "middle")
    d.line([(766, 402), (766, 462)], both=True)
    d.line([(937, 402), (937, 462)])
    d.note(949, 436, "BullMQ", "start")
    d.line([(937, 530), (937, 590)])
    d.note(949, 564, "BullMQ", "start")
    d.line([(766, 590), (766, 530)], both=True)
    d.line([(690, 624), (630, 624)])
    d.line([(730, 402), (730, 432), (468, 432), (468, 590)])
    d.line([(468, 658), (468, 742)])
    d.view = (255, 10, 810, 968)
    return d.svg("Nested containers: the browser, the web app and the VPN servers")


if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "images"
    out.mkdir(parents=True, exist_ok=True)
    for theme, name in ((LIGHT, "architecture.svg"), (DARK, "architecture-dark.svg")):
        path = out / name
        path.write_text(architecture(theme))
        print(f"wrote {path}")
