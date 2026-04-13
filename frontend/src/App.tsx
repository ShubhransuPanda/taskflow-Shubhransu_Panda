import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useMemo, useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { FeedbackProvider } from './components/FeedbackProvider'
import { LoadState } from './components/LoadState'
import { queryClient } from './lib/queryClient'
import { themeStorage } from './lib/storage'
import { getAppTheme } from './theme'

const AppLayout = lazy(async () =>
  import('./components/AppLayout').then((module) => ({ default: module.AppLayout })),
)
const AuthPage = lazy(async () =>
  import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const ProjectsPage = lazy(async () =>
  import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
)
const ProjectDetailPage = lazy(async () =>
  import('./pages/ProjectDetailPage').then((module) => ({
    default: module.ProjectDetailPage,
  })),
)
const UsersPage = lazy(async () =>
  import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })),
)
const AccountPage = lazy(async () =>
  import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })),
)

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(themeStorage.get())

  const theme = useMemo(() => getAppTheme(mode), [mode])

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    themeStorage.set(next)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadState message="Loading page..." />}>
                <Routes>
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/register" element={<AuthPage mode="register" />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout mode={mode} onToggleMode={toggleMode} />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </FeedbackProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
