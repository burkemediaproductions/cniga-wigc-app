import { StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export const ui = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.cnigaRed,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // “ghost yellow” content panels (like Schedule + Welcome)
  panel: {
    backgroundColor: "rgba(255, 236, 205, 0.92)",
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  // Dark modern input (like your web search input)
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.cardDark,
    color: colors.text,
  },
});
