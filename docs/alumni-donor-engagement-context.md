# Alumni & Donor Engagement — Test Context File

Use this file as the context document for AI-assisted test case generation inside the Playwright (TypeScript, Page Object Model) framework. It describes the application under test, its data model, its user workflow, and the retry/self-correction behavior expected from generated tests.

## 1. Application under test

- **Platform:** Salesforce (Lightning Experience, Developer Edition org, `-dev-ed`)
- **App name:** Alumni & Donor Engagement (custom Lightning app; the nav bar heading reads exactly this)
- **App path:** `/lightning/app/Harbourview_Alumni_Donor_App` (unverified by the tests — they navigate by object URL instead, see section 9)
- **Nav bar tabs, in order:** Home, Accounts, Contacts, Campaigns, Opportunities, Tasks
- **Purpose:** proof-of-concept app for a university to track alumni, fundraising campaigns, gifts/pledges, and donor follow-up — built entirely on standard Salesforce objects, no custom objects or Apex.
- **Home page:** includes a standard "Quarterly Performance" forecast chart (Closed / Open / Goal) driven by Opportunity Amount and StageName — useful as a regression indicator after data changes.

## 2. Object model (for locators and test data factories)

| Object (API name) | Role in this app | Key fields used | Relationships |
|---|---|---|---|
| `Account` | The university | `Name`, `Industry` | Parent of Contact and Opportunity |
| `Contact` | An alumnus | `FirstName`, `LastName`, `Email`, `Title`, `Description`, `Course__c` (lookup) | Child of Account; linked to Opportunity via OpportunityContactRole; linked to Campaign via CampaignMember; linked to Task via WhoId |
| `Course__c` | What the alumnus studied | `Name` | Referenced by Contact.Course__c |
| `Campaign` | A giving appeal or reunion | `Name`, `Status`, `IsActive`, `ExpectedRevenue` | Parent of CampaignMember; referenced by Opportunity.CampaignId |
| `CampaignMember` | Links a Contact to a Campaign | `CampaignId`, `ContactId` | Junction |
| `Opportunity` | A gift or pledge | `Name`, `Amount`, `StageName`, `CloseDate`, `AccountId`, `CampaignId` | Child of Account; optionally of Campaign; linked to donor via OpportunityContactRole |
| `OpportunityContactRole` | Names the donor on a gift | `ContactId`, `OpportunityId`, `Role`, `IsPrimary` | Junction |
| `Task` | A follow-up reminder | `Subject`, `ActivityDate`, `Status`, `Priority`, `WhoId`, `WhatId` | Linked to Contact and optionally to Opportunity/Campaign |

Standard Opportunity stages in use: `Prospecting`, `Negotiation/Review`, `Closed Won`.

## 3. End-user workflow (source of test scenarios)

1. **Create Account** — the university. One-time setup, not repeated per test run unless testing org setup itself.
2. **Create Contact** — an alumnus, linked to the Account and (optionally) a Course.
3. **Add to Campaign** — create/select a Campaign, add the Contact as a CampaignMember.
4. **Create Opportunity** — a gift/pledge, linked to the Account and optionally the Campaign, with an initial Stage.
5. **Attach donor via Contact Role** — from the Opportunity, add the Contact as the donor (OpportunityContactRole).
6. **Log a Task** — a follow-up reminder linked to the Contact (and optionally the Opportunity).
7. **Progress the Opportunity** — update Stage/Amount/CloseDate as the gift moves forward; Home page chart should reflect the change.

This sequence is the natural basis for an end-to-end test suite: each step is both a standalone test case and a precondition for the next.

## 4. Known data-model gaps (candidates for negative/edge-case tests)

- No uniqueness constraint confirmed on Contact + Campaign in CampaignMember, or on Contact + Opportunity in OpportunityContactRole — duplicate links are possible. Worth a test that asserts current (permissive) behavior, flagged as a known gap rather than a defect.
- No validation rule confirms Opportunity Amount is required before Stage = `Closed Won` — a test can confirm whether the UI currently allows this.
- `Course__c` on Contact is a simple lookup with no required-match logic against any Opportunity/Campaign data — not a relevant constraint for this object set.

## 5. Suggested Page Object Model structure

```
/pages
  AppLauncherPage.ts
  HomePage.ts
  AccountListPage.ts
  AccountDetailPage.ts
  ContactListPage.ts
  ContactDetailPage.ts
  CampaignListPage.ts
  CampaignDetailPage.ts
  OpportunityListPage.ts
  OpportunityDetailPage.ts
  TaskListPage.ts
  TaskDetailPage.ts
/fixtures
  testAccount.ts
  testContact.ts
  testCampaign.ts
  testOpportunity.ts
/tests
  01-create-account.spec.ts
  02-create-contact.spec.ts
  03-campaign-membership.spec.ts
  04-create-opportunity.spec.ts
  05-attach-donor-role.spec.ts
  06-create-task.spec.ts
  07-progress-opportunity-stage.spec.ts
  08-home-chart-reflects-pipeline.spec.ts
```

