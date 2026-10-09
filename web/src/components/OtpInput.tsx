import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '../lib/utils'

export interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const completed = useRef(false)

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (value.length === length && !completed.current) {
      completed.current = true
      onComplete?.(value)
    }
    if (value.length < length) completed.current = false
  }, [value, length, onComplete])

  const setDigit = (index: number, digit: string) => {
    const digits = value.split('')
    digits[index] = digit
    const next = digits.join('').slice(0, length)
    onChange(next)
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setDigit(index, '')
      return
    }
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, length)
      onChange(next)
      const focusIndex = Math.min(next.length, length - 1)
      inputs.current[focusIndex]?.focus()
      return
    }
    setDigit(index, digits)
    if (index < length - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (value[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        inputs.current[index - 1]?.focus()
        const digits = value.split('')
        digits[index - 1] = ''
        onChange(digits.join(''))
      }
      event.preventDefault()
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < length - 1) inputs.current[index + 1]?.focus()
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-between gap-2" dir="ltr">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          className={cn(
            'h-14 w-full rounded-btn border bg-surface-2 text-center text-xl font-bold text-text outline-none transition focus:border-accent',
            error ? 'border-danger' : 'border-border',
            disabled && 'opacity-60',
          )}
        />
      ))}
    </div>
  )
}
