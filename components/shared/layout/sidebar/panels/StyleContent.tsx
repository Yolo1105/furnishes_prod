"use client";

import { useState } from "react";
import { Palette, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./StyleContent.module.css";

interface StylePreset {
  id: string;
  name: string;
  palette: string[];
  materials: string[];
  mood: string;
  keywords: string[];
}

const PRESETS: StylePreset[] = [
  {
    id: "japandi",
    name: "Japandi",
    palette: ["#F5EFE7", "#D4C5A9", "#8B7355", "#4A3F35", "#2C2420"],
    materials: ["White Oak", "Linen", "Washi Paper"],
    mood: "Calm · Refined",
    keywords: ["Minimal", "Wabi-sabi", "Natural", "Quiet"],
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    palette: ["#FAFAF8", "#E8E4DE", "#B5AFA6", "#6B6560", "#1A1A1A"],
    materials: ["Birch", "Bouclé", "Wool"],
    mood: "Airy · Functional",
    keywords: ["Light", "Hygge", "Clean", "Warm"],
  },
  {
    id: "warm-modern",
    name: "Warm Modern",
    palette: ["#FCF2E8", "#E8D5B5", "#C4622D", "#6B4226", "#1A1A1A"],
    materials: ["Aniline Leather", "Walnut", "Travertine"],
    mood: "Bold · Textured",
    keywords: ["Rich", "Layered", "Organic", "Earthy"],
  },
];

export function StyleContent() {
  const router = useRouter();
  const [active, setActive] = useState<StylePreset>(PRESETS[0]);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Palette size={14} strokeWidth={1.8} className={styles.headerIcon} />
        <div className={styles.headerMeta}>
          <span className={styles.headerLabel}>Style Direction</span>
          <span className={styles.moodTag}>{active.mood}</span>
        </div>
        <button
          className={styles.editBtn}
          onClick={() => router.push("/style")}
          aria-label="Edit style"
        >
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Direction name */}
      <h2 key={active.id} className={styles.direction}>
        {active.name}
      </h2>

      {/* Palette strip */}
      <div className={styles.paletteSection}>
        <p className={styles.miniLabel}>Colour Palette</p>
        <div className={styles.palette}>
          {active.palette.map((hex, i) => (
            <div
              key={i}
              className={styles.paletteCell}
              style={{ background: hex }}
              title={hex}
            >
              {i === 0 && (
                <span
                  className={styles.paletteLabel}
                  style={{ color: active.palette[3] }}
                >
                  Light
                </span>
              )}
              {i === 4 && (
                <span className={styles.paletteLabel} style={{ color: "#fff" }}>
                  Dark
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div>
        <p className={styles.miniLabel}>Key Materials</p>
        <div className={styles.chips}>
          {active.materials.map((m) => (
            <span key={m} className={styles.chip}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <p className={styles.miniLabel}>Character</p>
        <div className={styles.chips}>
          {active.keywords.map((k) => (
            <span key={k} className={`${styles.chip} ${styles.chipAlt}`}>
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Style preset tiles */}
      <div>
        <p className={styles.miniLabel}>Switch Style</p>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`${styles.preset} ${active.id === p.id ? styles.presetActive : ""}`}
              onClick={() => setActive(p)}
              aria-pressed={active.id === p.id}
            >
              {/* Mini palette strip on each tile */}
              <div className={styles.presetPalette}>
                {p.palette.slice(0, 3).map((hex, i) => (
                  <span key={i} style={{ background: hex }} />
                ))}
              </div>
              <span className={styles.presetName}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button className={styles.fullBtn} onClick={() => router.push("/style")}>
        Open Style Guide <ArrowRight size={12} strokeWidth={2} />
      </button>
    </div>
  );
}
