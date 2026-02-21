import { useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { fetchScheduleData } from "../../api/wp";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

import { getPresenterPhotoUrl, initialForName } from "../../utils/images";
import { wpText } from "../../utils/text";

function stripHtml(s = "") {
  return String(s)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeId(x) {
  if (x === null || x === undefined) return "";
  return String(x).trim();
}

function pickFirstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function getAcfFileUrl(fileVal) {
  if (!fileVal) return "";
  if (typeof fileVal === "string") return fileVal.trim();
  if (typeof fileVal === "number") return "";
  if (typeof fileVal === "object") {
    return pickFirstString(
      fileVal.url,
      fileVal.source_url,
      fileVal.guid?.rendered,
      fileVal.sizes?.medium,
      fileVal.sizes?.large,
      fileVal.sizes?.thumbnail
    );
  }
  return "";
}

function getAvatarUrl(p) {
  const util = getPresenterPhotoUrl?.(p);
  if (util) return util;

	const acf = p?.acf || {};
  const uploadUrl = getAcfFileUrl(
    acf?.presenter_photo_upload ?? p?.presenter_photo_upload
  );
  const textUrl = pickFirstString(acf?.presenterphoto, p?.presenterphoto);

  const other = pickFirstString(
    p?.avatar,
    p?.photo,
    p?.photoUrl,
    p?.image,
    p?.imageUrl,
    p?.headshot,
    p?.headshotUrl,
    p?.profilePic,
    p?.profilePicUrl,
    p?.thumbnail,
    p?.thumbnailUrl
  );

  return pickFirstString(uploadUrl, textUrl, other);
}

const DEFAULT_THUMB = require("../../../assets/default.jpg");

function getSessionThumbSource(s) {
  const uri =
    pickFirstString(
      s?.coverImageUrl,
      s?.coverImage,
      s?.featured_image,
      s?.image,
      s?.hero_image,
      s?.acf?.cover_image
    ) || "";

  return uri ? { uri } : DEFAULT_THUMB;
}

function getPresenterName(presenter) {
  // Old WP: title.rendered
  const wpName = wpText(presenter?.title?.rendered || "");
  if (wpName) return wpName;

  // Flattened
  return wpText(presenter?.name || presenter?.firstName || "") || "";
}

function getPresenterTitle(presenter) {
  return wpText(presenter?.acf?.presentertitle || presenter?.title || "");
}

function getPresenterOrg(presenter) {
  return wpText(
    presenter?.acf?.presenterorg ||
      presenter?.org ||
      presenter?.organization ||
      presenter?.company ||
      ""
  );
}

function getPresenterBio(presenter) {
  const wpBio = presenter?.acf?.bio;
  const flatBio = presenter?.bioHtml;
  const raw = wpBio || flatBio || "";
  return stripHtml(wpText(raw));
}

// Old WP style session ids are stored on presenter.acf.sessions_*
function normalizeIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === "number");
  return [];
}

function getSessionSpeakerIds(session) {
  const ids = new Set();

  const speakerIds = Array.isArray(session?.speakerIds)
    ? session.speakerIds
    : [];
  for (const id of speakerIds) ids.add(normalizeId(id));

  const speakers = Array.isArray(session?.speakers) ? session.speakers : [];
  for (const sp of speakers) {
    const sid = normalizeId(sp?.id ?? sp?.speakerId ?? sp?.presenterId);
    if (sid) ids.add(sid);
  }

  return Array.from(ids).filter(Boolean);
}

function isPresenterOnSession(presenterId, session) {
  const pid = normalizeId(presenterId);
  if (!pid) return false;

  const modId = normalizeId(session?.moderatorId ?? session?.moderator?.id);
  if (modId && modId === pid) return true;

  const speakerIds = getSessionSpeakerIds(session);
  return speakerIds.includes(pid);
}

function formatTimeRange(e) {
  const start = (e?.startTime || e?.acf?.["event-time-start"] || "").trim();
  const end = (e?.endTime || e?.acf?.["event-time-end"] || "").trim();
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}

function getTermNameFromEmbedded(event, taxonomy) {
  const termGroups = event?._embedded?.["wp:term"];
  if (!Array.isArray(termGroups)) return "";
  for (const group of termGroups) {
    if (!Array.isArray(group)) continue;
    const match = group.find((t) => t?.taxonomy === taxonomy);
    if (match?.name) return wpText(match.name);
  }
  return "";
}

