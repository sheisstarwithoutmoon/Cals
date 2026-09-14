import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_PAGES } from "@/lib/constants";
import type { Pagination } from "@/lib/types/api";

interface MealPaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function MealPagination({
  pagination,
  onPageChange,
}: MealPaginationProps) {
  const totalPages = Math.min(pagination.totalPages, MAX_PAGES);
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, pagination.page), totalPages);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages} ·{" "}
        {pagination.total} meals
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
