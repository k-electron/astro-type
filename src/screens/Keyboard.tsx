import type React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { KEYBOARD_ROWS, type KeySpec } from '../curriculum/keyboardLayout';

/**
 * How one keycap is drawn and what it does: the button's own attributes
 * (its class, tooltip, name, handlers, `disabled`) and a badge in its corner.
 */
export interface KeyView
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  badge?: ReactNode;
}

interface KeyboardProps {
  /** How each keycap looks and acts; the keyboard lays them out. */
  keyView: (spec: KeySpec) => KeyView;
  /** The keyboard's accessible name. */
  label: string;
}

/**
 * The whole keyboard the Action Deck draws, as buttons: every row of the
 * curriculum's key table at its real key widths. It knows nothing of what the
 * keys mean; each screen says how a keycap looks and what it does.
 */
export const Keyboard: React.FC<KeyboardProps> = ({ keyView, label }) => (
  <fieldset
    aria-label={label}
    className="flex flex-col gap-1 w-full min-w-0 m-0 p-0 border-0"
  >
    {KEYBOARD_ROWS.map((row) => (
      <div key={row[0].key} className="flex gap-1">
        {row.map((spec) => {
          const { badge, className, ...button } = keyView(spec);
          return (
            <button
              type="button"
              key={spec.key}
              style={{ flex: `${spec.units} 1 0` }}
              className={`relative min-w-0 h-8 rounded-md border flex items-center justify-center font-mono type-caption ${className ?? ''}`}
              {...button}
            >
              {spec.display}
              {badge !== undefined && (
                <span className="absolute -top-1.5 -right-1 type-caption leading-none px-1 py-0.5 rounded bg-rose-600 text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    ))}
  </fieldset>
);
