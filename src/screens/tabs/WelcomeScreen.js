// src/screens/tabs/WelcomeScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ImageBackground } from "react-native";

import { fetchSponsorGroups } from "../../api/wp";
import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * Normalize WP-ish URLs for React Native:
 * - //domain/path  -> https://domain/path
 * - /wp-content/... -> https://cniga.com/wp-content/...
 * - http://... -> https://...
 */
function normalizeUrl(url) {
  if (!url) return "";
  let u = String(url).trim();

  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("/")) u = `https://cniga.com${u}`;
  if (u.startsWith("http://")) u = u.replace("http://", "https://");

  return u;
}

function hasFirstAndLast(name) {
  const s = String(name || "").trim();
  if (!s) return false;
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.length >= 2;
}

function SponsorLogo({ sponsor }) {
  const [failed, setFailed] = useState(false);

  const uri = useMemo(() => normalizeUrl(sponsor?.logoUrl), [sponsor?.logoUrl]);
  const showImage = !!uri && !failed;

  const onPress = async () => {
    if (!sponsor?.website) return;
    try {
      await Linking.openURL(sponsor.website);
    } catch (e) {
      // optional: console.log("LINK FAIL", sponsor?.website, e?.message);
    }
  };

  const Logo = (
    <View style={styles.logoWrap}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={styles.logo}
          resizeMode="contain"
          onLoad={() => console.log("✅ LOGO LOADED:", sponsor?.name, uri)}
          onError={(e) => {
            console.log("❌ LOGO LOAD FAIL:", sponsor?.name, uri, e?.nativeEvent);
            setFailed(true);
          }}
        />
      ) : (
        <Text style={styles.logoFallback}>{sponsor?.name || "Sponsor"}</Text>
      )}
    </View>
  );

  if (sponsor?.website) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        {Logo}
      </Pressable>
    );
  }

  return Logo;
}

function SponsorSection({ label, sponsors }) {
  if (!sponsors?.length) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionPill}>
        <Text style={styles.sectionPillText}>{label}</Text>
      </View>

      <View style={styles.sponsorGrid}>
        {sponsors.map((s) => (
          <View
            key={`${s?.type || "s"}-${s?.id || s?.name || Math.random()}`}
            style={styles.gridItem}
          >
            <SponsorLogo sponsor={s} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Profile + favorites (to decide welcome text + button label)
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [favCount, setFavCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await fetchSponsorGroups();
        if (mounted) setGroups(data || []);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load sponsors.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Load attendee profile (name/photo) + favorites count
  useEffect(() => {
    let mounted = true;

    async function loadProfileAndFavs() {
      setProfileLoading(true);

      if (!user?.id) {
        if (!mounted) return;
        setProfileName("");
        setAvatarUrl(null);
        setFavCount(0);
        setProfileLoading(false);
        return;
      }

      try {
        const { data: attendee, error: attendeeErr } = await supabase
          .from("attendees")
          .select("name,avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (attendeeErr) throw attendeeErr;

        const { data: favs, error: favErr } = await supabase
          .from("attendee_favorites")
          .select("event_id")
          .eq("attendee_id", user.id);

        if (favErr) throw favErr;

        if (!mounted) return;

        setProfileName(attendee?.name || "");
        setAvatarUrl(attendee?.avatar_url || null);
        setFavCount(Array.isArray(favs) ? favs.length : 0);
      } catch {
        if (!mounted) return;
        // Fail quietly; keep generic welcome
        setProfileName("");
        setAvatarUrl(null);
        setFavCount(0);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    loadProfileAndFavs();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const hasSponsors = useMemo(
    () => (groups || []).some((g) => g?.sponsors?.length),
    [groups]
  );

  const welcomeText = useMemo(() => {
    if (hasFirstAndLast(profileName)) return `Welcome, ${profileName.trim()}!`;
    return "Welcome!";
  }, [profileName]);

  const scheduleBtnLabel = favCount > 0 ? "View My Schedule" : "View Schedule";

  // ✅ Your actual tab route names are "Seminars" and "Networking"
  // We'll use "Seminars" as the destination for schedule browsing.
const goToSchedule = () => {
  const resetKey = Date.now(); // or `${Date.now()}`

  if (favCount > 0) {
    navigation?.navigate?.("Seminars", {
      initialView: "mine",
      resetKey,
    });
  } else {
    navigation?.navigate?.("Seminars", {
      initialView: "sessions",
      resetKey,
    });
  }
};

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/bg1.jpg")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeBlock}>

		  <Pressable
			onPress={() => navigation?.navigate?.("Profile")}
			disabled={!user?.id}
			style={({ pressed }) => [
			  pressed ? { opacity: 0.85 } : null,
			  { alignItems: "center" },
			]}
		  >
			{avatarUrl ? (
			  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
			) : null}

			<Text style={styles.welcomeTitle}>{welcomeText}</Text>
		  </Pressable>

			<Pressable
			  onPress={goToSchedule}
			  disabled={profileLoading}
			  style={({ pressed }) => [
				styles.scheduleBtn,
				pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
				profileLoading ? { opacity: 0.75 } : null,
			  ]}
			  accessibilityRole="button"
			  accessibilityLabel={scheduleBtnLabel}
			>
			  <Text style={styles.scheduleBtnText}>{scheduleBtnLabel}</Text>
			</Pressable>
        </View>

        {/* Sponsors (keep tan cards for everything else) */}
        {loading ? (
          <View style={styles.statusWrap}>
            <ActivityIndicator />
            <Text style={styles.statusText}>Loading sponsors…</Text>
          </View>
        ) : err ? (
          <View style={styles.statusWrap}>
            <Text style={[styles.statusText, { color: "#ffb4b4" }]}>{err}</Text>
          </View>
        ) : !hasSponsors ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>No sponsors found.</Text>
          </View>
        ) : (
          groups.map((g) => <SponsorSection key={g.label} label={g.label} sponsors={g.sponsors} />)
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  welcomeBlock: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 118,
    height: 118,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  welcomeTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  scheduleBtn: {
    backgroundColor: colors.cnigaRed,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  scheduleBtnText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
  },

  // keep tan background for everything else
  sectionCard: {
    backgroundColor: colors.cardBeige,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 14,
  },
  sectionPill: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  sectionPillText: {
    color: "white",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  sponsorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    marginBottom: 12,
  },

  logoWrap: {
    width: "100%",
    minHeight: 90,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: 70,
  },
  logoFallback: {
    color: colors.textDark,
    fontWeight: "800",
    textAlign: "center",
  },

  statusWrap: {
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
});