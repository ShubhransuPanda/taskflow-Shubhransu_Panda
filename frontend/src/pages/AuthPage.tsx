import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../lib/errors'
import { useFeedback } from '../components/FeedbackProvider'

const baseSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
})

type AuthFormValues = z.infer<typeof baseSchema>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register, isAuthenticated } = useAuth()
  const { showSuccess, showError } = useFeedback()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const isRegister = mode === 'register'
  const schema = useMemo(
    () =>
      baseSchema.superRefine((value, context) => {
        if (isRegister && (!value.name || value.name.trim().length < 2)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['name'],
            message: 'Name is required',
          })
        }
      }),
    [isRegister],
  )

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
  })

  useEffect(() => {
    document.title = isRegister ? 'Register' : 'Login'
  }, [isRegister])

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  const onSubmit = useCallback(async (values: AuthFormValues) => {
    setError(null)
    try {
      if (isRegister) {
        await register(values.name || '', values.email, values.password)
        showSuccess('Account created successfully')
      } else {
        await login(values.email, values.password)
        showSuccess('Logged in successfully')
      }
      navigate('/projects', { replace: true })
    } catch (submitError: unknown) {
      const message = getApiErrorMessage(
        submitError,
        'Authentication failed. Please verify your details.',
      )
      setError(message)
      showError(message)
    }
  }, [isRegister, login, navigate, register, showError, showSuccess])

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {isRegister ? 'Create account' : 'Welcome back'}
              </Typography>
              <Typography color="text.secondary">
                {isRegister
                  ? 'Register to start managing projects and tasks.'
                  : 'Sign in to continue to your projects.'}
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack
              component="form"
              spacing={2}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {isRegister && (
                <TextField
                  label="Name"
                  fullWidth
                  {...field('name')}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
              <TextField
                label="Email"
                type="email"
                fullWidth
                {...field('email')}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                {...field('password')}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
              </Button>
            </Stack>
            <Typography variant="body2">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link to={isRegister ? '/login' : '/register'}>
                {isRegister ? 'Login' : 'Register'}
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
