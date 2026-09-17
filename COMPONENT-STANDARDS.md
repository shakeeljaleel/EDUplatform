# EDUPLATFORM Component & UI Standards

This document establishes the mandatory visual aesthetics, UI consistency, and information architecture standards for EDUPLATFORM.

---

## 1. Button Standards
- **Fill**: Solid fill only (e.g. `#00c853` for primary green buttons, `#2979ff` for secondary blue buttons).
- **No Gradients**: Never use `linear-gradient` on button backgrounds.
- **Text Case**: Sentence case only (e.g., `"Create batch"`, `"+ New branch"`, `"Save changes"`). **Never use ALL CAPS** (`"CREATE BATCH"`).
- **Borders & Shadows**:
  - `border: 3px solid #1a1a2e`
  - `border-radius: 50px`
  - `box-shadow: 4px 4px 0px #1a1a2e`
- **Hover Micro-animation**: Subtle lift (`translateY(-2px)`) and hard shadow expansion.

---

## 2. Card Standards
- **Comic Book Treatment**:
  - Solid fill cycling through curated palette (`#00c853`, `#2979ff`, `#aa00ff`, `#ff6d00`, `#f50057`).
  - `border: 3px solid #1a1a2e`
  - `border-radius: 16px`
  - `box-shadow: 5px 5px 0px #1a1a2e`
- **Contrast**: High contrast text (`#ffffff` or `#0f172a` depending on fill depth).

---

## 3. Page Layout & Headers
- **Page Titles**: Each inner page must have exactly one clean page title header with breadcrumbs.
- **Greeting Headers**: "Welcome back" greeting banners are reserved **ONLY for main Overview / Dashboard pages**. Do not render greeting banners on inner sub-pages.
- **Sidebar Collapse Toggle**: Use hamburger icon `☰` consistently for collapse and mobile toggles.

---

## 4. Information Architecture & Forms
- **Separation of Concerns**:
  - The **Branches page** manages **BRANCHES ONLY** (physical/online campus roster, batch stats, branch creation).
  - The **Batches page** manages **BATCHES ONLY** (full-width table view dominating page, batch creation modal).
- **Batch Creation Forms**:
  - Must always include a **Branch selection dropdown** showing all existing branches + `"Global (No specific branch)"` option.
  - Branch assignment must be saved to the database (`branchId`).

---

## 5. Sidebar Navigation Order
For Super Admin:
1. `Overview` (`/dashboard/super-admin`)
2. `User Management` (`/dashboard/super-admin/users`)
3. `Batches` (`/dashboard/super-admin/batches`)
4. `Branches` (`/dashboard/super-admin/branches`)
5. `Student Import` (`/dashboard/super-admin/students`)
6. `Security Alerts` (`/dashboard/super-admin/security`)
