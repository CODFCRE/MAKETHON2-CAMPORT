# Design System Specification: Editorial Glassmorphism

## 1. Overview & Creative North Star: "The Nocturnal Curator"
This design system is built to transcend the "standard dark mode" template. The Creative North Star—**The Nocturnal Curator**—is an aesthetic philosophy that treats the mobile interface as a high-end, physical gallery viewed under soft moonlight. 

We move beyond flat UI by utilizing **intentional depth, tonal layering, and atmospheric light.** By rejecting harsh lines and embracing "Ghost Borders" and glassmorphism, we create a signature experience that feels premium, fluid, and curated. We break the rigid grid through asymmetric spacing and overlapping translucent layers, ensuring the interface feels like an organic extension of the hardware.

---

## 2. Colors & Atmospheric Tones
The palette is rooted in deep, light-absorbing blacks and charcols, punctuated by luminous, muted blue accents.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid, opaque borders to define sections. Boundaries must be established through:
1.  **Tonal Shifts:** Placing a `surface-container-low` (#131313) element against a `surface` (#0e0e0e) background.
2.  **Luminous Depth:** Utilizing `surface-variant` for subtle contrast without creating a "boxed-in" feel.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of frosted obsidian. 
*   **Base:** `surface` (#0e0e0e)
*   **Secondary Level:** `surface-container-low` (#131313) for large grouping areas.
*   **Interactive Level:** `surface-container-highest` (#252626) for cards or actionable blocks.
*   **Floating Level:** Use `surface-bright` (#2b2c2c) at 60% opacity with a `20px backdrop-blur` to create floating navigation or modals.

### Signature Textures
Main CTAs must use a **linear gradient** rather than a flat fill. 
*   **Primary Glow:** Transition from `primary` (#adc6ff) at the top-left to `primary-container` (#004395) at the bottom-right. This creates a "soul" within the button that feels pressurized and luminous.

---

## 3. Typography: The Editorial Voice
We use **Inter** as our typographic engine. It provides the technical precision required for a "QuickGig" environment while maintaining an Apple-like minimalist elegance.

*   **Display (Large/Medium):** Reserved for hero moments. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an authoritative, editorial feel.
*   **Headlines:** `headline-sm` (1.5rem) should be used for section headers to establish clear hierarchy without overwhelming the "Glass" elements.
*   **Body:** `body-lg` (1rem) is the workhorse. Ensure `on-surface-variant` (#acabaa) is used for secondary body text to reduce visual noise.
*   **Labels:** Use `label-md` (0.75rem) in all-caps with +0.05em tracking for metadata or "category" tags to provide a premium, "spec-sheet" aesthetic.

---

## 4. Elevation & Depth: The Layering Principle
We do not use "drop shadows" in the traditional sense. We use **Ambient Luminous Shadows.**

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
*   **Ambient Shadows:** For floating elements, use a shadow with a blur radius of `32px`, offset `Y: 12px`, and an opacity of `8%`. The shadow color must be tinted with our `surface-tint` (#adc6ff) to mimic refracted light through glass.
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility, use the `outline-variant` (#484848) at **15% opacity**. This creates a "whisper" of an edge that defines the shape without interrupting the visual flow.
*   **Glassmorphism:** All modal overlays or sticky headers must use `surface-container` at 70% opacity with a `blur(16px)` effect.

---

## 5. Components

### Buttons
*   **Primary:** Roundedness `full`. Gradient fill (`primary` to `primary-container`). Inner glow (1px top-border, white at 10% opacity) to catch the "light."
*   **Secondary:** Ghost style. `Ghost Border` (15% opacity `outline-variant`) with `on-surface` text.
*   **Tertiary:** No background. `primary` color text with `label-md` styling.

### Translucent Cards
*   **Construction:** Use `surface-container-low` at 80% opacity. 
*   **Constraint:** **No dividers.** Separate content chunks using `1.5rem` (xl) vertical white space. Use `title-sm` for internal card headers.

### Navigation Elements
*   **Bottom Bar:** A floating "pill" using `surface-container-highest` at 60% opacity with `backdrop-blur`. Roundedness: `xl`. 
*   **Selection Indicators:** A soft `primary` glow behind the active icon, blurred to `12px`.

### Inputs & Chips
*   **Inputs:** `surface-container-lowest` background, `Ghost Border` on focus. No labels inside the box; use `label-sm` floating above the field.
*   **Chips:** Roundedness `md`. For selection, transition from `surface-variant` to `primary-container`.

### Specialized Components: The "Gig Pulse"
*   **Live Status Indicator:** A `primary` dot with a "breathing" outer glow (2px spread, 10px blur, 30% opacity) to indicate active skill-syncing or gig availability.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., 24px left, 32px right) for hero text to create a custom editorial look.
*   **Do** lean on `surface-container` tiers to create hierarchy rather than adding more lines.
*   **Do** use `soft slate grays` (#8f9fb7) for icons to keep them from competing with text.

### Don't
*   **Don't** use 100% white (#ffffff) for text. Use `on-surface` (#e7e5e5) to prevent eye strain against the dark background.
*   **Don't** use "hard" corners. Every element must adhere to the **Roundedness Scale**, preferably `md` (0.75rem) or `lg` (1rem).
*   **Don't** use traditional dividers. If separation is needed, use a `4px` height block of `surface-container-lowest` or simply increase the white space.