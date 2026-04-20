"use client";

import Link from "next/link";
import {
  LogIn,
  UserPlus,
  Star,
  Package,
  Bookmark,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import styles from "./ProfileContent.module.css";

function initialsFrom(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`
        .toUpperCase()
        .slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase();
  return "ME";
}

export function ProfileContent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className={styles.skeleton} aria-hidden="true" />;
  }

  if (session?.user) {
    return (
      <LoggedIn
        name={session.user.name ?? session.user.email ?? "Member"}
        email={session.user.email}
        image={session.user.image}
        onSignOut={() => void signOut({ callbackUrl: "/" })}
      />
    );
  }

  return <LoggedOut />;
}

function LoggedOut() {
  return (
    <div className={styles.root}>
      <div className={styles.anonHero}>
        <div className={styles.anonAvatar} aria-hidden="true">
          <LogIn size={22} strokeWidth={1.4} />
        </div>
        <p className={styles.heroTitle}>Sign in to Furnishes</p>
        <p className={styles.heroSub}>
          Save designs, track orders, and unlock AI recommendations from Eva.
        </p>
      </div>

      <div className={styles.authBtns}>
        <Link href="/login" className={styles.loginBtn}>
          <LogIn size={14} strokeWidth={1.8} /> Sign in
        </Link>
        <Link href="/signup" className={styles.createBtn}>
          <UserPlus size={14} strokeWidth={1.8} /> Create account
        </Link>
      </div>

      <div className={styles.benefitsCard}>
        <p className={styles.benefitsTitle}>Why join?</p>
        {[
          { Icon: Bookmark, text: "Save unlimited design projects" },
          { Icon: Star, text: "Personalised AI recommendations" },
          { Icon: Package, text: "Order tracking in one place" },
        ].map(({ Icon, text }) => (
          <div key={text} className={styles.benefit}>
            <Icon size={13} strokeWidth={1.8} className={styles.benefitIcon} />
            <span className={styles.benefitText}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoggedIn({
  name,
  email,
  image,
  onSignOut,
}: {
  name: string;
  email: string | null | undefined;
  image: string | null | undefined;
  onSignOut: () => void;
}) {
  const initials = initialsFrom(name, email);

  return (
    <div className={styles.root}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar URLs (Google, etc.)
            <img
              src={image}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className={styles.profileMeta}>
          <p className={styles.profileName}>{name}</p>
          {email ? (
            <p className={styles.profileTitle}>{email}</p>
          ) : (
            <p className={styles.profileTitle}>Signed in</p>
          )}
        </div>
      </div>

      <div className={styles.stats}>
        {[
          { val: "—", label: "Rooms" },
          { val: "—", label: "Projects" },
          { val: "—", label: "Orders" },
        ].map(({ val, label }) => (
          <div key={label} className={styles.stat}>
            <span className={styles.statVal}>{val}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      <nav className={styles.navList}>
        {[
          { label: "Account home", href: "/account" },
          { label: "Profile", href: "/account/profile" },
          { label: "Orders", href: "/account/orders" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className={styles.navItem}>
            {l.label}
            <ChevronRight
              size={12}
              strokeWidth={2}
              className={styles.navChev}
            />
          </Link>
        ))}
        <Link
          href="/account/style"
          className={`${styles.navItem} ${styles.navAccent}`}
        >
          Style & preferences
          <ChevronRight size={12} strokeWidth={2} className={styles.navChev} />
        </Link>
      </nav>

      <button type="button" className={styles.signOutBtn} onClick={onSignOut}>
        <LogOut size={13} strokeWidth={1.8} /> Sign out
      </button>
    </div>
  );
}
