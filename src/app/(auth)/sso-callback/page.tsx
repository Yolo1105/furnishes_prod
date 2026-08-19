"use client";

import { useAuth, useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit } from "@/features/auth/AuthSplit";
import { clerkCallbackHref, clerkEnabled } from "@/features/auth/clerk-custom";
import styles from "@/features/auth/auth.module.css";

export default function SsoCallbackPage() {
  return (
    <AuthSplit
      kicker="Sign in"
      title="Welcome back"
      lede="Finishing Google sign-in."
    >
      {clerkEnabled ? (
        <SsoFinish />
      ) : (
        <p className={styles.error} role="status">
          Google sign-in is not configured.
        </p>
      )}
    </AuthSplit>
  );
}

function SsoFinish() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const finishing = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || !isLoaded || finishing.current) return;

    const goApp = () => {
      finishing.current = true;
      window.location.replace(clerkCallbackHref());
    };

    if (isSignedIn) {
      goApp();
      return;
    }

    void (async () => {
      try {
        if (signIn.status === "complete") {
          await signIn.finalize({ navigate: goApp });
          return;
        }
        if (signUp.status === "complete") {
          await signUp.finalize({ navigate: goApp });
          return;
        }
        if (signUp.isTransferable) {
          await signIn.create({ transfer: true });
          if ((signIn.status as string) === "complete") {
            await signIn.finalize({ navigate: goApp });
            return;
          }
        }
        if (signIn.isTransferable) {
          await signUp.create({ transfer: true });
          if ((signUp.status as string) === "complete") {
            await signUp.finalize({ navigate: goApp });
            return;
          }
        }
        const sessionId =
          signIn.existingSession?.sessionId ||
          signUp.existingSession?.sessionId;
        if (sessionId) {
          await clerk.setActive({ session: sessionId, navigate: goApp });
        }
      } catch {
        /* still waiting — the signed-in effect or timeout will finish this */
      }
    })();
  }, [clerk, isLoaded, isSignedIn, signIn, signUp]);

  useEffect(() => {
    if (!isLoaded || isSignedIn || finishing.current) return;
    const timer = window.setTimeout(() => {
      if (finishing.current) return;
      window.location.replace(`${routes.login}?clerk=aborted`);
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return <div id="clerk-captcha" />;
}
