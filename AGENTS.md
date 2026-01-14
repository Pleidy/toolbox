# Agent Guidelines for QRCode Toolbox

This document provides guidelines for AI agents working on this codebase.

## Project Overview

QRCode Toolbox is an Electron desktop application built with React, TypeScript, and Vite. It generates and manages QR codes with features like batch generation, logo embedding, and export capabilities.

## Build & Development Commands

```bash
# Development
npm run dev                    # Start Vite dev server (port 1420)
npm run electron:dev           # Run Electron in development mode

# Building
npm run build                  # Run TypeScript check + Vite build
npm run electron:build         # Build for Electron (runs build first)
npm run electron:build:win     # Build Windows installer

# Preview & Distribution
npm run preview                # Preview production build
```

**Note:** No test framework is currently configured. Tests can be added with Vitest or Jest.

## Code Style Guidelines

### TypeScript Configuration

The project uses strict TypeScript mode with these rules:
- `strict: true` - Full strict mode enabled
- `noUnusedLocals: true` - No unused local variables
- `noUnusedParameters: true` - No unused function parameters
- `noFallthroughCasesInSwitch: true` - No fallthrough in switch statements

Always use proper TypeScript types. Avoid `any`, `@ts-ignore`, or type assertions.

### Imports & Path Aliases

Use the `@` alias for imports from `src/`:
```typescript
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
```

Third-party packages are imported normally:
```typescript
import QRCode from 'qrcode';
import { useState } from 'react';
import { create } from 'zustand';
```

### Component Patterns

Follow this pattern for React components:

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Use CVA for variant-based styling
const componentVariants = cva(
  "base-styles...",
  {
    variants: {
      variant: { default: "...", destructive: "..." },
      size: { default: "...", sm: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {
  asChild?: boolean
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        className={cn(componentVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Component.displayName = "Component"

export { Component, componentVariants }
```

**Key patterns:**
- Use `React.forwardRef` for components accepting refs
- Export component interfaces for external use
- Set `displayName` on forwarded components
- Use `class-variance-authority` (CVA) for variant props
- Use `cn()` utility to merge Tailwind classes
- Use Radix UI `Slot` for polymorphic components

### Utility Functions

Use the `cn` utility for class merging (already exported in `src/lib/utils.ts`):
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### State Management (Zustand)

Follow this pattern for Zustand stores:

```typescript
import { create } from 'zustand';

interface StoreState {
  // State
  value: string;
  isOpen: boolean;
  
  // Actions
  setValue: (value: string) => void;
  setOpen: (open: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  value: 'default',
  isOpen: false,
  setValue: (value) => set({ value }),
  setOpen: (isOpen) => set({ isOpen }),
}));
```

### Type Definitions

Use discriminated unions for complex types:
```typescript
export type ImportSource = 
  | { type: 'excel'; file: File }
  | { type: 'csv'; file: File }
  | { type: 'text'; file: File }
  | { type: 'manual'; items: string[] };
```

Use interfaces for structured data:
```typescript
export interface QRCodeConfig {
  content: string;
  width: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
}
```

### Error Handling

Handle errors gracefully:
- Never use empty catch blocks: `catch(e) {}`
- Use async/await with try/catch for async operations
- Provide meaningful error messages or user feedback
- Reject promises with Error objects: `reject(new Error('message'))`

### Tailwind CSS Conventions

- Use CSS variables defined in `src/index.css` for colors
- Follow shadcn/ui color scheme: `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`
- Support dark mode via `dark:` modifier
- Use semantic color names: `text-muted-foreground`, `bg-primary`, etc.

### Naming Conventions

- **Components:** PascalCase (`Button`, `QRCodeGenerator`)
- **Functions/variables:** camelCase (`generateQRCode`, `isValid`)
- **Constants:** UPPER_SNAKE_CASE for true constants
- **Types/interfaces:** PascalCase (`QRCodeConfig`, `ImportSource`)
- **Files:** kebab-case for utilities (`file-operations.ts`), PascalCase for components (`Button.tsx`)

### File Organization

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Input, Dialog, etc.)
│   └── qrcode/       # QR code specific components
├── lib/              # Utilities and helpers
├── stores/           # Zustand stores
├── types/            # TypeScript type definitions
├── App.tsx           # Root component
└── main.tsx          # Entry point
```

## Testing

No test framework is currently configured. When adding tests:
- Use Vitest (integrates well with Vite)
- Place tests alongside source files: `Component.test.tsx`
- Follow React Testing Library patterns

## Building for Production

1. Run `npm run build` to check TypeScript and build assets
2. Run `npm run electron:build` to create the Electron distributable
3. Output goes to `release/` directory

## Common Patterns

### Canvas Operations (QR Code Generation)
- Use `document.createElement('canvas')` for image composition
- Always check context existence: `ctx?.drawImage(...)`
- Handle image loading with Promise-based pattern

### File Operations
- Use `file-saver` for saving files
- Support both PNG and JPEG export formats
- Use `URL.createObjectURL()` for previewing generated files

### Theme Support
- Use `next-themes` for dark/light mode
- Wrap app in `<ThemeProvider>` at root
- Use `class` strategy for dark mode
