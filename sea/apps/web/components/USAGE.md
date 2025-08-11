# Vault Components Usage

This document shows how to use the new VaultList components that have been adapted to the vaultTile style.

## Components Overview

### VaultList
The main component that displays vault assets with full functionality including:
- Dynamic field discovery
- Asset listing with proper formatting
- Withdrawal functionality (simulated)
- Refresh capabilities
- Professional UI using the Tile system

### VaultTile (Updated)
Now simply a wrapper around VaultList for backward compatibility.

## Basic Usage

```tsx
import { VaultList, VaultTile } from "./components/vault";
// or
import VaultList from "./components/VaultList";
import { VaultTile } from "./components/vaultTile";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Option 1: Use VaultList directly */}
      <VaultList />
      
      {/* Option 2: Use VaultTile (same as VaultList now) */}
      <VaultTile />
      
      {/* Option 3: With custom props */}
      <VaultList 
        minHeight="min-h-[30rem]"
        className="custom-vault-styles"
        note="Custom loading message..."
      />
    </div>
  );
}
```

## Features

### Modern UI Components
- Uses shadcn/ui components (Button, Input, Badge, Card)
- Consistent with the Tile design system
- Responsive layout
- Loading states and animations
- Professional icons from Lucide React

### Vault Discovery
- Automatically finds user's vault through OwnerCap objects
- Queries dynamic fields to discover stored assets
- Handles multiple coin types with proper metadata

### Asset Management
- Displays coin symbols, amounts, and formatted addresses
- Proper decimal handling for different coin types
- Withdrawal input with validation
- Real-time balance updates

### Developer Experience
- Full TypeScript support
- Debug information in development mode
- Comprehensive error handling
- Proper loading states

## Key Improvements

1. **Style Consistency**: Now uses the same Tile system as other components
2. **Better UX**: Professional buttons, inputs, and layouts
3. **Responsive Design**: Works well on different screen sizes
4. **Error Handling**: Graceful handling of missing data or errors
5. **Performance**: Optimized queries and state management

## Props

### VaultList / VaultTile Props
```tsx
type VaultListProps = {
  note?: string;          // Custom loading/empty message
  minHeight?: string;     // Minimum height class
  className?: string;     // Additional CSS classes
};
```

## Styling

The components use Tailwind CSS classes and are designed to work with:
- Dark/light themes through CSS variables
- The existing design system
- shadcn/ui component library
- Responsive breakpoints

## Development Notes

- Set `NODE_ENV=development` to see debug information
- Components automatically refresh data after transactions
- Withdrawal functionality is simulated (ready for Move integration)
- All blockchain queries are cached appropriately

## Migration from Old VaultList

If you were using the old VaultList from the frontend folder:

```tsx
// Old way
import VaultList from "../frontend/src/component/VaultList";

// New way
import VaultList from "./components/VaultList";
// or
import { VaultTile } from "./components/vaultTile";
```

The API is mostly the same, but now with better styling and error handling.
