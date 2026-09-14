"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ChevronDownIcon,
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UtensilsIcon,
} from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MealPhotoField } from "@/components/meals/meal-photo-field";
import { MEAL_TYPE_META } from "@/components/meals/meal-type-meta";
import { analyzeImage, extractNutrition, type ExtractedNutrition } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "@/lib/constants";
import { formatNumber, toDateInputValue } from "@/lib/format";
import type {
  AttachmentType,
  MealEntry,
  MealInput,
  MealItemInput,
  MealType,
} from "@/lib/types/api";

interface MealFormDialogProps {
  meal?: MealEntry;
  /** Pre-fills a NEW meal (e.g. from AI photo analysis) instead of editing an existing one. */
  prefillData?: ExtractedNutrition | null;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultConsumedAt?: Date;
  onSaved?: (meal: MealEntry) => void;
  /**
   * Draft mode: hands the edited meal back instead of saving it to the API
   * (used to edit PDF-import drafts before they're added).
   */
  onSubmitDraft?: (payload: MealInput) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const NUTRIENT_FIELDS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
] as const;

type NutrientField = (typeof NUTRIENT_FIELDS)[number];

const MICRO_FIELD_KEYS = {
  vitaminA: "Vitamin A (mcg)",
  vitaminC: "Vitamin C (mg)",
  calcium: "Calcium (mg)",
  iron: "Iron (mg)",
  potassium: "Potassium (mg)",
} as const;

type MicroField = keyof typeof MICRO_FIELD_KEYS;

const MICRO_FIELDS = Object.keys(MICRO_FIELD_KEYS) as MicroField[];

/** Per-item nutrition snapshot that quantity changes multiply against. */
interface ItemBase extends Record<NutrientField, number> {
  quantity: number;
}

interface ItemFormState extends Record<NutrientField | MicroField, string> {
  key: string;
  name: string;
  quantity: string;
  quantityUnit: string;
  base: ItemBase;
}

interface FormState {
  mealType: MealType;
  foodName: string;
  consumedAt: string;
  attachmentUrl: string;
  attachmentType: AttachmentType | "";
  items: ItemFormState[];
}

type ItemErrors = Record<string, { name?: string; calories?: string }>;

let itemKeyCounter = 0;

function nextItemKey() {
  itemKeyCounter += 1;
  return `item-${itemKeyCounter}`;
}

function toText(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function toOptionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function roundTo1(value: number) {
  return Math.round(value * 10) / 10;
}

function captureBase(item: Omit<ItemFormState, "base" | "key">): ItemBase {
  const quantity = Number(item.quantity);
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    ...(Object.fromEntries(
      NUTRIENT_FIELDS.map((field) => [field, Number(item[field]) || 0])
    ) as Record<NutrientField, number>),
  };
}

function buildItem(values: Partial<MealItemInput> = {}): ItemFormState {
  const micro = values.micronutrients ?? {};
  const fields = {
    name: values.name ?? "",
    quantity: toText(values.quantity),
    quantityUnit: values.quantityUnit ?? "",
    calories: toText(values.calories),
    protein: toText(values.protein),
    carbs: toText(values.carbs),
    fat: toText(values.fat),
    fiber: toText(values.fiber),
    sugar: toText(values.sugar),
    sodium: toText(values.sodium),
    ...(Object.fromEntries(
      MICRO_FIELDS.map((field) => [field, toText(micro[MICRO_FIELD_KEYS[field]])])
    ) as Record<MicroField, string>),
  };

  return { key: nextItemKey(), ...fields, base: captureBase(fields) };
}

function isBlankItem(item: ItemFormState) {
  return (
    !item.name.trim() &&
    [...NUTRIENT_FIELDS, ...MICRO_FIELDS].every((field) => !item[field].trim())
  );
}

/**
 * A meal logged before per-item tracking (or a photo scan, which returns one
 * combined result) has no items, so it's shown as a single item carrying the
 * meal's own name and totals.
 */
