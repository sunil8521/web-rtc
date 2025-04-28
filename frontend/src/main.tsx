import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "react-hot-toast";
import { Provider } from "jotai";
createRoot(document.getElementById("root")!).render(

  <Provider>
    <Toaster position="top-right" reverseOrder={false} />
    <App />
  </Provider>

);
