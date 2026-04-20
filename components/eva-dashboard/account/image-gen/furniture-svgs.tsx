"use client";

import { useId } from "react";
import type { EnvPreset } from "./constants";
import { ENVIRONMENT_TINT } from "./constants";

/** Solo viewer — decorative chair (mock mesh). */
export function HeroChairSvg({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const mesh = `${uid}-mesh`;
  const wood = `${uid}-wood`;
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden>
      <defs>
        <linearGradient id={mesh} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5ede0" />
          <stop offset="100%" stopColor="#9a8770" />
        </linearGradient>
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a06844" />
          <stop offset="100%" stopColor="#3e1f0e" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="355" rx="115" ry="10" fill="rgba(60,40,25,0.2)" />
      <path
        d="M100 120 Q100 60, 160 60 L280 60 Q340 60, 340 120 L340 235 L100 235 Z"
        fill={`url(#${mesh})`}
        stroke="#6b5545"
        strokeWidth="1.5"
      />
      <rect
        x="112"
        y="210"
        width="216"
        height="68"
        rx="24"
        fill={`url(#${mesh})`}
        stroke="#6b5545"
        strokeWidth="1.5"
      />
      <line
        x1="132"
        y1="278"
        x2="116"
        y2="352"
        stroke={`url(#${wood})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <line
        x1="304"
        y1="278"
        x2="320"
        y2="352"
        stroke={`url(#${wood})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M112 210 L88 130"
        stroke={`url(#${wood})`}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M328 210 L352 130"
        stroke={`url(#${wood})`}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function RoomPreviewSvg({
  env,
  className,
}: {
  env: EnvPreset;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const tint = ENVIRONMENT_TINT[env];
  const f = `${uid}-floor`;
  const wb = `${uid}-wall-back`;
  const ws = `${uid}-wall-side`;
  const cc = `${uid}-chair-cloth`;
  const cw = `${uid}-chair-wood`;
  const tw = `${uid}-table-wood`;

  return (
    <svg
      className={className}
      viewBox="0 0 600 420"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={f} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint.floorA} />
          <stop offset="100%" stopColor={tint.floorB} />
        </linearGradient>
        <linearGradient id={wb} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint.wall} />
          <stop offset="100%" stopColor="#e0d4bc" />
        </linearGradient>
        <linearGradient id={ws} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e8dcc5" />
          <stop offset="100%" stopColor="#d4c5a8" />
        </linearGradient>
        <linearGradient id={cc} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5ede0" />
          <stop offset="100%" stopColor="#9a8770" />
        </linearGradient>
        <linearGradient id={cw} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a06844" />
          <stop offset="100%" stopColor="#3e1f0e" />
        </linearGradient>
        <linearGradient id={tw} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5a36" />
          <stop offset="100%" stopColor="#4a2e18" />
        </linearGradient>
      </defs>

      <polygon
        points="80,60 80,340 200,390 200,110"
        fill={`url(#${ws})`}
        stroke="#a89778"
        strokeWidth="1"
      />
      <polygon
        points="200,110 200,390 480,390 480,110"
        fill={`url(#${wb})`}
        stroke="#a89778"
        strokeWidth="1"
      />
      <polygon
        points="480,110 480,390 560,340 560,60"
        fill={`url(#${ws})`}
        stroke="#a89778"
        strokeWidth="1"
        opacity="0.7"
      />
      <polygon
        points="200,390 480,390 580,340 100,340"
        fill={`url(#${f})`}
        stroke="#8a7260"
        strokeWidth="1"
      />

      <g stroke="rgba(60,40,25,0.15)" strokeWidth="0.5" fill="none">
        <line x1="255" y1="390" x2="295" y2="340" />
        <line x1="310" y1="390" x2="365" y2="340" />
        <line x1="365" y1="390" x2="435" y2="340" />
        <line x1="420" y1="390" x2="505" y2="340" />
      </g>

      <g transform="translate(310, 295)">
        <polygon
          points="0,0 80,0 92,-16 -12,-16"
          fill={`url(#${tw})`}
          stroke="#3e1f0e"
          strokeWidth="1"
        />
        <rect x="0" y="0" width="80" height="6" fill="#3e1f0e" />
        <line x1="5" y1="6" x2="3" y2="28" stroke="#3e1f0e" strokeWidth="2" />
        <line x1="75" y1="6" x2="77" y2="28" stroke="#3e1f0e" strokeWidth="2" />
      </g>

      <g transform="translate(220, 265)">
        <ellipse cx="45" cy="62" rx="40" ry="5" fill="rgba(0,0,0,0.18)" />
        <path
          d="M12 10 Q12 -12, 32 -12 L62 -12 Q82 -12, 82 10 L82 42 L12 42 Z"
          fill={`url(#${cc})`}
          stroke="#6b5545"
          strokeWidth="1"
        />
        <rect
          x="16"
          y="32"
          width="66"
          height="22"
          rx="8"
          fill={`url(#${cc})`}
          stroke="#6b5545"
          strokeWidth="1"
        />
        <line
          x1="22"
          y1="54"
          x2="14"
          y2="72"
          stroke={`url(#${cw})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="76"
          y1="54"
          x2="84"
          y2="72"
          stroke={`url(#${cw})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M16 32 L8 5"
          stroke={`url(#${cw})`}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M82 32 L90 5"
          stroke={`url(#${cw})`}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <g
        stroke="rgba(212,100,56,0.35)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
        opacity="0.6"
      >
        <ellipse cx="450" cy="290" rx="30" ry="12" />
        <ellipse cx="400" cy="350" rx="32" ry="14" />
      </g>
      <g
        fill="rgba(212,100,56,0.5)"
        className="font-ui text-[8px] font-medium tracking-wide"
      >
        <text x="450" y="293" textAnchor="middle">
          + SOFA
        </text>
        <text x="400" y="353" textAnchor="middle">
          + LAMP
        </text>
      </g>
    </svg>
  );
}

/** Small chair illustration for filmstrip tiles (variant 0–3). */
export function FilmstripThumbSvg({ variant }: { variant: number }) {
  const v = variant % 4;
  const presets = [
    {
      back: "#e8dcc5",
      stroke: "#8a7260",
      seat: "#f0e6d4",
      leg: "#6e4b2e",
    },
    {
      back: "#d4c5a8",
      stroke: "#6b4a2a",
      seat: "#e0d4bc",
      leg: "#3e1f0e",
    },
    {
      back: "#fdf5ec",
      stroke: "#a89778",
      seat: "#f7ede0",
      leg: "#8b5a36",
    },
    {
      back: "#e8d4b8",
      stroke: "#6e4b2e",
      seat: "#d4c5b0",
      leg: "#4a2e18",
    },
  ][v]!;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <path
        d="M55 58 Q55 32, 78 32 L138 32 Q162 32, 162 58 L162 110 L55 110 Z"
        fill={presets.back}
        stroke={presets.stroke}
        strokeWidth="2"
      />
      <rect
        x="58"
        y="100"
        width="100"
        height="28"
        rx="8"
        fill={presets.seat}
        stroke={presets.stroke}
        strokeWidth="2"
      />
      <line
        x1="66"
        y1="128"
        x2="60"
        y2="170"
        stroke={presets.leg}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="148"
        y1="128"
        x2="154"
        y2="170"
        stroke={presets.leg}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
