	// src/screens/tabs/SponsorsScreen.js
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

	export default function SponsorsScreen() {
	  const [groups, setGroups] = useState([]);
	  const [loading, setLoading] = useState(true);
	  const [err, setErr] = useState("");

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

	  const hasSponsors = useMemo(
		() => (groups || []).some((g) => g?.sponsors?.length),
		[groups]
	  );

	  return (
		<View style={styles.root}>
		  <ImageBackground
			source={require("../../../assets/bg1.jpg")}
			style={StyleSheet.absoluteFill}
			resizeMode="cover"
		  />

		  <ScrollView contentContainerStyle={styles.scrollContent}>
			{/* Sponsors (exactly like Welcome from Title Sponsor on) */}
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