import styles from "./auth.module.css";

/** Quiet fill inside the persistent auth panel. */
export function AuthSuspenseFallback() {
  return <div className={styles.formWrap} aria-hidden="true" />;
}
