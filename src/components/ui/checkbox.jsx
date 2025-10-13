import * as React from "react";
import { Check } from "lucide-react";

const Checkbox = React.forwardRef(({ checked, onCheckedChange, disabled, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked 
          ? 'bg-orange-500 border-orange-500' 
          : 'border-gray-300 bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-orange-400'}`}
      {...props}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </button>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };