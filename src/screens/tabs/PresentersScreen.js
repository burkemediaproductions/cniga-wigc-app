import { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TextInput,
  StyleSheet,
  ImageBackground,
  FlatList,
  Pressable,
  Image,
  Platform,
} from "react-native";
import Screen from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { fetchPresentersList, fetchScheduleData } from "../../api/wp";

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
  if (typeof fileVal === "number") return ""; // can't resolve without media lookup
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

function getSessionSpeakerIds(session) {
  const ids = new Set();

  const speakerIds = Array.isArray(session?.speakerIds) ? session.speakerIds : [];
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

function getAvatarUrl(p) {
  const acf = p?.acf || {};
  const uploadUrl = getAcfFileUrl(acf?.presenter_photo_upload ?? p?.presenter_photo_upload);
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

function getPresenterBio(p) {
  if (!p) return "";
  const raw = p?.bioHtml || p?.acf?.bio || "";
  return stripHtml(raw);
}

export default function PresentersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  



  const [presenters, setPresenters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

	  const activePresenterIds = useMemo(() => {
	  const set = new Set();

	  for (const s of sessions || []) {
		const modId = normalizeId(s?.moderatorId ?? s?.moderator?.id);
		if (modId) set.add(modId);

		for (const sid of getSessionSpeakerIds(s)) set.add(sid);
	  }

	  return set;
	}, [sessions]);

  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [pList, sched] = await Promise.all([fetchPresentersList(), fetchScheduleData()]);

        if (!mounted) return;

        const safePresenters = Array.isArray(pList) ? pList : [];
        const safeSessions = Array.isArray(sched?.allEvents) ? sched.allEvents : [];

        // Sort by last name then first/name (keep your behavior)
        safePresenters.sort((a, b) => {
          const aLast = (a?.lastName || "").trim().toLowerCase();
          const bLast = (b?.lastName || "").trim().toLowerCase();
          if (aLast && bLast && aLast !== bLast) return aLast.localeCompare(bLast);

          const aFirst = (a?.firstName || "").trim().toLowerCase();
          const bFirst = (b?.firstName || "").trim().toLowerCase();
          if (aFirst && bFirst && aFirst !== bFirst) return aFirst.localeCompare(bFirst);

          const aName = (a?.name || "").trim().toLowerCase();
          const bName = (b?.name || "").trim().toLowerCase();
          return aName.localeCompare(bName);
        });

        setPresenters(safePresenters);
        setSessions(safeSessions);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load presenters.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

	const filteredPresenters = useMemo(() => {
	  // ✅ only presenters with at least one session
	  const base = presenters.filter((p) => activePresenterIds.has(normalizeId(p?.id)));

	  const q = search.trim().toLowerCase();
	  if (!q) return base;

	  return base.filter((p) => {
		const hay = [
		  p?.name,
		  p?.firstName,
		  p?.lastName,
		  p?.title,
		  p?.org,
		  p?.company,
		  p?.organization,
		  getPresenterBio(p),
		]
		  .filter(Boolean)
		  .join(" ")
		  .toLowerCase();

		return hay.includes(q);
	  });
	}, [presenters, activePresenterIds, search]);

  const openPresenter = (presenter) => {
    if (!presenter) return;

    // If you already have a named route, adjust this string to match your navigator.
    // Passing sessions lets PresenterDetailScreen render seminars like the Adalo detail page.
    navigation?.navigate?.("PresenterDetail", {
      presenter,
      allSessions: sessions,
    });
  };

  if (loading) {
    return (
      <Screen>
        <ImageBackground source={require("../../../assets/bg1.jpg")} style={styles.bg} resizeMode="cover">
          <SafeAreaView style={styles.safe}>
            <View style={styles.card}>
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ImageBackground source={require("../../../assets/bg1.jpg")} style={styles.bg} resizeMode="cover">
          <SafeAreaView style={styles.safe}>
            <View style={styles.card}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </Screen>
    );
  }

  return (
    <Screen>
      <ImageBackground source={require("../../../assets/bg1.jpg")} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={styles.safe}>
          <View style={styles.card}>
            {/* Search pill (light like Adalo) */}
            <View style={styles.searchWrap}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor={"rgba(75,75,75,0.55)"}
                style={styles.searchPill}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>

            {/* List */}
            <FlatList
              data={filteredPresenters}
              keyExtractor={(p) => String(p.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const avatar = getAvatarUrl(item);
                const name = item?.name || item?.title?.rendered || "Presenter";

                return (
                  <Pressable
                    onPress={() => openPresenter(item)}
                    style={styles.row}
                    accessibilityRole="button"
                    accessibilityLabel={`Open presenter ${name}`}
                  >
                    <View style={styles.avatarBox}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatarImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarFallbackText}>
                            {String(name).trim().slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.rowName} numberOfLines={2}>
                      {name}
                    </Text>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListEmptyComponent={<Text style={styles.emptyText}>No speakers found.</Text>}
              contentContainerStyle={{ paddingBottom: 12 }}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // Beige translucent main panel like Adalo
  card: {
    flex: 1,
    backgroundColor: colors.cardBeige, // rgba(255, 236, 205, 0.92)
    borderRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },

  searchWrap: {
    marginBottom: spacing.lg,
  },

  searchPill: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: colors.slateGray,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 14,
  },

  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarFallbackText: {
    color: colors.slateGray,
    fontSize: 22,
    fontWeight: "900",
  },

  rowName: {
    flex: 1,
    color: colors.slateGray,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  sep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginLeft: 76, // lines up under text like Adalo
  },

  emptyText: {
    paddingTop: spacing.lg,
    color: "rgba(75,75,75,0.75)",
    ...typography.body,
  },

  loadingText: {
    color: colors.slateGray,
    ...typography.body,
  },
  errorText: {
    color: "#7a1b1b",
    fontWeight: "800",
    ...typography.body,
  },
});