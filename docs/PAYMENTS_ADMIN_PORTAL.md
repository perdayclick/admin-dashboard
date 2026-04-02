# Admin Portal — Payments area

This document summarizes how the Finance **Payments** section is structured in the Admin Portal, what each file does, and how it lines up with backend payment admin APIs and cron behaviour.

---

## Routes

| Path | Page component |
|------|----------------|
| `/payments` | Redirects (see below) |
| `/payments/overview` | `PaymentsOverviewPage` |
| `/payments/transactions` | `PaymentsTransactionsPage` |
| `/payments/transactions/:paymentId` | `PaymentTransactionDetailPage` (detail **before** list in router so `:paymentId` is not captured as a segment name) |
| `/payments/payouts` | `PaymentsPayoutsPage` |
| `/payments/disputes` | `PaymentsDisputesPage` |

**Legacy query:** `/payments?tab=overview|transactions|payouts|disputes` is handled by `PaymentsIndexRedirect` and replaced with the matching path (other query params are preserved; `tab` is stripped).

Router: `Admin_Portal/src/routes/index.jsx`.

---

## Sidebar navigation

Under **Payments**, the sidebar lists:

- Overview → `/payments/overview`
- Transactions → `/payments/transactions`
- Payout Cron → `/payments/payouts`
- Disputes → `/payments/disputes`

Source: `Admin_Portal/src/layouts/MainLayout.jsx` (`PAYMENTS_SUBLINKS`, `PaymentsSidebarGroup`).

---

## Layout shell: `PaymentsLayout.jsx`

- Wraps all payment child routes with `PaymentsAdminProvider` and shared modals (resolve dispute, dispute notes).
- **`payments-hub`** / **`payments-hub--minimal`:** when **minimal**, the large Finance masthead (title + “Retry failed payouts”, “Run Payout Job”, “Refresh stats”) and the **yellow retry advisory** are hidden.

**Minimal chrome is used on:**

- `/payments` and `/payments/overview`
- Paths starting with `/payments/transactions`
- Paths starting with `/payments/payouts`
- Paths starting with `/payments/disputes`

**Success banner (`Alert` info):**

- Shown on transactions, payouts, disputes, or when the full masthead is visible.
- On **Disputes**, messages that match **payout-only** outcomes are suppressed so stale “Payout run finished…” / retry-batch / single-retry toasts do not appear there. Dispute-related messages (e.g. resolution, notes saved) still show.

**Errors / stats errors:** still shown globally above the outlet.

---

## Shared state: `PaymentsAdminContext.jsx`

Centralizes:

- Dashboard stats (`paymentApi.getDashboardStats`) — revenue, `payoutStatus`, `retryHealth`, `cronSchedule`, `disputes`, `dailyTrend`, `generatedAt`, etc.
- Transaction list filters, pagination, `paymentApi.listAdminAll`
- Single payment fetch where used (`paymentApi.getAdminPayment`)
- Payout actions: `triggerPayouts`, `retryFailedPayoutsBatch`, per-row retry
- Dispute queue: `listAdminDisputes`, filters, pagination, resolve + notes modals

Path helpers refresh the transaction or dispute list after some mutations when the user is on the matching section.

---

## Page-level features

### Overview — `PaymentsOverviewPage.jsx`

- Dashboard-style view (charts / status boards per implementation).
- Uses minimal hub (no shared Finance masthead).

### Transactions — `PaymentsTransactionsPage.jsx` + `PaymentTransactionDetailPage.jsx`

- Ledger-style list; link to **`/payments/transactions/:paymentId`** for full detail and actions.
- Minimal hub.

### Payouts & cron — `PaymentsPayoutsPage.jsx`

- **Control centre** for operations: refresh stats, **Run payout job** (manual due ONLINE payouts), **Retry failed** when `retryHealth.retriableFailedCount > 0` (including when histogram buckets are empty).
- KPIs: queued for release (`pendingAll`), retriable failed, auto-retry cap.
- Queue cards for each `payoutStatus` bucket from stats.
- Histogram of failed payouts by recorded attempt count (`retryHealth.retryCounts`).
- Timeline of server jobs from **`stats.cronSchedule`** (aligned with backend `paymentCronSchedule.js`).
- Copy explains: due payouts are **manual**; retries/recovery/dispute timers are **scheduled** on the server.
- Styles: `.payments-cron*` in `ManagementPage.css`.
- Minimal hub.

