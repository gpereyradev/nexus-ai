import type { Page } from "../api/operations";
export default function Pagination({
  data,
  onPage,
}: {
  data: Pick<Page<unknown>, "page" | "totalPages">;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        Página {data.page + 1} de {Math.max(1, data.totalPages)}
      </span>
      <button
        className="secondary"
        disabled={data.page === 0}
        onClick={() => onPage(data.page - 1)}
      >
        Anterior
      </button>
      <button
        className="secondary"
        disabled={data.page + 1 >= data.totalPages}
        onClick={() => onPage(data.page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
