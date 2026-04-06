# Research Summary: Room CAD Renderer v1.4 Polish & Tech Debt

**Domain:** Interior design CAD tool -- deferred polish verification + UI label cleanup
**Researched:** 2026-04-06
**Overall confidence:** HIGH

## Executive Summary

v1.4 is a verification and cleanup milestone, not a feature build. All five target items either already have working code that shipped in v1.3 (frame color override, copy-side, sidebar scroll) or are small UI changes (wainscot inline edit, underscore removal). No new dependencies are needed. No architecture changes are needed. The entire milestone operates within existing React components, Zustand store actions, and string formatting logic.

The most complex item is wainscot inline edit (POLISH-02), which requires a new floating popover component and a double-click handler extension in selectTool. The broadest item is underscore removal, which touches ~25 component files but is mechanically simple (string replacement). The other three items (frame color override, copy-side, sidebar scroll) are pure verification of already-shipped code.

Research confirms zero stack additions. The existing `react-colorful` (already installed at ^5.6.1) handles the frame color picker. Zustand already has the `copyWallSide` action. The `frameColorOverride` type field and its 3D rendering path are fully wired. This milestone should be fast.

## Key Findings

**Stack:** Zero new dependencies. Current package.json is complete.
**Architecture:** No structural changes. All work is in React component UI layer.
**Critical pitfall:** Underscore removal must not touch code identifiers, CSS classes, or test attributes -- only display labels.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Verification Phase** - Verify deferred v1.3 features work end-to-end
   - Addresses: POLISH-04 (frame color override), POLISH-03 (copy-side), POLISH-06 (sidebar scroll)
   - Rationale: These features have code already shipped. Verification is fast and unblocks confidence in the v1.3 codebase. Any bugs found here are fixed in place.

2. **Wainscot Inline Edit** - Build the double-click inline edit popover
   - Addresses: POLISH-02
   - Rationale: Only feature requiring new UI component work. Depends on understanding how selectTool double-click detection works. Independent of other items.

3. **Label Cleanup** - Remove all underscores from UI labels
   - Addresses: UI cleanup requirement
   - Rationale: Must be done LAST because it touches every component file. Doing it earlier risks merge conflicts with other feature changes.

**Phase ordering rationale:**
- Verification first because it is the fastest path to confirming v1.3 completeness
- Wainscot inline edit second because it is the only new UI build
- Label cleanup last because it is a global sweep that should not conflict with other changes

**Research flags for phases:**
- Phase 1 (Verification): No research needed. Pure testing and bug-fixing.
- Phase 2 (Wainscot Edit): No research needed. Standard inline-edit pattern. May need brief investigation of canvas-to-screen coordinate mapping for popover positioning.
- Phase 3 (Label Cleanup): No research needed. Grep-driven mechanical replacement.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero additions needed; confirmed via package.json + codebase grep |
| Features | HIGH | All 5 features scoped from direct code inspection; 3 of 5 are verification-only |
| Architecture | HIGH | No changes; all work is component-level |
| Pitfalls | HIGH | Primary risk is underscore removal touching wrong strings; mitigated by clear scope rules |

## Gaps to Address

- Wainscot inline edit popover positioning: need to map Fabric canvas click coordinates to screen coordinates for the floating editor. This is solvable with `canvas.getBoundingClientRect()` + click event `clientX/clientY` but should be tested during implementation.
- Underscore removal aesthetic decision: some labels like "3 INCH" vs "3_INCH" or "SQ FT" vs "SQ_FT" may read better with underscores in the monospace CAD context. This is a design judgment call, not a research gap.
