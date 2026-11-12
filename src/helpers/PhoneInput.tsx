import { useMemo, useState } from "react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import countryData from "country-telephone-data";

type Country = { name: string; iso2: string; dialCode: string };

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
};

const COUNTRIES: Country[] = countryData.allCountries.map((c: { name: string; iso2: string; dialCode: string }) => ({
  name: c.name,
  iso2: c.iso2.toUpperCase(),
  dialCode: c.dialCode,
}));
const KENYA = COUNTRIES.find((c) => c.iso2 === "KE") || COUNTRIES[0];
const MIN_LEN = 7;
const MAX_LEN = 12;

// Pick the country whose dial code is the longest match for an existing number.
function countryFor(value: string) {
  if (!value.startsWith("+")) return KENYA;
  const digits = value.slice(1);
  if (digits.startsWith(KENYA.dialCode)) return KENYA;
  return [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) => digits.startsWith(c.dialCode)) || KENYA;
}

export default function PhoneInput({ value, onChange, onValidChange }: PhoneInputProps) {
  const [selected, setSelected] = useState<Country>(() => countryFor(value));
  const [open, setOpen] = useState(false);
  const national = value.startsWith(`+${selected.dialCode}`) ? value.slice(selected.dialCode.length + 1) : value.replace(/^\+/, "");
  const validNum = national.length >= MIN_LEN && national.length <= MAX_LEN;
  const flag = useMemo(
    () => String.fromCodePoint(...[...selected.iso2].map((c) => 127397 + c.charCodeAt(0))),
    [selected.iso2]
  );

  function update(country: Country, nationalPart: string) {
    const cleaned = nationalPart.replace(/\D/g, "").replace(/^0+/, "");
    onChange(`+${country.dialCode}${cleaned}`);
    onValidChange?.(cleaned.length >= MIN_LEN && cleaned.length <= MAX_LEN);
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="input !w-auto flex items-center gap-1.5 shrink-0">
              <span className="text-lg leading-none">{flag}</span>
              <span className="font-bold">+{selected.dialCode}</span>
              <ChevronDown size={14} className="text-brand" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 rounded-2xl" align="start">
            <Command>
              <CommandInput placeholder="Search country…" />
              <ScrollArea className="h-64">
                <CommandList className="max-h-none">
                  <CommandGroup>
                    {COUNTRIES.map((country) => (
                      <CommandItem
                        key={country.iso2}
                        value={`${country.name} +${country.dialCode}`}
                        onSelect={() => {
                          setSelected(country);
                          update(country, national);
                          setOpen(false);
                        }}
                      >
                        {country.name} <span className="ml-auto text-muted-foreground">+{country.dialCode}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </ScrollArea>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          type="tel"
          inputMode="numeric"
          className={`input ${national.length > 0 && !validNum ? "!border-destructive" : ""}`}
          placeholder="712 345 678"
          value={national}
          onChange={(e) => update(selected, e.target.value)}
          required
        />
      </div>
      {!validNum && national.length > 0 && (
        <span className="text-destructive text-xs">Must be {MIN_LEN}–{MAX_LEN} digits</span>
      )}
    </div>
  );
}
