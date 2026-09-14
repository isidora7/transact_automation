# Loads can never be marked "Complete" — `mapLoadRow()` overwrites the terminal `current_stop_index: null` signal

- **Severity:** High — blocks a core dispatcher workflow action entirely (not an edge case; affects every load, every time)
- **Component:** `src/server/services/load.service.ts` (data mapper), surfacing in `src/components/dashboard/LoadDetailPanel.tsx` (Complete Load button)
- **Found via:** `tests/loads/loadLifecycle.spec.js` ("complete a load" test), `transact_automation` Playwright suite
- **Found:** 2026-09-12, re-verified against current code 2026-09-14
- **Status:** Reported, not fixed. Left as a live, intentionally-failing regression-guard test — see below.

## Description

The "Complete Load" button in the dispatcher's load detail panel never becomes enabled, regardless of how many stops exist or whether all of them have been checked out.

## Root cause

`LoadDetailPanel.tsx:325-326` gates completion on:

```ts
allStopsCheckedOut = load.current_stop_index === null
canCompleteLoad = unresolvedCostCount === 0 && allStopsCheckedOut
```

`current_stop_index` is only genuinely `null` in the database once the driver checks out of the *last* stop — `nextStopIndexAfter()` in `stop-workflow.service.ts:280` returns `null` past the final stop, which is the app's actual "all stops done" signal.

But the value the client receives never carries that signal, because `mapLoadRow()` (`load.service.ts:61-63`) does:

```ts
const currentStopIndex =
  row.current_stop_index ??
  (row.status === "active" ? firstStopIndex(stops) : null);
```

Since `??` only falls through on `null`/`undefined`, and a `null` DB value is exactly the "done" case, this line silently replaces the terminal signal with the *first* stop's index whenever the load is `active` — which it still is at that point. The client-side `canCompleteLoad` check for `=== null` can then never be true for an active load, no matter what happened server-side.

## Steps to reproduce

1. Dispatcher creates a load with at least one stop.
2. Driver checks in and checks out of every stop via the driver portal (`/d/[token]`).
3. Dispatcher opens the load's detail panel.

## Expected result

"Complete Load" button becomes enabled once all stops are checked out and there are no unresolved additional costs.

## Actual result

Button stays permanently disabled with the tooltip "Check out all stops before completing this load," even though all stops are, in fact, checked out.

## Evidence

Verified directly against the database (service-role query, bypassing the client) that `current_stop_index` correctly holds `null` server-side after the last checkout — confirming the bug is strictly in the mapper, not in the checkout logic itself. Re-confirmed by re-reading current `load.service.ts`, `LoadDetailPanel.tsx`, and `stop-workflow.service.ts` on 2026-09-14 — the bug is still present, line numbers unchanged.

## Suggested fix

`mapLoadRow()` needs to distinguish "never started" from "finished" rather than treating both as fallback-eligible — e.g. only apply the `firstStopIndex` fallback when the load has no stop-progress yet (no `current_stop_checked_in_at` and no prior stop events), not whenever the raw value is `null`.

## Test coverage

`tests/loads/loadLifecycle.spec.js` — the "complete a load" test asserts the *correct* expected behavior and is currently failing by design, as a regression guard. It will pass on its own once this is fixed; do not weaken the assertion to force it green.
