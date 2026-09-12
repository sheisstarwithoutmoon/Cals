import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Pagination } from "@/lib/types/api";

interface MealPaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function MealPagination({
  pagination,
  onPageChange,
}: MealPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} ·{" "}
        {pagination.total} meals
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
