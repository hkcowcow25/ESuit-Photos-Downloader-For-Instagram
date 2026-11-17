import { afterEach, describe, expect, it } from "vitest";
import { resolveRouteAlbum } from "@/inject/app/fetchers/route-album";
import { getRouteUserId, parseProfilePath, setCurrentProfileUser } from "@/inject/app/ig/route";
import type { IgRouteContextValue } from "@/inject/app/ig/modules";

afterEach(() => setCurrentProfileUser(null));

const route = (name: string, extra: Partial<IgRouteContextValue> & { id?: string; username?: string; tab?: string } = {}): IgRouteContextValue => ({
  rootView: { props: { id: extra.id, page_logging: { name } } },
  params: { username: extra.username, tab: extra.tab, ...extra.params },
});

describe("parseProfilePath", () => {
  it("reads a profile and its tab from the URL", () => {
    expect(parseProfilePath("/tsanghiusze/")).toEqual({ username: "tsanghiusze", tab: "posts" });
    expect(parseProfilePath("/tsanghiusze/reels/")).toEqual({ username: "tsanghiusze", tab: "reels" });
    expect(parseProfilePath("/tsanghiusze/tagged")).toEqual({ username: "tsanghiusze", tab: "tagged" });
    expect(parseProfilePath("/explore/")).toBeNull();
    expect(parseProfilePath("/reels/")).toBeNull();
    expect(parseProfilePath("/p/ABC123/")).toBeNull();
  });
});

describe("getRouteUserId", () => {
  it("accepts the id in the usual and newer route fields", () => {
    expect(getRouteUserId(route("profilePage", { id: "99", username: "someone" }))).toBe("99");
    expect(getRouteUserId({ rootView: { props: { user_id: "77" } } } as IgRouteContextValue)).toBe("77");
    expect(getRouteUserId({ params: { pk: "55" } })).toBe("55");
  });
});

describe("resolveRouteAlbum", () => {
  it("treats the main profile tab as posts, including tab=posts", () => {
    const fromUndefinedTab = resolveRouteAlbum(route("profilePage", { id: "99", username: "someone" }), "/someone/");
    expect(fromUndefinedTab).toMatchObject({ collectionId: "99_posts", folderName: "someone", isProfile: true });
    expect(fromUndefinedTab.fetchQuery).toEqual(expect.any(Function));

    const fromPostsTab = resolveRouteAlbum(
      route("profilePage", { id: "99", username: "someone", tab: "posts" }),
      "/someone/",
    );
    expect(fromPostsTab.collectionId).toBe("99_posts");
    expect(fromPostsTab.fetchQuery).toEqual(expect.any(Function));
  });

  it("recognizes a profile from the URL when route metadata is missing", () => {
    const album = resolveRouteAlbum(null, "/tsanghiusze/");
    expect(album).toMatchObject({ collectionId: "tsanghiusze_posts", folderName: "tsanghiusze", isProfile: true });
    expect(album.fetchQuery).toEqual(expect.any(Function));
  });

  it("uses the profile avatar hook's user id when the route has none", () => {
    setCurrentProfileUser({ id: "502", username: "tsanghiusze" });
    const album = resolveRouteAlbum(null, "/tsanghiusze/reels/");
    expect(album.collectionId).toBe("502_reels");
    expect(album.isProfile).toBe(true);
  });
});