export default function PresenterDetailScreen({ route, navigation }) {
  const params = route?.params || {};

  const presenter = params.presenter;
  const eventsById = params.eventsById || {};
  const fallbackAvatar = params.fallbackAvatar;

  // IMPORTANT: do NOT default this to []
  const allSessions = params.allSessions;

  // Stable array reference
  const passedSessions = Array.isArray(allSessions) ? allSessions : [];

  const [scheduleAll, setScheduleAll] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function ensureSchedule() {
      // If caller passed sessions, we're good
      if (passedSessions.length > 0) return;

      setScheduleLoading(true);

      try {
        const result = await fetchScheduleData();
        if (!mounted) return;

        setScheduleAll(Array.isArray(result?.allEvents) ? result.allEvents : []);
      } catch (e) {
        // fail silently; presenter page can still render bio/etc.
      } finally {
        if (mounted) setScheduleLoading(false);
      }
    }

    ensureSchedule();

    return () => {
      mounted = false;
    };
  }, [passedSessions.length]); // ✅ number dependency prevents infinite loop

  // -----------------------------
  // Favorites (same concept as ScheduleScreen)
  // -----------------------------
  const [starredIds, setStarredIds] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadFavorites() {
      if (!user) {
        setStarredIds([]);
        setFavoritesLoading(false);
        return;
      }

      setFavoritesLoading(true);
      setFavoritesError("");

      try {
        const { data, error } = await supabase
          .from("attendee_favorites")
          .select("event_id")
          .eq("attendee_id", user.id);

        if (error) throw error;
        if (!mounted) return;

        const dbIds = (data || []).map((r) => String(r.event_id));
        setStarredIds(dbIds);
      } catch (e) {
        if (mounted) setFavoritesError(e.message || "Could not load favorites.");
      } finally {
        if (mounted) setFavoritesLoading(false);
      }
    }

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, [user]);

  async function toggleStar(eventId) {
    if (!user) {
      return Alert.alert("Sign in required", "Please sign in to save favorites.");
    }

    const id = String(eventId);
    const currentlyStarred = starredIds.includes(id);

    setStarredIds((prev) =>
      currentlyStarred ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setFavoritesError("");

    try {
      if (currentlyStarred) {
        const { error } = await supabase
          .from("attendee_favorites")
          .delete()
          .eq("attendee_id", user.id)
          .eq("event_id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendee_favorites").insert({
          attendee_id: user.id,
          event_id: id,
        });

        if (error) throw error;
      }
    } catch (e) {
      setFavoritesError(e.message || "Could not update favorite.");
      setStarredIds((prev) =>
        currentlyStarred ? [...prev, id] : prev.filter((x) => x !== id)
      );
    }
  }

  const name = getPresenterName(presenter);
  const title = getPresenterTitle(presenter);
  const org = getPresenterOrg(presenter);
  const bio = getPresenterBio(presenter);
  const pid = normalizeId(presenter?.id);
  const photoUrl = getAvatarUrl(presenter);

  const sessionsSource = useMemo(() => {
    if (passedSessions.length) return passedSessions;
    if (Array.isArray(scheduleAll) && scheduleAll.length) return scheduleAll;
    return [];
  }, [passedSessions, scheduleAll]);

  const moderatedSessions = useMemo(() => {
    if (!pid || !sessionsSource.length) return [];

    return sessionsSource
      .filter((s) => normalizeId(s?.moderatorId ?? s?.moderator?.id) === pid)
      .slice()
      .sort((a, b) => (a?.sortKey || 0) - (b?.sortKey || 0));
  }, [pid, sessionsSource]);

	const speakingSessions = useMemo(() => {
	  if (!pid || !sessionsSource.length) return [];

	  return sessionsSource
		.filter((s) => {
		  const isMod =
			normalizeId(s?.moderatorId ?? s?.moderator?.id) === pid;

		  if (isMod) return false; // keep “Speaker” list clean
		  const speakerIds = getSessionSpeakerIds(s);
		  return speakerIds.includes(pid);
		})
		.slice()
		.sort((a, b) => (a?.sortKey || 0) - (b?.sortKey || 0));
	}, [pid, sessionsSource]);

		useLayoutEffect(() => {
		  if (!navigation) return;

		  navigation.setOptions({
			title: name || "Speaker",
			headerStyle: {
			  backgroundColor: colors.cnigaRed,
			},
			headerTintColor: "#fff", // back arrow + title color
			headerTitleStyle: {
			  color: "#fff",
			  fontWeight: "800",
			},
			headerTitleAlign: "center",
		  });
		}, [navigation, name]);

  const onPressSession = (item) => {
    if (!item) return;

    const presentersById = route?.params?.presentersById || {};
    const fallbackCover = route?.params?.fallbackCover;
    const fallbackAvatarParam = route?.params?.fallbackAvatar;

    // NEW schedule session object
	if (item.session) {
	  const s = item.session;
	  const wpEvent = eventsById?.[s?.id];

	  navigation?.navigate?.("EventDetail", {
		event: wpEvent || s,
		presentersById,
		fallbackCover,
		fallbackAvatar: fallbackAvatarParam,
	  });

	  return;
	}

    // Old WP event shape
    if (item.event) {
      navigation?.navigate?.("EventDetail", {
        event: item.event,
        presentersById,
        fallbackCover,
        fallbackAvatar: fallbackAvatarParam,
      });
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.photoWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : fallbackAvatar ? (
              <Image source={fallbackAvatar} style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.initial}>
                  {initialForName(name || "P")}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {name || "Speaker"}
          </Text>

          {!!title && <Text style={styles.subLine}>{title}</Text>}
          {!!org && <Text style={styles.subLine}>{org}</Text>}
        </View>

        <View style={styles.panel}>
          {!!bio ? (
            <Text style={styles.bio}>{bio}</Text>
          ) : (
            <Text style={styles.bioMuted}>Bio coming soon.</Text>
          )}

          {!!favoritesError && (
            <Text style={styles.favError}>{favoritesError}</Text>
          )}

          {(moderatedSessions.length > 0 || speakingSessions.length > 0 || scheduleLoading) && (
  <>
    <View style={styles.divider} />

	{!!scheduleLoading && moderatedSessions.length === 0 && speakingSessions.length === 0 && (
	  <Text style={styles.sectionHint}>Loading sessions…</Text>
	)}

    {moderatedSessions.length > 0 && (
      <>
        <Text style={styles.sectionTitle}>Moderating</Text>
        {moderatedSessions.map((s) => {
          const time = formatTimeRange(s);
          const room = (s?.room || "").trim();
          const track = (s?.track || "").trim();
          const meta = [time, room, track ? `Track ${track}` : ""].filter(Boolean).join(" | ");

          const eventId = s?.id;
          const starred = eventId != null && starredIds.includes(String(eventId));

          return (
            <Pressable
              key={`mod-${String(s?.id)}`}
              onPress={() => onPressSession({ session: s, id: s?.id })}
              style={styles.sessionRow}
            >
				<View style={styles.thumb}>
				  <Image source={getSessionThumbSource(s)} style={styles.thumbImg} />
				</View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={2}>
                  {s?.title || "Session"}
                </Text>
                {!!meta && (
                  <Text style={styles.sessionMeta} numberOfLines={2}>
                    {meta}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  if (eventId != null) toggleStar(eventId);
                }}
                disabled={favoritesLoading || eventId == null}
                style={{ paddingLeft: 6 }}
              >
                <Text style={[styles.star, starred ? styles.starActive : null]}>
                  {starred ? "★" : "☆"}
                </Text>
              </Pressable>
            </Pressable>
          );
        })}
      </>
    )}

    {speakingSessions.length > 0 && (
      <>
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Speaking</Text>
        {speakingSessions.map((s) => {
          const time = formatTimeRange(s);
          const room = (s?.room || "").trim();
          const track = (s?.track || "").trim();
          const meta = [time, room, track ? `Track ${track}` : ""].filter(Boolean).join(" | ");

          const eventId = s?.id;
          const starred = eventId != null && starredIds.includes(String(eventId));

          return (
            <Pressable
              key={`spk-${String(s?.id)}`}
              onPress={() => onPressSession({ session: s, id: s?.id })}
              style={styles.sessionRow}
            >
			
			<View style={styles.thumb}>
			  <Image source={getSessionThumbSource(s)} style={styles.thumbImg} />
			</View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={2}>
                  {s?.title || "Session"}
                </Text>
                {!!meta && (
                  <Text style={styles.sessionMeta} numberOfLines={2}>
                    {meta}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  if (eventId != null) toggleStar(eventId);
                }}
                disabled={favoritesLoading || eventId == null}
                style={{ paddingLeft: 6 }}
              >
                <Text style={[styles.star, starred ? styles.starActive : null]}>
                  {starred ? "★" : "☆"}
                </Text>
              </Pressable>
            </Pressable>
          );
        })}
      </>
    )}
  </>
)}
        </View>

        <View style={{ height: 70 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.slateGray,
  },

  content: {
    paddingBottom: spacing.xl,
  },

  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },

  photoWrap: { alignItems: "center", marginBottom: spacing.md },

  photo: {
    width: 120,
    height: 120,
    borderRadius: 6,
    resizeMode: "cover",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  photoFallback: {
    width: 120,
    height: 120,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 44,
  },

  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 6,
  },

  subLine: {
    color: "rgba(255,255,255,0.78)",
    ...typography.body,
    textAlign: "center",
  },

  panel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  bio: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  bioMuted: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },

  favError: {
    color: "#fecaca",
    marginTop: 10,
    ...typography.small,
  },

  divider: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
	thumb: {
	  width: 54,
	  height: 54,
	  borderRadius: 6,
	  overflow: "hidden",
	  backgroundColor: "rgba(255,255,255,0.14)",
	  borderWidth: 1,
	  borderColor: "rgba(255,255,255,0.18)",
	},
	thumbImg: {
	  width: "100%",
	  height: "100%",
	  resizeMode: "cover",
	},
  sessionTitle: {
    color: colors.cnigaRed,
    fontSize: 18,
    fontWeight: "800",
  },
  sessionMeta: {
    color: "rgba(255,255,255,0.70)",
    ...typography.small,
    marginTop: 4,
  },
  star: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 24,
    paddingLeft: 6,
  },
  starActive: {
    color: colors.cnigaRed,
  },

  fab: {
    position: "absolute",
    left: spacing.lg,
    bottom: 26,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.cnigaRed,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabIcon: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: -2,
  },
  
    sectionTitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionHint: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  
});