# Component System

## Overview
This document tracks reusable components across the EOYR Dashboard. When a component is updated, it should be updated on ALL pages where it exists.

## Component Format
Components are marked with HTML comments:
```html
<!-- COMPONENT START: [ComponentName] -->
...component code...
<!-- COMPONENT END: [ComponentName] -->
```

## Active Components

### 1. Navigation (MainNavigation)
**Location**: All pages (index.html, analytics.html, modeling.html, etc.)
**Description**: Main site navigation including header bar, menu toggle, and full-screen navigation menu with:
- Top navigation bar with logo and desktop links
- Hamburger menu toggle
- Full-screen sliding menu with:
  - Left panel: Main navigation links (Websites, Analytics, Project Logs, Modeling)
  - Center: 3D Spline logo
  - Bottom left: Styleguide, Color Picker, How Reports Work links
  - Bottom left: Email Me button
  - Right panel: Website project cards

**Files containing this component**:
- index.html
- analytics.html
- modeling.html
- styleguide.html
- how-it-works.html

**Update Instructions**: When updating navigation, apply changes to ALL files listed above.

## How to Update Components

1. **Identify the component** by its comment markers
2. **Make your changes** on one page (typically index.html as the source)
3. **Copy the entire component** (including comment markers)
4. **Replace the component** on all other pages where it exists
5. **Test** each page to ensure the component works correctly

## Adding New Components

1. Wrap the reusable code with component comment markers
2. Add an entry to this document listing all files that contain it
3. Ensure the component is consistent across all pages before marking it

