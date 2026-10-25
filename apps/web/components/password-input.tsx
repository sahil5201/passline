
'use client'

import * as React from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, type, disabled, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-10', className)}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
})

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
