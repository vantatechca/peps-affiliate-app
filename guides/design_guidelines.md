# Affiliate Marketplace App - Design Guidelines

## Design Approach

**Reference-Based Design** drawing inspiration from:
- **Airbnb** - Marketplace browsing, card layouts, and discovery patterns
- **Linear** - Clean dashboards, modern typography, and status indicators
- **Stripe** - Financial interfaces, data visualization, and professional aesthetic
- **Instagram/TikTok** - Creator-focused elements, video galleries, and social proof

**Design Principles:**
- Creator empowerment through visual clarity
- Professional credibility for company profiles
- Seamless marketplace discovery
- Data-driven decision making

---

## Color Palette

### Light Mode
- **Primary Brand**: 210 90% 55% (vibrant blue - trust and professionalism)
- **Primary Hover**: 210 90% 50%
- **Secondary**: 200 90% 50% (energetic cyan - action and opportunity)
- **Background**: 0 0% 100%
- **Surface**: 240 10% 98%
- **Border**: 240 6% 90%
- **Text Primary**: 240 10% 10%
- **Text Secondary**: 240 5% 45%
- **Success**: 142 76% 45% (earnings, approvals)
- **Warning**: 38 92% 55% (pending actions)
- **Error**: 0 84% 60%

### Dark Mode
- **Primary Brand**: 210 90% 60%
- **Primary Hover**: 210 90% 65%
- **Secondary**: 200 90% 55%
- **Background**: 240 10% 10%
- **Surface**: 240 8% 14%
- **Border**: 240 6% 20%
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 240 5% 65%

---

## Typography

**Font Families:**
- **Primary**: Inter (via Google Fonts) - UI elements, body text, data
- **Display**: Cal Sans (or Sora) - Hero headlines, marketing sections
- **Mono**: JetBrains Mono - Tracking codes, analytics numbers

**Scale:**
- Display XL: 72px / 900 weight (landing heroes)
- Display L: 48px / 800 weight (page titles)
- Heading 1: 36px / 700 weight (section headers)
- Heading 2: 28px / 600 weight (card titles)
- Heading 3: 20px / 600 weight (subsections)
- Body Large: 18px / 500 weight (important text)
- Body: 16px / 400 weight (standard)
- Body Small: 14px / 400 weight (metadata)
- Caption: 12px / 500 weight (labels, badges)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 1, 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm

**Container Widths:**
- Marketing pages: max-w-7xl (1280px)
- App dashboards: max-w-screen-2xl with sidebar
- Content sections: max-w-6xl
- Forms: max-w-2xl
- Modals: max-w-4xl

**Grid Systems:**
- Offer cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Analytics: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Video gallery: grid-cols-2 md:grid-cols-3 lg:grid-cols-4

---

## Core Components

### Navigation
**Desktop**: Fixed top navbar with logo left, main nav center (Browse, Dashboard, Messages, Analytics), user menu right with avatar and dropdown
**Mobile**: Bottom tab bar (Home, Browse, Messages, Profile) with FAB for quick apply

### Offer Cards
- 16:9 thumbnail with gradient overlay at bottom
- Company logo badge (40px circle) positioned bottom-left over image
- Category badge top-right (colored by niche)
- Title (2 lines max, truncate)
- Company name with verified checkmark
- Commission amount in large, bold text
- Commission type tag (Sale/Lead/Retainer)
- Heart icon for favorites (top-right, subtle)
- Hover: Lift with shadow elevation, scale 1.02

### Status Badges
- Pending: Warning color, pulsing dot animation
- Approved: Success color, checkmark icon
- Active: Secondary color, activity indicator
- Completed: Neutral gray, archive icon
- Pills with 6px border radius, 10px padding

### Video Player
Custom player with:
- Thumbnail preview with play button overlay (large 80px circle)
- Progress bar (accent color)
- Minimal controls (play/pause, volume, fullscreen)
- Video count indicator (e.g., "Video 3 of 12")
- Creator credit overlay (bottom-left, small text)

### Analytics Cards
- White/dark surface with subtle border
- Icon + metric title (small caps)
- Large number display (mono font, 36px)
- Percentage change with up/down arrow and color coding
- Sparkline graph (optional for trends)
- Grid layout with equal heights

