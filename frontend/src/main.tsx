import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {UseProvider} from "./Use.tsx"

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <UseProvider>
    <App />
     </UseProvider>
  // </StrictMode>,
)
