export default function ClearFilters({
  params,
  onParams,
}: {
  params: URLSearchParams;
  onParams: (changes: Record<string, string>) => void;
}) {
  const keys = [...params.keys()].filter(
    (key) => !["view", "page", "compose"].includes(key),
  );
  if (!keys.length) return null;
  return (
    <button
      type="button"
      className="text-button clear-filters"
      onClick={() =>
        onParams(
          Object.fromEntries([...keys.map((key) => [key, ""]), ["page", "0"]]),
        )
      }
    >
      Limpiar filtros
    </button>
  );
}
