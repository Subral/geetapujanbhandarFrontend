import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus, X } from 'lucide-react';

const ADD_NEW_VALUE = '__add_new__';

/**
 * A Select dropdown that also lets the admin type a brand-new value.
 * Choosing "+ Add new..." reveals an inline input. The typed value becomes
 * the selected value and is passed back via onChange (with isNew = true so
 * the parent can persist it in history).
 */
const CreatableSelect = ({
  value,
  options = [],            // array of strings
  placeholder = 'Select',
  addLabel = 'Add new...',
  inputPlaceholder = 'Type new value',
  onChange,                // (value, isNew) => void
  testId
}) => {
  const [adding, setAdding] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Deduplicate while preserving order; include current value even if it
  // isn't in the options list (e.g. a custom value saved earlier).
  const seen = new Set();
  const allOptions = [...options, ...(value && !options.includes(value) ? [value] : [])]
    .filter((opt) => {
      if (!opt || seen.has(opt.toLowerCase())) return false;
      seen.add(opt.toLowerCase());
      return true;
    });

  const confirmCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    // If it already exists, just select it (not new)
    const existing = allOptions.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    onChange(existing || trimmed, !existing);
    setAdding(false);
    setCustomValue('');
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder={inputPlaceholder}
          data-testid={testId ? `${testId}-new-input` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmCustom();
            }
            if (e.key === 'Escape') {
              setAdding(false);
              setCustomValue('');
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={confirmCustom} title="Add">
          <Plus className="h-4 w-4" style={{ color: '#E53935' }} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => { setAdding(false); setCustomValue(''); }}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || ''}
      onValueChange={(v) => {
        if (v === ADD_NEW_VALUE) {
          setAdding(true);
        } else {
          onChange(v, false);
        }
      }}
    >
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
        <SelectItem value={ADD_NEW_VALUE}>
          <span className="flex items-center gap-1 font-medium" style={{ color: '#E53935' }}>
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CreatableSelect;
