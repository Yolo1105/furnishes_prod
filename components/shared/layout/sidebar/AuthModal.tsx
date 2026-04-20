"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  mode: "login" | "create";
  onClose: () => void;
}

export function AuthModal({ mode, onClose }: AuthModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on scrim click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  // Prevent scroll lock on body while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const content = (
    <div
      ref={overlayRef}
      className={styles.scrim}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
    >
      <div className={styles.card}>
        {/* Close */}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} strokeWidth={1.8} />
        </button>

        {/* Logo mark */}
        <div className={styles.logoMark} aria-hidden="true">
          F
        </div>

        <h2 className={styles.heading}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className={styles.sub}>
          {mode === "login"
            ? "Sign in to access your saved designs and projects."
            : "Join Furnishes and start planning your perfect space."}
        </p>

        {/* Email input */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </div>

        {/* Password input */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className={styles.input}
            placeholder={
              mode === "login" ? "••••••••" : "Create a strong password"
            }
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </div>

        {/* Submit */}
        <button className={styles.submitBtn}>
          {mode === "login" ? "Sign in" : "Create account"}
        </button>

        {/* Benefits (create only) */}
        {mode === "create" && (
          <ul className={styles.benefits}>
            <li>Save unlimited design projects</li>
            <li>Access AI styling recommendations</li>
            <li>Track your budget in real time</li>
          </ul>
        )}

        {/* Toggle */}
        <p className={styles.toggle}>
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            className={styles.toggleBtn}
            onClick={onClose /* parent rerenders with opposite mode */}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );

  // SSR guard — createPortal requires document
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
