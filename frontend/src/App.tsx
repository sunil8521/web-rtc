import { Route, BrowserRouter, Routes,Navigate } from "react-router-dom";
import Both from "./components/Both";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Both />} />
        <Route path="*" element={<Navigate to={"/"}/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
