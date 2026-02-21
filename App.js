import React, { useEffect } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import * as Linking from "expo-linking";

import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { supabase } from "./src/lib/supabaseClient";

// Handles cniga://auth-callback links and applies the Supabase session
function SupabaseDeepLinkHandler({ navigationRef }) {
  useEffect(() => {
    const handleUrl = async (url) => {
      if (!url) return;

      try {
        // 1) Code-based flow (PKCE)
        const parsed = Linking.parse(url);
        const code = parsed?.queryParams?.code;

        if (code && typeof code === "string") {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn("exchangeCodeForSession error:", error.message);
          return;
        }

        // 2) Token-based flow fallback
        const extractParams = (rawUrl) => {
          const out = {};
          const qIndex = rawUrl.indexOf("?");
          const hIndex = rawUrl.indexOf("#");

          const query =
            qIndex >= 0 ? rawUrl.slice(qIndex + 1, hIndex >= 0 ? hIndex : undefined) : "";
          const hash = hIndex >= 0 ? rawUrl.slice(hIndex + 1) : "";

          const parsePart = (part) => {
            if (!part) return;
            part.split("&").forEach((pair) => {
              const [k, v] = pair.split("=");
              if (!k) return;
              out[decodeURIComponent(k)] = decodeURIComponent(v || "");
            });
          };

          parsePart(query);
          parsePart(hash);
          return out;
        };

        const params = extractParams(url);
        const access_token = params.access_token;
        const refresh_token = params.refresh_token;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) console.warn("setSession error:", error.message);
          return;
        }
      } catch (e) {
        console.warn("Deep link handling failed:", e?.message || e);
      }
    };

    // Cold start
    Linking.getInitialURL().then(handleUrl);

    // While app is running
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      console.log("AUTH EVENT:", event);

      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery flow triggered");

        // navigationRef may not be ready immediately on cold start
        if (navigationRef?.isReady?.()) {
          navigationRef.navigate("ResetPassword");
        } else {
          // fallback: wait a tick
          setTimeout(() => navigationRef?.navigate?.("ResetPassword"), 250);
        }
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, [navigationRef]);

  return null;
}

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <AuthProvider>
      <SupabaseDeepLinkHandler navigationRef={navigationRef} />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}