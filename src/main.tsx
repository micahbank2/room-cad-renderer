import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { installTreeDrivers } from "./test-utils/treeDrivers";
import { installDisplayModeDrivers } from "./test-utils/displayModeDrivers";
import { installSavedCameraDrivers } from "./test-utils/savedCameraDrivers";
import { installUserTextureDrivers } from "./test-utils/userTextureDrivers";
import { installGltfDrivers } from "./test-utils/gltfDrivers";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
