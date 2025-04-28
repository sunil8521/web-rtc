import { Route, BrowserRouter, Routes,Navigate } from "react-router-dom";
import Both from "./components/Both";
import CreateRoom from "./components/CreateRoom";
import {useAtomValue} from "jotai"
import {socketAtom} from "./socket"
function App() {

   useAtomValue(socketAtom);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={< CreateRoom />} />
        <Route path="/room/:ROOMID" element={<Both />} />

        <Route path="*" element={<Navigate to={"/"}/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
