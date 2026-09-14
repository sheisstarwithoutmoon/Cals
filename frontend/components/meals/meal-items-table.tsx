import { cn } from "cn";

import { formatNumber } from "@/lib/format";
import type { MealItemInput } from "@/lib/types/api";

const ITEM_COLUMNS = [
  { key: "calories", label: "Calories (kcal)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "fiber", label: "Fiber (g)" },
  { key: "sugar", label: "Sugar (g)" },
  { key: "sodium", label: "Sodium (mg)" },
] as const;

interface MealItemsTableProps {
  items: MealItemInput[];
  className?: string;
}

/**
 * Read-only table of a meal's items with every nutrition value, shared by
 * the PDF import review and the Scan food result. Scrolls sideways on narrow
 * screens instead of squeezing or clipping the numbers.
 */
export function MealItemsTable({ items, className }: MealItemsTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Item</th>
            <th className="px-3 py-2 text-left font-medium">Quantity</th>
            {ITEM_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="px-3 py-2 text-right font-medium whitespace-nowrap"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-2 font-medium break-words text-foreground">{item.name}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {item.quantity != null
                  ? `${formatNumber(item.quantity, 2)}${item.quantityUnit ? ` ${item.quantityUnit}` : ""}`
                  : "-"}
              </td>
              {ITEM_COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className="px-3 py-2 text-right text-foreground tabular-nums"
                >
                  {formatNumber(item[column.key], 1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
