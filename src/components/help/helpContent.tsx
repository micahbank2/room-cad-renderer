import type { HelpSectionId } from "@/stores/uiStore";
import { SHORTCUT_DISPLAY_LIST, type ShortcutDisplay } from "@/lib/shortcuts";

export interface HelpSectionMeta {
  id: HelpSectionId;
  label: string;
  icon: string;
}

export const HELP_SECTIONS: HelpSectionMeta[] = [
  { id: "getting-started", label: "GETTING STARTED", icon: "flag" },
  { id: "shortcuts", label: "SHORTCUTS", icon: "keyboard" },
  { id: "library", label: "LIBRARY & 2D", icon: "grid_view" },
  { id: "3d", label: "3D & WALK & ROOMS", icon: "view_in_ar" },
];

// Phase 52 (HOTKEY-01): SHORTCUTS is an alias for the registry's display list.
// Source of truth: src/lib/shortcuts.ts SHORTCUT_DISPLAY_LIST.
// Consumers (this file's section renderer at line ~140 + helpIndex.ts search)
// keep working unchanged.
export type Shortcut = ShortcutDisplay;
export const SHORTCUTS: Shortcut[] = SHORTCUT_DISPLAY_LIST;

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-sans text-[10px] text-foreground bg-accent px-1.5 py-0.5 rounded-smooth-md border border-border/50 inline-block">
      {children}
    </kbd>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-[13px] text-foreground tracking-widest uppercase mb-4">
      {children}
    </h2>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[11px] text-foreground tracking-wider uppercase mt-6 mb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[11px] text-muted-foreground leading-relaxed mb-2">
      {children}
    </p>
  );
}

function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="font-sans text-[11px] text-muted-foreground leading-relaxed list-decimal list-inside space-y-1.5 mb-2 [&_kbd]:mx-0.5">
      {children}
    </ol>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="font-sans text-[11px] text-muted-foreground leading-relaxed list-disc list-inside space-y-1.5 mb-2 [&_kbd]:mx-0.5">
      {children}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Section content
// ---------------------------------------------------------------------------

export function GettingStartedContent() {
  return (
    <div data-help-section="getting-started">
      <H1>Getting Started</H1>
      <P>
        Room CAD Renderer lets you plan a room with your own products, then walk
        through it in 3D before you buy anything. Upload a photo of a couch,
        place it in a room at the right scale, switch to 3D, and feel the space.
      </P>

      <H2 id="help-h-core-loop">The Core Loop</H2>
      <OL>
        <li>Create a room from the welcome screen (or keep the one on screen)</li>
        <li>Draw walls with <Kbd>W</Kbd>, add doors with <Kbd>D</Kbd>, windows with <Kbd>N</Kbd></li>
        <li>Upload products to your library (Pinterest screenshots work great)</li>
        <li>Drag products from the sidebar onto the 2D canvas</li>
        <li>Switch to <em className="text-foreground not-italic">3D VIEW</em> to see it rendered</li>
        <li>Press <Kbd>E</Kbd> to walk through at eye level</li>
      </OL>

      <H2 id="help-h-first-room">Your First Room</H2>
      <P>
        Set the room dimensions in the sidebar under <em className="text-foreground not-italic">ROOM CONFIG</em>.
        The default is 12×14 ft. Walls snap to a 6-inch grid by default — change
        the snap increment in the sidebar under <em className="text-foreground not-italic">SNAP</em>.
      </P>

      <H2 id="help-h-saving">Saving Your Work</H2>
      <P>
        Everything auto-saves after a 2-second pause. The status bar shows
        <em className="text-foreground not-italic"> SAVED</em> when the last
        change has been written. When you reload the page, your most recent
        project loads automatically — rooms, walls, products, and active room
        all restored.
      </P>

      <H2 id="help-h-exporting">Exporting</H2>
      <P>
        Click <em className="text-foreground not-italic">EXPORT</em> while in
        3D or split view to save the current 3D render as a PNG.
      </P>
    </div>
  );
}