function singleItemFrom(source: MealEntry | ExtractedNutrition) {
  return buildItem({
    name: source.foodName,
    quantity: source.quantity,
    quantityUnit: source.quantityUnit,
    calories: source.calories,
    protein: source.protein,
    carbs: source.carbs,
    fat: source.fat,
    fiber: source.fiber,
    sugar: source.sugar,
    sodium: source.sodium,
    micronutrients: source.micronutrients,
  });
}

function buildInitialState(
  meal: MealEntry | undefined,
  defaultConsumedAt?: Date,
  prefillData?: ExtractedNutrition | null
): FormState {
  if (meal) {
    return {
      mealType: meal.mealType,
      foodName: meal.foodName,
      consumedAt: toDateInputValue(meal.consumedAt),
      attachmentUrl: meal.attachmentUrl ?? "",
      attachmentType: meal.attachmentType ?? "",
      items: meal.items?.length ? meal.items.map(buildItem) : [singleItemFrom(meal)],
    };
  }

  if (prefillData) {
    return {
      mealType: prefillData.mealType ?? "BREAKFAST",
      foodName: prefillData.foodName ?? "",
      consumedAt: toDateInputValue(defaultConsumedAt ?? new Date()),
      attachmentUrl: prefillData.attachmentUrl ?? "",
      attachmentType: prefillData.attachmentType ?? "",
      items: prefillData.items?.length
        ? prefillData.items.map(buildItem)
        : [singleItemFrom(prefillData)],
    };
  }

  return {
    mealType: "BREAKFAST",
    foodName: "",
    consumedAt: toDateInputValue(defaultConsumedAt ?? new Date()),
    attachmentUrl: "",
    attachmentType: "",
    items: [buildItem()],
  };
}

function sumItems(items: ItemFormState[]) {
  return Object.fromEntries(
    NUTRIENT_FIELDS.map((field) => [
      field,
      items.reduce((sum, item) => sum + (toOptionalNumber(item[field]) ?? 0), 0),
    ])
  ) as Record<NutrientField, number>;
}

function toItemInput(item: ItemFormState): MealItemInput {
  const micronutrients: Record<string, number> = {};
  for (const field of MICRO_FIELDS) {
    const value = toOptionalNumber(item[field]);
    if (value != null) micronutrients[MICRO_FIELD_KEYS[field]] = value;
  }

  return {
    name: item.name.trim(),
    quantity: toOptionalNumber(item.quantity) ?? null,
    quantityUnit: item.quantityUnit.trim() || null,
    calories: Number(item.calories),
    protein: toOptionalNumber(item.protein) ?? null,
    carbs: toOptionalNumber(item.carbs) ?? null,
    fat: toOptionalNumber(item.fat) ?? null,
    fiber: toOptionalNumber(item.fiber) ?? null,
    sugar: toOptionalNumber(item.sugar) ?? null,
    sodium: toOptionalNumber(item.sodium) ?? null,
    micronutrients: Object.keys(micronutrients).length ? micronutrients : null,
  };
}

