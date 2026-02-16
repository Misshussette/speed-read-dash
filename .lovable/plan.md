

# StintLab — "Engineering Your Race Data."

A modern race telemetry analysis webapp. Upload a CSV, get insights in seconds.

---

## Page 1: Landing Page (`/`)

- Dark, motorsport-themed hero section with the StintLab logo and tagline
- Single prominent CTA: **"Upload CSV"** with drag-and-drop zone
- Brief feature highlights (3 icons: Upload → Analyze → Export)
- Optional link to load a bundled demo CSV (`/sample` flow)
- Clean footer with link to `/about`

---

## Page 2: Dashboard (`/app`)

After CSV upload, the user lands here. All data is parsed and stored in-session (with optional localStorage persistence for revisits).

### A) Global Filter Bar (sticky top)
- **Track** dropdown
- **Session** dropdown
- **Driver** multi-select
- **Stint** multi-select
- **Pit laps** toggle (include/exclude)
- Reset filters button
- Placeholder slot for future "Lane" filter

### B) KPI Cards Row (6 cards)
1. Best Lap Time (excl. pit laps)
2. Average Pace (excl. pit laps)
3. Consistency (std deviation of lap times)
4. Total Laps
5. Pit Stops Count
6. Total Pit Time

### C) Main Charts Section (scrollable, interactive via Recharts)
1. **Lap Time Over Laps** — line chart with best lap highlighted
2. **Sector Comparison** — grouped bar chart showing S1/S2/S3 averages per driver (gracefully hidden if sector data missing)
3. **Driver Comparison** — bar chart: best / average / consistency per driver
4. **Stint Timeline** — line chart of average pace per stint with pit event markers

### D) Pit Analysis Section
- Sortable table of all pit events (lap number, pit type, pit time, timestamp)
- Summary cards grouped by pit_type (count, avg pit time)

### E) Export Actions
- "Export Filtered Data" → downloads filtered dataset as CSV
- "Export Charts" → download individual charts as PNG

---

## Page 3: About (`/about`)
- Short product explanation, feature list, and future roadmap teaser

---

## Design & UX
- **Dark theme by default** with a single telemetry accent color (e.g., a cyan/teal)
- Clean card-based layout with generous spacing
- Modern sans-serif typography
- Responsive grid (works well on tablets)
- Minimal UI — filters + export, no clutter
- Clear empty states ("No data — upload a CSV to begin") and error handling (wrong delimiter, missing columns)

---

## Technical Approach
- Semicolon-delimited CSV parsing with validation (check required columns, handle missing sectors)
- All metric computation done client-side
- Session data stored in React state + optional localStorage/IndexedDB for persistence
- Recharts for all charts (already installed)
- Code structured with future-proofing in mind: auth context placeholder, feature-gate utility (disabled in Phase 1), modular chart/filter components ready for plan-based access control

---

## What's Deferred (Phase 2+)
- Authentication & user accounts
- Plan tiers (Free / Pro / Team) with feature gating
- Cloud storage & team workspaces
- Sharing & collaboration
- Advanced filters (lane, weather, etc.)

