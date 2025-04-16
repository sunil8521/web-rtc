import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {UseProvider} from "./Use.tsx"
import  { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <UseProvider>
    <Toaster
  position="top-right"
  reverseOrder={false}
/>
    <App />
     </UseProvider>
  // </StrictMode>,
)
