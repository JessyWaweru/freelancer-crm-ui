import { useState } from "react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import countryData from "country-telephone-data";

type Country = {
  name: string;
  iso2: string;
  dialCode: string;
};

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
};

export default function PhoneInput({ value, onChange, onValidChange }: PhoneInputProps) {
  const countries: Country[] = countryData.allCountries.map((c: any) => ({
    name: c.name,
    iso2: c.iso2.toUpperCase(),
    dialCode: c.dialCode,
  }));

  const [selected, setSelected] = useState<Country>(countries.find(c => c.iso2 === "KE") || countries[0]);
  const national = value.replace(`+${selected.dialCode}`, "");

  const minLen = 7;
  const maxLen = 12;

  function updatePhone(nationalPart: string) {
    const phone = `+${selected.dialCode}${nationalPart}`;
    onChange(phone);

    const valid = /^\+?\d+$/.test(phone) && nationalPart.length >= minLen && nationalPart.length <= maxLen;
    onValidChange?.(valid);
  }

  function handleNationalInput(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/\D/g, "");
    updatePhone(cleaned);
  }

  const validNum = national.length >= minLen && national.length <= maxLen;

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[110px] justify-between">
              {selected.iso2} +{selected.dialCode}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-64 p-0">
            <Command>
              <CommandInput placeholder="Search country..." />
              <ScrollArea className="max-h-60">
                <CommandList>
                  <CommandGroup>
                    {countries.map(country => (
                      <CommandItem
                        key={country.iso2}
                        value={`${country.name} +${country.dialCode}`}
                        onSelect={() => {
                          setSelected(country);
                          updatePhone(national);
                        }}
                      >
                        {country.name} (+{country.dialCode})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </ScrollArea>
            </Command>
          </PopoverContent>
        </Popover>

        <input
          type="text"
          className={`flex-1 border rounded-md px-3 py-2 outline-none ${
            validNum ? "border-gray-300" : "border-red-500"
          }`}
          placeholder="712345678"
          value={national}
          onChange={handleNationalInput}
          required
        />
      </div>

      {!validNum && national.length > 0 && (
        <span className="text-red-500 text-xs">
          Must be {minLen}–{maxLen} digits
        </span>
      )}
    </div>
  );
}
