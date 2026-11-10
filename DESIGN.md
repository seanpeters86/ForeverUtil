---
version: alpha
name: ForeverUtil
description: A compact, accessible WoW Forever comparison workbench.
colors:
  primary: "#29292e"
  light-page: "#f4f4f2"
  light-surface: "#ffffff"
  light-surface-soft: "#f7f7f6"
  light-secondary: "#56575e"
  light-muted: "#6d7078"
  light-line: "#dedee1"
  light-accent: "#a73d49"
  light-on-accent: "#ffffff"
  light-blue: "#416a9d"
  light-blue-soft: "#eaf0f8"
  light-positive: "#315e91"
  light-negative: "#a4433e"
  light-winner-line: "#416e9f"
  light-winner-surface: "#eaf2fb"
  light-winner-ink: "#244e7b"
  light-panel: "#2b2a30"
  light-panel-ink: "#f7f5f5"
  light-panel-muted: "#c2bec5"
  light-panel-line: "#55525a"
  light-panel-input: "#3d3a42"
  light-panel-accent: "#ffb4ad"
  dark-page: "#1c1c20"
  dark-surface: "#29292e"
  dark-surface-soft: "#323238"
  dark-ink: "#f2f0f0"
  dark-secondary: "#d0ccd0"
  dark-muted: "#b0abb2"
  dark-line: "#49464e"
  dark-accent: "#f2a39b"
  dark-on-accent: "#321c20"
  dark-blue: "#aac9ef"
  dark-blue-soft: "#334154"
  dark-positive: "#aac9ef"
  dark-negative: "#f0aca4"
  dark-winner-line: "#a8c9ef"
  dark-winner-surface: "#34455a"
  dark-winner-ink: "#eff7ff"
  dark-panel: "#26252a"
  dark-panel-ink: "#f7f5f5"
  dark-panel-muted: "#c5bfc7"
  dark-panel-line: "#504c55"
  dark-panel-input: "#39363e"
  dark-panel-accent: "#f2a39b"
  focus: "#d79b53"
  light-quality-poor: "#666970"
  light-quality-common: "#29292e"
  light-quality-uncommon: "#187438"
  light-quality-rare: "#075ba9"
  light-quality-epic: "#812da6"
  light-quality-legendary: "#a64b00"
  light-quality-artifact: "#876000"
  light-quality-heirloom: "#00677e"
  dark-quality-poor: "#b4b5ba"
  dark-quality-common: "#f2f0f0"
  dark-quality-uncommon: "#70dc7c"
  dark-quality-rare: "#81bfff"
  dark-quality-epic: "#d397ff"
  dark-quality-legendary: "#ffad5c"
  dark-quality-artifact: "#f0d681"
  dark-quality-heirloom: "#7bdcf0"
typography:
  heading-page:
    fontFamily: Space Grotesk
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0px
  heading-section:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0px
  body:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: 400
    letterSpacing: 0px
  item-name:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: 700
    letterSpacing: 0px
  score:
    fontFamily: JetBrains Mono
    fontSize: 29px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 700
    letterSpacing: 0px
rounded:
  none: 0px
  control: 3px
  panel: 4px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  panel: 24px
  comparison-gap: 14px
  workspace-gap: 28px
