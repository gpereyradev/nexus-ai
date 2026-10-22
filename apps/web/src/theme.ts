export type Theme = "light" | "dark";
export const THEME_KEY = "nexus-theme";
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* The theme still works when browser storage is unavailable. */
  }
  return "dark";
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* Session-only preference. */
  }
}
applyTheme(readTheme());
