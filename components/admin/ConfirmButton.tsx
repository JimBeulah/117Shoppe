"use client"

interface Props {
  message: string
  className?: string
  children: React.ReactNode
  formAction: (formData: FormData) => void | Promise<void>
  name?: string
  value?: string
}

export default function ConfirmButton({ message, className, children, formAction, name, value }: Props) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(e) => { if (!confirm(message)) e.preventDefault() }}
      {...(name ? { name } : {})}
      {...(value ? { value } : {})}
    >
      {children}
    </button>
  )
}
