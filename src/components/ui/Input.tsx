import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
        )}
        <input
          ref={ref}
          className={`
            w-full h-10 rounded-xl bg-white/5 border border-white/10
            text-white text-sm placeholder:text-gray-600
            px-3 ${icon ? 'pl-10' : ''}
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            transition-all duration-150
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
