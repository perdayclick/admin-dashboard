# Figma / AI design brief — Payment & finance flows (Admin Portal + product context)

**Purpose:** Use this document to design or redesign **UI/UX for payment-related experiences** in the Krishwahh / PerDay-style marketplace: admin finance operations, employer checkout in admin when applicable, and clear mental models for statuses, payouts, and disputes.

**Product:** Labour / gig marketplace where an **employer** pays for completed work; the **platform** takes a **commission**; the **worker** receives a **payout** (online path via Razorpay). **Cash** jobs are recorded without Razorpay checkout but still create payment rows and ledger entries.

**Currency / region:** Primarily **INR**; amounts often shown as **₹** with Indian number grouping.

**Technical stack (context only):** Razorpay Checkout for online collection; Razorpay Payouts to worker bank/UPI; admin APIs require JWT with admin/superadmin and payment permissions where noted.

---

## 1. What “payment” means in this product (requirements-level)

### 1.1 Money paths

1. **Employer → platform (collection)**  
   - **Online:** Employer pays via Razorpay for job completion. Server creates the order; client never sets the payable total (server computes from job).  
   - **Cash:** Employer records cash paid offline; no gateway charge, but the system stores the same **split** (gross per worker, platform fee, worker net) for accounting.

2. **Platform commission**  
   - Derived from `job.platformFeePercent` (default **10%**) applied to **per-worker base** (`perDayPayout` or `salaryOrPayout`).  
   - Each **Payment** row stores: `amount` (employer gross for that worker slice), `platformFee`, `workerAmount`.

3. **Worker payout (online captured path)**  
   - After verify/capture, payout is scheduled (e.g. **~24h** hold before release, subject to cron and disputes).  
   - **Payout status** tracks: pending → processing → paid, or failed / on hold / disputed.

4. **Underpayment**  
   - If Razorpay captures **less** than expected total for the order, payments can be marked **underpaid** (`amountVerified: false`, `underpaidAmount`).

5. **Disputes**  
   - Employer or worker can raise disputes on payment lines.  
   - **Admin resolves** in favour of **worker** (release payout path) or **employer** (refund / manual Razorpay refund path — automation may be partial).  
   - Resolution can apply to **all open payment rows on the same job** (multi-worker jobs).

6. **Ledger / audit**  
   - Separate **Ledger** records track movements (`EMPLOYER_PAYMENT`, `WORKER_PAYOUT`, `PLATFORM_COMMISSION`, etc.) for compliance and ops.

### 1.2 Data model hint for designers

- **One Payment document per worker slice** for a job (multi-assignment = multiple rows, one Razorpay order can cover all).  
- List screens are **row-based** (per worker), not only “one invoice per job.”

### 1.3 Related but distinct: penalties & service charge

- **Service charge** (listing / unlock worker): separate from job completion payment; in Admin Portal may be paid via a **job API** action (`payServiceCharge`), not the same Razorpay job-completion modal in all cases.  
- **Penalties** (e.g. remove hire): separate **penalty** entities with settle / waive flows on **Job detail** — visually “money” but **not** the same as the Payments ledger tabs unless product links them in copy.

---

## 2. What exists today in the Admin Portal (inventory for UI)

### 2.1 Sidebar: **Payments** hub

Nested navigation (all under `/payments/...`):

| Label in UI        | Route                      | Role |
|--------------------|----------------------------|------|
| Overview           | `/payments/overview`       | Dashboard: trends, status distribution, online vs cash split |
| Transactions       | `/payments/transactions`   | Filterable ledger list → detail per `paymentId` |
| Payout Cron        | `/payments/payouts`        | Ops: run payout job, batch retry failed, KPIs, cron timeline |
| Disputes           | `/payments/disputes`       | CRM-style dispute queue, filters, resolve + notes |

Legacy `?tab=` query on `/payments` redirects to the path above.

### 2.2 **Overview** (`PaymentsOverviewPage`)

- **Refresh** control for stats.  
- **Captured volume** chart (last 7 days IST) — bars = when payment reached **captured**.  
- **Payment status** distribution (captured, pending, initiated, failed, refunded, underpaid, expired).  
- **Online vs cash** channel split.  
- Stat cards / fee narrative tied to dashboard API (`GET /api/payment/admin/stats`).

**Design implication:** Clear hierarchy — “health of money in” vs “out to workers” vs “exceptions” (failed, underpaid).

### 2.3 **Transactions** (`PaymentsTransactionsPage` + `PaymentTransactionDetailPage`)

**List page**

