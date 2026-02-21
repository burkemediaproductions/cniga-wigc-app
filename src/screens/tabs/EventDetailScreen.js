// src/screens/tabs/EventDetailScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  FlatList,
  Alert,
  Linking,
} from "react-native";

import Screen from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

const DEFAULT_COVER = require("../../../assets/default.jpg");

function stripHtml(s = "") {
  return String(s).replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function PresenterRow({ item, onPress }) {
  const photo = item?.photo || item?.avatar || item?.image || item?.headshot;
  const name = item?.name || item?.title;
  const subtitle = [item?.title, item?.org || item?.company].filter(Boolean).join(" • ");

  return (
    <Pressable onPress={onPress} style={styles.presenterRow}>
      <View style={styles.presenterLeft}>
        <View style={styles.presenterImgWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.presenterImg} resizeMode="cover" />
          ) : (
            <View style={styles.presenterImgFallback} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.presenterName} numberOfLines={2}>
            {name || "Presenter"}
          </Text>
          {subtitle ? (
            <Text style={styles.presenterMeta} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function SponsorCard({ item }) {
  const logo = item?.logoUrl || item?.logo || item?.image || item?.logo_url;
  const name = item?.name || item?.title || "";
  const url = item?.website || "";

  return (
    <Pressable
      onPress={async () => {
        if (!url) return;
        try {
          const ok = await Linking.canOpenURL(url);
          if (ok) Linking.openURL(url);
        } catch {}
      }}
      style={({ pressed }) => [styles.sponsorCard, pressed ? { opacity: 0.92 } : null]}
    >
      <View style={styles.sponsorLogoWrap}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.sponsorLogo} resizeMode="contain" />
        ) : (
          <View style={styles.sponsorLogoFallback} />
        )}
      </View>

      {name ? (
        <Text style={styles.sponsorName} numberOfLines={2}>
          {name}
        </Text>
      ) : null}

      {url ? <Text style={styles.sponsorLink}>VISIT →</Text> : null}
    </Pressable>
  );
}

export default function EventDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const event = route?.params?.event || route?.params || {};

  const eventId = String(event?.id || "");
  
  const title = event?.title?.rendered || event?.title || event?.name || "Event";

  // -------- Star / Unstar (favorites) ----------
  const [starred, setStarred] = useState(false);
  const [favLoading, setFavLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFav() {
      if (!user?.id || !eventId) {
        if (mounted) {
          setStarred(false);
          setFavLoading(false);
        }
        return;
      }

      setFavLoading(true);
      try {
        const { data, error } = await supabase
          .from("attendee_favorites")
          .select("event_id")
          .eq("attendee_id", user.id)
          .eq("event_id", eventId)
          .maybeSingle();

        if (error) throw error;
        if (!mounted) return;

        setStarred(!!data?.event_id);
      } catch {
        if (mounted) setStarred(false);
      } finally {
        if (mounted) setFavLoading(false);
      }
    }

    loadFav();
    return () => {
      mounted = false;
    };
  }, [user?.id, eventId]);


