// @ts-nocheck

"use client";

import { STYLE_TILE_GRADIENTS } from "@/features/quiz/data/constants";

function SceneGlyph({ styleKey, ink }: any) {
  const s: any = {
    stroke: ink,
    fill: "none",
    strokeWidth: 1.4,
    strokeLinecap: "square",
  };
  const scenes = {
    minimal: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" {...s} strokeWidth="2" />
        <rect
          x="30"
          y="46"
          width="52"
          height="12"
          rx="1"
          {...s}
          strokeWidth="2"
        />
        <rect
          x="34"
          y="38"
          width="44"
          height="8"
          rx="1"
          {...s}
          strokeWidth="2"
        />
        <line x1="36" y1="58" x2="36" y2="64" {...s} strokeWidth="1.5" />
        <line x1="76" y1="58" x2="76" y2="64" {...s} strokeWidth="1.5" />
        <line x1="96" y1="24" x2="96" y2="44" {...s} strokeWidth="1.5" />
        <circle cx="96" cy="20" r="3" {...s} strokeWidth="1.5" />
      </>
    ),
    maximalist: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" {...s} strokeWidth="2" />
        <rect x="16" y="18" width="18" height="14" {...s} strokeWidth="1.5" />
        <rect x="40" y="12" width="14" height="18" {...s} strokeWidth="1.5" />
        <rect x="24" y="36" width="20" height="16" {...s} strokeWidth="1.5" />
        <rect
          x="52"
          y="34"
          width="34"
          height="26"
          rx="2"
          {...s}
          strokeWidth="2"
        />
        <path
          d="M 94 60 L 94 44 M 90 48 Q 94 40 98 48 M 88 54 Q 94 44 100 54"
          {...s}
          strokeWidth="1.5"
        />
        <line x1="58" y1="40" x2="80" y2="40" {...s} strokeWidth="1" />
      </>
    ),
    organic: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" {...s} strokeWidth="2" />
        <path
          d="M 24 60 L 24 30 A 18 18 0 0 1 60 30 L 60 60"
          {...s}
          strokeWidth="2"
        />
        <path
          d="M 84 60 L 84 48 M 78 52 Q 84 42 90 52 M 76 58 Q 84 46 92 58"
          {...s}
          strokeWidth="1.5"
        />
        <circle cx="42" cy="50" r="7" {...s} strokeWidth="1.5" />
      </>
    ),
    industrial: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" {...s} strokeWidth="2" />
        <line x1="12" y1="14" x2="108" y2="14" {...s} strokeWidth="2.5" />
        <line x1="60" y1="14" x2="60" y2="30" {...s} strokeWidth="1.5" />
        <path d="M 52 30 L 68 30 L 64 38 L 56 38 Z" {...s} strokeWidth="1.5" />
        <line x1="88" y1="60" x2="88" y2="38" {...s} strokeWidth="2" />
        <circle cx="88" cy="34" r="5" {...s} strokeWidth="1.5" />
        <line x1="24" y1="60" x2="24" y2="44" {...s} strokeWidth="2" />
        <line x1="18" y1="44" x2="30" y2="44" {...s} strokeWidth="2" />
      </>
    ),
    artisan: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" {...s} strokeWidth="2" />
        <path
          d="M 30 60 L 27 42 Q 34 34 41 42 L 38 60 Z"
          {...s}
          strokeWidth="1.8"
        />
        <path
          d="M 56 60 L 54 48 Q 60 38 66 48 L 64 60 Z"
          {...s}
          strokeWidth="1.8"
        />
        <path
          d="M 82 60 L 80 50 L 84 36 L 90 50 L 88 60 Z"
          {...s}
          strokeWidth="1.8"
        />
        <line x1="84" y1="36" x2="86" y2="30" {...s} strokeWidth="1.5" />
      </>
    ),
  };
  return scenes[styleKey] ?? scenes.minimal;
}

export function ImageTile({ styleKey, seed }: any) {
  const g = STYLE_TILE_GRADIENTS[styleKey] ?? STYLE_TILE_GRADIENTS.minimal;
  const ink = g[0]; /* reuse each style's deepest tone as the drawing ink */
  const drift = ((seed * 13) % 10) - 5; /* slight per-tile composition shift */
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: hexA(g[2], 0.28),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 120 72"
        style={{
          width: "78%",
          maxWidth: "150px",
          transform: `translateX(${drift}px)`,
          opacity: 0.9,
        }}
      >
        <SceneGlyph styleKey={styleKey} ink={ink} />
      </svg>
    </div>
  );
}
