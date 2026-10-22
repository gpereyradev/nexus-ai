const paths: Record<string, string> = {
  home: "M3 3h7v7H3z M14 3h7v11h-7z M3 14h7v7H3z M14 18h7v3h-7z",
  sales: "M4 7h16v14H4z M8 7V5a4 4 0 0 1 8 0v2 M9 13h6 M12 10v6",
  inventory: "m12 3 9 5-9 5-9-5 9-5z M3 8v10l9 5 9-5V8 M12 13v10 M7 5l10 5",
  analytics: "M4 20V4 M4 20h17 M8 15l4-5 4 3 5-8",
  products: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  customers:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.9",
  categories: "M3 4h7l11 11-6 6L3 9V4z M7 7h.01",
  users: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M19 5l-1.5 1.5 M6.5 17.5 5 19",
  moon: "M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  logout: "M10 4H4v16h6 M10 12h11 M16 7l5 5-5 5",
};
export default function Icon({ name }: { name: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.home} />
    </svg>
  );
}
