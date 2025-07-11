import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import store from './reducers/index.ts'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
    <Toaster />
  </Provider>
)
