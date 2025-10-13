import * as React from "react";
import { Input } from "@/components/ui/input";

const RangeSlider = ({ min, max, step = 1, value, onValueChange, label }) => {
  const [localValue, setLocalValue] = React.useState(value || [min, max]);

  React.useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e, index) => {
    const newValue = [...localValue];
    newValue[index] = parseInt(e.target.value);
    
    if (index === 0 && newValue[0] > newValue[1]) {
      newValue[0] = newValue[1];
    } else if (index === 1 && newValue[1] < newValue[0]) {
      newValue[1] = newValue[0];
    }
    
    setLocalValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  const handleInputChange = (index, val) => {
    const numVal = parseInt(val) || min;
    const clampedVal = Math.max(min, Math.min(max, numVal));
    const newValue = [...localValue];
    newValue[index] = clampedVal;
    
    if (index === 0 && newValue[0] > newValue[1]) {
      newValue[0] = newValue[1];
    } else if (index === 1 && newValue[1] < newValue[0]) {
      newValue[1] = newValue[0];
    }
    
    setLocalValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  const percentage0 = ((localValue[0] - min) / (max - min)) * 100;
  const percentage1 = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={min}
            max={max}
            value={localValue[0]}
            onChange={(e) => handleInputChange(0, e.target.value)}
            className="w-16 h-7 text-xs text-center font-semibold"
          />
          <span className="text-xs text-gray-500 font-medium">עד</span>
          <Input
            type="number"
            min={min}
            max={max}
            value={localValue[1]}
            onChange={(e) => handleInputChange(1, e.target.value)}
            className="w-16 h-7 text-xs text-center font-semibold"
          />
        </div>
      </div>
      
      <div className="relative h-2 px-2">
        {/* Background track */}
        <div className="absolute w-full h-2 bg-gray-200 rounded-full" style={{ left: 0 }} />
        
        {/* Active track */}
        <div 
          className="absolute h-2 rounded-full"
          style={{ 
            background: 'var(--accent)',
            left: `${percentage0}%`,
            right: `${100 - percentage1}%`
          }}
        />
        
        {/* First thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={(e) => handleSliderChange(e, 0)}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none 
                     [&::-webkit-slider-thumb]:pointer-events-auto 
                     [&::-webkit-slider-thumb]:appearance-none 
                     [&::-webkit-slider-thumb]:w-6 
                     [&::-webkit-slider-thumb]:h-6 
                     [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-white 
                     [&::-webkit-slider-thumb]:border-[3px] 
                     [&::-webkit-slider-thumb]:border-gray-900
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:cursor-grab
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-webkit-slider-thumb]:active:cursor-grabbing
                     [&::-webkit-slider-thumb]:active:shadow-lg
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-moz-range-thumb]:pointer-events-auto 
                     [&::-moz-range-thumb]:w-6 
                     [&::-moz-range-thumb]:h-6 
                     [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:bg-white 
                     [&::-moz-range-thumb]:border-[3px] 
                     [&::-moz-range-thumb]:border-gray-900
                     [&::-moz-range-thumb]:shadow-md
                     [&::-moz-range-thumb]:cursor-grab
                     [&::-moz-range-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:active:cursor-grabbing
                     [&::-moz-range-thumb]:transition-all"
          style={{ zIndex: 3 }}
        />
        
        {/* Second thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={(e) => handleSliderChange(e, 1)}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none 
                     [&::-webkit-slider-thumb]:pointer-events-auto 
                     [&::-webkit-slider-thumb]:appearance-none 
                     [&::-webkit-slider-thumb]:w-6 
                     [&::-webkit-slider-thumb]:h-6 
                     [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-white 
                     [&::-webkit-slider-thumb]:border-[3px] 
                     [&::-webkit-slider-thumb]:border-gray-900
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:cursor-grab
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-webkit-slider-thumb]:active:cursor-grabbing
                     [&::-webkit-slider-thumb]:active:shadow-lg
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-moz-range-thumb]:pointer-events-auto 
                     [&::-moz-range-thumb]:w-6 
                     [&::-moz-range-thumb]:h-6 
                     [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:bg-white 
                     [&::-moz-range-thumb]:border-[3px] 
                     [&::-moz-range-thumb]:border-gray-900
                     [&::-moz-range-thumb]:shadow-md
                     [&::-moz-range-thumb]:cursor-grab
                     [&::-moz-range-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:active:cursor-grabbing
                     [&::-moz-range-thumb]:transition-all"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
};

export { RangeSlider };