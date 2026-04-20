import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { LOGIN_RETURN_TO_ADMIN_SUPPORT } from "@/lib/auth/login-paths";

/**
 * Require the acting user to have staff or admin role.
 *
 * Use at the top of any /admin page or action. Redirects to /login on
 * no-session, /account on insufficient role.
 *
 * Returns the user record so callers don't need a second DB hit.
 */
export async function requireStaff(): Promise<{
  userId: string;
  email: string;
  name: string | null;
  role: "staff" | "admin";
}> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    redirect(LOGIN_RETURN_TO_ADMIN_SUPPORT);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    redirect(LOGIN_RETURN_TO_ADMIN_SUPPORT);
  }
  if (user.role !== "staff" && user.role !== "admin") {
    // Insufficient role — bounce to user account, not a generic 403.
    // (Staff promotions happen via DB or future admin UI; if you're
    //  here without the role, you probably don't know admin exists.)
    redirect("/account");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    name: user.name,
    role: user.role as "staff" | "admin",
  };
}

/**
 * Same shape but returns null instead of redirecting. Useful for layout
 * components that should render different UI depending on role.
 */
export async function getStaffUser(): Promise<{
  userId: string;
  email: string;
  name: string | null;
  role: "staff" | "admin";
} | null> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user || (user.role !== "staff" && user.role !== "admin")) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    name: user.name,
    role: user.role as "staff" | "admin",
  };
}