### Application Flow Modal
- Multi-step progress indicator at top (dots or steps)
- Large, clear step titles
- Form fields with floating labels
- Sticky action buttons at bottom
- Success state with confetti animation
- 600px width, centered

### Messaging Interface
Split view (desktop):
- Left: Conversation list (320px fixed, scrollable)
- Right: Active conversation with chat bubbles
- Creator messages: left-aligned, surface color
- Company messages: right-aligned, primary color
- Timestamp below each message
- Typing indicator (animated dots)
- Sticky input field with attachment button

### Review & Rating
- Star rating (interactive, 40px stars)
- Category ratings (horizontal bars with labels)
- Text area with character counter
- Example reviews carousel below
- Average rating display with breakdown graph

---

## Page-Specific Treatments

### Landing Page
**Hero**: Full viewport (90vh) with split design
- Left 50%: Bold headline "Turn Your Influence Into Income", subheading, dual CTAs (primary "Browse Offers", secondary "List Your Brand")
- Right 50%: Animated illustration or large hero image showing creators and brands connecting

**Features**: 3-column grid showcasing creator benefits, company benefits, platform features with icons and short descriptions

**Stats Section**: Full-width with 4 columns of animated counting numbers (e.g., "10K+ Creators", "$5M+ Earned", "500+ Brands", "95% Approval Rate")

**How It Works**: 3-step process with large numbered circles, illustrations, and descriptions for both creators and companies

**Video Showcase**: Grid of example success stories with video previews

### Creator Dashboard
**Overview Section**: 4-metric card grid (Total Earnings, Active Offers, Pending Applications, Messages)
**Quick Actions**: Horizontal scrollable pills (Browse New Offers, View Analytics, Check Messages)
**Recommended Offers**: 3-4 cards with "Why recommended" tag
**Recent Activity**: Timeline view of application updates

### Offer Detail Page
**Hero**: 16:9 featured image/video with play overlay, breadcrumb navigation above
**Tabbed Interface**: Sticky tab bar (Overview, Videos, Requirements, Reviews)
**Videos Tab**: 4-column grid of video thumbnails with play button overlays, click to open full-screen player with navigation
**Overview**: Two-column layout - left has description, right has key info cards (commission, payment terms, requirements summary)
**Sticky CTA Bar**: Fixed bottom bar with "Apply Now" button, favorite heart, share button

### My Applications
**Filter Bar**: Sticky top bar with status filters (All, Pending, Approved, Active, Completed)
**List View**: Cards with offer thumbnail left, details center, status badge and actions right
**Quick Actions**: Copy tracking link button, view analytics, message company icons
**Empty State**: Illustration with "No applications yet" message and CTA to browse offers

### Company Dashboard
**Performance Overview**: Large metrics with graphs showing application volume, approval rate, creator engagement
**Active Offers**: Table view with sortable columns (Name, Applications, Status, Performance)
**Quick Create**: Prominent "Create New Offer" button with icon

### Admin Approval Queue
**Split View**: Pending items left (list), detail panel right
**Approval Controls**: Clear approve/reject buttons with reason textarea for rejections
**Document Viewer**: Inline PDF/image viewer for verification documents

---

## Image Strategy

**Required Images:**
1. **Landing Hero**: High-quality lifestyle image showing diverse creators (photographers, videographers, influencers) with professional equipment - warm, authentic, aspirational (1920x1080)
2. **Offer Thumbnails**: Product/service images from companies (16:9 ratio)
3. **Company Logos**: Professional brand marks (square, 512x512)
4. **Creator Avatars**: Profile photos (circular, 200x200)
5. **Example Videos**: 6-12 short-form video files showcasing product promotions
6. **Empty States**: Friendly illustrations for "No applications", "No messages", "No favorites" states
7. **Success Illustrations**: Celebration graphics for approved applications, completed campaigns

Use CDN-hosted placeholder services (Unsplash API, placeholder.com) for demo content.

---

## Animations

Use sparingly for meaningful interactions:
- Page transitions: Fade + slight vertical slide (200ms)
- Card hovers: Scale 1.02 with shadow elevation (150ms ease-out)
- Button clicks: Scale 0.98 (100ms)
- Status changes: Color fade transition (300ms)
- Modal entry: Fade + scale from 0.95 (250ms)
- Success states: Confetti burst (one-time, 2s)
- Loading states: Skeleton screens with shimmer effect

**No autoplay carousels or distracting motion** - maintain professional focus.