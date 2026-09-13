import styles from "./auth.module.css";

/** Sized placeholder so loading/Suspense do not collapse then expand the panel. */
export function AuthSuspenseFallback() {
  return (
    <div
      className={`${styles.formWrap} ${styles.formPending}`}
      aria-hidden="true"
    />
  );
}