export function KeyboardShortcutsContent() {
  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));
  return (
    <div data-help-section="shortcuts">
      <H1>Keyboard Shortcuts</H1>
      <P>
        Shortcuts are ignored while typing in a text input. On macOS use{" "}
        <Kbd>Cmd</Kbd> where Windows/Linux uses <Kbd>Ctrl</Kbd>.
      </P>

      {groups.map((group) => (
        <div key={group} className="mt-5">
          <H2>{group}</H2>
          <div className="space-y-1.5">
            {SHORTCUTS.filter((s) => s.group === group).map((s, i) => (
              <div
                key={`${group}-${i}`}
                className="flex items-start gap-3 py-1 border-b border-border/10 last:border-0"
              >
                <div className="flex items-center gap-1 min-w-[140px] flex-wrap">
                  {s.keys.map((k, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <Kbd>{k}</Kbd>
                      {j < s.keys.length - 1 && (
                        <span className="text-muted-foreground/60 text-[10px]">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  <div className="font-sans text-[11px] text-muted-foreground">
                    {s.action}
                  </div>
                  {s.context && (
                    <div className="font-sans text-[9px] text-muted-foreground/60 mt-0.5">
                      {s.context}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductLibraryContent() {
  return (
    <div data-help-section="library">
      <H1>Product Library & 2D Editing</H1>

      <H2 id="help-h-uploading">Uploading Products</H2>
      <P>
        Click <em className="text-foreground not-italic">LIBRARY</em> in the
        toolbar, then <em className="text-foreground not-italic">ADD PRODUCT</em>.
        Drop an image, give it a name, pick a category, enter dimensions (width
        × depth × height in feet). Products you add appear in every project —
        the library is global.
      </P>

      <H2 id="help-h-skipping-dims">Skipping Dimensions</H2>
      <P>
        Check <em className="text-foreground not-italic">SKIP DIMENSIONS</em>{" "}
        if you just want to see a product in the space without pinning down
        exact sizes. Products without dimensions render as a placeholder dashed
        box at a default size — you can edit dimensions later in the{" "}
        <em className="text-foreground not-italic">PROPERTIES</em> panel.
      </P>

      <H2 id="help-h-searching">Searching</H2>
      <P>
        Type into the search field in the library view to filter by product
        name. Searches ignore case.
      </P>

      <H2 id="help-h-placing">Placing Products</H2>
      <UL>
        <li>Drag a product card from the sidebar picker onto the 2D canvas</li>
        <li>The product snaps to the grid and is auto-selected</li>
        <li>Click and drag to move it, or use arrow keys (when a tool supports it)</li>
        <li>Drag the rotation handle (dot above selected product) to rotate</li>
        <li>Hold <Kbd>Shift</Kbd> while rotating to bypass the 15° snap</li>
      </UL>

      <H2 id="help-h-walls">Editing Walls</H2>
      <UL>
        <li>Double-click a wall dimension label to type a new length in feet</li>
        <li>Shared corners move together so the room stays closed</li>
        <li>Press <Kbd>W</Kbd> and click-click to draw new walls</li>
        <li>Hold <Kbd>Shift</Kbd> while drawing for orthogonal-only walls</li>
      </UL>

      <H2 id="help-h-snap-grid">Snap & Grid</H2>
      <P>
        Adjust the snap increment in the sidebar under{" "}
        <em className="text-foreground not-italic">SNAP</em> — options are
        OFF, 3 INCH, 6 INCH, and 1 FOOT. Toggle the grid on/off under{" "}
        <em className="text-foreground not-italic">LAYERS</em>.
      </P>
    </div>
  );
}

export function ThreeDContent() {
  return (
    <div data-help-section="3d">
      <H1>3D View, Walk Mode & Multi-Room</H1>

      <H2 id="help-h-views">View Modes</H2>
      <UL>
        <li><em className="text-foreground not-italic">2D PLAN</em> — top-down editable floor plan</li>
        <li><em className="text-foreground not-italic">3D VIEW</em> — rendered 3D scene with products</li>
        <li><em className="text-foreground not-italic">SPLIT</em> — 2D and 3D side-by-side</li>
        <li><em className="text-foreground not-italic">LIBRARY</em> — browse and manage your products</li>
      </UL>

      <H2 id="help-h-orbit">Orbit Camera</H2>
      <P>
        Default 3D mode. Drag to rotate around the room, scroll to zoom,
        right-drag to pan.
      </P>

      <H2 id="help-h-walk">Walk Mode</H2>
      <P>
        The core "feel the space" feature. Switch from orbit to walk with the{" "}
        <em className="text-foreground not-italic">WALK</em> toolbar button
        or press <Kbd>E</Kbd>.
      </P>
      <OL>
        <li>Click the canvas to engage pointer lock</li>
        <li>Move with <Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>S</Kbd> <Kbd>D</Kbd></li>
        <li>Look around with the mouse</li>
        <li>Press <Kbd>Esc</Kbd> to release the mouse</li>
        <li>Press <Kbd>E</Kbd> again (or click <em className="text-foreground not-italic">ORBIT</em>) to return to orbit view</li>
      </OL>
      <P>
        Walls block movement — you can't walk through them. If you switch rooms
        while walking, the camera re-centers in the new room.
      </P>

      <H2 id="help-h-rooms">Multi-Room Projects</H2>
      <P>
        A project can contain multiple rooms. Each room has its own walls,
        doors, windows, and placed products.
      </P>
      <UL>
        <li>Click <em className="text-foreground not-italic">+</em> in the room tabs to add a room</li>
        <li>Pick a template: Living Room, Bedroom, Kitchen, or Blank</li>
        <li>Cycle rooms with <Kbd>Ctrl</Kbd><Kbd>Tab</Kbd> (or <Kbd>Cmd</Kbd><Kbd>Tab</Kbd> on Mac)</li>
        <li>Click a tab to switch rooms directly</li>
      </UL>

      <H2 id="help-h-export">Exporting the View</H2>
      <P>
        Click <em className="text-foreground not-italic">EXPORT</em> from the
        toolbar while in 3D or split view to save the current 3D render as a
        PNG file.
      </P>
    </div>
  );
}

export function HelpSectionContent({ section }: { section: HelpSectionId }) {
  switch (section) {
    case "getting-started":
      return <GettingStartedContent />;
    case "shortcuts":
      return <KeyboardShortcutsContent />;
    case "library":
      return <ProductLibraryContent />;
    case "3d":
      return <ThreeDContent />;
  }
}