### Disputes — `PaymentsDisputesPage.jsx`

- **Minimal hub** (no payout masthead or payout retry banner on this route).
- Hero + metrics (open / resolved / auto-released) + tip strip.
- **Filters & list** card: job ID search (Enter to apply), dispute state dropdown, date range, refresh; list refetches when **status** or **date** filters change (not only on page change).
- **Table column order (priority left → right):**  
  **Dispute** (status) → **Raised** → **Auto-release** → **Reason** → **Amount** → **Job** → **Worker** → **Raised by** → **Type** → **Evidence** → **Admin notes** → **Actions** (sticky).
- Styles: `.payments-disputes*` in `ManagementPage.css`.

### Shared UI helpers — `paymentsShared.jsx`

- Colours (`C`), currency/dispute helpers, badges, `PaymentsPageHero` (used where applicable), section headings, etc.

### `PaymentsPageHero.jsx`

- Reusable compact title + subtitle + optional badge.

---

## API usage (`Admin_Portal/src/services/api.js` — `paymentApi`)

| Method | Endpoint (summary) |
|--------|-------------------|
| `getDashboardStats` | `GET /api/payment/admin/stats` |
| `listAdminAll` | `GET /api/payment/admin/all` |
| `getAdminPayment` | `GET /api/payment/admin/payment/:paymentId` |
| `listAdminDisputes` | `GET /api/payment/admin/disputes` |
| `triggerPayouts` | `POST /api/payment/admin/trigger-payouts` |
| `retryFailedPayoutsBatch` | `POST /api/payment/admin/retry-failed-payouts` |
| `retryPayout` | `POST /api/payment/admin/retry-payout` |
| Dispute resolve / notes | Existing admin dispute endpoints as wired in context |

---

## Backend alignment (reference)

- **`backend/src/config/paymentCronSchedule.js`** — `CRON` expressions and `ADMIN_CRON_LINES` fed into dashboard stats as `cronSchedule` so the admin UI cannot drift from `payoutCron.js`.
- **`backend/src/scripts/payoutCron.js`** — scheduled jobs (retry, recovery, dispute) + manual/process path documented to match `POST .../admin/trigger-payouts`.
- **`paymentService.getPaymentDashboardStats`** — builds `payoutStatus`, `retryHealth`, `cronSchedule`, `generatedAt`, etc.

Further payment backend notes may exist under `backend/docs/Payment/`.

---

## Styling

Primary block: **`Admin_Portal/src/styles/ManagementPage.css`**

- `.payments-hub*`, `.payments-hub--minimal` spacing for nested pages
- `.payments-overview*`, `.payments-tx*`, `.payments-tx-detail*`
- `.payments-cron*` (payout cron hub)
- `.payments-disputes*` (disputes hub)
- Tables: `.mgmt-table--sticky-actions` for dispute/transaction action columns

---

## File index (payments folder)

| File | Role |
|------|------|
| `PaymentsLayout.jsx` | Shell, modals, masthead visibility, success filtering |
| `PaymentsAdminContext.jsx` | State, API calls, handlers |
| `PaymentsIndexRedirect.jsx` | `/payments` → overview or `?tab=` migration |
| `PaymentsOverviewPage.jsx` | Overview dashboard |
| `PaymentsTransactionsPage.jsx` | Transaction list |
| `PaymentTransactionDetailPage.jsx` | Single payment admin detail |
| `PaymentsPayoutsPage.jsx` | Payout / cron control centre |
| `PaymentsDisputesPage.jsx` | Dispute queue |
| `paymentsShared.jsx` | Shared constants and small UI helpers |
| `PaymentsPageHero.jsx` | Optional page header block |

---

*Last updated to reflect the payments split routes, payout cron UI, disputes UX, table column priority, and layout/success behaviour described above.*
