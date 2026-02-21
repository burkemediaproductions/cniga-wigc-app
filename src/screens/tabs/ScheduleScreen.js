// src/screens/tabs/ScheduleScreen.js
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  View,
  Switch,
  ImageBackground,
  Pressable,
  TextInput,
  SectionList,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  Linking,
} from "react-native";
import he from "he";
import { fetchScheduleData } from "../../api/wp";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import Screen from "../../components/Screen";

/**
 * ScheduleScreen (Adalo-style cards)
 * - Seminars: list moderator/speakers as text links -> PresenterDetail
 * - Social/Networking: show sponsor logo grid with website links + excerpt + MORE...
 * - Keeps search + track filter + hide past by default behavior
 */

const VALID_VIEWS = ["all", "mine", "sessions", "socials"];

function parseEventStartDate(ev) {
  if (ev?.sortKey) {
    const d = new Date(ev.sortKey);
    if (!isNaN(d.getTime())) return d;
  }

  const dateLabel = ev?.date;
  if (!dateLabel) return null;

  const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
  const dtStr = ev?.startTime ? `${cleaned} ${ev.startTime}` : cleaned;
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function computeEventEndDate(ev) {
  const start = parseEventStartDate(ev);
  if (!start) return null;

  if (!ev?.endTime) return addMinutes(start, 60);

  const dateLabel = ev?.date;
  if (!dateLabel) return addMinutes(start, 60);

  const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
  const endStr = `${cleaned} ${ev.endTime}`;
  const end = new Date(endStr);
  if (isNaN(end.getTime())) return addMinutes(start, 60);

  if (end.getTime() < start.getTime()) return addMinutes(start, 60);
  return end;
}

function stripHtml(s = "") {
  const decoded = he.decode(String(s));
  return decoded.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function cleanDescriptionText(text = "") {
  const lines = String(text).split("\n");
  const filtered = lines.filter((line) => {
    const t = line.trim().toLowerCase();
    return !t.startsWith("speakers:") && !t.startsWith("speaker:");
  });
  return filtered.join("\n").trim();
}

function getDescription(item) {
  const raw = item?.description ?? item?.contentHtml ?? item?.descriptionHtml ?? "";
  const plain = stripHtml(raw);
  return cleanDescriptionText(plain);
}

function makeExcerpt(text, maxLen = 180) {
  const t = (text || "").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

function isSocialEvent(e) {
  const kinds = Array.isArray(e?.kinds) ? e.kinds : [];
  return kinds.includes("social") || kinds.includes("socials") || e?.type === "social";
}

function formatTimeRange(e) {
  const start = (e?.startTime || "").trim();
  const end = (e?.endTime || "").trim();
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}

function formatRoom(e) {
  return (e?.room || "").trim();
}

function getDisplayTrack(e) {
  if (isSocialEvent(e)) return "";
  const t = typeof e?.track === "string" ? e.track.trim() : "";
  if (!t || t === "-") return "";
  return t;
}

function normalizePresenterFromSchedulePerson(person) {
  if (!person) return null;
  const name = (person?.name || "").trim();
  if (!name) return null;

  return {
    id: person?.id ?? person?.presenterId ?? person?.speakerId ?? name,
    title: { rendered: name },
    acf: {
      presentertitle: person?.title || person?.role || "",
      presenterorg: person?.org || person?.organization || person?.company || "",
      bio: person?.bioHtml || person?.bio || "",
      presenterphoto: person?.photoUrl || person?.photo || person?.imageUrl || "",
    },
    name,
    titleText: person?.title || "",
    org: person?.org || "",
    bioHtml: person?.bioHtml || "",
  };
}

function pickSponsorUrl(s) {
  return (
    (typeof s?.website === "string" && s.website.trim()) ||
    (typeof s?.url === "string" && s.url.trim()) ||
    (typeof s?.link === "string" && s.link.trim()) ||
    ""
  );
}

function pickSponsorLogo(s) {
  return (
    (typeof s?.logo === "string" && s.logo.trim()) ||
    (typeof s?.logoUrl === "string" && s.logoUrl.trim()) ||
    (typeof s?.image === "string" && s.image.trim()) ||
    (typeof s?.imageUrl === "string" && s.imageUrl.trim()) ||
    ""
  );
}

function getSponsorsForEvent(e) {
  const candidates = [
    e?.sponsors,
    e?.sponsorLogos,
    e?.sponsor_list,
    e?.sponsorList,
    e?.partners,
  ].find((x) => Array.isArray(x));

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((s) => {
      if (!s) return null;
      if (typeof s === "string") return { name: s, website: "", logo: "" };
      return {
        name: s?.name || s?.title || "",
        website: pickSponsorUrl(s),
        logo: pickSponsorLogo(s),
      };
    })
    .filter((x) => x && (x.name || x.logo || x.website));
}

function SpeakerLinks({ label, people, navigation, fallbackAvatar }) {
  if (!Array.isArray(people) || people.length === 0) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.peopleLabel}>{label}</Text>

      <View style={styles.peopleList}>
        {people.map((p, idx) => {
          const presenter = normalizePresenterFromSchedulePerson(p);
          if (!presenter) return null;

          const nm = presenter?.title?.rendered || presenter?.name || "Presenter";
          const titleText = (presenter?.acf?.presentertitle || presenter?.titleText || "").trim();
          const orgText = (presenter?.acf?.presenterorg || presenter?.org || "").trim();

          // line1: "Name, Title" (title optional)
          const nameLine = titleText ? `${nm}, ${titleText}` : nm;

          return (
            <View key={`${String(p?.id ?? nm)}-${idx}`} style={styles.personRow}>
              <Text style={styles.personNameLine}>
                <Text
                  style={styles.personNameLink}
                  onPress={() =>
                    navigation.navigate("PresenterDetail", { presenter, fallbackAvatar })
                  }
                >
                  {nameLine}
                </Text>
              </Text>

              {!!orgText ? <Text style={styles.personOrg}>{orgText}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ScheduleScreen({ navigation, route }) {
  const { user } = useAuth();

  // ✅ PARAM SUPPORT
  const initialViewRaw = route?.params?.initialView;
  const forcedViewRaw = route?.params?.forcedView;
  const hideTabs = !!route?.params?.hideTabs;
  const titleOverride = route?.params?.titleOverride;

  const initialView = VALID_VIEWS.includes(initialViewRaw) ? initialViewRaw : "all";
  const forcedView = VALID_VIEWS.includes(forcedViewRaw) ? forcedViewRaw : null;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [error, setError] = useState("");

 // views: all | mine | sessions | socials
const [view, setView] = useState(forcedView || initialView);

const [trackFilter, setTrackFilter] = useState("all");
const [search, setSearch] = useState("");
const [showPast, setShowPast] = useState(false);

// if the route param changes, update view (unless forcedView is locking it)
useEffect(() => {
  const next = route?.params?.initialView;
  if (!forcedView && VALID_VIEWS.includes(next)) {
    setView(next);
  }
}, [route?.params?.initialView, forcedView]);

// if forcedView exists, always enforce it
useEffect(() => {
  if (forcedView) setView(forcedView);
}, [forcedView]);

// ✅ tab reselect / welcome button reset behavior
useEffect(() => {
  const key = route?.params?.resetKey;
  const next = route?.params?.initialView;

  // If forcedView is set, do not let resetKey override it
  if (forcedView) return;

  if (key && VALID_VIEWS.includes(next)) {
    setView(next);

    // nice reset
    setSearch("");
    setTrackFilter("all");
    setShowPast(false);
  }
}, [route?.params?.resetKey, route?.params?.initialView, forcedView]);

  const [starredIds, setStarredIds] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  const [trackModalOpen, setTrackModalOpen] = useState(false);

  // Tick every minute so events that just ended drop away automatically
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Load schedule from WP
  useEffect(() => {
    (async () => {
      try {
        const result = await fetchScheduleData();
        setSessions(Array.isArray(result?.sessions) ? result.sessions : []);
        setSocials(Array.isArray(result?.socials) ? result.socials : []);
        setAllEvents(Array.isArray(result?.allEvents) ? result.allEvents : []);
      } catch {
        setError("Unable to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Track options (filter out "-" so it is never selectable)
  const trackOptions = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];

    const tracks = Array.from(
      new Set(
        list
          .map((e) => (typeof e?.track === "string" ? e.track.trim() : ""))
          .filter((t) => t && t !== "-" && t.toLowerCase() !== "all")
      )
    ).sort((a, b) => a.localeCompare(b));

    return [{ label: "All tracks", value: "all" }, ...tracks.map((t) => ({ label: t, value: t }))];
  }, [sessions]);

  const selectedTrackLabel = useMemo(() => {
    const found = trackOptions.find((o) => o.value === trackFilter);
    return found?.label || "All tracks";
  }, [trackOptions, trackFilter]);

  // Load favorites from Supabase
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

    // Optimistic UI
    setStarredIds((prev) => (currentlyStarred ? prev.filter((x) => x !== id) : [...prev, id]));
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
      // Revert UI on failure
      setStarredIds((prev) => (currentlyStarred ? [...prev, id] : prev.filter((x) => x !== id)));
    }
  }

  // Only Seminars + My Schedule support track filtering (unless tabs hidden)
  const showTrackFilter = !hideTabs && (view === "sessions" || view === "mine");

  // Choose base list by view
  const baseEvents =
    view === "sessions"
      ? sessions
      : view === "socials"
      ? socials
      : view === "mine"
      ? allEvents.filter((e) => starredIds.includes(String(e.id)))
      : allEvents;

  const now = new Date(nowTick);

  // Apply filters: hide past + search + track filter
  const filtered = baseEvents.filter((e) => {
    if (!showPast) {
      const end = computeEventEndDate(e);
      if (end && end.getTime() <= now.getTime()) return false;
    }

    if ((view === "sessions" || view === "mine") && trackFilter !== "all") {
      if (!e.track || e.track.trim() !== trackFilter) return false;
    }

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const haystack = [
      e.title,
      e.track,
      e.room,
      e.date,
      ...(e.speakers || []).map((sp) => sp?.name),
      e.moderator?.name,
      getDescription(e),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aKey = typeof a.sortKey === "number" ? a.sortKey : null;
      const bKey = typeof b.sortKey === "number" ? b.sortKey : null;

      if (aKey != null && bKey != null) return aKey - bKey;
      if (aKey != null) return -1;
      if (bKey != null) return 1;

      return (a.title || "").localeCompare(b.title || "");
    });
  }, [filtered]);

  const sections = useMemo(() => {
    const byDay = new Map();

    for (const ev of sorted) {
      const dayKey = typeof ev.dayKey === "number" ? ev.dayKey : null;
      const title = (ev?.date || "").trim() || "Schedule";

      const mapKey = dayKey ?? `${title}-${ev.id}`;

      if (!byDay.has(mapKey)) byDay.set(mapKey, { title, data: [] });
      byDay.get(mapKey).data.push(ev);
    }

    const arr = Array.from(byDay.entries()).map(([key, section]) => ({
      key,
      ...section,
    }));

    arr.sort((a, b) => {
      const aNum = typeof a.key === "number" ? a.key : null;
      const bNum = typeof b.key === "number" ? b.key : null;

      if (aNum != null && bNum != null) return aNum - bNum;
      if (aNum != null) return -1;
      if (bNum != null) return 1;
      return String(a.title).localeCompare(String(b.title));
    });

    return arr.map(({ title, data }) => ({ title, data }));
  }, [sorted]);

  const tabs = useMemo(
    () => [
      { key: "all", label: "Full\nSchedule" },
      { key: "mine", label: `My\nSchedule (${starredIds.length})` },
      { key: "sessions", label: "Seminars" },
      { key: "socials", label: "Networking" },
    ],
    [starredIds.length]
  );

  const pageTitle =
    titleOverride ||
    (view === "sessions"
      ? "Seminars"
      : view === "socials"
      ? "Networking"
      : view === "mine"
      ? "My Schedule"
      : "Full Schedule");

	// ✅ Keep the top header title in sync with the selected filter view
	useEffect(() => {
	  if (!navigation?.setOptions) return;
	  navigation.setOptions({ headerTitle: pageTitle });
	}, [navigation, pageTitle]);

  if (loading) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, padding: 16 }}>
          <Text>Loading schedule…</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, padding: 16 }}>
          <Text>{error}</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  const { height: screenH } = Dimensions.get("window");
  const modalMaxH = Math.min(560, Math.floor(screenH * 0.72));

  return (
    <Screen>
      <ImageBackground
        source={require("../../../assets/bg1.jpg")}
        style={styles.bg}
        resizeMode="cover"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            // ✅ Makes the controls scroll away with the list (no more “sticky” header UI)
            ListHeaderComponent={
              <View style={styles.headerWrap}>
                <View style={styles.controlsWrap}>

                  {/* ✅ Hide tabs when MySchedule is forced */}
                  {!hideTabs ? (
                    <View style={styles.tabsBar}>
                      {tabs.map((t) => {
                        const active = view === t.key;
                        return (
                          <Pressable
                            key={t.key}
                            onPress={() => {
                              setView(t.key);
                              if (!(t.key === "sessions" || t.key === "mine")) setTrackFilter("all");
                            }}
                            style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
                          >
							<Text
							  style={[styles.tabText, active ? styles.tabTextActive : null]}
							  numberOfLines={t.key === "sessions" || t.key === "socials" ? 1 : 2}
							  adjustsFontSizeToFit={t.key === "sessions" || t.key === "socials"}
							  minimumFontScale={0.8}
							>
							  {t.label}
							</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <View style={styles.filtersWrap}>
                    <View style={styles.filtersTopRow}>
                      <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search events, tracks, rooms..."
                        placeholderTextColor={"rgba(255,255,255,0.65)"}
                        style={styles.searchPill}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />

                      {showTrackFilter ? (
                        <Pressable
                          onPress={() => setTrackModalOpen(true)}
                          style={styles.trackPill}
                          accessibilityRole="button"
                          accessibilityLabel="Select track"
                        >
                          <Text numberOfLines={1} style={styles.trackPillText}>
                            {selectedTrackLabel}
                          </Text>
                          <Text style={styles.trackPillChevron}>▼</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.pastWrapInlineTop}>
                          <Switch value={showPast} onValueChange={setShowPast} />
                          <Text style={styles.pastInlineLabel} numberOfLines={1}>
                            Show past events
                          </Text>
                        </View>
                      )}
                    </View>

                    {showTrackFilter ? (
                      <View style={styles.filtersBottomRow}>
                        <View style={styles.pastWrapInline}>
                          <Switch value={showPast} onValueChange={setShowPast} />
                          <Text style={styles.pastInlineLabel} numberOfLines={1}>
                            Show past events
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {/* ✅ “Nice touch”: keep errors visually attached to the header controls */}
                  {favoritesError ? (
                    <Text style={styles.errorText}>{favoritesError}</Text>
                  ) : null}
                </View>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <Text style={styles.dayPill}>{section.title}</Text>
            )}
            renderItem={({ item }) => {
              const id = String(item.id);
              const starred = starredIds.includes(id);

              const time = formatTimeRange(item);
              const room = formatRoom(item);
              const track = getDisplayTrack(item);
              const metaLine = [time, room].filter(Boolean).join(" • ");
              const desc = getDescription(item);
              const excerpt = makeExcerpt(desc);

              const moderator = item?.moderator ? [item.moderator] : [];
              const speakers = Array.isArray(item?.speakers) ? item.speakers : [];
              const sponsors = getSponsorsForEvent(item);

              const social = isSocialEvent(item);

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
					<Pressable
					  onPress={() => navigation.navigate("EventDetail", { event: item })}
					  style={({ pressed }) => [{ flex: 1 }, pressed ? { opacity: 0.85 } : null]}
					  accessibilityRole="button"
					  accessibilityLabel={`Open event ${item.title}`}
					>
					  <Text style={styles.cardTitle}>{item.title}</Text>
					</Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={starred ? "Remove from My Schedule" : "Add to My Schedule"}
                      disabled={favoritesLoading}
                      onPress={() => toggleStar(item.id)}
                      style={styles.starBtn}
                    >
                      <Text style={[styles.starText, starred ? styles.starTextActive : null]}>
                        {starred ? "★" : "☆"}
                      </Text>
                    </Pressable>
                  </View>

                  {metaLine ? <Text style={styles.metaText}>{metaLine}</Text> : null}
                  {track ? <Text style={styles.metaText}>{track}</Text> : null}

                  {!social ? (
                    <>
                      <SpeakerLinks label="Moderator" people={moderator} navigation={navigation} />
                      <SpeakerLinks label="Speakers" people={speakers} navigation={navigation} />
                    </>
                  ) : null}

                  {social ? (
                    sponsors.length > 0 ? (
                      <View style={styles.sponsorGrid}>
                        {sponsors.map((s, idx) => {
                          const logo = s.logo;
                          const url = s.website;
                          return (
                            <Pressable
                              key={`${s.name || "s"}-${idx}`}
                              onPress={async () => {
                                if (!url) return;
                                try {
                                  const ok = await Linking.canOpenURL(url);
                                  if (ok) Linking.openURL(url);
                                } catch {}
                              }}
                              style={styles.sponsorCell}
                            >
                              {logo ? (
                                <Image
                                  source={{ uri: logo }}
                                  style={styles.sponsorLogo}
                                  resizeMode="contain"
                                />
                              ) : (
                                <View style={styles.sponsorLogoFallback}>
                                  <Text style={styles.sponsorFallbackText} numberOfLines={2}>
                                    {s.name || "Sponsor"}
                                  </Text>
                                </View>
                              )}
                              {!!s.name ? (
                                <Text style={styles.sponsorName} numberOfLines={2}>
                                  {s.name}
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null
                  ) : null}

                  <View style={styles.divider} />
                  {excerpt ? <Text style={styles.bodyText}>{excerpt}</Text> : null}

                  <Pressable
                    style={styles.moreBtn}
                    onPress={() => navigation.navigate("EventDetail", { event: item })}
                  >
                    <Text style={styles.moreBtnText}>MORE…</Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {favoritesLoading ? "Loading your schedule…" : "No events found for this view."}
              </Text>
            }
          />

          <Modal
            visible={trackModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setTrackModalOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setTrackModalOpen(false)}>
              <Pressable style={[styles.modalCard, { maxHeight: modalMaxH }]} onPress={() => {}}>
                <Text style={styles.modalTitle}>Select a track</Text>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator
                >
                  {trackOptions.map((opt) => {
                    const active = opt.value === trackFilter;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          setTrackFilter(opt.value);
                          setTrackModalOpen(false);
                        }}
                        style={[styles.modalOption, active ? styles.modalOptionActive : null]}
                      >
                        <Text style={[styles.modalOptionText, active ? styles.modalOptionTextActive : null]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable style={styles.modalCloseBtn} onPress={() => setTrackModalOpen(false)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </SafeAreaView>
      </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  // ✅ Nice touch: add a tiny top padding so the header doesn't feel glued to the top
  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 40 },

  // ✅ Header wrapper lives INSIDE the list now (scrolls away naturally)
  headerWrap: {
    paddingTop: 6,
    paddingBottom: 6,
  },

  controlsWrap: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 10,
  },

  pageTitle: {
    alignSelf: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  tabsBar: {
    flexDirection: "row",
    backgroundColor: colors.slateGray,
    borderRadius: 10,
    overflow: "hidden",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: colors.cnigaRed,
  },
	tabText: {
	  color: "#f9fafb",
	  fontSize: 11,
	  fontWeight: "700",
	  letterSpacing: 2,
	  textTransform: "uppercase",
	  textAlign: "center",
	  lineHeight: 14,
	  flexShrink: 1, // 👈 add this
	},
  tabTextActive: { color: "#fff" },

  filtersWrap: { marginTop: 10, gap: 10 },
  filtersTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  filtersBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },

  searchPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  trackPill: {
    width: 170,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 12,
    justifyContent: "space-between",
  },
  trackPillText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 10,
    lineHeight: 18,
  },
  trackPillChevron: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: Platform.OS === "ios" ? 1 : 0,
  },

  pastWrapInline: { flexDirection: "row", alignItems: "center", gap: 8 },
  pastWrapInlineTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  pastInlineLabel: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  // ✅ Nice touch: use a readable error color against the bg, and keep it with the header controls
  errorText: {
    marginTop: 10,
    color: "#fecaca",
    fontWeight: "800",
  },

  dayPill: {
    alignSelf: "center",
    backgroundColor: colors.cnigaRed,
    color: "#fff",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "rgba(255, 236, 205, 0.92)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: { flex: 1, color: colors.cnigaRed, fontSize: 22, fontWeight: "900" },
  starBtn: { paddingLeft: 8, paddingTop: 2 },
  starText: { fontSize: 26, color: "rgba(249, 115, 89, 0.40)" },
  starTextActive: { color: colors.cnigaRed },

  metaText: { marginTop: 6, fontSize: 16, color: "#374151", fontWeight: "600" },

peopleLabel: {
  marginTop: 6,
  fontSize: 15,
  fontWeight: "900",
  color: "#374151", // gray label like old app
  textTransform: "none",
},

peopleList: {
  marginTop: 6,
  gap: 10,
},

personRow: {
  // each person is a block (no pills)
},

personNameLine: {
  fontSize: 16,
  fontWeight: "700",
  lineHeight: 22,
},

personNameLink: {
  color: colors.cnigaRed, // CNIGA red link
  fontWeight: "800",
},

personOrg: {
  marginTop: 2,
  fontSize: 15,
  fontWeight: "600",
  color: "#6b7280", // softer gray
},
  sponsorGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  sponsorCell: { width: "31.5%", alignItems: "center", gap: 6 },
  sponsorLogo: {
    width: "100%",
    height: 64,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 6,
  },
  sponsorLogoFallback: {
    width: "100%",
    height: 64,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sponsorFallbackText: { textAlign: "center", fontSize: 10, fontWeight: "900", color: "#111827" },
  sponsorName: { textAlign: "center", fontSize: 11, fontWeight: "800", color: "#111827" },

  divider: { height: 2, backgroundColor: "rgba(0,0,0,0.35)", marginTop: 12, marginBottom: 10 },

  bodyText: { marginTop: 8, fontSize: 16, lineHeight: 22, color: "#111827", fontWeight: "600" },

  moreBtn: {
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: colors.cnigaRed,
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  moreBtnText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 16,
  },

  emptyText: { paddingHorizontal: 14, paddingTop: 16, color: "#111827", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 12, letterSpacing: 1 },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingBottom: 10, gap: 10 },
  modalOption: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalOptionActive: {
    backgroundColor: "rgba(247, 65, 57, 0.18)",
    borderColor: "rgba(247, 65, 57, 0.45)",
  },
  modalOptionText: { color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "800" },
  modalOptionTextActive: { color: "#fff" },
  modalCloseBtn: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  modalCloseText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});