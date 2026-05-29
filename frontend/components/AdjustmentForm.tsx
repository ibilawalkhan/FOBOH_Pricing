'use client';

export type AdjustmentMode = 'fixed' | 'dynamic';
export type AdjustmentDirection = 'increase' | 'decrease';

export type AdjustmentFormState = {
  mode: AdjustmentMode;
  direction: AdjustmentDirection;
  /** Dollars for fixed mode; percent (0-100) for dynamic mode. */
  value: string;
};

type Props = {
  state: AdjustmentFormState;
  onChange: (next: AdjustmentFormState) => void;
  onRefresh?: () => void;
};

export function AdjustmentForm({ state, onChange, onRefresh }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Based on</label>
        <select
          className="input-base w-full max-w-xs bg-gray-50 cursor-not-allowed"
          value="global-wholesale"
          disabled
        >
          <option value="global-wholesale">Global Wholesale Price</option>
        </select>
      </div>

      <fieldset>
        <legend className="block text-sm text-gray-600 mb-2">Set Price Adjustment Mode</legend>
        <div className="flex gap-4 text-sm">
          {(['fixed', 'dynamic'] as AdjustmentMode[]).map((m) => (
            <label key={m} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="adj-mode"
                checked={state.mode === m}
                onChange={() => onChange({ ...state, mode: m })}
                className="accent-teal"
              />
              {m === 'fixed' ? 'Fixed ($)' : 'Dynamic (%)'}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-sm text-gray-600 mb-2">
          Set Price Adjustment Increment Mode
        </legend>
        <div className="flex gap-4 text-sm">
          {(['increase', 'decrease'] as AdjustmentDirection[]).map((d) => (
            <label key={d} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="adj-direction"
                checked={state.direction === d}
                onChange={() => onChange({ ...state, direction: d })}
                className="accent-teal"
              />
              {d === 'increase' ? 'Increase +' : 'Decrease −'}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Adjustment {state.mode === 'fixed' ? '($)' : '(%)'}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={state.mode === 'fixed' ? '0.01' : '0.1'}
            value={state.value}
            onChange={(e) => onChange({ ...state, value: e.target.value })}
            className="input-accent w-40"
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <span aria-hidden>💡</span>
        <span>
          The adjusted price will be calculated from Global Wholesale Price selected above.
        </span>
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-sm text-teal hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Refresh New Price Table
        </button>
      </div>
    </div>
  );
}
