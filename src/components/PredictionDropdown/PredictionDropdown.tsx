import React from 'react';
import './PredictionDropdown.css';

interface PredictionDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const PredictionDropdown: React.FC<PredictionDropdownProps> = ({ value, options, onChange }) => {
  return (
    <div className="prediction-dropdown">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PredictionDropdown;
