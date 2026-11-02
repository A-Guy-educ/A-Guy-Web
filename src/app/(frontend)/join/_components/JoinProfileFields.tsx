'use client'

/**
 * First name, last name and mobile inputs for the /join form.
 *
 * @fileType component
 * @domain classroom
 */

import { cn } from '@/infra/utils/ui'
import { Input } from '@/ui/web/components/input'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { JoinProfile, ProfileField } from '../_lib/join-profile'
import { JoinField, fieldClass, fieldId } from './JoinField'

const NAME_AUTOCOMPLETE = { firstName: 'given-name', lastName: 'family-name' } as const

export function JoinProfileFields({
  profile,
  invalid,
  onChange,
}: {
  profile: JoinProfile
  invalid: ProfileField | null
  onChange: (field: ProfileField, value: string) => void
}) {
  const t = useTranslations('studentJoin')

  return (
    <>
      <div className="grid grid-cols-2 gap-content-gap-sm">
        {(['firstName', 'lastName'] as const).map((field) => (
          <JoinField
            key={field}
            fieldKey={field}
            label={t(`fields.${field}`)}
            error={invalid === field && t(`errors.${field}`)}
          >
            <Input
              id={fieldId(field)}
              value={profile[field]}
              onChange={(e) => onChange(field, e.target.value)}
              autoComplete={NAME_AUTOCOMPLETE[field]}
              maxLength={50}
              aria-invalid={invalid === field || undefined}
              className={fieldClass(invalid === field)}
            />
          </JoinField>
        ))}
      </div>

      <JoinField
        fieldKey="phone"
        label={t('fields.phone')}
        error={invalid === 'phone' && t('errors.phone')}
      >
        <Input
          id={fieldId('phone')}
          type="tel"
          inputMode="numeric"
          dir="ltr"
          value={profile.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="050-0000000"
          autoComplete="tel"
          aria-invalid={invalid === 'phone' || undefined}
          className={cn(fieldClass(invalid === 'phone'), 'text-end')}
        />
      </JoinField>
    </>
  )
}