- Hero: “Ledger” / Transactions with short explanation.  
- **Filters:** payment status, payout status, date range, **job id** (submit to apply).  
- **Pagination.**  
- Table rows link to **`/payments/transactions/:paymentId`**.  
- Surfaces count of rows on page with **open disputes**; shows **retriable failed payout** hint from stats when relevant.  
- Optional actions in header area: **reload list**, ties to **trigger payouts** / **retry failed batch** when masthead visible (layout-dependent).

**Detail page**

- Full breakdown: job, worker, employer payer, amounts, Razorpay ids, payout state, dispute state.  
- **Retry single payout** when rules allow (failed online, retries left, no blocking dispute).  
- **Resolve dispute** / **edit resolution notes** modals (shared with layout).  
- Invalid id handling (“Invalid transaction id”).

**Design implication:** List = dense ops table; detail = **readable invoice + operational panel** (retry, dispute, notes).

### 2.4 **Payout Cron** (`PaymentsPayoutsPage`)

- **Run payout job** (manual trigger for due online payouts).  
- **Retry failed** batch when `retriableFailedCount > 0`.  
- KPIs: queued for release, retriable failed, auto-retry cap.  
- **Queue cards** by payout status bucket.  
- **Histogram** of failures by attempt count.  
- **Cron timeline** from server config (so UI matches real schedules).  
- Copy explains: due payouts **manual trigger** vs **scheduled** retry/recovery/dispute timers on server.

**Design implication:** This is a **control room** — high risk actions need confirmation, clear last-run / outcome feedback, and distinction between “scheduled” vs “I clicked run.”

### 2.5 **Disputes** (`PaymentsDisputesPage`)

- **Minimal chrome** (no payout masthead on this route — avoids confusing toasts).  
- Hero + **open count** pill from stats.  
- **Metrics:** open / resolved / auto-released style summary.  
- **Filters:** dispute state (default **open — needs action**), job id, raised date range, refresh.  
- **Table column priority (left → right):** Dispute status → Raised → Auto-release → Reason → Amount → Job → Worker → Raised by → Type → Evidence → Admin notes → **Actions (sticky)**.  
- **Resolve** opens confirm modal with **optional internal notes**; success may show **`resolvedCount`** (how many rows updated on the job).  
- Friendly reason label example: **Worker denied cash receipt**.

**Design implication:** Disputes = **ticket queue** UX; evidence links; deadline column for auto-release; sticky actions for speed.

### 2.6 Shared shell (`PaymentsLayout` + `PaymentsAdminContext`)

- Global **success Alert** for many actions; **suppressed** on Disputes for payout-only messages (so designers should not rely on one global toast for all).  
- **Errors** and **stats errors** shown above content.  
- **Minimal hub** variant hides large Finance masthead on overview, transactions, payouts, disputes.

### 2.7 **Job detail** — employer-style payment (inside admin)

When **job status is COMPLETED**:

- Section **“Job completion payment”**  
  - Loads payment status via `GET /api/payment/job/:jobId`.  
  - If **captured:** show **Paid** + timestamp.  
  - If not paid: copy explains Razorpay; **Pay now** opens **Razorpay Checkout** (`create-order` → verify → redirect).  
  - Link: **“All payment rows for this job in Payments”** → `/payments/transactions?jobId=...`.

**Separate section** when job is **inactive / unpaid service charge**:

- **“Unpaid service charge”** with amount and **Pay service charge** (server-side job action, not the same flow as completion pay).

**Penalties block** on same page:

- Table + link to penalties list with job filter; **Mark penalty paid** / **Waive** modals.

### 2.8 **Post-checkout pages** (Razorpay return)

| Route              | Purpose |
|--------------------|---------|
| `/payment/success` | Success message; optional **Back to job** (`?jobId=`). |
| `/payment/fail`    | Failure copy by `reason`: `cancelled`, `payment_failed`, `verify_failed`. |

**Design implication:** These are **simple confirmation screens**; mobile-friendly centered card; clear next step.

### 2.9 Enums & badges (for consistent UI tokens)

**Payment status:** initiated, pending, captured, failed, expired, refunded, underpaid.

**Payout status:** not_applicable, pending, on_hold, processing, paid, failed, disputed.

**Dispute status (on payment):** none → open → resolved_worker, resolved_employer, auto_released.

**Payment type:** ONLINE, CASH.

Map labels and semantic colours: **success** for captured/paid; **warning** for pending/initiated/underpaid/on_hold; **danger/neutral** for failed/expired/disputed as appropriate.

---