function FormSection({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Compact labeled input used inside item rows, where columns are narrow. */
function ItemField({
  id,
  label,
  value,
  onChange,
  type = "number",
  placeholder,
  error,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label htmlFor={id} className="text-xs leading-tight text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? 0 : undefined}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 px-2.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function MealFormDialog({
  meal,
  prefillData,
  trigger,
  open,
  onOpenChange,
  defaultConsumedAt,
  onSaved,
  onSubmitDraft,
  title,
  description,
  submitLabel,
}: MealFormDialogProps) {
  const isEditing = Boolean(meal);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(meal, defaultConsumedAt, prefillData)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // The food name the current items' nutrition belongs to (a saved or
  // imported meal, or the last AI estimate). While the name still matches,
  // "Estimate with AI" only splits the meal and keeps its totals.
  const [itemsSourceName, setItemsSourceName] = useState<string | null>(null);
  const formId = useId();

  useEffect(() => {
    if (isOpen) {
      const initial = buildInitialState(meal, defaultConsumedAt, prefillData);
      setForm(initial);
      setItemsSourceName(sumItems(initial.items).calories > 0 ? initial.foodName : null);
      setExpandedItems(new Set());
      setFormError(null);
      setFieldErrors({});
      setItemErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, meal?.id, prefillData]);

  function setOpen(value: boolean) {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  }

  function updateField<K extends Exclude<keyof FormState, "items">>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(key: string, update: (item: ItemFormState) => ItemFormState) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? update(item) : item)),
    }));
    setItemErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateItemText(key: string, field: "name" | "quantityUnit" | MicroField, value: string) {
    updateItem(key, (item) => ({ ...item, [field]: value }));
  }

  /**
   * Quantity is a live multiplier: rescales this item's nutrition from its
   * last captured per-quantity base, rather than leaving the values frozen
   * at a now-stale quantity.
   */
  function updateItemQuantity(key: string, value: string) {
    updateItem(key, (item) => {
      const nextQuantity = Number(value);
      if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
        return { ...item, quantity: value };
      }

      const ratio = nextQuantity / item.base.quantity;
      const scaled = Object.fromEntries(
        NUTRIENT_FIELDS.map((field) => [
          field,
          field === "calories"
            ? String(Math.round(item.base.calories * ratio))
            : String(roundTo1(item.base[field] * ratio)),
        ])
      ) as Record<NutrientField, string>;

      return { ...item, quantity: value, ...scaled };
    });
  }

  /** Editing a nutrition value directly re-bases future quantity scaling on it. */
  function updateItemNutrient(key: string, field: NutrientField, value: string) {
    updateItem(key, (item) => {
      const next = { ...item, [field]: value };
      return { ...next, base: captureBase(next) };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, buildItem()] }));
  }

  function removeItem(key: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.key !== key),
    }));
  }

  function toggleItemExpanded(key: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const normalizedName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const keepsTotals =
    itemsSourceName !== null &&
    normalizedName(form.foodName) === normalizedName(itemsSourceName) &&
    sumItems(form.items).calories > 0;

  async function handleEstimateWithAi() {
    if (!form.foodName.trim()) {
      setFormError("Enter what you ate first, then estimate with AI.");
      return;
    }

    setFormError(null);
    setIsEstimating(true);

    const description = form.foodName.trim();
    const currentTotals = sumItems(form.items);
    const shouldKeepTotals = keepsTotals;

    try {
      const { data } = await extractNutrition({
        description,
        targetTotals: shouldKeepTotals
          ? {
              calories: Math.round(currentTotals.calories),
              protein: roundTo1(currentTotals.protein),
              carbs: roundTo1(currentTotals.carbs),
              fat: roundTo1(currentTotals.fat),
              fiber: roundTo1(currentTotals.fiber),
              sugar: roundTo1(currentTotals.sugar),
              sodium: roundTo1(currentTotals.sodium),
            }
          : undefined,
      });
      const items = data.items?.length ? data.items.map(buildItem) : [singleItemFrom(data)];

      setForm((prev) => ({
        ...prev,
        // An existing meal keeps its type; only a fresh estimate suggests one.
        mealType: shouldKeepTotals ? prev.mealType : data.mealType ?? prev.mealType,
        items,
      }));
      setItemsSourceName(description);
      setItemErrors({});
      setExpandedItems(new Set());

      const itemLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;
      toast.success(
        shouldKeepTotals
          ? `Split into ${itemLabel}, keeping this meal's totals.`
          : `Filled in ${itemLabel} with AI. Review before saving.`
      );
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Couldn't estimate nutrition. Please try again."
      );
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleAutoScanPhoto(dataUrl: string, uploadedUrl: string) {
    if (isEditing) return;

    setIsScanningPhoto(true);
    try {
      const response = await analyzeImage({
        imageBase64: dataUrl,
        mimeType: "image/jpeg",
      });

      const extracted = response.data;
      if (!extracted) return;

      const scannedItems = extracted.items?.length
        ? extracted.items.map(buildItem)
        : [singleItemFrom(extracted)];

      setForm((prev) => ({
        ...prev,
        attachmentUrl: uploadedUrl,
        attachmentType: "IMAGE",
        foodName: extracted.foodName || prev.foodName,
        mealType: extracted.mealType ?? prev.mealType,
        items: scannedItems,
      }));

      setItemsSourceName(extracted.foodName || null);
      setItemErrors({});
      setExpandedItems(new Set());

      const itemLabel = `${scannedItems.length} ${scannedItems.length === 1 ? "item" : "items"}`;
      toast.success(`Scanned photo with AI and filled in ${itemLabel}.`);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't identify foods from this photo. You can still enter details manually."
      );
    } finally {
      setIsScanningPhoto(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Untouched extra rows are dropped rather than failing validation.
    const items = form.items.filter((item) => !isBlankItem(item));
    const errors: ItemErrors = {};

    for (const item of items) {
      const calories = toOptionalNumber(item.calories);
      const itemError: ItemErrors[string] = {};
      if (!item.name.trim()) itemError.name = "Required";
      if (calories == null || calories < 0) itemError.calories = "Required";
      if (itemError.name || itemError.calories) errors[item.key] = itemError;
    }

    setItemErrors(errors);

    if (!items.length) {
      setFormError("Add at least one item with a name and calories.");
      return;
    }

    if (Object.keys(errors).length) {
      setFormError("Every item needs a name and calories.");
      return;
    }

    const itemInputs = items.map(toItemInput);
    const totals = sumItems(items);

    const payload: MealInput = {
      mealType: form.mealType,
      foodName: form.foodName.trim() || itemInputs.map((item) => item.name).join(", "),
      calories: Math.round(totals.calories),
      protein: roundTo1(totals.protein),
      carbs: roundTo1(totals.carbs),
      fat: roundTo1(totals.fat),
      fiber: roundTo1(totals.fiber),
      sugar: roundTo1(totals.sugar),
      sodium: roundTo1(totals.sodium),
      items: itemInputs,
      // When editing, an explicit null removes a photo the user took off.
      attachmentUrl: form.attachmentUrl || (isEditing ? null : undefined),
      attachmentType: form.attachmentType || (isEditing ? null : undefined),
      consumedAt: new Date(form.consumedAt).toISOString(),
    };

    if (onSubmitDraft) {
      onSubmitDraft(payload);
      setOpen(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditing
        ? await mealsApi.updateMeal(meal!.id, payload)
        : await mealsApi.createMeal(payload);

      toast.success(isEditing ? "Meal updated" : "Meal logged");
      onSaved?.(result.meal);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const photoUrl = form.attachmentType === "IMAGE" ? form.attachmentUrl || null : null;
  const hasPdfSource = form.attachmentType === "PDF" && Boolean(form.attachmentUrl);
  const totals = sumItems(form.items);
  const hasAnyCalories = form.items.some((item) => item.calories.trim() !== "");

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-2xl bg-card p-0 sm:max-w-[min(64rem,calc(100%-3rem))]">
        <DialogHeader className="flex-row items-center gap-3 border-b border-border/70 px-5 py-4 pr-12 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
            <UtensilsIcon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold">
              {title ?? (isEditing ? "Edit meal" : "Log meal")}
            </DialogTitle>
            <DialogDescription>
              {description ??
                (isEditing
                  ? "Update this meal and the items in it."
                  : "Add what you ate, item by item, with a photo if you have one.")}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form
          id={formId}
          className="min-h-0 space-y-4 overflow-y-auto bg-muted/40 px-4 py-4 sm:px-6 sm:py-5 lg:space-y-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <FormSection
              title="Photo"
              description="Optional. Shown next to this meal in your log."
              className="min-w-0"
            >
              <MealPhotoField
                photoUrl={photoUrl}
                isScanning={isScanningPhoto}
                onUploadingChange={setIsPhotoUploading}
                onPhotoUploaded={handleAutoScanPhoto}
                onChange={(url) =>
                  setForm((prev) => ({
                    ...prev,
                    attachmentUrl: url ?? "",
                    attachmentType: url ? "IMAGE" : "",
                  }))
                }
              />
              {hasPdfSource && (
                <a
                  href={form.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-[#E7F0EA] p-2.5 transition-colors hover:bg-[#dbe9df]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
                    <FileTextIcon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground">
                      Imported from a PDF
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Open the original file. Adding a photo replaces this link.
                    </span>
                  </span>
                </a>
              )}
            </FormSection>

            <FormSection title="Details" className="min-w-0">
              <div className="space-y-1.5">
                <Label id={`${formId}-meal-type`}>Meal type</Label>
                <div
                  role="radiogroup"
                  aria-labelledby={`${formId}-meal-type`}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {MEAL_TYPES.map((type) => {
                    const meta = MEAL_TYPE_META[type];
                    const Icon = meta.icon;
                    const isActive = form.mealType === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => updateField("mealType", type)}
                        className={cn(
                          "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          isActive
                            ? "border-primary/50 bg-[#E7F0EA] text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full",
                            meta.iconClassName
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="max-w-full break-words">{MEAL_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-consumed-at`}>Consumed at</Label>
                <Input
                  id={`${formId}-consumed-at`}
                  type="datetime-local"
                  value={form.consumedAt}
                  max={toDateInputValue(new Date())}
                  onChange={(event) => updateField("consumedAt", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-food-name`}>Food name</Label>
                <Input
                  id={`${formId}-food-name`}
                  value={form.foodName}
                  onChange={(event) => updateField("foodName", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.foodName)}
                  placeholder="Dal, 2 roti, rice"
                />
                {fieldErrors.foodName ? (
                  <p className="text-xs text-destructive">{fieldErrors.foodName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {keepsTotals
                      ? "AI splits this meal into its items and keeps the current totals. Change the name to estimate from scratch."
                      : "List everything in this meal, separated by commas. AI splits it into items."}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleEstimateWithAi}
                disabled={isEstimating || !form.foodName.trim()}
                className="h-auto min-h-9 w-full rounded-full border-primary/40 py-2 whitespace-normal text-primary hover:bg-[#E7F0EA] hover:text-primary"
              >
                {isEstimating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                <span>
                  {isEstimating
                    ? keepsTotals
                      ? "Splitting into items..."
                      : "Estimating each item..."
                    : keepsTotals
                      ? "Split into items with AI"
                      : "Estimate nutrition with AI"}
                </span>
              </Button>
            </FormSection>
          </div>

          <FormSection
            title={`Items (${form.items.length})`}
            description="Nutrition is for the quantity shown. Changing a quantity rescales that item."
            action={
              <p className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {formatNumber(totals.calories)}
                </span>{" "}
                kcal · P{formatNumber(totals.protein)} · C{formatNumber(totals.carbs)} · F
                {formatNumber(totals.fat)}
              </p>
            }
          >
            <div className="space-y-3">
              {form.items.map((item, index) => {
                const idPrefix = `${formId}-item-${item.key}`;
                const isExpanded = expandedItems.has(item.key);
                const errors = itemErrors[item.key];

                return (
                  <div
                    key={item.key}
                    className="rounded-xl border border-border bg-muted/25 p-3 sm:p-3.5"
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="min-w-0 text-xs font-semibold text-muted-foreground">
                        Item {index + 1}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={isExpanded}
                          onClick={() => toggleItemExpanded(item.key)}
                          className="h-7 rounded-full px-2.5 text-xs text-muted-foreground"
                        >
                          More nutrients
                          <ChevronDownIcon
                            className={cn("transition-transform", isExpanded && "rotate-180")}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove item ${index + 1}`}
                          disabled={form.items.length === 1}
                          onClick={() => removeItem(item.key)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))]">
                      <ItemField
                        id={`${idPrefix}-name`}
                        label="Name"
                        type="text"
                        placeholder="e.g. Roti"
                        value={item.name}
                        error={errors?.name}
                        onChange={(value) => updateItemText(item.key, "name", value)}
                        className="col-span-2 sm:col-span-3 lg:col-span-1"
                      />
                      <ItemField
                        id={`${idPrefix}-quantity`}
                        label="Quantity"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(value) => updateItemQuantity(item.key, value)}
                      />
                      <ItemField
                        id={`${idPrefix}-unit`}
                        label="Unit"
                        type="text"
                        placeholder="serving"
                        value={item.quantityUnit}
                        onChange={(value) => updateItemText(item.key, "quantityUnit", value)}
                      />
                      <ItemField
                        id={`${idPrefix}-calories`}
                        label="Calories (kcal)"
                        placeholder="0"
                        value={item.calories}
                        error={errors?.calories}
                        onChange={(value) => updateItemNutrient(item.key, "calories", value)}
                      />
                      <ItemField
                        id={`${idPrefix}-protein`}
                        label="Protein (g)"
                        placeholder="0"
                        value={item.protein}
                        onChange={(value) => updateItemNutrient(item.key, "protein", value)}
                      />
                      <ItemField
                        id={`${idPrefix}-carbs`}
                        label="Carbs (g)"
                        placeholder="0"
                        value={item.carbs}
                        onChange={(value) => updateItemNutrient(item.key, "carbs", value)}
                      />
                      <ItemField
                        id={`${idPrefix}-fat`}
                        label="Fat (g)"
                        placeholder="0"
                        value={item.fat}
                        onChange={(value) => updateItemNutrient(item.key, "fat", value)}
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3 border-t border-border/70 pt-3 sm:grid-cols-4">
                        <ItemField
                          id={`${idPrefix}-fiber`}
                          label="Fiber (g)"
                          placeholder="0"
                          value={item.fiber}
                          onChange={(value) => updateItemNutrient(item.key, "fiber", value)}
                        />
                        <ItemField
                          id={`${idPrefix}-sugar`}
                          label="Sugar (g)"
                          placeholder="0"
                          value={item.sugar}
                          onChange={(value) => updateItemNutrient(item.key, "sugar", value)}
                        />
                        <ItemField
                          id={`${idPrefix}-sodium`}
                          label="Sodium (mg)"
                          placeholder="0"
                          value={item.sodium}
                          onChange={(value) => updateItemNutrient(item.key, "sodium", value)}
                        />
                        {MICRO_FIELDS.map((field) => (
                          <ItemField
                            key={field}
                            id={`${idPrefix}-${field}`}
                            label={MICRO_FIELD_KEYS[field]}
                            placeholder="0"
                            value={item[field]}
                            onChange={(value) => updateItemText(item.key, field, value)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full rounded-xl border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <PlusIcon />
                Add item
              </Button>
            </div>
          </FormSection>

          {formError && (
            <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>

        <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="hidden text-sm text-muted-foreground tabular-nums sm:block">
            {hasAnyCalories ? (
              <>
                {form.items.length} {form.items.length === 1 ? "item" : "items"} ·{" "}
                <span className="font-semibold text-foreground">
                  {formatNumber(totals.calories)}
                </span>{" "}
                kcal total
              </>
            ) : (
              "Enter calories for each item to log this meal"
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              className="rounded-full"
              disabled={isSubmitting || isPhotoUploading || isEstimating || isScanningPhoto}
            >
              {(isSubmitting || isPhotoUploading) && <Loader2Icon className="animate-spin" />}
              {isPhotoUploading
                ? "Uploading photo"
                : isScanningPhoto
                  ? "Scanning photo"
                  : submitLabel ?? (isEditing ? "Save changes" : "Log meal")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
