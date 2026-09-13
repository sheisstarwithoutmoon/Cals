# Cals — design & product spec

This replaces the earlier "nutrition facts panel" direction. Follow the reference
screenshots the client provided: warm photography, green as the brand color, soft
rounded cards. Every generic AI-generated dashboard defaults to a sidebar; this one doesn't.

## Design tokens

| Name | Hex | Role |
|---|---|---|
| Page gradient | `#E3F0E7` → `#F4FAF6` → `#FFFFFF` | Page background — a soft green-to-white diagonal gradient behind every page (fixed, not per-section), never a flat beige/cream fill |
| Surface | `#FFFFFF` | Cards, panels, the navbar |
| Ink | `#1F1B16` | Primary text |
| Muted | `#6B6459` | Secondary text, placeholders |
| Green | `#2F6D4F` | Primary brand color — filled buttons, active nav state, progress rings |
| Green-tint | `#E7F0EA` | Light backgrounds behind green icons/badges |
| Alert | `#C1402E` | Over-goal / error states only |

**Type**
- Keep the existing typeface exactly as it already is on the site — no font
  swap. Whatever family and weights are currently used for headings and body
  text stay as they are; this spec only changes color, layout, and copy, not
  the type.
- Sentence case throughout, no tracked-out uppercase labels — except the
  small "Cals" wordmark label already used above the hero headline, which
  stays as-is since it's part of the existing mark.

**Shape & surface**
- Cards: white surface on the green-to-white page gradient, `border-radius: 16px`, soft 1px border
  (`rgba(0,0,0,0.06)`) — a faint shadow is fine here (`0 1px 3px rgba(0,0,0,0.06)`),
  keep it subtle, not the heavy floating-card look.
- Primary buttons: filled Green, pill or 12px radius, white text.
- Secondary buttons: transparent background, 1px Ink or Green border.
- Progress: circular ring for the daily calorie total (Green stroke, light gray
  track), horizontal bars for macros.

## Navigation — fixed top bar, no sidebar

- One horizontal bar, fixed to the top, solid white background at all times —
  never transparent, never blurred-on-scroll. This is a hard requirement, not
  a style suggestion.
- Left: logo + wordmark. Center or left-of-center: Dashboard / Meals / Goals /
  Reports / Chat as plain text links, active one colored Green.
  Right: avatar + account menu.
- All page content sits below this bar in a single full-width column — no fixed
  side rail, on any screen (dashboard, meals, goals, reports, chat).

## Landing page
this page remians smae just the header should be white and not transparent
Headline stays exactly as it already is — do not reword it: "Keep track of
your calories with Cals." (first line in Ink, "calories with Cals." in Green
on the second line, with the existing hand-drawn underline flourish beneath
it, and the small "Cals" wordmark label above). Do not add a new tagline
sentence under it.

## Auth (sign in / sign up)

- White rounded panel, right side of the split landing layout.
- **Validation errors** render above the input, right-aligned on the same line
  as that field's label (label left, error text right) — not below the field.
- **Sign-up field grouping**: two sections separated by a rule or spacing —
  group 1 is Full name + Email, group 2 is Password + Confirm password. Not
  four fields in one undivided stack.
- Include the secondary "Continue with Google" option and the "Don't have an
  account? Sign up" / "Forgot password?" links as shown in the reference.

## Onboarding

- Step 1 ("Tell us about yourself") must **not** ask for Name again — it was
  already collected at sign-up. Carry the name over silently and only ask for
  Age, Gender, Height, and current Weight.

## Dashboard

- Top bar (see Navigation) + greeting header ("Good -----(timiing of the day)----, [name]").
- A calorie ring (Green progress ring, current/target in the center) paired
  with macro bars for Protein / Carbs / Fat, values right-aligned.
- Quick actions row: **Log meal** (filled Green), **Scan food** (outlined,
  transparent) and **Import PDF** (outlined, transparent) — three distinct
  buttons, not one combined "Scan food" button. Each opens its own flow.
- Today's meals as a simple list/card grouped by meal type, each entry showing
  name, quantity, and kcal.
- A weekly trend chart card below.

## Reports & graphs

- Every stat/chart card shares one alignment grid: same card height, same
  internal padding, tops and bottoms lined up — no card visually offset from
  its neighbors.
- No text may be clipped by a card's edge; long labels wrap or the card grows,
  they never cut off mid-character.
- Every card gets a real empty state when it has no data — icon, one-line
  heading, one-line instruction (the pattern already used correctly for
  "No micronutrient data yet"). Apply this to **every** report card, including
  the top trend chart, instead of an empty axis with no message.

## Copy & tone

- No emojis anywhere in UI copy — headers, empty states, toasts, onboarding
  greetings, nothing. It's one of the clearest "AI-generated" tells.
- No invented marketing quotes, taglines, or filler lines (things like "A
  healthier you is a happier you" or "Ingredients: no ads, no noise..."). Every
  string on screen should be functional — it names what something is or tells
  the user what to do next, nothing decorative.
- One canonical action name: **"Log meal."** Audit every button, empty state,
  and menu item so it's never "Log a meal" in one place and "Log meal" in
  another.

## Modals / popups

One consistent overlay treatment everywhere (Log meal, Scan photo, Import PDF,
Edit meal, etc.): a moderate darkening scrim behind the modal, no blur. Not the
current mix of "solid dark" on one modal and "blurred" on another.

## Meal entry / edit

- Quantity is a live multiplier, not a static field. Changing quantity (e.g.
  1 → 0.5 plate) must immediately recompute calories, protein, carbs, fat,
  fiber, sugar, and sodium proportionally. Store the per-unit base values so
  this is a multiplication on input, not a re-estimation or a stale saved
  number.

## Data model & API notes (from the assignment brief)

- APIs separate from frontend; frontend talks to backend only through the API.
- Persist all food entries, goals, and user data in a database.
- All list APIs (meals, reports) support pagination.