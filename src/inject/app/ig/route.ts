import { sanitizeFolderName } from "@/shared/filename";
import type { HighlightInfo } from "../media/types";
import type { IgRouteContextValue } from "./modules";

/**
 * Instagram's current route, captured from `CometRouterRouteContext` by the
 * navigation item (which is always mounted).
 */
let currentRoute: IgRouteContextValue | null = null;

export function setCurrentRoute(route: IgRouteContextValue | null): void {
  currentRoute = route;
}

export function getCurrentRoute(): IgRouteContextValue | null {
  return currentRoute;
}

/** Instagram's logging name of a page, e.g. `profilePage`, `SavedCollectionPage`. */
export function getPageName(route: IgRouteContextValue | null = currentRoute): string | undefined {
  const props = route?.rootView?.props as Record<string, unknown> | undefined;
  const logging = (props?.page_logging ?? props?.pageLogging) as { name?: string } | undefined;
  const name = logging?.name ?? (typeof props?.pageName === "string" ? props.pageName : undefined);
  return name ?? (typeof route?.params?.pageName === "string" ? route.params.pageName : undefined);
}

/** Paths that are Instagram app routes, not profile usernames. */
const RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "ads",
  "android",
  "api",
  "challenge",
  "create",
  "direct",
  "directory",
  "emails",
  "explore",
  "graphql",
  "legal",
  "lite",
  "locations",
  "oauth",
  "p",
  "privacy",
  "push",
  "qr",
  "reel",
  "reels",
  "s",
  "saved",
  "search",
  "session",
  "stories",
  "tags",
  "tv",
  "web",
]);

export type ProfileTab = "posts" | "reels" | "tagged" | "saved";

export interface ProfilePath {
  username: string;
  tab: ProfileTab;
}

/** Read a profile username and tab from a URL path such as `/user/reels/`. */
export function parseProfilePath(pathname: string): ProfilePath | null {
  const parts = pathname.split("/").filter(Boolean);
  const username = parts[0];
  const tabSegment = parts[1];
  if (!username || parts.length > 2) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username) || RESERVED_PATHS.has(username.toLowerCase())) return null;
  if (!tabSegment || tabSegment === "posts") return { username, tab: "posts" };
  if (tabSegment === "reels" || tabSegment === "tagged" || tabSegment === "saved") {
    return { username, tab: tabSegment };
  }
  return null;
}

/** User id from whatever field Instagram currently stores it under. */
export function getRouteUserId(route: IgRouteContextValue | null): string | undefined {
  const props = route?.rootView?.props as Record<string, unknown> | undefined;
  const user = props?.user as { pk?: unknown; id?: unknown } | undefined;
  const candidates = [props?.id, props?.user_id, props?.userId, user?.pk, user?.id, route?.params?.id, route?.params?.user_id, route?.params?.pk];
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value)) return String(value);
  }
  return undefined;
}

/** The profile currently being viewed, captured from the profile avatar hook. */
let currentProfileUser: { id?: string; username?: string } | null = null;

export function setCurrentProfileUser(user: { id?: string; username?: string } | null): void {
  currentProfileUser = user;
}

export function getCurrentProfileUser(): { id?: string; username?: string } | null {
  return currentProfileUser;
}

export function isProfilePageName(pageName: string | undefined): boolean {
  return !!pageName && /profilepage/i.test(pageName);
}

/** The visible story item, captured by the story player hook. */
export const highlightState: { currentItemId?: string } = {};

/** The media hook is preferred; a story permalink also works before it mounts. */
export function getCurrentStoryId(): string | undefined {
  return (
    highlightState.currentItemId ?? window.location.pathname.match(/^\/stories\/(?!highlights\/)[^/]+\/(\d+)\/?$/)?.[1]
  );
}

/** Sub-folders used by "Split-Folder": posts / reels / tagged / saved / highlights. */
export function getSplitFolderSegments(highlight?: HighlightInfo): string[] {
  const { href } = window.location;
  if (highlight || href.includes("/highlights/")) {
    const id = highlight?.id ?? href.match(/\/highlights\/([^/?#]+)/)?.[1] ?? "";
    const name =
      sanitizeFolderName(highlight?.name ?? "") || sanitizeFolderName(id.replace(/^highlight:/, "")) || "untitled";
    return ["highlights", name];
  }
  if (href.includes("/stories/")) return ["highlights", "latest"];
  const tab = currentRoute?.params?.tab;
  return tab ? [tab] : ["posts"];
}
