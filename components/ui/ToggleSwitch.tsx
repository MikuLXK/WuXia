import React from 'react';

interface Props {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
}

const ToggleSwitch: React.FC<Props> = ({ checked, onChange, disabled = false, ariaLabel, className = '' }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
                checked ? 'bg-wuxia-gold/80' : 'bg-gray-700'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        >
            <span
                className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-0'
                }`}
            />
        </button>
    );
};

export default ToggleSwitch;
