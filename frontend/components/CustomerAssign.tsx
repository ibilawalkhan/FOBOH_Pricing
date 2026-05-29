'use client';

import type { CustomerDTO, CustomerGroupDTO, ScopeDTO } from '@/lib/api';

export type AssignMode = 'customer' | 'group' | 'all';

export type CustomerAssignState = {
  mode: AssignMode;
  customerId: string;
  groupId: string;
};

type Props = {
  customers: CustomerDTO[];
  groups: CustomerGroupDTO[];
  state: CustomerAssignState;
  onChange: (next: CustomerAssignState) => void;
};

export function CustomerAssign({ customers, groups, state, onChange }: Props) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 text-sm">
        <legend className="text-gray-700">Assign this Pricing Profile to</legend>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-gray-200 hover:border-teal/50">
          <input
            type="radio"
            name="assign-mode"
            checked={state.mode === 'customer'}
            onChange={() => onChange({ ...state, mode: 'customer' })}
            className="mt-0.5 accent-teal"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">A single customer</div>
            <select
              className="input-base mt-2 w-full max-w-md"
              disabled={state.mode !== 'customer'}
              value={state.customerId}
              onChange={(e) => onChange({ ...state, customerId: e.target.value })}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-gray-200 hover:border-teal/50">
          <input
            type="radio"
            name="assign-mode"
            checked={state.mode === 'group'}
            onChange={() => onChange({ ...state, mode: 'group' })}
            className="mt-0.5 accent-teal"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">A customer group</div>
            <select
              className="input-base mt-2 w-full max-w-md"
              disabled={state.mode !== 'group'}
              value={state.groupId}
              onChange={(e) => onChange({ ...state, groupId: e.target.value })}
            >
              <option value="">Select a customer group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-gray-200 hover:border-teal/50">
          <input
            type="radio"
            name="assign-mode"
            checked={state.mode === 'all'}
            onChange={() => onChange({ ...state, mode: 'all' })}
            className="mt-0.5 accent-teal"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">All customers</div>
            <p className="text-xs text-gray-500 mt-1">
              Applied as a fallback when no more specific profile matches.
            </p>
          </div>
        </label>
      </fieldset>
    </div>
  );
}

export function toScopeDTO(state: CustomerAssignState): ScopeDTO | null {
  if (state.mode === 'all') return { type: 'all' };
  if (state.mode === 'customer') {
    if (!state.customerId) return null;
    return { type: 'customer', customerId: state.customerId };
  }
  if (!state.groupId) return null;
  return { type: 'group', groupId: state.groupId };
}
