import * as React from "react";

const Slider = React.forwardRef(({ className, min, max, step, value, onValueChange, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value || [min, max]);

  React.useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  const handleChange = (index, newValue) => {
    const updated = [...localValue];
    updated[index] = parseInt(newValue);
    setLocalValue(updated);
    if (onValueChange) onValueChange(updated);
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={localValue[0]}
        onChange={(e) => handleChange(0, e.target.value)}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${((localValue[0] - min) / (max - min)) * 100}%, #e5e7eb ${((localValue[0] - min) / (max - min)) * 100}%, #e5e7eb 100%)`
        }}
        {...props}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue[1]}
        onChange={(e) => handleChange(1, e.target.value)}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${((localValue[1] - min) / (max - min)) * 100}%, #ff6b35 ${((localValue[1] - min) / (max - min)) * 100}%, #ff6b35 100%)`
        }}
        {...props}
      />
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider };