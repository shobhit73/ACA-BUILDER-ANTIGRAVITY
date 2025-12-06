"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Company {
    company_code: string
    company_name: string
}

interface CompanySelectorProps {
    value?: string
    onChange: (value: string) => void
    className?: string
    placeholder?: string
}

export function CompanySelector({ value, onChange, className, placeholder = "Select company..." }: CompanySelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [companies, setCompanies] = React.useState<Company[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchCompanies = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from("company_details")
                .select("company_code, company_name")
                .order("company_name")

            if (!error && data) {
                setCompanies(data)
            }
            setLoading(false)
        }
        fetchCompanies()
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-[250px] justify-between", className)}
                    disabled={loading}
                >
                    {value
                        ? companies.find((company) => company.company_code === value)?.company_name
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Search company..." />
                    <CommandList>
                        <CommandEmpty>No company found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                key="all"
                                value="all"
                                onSelect={() => {
                                    onChange("")
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === "" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                All Companies
                            </CommandItem>
                            {companies.map((company) => (
                                <CommandItem
                                    key={company.company_code}
                                    value={company.company_name}
                                    onSelect={(currentValue) => {
                                        // We want to select by company_code, but CommandItem filtering works on the label/value text.
                                        // We passed company_name as value to CommandItem for search, but we want to set the ID.
                                        onChange(company.company_code === value ? "" : company.company_code)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === company.company_code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {company.company_name} ({company.company_code})
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
