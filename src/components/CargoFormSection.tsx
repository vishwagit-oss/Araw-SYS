"use client";

interface CargoFormSectionProps {
  title: "WHITE" | "YELLOW";
  ig: string;
  mt: string;
  onIgChange: (value: string) => void;
  onMtChange: (value: string) => void;
  priceAed: string;
  onPriceAedChange: (value: string) => void;
  igToMt: (ig: number) => number;
  mtToIg: (mt: number) => number;
}

export function CargoFormSection({
  title,
  ig,
  mt,
  onIgChange,
  onMtChange,
  priceAed,
  onPriceAedChange,
  igToMt,
  mtToIg,
}: CargoFormSectionProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl">
      <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">I.G.</label>
          <input
            type="number"
            step="any"
            value={ig}
            onChange={(e) => {
              const v = e.target.value;
              onIgChange(v);
              if (v === "") onMtChange("");
              else {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) onMtChange(igToMt(n).toFixed(4));
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">M.T.</label>
          <input
            type="number"
            step="any"
            value={mt}
            onChange={(e) => {
              const v = e.target.value;
              onMtChange(v);
              if (v === "") onIgChange("");
              else {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) onIgChange(mtToIg(n).toFixed(2));
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Price (AED)</label>
          <input
            type="number"
            step="any"
            value={priceAed}
            onChange={(e) => onPriceAedChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="AED"
          />
        </div>
      </div>
    </div>
  );
}
