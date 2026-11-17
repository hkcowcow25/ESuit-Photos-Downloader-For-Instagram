import { sanitizeFolderName } from "@/shared/filename";
import {
  getCurrentProfileUser,
  getPageName,
  getRouteUserId,
  isProfilePageName,
  parseProfilePath,
  type ProfileTab,
} from "../ig/route";
import { fetchUserInfoByUsername } from "../ig/instapi";
import type { IgRouteContextValue } from "../ig/modules";
import type { FetchQuery } from "../media/types";
import { fetchSearchResults } from "./hashtag";
import { fetchProfilePosts, fetchProfileReels, fetchProfileTagged, type ProfileTarget } from "./profile";
import { fetchAllCollections, fetchOwnCollection, fetchOwnSavedPosts } from "./saved";

export interface RouteAlbum {
  /** Identifies the album for resumable downloads; empty when resuming is not supported. */
  collectionId: string;
  /** Folder used by "Gen-Folder" instead of each post's author. */
  folderName: string;
  fetchQuery: FetchQuery | null;
  /** Whether the fetch-quantity controls apply (profile pages). */
  isProfile: boolean;
}

async function resolveProfileTarget(username: string, id?: string): Promise<ProfileTarget> {
  if (id) return { id, username };
  const user = await fetchUserInfoByUsername(username);
  if (!user?.pk) throw new Error(`Unable to find Instagram user ${username}`);
  return { id: String(user.pk), username: user.username || username };
}

function profileAlbum(username: string, tab: ProfileTab, id?: string): RouteAlbum {
  if (tab === "saved") {
    return { collectionId: "", folderName: "", fetchQuery: fetchAllCollections, isProfile: false };
  }
  const key = id || username;
  const fetch =
    tab === "reels" ? fetchProfileReels : tab === "tagged" ? fetchProfileTagged : fetchProfilePosts;
  return {
    collectionId: `${key}_${tab}`,
    folderName: username,
    isProfile: true,
    fetchQuery: async (context) => fetch(context, await resolveProfileTarget(username, id)),
  };
}

/** Works out what "Download Whole Album" should download on the current page. */
export function resolveRouteAlbum(
  route: IgRouteContextValue | null,
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
): RouteAlbum {
  const pageName = getPageName(route);
  const params = route?.params ?? {};
  const none: RouteAlbum = { collectionId: "", folderName: "", fetchQuery: null, isProfile: false };

  if (pageName === "KeywordSearchExplorePage" && params.q) {
    const query = params.q;
    const folder = sanitizeFolderName(query) || "search";
    return {
      collectionId: sanitizeFolderName(query) || `search_${encodeURIComponent(query)}`,
      folderName: folder,
      isProfile: false,
      fetchQuery: (c) => fetchSearchResults(c, query),
    };
  }

  if (pageName === "SavedCollectionPage") {
    if (!params.collection_id && params.slug === "all-posts") {
      return { ...none, fetchQuery: fetchOwnSavedPosts };
    }
    if (params.collection_id) {
      const collectionId = params.collection_id;
      return {
        ...none,
        collectionId: `${collectionId}_${params.slug}`,
        fetchQuery: (c) => fetchOwnCollection(c, collectionId),
      };
    }
  }

  const fromPath = parseProfilePath(pathname);
  const username = params.username || fromPath?.username || "";
  const viewed = getCurrentProfileUser();
  const id =
    getRouteUserId(route) ||
    (viewed && (!username || !viewed.username || viewed.username === username) ? viewed.id : undefined);
  const tab: ProfileTab = fromPath?.tab ?? (params.tab === "reels" || params.tab === "tagged" || params.tab === "saved" ? params.tab : "posts");

  if ((isProfilePageName(pageName) || fromPath) && username) {
    return profileAlbum(username, tab, id);
  }

  return none;
}
