import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import SessionPage from './pages/SessionPage'
import AdminPage from './pages/AdminPage'
import StatsPage from './pages/StatsPage'
import HistoryPage from './pages/HistoryPage'
import NotFoundPage from './pages/NotFoundPage'

const router = createBrowserRouter([
  { path: '/', element: <SessionPage /> },
  { path: '/s/:slug', element: <SessionPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/stats', element: <StatsPage /> },
  { path: '/history', element: <HistoryPage /> },
  { path: '*', element: <NotFoundPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
