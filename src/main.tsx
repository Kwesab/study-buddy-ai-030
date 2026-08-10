import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme preference (dark is the default look)
if (localStorage.getItem("theme") !== "light") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
