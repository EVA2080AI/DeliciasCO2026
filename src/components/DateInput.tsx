/**
 * DateInput — campo de fecha con diseño consistente cross-browser.
 *
 * Problema resuelto:
 * - `type="date"` muestra su propio ícono nativo (Chrome/Safari) → doble ícono visual si se pone otro encima
 * - El placeholder span solapaba con el "dd/mm/yyyy" nativo del browser
 * - Solución: ocultamos el ícono nativo con CSS, usamos solo el ícono de diseño
 */
import { CalendarDays } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const DateInput = ({
  value,
  onChange,
  label,
  placeholder = 'Fecha deseada',
  min,
  max,
  required = false,
  className = '',
  id,
}: DateInputProps) => {
  const inputId = id || `date-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <div className="relative group">
        {/* Ícono de diseño — solo decorativo, pointer-events-none */}
        <CalendarDays
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10 transition-colors group-focus-within:text-primary"
          aria-hidden="true"
        />

        {/* Placeholder custom cuando no hay valor (solo visible si no hay fecha) */}
        {!value && (
          <span
            className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none z-10 select-none"
            aria-hidden="true"
          >
            {placeholder}
          </span>
        )}

        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          aria-label={label || placeholder}
          className={[
            'w-full pl-11 pr-4 py-3.5 rounded-xl border bg-background text-sm',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all',
            // Ocultar el ícono nativo del navegador (funciona en Webkit/Chrome/Safari/Firefox)
            '[&::-webkit-calendar-picker-indicator]:opacity-0',
            '[&::-webkit-calendar-picker-indicator]:absolute',
            '[&::-webkit-calendar-picker-indicator]:right-0',
            '[&::-webkit-calendar-picker-indicator]:w-full',
            '[&::-webkit-calendar-picker-indicator]:h-full',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
            // Si tiene valor, texto visible; si no, transparente (el span cubre el placeholder)
            !value ? 'text-transparent' : 'text-foreground',
          ].join(' ')}
        />
      </div>
    </div>
  );
};

export default DateInput;
