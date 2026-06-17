# Bilingual (English / नेपाली) Dashboards — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design); pending spec review
**Scope (Phase 1):** Student and Parent dashboards
**Author:** brainstorming session

## 1. Problem & Goal
The frontend dashboards are English-only (hardcoded strings). Nepali government-school users — especially students and parents — need a Nepali interface. Goal: add an **English / नेपाली** toggle that fully localizes the **Student** and **Parent** dashboards, including **translated UI text, Bikram Sambat (BS) dates, and Devanagari numerals** in the Nepali view. Teacher, School-Admin, SaaS, and auth interfaces are explicitly later phases.

## 2. Decisions (locked during brainstorming)
| Decision | Choice |
|---|---|
| Initial scope | Student + Parent dashboards only |
| Preference mechanism | `lang` cookie + React context + header toggle (no URL routing, no backend change) |
| Localization depth | UI text **+ BS dates + Devanagari numerals** in Nepali view |
| Translation source | I draft `ne.json` (AI), user/Nepali-speaker reviews |
| Library | Lightweight custom provider (no i18n dependency) |

## 3. Current State (verified)
- No i18n library installed; no `next.config` i18n; no URL locale routing.
- Vestigial stub `frontend/locales/en.json` (~3 keys) + `es.json` (Spanish), **not wired into dashboards**.
- Dashboard strings are **hardcoded English** (e.g., `app/admin/page.tsx`: `<CardTitle>Students by Class</CardTitle>`).
- **No frontend BS converter.** `app/admin/finance/accounting/page.tsx` obtains BS only via a backend endpoint (`/api/billing/school/nas/bs-calendar/`, backed by `backend/billing_school/utils_bs_calendar.py`) returning `{ bs_date_str, bs_display_en, bs_display_np, fiscal_year, ad_date }`. Per-date API calls are unsuitable for formatting many dashboard dates → the frontend needs its own client-side converter.

## 4. Architecture

### 4.1 Module: `frontend/lib/i18n/`
- **`LanguageProvider.tsx`** (client context): state `lang: 'en' | 'ne'`, loaded `messages`, `setLang(lang)` (persists to `lang` cookie, updates `<html lang>`). Loads both catalogs (small JSON) and selects by `lang`.
- **`useT.ts`** → `{ t, lang, setLang }`.
  - `t(key: string, vars?: Record<string,string|number>)`: dot-path lookup in the active catalog; `{var}` interpolation; **fallback to `en` value when the `ne` key is missing/empty**; dev-only `console.warn` on missing key in both.
- **`format.ts`**:
  - `formatNumber(n, lang)` → Devanagari numerals (`०१२३…`) when `ne` (pure digit map, no dep), else Arabic.
  - `formatDate(date, lang, opts?)` → BS string when `ne` (via `bs.ts`), else existing AD format.
  - `formatCurrency(amount, lang)` → `रू`/`Rs` prefix + `formatNumber`.
- **`bs.ts`**: self-contained AD↔BS conversion using a bundled BS year/month-day **lookup table** (the same data the common `nepali-date-converter` packages use). **No runtime dependency.** Covers a sufficient BS year range (e.g., 2000–2100 BS). The **backend `utils_bs_calendar.py` remains authoritative** for official/financial documents; `bs.ts` is for UI display only. Includes a unit-tested conversion against known AD↔BS reference dates.
- **`LanguageToggle.tsx`**: `EN | ने` control for headers; calls `setLang`.

### 4.2 Message catalogs: `frontend/locales/`
- `en.json` — source of truth; extracted keys, namespaced: `common.*`, `student.*`, `parent.*`.
- `ne.json` — AI-drafted Nepali, mirroring `en.json` keys; values needing verification marked (e.g., trailing ` ⟂REVIEW` comment convention documented in a header key, or a side `ne.review.md` list — implementation detail in the plan).
- **Delete** the unused `es.json` stub.

### 4.3 Wiring
- Wrap `app/student/layout.tsx` and `app/parent/layout.tsx` with `LanguageProvider`.
- The server layout reads the `lang` cookie to set the initial `lang` and `<html lang>` (avoids a flash of English).
- Add `<LanguageToggle/>` to the Student and Parent header/nav.
- Load **Noto Sans Devanagari** via `next/font` (subset), applied so Nepali text renders correctly.

### 4.4 String extraction
- Page-by-page across `/student` (~27 pages) and `/parent`: replace hardcoded English with `t('namespace.key')`; accumulate keys in `en.json`; draft `ne.json`.
- Route displayed numbers/dates/currency through `format.ts` helpers so they switch with `lang`.
- **Not translated** (user-generated, left as authored): notice text, lesson/material content, messages, names.

## 5. Data Flow
1. Server layout reads `lang` cookie → passes initial locale → `<html lang={lang}>`.
2. `LanguageProvider` hydrates with that locale + catalogs.
3. Components call `useT()`; `t()`/`format` render per active `lang`.
4. `<LanguageToggle/>` → `setLang('ne')` → cookie updated + context re-renders → all in-scope strings/numbers/dates switch.

## 6. Error Handling & Edge Cases
- Missing `ne` key → render `en` value (UI never breaks); dev warning.
- Missing in both → render the key string + dev warning (visible but non-fatal).
- Date outside the BS table range → fall back to AD format + dev warning.
- Cookie absent/invalid → default `en`.

## 7. Testing (Vitest — existing foundation)
- `t()`: dot-path lookup, `{var}` interpolation, `ne`→`en` fallback, missing-key behavior.
- `formatNumber`: Devanagari mapping incl. grouping (`१२,५००`).
- `bs.ts`: AD↔BS conversion against ≥3 known reference dates; out-of-range fallback.
- `formatDate`/`formatCurrency`: locale switching.
- Render smoke test: toggling `lang` swaps a sample student page's strings/numerals.

## 8. Out of Scope (YAGNI / later phases)
Teacher, School-Admin, SaaS, and auth interfaces; URL-based locales; backend `language` profile field (cross-device sync); translation of user-generated content; languages beyond en/ne.

## 9. Risks
- **Volume:** extracting hundreds of strings across ~27+ pages is the bulk of the effort; mitigated by phasing (student first, then parent) and namespaced catalogs.
- **Translation quality:** AI-drafted Nepali requires human review; fallback-to-en guarantees no broken UI in the interim.
- **BS accuracy:** mitigated by a vetted bundled table + reference-date unit tests; backend stays authoritative for official documents.

## 10. Acceptance Criteria
- A Student user and a Parent user can toggle `EN | ने`; the choice persists across navigation and reloads (cookie).
- In `ne`: in-scope UI text is Nepali; numbers render in Devanagari; dates render in BS; currency shows `रू`.
- Missing Nepali strings fall back to English with no broken UI.
- Out-of-scope interfaces remain English and unaffected.
- Vitest suite for i18n utilities passes.
