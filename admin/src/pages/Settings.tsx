import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { apiGet, apiPatch, apiPut, errorMessage } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { toast } from '../store/toast'
import type { Language, UserOut } from '../types'

interface ProfileForm {
  full_name: string
  email: string
  language: Language
}

const emptyProfile: ProfileForm = {
  full_name: '',
  email: '',
  language: 'uz',
}

export function SettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<UserOut>('/users/me'),
  })

  useEffect(() => {
    if (data) {
      setProfile({
        full_name: data.full_name ?? '',
        email: data.email ?? '',
        language: data.language ?? 'uz',
      })
    }
  }, [data])

  const profileMutation = useMutation({
    mutationFn: (body: ProfileForm) =>
      apiPatch<UserOut>('/users/me', {
        full_name: body.full_name,
        email: body.email || null,
        language: body.language,
      }),
    onSuccess: (user) => {
      setUser(user)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success(t('settings.profileUpdated'))
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiPut<{ detail: string }>('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast.success(t('settings.passwordUpdated'))
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!profile.full_name.trim()) {
      toast.error(t('common.required'))
      return
    }
    profileMutation.mutate({ ...profile, full_name: profile.full_name.trim() })
  }

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!oldPassword || !newPassword) {
      toast.error(t('common.required'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'))
      return
    }
    passwordMutation.mutate()
  }

  if (isError) {
    return (
      <Card padded={false}>
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => void refetch()}
          retryLabel={t('common.retry')}
        />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title={t('settings.profile')}>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input
            label={t('settings.fullName')}
            value={profile.full_name}
            onChange={(event) =>
              setProfile({ ...profile, full_name: event.target.value })
            }
            disabled={isLoading}
          />
          <Input
            label={t('settings.email')}
            type="email"
            value={profile.email}
            onChange={(event) =>
              setProfile({ ...profile, email: event.target.value })
            }
            disabled={isLoading}
          />
          <Select
            label={t('settings.language')}
            value={profile.language}
            onChange={(event) =>
              setProfile({ ...profile, language: event.target.value as Language })
            }
            options={[
              { value: 'uz', label: t('settings.languages.uz') },
              { value: 'ru', label: t('settings.languages.ru') },
              { value: 'en', label: t('settings.languages.en') },
            ]}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={profileMutation.isPending}>
              {t('settings.saveProfile')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('settings.password')}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label={t('settings.oldPassword')}
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            autoComplete="current-password"
          />
          <Input
            label={t('settings.newPassword')}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
          <Input
            label={t('settings.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
          <div className="flex justify-end">
            <Button type="submit" loading={passwordMutation.isPending}>
              {t('settings.changePassword')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
