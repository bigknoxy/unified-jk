# Demo Showcase Plan — Role Switching, Industry Scenarios, Enhanced Audit

## Acceptance Criteria

1. **Role-Switching Dropdown**: Logged-in demo users can instantly switch between any of the 4 demo users via a dropdown in the header. The nav, available apps, and user info update immediately without full page reload. Only active in demo mode.

2. **Demo Showcase Page**: A dedicated `/demo` view (accessible from the landing page and header) that presents industry-specific scenarios (Healthcare/HIPAA, Finance/SOX, Government), each with pre-configured user roles, app manifests, and guided "day in the life" walkthroughs.

3. **Enhanced Audit Dashboard**: The existing audit dashboard gains real-time auto-refresh, workflow timeline visualization, correlation ID grouping, per-user/per-app drill-downs, and a "live mode" that polls every 3 seconds.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Shell (8888)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ shell-header │  │ demo-scenario│  │ shell-container       │ │
│  │ + role       │  │ page         │  │ + demoScenario state  │ │
│  │   switcher   │  │ (new file)   │  │ + scenario manifests  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AuthService (demo mode)                     │  │
│  │  + switchUser(userId) — replaces setDemoUser             │  │
│  │  + getDemoUsers() — returns DEMO_USERS                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Scenario Registry (new)                     │  │
│  │  + scenarios: healthcare, finance, government            │  │
│  │  + each scenario: users[], manifests[], description      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐        ┌──────────────────────┐
│ Audit Service    │        │ Manifest Registry    │
│ (8080)           │        │ (8081)               │
│ + GET /api/audit │        │ + PATCH /api/manifests│
│ + SSE/streaming  │        │ + dynamic manifests  │
│   (new endpoint) │        └──────────────────────┘
└──────────────────┘
```

---

## Feature 1: Role-Switching Dropdown

### Problem
Currently demo users must logout and re-login to switch roles. This breaks the flow of demonstrating permission differences.

### Solution
Add a role-switcher dropdown to the user menu in `shell-header.ts`. Only visible when `authProvider === 'demo'`.

### Files Changed
- `shell/src/components/shell-header.ts` — add role switcher UI
- `shell/src/components/shell-container.ts` — handle `switch-user` event, call `authService.setDemoUser()`
- `shell/src/services/auth.ts` — add `switchUser()` method (alias for `setDemoUser` with session cleanup)

### Data Flow

```
User clicks role in header dropdown
  └─▶ dispatch CustomEvent('switch-user', { detail: { userId } })
       └─▶ shell-container.handleSwitchUser(userId)
            ├─▶ authService.switchUser(userId)
            │    ├─▶ clearSession()
            │    ├─▶ setDemoUser(userId)
            │    └─▶ saveSession()
            ├─▶ fetchApps() — re-fetch manifests for new permissions
            ├─▶ activeAppId = null — close current app
            └─▶ re-render (nav updates, user info updates)
```

### UI Design
Inside the existing user menu dropdown (below "Sign out"):
```
┌─────────────────────────────┐
│  🐢 Alice (Admin)           │
│  alice@example.com          │
├─────────────────────────────┤
│  Switch Role (Demo)         │  ← new section header
│  ┌───────────────────────┐  │
│  │ 👤 Bob (Standard)     │  │
│  │ 👁 Carol (Viewer)     │  │
│  │ 💻 Dave (Developer)   │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Sign out                   │
└─────────────────────────────┘
```

Each role shows avatar, name, and role badge. The current user is highlighted/checked.

### Edge Cases
- **Nil user**: Dropdown not rendered (user not logged in)
- **Non-demo mode**: Section hidden entirely (check `authProvider === 'demo'` from config)
- **Switch while app is open**: Current app is closed, nav resets to home
- **Rapid switching**: Debounce not needed — `setDemoUser` is synchronous

### Tests
- Unit: `switchUser()` clears old session, sets new user, persists to sessionStorage
- Integration: After switch, `navigationItems` reflects new permissions
- Visual: Current role is highlighted, other roles are clickable

---

## Feature 2: Demo Showcase Page

### Problem
No structured way to walk prospects through the platform's capabilities for regulated industries.

### Solution
A dedicated demo showcase page (`demo-scenario-page.ts`) that presents industry scenarios with pre-configured users, apps, and guided walkthroughs.

### New Files
- `shell/src/components/demo-scenario-page.ts` — main showcase page component
- `shell/src/services/demo-scenarios.ts` — scenario definitions (users + manifests per industry)

### Files Changed
- `shell/src/components/shell-container.ts` — add `demoView` state, render `demo-scenario-page` when active
- `shell/src/components/shell-header.ts` — add "Demo Showcase" link in header (demo mode only)
- `shell/src/types/index.ts` — add `DemoScenario` type
- `manifest-registry/src/store.ts` — add `loadScenario()` method to swap manifests dynamically

### Scenario Definitions

```typescript
interface DemoScenario {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string; // emoji or SVG name
  compliance: string[]; // ['HIPAA', 'SOC2', etc.]
  users: ScenarioUser[];
  apps: AppManifest[];
  walkthrough: WalkthroughStep[];
}

interface ScenarioUser {
  userId: string; // references DEMO_USERS or defines inline
  role: string;
  narrative: string; // "You are Dr. Smith, a physician..."
}

