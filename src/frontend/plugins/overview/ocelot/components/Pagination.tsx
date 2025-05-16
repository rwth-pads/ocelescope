import usePagination from "@/hooks/usePagination";
import { useCallback, useMemo } from "react";

import BSPagination from "react-bootstrap/Pagination";

const Pagination: React.FC<{ totalPages: number; windowSize?: number }> = ({
  totalPages,
  windowSize = 10,
}) => {
  const { handlePageChange, currentPage } = usePagination();

  const pages = useMemo(() => {
    const half = Math.floor(windowSize / 2);
    let start = Math.max(currentPage - half, 1);
    const end = Math.min(start + windowSize - 1, totalPages);

    if (end - start + 1 < windowSize) {
      start = Math.max(end - windowSize + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [windowSize, currentPage]);

  return (
    <div className="flex justify-center">
      <BSPagination>
        <BSPagination.First
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        />
        <BSPagination.Prev
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />
        {pages.map((page) => (
          <BSPagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </BSPagination.Item>
        ))}
        <BSPagination.Next
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
        <BSPagination.Last
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        />
      </BSPagination>
    </div>
  );
};

export default Pagination;
