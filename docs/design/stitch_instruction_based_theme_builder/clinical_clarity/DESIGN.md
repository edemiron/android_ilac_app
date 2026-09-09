---
name: Clinical Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#b90538'
  on-secondary: '#ffffff'
  secondary-container: '#dc2c4f'
  on-secondary-container: '#fffbff'
  tertiary: '#924628'
  on-tertiary: '#ffffff'
  tertiary-container: '#b05e3d'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#92002a'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#773215'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  taken: '#10B981'
  taken-bg: '#D1FAE5'
  skipped: '#F59E0B'
  skipped-bg: '#FEF3C7'
  missed: '#EF4444'
  missed-bg: '#FEE2E2'
  surface-dark: '#1E293B'
  bg-dark: '#0F172A'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-screen:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg-med:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-regular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-badge:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  time-display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-mobile: 16px
  margin-desktop: 24px
  gutter: 12px
  card-padding: 16px
  touch-target: 48px
---

## Brand & Style
The design system is anchored in **Clinical Modernity & Frictionless Simplicity**. The primary objective is to transform a high-stakes medical task into a calm, manageable habit. By stripping away visual clutter and medical "sterility," the system achieves an interface that is professional yet deeply human.

The aesthetic follows a **Modern Corporate** approach with **Minimalist** sensibilities. It prioritizes high-contrast legibility and generous white space to reduce cognitive load and anxiety. Interaction design is inspired by **Skeuomorphic touches** (soft shadows and tactile buttons) to provide a sense of reliability and physical presence to digital health records.

**Emotional Response:**
- **Reliable:** Users feel their health is in safe hands.
- **Calm:** Reducing the panic of missed doses through soft tones and clear hierarchies.
- **Rewarding:** Using "Dopaminergic" micro-interactions to celebrate adherence.

## Colors
The color strategy uses **Teal (#0D9488)** as a foundation to evoke health, stability, and professionalism. **Rose (#F43F5E)** is reserved for critical accents and alerts, ensuring they stand out without causing undue alarm.

### Color Implementation
- **Primary (Teal):** Used for primary actions, selected states in the date strip, and progress indicators.
- **Secondary (Rose):** Used for interaction warnings and urgent reminders.
- **Status Semantic Colors:** 
  - **Taken:** Emerald green for positive reinforcement.
  - **Skipped:** Amber for non-critical deviations.
  - **Missed:** Soft red for high-priority recovery actions.

### Dark Mode
In dark mode, surfaces shift to **Deep Slate (#0F172A)** rather than pure black to maintain readability and reduce eye strain during late-night or early-morning dosage logging.

## Typography
The system utilizes a dual-font approach to balance personality and utility. **Plus Jakarta Sans** provides a friendly, modern voice for titles and brand moments, while **Inter** ensures maximum legibility for functional data and body text.

**Key Requirements:**
- **Tabular Numerics:** All time pickers, countdowns, and dosage numbers must use `tabular-nums` to prevent horizontal jitter during updates.
- **Hierarchy:** Use `Body Large` for medicine names to ensure they are the first thing a user sees within a card.
- **Mobile Scaling:** For mobile screens, `display-hero` should scale down to 28px to maintain container integrity.

## Layout & Spacing
The layout follows a **Fluid Grid** model designed for high-density information that remains breathable.

- **Grid System:** A 4-column grid for mobile and a 12-column grid for tablet/desktop.
- **Spacing Rhythm:** Based on a 4px baseline. Most components use 16px (`base * 4`) for internal padding.
- **Daily Hub:** Uses a vertical stack for medication cards with a horizontal scroll for the weekly date strip.
- **Interactive Targets:** Every button or tappable area (like the "Taken" swipe action) must maintain a minimum of 48px height/width to accommodate users with limited dexterity.

## Elevation & Depth
Elevation is used to signify "interactability" and to separate the patient's daily schedule from the background.

- **Tonal Layering:** The primary background uses a subtle off-white/slate. Cards sit on top of this with a pure white (light mode) or slate-700 (dark mode) surface.
- **Soft Shadows:** Cards use a multi-layered, low-opacity shadow (e.g., `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`). Shadows should be tinted slightly with the primary teal color in light mode to maintain brand cohesion.
- **Modal Drawers:** Use a backdrop blur (10px) behind bottom sheets to keep the user focused on the time-sensitive task of adding or editing medications.

## Shapes
The shape language is "Soft-Organic." We avoid sharp corners to reduce the clinical, harsh feeling often associated with medical apps.

- **Default (8px):** Used for input fields and small buttons.
- **Large (16px):** Standard for medication cards and status banners.
- **XL (24px):** Used for top-level containers and bottom sheet modals.
- **Pill-Shaped:** Reserved for status badges (Taken, Missed) and the selected day in the calendar strip.

## Components

### Medication Cards
- **Border:** 1px solid secondary border, becoming 2px Primary Teal when active.
- **Structure:** Left-aligned iconography (pill, syrup, injection) with color-coded backgrounds. Right-aligned time and status badges.
- **Interactions:** Swipe-right to trigger "Taken" (Spring animation with Emerald haptic feedback). Swipe-left to "Snooze."

### Time Picker (Dual-Divider Wheel)
- **Visuals:** Two parallel horizontal lines (1.5px thickness, Primary Teal) centered over the active selection. 
- **Typography:** Active numbers are `time-display` style; inactive numbers fade to `textMuted`.

### Input Fields
- **State:** Outlined by default. On focus, the border transitions to Primary Teal with a subtle outer glow.
- **Smart Features:** Integrated camera icon within the "Medicine Name" field for barcode scanning.

### Interaction Banners (Warnings)
- **High Risk:** High-contrast amber/red background with a bold icon. These bypass the standard "soft shadow" rule to appear more "pressed" into the interface, demanding immediate attention.

### Progress Ring
- **Visuals:** A circular SVG stroke using a gradient from Primary Light to Primary. The center displays the percentage in `headline-screen` bold.