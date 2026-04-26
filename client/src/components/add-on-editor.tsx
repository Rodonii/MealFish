import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface AddOn {
  name: string;
  price: number; // in cents
}

interface AddOnEditorProps {
  value: AddOn[];
  onChange: (next: AddOn[]) => void;
  testIdPrefix?: string;
}

export function AddOnEditor({ value, onChange, testIdPrefix = "addon" }: AddOnEditorProps) {
  const [draftName, setDraftName] = React.useState("");
  const [draftPriceText, setDraftPriceText] = React.useState("");

  const addRow = () => {
    const name = draftName.trim();
    const priceNum = parseFloat(draftPriceText);
    if (!name) return;
    if (!isFinite(priceNum) || priceNum < 0) return;
    const priceCents = Math.round(priceNum * 100);
    onChange([...value, { name, price: priceCents }]);
    setDraftName("");
    setDraftPriceText("");
  };

  const removeRow = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2" data-testid={`${testIdPrefix}-list`}>
          {value.map((addOn, idx) => (
            <div
              key={`${addOn.name}-${idx}`}
              className="flex items-center justify-between bg-secondary/40 rounded-xl px-4 py-2.5 border border-border/60"
              data-testid={`${testIdPrefix}-row-${idx}`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground truncate" data-testid={`${testIdPrefix}-name-${idx}`}>
                  {addOn.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  +₱{(addOn.price / 100).toFixed(2)}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                className="text-destructive hover:bg-destructive/10 shrink-0"
                data-testid={`${testIdPrefix}-remove-${idx}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Add-on name (e.g., Extra Rice)"
          className="flex-1"
          data-testid={`${testIdPrefix}-input-name`}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={draftPriceText}
          onChange={(e) => setDraftPriceText(e.target.value)}
          placeholder="Price (PHP)"
          className="sm:w-32"
          data-testid={`${testIdPrefix}-input-price`}
        />
        <Button
          type="button"
          onClick={addRow}
          variant="outline"
          className="sm:w-auto"
          data-testid={`${testIdPrefix}-add`}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
