import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force matrix dark aesthetic app-wide.
// Every page renders against the `.dark` token palette redefined in index.css.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}

// Allow disabling WebSocket connections explicitly in development when needed.
// By default, keep real-time features enabled so messaging works out of the box.
const shouldDisableWebSocket =
  typeof window !== "undefined" &&
  import.meta.env.DEV &&
  import.meta.env.VITE_DISABLE_WEBSOCKETS === "true";

if (shouldDisableWebSocket) {
  const OriginalWebSocket = window.WebSocket;

  // @ts-ignore - Block all WebSocket connections when flag is enabled
  window.WebSocket = function (url, protocols) {
    console.warn("[WebSocket BLOCKED]", url?.toString());

    // Return a fake closed WebSocket so callers gracefully detect no connection
    return {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      readyState: 3,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      url: url?.toString() || "",
      protocol: "",
      extensions: "",
      bufferedAmount: 0,
      binaryType: "blob" as BinaryType,
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    } as WebSocket;
  };

  console.log("[Dev Mode] WebSocket connections DISABLED via VITE_DISABLE_WEBSOCKETS=true");

  // Expose the original constructor for anyone who needs manual overrides during debugging.
  (window as any).__ORIGINAL_WEBSOCKET__ = OriginalWebSocket;
}

createRoot(document.getElementById("root")!).render(<App />);