## 3. Key API capabilities (for realistic prototypes)

Base path: `/api/payment/...` (admin routes need admin auth + payment permission where enforced).

| Capability | Method (conceptual) |
|------------|---------------------|
| Employer create order | `POST .../create-order` `{ jobId }` |
| Verify payment | `POST .../verify` |
| Admin list payments | `GET .../admin/all` (filters: status, payoutStatus, dates, jobId) |
| Admin payment detail | `GET .../admin/payment/:paymentId` |
| Admin stats dashboard | `GET .../admin/stats` |
| Admin dispute list | `GET .../admin/disputes` |
| Resolve dispute | `POST .../dispute/resolve` (+ optional `resolutionNotes`) |
| Update dispute notes | `PATCH .../admin/dispute/notes` |
| Trigger payouts | `POST .../admin/trigger-payouts` |
| Retry failed batch | `POST .../admin/retry-failed-payouts` |
| Retry one payout | `POST .../admin/retry-payout` |

---

## 4. User journeys to prototype in Figma

### 4.1 Admin — “Morning finance health check”

1. Land **Overview** → scan captured trend + status bars + online/cash.  
2. Jump to **Transactions** → filter **underpaid** or **failed**.  
3. Open row → detail → copy Razorpay reference / see worker.

### 4.2 Admin — “Payouts stuck”

1. **Payout Cron** page → see retriable failed count and histogram.  
2. **Retry failed** batch OR open **Transactions** detail for one row → **Retry payout**.  
3. **Run payout job** if payouts are due but not processed.

### 4.3 Admin — “Dispute triage”

1. **Disputes** → default open queue.  
2. Sort/filter by job or date.  
3. Open evidence → **Resolve** with outcome + internal notes.  
4. Confirm **resolvedCount** if multiple workers on job.

### 4.4 Employer (acting in Admin Portal) — “Pay for completed job”

1. **Job detail** → COMPLETED → see unpaid state.  
2. **Pay now** → Razorpay modal (external).  
3. Success/fail page → return to job or jobs list.

### 4.5 Cross-linking

- From **Job detail** → pre-filtered **Transactions** for that `jobId`.  
- From **Disputes** copy → **Payouts** and **Transactions** for deeper inspection.

---

## 5. UX principles for a strong redesign

1. **Separate “money in” (employer payment status) from “money out” (payout status)** — dual badges or a small timeline component.  
2. **Job vs worker row:** For multi-worker jobs, always show **which worker** a row belongs to.  
3. **Underpaid** and **verify_failed** are high-anxiety states — use explicit copy and “what to do next.”  
4. **Disputes:** Show **auto-release deadline** prominently; make **evidence** one tap away.  
5. **Dangerous actions** (batch retry, trigger payouts): confirm dialogs + outcome summary (processed/failed counts).  
6. **Empty states:** No transactions / no disputes — explain how filters work and link to reset.  
7. **Accessibility:** Table density vs responsive card layout for smaller breakpoints; sticky actions already exist — preserve in mobile strategy.

---

## 6. Suggested Figma file structure (frames)

- **Payments / Overview** — dashboard + empty loading skeleton.  
- **Payments / Transactions** — list (filters expanded + collapsed), pagination, row hover.  
- **Payments / Transaction detail** — ONLINE captured + pending payout; FAILED + retry; OPEN DISPUTE + resolve modal; UNDERPAID state.  
- **Payments / Payout cron** — KPI row, histogram, timeline, confirm modals.  
- **Payments / Disputes** — queue table, resolve modal with notes, resolved row with admin notes.  
- **Jobs / Job detail** — completion payment card (unpaid / paid / loading).  
- **Jobs / Job detail** — service charge card; penalties table (related money UX).  
- **Payment result** — success + three fail variants.

---

## 7. Reference docs in repo

- Admin implementation map: `Admin_Portal/docs/PAYMENTS_ADMIN_PORTAL.md`  
- Admin API summary: `backend/docs/Payment/ADMIN_PAYMENT_API.md`  
- Disputes behaviour: `backend/docs/Payment/ADMIN_PAYMENT_DISPUTES_CHANGES.md`  
- Backend payment logic: `backend/docs/Payment/BACKEND_PAYMENT_IMPLEMENTATION.md`  
- Historical implementation plan: `backend/docs/Payment/PAYMENT_IMPLEMENTATION_PLAN.md`

---

*Generated for design handoff. Align visual design with existing admin shell (`ManagementPage.css`, payments-* classes) or treat this as a greenfield spec — both are valid if the brief above is preserved.*
