import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HelpPage from "./components/HelpPage";
import { TooltipProvider } from "./components/ui/Tooltip";
import "./index.css";
import { installTreeDrivers } from "./test-utils/treeDrivers";
import { installDisplayModeDrivers } from "./test-utils/displayModeDrivers";
import { installSavedCameraDrivers } from "./test-utils/savedCameraDrivers";
import { installUserTextureDrivers } from "./test-utils/userTextureDrivers";
import { installGltfDrivers } from "./test-utils/gltfDrivers";
import { installCutawayDrivers } from "./test-utils/cutawayDrivers";
import { installStairDrivers } from "./test-utils/stairDrivers";
import { installColumnDrivers } from "./test-utils/columnDrivers";
import { installOpeningDrivers } from "./test-utils/openingDrivers";
import { installMeasureDrivers } from "./test-utils/measureDrivers";
import { installCeilingDrivers } from "./test-utils/ceilingDrivers";
import { installTextureDrivers } from "./test-utils/textureDrivers";
import { installThemeDrivers } from "./test-utils/themeDrivers";
import { installProductFinishDrivers } from "./test-utils/productFinishDrivers";

// Phase 46: install tree test drivers (gated by MODE==="test", production no-op)
installTreeDrivers();
// Phase 47: install display-mode test drivers (gated by MODE==="test", production no-op)
installDisplayModeDrivers();
// Phase 48: install saved-camera test drivers (gated by MODE==="test", production no-op)
installSavedCameraDrivers();
// Phase 49: install user-texture test drivers (gated by MODE==="test", production no-op)
installUserTextureDrivers();
// Phase 55: install GLTF upload test drivers (gated by MODE==="test", production no-op)
installGltfDrivers();
// Phase 59: install cutaway test drivers (gated by MODE==="test", production no-op)
installCutawayDrivers();
// Phase 60: install stair test drivers (gated by MODE==="test", production no-op)
installStairDrivers();
// Phase 86: install column test drivers (gated by MODE==="test", production no-op)
installColumnDrivers();
// Phase 61: install opening placement test drivers (gated by MODE==="test", production no-op)
installOpeningDrivers();
// Phase 62: install measure-line + annotation test drivers (gated by MODE==="test", production no-op)
installMeasureDrivers();
// Phase 65: install ceiling-resize test drivers (gated by MODE==="test", production no-op)
installCeilingDrivers();
// Phase 68 follow-up: install texture-upload test driver (gated by MODE==="test", production no-op).
// Decoupled from UploadTextureModal so the driver survives Phase 68's MyTexturesList tab removal.
installTextureDrivers();
// Phase 71: install theme test driver (gated by MODE==="test", production no-op)
installThemeDrivers();
// Phase 69: install product finish test driver (gated by MODE==="test", production no-op)
installProductFinishDrivers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Root TooltipProvider — required by all <Tooltip> usages across the app
       (TopBar, FloatingToolbar already had local providers; this root one
       covers TopBar + every future Tooltip without each component needing
       its own. Also unblocks the e2e Playwright harness — pre-existing
       crash documented in Phase 79 deferred-items.md). */}
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone bookmarkable help center — /help-center */}
          <Route path="/help-center" element={<HelpPage />} />
          {/* Main app — handles all other paths (including /help/* modal sync) */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </React.StrictMode>
);
