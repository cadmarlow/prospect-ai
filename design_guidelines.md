# Design Guidelines - Prospection Tool for Commercial Real Estate

## Design Approach

**System Selected:** Linear-inspired SaaS Design
**Rationale:** Data-heavy B2B productivity tool requiring clarity, efficiency, and professional aesthetics. Linear's modern, clean approach balances sophistication with usability for information-dense interfaces.

## Typography

**Font Families:**
- Primary: Inter (400, 500, 600) via Google Fonts
- Monospace: JetBrains Mono (for emails, domains, data)

**Hierarchy:**
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Labels/Meta: text-sm font-medium
- Captions: text-xs

## Layout System

**Spacing Units:** Consistent use of 4, 6, 8, 12, 16 (p-4, gap-6, mb-8, py-12, space-y-16)

**Container Strategy:**
- Sidebar navigation: Fixed w-64
- Main content area: max-w-7xl with px-8 py-6
- Cards/Panels: p-6 standard, p-8 for primary sections
- Form fields: mb-4 between fields, mb-8 between field groups

## Core Components

### Navigation
- **Left Sidebar (Fixed):** Logo at top, vertical nav items (py-3 px-4 each), icons from Heroicons (outline style), section dividers with subtle borders
- **Top Bar:** Search bar (max-w-md), user menu, notification bell, breadcrumbs for sub-pages

### Dashboard Layout
- **Stats Cards Row:** 4-column grid (grid-cols-4 gap-4) showing total prospects, emails sent, open rate, conversion rate
- **Primary Table:** Full-width data table with sticky header, row hover states, sortable columns, checkbox selection, action menu per row
- **Filters Panel:** Collapsible left panel (w-72) with region dropdown, activity type checkboxes, date range picker, "Apply Filters" button at bottom

### Data Tables
- Alternating row treatment for readability
- Column headers: text-xs font-semibold uppercase tracking-wide
- Cell padding: px-6 py-4
- Action buttons: Icon-only (Heroicons) aligned right
- Pagination: Bottom-centered with page numbers, previous/next

### Forms & Input
- **Template Creator:** Split layout - form fields (left 2/3) + live preview (right 1/3)
- **Field Groups:** Border-wrapped sections with pb-6 between groups
- **Labels:** Above inputs, text-sm font-medium mb-2
- **Inputs:** Full-width, h-11, rounded-lg borders, focus states
- **Rich Text Editor:** For email composition (minimum toolbar: bold, italic, link, lists)

### Campaign Management
- **Campaign Cards:** Grid layout (grid-cols-3 gap-6), each card showing campaign name, status badge, stats (sent/opened/clicked), action buttons
- **Status Badges:** Small rounded pills (px-3 py-1 text-xs) - "Active", "Paused", "Completed", "Draft"

### Email Preview
- **Modal Overlay:** max-w-2xl centered, email content with realistic inbox styling (from/to/subject headers), scrollable content area

### Export & Actions
- **Bulk Actions Bar:** Sticky top bar appearing when rows selected, showing count + action buttons (Export CSV, Send Email, Delete)
- **Export Modal:** Simple dialog with format selection (CSV/Excel), field selection checkboxes, download button

## Visual Patterns

**Elevation:**
- Cards: Subtle border, no shadow
- Modals/Dialogs: Stronger border with backdrop overlay
- Dropdowns: Border with subtle shadow

**Borders:** Consistent use of border rounded-lg for cards, rounded-md for inputs/buttons

**Button Styles:**
- Primary CTA: Solid fill, px-6 py-2.5, rounded-lg, font-medium
- Secondary: Border variant, same padding
- Tertiary: Text-only with hover background
- Icon buttons: p-2, rounded-md

**Icons:** Heroicons (outline style throughout), w-5 h-5 standard size, w-4 h-4 for inline/small contexts

## Page Structures

### Dashboard (Home)
1. Top stats cards row
2. Recent activity section (mb-8)
3. Prospects table with integrated filters
4. Quick actions floating button (bottom-right)

### Prospects Database
1. Search bar + filter toggle (top)
2. Collapsible filter panel (left)
3. Main table (center-right) with sorting, pagination
4. Bulk action bar (conditional)

### Campaign Creator
1. Step indicator (top, 3 steps)
2. Form content (left 2/3): Template selection, recipient filters, schedule options
3. Preview panel (right 1/3): Real-time email preview
4. Navigation buttons (bottom): Back, Save Draft, Next/Launch

### Templates Library
1. Grid of template cards (grid-cols-2 lg:grid-cols-3)
2. Each card: Preview thumbnail, title, description, edit/duplicate/delete actions
3. "Create New Template" card prominently positioned

**No animations** - Focus on instant responsiveness and data clarity

**Accessibility:** Consistent form labels, ARIA labels for icon buttons, keyboard navigation for tables, focus indicators on all interactive elements

This design prioritizes data density, workflow efficiency, and professional polish suitable for a B2B SaaS prospecting tool.