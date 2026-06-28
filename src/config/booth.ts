// Photo booth configuration.
// Edit these to change who receives the photos and which AI theme is used.

/** The email address that receives the original + AI photos after every capture. */
export const OWNER_EMAIL = "yhad890@gmail.com";

/** Active theme key — must match a theme defined in supabase/functions/photo-booth/index.ts */
export const DEFAULT_THEME = "pilot";

/** Themes available in the UI. Keys must match the server-side THEMES map. */
export const THEMES: { key: string; label: string; emoji: string }[] = [
  { key: "pilot", label: "טייס אל על", emoji: "✈️" },
  { key: "astronaut", label: "אסטרונאוט", emoji: "🚀" },
  { key: "chef", label: "שף", emoji: "👨‍🍳" },
];