interface WalkthroughStep {
  title: string;
  action: string; // "Login as Carol the Auditor"
  observe: string; // "Notice she can only see the Audit Dashboard"
  userId?: string; // auto-switches user when step is activated
}
```

### Three Scenarios

**1. Healthcare (HIPAA)**
- Users: Physician (full patient access), Billing (invoices only), Compliance Officer (audit logs), Admin (everything)
- Apps: Patient Records, Billing System, Audit Dashboard, App Manager
- Walkthrough: "Day in the life of a hospital system"

**2. Finance (SOX)**
- Users: Trader (trading desk), Risk Manager (analytics), Compliance (audit logs), Admin (everything)
- Apps: Trading Desk, Risk Analytics, Audit Dashboard, App Manager
- Walkthrough: "Trade lifecycle with full audit trail"

**3. Government (FedRAMP)**
- Users: Analyst (unclassified apps), Supervisor (classified + unclassified), Auditor (audit only), Admin (everything)
- Apps: Intelligence Dashboard, Case Management, Audit Dashboard, App Manager
- Walkthrough: "Classified vs unclassified separation"

### Information Hierarchy

**Role-Switcher Dropdown** (inside existing user menu):
```
Primary:   Current user name + email (header, always visible)
Secondary: "Switch Role (Demo)" section label + role list
Tertiary:  Sign out (separated by divider, red text)

Layout:    User info (top, bordered bottom)
           ────────────────────────────────
           Switch Role label (uppercase, muted)
           [Avatar] Bob (Standard)    ← hover bg
           [Avatar] Carol (Viewer)
           [Avatar] Dave (Developer)  ← current user highlighted with checkmark
           ────────────────────────────────
           Sign out (red text)

Sizing:    min-width: 240px (wider than current 200px to fit role names + badges)
           Role row height: 40px (touch target)
           Avatar: 28px (smaller than user button avatar to distinguish)
```

**Demo Showcase Page** — Hierarchy:
```
Primary:   Scenario cards (3-column grid) — what user interacts with first
Secondary: Scenario detail panel (below cards) — roles + walkthrough
Tertiary:  Header text + compliance badges — context, not action

Layout:    ┌──────────────────────────────────────────────────┐
           │  Demo Showcase                          [← Back] │  ← sticky header
           │  See how Shell Platform works for...             │
           ├──────────────────────────────────────────────────┤
           │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
           │  │ 🏥       │ │ 💰       │ │ 🏛       │         │  ← PRIMARY
           │  │ Healthcare│ │ Finance  │ │ Government│         │
           │  │ HIPAA    │ │ SOX      │ │ FedRAMP  │         │
           │  │ [Launch] │ │ [Launch] │ │ [Launch] │         │
           │  └──────────┘ └──────────┘ └──────────┘         │
           ├──────────────────────────────────────────────────┤
           │  Selected: Healthcare — HIPAA Compliance         │  ← SECONDARY
           │  Roles: 4 | Apps: 4 | Compliance: HIPAA, SOC2    │
           │  ┌────────────────────────────────────────────┐  │
           │  │ 👤 Dr. Smith (Physician) — Full access     │  │
           │  │ 👤 Jane Doe (Billing) — Invoices only      │  │
           │  │ ...                                        │  │
           │  └────────────────────────────────────────────┘  │
           │  Walkthrough: Step 1/5 [▶ Start]                 │  ← SECONDARY
           └──────────────────────────────────────────────────┘

Card sizing: 280px min-width, max 3 per row, gap 24px
Active scenario: highlighted with 2px primary border + subtle bg tint
```

**Walkthrough Overlay** — Hierarchy:
```
Primary:   Current step instruction + "observe" text
Secondary: Step progress indicator (1/5) + navigation buttons
Tertiary:  Exit button (top-right, subtle)

Layout:    Fixed overlay, centered panel, 480px max-width
           Dimmed background (rgba(0,0,0,0.4))
           Panel slides up from bottom (0.2s ease-out)

           ┌─────────────────────────────────────┐
           │  Step 1 of 5                  [✕]   │  ← progress + exit
           ├─────────────────────────────────────┤
           │                                     │
           │  Login as Dr. Smith                 │  ← step title, 20px bold
           │                                     │
           │  You are a physician accessing      │  ← narrative, 14px muted
           │  patient records. Notice how the    │
           │  sidebar shows only apps you have   │
           │  permission to view.                │
           │                                     │
           │  ┌───────────────────────────────┐  │
           │  │ ▶ Start this step             │  │  ← primary action
           │  └───────────────────────────────┘  │
           │                                     │
           │  [← Previous]        [Next →]       │  ← nav, muted/active
           └─────────────────────────────────────┘
```

**Audit Dashboard Enhancements** — Hierarchy:
```
Primary:   Event table — the main content users scan
Secondary: Live indicator + stats bar — status at a glance
Tertiary:  Filter controls + charts — refinement tools

Layout:    ┌──────────────────────────────────────────────────┐
           │  🔴 LIVE  [⏸]  Updated 3s ago     [Export ▼]    │  ← top bar
           ├──────────────────────────────────────────────────┤
           │  1,247 events  |  342 today  |  98.2% success    │  ← stats
           ├──────────────────────────────────────────────────┤
           │  [Action ▼] [User ▼] [App ▼] [24h ▼] [Clear]    │  ← filters
           ├──────────────┬───────────────────────────────────┤
           │ Events by    │ Events by App                     │  ← charts
           │ User (bars)  │ (bars)                            │
           ├──────────────┴───────────────────────────────────┤
           │  Workflow Timeline (if workflow active)          │  ← timeline
           ├──────────────────────────────────────────────────┤
           │  Timestamp    Action      App    User   Status   │  ← table
           │  14:32:01     LOGIN       shell  alice  ✓       │
           │  14:32:05     DOC.VIEW    sample alice  ✓       │
           │  ...                                             │
           └──────────────────────────────────────────────────┘

