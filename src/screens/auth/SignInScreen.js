	import React, { useMemo, useState } from "react";
	import {
	  Alert,
	  Image,
	  KeyboardAvoidingView,
	  Platform,
	  Pressable,
	  SafeAreaView,
	  StyleSheet,
	  Text,
	  TextInput,
	  View,
	} from "react-native";
	import * as Linking from "expo-linking";
	import { Video, ResizeMode } from "expo-av";
	import { supabase } from "../../lib/supabaseClient";
	import Screen from "../../components/Screen";

	const COLORS = {
	  burntRed: "#f86c4f",
	  coolGray: "#c8c8c8",
	  ghostYellow: "#ffeccd",
	  inputBg: "rgba(10, 14, 26, 0.90)",
	  overlay: "rgba(6, 10, 18, 0.42)",
	};

	export default function SignInScreen() {
	  const [mode, setMode] = useState("magic");
	  const [email, setEmail] = useState("");
	  const [password, setPassword] = useState("");

	  const [loading, setLoading] = useState(false);
	  const [showPassword, setShowPassword] = useState(false);

	  const isMagic = mode === "magic";

	  const buttonLabel = useMemo(() => {
		if (loading) return "PLEASE WAIT…";
		return isMagic ? "EMAIL ME A SIGN-IN LINK" : "SIGN IN";
	  }, [loading, isMagic]);

		async function handleSubmit() {
		  const cleanEmail = (email || "").trim().toLowerCase();
		  if (!cleanEmail) return Alert.alert("Email required", "Please enter your email.");

		  setLoading(true);
		  try {
			if (isMagic) {
			  const redirectTo = Linking.createURL("auth-callback");

			  console.log("SENDING emailRedirectTo:", redirectTo);

				const { error } = await supabase.auth.signInWithOtp({
				  email: cleanEmail,
				  options: {
					redirectTo: redirectTo,
				  },
				});

			  if (error) throw error;
			  Alert.alert("Check your email", "Magic link sent.");
			} else {
			  if (!password) return Alert.alert("Password required", "Please enter your password.");

			  const { error } = await supabase.auth.signInWithPassword({
				email: cleanEmail,
				password,
			  });

			  if (error) throw error;
			}
		  } catch (e) {
			  console.log("SIGN IN ERROR:", e);
			  Alert.alert("Sign in failed", e?.message || "Unknown error");
			} finally {
			setLoading(false);
		  }
		}
		async function handleResetPassword() {
		  const cleanEmail = (email || "").trim().toLowerCase();
		  if (!cleanEmail) {
			return Alert.alert("Email required", "Enter your email to reset your password.");
		  }

		  try {
			const redirectTo = Linking.createURL("auth-callback");

			const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
			  redirectTo,
			});

			if (error) throw error;

			Alert.alert("Reset email sent", "Check your inbox for password reset instructions.");
			setPassword("");
		  } catch (e) {
			Alert.alert("Reset failed", e?.message || "Unknown error");
		  }
		}

	  return (
		<Screen>
		  <SafeAreaView style={styles.safe}>
			{/* Background video layer */}
			<View style={StyleSheet.absoluteFill}>
			  <Video
				source={require("../../../assets/login-bg.mp4")}
				style={StyleSheet.absoluteFill}
				resizeMode={ResizeMode.COVER}
				shouldPlay
				isLooping
				isMuted
			  />
			  {/* Dark overlay */}
			  <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay }]} />
			</View>

			<KeyboardAvoidingView
			  style={styles.kav}
			  behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
			  <View style={styles.stack}>
				{/* Logo */}
				<View style={styles.logoWrap}>
				  <Image
					source={require("../../../assets/cniga-logo.png")}
					style={styles.logo}
					resizeMode="contain"
				  />
				</View>

				{/* Title lines */}
				<View style={styles.brandText}>
				  <Text style={styles.brandLine1}>WESTERN INDIAN GAMING CONFERENCE</Text>
				  <Text style={styles.brandLine2}>PECHANGA RESORT CASINO • 2026</Text>
				</View>

				{/* Mode switch (Email link / Password) */}
				<View style={styles.switchRow}>
				  <ModePill label="Email link" active={isMagic} onPress={() => setMode("magic")} />
				  <ModePill
					label="Password"
					active={!isMagic}
					onPress={() => setMode("password")}
				  />
				</View>

				{/* Form */}
				<View style={styles.form}>
				  <Text style={styles.label}>EMAIL</Text>
				  <TextInput
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
					placeholder="you@example.com"
					placeholderTextColor="rgba(248, 250, 252, 0.50)"
					style={styles.input}
					editable={!loading}
					returnKeyType={isMagic ? "send" : "next"}
				  />

				  {!isMagic && (
					<>
					  <Text style={[styles.label, { marginTop: 10 }]}>PASSWORD</Text>
					  <View style={styles.passwordRow}>
						<TextInput
						  value={password}
						  onChangeText={setPassword}
						  placeholder="••••••••"
						  placeholderTextColor="rgba(248, 250, 252, 0.50)"
						  style={[styles.input, styles.passwordInput]}
						  secureTextEntry={!showPassword}
						  editable={!loading}
						  returnKeyType="done"
						/>
						<Pressable
						  onPress={() => setShowPassword((v) => !v)}
						  style={({ pressed }) => [styles.showBtn, pressed && { opacity: 0.85 }]}
						  disabled={loading}
						>
						  <Text style={styles.showBtnText}>{showPassword ? "HIDE" : "SHOW"}</Text>
						</Pressable>
					  </View>

					  <Pressable
						onPress={handleResetPassword}
						disabled={loading}
						style={{ marginTop: 8, alignSelf: "flex-end" }}
					  >
						<Text
						  style={{
							color: COLORS.ghostYellow,
							fontSize: 12,
							fontWeight: "700",
							letterSpacing: 0.5,
						  }}
						>
						  Forgot password?
						</Text>
					  </Pressable>
					</>
				  )}

				  <Pressable
					onPress={handleSubmit}
					disabled={loading}
					style={({ pressed }) => [
					  styles.button,
					  pressed && styles.buttonPressed,
					  loading && { opacity: 0.75 },
					]}
				  >
					<Text style={styles.buttonText}>{buttonLabel}</Text>
				  </Pressable>

				  {isMagic && (
					<Text style={styles.hint}>
					  Returning attendee? Use your email — no password needed.
					</Text>
				  )}
				</View>
			  </View>
			</KeyboardAvoidingView>
		  </SafeAreaView>
		</Screen>
	  );
	}

	function ModePill({ label, active, onPress }) {
	  return (
		<Pressable
		  onPress={onPress}
		  style={({ pressed }) => [
			styles.pill,
			active ? styles.pillActive : styles.pillInactive,
			pressed && { opacity: 0.92 },
		  ]}
		>
		  <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
			{label}
		  </Text>
		</Pressable>
	  );
	}

	const styles = StyleSheet.create({
	  safe: { flex: 1, backgroundColor: "#000" },
	  kav: { flex: 1, paddingHorizontal: 18 },
	  stack: {
		flex: 1,
		alignItems: "center",
		paddingTop: Platform.OS === "android" ? 60 : 70,
	  },

	  logoWrap: { width: "100%", alignItems: "center" },
	  logo: { width: "78%", maxWidth: 320, height: 110, marginBottom: 10 },

	  brandText: { alignItems: "center", marginBottom: 14 },
	  brandLine1: {
		color: COLORS.burntRed,
		fontWeight: "700",
		letterSpacing: 1.6,
		fontSize: 13,
		textTransform: "uppercase",
		textAlign: "center",
	  },
	  brandLine2: {
		color: COLORS.coolGray,
		letterSpacing: 1.4,
		fontSize: 11.5,
		textTransform: "uppercase",
		marginTop: 4,
		textAlign: "center",
	  },

	  switchRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
		marginBottom: 18,
	  },
	  pill: {
		borderRadius: 999,
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderWidth: 1,
	  },
	  pillActive: {
		backgroundColor: COLORS.ghostYellow,
		borderColor: "rgba(255,255,255,0.0)",
	  },
	  pillInactive: {
		backgroundColor: "rgba(0,0,0,0.35)",
		borderColor: "rgba(255,255,255,0.22)",
	  },
	  pillText: {
		fontWeight: "700",
		letterSpacing: 0.6,
	  },
	  pillTextActive: { color: "#1f2937" },
	  pillTextInactive: { color: "rgba(255,255,255,0.90)" },

	  form: { width: "100%", maxWidth: 520, marginTop: 2 },
	  label: {
		color: "#f5f5f5",
		fontSize: 12,
		letterSpacing: 1.2,
		fontWeight: "700",
		textTransform: "uppercase",
		marginBottom: 6,
	  },
	  input: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.18)",
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: COLORS.inputBg,
		color: "#f9fafb",
		fontSize: 15,
	  },

	  passwordRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	  passwordInput: { flex: 1 },
	  showBtn: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.30)",
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: "transparent",
	  },
	  showBtnText: {
		color: "#f9fafb",
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.2,
	  },

	  button: {
		marginTop: 14,
		borderRadius: 999,
		paddingVertical: 14,
		paddingHorizontal: 18,
		backgroundColor: COLORS.burntRed,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.45,
		shadowRadius: 16,
		elevation: 8,
	  },
	  buttonPressed: {
		backgroundColor: COLORS.coolGray,
	  },
	  buttonText: {
		color: "#fff8f1",
		fontSize: 13,
		fontWeight: "900",
		letterSpacing: 2.0,
		textTransform: "uppercase",
	  },

	  hint: {
		marginTop: 10,
		color: "rgba(241, 245, 249, 0.75)",
		fontSize: 12,
		textAlign: "center",
	  },
	});