Each Detail page object should expose: `open(recordId)`, `fillField(fieldLabel, value)`, `save()`, `getFieldValue(fieldLabel)`, and `openRelatedListNewRecord(relatedListName)` — Salesforce Lightning record pages follow a consistent DOM pattern across standard objects, so these methods can be implemented once on a shared `SalesforceRecordPage` base class and reused by every object-specific page.

## 6. Locator strategy (for resilience)

Salesforce Lightning Web Components render with dynamic, auto-generated IDs — do not rely on `id` selectors. Prefer, in order:

1. `aria-label` / `role` based locators (Salesforce LWC is generally accessibility-annotated)
2. Visible label text (`getByLabel`, `getByText`) scoped to the record form
3. `data-*` attributes where present (rare on standard Salesforce pages, common only on custom Lightning Web Components)

Avoid brittle CSS paths tied to generated class names (`.slds-...` structural classes change across Salesforce releases).

## 7. Retry / self-correction behavior

Per the framework's existing convention: a generated test should use Playwright's built-in auto-retrying assertions (`expect(locator).toBeVisible()`, `expect.poll()`, etc.) rather than fixed `waitForTimeout` calls, so a test re-attempts its own assertions until they pass or the default timeout elapses — this is "self-correcting" within a single run.

For "repeats until corrected" test-generation behavior (the AI regenerating a failing test rather than the test retrying itself at runtime), the recommended loop is:

1. Generate the test from this context file.
2. Run it against the sandbox.
3. If it fails, feed the failure output (selector not found, assertion mismatch, etc.) back as additional context alongside this file.
4. Regenerate only the failing test, not the full suite, until it passes or a fixed retry budget (suggest: 3 attempts) is exhausted.
5. If still failing after the retry budget, flag the test for manual review rather than looping indefinitely.

## 8. Environment

- Developer Edition org, Lightning Experience.
- Base URL pattern: `https://<org-id>-dev-ed.lightning.force.com`
- Per-test timeout is 90s (`playwright.config.ts`). Tests create their own preconditions through the UI (e.g. Contact test creates an Account first), so the Playwright default of 30s is not enough.
- **Auth:** tests reuse a saved login in `playwright/.auth/salesforce.json` (`storageState`). The Salesforce session expires; when it does, every test fails at the "Salesforce login" page. Refresh it with:
  `npx playwright codegen https://<org-id>-dev-ed.lightning.force.com --save-storage=playwright/.auth/salesforce.json`
  Sign in, close the browser, rerun. `playwright/.auth/` holds session tokens and must stay out of git.
- **Test data:** do not hardcode record IDs. Every record a test creates must get a unique name via `uniqueName()` / `uniqueEmail()` in `fixtures/testData.ts`. Fixed names (e.g. a literal "Demo University") pile up across runs and trip duplicate rules. Records are not yet cleaned up after a run; adding deletion in `afterEach` is an open item, so the org accumulates test records until then.

## 9. Lightning behaviors the tests must handle (learned from real runs)

- **Navigation:** go straight to `/lightning/o/<Object>/list` with `waitUntil: 'domcontentloaded'`, then wait for the **New** button. Do not drive the App Launcher: the app is not on its first page of apps, and `isVisible()` checks don't wait, so those steps get silently skipped. Lightning rarely fires the `load` event promptly.
- **Post-save URL:** Salesforce redirects to `/lightning/r/<recordId>/view` using the ID key prefix (`001` Account, `003` Contact, `006` Opportunity, `701` Campaign), not `/lightning/r/<ObjectName>/…`. Match with e.g. `/\/lightning\/r\/(Contact\/)?003\w+\/view/`.
- **Swallowed Save clicks:** a Save clicked before the form finishes rendering can be ignored. Wrap Save and the URL assertion in `expect(async () => {...}).toPass()` and re-click only while the form dialog is still visible, so a successful save is never submitted twice.
- **Lookup fields (e.g. Contact → Account Name):**
  - `fill()` does not open the dropdown; use `click()` or `pressSequentially()`.
  - Opening the dropdown shows *Recently Viewed*, which includes a record created moments ago. Typed search results can lag behind indexing.
  - A typed search puts a **"Show All Results for …"** row first, and it also matches the record name. Exclude it with `.filter({ hasNotText: /show all results/i })`.
  - Clicking an already-open combobox closes it; only open it when no option is visible.
  - Options animate in and fail Playwright's stability check, so click with `force: true` after asserting the option is visible.
  - After selecting, assert the combobox no longer has `aria-invalid="true"` before saving.
- **Duplicate rules:** Contact (and likely Account) saves can be blocked by "Similar Records Exist" warnings when a record resembles an existing one. Use unique names and emails per run. These warnings also render with `role="dialog"`, so scope the form modal by its title (`getByRole('dialog').filter({ hasText: 'New Contact' })`) instead of a bare `getByRole('dialog')`, which hits strict-mode violations.
