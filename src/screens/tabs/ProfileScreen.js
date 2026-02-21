// src/screens/tabs/ProfileScreen.js
import { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { decode } from "base64-arraybuffer";
import mime from "mime";

import Screen from "../../components/Screen";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { colors } from "../../theme/colors"; // ✅ use your theme

function stripHtml(s = "") {
  return String(s).replace(/<\/?[^>]+(>|$)/g, "").trim();
}

// Only allow common image types
function normalizeImageMeta(inputUri, asset) {
  const contentType = asset?.mimeType || mime.getType(inputUri) || "image/jpeg";

  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ]);

  const safeContentType = allowed.has(contentType) ? contentType : "image/jpeg";
  const ext = mime.getExtension(safeContentType) || "jpg";
  return { contentType: safeContentType, ext };
}

// vCard folding
function foldVCardLine(line, maxLen = 75) {
  const out = [];
  let s = line;
  while (s.length > maxLen) {
    out.push(s.slice(0, maxLen));
    s = " " + s.slice(maxLen);
  }
  out.push(s);
  return out.join("\r\n");
}

async function ensureFileUri(uri) {
  if (!uri) return uri;
  if (!uri.startsWith("content://")) return uri;

  const ext = (mime.getExtension(mime.getType(uri) || "") || "jpg").replace(".", "");
  const dest = `${FileSystem.cacheDirectory}picked-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

async function uriToBase64(uri) {
  const fileUri = await ensureFileUri(uri);
  return FileSystem.readAsStringAsync(fileUri, { encoding: "base64" });
}

async function downloadUrlToBase64(url) {
  const ext = (mime.getExtension(mime.getType(url) || "") || "jpg").replace(".", "");
  const dest = `${FileSystem.cacheDirectory}avatar-${Date.now()}.${ext}`;
  const dl = await FileSystem.downloadAsync(url, dest);
  return FileSystem.readAsStringAsync(dl.uri, { encoding: "base64" });
}

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadProfile() {
    setLoading(true);

    const { data, error } = await supabase
      .from("attendees")
      .select("id,email,name,phone,bio,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      Alert.alert("Error loading profile", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setName(data.name || "");
      setPhone(data.phone || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || null);
    } else {
      await supabase.from("attendees").upsert({
        id: user.id,
        email: user.email,
        name: "",
        phone: "",
        bio: "",
        avatar_url: null,
        created_from: "app",
      });
    }

    setLoading(false);
  }

  async function saveProfile() {
    if (!user?.id) return;

    setSaving(true);
    const { error } = await supabase.from("attendees").upsert({
      id: user.id,
      email: user.email,
      name,
      phone,
      bio,
      avatar_url: avatarUrl,
      created_from: "app",
    });

    setSaving(false);

    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Success", "Profile updated!");
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Please enable photo access in Settings to upload a profile photo.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: false,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      await uploadImage(asset);
    } catch (e) {
      Alert.alert("Upload error", e?.message || "Failed to pick image.");
    }
  }

  async function takePhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Please enable camera access in Settings to take a profile photo.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: false,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      await uploadImage(asset);
    } catch (e) {
      Alert.alert("Camera error", e?.message || "Failed to take photo.");
    }
  }

  const choosePhotoSource = () => {
    Alert.alert(
      "Profile Photo",
      "Choose a source",
      [
        { text: "Camera", onPress: () => takePhoto() },
        { text: "Photo Library", onPress: () => pickImage() },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  async function uploadImage(input) {
    if (!user?.id) return;

    setUploading(true);
    try {
      const uri = typeof input === "string" ? input : input?.uri;
      const asset = typeof input === "object" ? input : null;
      if (!uri) throw new Error("No image URI provided.");

      const { contentType, ext } = normalizeImageMeta(uri, asset);
      const path = `avatars/${user.id}.${ext}`;

      const base64 = await uriToBase64(uri);
      const arrayBuffer = decode(base64);
      const bytes = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("uploads-public")
        .upload(path, bytes, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("uploads-public").getPublicUrl(path);
      const publicUrl = data?.publicUrl || null;

      setAvatarUrl(publicUrl);

      await supabase.from("attendees").upsert({
        id: user.id,
        email: user.email,
        avatar_url: publicUrl,
        created_from: "app",
      });
    } catch (e) {
      Alert.alert("Upload error", e?.message || "Network request failure.");
    } finally {
      setUploading(false);
    }
  }

  const vCardTextOnly = useMemo(() => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${(name || "").replace(/\n/g, " ").trim()}`,
      user?.email ? `EMAIL:${user.email}` : "",
      phone ? `TEL:${phone}` : "",
      bio ? `NOTE:${stripHtml(bio).replace(/\n/g, " ").trim()}` : "",
      "END:VCARD",
    ].filter(Boolean);

    return lines.join("\r\n");
  }, [name, phone, bio, user?.email]);

  async function generateVCardWithPhotoIfPossible() {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${(name || "").replace(/\n/g, " ").trim()}`,
      user?.email ? `EMAIL:${user.email}` : "",
      phone ? `TEL:${phone}` : "",
      bio ? `NOTE:${stripHtml(bio).replace(/\n/g, " ").trim()}` : "",
    ].filter(Boolean);

    if (avatarUrl) {
      try {
        const b64 = await downloadUrlToBase64(avatarUrl);
        const photoLine = `PHOTO;ENCODING=b;TYPE=JPEG:${b64}`;
        lines.push(foldVCardLine(photoLine));
      } catch {}
    }

    lines.push("END:VCARD");
    return lines.join("\r\n");
  }

  async function downloadVCard() {
    try {
      const vcard = await generateVCardWithPhotoIfPossible();
      const path = FileSystem.documentDirectory + "contact.vcf";

      await FileSystem.writeAsStringAsync(path, vcard, { encoding: "utf8" });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "Sharing is not available on this device.");
        return;
      }

      await Sharing.shareAsync(path, {
        mimeType: "text/x-vcard",
        dialogTitle: "Share vCard",
        UTI: "public.vcard",
      });
    } catch (e) {
      Alert.alert("vCard error", e?.message || "Failed to generate vCard.");
    }
  }

  if (loading) {
    return (
      <Screen>
        <SafeAreaView style={styles.loadingWrap}>
          <Text style={styles.whiteText}>Loading...</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Profile</Text>

          {/* ✅ View My Schedule */}
          <Pressable
            style={styles.scheduleBtn}
            onPress={() => navigation?.navigate?.("MySchedule")}
          >
            <Text style={styles.scheduleBtnText}>View My Schedule</Text>
          </Pressable>

          {/* Avatar */}
          <Pressable onPress={choosePhotoSource} disabled={uploading} style={{ alignSelf: "center" }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {uploading ? "Uploading..." : "Upload photo"}
                </Text>
              </View>
            )}
            {uploading ? <Text style={styles.subtleWhite}>Uploading…</Text> : null}
          </Pressable>

          {/* Inputs */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Your name"
            placeholderTextColor={"rgba(0,0,0,0.45)"}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            placeholder="(555) 555-5555"
            placeholderTextColor={"rgba(0,0,0,0.45)"}
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "phone-pad"}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            placeholder="A short bio you’d like other attendees to see..."
            placeholderTextColor={"rgba(0,0,0,0.45)"}
            value={bio}
            onChangeText={setBio}
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            multiline
          />

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              style={[styles.primaryBtn, saving ? { opacity: 0.7 } : null]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.primaryText}>{saving ? "Saving..." : "Save Profile"}</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={signOut}>
              <Text style={styles.secondaryText}>Log Out</Text>
            </Pressable>
          </View>

          {/* QR */}
          <View style={{ marginTop: 26 }}>
            <Text style={styles.sectionTitle}>My QR Contact Card</Text>
            <Text style={styles.sectionSub}>
              Let another attendee scan this to save your contact info.
            </Text>

            <View style={{ alignItems: "center", marginTop: 12 }}>
              <View style={styles.qrWrap}>
                <QRCode value={vCardTextOnly} size={220} />
              </View>

              <Pressable style={[styles.secondaryBtn, { marginTop: 14 }]} onPress={downloadVCard}>
                <Text style={styles.secondaryText}>Download vCard (.VCF)</Text>
              </Pressable>
            </View>
          </View>

          {/* Email */}
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Email</Text>
            <Text style={styles.sectionSub}>
              Changing your email may require confirmation via email.
            </Text>
            <View style={[styles.input, { justifyContent: "center" }]}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>
                {user?.email || "Unknown"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { padding: 20, backgroundColor: colors.slateGray, flex: 1 },
  whiteText: { color: "#fff", fontWeight: "800" },

  container: {
    padding: 20,
    gap: 10,
    backgroundColor: colors.slateGray, // ✅ grey background everywhere
    flexGrow: 1,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
    color: "#fff", // ✅ white title
    textAlign: "center",
    textTransform: "uppercase",
  },

  scheduleBtn: {
    alignSelf: "center",
    backgroundColor: colors.cnigaRed,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  scheduleBtnText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  avatar: {
    width: 180,
    height: 180,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
  },

  subtleWhite: {
    marginTop: 8,
    textAlign: "center",
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },

  label: {
    marginTop: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.95,
    color: "#fff", // ✅ white labels
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 14,
    borderRadius: 16,
    color: "#111827", // ✅ dark text IN input
    fontWeight: "700",
  },

  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: colors.cnigaRed,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  sectionTitle: {
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 16,
    color: "#fff", // ✅ white
  },
  sectionSub: {
    marginTop: 6,
    opacity: 0.9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)", // ✅ white-ish
  },

  qrWrap: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 14,
    borderRadius: 18,
  },
});