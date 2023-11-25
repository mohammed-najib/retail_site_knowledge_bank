import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

declare global {
  interface ImportMeta {
    env: {
      VITE_OPENAI_API_KEY: string
      VITE_SUPABASE_API_KEY: string
      VITE_SUPABASE_URL: string
    }
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