useEffect(() => {
  navigation?.setOptions?.({
    headerStyle: { backgroundColor: colors.cnigaRed },
    headerTintColor: "#fff",
    headerTitleStyle: {
      color: "#fff",
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    headerBackTitleVisible: false,
	headerShadowVisible: false,
    title, // or eventTitle
  });
}, [navigation, title]); // if you have `title` computed from the event

  async function toggleStar() {
    if (!user?.id) {
      return Alert.alert("Sign in required", "Please sign in to star events.");
    }
    if (!eventId) return;

    const next = !starred;
    setStarred(next);

    try {
      if (!next) {
        const { error } = await supabase
          .from("attendee_favorites")
          .delete()
          .eq("attendee_id", user.id)
          .eq("event_id", eventId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendee_favorites").insert({
          attendee_id: user.id,
          event_id: eventId,
        });

        if (error) throw error;
      }
    } catch (e) {
      // revert on failure
      setStarred(!next);
      Alert.alert("Error", e?.message || "Could not update star.");
    }
  }

  // -------- Content ----------

  const description = stripHtml(
    event?.content?.rendered || event?.contentHtml || event?.description || event?.bio || ""
  );

  const location = stripHtml(event?.location || event?.venue || event?.room || "");

  // ✅ WP event featured image comes from wp.js as coverImageUrl
  const coverImageUri =
    event?.coverImageUrl ||
    event?.coverImage ||
    event?.featured_image ||
    event?.image ||
    event?.hero_image ||
    event?.acf?.cover_image ||
    null;

  const sponsors = event?.sponsors || event?.acf?.sponsors || [];
  const moderators = event?.moderator ? [event.moderator] : event?.moderators || event?.acf?.moderators || [];
  const speakers = event?.speakers || event?.acf?.speakers || [];

  const hasSponsors = Array.isArray(sponsors) && sponsors.length > 0;
  const hasModerators = Array.isArray(moderators) && moderators.length > 0;
  const hasSpeakers = Array.isArray(speakers) && speakers.length > 0;

  const timeLine = useMemo(() => {
    const start = event?.start || event?.start_time || event?.startTime;
    const end = event?.end || event?.end_time || event?.endTime;
    const date = event?.date || event?.event_date || event?.day;
    if (!start && !date) return "";
    const range = start && end ? `${start} – ${end}` : start || "";
    return [date, range].filter(Boolean).join(" ");
  }, [event]);

  return (
    <Screen>
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>
        <Image
          source={coverImageUri ? { uri: coverImageUri } : DEFAULT_COVER}
          style={styles.cover}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={starred ? "Unstar event" : "Star event"}
              disabled={favLoading}
              onPress={toggleStar}
              style={styles.starBtn}
            >
              <Text style={[styles.starText, starred ? styles.starTextActive : null]}>
                {starred ? "★" : "☆"}
              </Text>
            </Pressable>
          </View>

          {timeLine ? <Text style={styles.meta}>{timeLine}</Text> : null}
          {location ? <Text style={styles.metalocation}>Location – {location}</Text> : null}

          <View style={styles.hr} />

          {description ? <Text style={styles.body}>{description}</Text> : null}

          {/* Sponsors (social events) */}
          {hasSponsors ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Sponsored By…</Text>

              <FlatList
                data={sponsors}
                keyExtractor={(it, idx) => String(it?.id || it?.slug || it?.name || idx)}
                numColumns={2}
                columnWrapperStyle={{ gap: spacing.md }}
                contentContainerStyle={{ gap: spacing.md, marginTop: spacing.md }}
                renderItem={({ item }) => <SponsorCard item={item} />}
                scrollEnabled={false}
              />
            </View>
          ) : null}

          {/* Moderators / Speakers (seminars) */}
          {hasModerators ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Moderator</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                {moderators.map((p, idx) => (
                  <PresenterRow
                    key={String(p?.id || p?.slug || idx)}
                    item={p}
                    onPress={() =>
                      navigation.navigate("PresenterDetail", { presenter: p, presenterId: p?.id })
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}

          {hasSpeakers ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Speakers</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                {speakers.map((p, idx) => (
                  <PresenterRow
                    key={String(p?.id || p?.slug || idx)}
                    item={p}
                    onPress={() =>
                      navigation.navigate("PresenterDetail", { presenter: p, presenterId: p?.id })
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.slateGray },

  cover: {
    width: "100%",
    height: 240,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  content: {
    padding: spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  title: {
    flex: 1,
    color: colors.cnigaRed,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  starBtn: {
    paddingLeft: 8,
    paddingTop: 4,
  },
  starText: {
    fontSize: 30,
    color: "rgba(249, 115, 89, 0.40)",
  },
  starTextActive: {
    color: colors.cnigaRed,
  },

  meta: {
    marginTop: spacing.md,
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },

  metalocation: {
    marginTop: spacing.md,
    color: "#ffeccd",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },


  hr: {
    marginTop: spacing.lg,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
  },

  body: {
    marginTop: spacing.lg,
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },

  sectionTitle: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 16,
  },

  presenterRow: {
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.28)",
    paddingBottom: spacing.md,
  },
  presenterLeft: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  presenterImgWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  presenterImg: { width: "100%", height: "100%" },
  presenterImgFallback: { flex: 1 },

  presenterName: {
    color: colors.cnigaRed,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 22,
  },
  presenterMeta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 20,
  },

  sponsorCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: spacing.md,
    alignItems: "center",
  },
  sponsorLogoWrap: {
    width: "100%",
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  sponsorLogo: { width: "100%", height: "100%" },
  sponsorLogoFallback: { width: "100%", height: "100%" },

  sponsorName: {
    marginTop: spacing.sm,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    opacity: 0.95,
  },

  sponsorLink: {
    marginTop: 10,
    color: colors.cnigaRed,
    fontWeight: "900",
    letterSpacing: 2,
  },
});