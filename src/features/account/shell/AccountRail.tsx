"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { accountRequest } from "@/features/account/account-api";
import {
  accountNavigationFor,
  accountTagline,
  accountWorkspaceModes,
  isAccountModeActive,
  isAccountNavActive,
  isConversationWorkspacePath,
} from "./account-navigation";
import { accountDisplayParts } from "./account-display";
import type { AccountShellUser } from "./account-shell-user";
import { useChatWorkspace } from "../conversations/chat-workspace-context";

type RecentItem = { id: string; title: string; projectId: string | null };
type ProjectOption = { id: string; name: string };

/**
 * Left Account rail — exact studio classes and labels, real Next.js Links.
 * On conversation detail, swaps to the chat Workspace/Recents rail.
 */
export function AccountRail({
  user,
  commerceEnabled,
}: {
  user: AccountShellUser;
  commerceEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const chatMode = isConversationWorkspacePath(pathname);
  const { full, av } = accountDisplayParts(user.displayName, user.email);
  const tagline = accountTagline(pathname);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuMode, setMenuMode] = useState<"actions" | "projects">("actions");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLUListElement>(null);
  const { chatSec, openSection, exitSection } = useChatWorkspace();

  function closeMenu() {
    setMenuId(null);
    setMenuPos(null);
    setMenuMode("actions");
  }

  useEffect(() => {
    if (!chatMode) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await accountRequest<{
          items: Array<{
            id: string;
            title: string;
            projectId: string | null;
          }>;
        }>("/api/account/conversations");
        if (!cancelled) {
          setRecents(
            data.items.map((item) => ({
              id: item.id,
              title: item.title,
              projectId: item.projectId,
            })),
          );
        }
      } catch {
        if (!cancelled) setRecents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatMode, pathname]);

  useEffect(() => {
    closeMenu();
    setRenameId(null);
  }, [pathname]);

  useEffect(() => {
    if (!menuId) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        setRenameId(null);
      }
    }
    function onScroll() {
      closeMenu();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuId]);

  async function handleNewChat() {
    if (creating) return;
    exitSection();
    setCreating(true);
    try {
      const created = await accountRequest<{ id: string }>(
        "/api/account/conversations",
        { method: "POST", body: JSON.stringify({}) },
      );
      router.push(`/account/conversations/${created.id}`);
    } catch {
      /* stay on the current thread */
    } finally {
      setCreating(false);
    }
  }

  function openMenu(id: string, button: HTMLElement) {
    setRenameId(null);
    if (menuId === id) {
      closeMenu();
      return;
    }
    const rect = button.getBoundingClientRect();
    setMenuPos({
      top: Math.max(8, rect.top),
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setMenuMode("actions");
    setMenuId(id);
  }

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const data = await accountRequest<{ items: ProjectOption[] }>(
        "/api/account/projects",
      );
      setProjects(data.items.map((item) => ({ id: item.id, name: item.name })));
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function handleRename(id: string) {
    const title = renameValue.trim();
    if (!title || busyId) return;
    setBusyId(id);
    try {
      const updated = await accountRequest<{ id: string; title: string }>(
        `/api/account/conversations/${id}`,
        { method: "PATCH", body: JSON.stringify({ title }) },
      );
      setRecents((items) =>
        items.map((item) =>
          item.id === id ? { ...item, title: updated.title } : item,
        ),
      );
      setRenameId(null);
      closeMenu();
    } catch {
      /* keep editor open */
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddToProject(conversationId: string, projectId: string) {
    if (busyId) return;
    setBusyId(conversationId);
    try {
      const updated = await accountRequest<{
        id: string;
        projectId: string | null;
      }>(`/api/account/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ projectId }),
      });
      setRecents((items) =>
        items.map((item) =>
          item.id === conversationId
            ? { ...item, projectId: updated.projectId }
            : item,
        ),
      );
      closeMenu();
    } catch {
      /* keep menu open */
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (busyId) return;
    const confirmed = window.confirm("Delete this chat? This can’t be undone.");
    if (!confirmed) return;
    setBusyId(id);
    try {
      await accountRequest(`/api/account/conversations/${id}`, {
        method: "DELETE",
      });
      const nextRecents = recents.filter((item) => item.id !== id);
      setRecents(nextRecents);
      closeMenu();
      if (pathname === `/account/conversations/${id}`) {
        const fallback = nextRecents[0];
        router.push(
          fallback ? `/account/conversations/${fallback.id}` : "/account/chat",
        );
      }
    } catch {
      /* keep row */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className="rail">
      <div className="railhead">
        <Link href="/" className="brand" aria-label="Furnishes home">
          FURNISHES <b>「</b>STUDIO<b>」</b>
        </Link>
      </div>

      <div className="railscroll">
        <div className="group">
          <p className="group__h">Workspace</p>
          <nav className="modeswitch">
            {accountWorkspaceModes.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                className={
                  isAccountModeActive(pathname, mode.href)
                    ? "tab is-active"
                    : "tab"
                }
              >
                <span>{mode.label}</span>
                <span className="ix">[{mode.index}]</span>
              </Link>
            ))}
          </nav>
        </div>

        <div id="fa-rail-main" hidden={chatMode}>
          {accountNavigationFor(commerceEnabled).map((group) => (
            <div className="group" key={group.label}>
              <p className="group__h">{group.label}</p>
              <ul className="nav">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        isAccountNavActive(pathname, item.href)
                          ? "is-active"
                          : undefined
                      }
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div id="fa-rail-chat" hidden={!chatMode}>
          <div className="group">
            <p className="group__h">Workspace</p>
            <ul className="cnav">
              <li>
                <a
                  className={creating ? "is-busy" : undefined}
                  data-cnav="new"
                  role="button"
                  tabIndex={creating ? -1 : 0}
                  aria-label="Start a new chat"
                  aria-disabled={creating || undefined}
                  title="Start a new chat with Eva"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleNewChat();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void handleNewChat();
                    }
                  }}
                >
                  <svg className="ico" viewBox="0 0 24 24">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  <span>{creating ? "Starting…" : "New chat"}</span>
                </a>
              </li>
              <li>
                <a
                  className={chatSec === "project" ? "is-active" : undefined}
                  data-cnav="project"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.preventDefault();
                    openSection("project");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSection("project");
                    }
                  }}
                >
                  <svg className="ico" viewBox="0 0 24 24">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  <span>Projects</span>
                </a>
              </li>
              <li>
                <a
                  className={chatSec === "files" ? "is-active" : undefined}
                  data-cnav="files"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.preventDefault();
                    openSection("files");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSection("files");
                    }
                  }}
                >
                  <svg className="ico" viewBox="0 0 24 24">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  <span>Artifacts</span>
                </a>
              </li>
              <li>
                <a
                  className={chatSec === "discover" ? "is-active" : undefined}
                  data-cnav="discover"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.preventDefault();
                    openSection("discover");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSection("discover");
                    }
                  }}
                >
                  <svg className="ico" viewBox="0 0 24 24">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
                  </svg>
                  <span>Insights</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="group">
            <p className="group__h">Recents</p>
            <ul className="cnav cnav--recent" ref={menuRef}>
              {recents.map((item) => {
                const active =
                  pathname === `/account/conversations/${item.id}` &&
                  chatSec === null;
                const menuOpen = menuId === item.id;
                const renaming = renameId === item.id;
                return (
                  <li
                    key={item.id}
                    className={
                      menuOpen || renaming
                        ? "cnav-recent__row is-open"
                        : "cnav-recent__row"
                    }
                  >
                    {renaming ? (
                      <form
                        className="cnav-recent__rename"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleRename(item.id);
                        }}
                      >
                        <input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          aria-label="Rename chat"
                          autoFocus
                          disabled={busyId === item.id}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setRenameId(null);
                            }
                          }}
                        />
                        <button
                          type="submit"
                          disabled={busyId === item.id || !renameValue.trim()}
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <>
                        <Link
                          href={`/account/conversations/${item.id}`}
                          className={active ? "is-active" : undefined}
                          data-cnav="recent"
                          onClick={() => {
                            closeMenu();
                            exitSection();
                          }}
                        >
                          <span>{item.title}</span>
                        </Link>
                        <button
                          type="button"
                          className="cnav-recent__more"
                          aria-label={`Options for ${item.title}`}
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openMenu(item.id, event.currentTarget);
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="5" cy="12" r="1.6" />
                            <circle cx="12" cy="12" r="1.6" />
                            <circle cx="19" cy="12" r="1.6" />
                          </svg>
                        </button>
                        {menuOpen && menuPos ? (
                          <div
                            className="cnav-recent__menu"
                            role="menu"
                            style={{
                              top: menuPos.top,
                              right: menuPos.right,
                            }}
                          >
                            {menuMode === "actions" ? (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setRenameValue(item.title);
                                    setRenameId(item.id);
                                    closeMenu();
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setMenuMode("projects");
                                    void loadProjects();
                                  }}
                                >
                                  Add to project
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="is-danger"
                                  disabled={busyId === item.id}
                                  onClick={() => void handleDelete(item.id)}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="is-back"
                                  onClick={() => setMenuMode("actions")}
                                >
                                  ← Back
                                </button>
                                {projectsLoading ? (
                                  <p className="cnav-recent__hint">Loading…</p>
                                ) : projects.length === 0 ? (
                                  <p className="cnav-recent__hint">
                                    No projects yet
                                  </p>
                                ) : (
                                  projects.map((project) => (
                                    <button
                                      key={project.id}
                                      type="button"
                                      role="menuitem"
                                      className={
                                        item.projectId === project.id
                                          ? "is-current"
                                          : undefined
                                      }
                                      disabled={busyId === item.id}
                                      onClick={() =>
                                        void handleAddToProject(
                                          item.id,
                                          project.id,
                                        )
                                      }
                                    >
                                      {project.name}
                                    </button>
                                  ))
                                )}
                              </>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="railfoot">
        <span className="hr-short" aria-hidden="true" />
        <h2 className="railfoot__title disp">{tagline}</h2>
        <p className="railfoot__cr">©2026, Furnishes Studio Inc.</p>
        <Link
          href="/account/settings"
          className="account"
          aria-label={`Account settings for ${full}`}
        >
          <span className="account__av">{av}</span>
          <span className="account__name">{full}</span>
        </Link>
      </div>
    </aside>
  );
}
