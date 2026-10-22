import { useState } from "react";
import { readTheme, saveTheme } from "../theme";
import Icon from "./Icon";
export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Activar tema ${next === "dark" ? "oscuro" : "claro"}`}
      onClick={() => {
        saveTheme(next);
        setTheme(next);
      }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
      <span>{theme === "dark" ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