Charts: Horizontal bar charts, max 5 items each, "Show all" link if more
Table:  100 rows max, virtual scroll if needed
```

### Interaction State Coverage

```
  FEATURE              | LOADING              | EMPTY                        | ERROR                         | SUCCESS                    | PARTIAL
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Role switcher        | N/A (instant)        | N/A (always has 4 users)     | "Role not found" toast        | Nav updates, user changes  | N/A
  dropdown             |                      |                              |                               |                            |
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Demo showcase page   | Skeleton cards       | "No scenarios configured"    | "Failed to load scenarios"    | Cards render, scenario     | 1 scenario only (center
  (scenario grid)      | (3 gray boxes)       | + "Contact admin" CTA        | + retry button                | activates on click         | card, wider layout)
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Scenario detail      | Role list spinner    | "No roles in this scenario"  | "Scenario data unavailable"   | Roles + walkthrough        | Roles load but walkthrough
  panel                |                      |                              |                               | render                     | data missing
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Walkthrough overlay  | Fade-in animation    | "No steps defined"           | "Walkthrough failed to start" | Step renders, user         | Some steps missing data
                       | (0.2s)               | + close button               | + close button                | switches on "Start"        | (skip unavailable steps)
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Audit live indicator | Pulsing dot on init  | N/A                          | "Connection lost" banner      | "LIVE" with green dot      | Polling paused (tab
                       |                      |                              | + auto-retry countdown        | + last-updated timestamp   | hidden)
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Audit stats charts   | Bar skeleton         | "No events to display"       | "Stats unavailable"           | Bars render with           | Some breakdowns missing
                       | (5 gray bars)        | + "Perform actions in apps"  | + fallback to simple counts   | percentages + counts       | (show available only)
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Audit event table    | Row shimmer          | "No audit events found"      | "Failed to load events"       | Rows render, new events    | Fewer events than limit
                       |                      | + "Try adjusting filters"    | + retry button                | flash-highlight (1s)       | (show "X of Y total")
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Workflow timeline    | Timeline placeholder | "No active workflows"        | "Workflow data unavailable"   | Gantt bars render,       | Partial spans (some
                       | (gray bar)           | + "Start using apps to       |                               | clickable for detail       | apps not reporting)
                       |                      | generate workflow data"      |                               |                            |
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
  Export buttons       | N/A                  | "Nothing to export"          | "Export failed" toast         | File downloads             | N/A
  ---------------------|----------------------|------------------------------|-------------------------------|----------------------------|------------------------
```

**Empty state design rules** (applies to all new surfaces):
- Every empty state has: a descriptive message, a primary action (if recoverable), and context about why it's empty
- No bare "No items found." text. Minimum: icon + message + action
- Empty states use the same card/container styling as populated states (no visual jarring)
- Audit dashboard empty states include: "Audit events will appear here as users interact with apps. Try logging in and opening the Sample App."

## User Journey & Emotional Arc

### Role-Switching Journey
```
  STEP | USER DOES                  | USER FEELS              | PLAN SPECIFIES?
  -----|----------------------------|-------------------------|----------------
  1    | Sees user menu             | "I'm logged in as Alice"| Yes — dropdown opens
  2    | Notices "Switch Role"      | Curious — "Oh, I can    | Yes — section header
       | section                    |  try other roles"        |
  3    | Clicks "Bob (Standard)"    | Anticipation            | Yes — instant switch
  4    | Nav shrinks, apps change   | "Wow, that was fast"    | PARTIAL — needs
       |                            |                         | visual feedback
  5    | Sees different apps        | Understanding — "So     | NO — needs "Role
       |                            |  Bob can't see admin"   | changed to Bob" toast
  6    | Switches to Carol (Viewer) | "She can barely see     | NO — empty nav state
       |                            |  anything. Powerful."   | needs explanation
```

**Gap**: Steps 4-6 need visual feedback. When role switches, show a transient toast: "Switched to Carol (Viewer) — 1 app available."

### Demo Showcase Journey
```
  STEP | USER DOES                  | USER FEELS              | PLAN SPECIFIES?
  -----|----------------------------|-------------------------|----------------
  1    | Opens Demo Showcase        | "What's this?"          | PARTIAL — needs
       |                            |                         | clear header copy
  2    | Sees 3 industry cards      | "This is for MY         | NO — cards need
       |                            |  industry!"             | industry-specific
       |                            |                         | copy, not generic
  3    | Clicks Healthcare          | Engaged                 | Yes — scenario
       |                            |                         | activates
  4    | Sees roles + walkthrough   | "Tell me more"          | PARTIAL — walkthrough
       |                            |                         | copy needs warmth
  5    | Starts walkthrough         | Guided, not lost        | PARTIAL — needs
       |                            |                         | progress feedback
  6    | Completes walkthrough      | "I get it now"          | NO — needs
       |                            |                         | completion state
```

**Gap**: Step 6 needs completion state. After walkthrough: "You've seen how Shell Platform handles HIPAA compliance. Want to try another scenario?" with links to other scenarios.

### Time-Horizon Design
- **5 seconds (visceral)**: Role switch is instant, audit dashboard shows LIVE indicator, showcase cards are visually distinct per industry
- **5 minutes (behavioral)**: Walkthrough guides without frustration, filters return results quickly, export works reliably
- **5-year relationship (reflective)**: The demo experience builds trust that the platform takes compliance seriously — every detail is intentional

### AI Slop Risk & Fixes

**Existing slop patterns in codebase** (from shell-container.ts landing page):
- Centered hero with floating animation (blacklist #4, #6)
- Radial gradient decorative blobs (blacklist #6)
- 3-column feature cards with hover lift + translateY (blacklist #2)
- Emoji usage in existing plan wireframes (blacklist #7)

**Plan-specific risks and fixes**:

1. **Scenario cards must NOT be another card grid**. Fix: Use horizontal cards with industry-specific color accents, not vertical cards with icons. Each card has a distinct background tint (healthcare: subtle green, finance: subtle blue, government: subtle amber) so they feel like different products, not template cards.

2. **No emojis in UI**. Replace emoji icons with purposeful SVG icons or text labels. The existing turtle SVG in the header is the mascot. Everything else should be typography-driven.

3. **Walkthrough overlay must not be a centered card**. Fix: Panel slides up from bottom (not centered modal), feels like a companion guide, not a popup.

4. **Audit dashboard charts must not be generic bar charts in cards**. Fix: Inline horizontal bars next to user/app names, no card containers around them. Dense, data-first, not decorative.

5. **Scenario detail section must not repeat the card pattern**. Fix: Use a list/table layout for roles, not cards. Roles are data, not marketing content.

**Design language for this feature set**:
- Calm surface hierarchy (App UI rules)
- Typography-driven, not decoration-driven
- One accent color (--shell-primary) with industry tints for scenario cards only
- No decorative gradients, no floating animations, no colored circles around icons
- Section headings state what the area is: "Available Scenarios", "Scenario Roles", "Audit Events"

### Design System Alignment

**No DESIGN.md exists.** All new UI calibrates against existing patterns in `shell-container.ts` and `shell-header.ts`.

**Existing tokens to reuse** (no new CSS variables needed except where noted):
- `--shell-primary`: #0066cc (buttons, links, active states)
- `--shell-bg-primary`: #ffffff (card backgrounds)
- `--shell-bg-secondary`: #f8fafc (page backgrounds)
- `--shell-border-color`: #e5e7eb (borders, dividers)
- `--shell-text-primary`: #1a1a1a (headings)
- `--shell-text-secondary`: #6b7280 (body, labels)
- `--shell-success`: #10b981 (NEW — live indicator, success badges)
- `--shell-warning`: #f59e0b (existing — demo badge, caution states)
- `--shell-error`: #dc2626 (existing — error states, sign out)

**Typography scale** (match existing):
- Page title: 24px / 600 (matches `.landing-apps-title`)
- Section heading: 18px / 600 (matches `.landing-feature-title`)
- Body: 14px / 400 (matches `.demo-user-email`)
- Small/label: 12px / 400, uppercase, letter-spacing 0.5px (matches `.demo-user-role`)
- Walkthrough step title: 20px / 600 (matches `.demo-modal h2`)

**Spacing scale** (match existing):
- Card padding: 24px (matches `.landing-feature-card`)
- Gap between cards: 24px (matches `.landing-features`)
- Section padding: 48px horizontal (matches `.landing-features`)
- Walkthrough panel padding: 32px (matches `.demo-modal`)

**Component patterns to reuse**:
- Avatar circles: 32px, primary bg, white initials (from `shell-header.ts`)
- Role chips: 11px, uppercase, bg-secondary text (from `.demo-user-role`)
- Dropdown styling: 8px radius, 1px border, shadow (from `.dropdown` in header)
- Button styling: 8px radius, primary bg, 600 weight (from `.landing-cta-primary`)

**New components that need design spec**:
- Scenario card: horizontal layout, 280px min-width, industry tint bg, no icon circles
- Role switcher row: 40px height, 28px avatar, name + role badge
- Walkthrough panel: bottom-sheet style, 480px max-width, slide-up animation
- Live indicator: 8px dot, pulsing animation, success color
- Stats bar: inline text, no cards, pipe separators

### Responsive & Accessibility Specs

**Responsive breakpoints** (desktop-first, matching existing shell):
```
  VIEWPORT   | ROLE SWITCHER     | SCENARIO CARDS        | WALKTHROUGH        | AUDIT DASHBOARD
  -----------|-------------------|-----------------------|--------------------|------------------
  >1200px    | Full dropdown     | 3-column grid         | Centered, 480px    | Full layout
  768-1199px | Full dropdown     | 2-column grid         | Centered, 480px    | Charts stack
  <768px     | Full-width menu   | 1-column stack        | Full-width sheet   | Filters collapse
             | (mobile nav)      |                       | from bottom        | into dropdown
```

**Scenario cards responsive**:
- Desktop (>1200px): 3 columns, horizontal cards
- Tablet (768-1199px): 2 columns, cards stack naturally via auto-fit
- Mobile (<768px): 1 column, full-width cards with larger touch targets (56px min height)

**Walkthrough overlay responsive**:
- Desktop: Centered panel, 480px max-width
- Mobile: Full-width bottom sheet, slides up from bottom edge, 90vh max-height

**Audit dashboard responsive**:
- Desktop: Side-by-side charts, full table
- Tablet: Charts stack vertically, table scrolls horizontally
- Mobile: Filter controls collapse into "Filters" dropdown, charts hide behind "Show Stats" toggle, table scrolls

**Accessibility requirements**:
- All interactive elements: 44px min touch target (WCAG 2.5.5)
- Role switcher dropdown: keyboard navigable (Tab to open, Arrow keys to select, Enter to confirm, Escape to close)
- Walkthrough overlay: focus trap while open, Escape to exit, Return focus to trigger element on close
- Audit table: proper `<table>` semantics with `<th>` headers, sortable columns announced to screen readers
- Live indicator: `aria-live="polite"` region for "Last updated Xs ago" text
- Color contrast: All text meets 4.5:1 minimum (existing --shell-text-secondary on white is 4.6:1, passes)
- Industry tint backgrounds: must maintain contrast with text overlaid (test with WCAG contrast checker)
- Walkthrough panel: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to step title
- Scenario cards: `role="button"`, `tabindex="0"`, Enter/Space to activate, `aria-pressed` for active scenario

## Page Layout (existing)
┌──────────────────────────────────────────────────────────────┐
│  🐢 Demo Showcase                                            │
│  See how Shell Platform works for regulated industries       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 🏥         │ │ 💰         │ │ 🏛          │               │
│  │ Healthcare │ │ Finance    │ │ Government │               │
│  │ HIPAA      │ │ SOX        │ │ FedRAMP    │               │
│  │ 4 roles    │ │ 4 roles    │ │ 4 roles    │               │
│  │ 4 apps     │ │ 4 apps     │ │ 4 apps     │               │
│  │ [Launch]   │ │ [Launch]   │ │ [Launch]   │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Selected: Healthcare — HIPAA Compliance                     │
│                                                              │
│  Roles:                                                      │
│  👤 Dr. Smith (Physician) — Full patient records access      │
│  💰 Jane Doe (Billing) — Invoices and claims only            │
│  👁 John Audit (Compliance) — Audit logs and monitoring      │
│  ⚙ Alice Admin — Full system administration                  │
│                                                              │
│  Guided Walkthrough:                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Step 1/5: Login as Dr. Smith                            ││
│  │ "You are a physician accessing patient records..."      ││
│  │ [▶ Start]                                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Walkthrough Engine
When "Start" is clicked:
1. Overlay appears with step-by-step guide
2. Each step auto-switches the user if needed
3. Highlights what to observe (nav changes, available apps)
4. "Next" / "Previous" navigation
5. "Exit Walkthrough" returns to normal demo mode

### Data Flow — Scenario Activation

```
User selects "Healthcare" scenario
  └─▶ shell-container.activateScenario('healthcare')
       ├─▶ scenarioRegistry.get('healthcare')
       ├─▶ manifestRegistry.loadScenario(scenario.apps)
       │    └─▶ PATCH /api/manifests for each app (or replace in-memory)
       ├─▶ authService.switchUser(scenario.users[0].userId)
       ├─▶ fetchApps() — gets scenario-specific manifests
       └─▶ render demo-scenario-page with walkthrough
```

### Edge Cases
- **Scenario switch while app is open**: Close app, reset to home
- **Manifest registry unreachable**: Fall back to in-memory scenario apps
- **Walkthrough interrupted by user logout**: Exit walkthrough, clear scenario state
- **User navigates away from demo page**: Scenario state persists (user stays logged in as scenario user)

### Tests
- Unit: Scenario registry returns correct users/apps per scenario
- Integration: Activating scenario updates manifests and user correctly
- Walkthrough: Steps advance in order, user switches correctly

---

## Feature 3: Enhanced Audit Dashboard

### Problem
Current audit dashboard is functional but basic. No real-time updates, no workflow visualization, no correlation between events.

### Solution
Three tiers of enhancement:

**Tier 1: Real-time Auto-Refresh**
- Poll audit API every 3 seconds when dashboard is visible
- Visual indicator showing "Live" status
- New events animate in with a subtle highlight
- Pause/resume toggle

**Tier 2: Workflow Timeline Integration**
- Embed the existing `workflow-timeline` component
- Group events by `workflowId` / `correlationId`
- Show cross-app workflow visualization
- Click a workflow to filter events to that correlation

**Tier 3: Advanced Filtering & Drill-Downs**
- Time range picker (last hour, today, last 7 days, custom)
- Per-user event count breakdown
- Per-app event count breakdown
- Export to JSON/CSV
- Event detail modal (click any row for full metadata)

### Files Changed
- `dashboard-app/public/index.html` — add new UI sections, workflow timeline container
- `dashboard-app/public/dashboard.js` — add polling, workflow integration, advanced filters
- `shell/src/components/shell-container.ts` — inject workflow-tracker data into dashboard iframe
- `audit-service/src/routes/audit.ts` — add time-range filter params, add stats endpoint

### New API Endpoints

```
GET /api/audit/stats
  Returns: {
    totalEvents, eventsToday, eventsByUser, eventsByApp,
    eventsByAction, errorRate, avgEventsPerHour
  }

GET /api/audit?from=&to=
  New params: from=ISO8601, to=ISO8601 for time range filtering
```

### Data Flow — Real-Time Updates

```
Dashboard visible in iframe
  └─▶ setInterval(loadAuditEvents, 3000)
       └─▶ fetchAuditData()
            └─▶ compare with previous event count
                 ├─▶ new events: animate in, flash highlight
                 ├─▶ update stats bar
                 └─▶ update autocomplete data
```

### Data Flow — Workflow Correlation

```
shell-container receives AUDIT_EVENT with workflowId
  └─▶ workflowTracker.recordSpan(event)
       └─▶ broadcast to all iframes via postMessage
            └─▶ dashboard receives WORKFLOW_UPDATE
                 └─▶ workflow-timeline component re-renders
                      └─▶ click span → filter audit table by correlationId
```

### UI Additions to Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 LIVE  [⏸ Pause]  [↻ Refresh]  Last updated: 3s ago         │
├─────────────────────────────────────────────────────────────────┤
│  Events: 1,247  |  Today: 342  |  Users: 12  |  Apps: 5       │
│  Success Rate: 98.2%  |  Errors: 22                            │
├─────────────────────────────────────────────────────────────────┤
│  Filters:                                                      │
│  [Action ▼] [User ▼] [App ▼] [Time: Last 24h ▼]               │
│  [Correlation ID: ____________] [🔍 Search] [Clear All]        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌──────────────────────────────────┐  │
│  │ Events by User      │ │ Events by App                    │  │
│  │ Alice    ██████ 42% │ │ sample-app  ████████ 35%         │  │
│  │ Bob      ████  28% │ │ dashboard   ██████  28%           │  │
│  │ Carol    ██    15% │ │ api-explorer ███   20%            │  │
│  │ Dave     █     15% │ │ admin-mgr   █      17%            │  │
│  └─────────────────────┘ └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Workflow Timeline (when workflowId present)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ workflow-timeline component renders here                 │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Timestamp          Action          App     User   Status       │
│  2026-03-31 14:32   LOGIN           shell   alice  success      │
│  2026-03-31 14:33   DOCUMENT.VIEW   sample  alice  success      │
│  2026-03-31 14:33   AUDIT.LOG       sample  alice  success      │
│  ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  [Export JSON] [Export CSV]  Showing 100 of 1,247 events       │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Cases
- **API fails during poll**: Silent retry, show "Connection lost" banner, resume on success
- **Dashboard not in shell**: Falls back to direct fetch (existing behavior)
- **Zero events**: Show empty state with "No audit events yet. Try performing actions in other apps."
- **Large event count**: Server-side pagination (limit 1000), show "Showing latest 1000 of X events"
- **Timezone**: All timestamps in user's local timezone, ISO format in API

### Tests
- Integration: Polling updates UI when new events arrive
- Visual: New events flash-highlight for 1 second
- Filtering: Time range filter returns correct subset
- Workflow: Clicking workflow span filters audit table

---

## Implementation Order

### Phase 1: Role-Switching (smallest, highest impact)
1. Add `switchUser()` to `auth.ts`
2. Add role switcher section to `shell-header.ts` user menu
3. Wire `switch-user` event handler in `shell-container.ts`
4. Test: Switch between all 4 users, verify nav updates

### Phase 2: Enhanced Audit Dashboard
1. Add time-range params to audit service GET endpoint
2. Add polling logic to `dashboard.js`
3. Add stats breakdown charts (users/apps)
4. Integrate `workflow-timeline` component into dashboard
5. Add export buttons
6. Test: Real-time updates, filtering, workflow visualization

### Phase 3: Demo Showcase Page
1. Create `demo-scenarios.ts` with 3 scenario definitions
2. Create `demo-scenario-page.ts` component
3. Add scenario activation to `shell-container.ts`
4. Add "Demo Showcase" link to header and landing page
5. Build walkthrough engine
6. Test: Scenario activation, walkthrough flow, manifest swapping

---

## NOT in Scope

- Real OIDC/SAML auth integration (demo mode only)
- Persistent scenario storage (in-memory, resets on restart)
- Server-sent events / WebSocket for audit (polling is sufficient for demo)
- Custom user creation (uses existing DEMO_USERS)
- DESIGN.md creation (defer to /design-consultation as follow-up)
- Third-party chart library for audit dashboard (pure CSS bars instead)
- Auto-advancing walkthrough (manual "Start" per step)
- Mobile-optimized walkthrough overlay (bottom sheet on mobile is sufficient)

---

## What Already Exists

- **DEMO_USERS**: 4 users with different permission sets already defined in `types/index.ts`
- **Workflow Tracker**: `workflow-tracker.ts` and `workflow-timeline.ts` already exist (untracked files)
- **Audit Dashboard**: Basic dashboard with filtering, autocomplete, stats already works
- **Manifest Admin Panel**: `manifest-admin-panel.ts` already exists for editing manifests
- **postMessage Protocol**: Full bidirectional communication already implemented
- **Permission Filtering**: Nav already filters by user permissions

---

## Dream State Delta

Current state: Functional micro-frontend shell with basic demo auth and audit logging.

After this plan: A compelling, interactive demo experience that lets prospects:
1. Instantly see how RBAC works by switching roles in real-time
2. Understand the platform's fit for their regulated industry via pre-built scenarios
3. See the complete audit trail with workflow correlation — the compliance story

12-month ideal: Full multi-tenant SaaS with real auth providers, persistent scenarios, custom role creation, and real-time audit streaming via WebSockets. This plan moves us toward that by establishing the demo infrastructure and audit visualization patterns that will scale.

---

## Error & Rescue Registry

```
CODEPATH                    | WHAT CAN GO WRONG          | RESCUED? | HOW
----------------------------|----------------------------|----------|---------------------------
switchUser()                | userId not found           | Y        | Throw Error, show toast
activateScenario()          | Manifest registry down     | Y        | Use in-memory fallback
activateScenario()          | Scenario ID not found      | Y        | Show error, stay on current
Audit polling               | Network error              | Y        | Silent retry, show banner
Audit polling               | Malformed response         | Y        | Skip update, log error
Walkthrough step            | User logged out mid-step   | Y        | Exit walkthrough gracefully
Export audit data           | No events to export        | Y        | Show "nothing to export"
```

---

## Failure Modes Registry

```
CODEPATH              | FAILURE MODE          | RESCUED? | TEST? | USER SEES?        | LOGGED?
----------------------|-----------------------|----------|-------|-------------------|--------
switchUser()          | Invalid userId        | Y        | Y     | Error message     | Y
activateScenario()    | Registry unreachable  | Y        | Y     | Fallback notice   | Y
Audit polling         | API 500               | Y        | Y     | "Connection lost" | Y
Audit polling         | Stale data            | Y        | N     | Nothing (safe)    | N
Walkthrough           | Step userId missing   | Y        | Y     | Skip step         | Y
Export                | Browser download fail | Y        | N     | Error toast       | Y
```

---

## Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Shell @ 8888)                                     │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ shell-header│    │ demo-scenario│    │ shell-        │  │
│  │ + role      │    │ page         │    │ container     │  │
│  │   switcher  │    │ (new)        │    │ (orchestrator)│  │
│  └──────┬──────┘    └──────┬───────┘    └───────┬───────┘  │
│         │                  │                    │           │
│         └──────────────────┼────────────────────┘           │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AuthService  │  ScenarioRegistry  │  WorkflowTracker│  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Iframe: Audit Dashboard (8889)                      │  │
│  │  + Real-time polling                                 │  │
│  │  + Workflow timeline                                 │  │
│  │  + Advanced filtering                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐        ┌──────────────────────┐
│ Audit Service    │        │ Manifest Registry    │
│ POST /api/audit  │        │ GET /api/manifests   │
│ GET /api/audit   │        │ PATCH /api/manifests │
│ GET /api/audit/  │        └──────────────────────┘
│   stats          │
└──────────────────┘
```

### Data Flow — Role Switch

```
User clicks role
  └─▶ CustomEvent('switch-user', { userId })
       └─▶ shell-container.handleSwitchUser()
            ├─▶ authService.switchUser(userId)
            │    ├─▶ clearSession()
            │    └─▶ setDemoUser(userId) → saveSession()
            ├─▶ fetchApps() → GET /api/manifests
            │    └─▶ filter by new user.permissions
            ├─▶ activeAppId = null
            └─▶ re-render
                 ├─▶ header: new user name/avatar
                 ├─▶ nav: filtered items
                 └─▶ content: landing page or home
```

### Data Flow — Scenario Activation

```
User selects scenario
  └─▶ activateScenario(scenarioId)
       ├─▶ scenarioRegistry.get(scenarioId)
       ├─▶ manifestRegistry.loadScenario(scenario.apps)
       │    └─▶ replace in-memory manifests
       ├─▶ authService.switchUser(firstUser.userId)
       ├─▶ fetchApps() → gets scenario manifests
       └─▶ render demo-scenario-page
            └─▶ walkthrough overlay (optional)
```

### State Machine — Demo Mode

```
                  ┌─────────────┐
                  │   Landing   │  (no user)
                  └──────┬──────┘
                         │ login
                         ▼
                  ┌─────────────┐
                  │  Home View  │  (user logged in)
                  └──┬─────┬───┘
                     │     │
          switchRole │     │ navigate to app
                     │     ▼
                     │  ┌──────────┐
                     │  │ App      │
                     │  │ (iframe) │
                     │  └────┬─────┘
                     │       │ home
                     │       ▼
                     │  ┌──────────┐
                     └──│ Home View│
                        └──────────┘
                         │
              openDemoShowcase
                         ▼
                  ┌─────────────┐
                  │  Demo       │
                  │  Showcase   │
                  └──────┬──────┘
                         │
              selectScenario
                         ▼
                  ┌─────────────┐
                  │  Scenario   │
                  │  Active     │──▶ walkthrough
                  └─────────────┘
```

---

## Verification Steps

1. `npm run build` — TypeScript compiles, Vite builds
2. `npm run test` — all tests pass
3. Manual QA:
   - Login as Alice, switch to Bob via dropdown, verify nav changes
   - Switch to Carol, verify only Audit Dashboard appears
   - Open Demo Showcase, select Healthcare scenario
   - Run walkthrough, verify user switches and observations match
   - Open Audit Dashboard, verify real-time updates
   - Perform actions in Sample App, verify they appear in audit log
   - Filter audit events by user, app, time range
   - Export audit data

## Unresolved Design Decisions

```
  DECISION NEEDED                        | IF DEFERRED, WHAT HAPPENS
  ---------------------------------------|------------------------------------------
  Walkthrough completion state           | Engineer ships nothing — user stuck at
                                         | last step with no "done" feedback
  Role-switch toast notification         | Silent switch — user unsure if it worked
  Scenario card visual distinction       | Generic card grid — looks like every
  (industry tint vs icon)                | other SaaS template
  Audit dashboard: chart library or      | Engineer picks randomly — inconsistent
  pure CSS bars                          | with rest of dashboard's vanilla JS
  Mobile nav for role switcher           | Desktop nav breaks on mobile — no
                                         | accessible way to switch roles
  Walkthrough: auto-advance vs manual    | Auto-advance may skip important steps;
  "Start" per step                       | manual adds friction
  Audit new-event flash duration         | Too fast = invisible, too slow =
                                         | distracting. Default 1s, needs tuning
  Scenario page: back button behavior    | User exits scenario — do they return
                                         | to showcase or to home?
```

**Decisions resolved during this review**:
1. Walkthrough = simple overlay with Next/Previous, no auto-advance (user clicks "Start" per step)
2. Role switch triggers toast: "Switched to {name} — {N} apps available"
3. Scenario cards use industry tint backgrounds (no icons, no emoji)
4. Audit charts = pure CSS horizontal bars (no library, matches vanilla JS stack)
5. Walkthrough completion shows: "You've seen how Shell Platform handles {compliance}. Want to try another scenario?" with links
6. Scenario page back button returns to showcase page (not home)
7. New event flash = 1 second blue highlight, fade to normal

---

## ENG REVIEW FINDINGS

### Scope Decisions (Step 0)
| # | Decision | Resolution |
|---|----------|-----------|
| 1 | Walkthrough engine complexity | Simple overlay (Next/Prev, auto-switch, observe text) |
| 2 | Scenario manifest loading | In-memory override in shell, no registry PATCH |
| 3 | Workflow timeline in dashboard | Vanilla JS rewrite, not LitElement |
| 4 | Scenario user mapping | Reference DEMO_USERS by ID, add narrative labels |
| 5 | shell-container.ts bloat | Extract demo-controller service |
| 6 | Audit polling strategy | Visibility-aware + configurable interval |
| 7 | Stats endpoint performance | Extend in-memory stats, O(1) reads |

### Architecture Issues Resolved
1. **Manifest loading** — scenarios stay in-memory in shell, no cross-service calls needed
2. **Timeline tech mismatch** — vanilla JS rewrite for dashboard, no LitElement dependency
3. **User definition DRY** — scenarios reference existing DEMO_USERS, no duplication

### Code Quality Issues Resolved
4. **Container bloat** — new `demo-controller.ts` service extracts demo state from `shell-container.ts`
5. **Polling robustness** — `visibilitychange` API pauses polling when tab hidden, configurable interval constant
6. **Stats performance** — extend existing in-memory `stats` object instead of re-reading JSONL

### Test Coverage Gap
**0/28 code paths tested.** The plan needs tests added for:
- `auth.ts:switchUser()` — 3 paths (happy, not found, non-demo)
- `demo-scenarios.ts` — 3 paths (get, getAll, user mapping)
- `demo-controller.ts` — 5 paths (activate, deactivate, switch, errors)
- `shell-header.ts` role switcher — 3 paths (demo mode, current highlight, dispatch)
- `demo-scenario-page.ts` — 7 paths (cards, launch, walkthrough nav, exit, logout)
- `audit.ts` new endpoints — 4 paths (time range, stats, errors, empty)
- `dashboard.js` polling — 5 paths (start, pause, resume, fail, highlight)
- E2E flows — 6 critical user journeys

All tests should be added alongside implementation. Vitest for shell code, manual QA checklist for dashboard.

### Performance Issues Resolved
7. **Stats endpoint O(n)** — in-memory counters updated on POST, O(1) on GET

---

## NOT in scope

- Real OIDC/SAML auth integration (demo mode only)
- Persistent scenario storage (in-memory, resets on restart)
- Server-sent events / WebSocket for audit (polling is sufficient)
- Mobile responsive design for showcase page (desktop-first)
- Custom user creation (uses existing DEMO_USERS)
- SQLite or database for audit events (in-memory stats sufficient)
- LitElement timeline component in dashboard (vanilla JS instead)

## What already exists

- **DEMO_USERS**: 4 users with different permission sets in `types/index.ts`
- **Workflow Tracker**: `workflow-tracker.ts` + `workflow-tracker.test.ts` exist
- **Workflow Timeline**: `workflow-timeline.ts` LitElement exists (shell only)
- **Audit Dashboard**: Basic dashboard with filtering, autocomplete, stats in `dashboard-app/`
- **Manifest Admin Panel**: `manifest-admin-panel.ts` exists
- **postMessage Protocol**: Full bidirectional communication implemented
- **Permission Filtering**: Nav already filters by user permissions via `ManifestStore.getAll()`

## Dream state delta

Current: Functional micro-frontend shell with basic demo auth and audit logging.

After this plan: Interactive demo with real-time role switching, industry-specific scenarios with guided walkthroughs, and a live audit dashboard with workflow correlation.

12-month ideal: Multi-tenant SaaS with real auth providers, persistent scenarios, custom role creation, WebSocket audit streaming. This plan establishes the demo infrastructure and audit visualization patterns that scale.

## Failure Modes

```
CODEPATH              | FAILURE MODE          | RESCUED? | TEST? | USER SEES?        | LOGGED?
----------------------|-----------------------|----------|-------|-------------------|--------
switchUser()          | Invalid userId        | Y        | ADD   | Error message     | Y
activateScenario()    | Invalid scenario      | Y        | ADD   | Error banner      | Y
Audit polling         | API 500               | Y        | ADD   | "Connection lost" | Y
Audit polling         | Tab backgrounded      | Y        | ADD   | Nothing (paused)  | N
Stats endpoint        | Empty log file        | Y        | ADD   | Zero counts       | N
Walkthrough           | User logs out         | Y        | ADD   | Exits gracefully  | Y
Export                | No events             | Y        | ADD   | "Nothing to export"| Y
```

## Parallelization Strategy

| Step | Modules touched | Depends on |
|------|----------------|------------|
| 1. Role-switching | shell-header, auth, shell-container | — |
| 2. Demo scenarios + controller | demo-scenarios.ts, demo-controller.ts, types | — |
| 3. Demo scenario page | demo-scenario-page.ts, shell-container | 2 |
| 4. Audit service endpoints | audit-service/routes | — |
| 5. Dashboard enhancements | dashboard-app/ | 4 |

**Lanes:**
- Lane A: Step 1 (role-switching) — independent
- Lane B: Step 2 + Step 3 (demo scenarios → page) — sequential
- Lane C: Step 4 + Step 5 (audit service → dashboard) — sequential

Launch A + B + C in parallel. No shared modules between lanes.

## Completion Summary

```
+====================================================================+
|            ENG REVIEW — COMPLETION SUMMARY                         |
+====================================================================+
| Step 0               | Scope accepted as-is, 7 decisions resolved  |
| Architecture         | 3 issues found, all resolved                |
| Code Quality         | 3 issues found, all resolved                |
| Test Review          | 0/28 paths covered, 28 gaps identified      |
| Performance          | 1 issue found, resolved                     |
+--------------------------------------------------------------------+
| NOT in scope         | 7 items listed                              |
| What already exists  | 7 existing components reused                |
| Dream state delta    | written                                     |
| Failure modes        | 7 rows, 0 critical gaps                    |
| Parallelization      | 3 lanes, all parallel                       |
+====================================================================+
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ACCEPTED | 3 features, 7 scope decisions resolved |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 7 issues found (all resolved), 28 test gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | 4/10 → 8/10, 12 decisions made |

**UNRESOLVED:** 0 decisions
**VERDICT:** CEO + DESIGN CLEARED. ENG REVIEW has open test gaps — add tests before shipping.
