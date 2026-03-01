"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ALL_CATEGORIES = [
  "restaurant", "park", "museum", "cafe", "shop",
  "attraction", "natural", "tourism", "historic", "leisure",
] as const

export type Category = typeof ALL_CATEGORIES[number]

interface Props {
  selected: Category[]
  onChange: (categories: Category[]) => void
}

export function CategoryFilter({ selected, onChange }: Props) {
  const toggle = (cat: Category) => {
    if (selected.includes(cat)) {
      onChange(selected.filter(c => c !== cat))
    } else {
      onChange([...selected, cat])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-7 px-2 py-0.5 text-sm border border-border/40 hover:border-border bg-transparent text-muted-foreground hover:text-foreground outline-none">
          Categories {selected.length < ALL_CATEGORIES.length ? `(${selected.length})` : ""}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 z-[2000]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>POI Categories</DropdownMenuLabel>
          {ALL_CATEGORIES.map(cat => (
            <DropdownMenuCheckboxItem
              key={cat}
              checked={selected.includes(cat)}
              onCheckedChange={() => toggle(cat)}
              className="capitalize"
            >
              {cat}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ALL_CATEGORIES }