components:
  page-light:
    backgroundColor: "{colors.light-page}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  page-dark:
    backgroundColor: "{colors.dark-page}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
  item-card-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.panel}"
  item-card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.panel}"
  button-primary-light:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-on-accent}"
    rounded: "{rounded.control}"
    height: 30px
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
    rounded: "{rounded.control}"
    height: 30px
  verdict-winner-light:
    backgroundColor: "{colors.light-winner-surface}"
    textColor: "{colors.light-winner-ink}"
    rounded: "{rounded.panel}"
  verdict-winner-dark:
    backgroundColor: "{colors.dark-winner-surface}"
    textColor: "{colors.dark-winner-ink}"
    rounded: "{rounded.panel}"
  weights-panel-light:
    backgroundColor: "{colors.light-panel}"
    textColor: "{colors.light-panel-ink}"
    rounded: "{rounded.panel}"
  weights-panel-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-panel-ink}"
    rounded: "{rounded.panel}"
  input-light:
    backgroundColor: "{colors.light-surface-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
  input-dark:
    backgroundColor: "{colors.dark-surface-soft}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.control}"
  secondary-text-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-secondary}"
  secondary-text-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-secondary}"
  muted-text-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-muted}"
  muted-text-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-muted}"
  icon-placeholder-light:
    backgroundColor: "{colors.light-blue-soft}"
    textColor: "{colors.light-blue}"
  icon-placeholder-dark:
    backgroundColor: "{colors.dark-blue-soft}"
    textColor: "{colors.dark-blue}"
  positive-value-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-positive}"
  positive-value-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-positive}"
  negative-value-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-negative}"
  negative-value-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-negative}"
  panel-input-light:
    backgroundColor: "{colors.light-panel-input}"
    textColor: "{colors.light-panel-ink}"
  panel-input-dark:
    backgroundColor: "{colors.dark-panel-input}"
    textColor: "{colors.dark-panel-ink}"
  panel-muted-light:
    backgroundColor: "{colors.light-panel}"
    textColor: "{colors.light-panel-muted}"
  panel-muted-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-panel-muted}"
  panel-link-light:
    backgroundColor: "{colors.light-panel}"
    textColor: "{colors.light-panel-accent}"
  panel-link-dark:
    backgroundColor: "{colors.dark-panel}"
    textColor: "{colors.dark-panel-accent}"
  item-poor-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-poor}"
  item-common-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-common}"
  item-uncommon-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-uncommon}"
  item-rare-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-rare}"
  item-epic-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-epic}"
  item-legendary-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-legendary}"
  item-artifact-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-artifact}"
  item-heirloom-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-quality-heirloom}"
  item-poor-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-poor}"
  item-common-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-common}"
  item-uncommon-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-uncommon}"
  item-rare-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-rare}"
  item-epic-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-epic}"
  item-legendary-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-legendary}"
  item-artifact-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-artifact}"
  item-heirloom-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-quality-heirloom}"
  divider-light:
    backgroundColor: "{colors.light-line}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.dark-line}"
    height: 1px
  panel-divider-light:
    backgroundColor: "{colors.light-panel-line}"
    height: 1px
  panel-divider-dark:
    backgroundColor: "{colors.dark-panel-line}"
    height: 1px
  winner-indicator-light:
    backgroundColor: "{colors.light-winner-line}"
    size: 1px
  winner-indicator-dark:
    backgroundColor: "{colors.dark-winner-line}"
    size: 1px
  focus-indicator:
    backgroundColor: "{colors.focus}"
    size: 2px
---

## Overview

ForeverUtil is a practical WoW Forever workbench, not a marketing landing page. Prioritize quick scanning, side-by-side comparison, and repeated use. Keep the interface compact, calm, and utility-focused.

## Colors

Use the neutral surfaces, coral actions, and blue comparison accents above. The light and dark token names correspond to the CSS custom properties in `styles.css`; `primary` is the light theme's `--ink`. Preserve the user's explicit theme preference, otherwise follow the system preference.

Avoid green-dominated themes. WoW quality colors are the intentional exception: use the appropriate theme's quality token for item names and icon borders, and include a text quality label. Never convey rarity or the winning item by color alone. Use the `focus` color for visible keyboard focus.

## Typography

Use Space Grotesk for interface text, headings, and item names. Use JetBrains Mono for scores, weights, labels, and other data. Keep headings appropriate to the workspace rather than hero-sized; retain zero letter spacing.

## Layout

Use a comparison-first layout with a flexible comparison area and a 315px weights panel on desktop, within a 1440px maximum page width. On smaller screens, stack the panels and keep the comparison first. The stat table may scroll horizontally rather than clipping controls or widening the page. Keep rows aligned and stable as values change.

## Elevation & Depth

Use tonal surfaces, restrained borders, and subtle shadows for hierarchy. Divider and indicator tokens describe the strokes themselves, not surface fills. Reserve the winner outline and verdict treatment for the current result. Avoid decorative floating sections, large gradients, and ornamental illustrations.

## Shapes

Keep controls and individual item cards compact and rectangular, with 3px control corners and 4px panel corners. Avoid nested decorative cards.

## Components

- **Comparison:** Show an explicit verdict, a labeled result on the better item, and the EP difference. Show ties and missing data clearly. Provide labels and units for editable stat and weapon-DPS values.
- **Weights:** Distinguish main-hand and off-hand weights. Explain that weapon-DPS scoring is an estimate and surface its limitations near the controls.
- **Search:** Show results in the app as the user types, with loading, empty, and error states. Allow selection without navigating away. Imported item names and icons provide Wowhead tooltips; manual names remain editable.
- **Controls:** Use Lucide for action icons. Give icon-only buttons accessible names and hover titles. Maintain keyboard interaction and visible focus states.

## Do's and Don'ts

- Do verify light and dark themes at mobile and desktop widths; keep text and controls from overlapping.
- Do pair color with text labels and status messages, including for rarity and comparison outcomes.
- Don't present a definitive winner when required item data is unknown.
- Don't rely on color alone, oversized headings, nested cards, or decorative gradients to communicate hierarchy.
