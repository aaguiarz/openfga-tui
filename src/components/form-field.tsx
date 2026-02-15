interface FormFieldProps {
  label: string
  children: React.ReactNode
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <box flexDirection="row" gap={1} height={1}>
      <text fg="#888888" width={18}>{label}:</text>
      {children}
    </box>
  )
}
