import "./App.css";
import { Route, BrowserRouter, Routes } from "react-router-dom";

import { Link } from "react-router-dom";
import Both from "./components/Both";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/both" element={<Both />} />
        <Route
          path="/"
          element={
            <div style={{ display: "flex", gap: "10px" }}>
              {" "}
              <Link to={"/both"}>both</Link>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
