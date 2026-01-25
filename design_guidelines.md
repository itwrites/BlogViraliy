# Blog Autopilot Design Guidelines

## Design Approach

**Dual-System Architecture**: This platform requires two distinct design philosophies:
- **Admin Dashboard**: Linear/Notion-inspired utility-first design emphasizing clarity and efficiency
- **Public Sites**: Flexible, template-driven designs inspired by modern content platforms (Medium, Substack, TechCrunch) that can be customized per site type

## Core Design Elements

### Typography System
**Admin Dashboard**:
- Primary: Inter (400, 500, 600) for UI elements and data
- Monospace: JetBrains Mono for domain names, technical fields
- Hierarchy: text-sm for labels, text-base for content, text-lg for section headers, text-2xl for page titles

**Public Sites (Configurable)**:
- Blog Type: Merriweather (headings) + Source Sans Pro (body) for editorial feel
- News Type: Roboto Condensed (headings) + Roboto (body) for information density
- Article titles: text-3xl to text-5xl, body text: text-lg with generous line-height (1.7)

### Layout & Spacing System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistency
- Micro-spacing: p-2, gap-2 for tight groupings
- Component padding: p-4, p-6 for cards and containers
- Section spacing: py-12, py-16, py-20 for vertical rhythm
- Generous whitespace: py-24 for major section breaks on public sites

**Grid System**:
- Admin: 12-column grid with max-w-7xl container
- Public Blog: max-w-3xl for article content, max-w-7xl for listings
- Public News: 3-column grid (lg:grid-cols-3) for article cards

## Admin Dashboard Components

### Main Layout
**Sidebar Navigation** (w-64, fixed left):
- Site list with domain badges
- "Add New Site" primary action button at top
- Each site entry shows favicon/logo thumbnail, title, domain
- Active site highlighted with subtle background

**Main Content Area** (pl-64 offset):
- Breadcrumb navigation at top
- Page title with action buttons aligned right
- Tabbed interface for site configuration sections

### Site Configuration Interface
**Three-Tab Layout**:
1. **General Settings Tab**: Two-column form (lg:grid-cols-2) with labels above inputs
2. **Automation Tab**: Segmented control for AI vs RSS modes, accordion-style configuration panels
3. **Content Tab**: Split view - post list (60%) and preview pane (40%)

**Form Components**:
- Input fields: h-10 with focus:ring-2 focus states
- Toggles: Prominent switch UI with labels
- Dropdown menus: Custom styled with icons
- Text areas: min-h-32 for prompts, auto-expanding
- Tag input: Chip-based interface with "X" removal

**Data Tables**:
- Zebra striping for post lists
- Sortable column headers
- Inline action buttons (Edit/Delete) on row hover
- Pagination at bottom if >20 items

## Public Site Layouts

### Blog Type Layout
**Homepage Structure**:
1. **Header** (sticky, h-16): Logo left, auto-generated tag menu center, search icon right
2. **Hero Featured Post** (h-[500px]): Large background image with gradient overlay, title (text-5xl), excerpt, author info, blurred-background CTA button
3. **Recent Posts Grid** (2-column on lg, single on mobile): Card-based with thumbnail (aspect-video), title, excerpt (2 lines), tags, date
4. **Tag Archive Sidebar** (sticky, w-64 on xl): Top tags list with post counts

**Article Page**:
- Hero image (full-width, h-[400px])
- Article content (max-w-3xl, centered): Drop cap on first paragraph, pull quotes with border-l-4
- Related posts section (3-column grid) at bottom
- Floating share buttons (sticky left side on desktop)

### News Type Layout
**Homepage Structure**:
1. **Header** (h-14, border-b): Logo + tagline left, horizontal tag navigation (scrollable), theme toggle right
2. **Featured Section** (grid-cols-2 on lg): Main story (large image) + secondary story grid (4 smaller cards)
3. **Latest News** (3-column grid): Compact cards with small thumbnails, headlines (text-xl), timestamp, category badge
4. **Category Sections**: Repeated 3-column grids grouped by top tags with section headers

**Article Page**:
- Compact header with category badge
- Title (text-4xl) + metadata bar (author, date, read time)
- Article content (max-w-4xl) with sidebar for related articles
- Sticky "More from [Category]" rail on right (hidden on mobile)

## Layout Configurability System

**Template Variants** (stored per site):
- Header style: Minimal/Bold/Magazine
- Card style: Compact/Spacious/Image-Heavy
- Typography scale: Tight/Normal/Generous
- Grid density: 2-col/3-col/4-col for listings

**Dynamic Elements**:
- Logo placement and sizing configurable
- Primary accent determines link colors, button fills, tag backgrounds
- Tag menu auto-generates from top 10 tags (horizontal scroll on mobile)

## Component Library

### Admin Components
- **Button variants**: Primary (filled), Secondary (outlined), Danger (red), Icon-only
- **Status badges**: Draft/Published/Scheduled with colored backgrounds
- **Stat cards**: Large number (text-4xl) with label and trend indicator
- **Empty states**: Centered icon + message + primary action for zero-data scenarios

### Public Components
- **Article cards**: Consistent aspect-ratio images (16:9), max 2-line titles with ellipsis
- **Tag pills**: Rounded-full, text-sm, hover:bg-opacity-80, clickable
- **Author bylines**: Avatar (h-10 w-10 rounded-full) + name + date in flex row
- **Newsletter signup**: Fixed bottom banner (dismissible) or inline between articles
- **Search overlay**: Full-screen modal with autofocus input

## Images

**Admin Dashboard**: Minimal images - only site favicons/logos in thumbnails
**Public Sites - Blog Type**: 
- Hero: Requires large atmospheric image (1920x800), subtle gradient overlay
- Article cards: Thumbnail images (16:9 ratio, 600x400 minimum)
**Public Sites - News Type**:
- Featured articles: High-quality news photos (1200x675)
- Card thumbnails: Smaller images (400x225) for compact layout

## Accessibility & Polish
- Maintain ARIA labels on all interactive elements
- Focus indicators visible on all form fields and buttons
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Skip-to-content links for public sites
- Keyboard navigation through tag menus and post listings
- Loading states for AI generation, RSS fetching with skeleton screens