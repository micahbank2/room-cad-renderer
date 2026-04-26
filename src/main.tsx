import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { installTreeDrivers } from "./test-utils/treeDrivers";
import { installDisplayModeDrivers } from "./test-utils/displayModeDrivers";
import { installSavedCameraDrivers } from "./test-utils/savedCameraDrivers";

// Phase 46: install tree test drivers (gated by MODE==="test", production no-op)
installTreeDrivers();
// Phase 47: install display-mode test drivers (gated by MODE==="test", production no-op)
installDisplayModeDrivers();
// Phase 48: install saved-camera test drivers (gated by MODE==="test", production no-op)
installSavedCameraDrivers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
