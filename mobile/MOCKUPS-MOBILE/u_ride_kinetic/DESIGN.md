```markdown
# Design System Specification: The Academic Kinetic

## 1. Overview & Creative North Star

**Creative North Star: The Academic Kinetic**
This design system moves away from the sterile, utilitarian "grid-of-boxes" common in ride-sharing. Instead, it adopts an editorial, high-energy aesthetic that feels like a premium student publication crossed with a high-end night mode interface. We achieve this through **Organic Brutalism**: a framework that uses bold, oversized typography (Space Grotesk) against a deep, layered void, punctuated by "Acid Green" kinetic energy.

To break the "template" look, we leverage **intentional asymmetry**. Hero elements and headers should not always be centered; use the `24 (6rem)` spacing token to create dramatic white space that directs the eye. Overlapping elements—such as a map preview bleeding behind a surface-container—create a sense of physical depth and sophisticated "object" layering.

---

## 2. Colors & Surface Philosophy

The palette is anchored in a "True Dark" foundation, using high-chroma accents to signify action and vitality.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or grouping. 
Boundaries must be defined solely through background color shifts. To separate a ride history list from the map, place a `surface-container-low` section directly against the `surface` background. The eye will perceive the edge through the tonal shift alone.

### Surface Hierarchy & Nesting
Treat the UI as a stack of physical materials. Use the following tiers to define depth:
*   **Base:** `surface` (#0e0e0e) – The "ground" of the application.
*   **Secondary Level:** `surface-container-low` (#131313) – For large background sections (e.g., the bottom sheet pull-up).
*   **Primary Card Level:** `surface-container` (#1a1919) – For interactive elements sitting on top of the secondary level.
*   **High-Impact Level:** `surface-container-highest` (#262626) – For persistent elements like navigation bars or active modals.

### The "Glass & Gradient" Rule
For floating elements (like the "Current Ride" tracker), use **Glassmorphism**. Apply `surface-container-low` at 70% opacity with a `backdrop-blur` of 20px. This allows the primary accents of the map to bleed through, making the UI feel integrated into the environment. 

For Primary CTAs, use a **Signature Texture**: A linear gradient from `primary` (#9cff93) to `primary_container` (#00fc40) at a 135-degree angle. This prevents the "flat-button" look and adds a professional "glow" that feels premium.

---

## 3. Typography

The system uses a high-contrast pairing to balance institutional authority with youth-oriented energy.

*   **Display & Headlines (Space Grotesk):** This is our "Editorial" voice. Use `display-lg` for onboarding and `headline-md` for screen titles. The wide apertures of Space Grotesk feel technical yet approachable.
*   **Title & Body (Inter):** Inter provides maximum legibility for functional data (driver names, ETA, pricing). 
*   **Label (Inter):** Used for micro-copy and metadata.

**Hierarchy Strategy:** 
Use `headline-lg` in `on_surface` (Pure White) next to `body-sm` in `on_surface_variant` (Grey). The extreme jump in scale and contrast creates a sophisticated, "magazine-style" hierarchy that guides the student's eye to the most critical information first.

---

## 4. Elevation & Depth

We eschew traditional drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` (#000000) search bar should sit inside a `surface-container-low` (#131313) header. This "sunken" effect creates a tactile feel without the clutter of shadows.
*   **Ambient Shadows:** If an element must float (e.g., a "Confirm Ride" FAB), use a shadow with a blur of `32px` and an opacity of `8%`. The shadow color must be tinted with the `primary` green to simulate light reflecting off the "Acid Green" surface.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border, use the `outline_variant` token at **15% opacity**. This creates a "breath" of a line rather than a hard edge.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `md` (0.75rem) rounded corners. Text is `on_primary` (Deep Green) for high legibility. Add a 4px outer glow of the same color on `hover`.
*   **Secondary:** `surface_variant` background with `on_surface` text. No border.

### Input Fields
*   **Styling:** Use `surface_container_highest` for the background. No borders. On `focus`, the background shifts to `surface_bright` and a 1px "Ghost Border" of `primary` appears at 40% opacity.

### Cards & Lists
*   **Anti-Pattern:** Never use divider lines.
*   **Pattern:** Use `spacing-4` (1rem) of vertical white space to separate list items. For ride history, use alternating background tones (`surface_container_low` vs `surface_container`) to define individual entries.

### Ride Selection Chips
*   Use `surface_container_high`. When selected, the chip transforms into a `primary` background with a subtle "pulse" animation.

### Specialized Component: The "Security Pulse"
For the ride-tracking screen, the driver’s icon should be encapsulated in a `tertiary` (#8af2ff) ring with a slow, 2s breathing animation (opacity 10% to 40%). This provides a visual cue of "active monitoring" and security.

---

## 6. Do's and Don'ts

### Do
*   **DO** use the `10`, `12`, and `16` spacing tokens for top-level margins to create an "Editorial" feel.
*   **DO** use `primary` sparingly. It is a "laser pointer," not a bucket of paint.
*   **DO** ensure all "Acid Green" text passes AA contrast ratios by using the `on_primary_fixed` (#00440a) variant for labels on light backgrounds.

### Don't
*   **DON'T** use 100% opaque white for body text; use `on_surface_variant` to reduce eye strain in dark mode.
*   **DON'T** use `none` or `sm` rounded corners. This system relies on the `md` (0.75rem) and `lg` (1rem) scales to feel modern and "friendly."
*   **DON'T** use standard system icons. Use "Institutional-Themed" icons (thicker strokes, geometric shapes) that feel like they belong on a university campus map.

---
*End of Document*```