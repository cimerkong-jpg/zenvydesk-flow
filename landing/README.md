# ZenvyDesk Landing Page

A modern, production-ready landing page for ZenvyDesk desktop application.

## Project Structure

```
landing/
├── index.html          # Main HTML file with all sections
├── css/
│   └── styles.css      # Complete design system and responsive styles
├── js/
│   └── script.js       # Vanilla JS for interactions
└── assets/
    ├── images/
    │   ├── logo.svg           # Full horizontal logo (light mode)
    │   ├── logo-dark.svg      # Full horizontal logo (dark mode)
    │   └── logo-icon.svg      # Icon-only version (square)
    └── icons/
```

## Logo Files

### 1. logo.svg (Full Horizontal - Light Mode)
- Dimensions: 180x40px
- Use: Main header, light backgrounds
- Colors: Primary blue (#2563EB) + Dark text (#111827)

### 2. logo-icon.svg (Icon Only)
- Dimensions: 40x40px (square)
- Use: Favicons, app icons, social media
- Colors: Primary blue (#2563EB)

### 3. logo-dark.svg (Full Horizontal - Dark Mode)
- Dimensions: 180x40px
- Use: Dark backgrounds, footer
- Colors: White (#ffffff)

## Logo Design Concept

The ZenvyDesk logo represents structured workflow and productivity:

- **Three blocks**: Represent workflow stages/tasks
- **Varying opacity**: Shows progression and depth
- **Connected flow**: The curved line suggests system integration
- **Geometric simplicity**: Clean, professional, trustworthy

## Typography

- **Zenvy**: Bold (font-weight: 700) - emphasizes brand
- **Desk**: Medium (font-weight: 500) - balanced complement
- Font: System UI sans-serif for maximum compatibility

## Color Palette

- Primary Blue: #2563EB
- Dark: #111827
- White: #ffffff
- Light Gray: #f8fafc

## Features

- ✅ Semantic HTML5 structure
- ✅ Mobile-first responsive design
- ✅ Sticky header with smooth scroll
- ✅ FAQ accordion
- ✅ Mobile menu toggle
- ✅ Clean design system with CSS variables
- ✅ Professional SaaS-style branding
- ✅ WordPress-ready structure

## Sections Included

1. Header (sticky navigation)
2. Hero
3. Problem/Solution
4. Features
5. How It Works
6. Product Preview
7. Benefits
8. Security & Privacy
9. Download CTA
10. FAQ
11. Footer

## Usage

Simply open `index.html` in a browser or deploy to any static hosting service.

For WordPress integration, copy the HTML sections into your page builder or theme.

## Customization

All design tokens are defined in CSS variables at the top of `styles.css`:
- Colors
- Spacing scale
- Font sizes
- Border radius
- Shadows

Update these variables to match your brand.
