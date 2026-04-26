import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { installTreeDrivers } from "./test-utils/treeDrivers";
import { installDisplayModeDrivers } from "./test-utils/displayModeDrivers";

// Phase 46: install tree test drivers (gated by MODE==="test", production no-op)
installTreeDrivers();
// Phase 47: install display-mode test drivers (gated by MODE==="test", production no-op)
installDisplayModeDrivers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
