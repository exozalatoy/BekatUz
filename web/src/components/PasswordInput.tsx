import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'
import { Input, type InputProps } from './Input'

export function PasswordInput(props: Omit<InputProps, 'type' | 'rightSlot'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="text-muted transition hover:text-text"
          aria-label={visible ? 'hide' : 'show'}
        >
          {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      }
    />
  )
}
