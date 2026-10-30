# Implementation Notes

## 1. What I Changed

- Fixed the line-item diff logic to detect changes in both quantity and unit price.
- Fixed approval permission checks so only authorized users can approve or reject pending Change Requests.
- Implemented status filtering on the Change Request list, including a message when no records match the selected filter.
- Sorted the approval timeline chronologically, from oldest to newest.
- Implemented Approve and Reject actions using the provided mock API.
- Added required rejection-reason validation, including blocking whitespace-only input.
- Added submission-state handling to prevent duplicate actions while an API request is in progress.
- Added error handling for failed approval and rejection requests.
- Fixed the mock API transition behavior so failed requests do not update stored Change Request data.
- Fixed Change Request status synchronization so the list and detail views refresh after a successful approval or rejection.

## 2. Component & State Model

The application has two main screens: a Change Request list and a Change Request detail view.

The list component loads organization-scoped requests through `CrApiService` and uses an explicit `ViewState` to represent loading, loaded, empty, and error states. The status filter is applied through the `visibleRows` getter without modifying the original data.

The detail component loads a selected Change Request and displays its proposed line-item changes, financial totals, approval timeline, and available actions.

The diff is calculated using a pure utility function, while the timeline is sorted without mutating the original audit array.

Approve and Reject use asynchronous API calls. The component tracks submission progress and action errors separately from the main loading state.

## 3. Invariants I Keep

| Invariant | How / Where |
|---|---|
| Unauthorized users cannot approve or reject | Permission checks in `canApprove` and `canReject` |
| Only pending requests can be approved or rejected | Both permission getters require `PENDING_APPROVAL` |
| Rejection requires a meaningful reason | Reactive FormControl validation |
| Duplicate submissions are prevented | `submitting` flag and disabled action buttons |
| Failed actions do not update displayed data | State updates only after successful API responses |
| Failed API transitions do not modify stored data | Mock API commits changes only after success |
| Timeline entries are displayed chronologically | Sorted copy of the audit array |
| Status filtering preserves original results | `visibleRows` filters without mutating source data |
| Quantity and price changes are detected | `computeDiff` compares both properties |

## 4. Testing Strategy

I used Jest and Angular TestBed to test pure logic and rendered component behavior.

Tests cover:

- Line-item diff classification.
- Change Request list behavior and status filtering.
- Detail rendering and permission restrictions.
- Chronological timeline ordering.
- Successful approval and rejection.
- Rejection-reason validation.
- Failed approval and rejection requests, including preservation of stored data.

The latest completed test run passed all 19 tests across three test suites.

TypeScript validation also passed using `npx tsc --noEmit`.

The test suite also covers loading, empty, error, and retry behavior. Additional deterministic tests for delayed API responses and repeated clicks during submission would further improve coverage.

## 5. Assumptions

- The provided mock API represents the backend contract.
- A Change Request can be approved or rejected only when its status is `PENDING_APPROVAL`.
- Approval and rejection require the existing approval policy.
- Rejection reasons must contain at least one non-whitespace character.
- Rejection reasons are trimmed before submission.
- The timeline displays events from oldest to newest.
- Status filtering is performed locally using organization-scoped results.

## 6. Where I Used AI

I used ChatGPT as a development assistant to review requirements, investigate failing tests, suggest implementation approaches, troubleshoot TypeScript and Angular issues, and draft documentation.

I reviewed and applied changes in the project, ran the tests and TypeScript checks locally, and used the results to verify the implementation.

## 7. What I'd Improve With More Time

- Add more rendered tests for loading, empty, error, and retry states.
- Add deterministic tests for delayed API responses and repeated clicks during submission.
- Improve accessibility and keyboard navigation.
- Make permission-aware action visibility more consistent.
- Improve user-facing feedback after successful actions.
- Clean up formatting and remove outdated TODO comments.
- Consider stronger permission and status validation at the API boundary.