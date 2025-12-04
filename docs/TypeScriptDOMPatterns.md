# TypeScript DOM Patterns & Common Issues

## Common DOM TypeScript Issues

### Issue: Element vs HTMLElement Type Casting

**Problem**: `querySelector()` returns `Element | null`, but many DOM properties like `style`, `value`, `textContent` are only available on more specific types.

**Common Error**:
```typescript
// ❌ This will cause TypeScript error
const element = document.querySelector('#my-element')
element.style.display = 'none' // Error: Property 'style' does not exist on type 'Element'
```

**Solution**: Cast to the appropriate HTML element type:
```typescript
// ✅ Correct approach
const element = document.querySelector('#my-element') as HTMLElement
element.style.display = 'none'

// ✅ For input elements
const input = document.querySelector('#my-input') as HTMLInputElement
input.value = 'some value'

// ✅ For buttons
const button = document.querySelector('#my-button') as HTMLButtonElement
button.disabled = true
```

**Best Practices**:

1. **Always cast DOM elements** when you need to access element-specific properties:
   ```typescript
   // Common element types
   as HTMLElement        // For general HTML elements (style, classList, etc.)
   as HTMLInputElement   // For input fields (value, checked, etc.)
   as HTMLButtonElement  // For buttons (disabled, etc.)
   as HTMLSelectElement  // For select dropdowns (selectedIndex, options, etc.)
   as HTMLFormElement    // For forms (submit, reset, etc.)
   ```

2. **Use null checks** when elements might not exist:
   ```typescript
   const element = document.querySelector('#optional-element') as HTMLElement
   if (element) {
     element.style.display = 'none'
   }
   ```

3. **Create helper functions** for common patterns:
   ```typescript
   private getElement<T extends HTMLElement>(selector: string): T | null {
     return this.container.querySelector(selector) as T
   }
   
   // Usage
   const input = this.getElement<HTMLInputElement>('#my-input')
   if (input) {
     input.value = 'test'
   }
   ```

### Issue: Event Target Type Casting

**Problem**: Event targets are often typed as `EventTarget | null` but need more specific typing.

**Solution**:
```typescript
// ❌ Type error
button.addEventListener('click', (event) => {
  event.target.disabled = true // Error: Property 'disabled' does not exist
})

// ✅ Correct approach
button.addEventListener('click', (event) => {
  const target = event.target as HTMLButtonElement
  target.disabled = true
})
```

### Issue: Container Property Access

**Problem**: When working within component containers, you often need to access child elements.

**Best Practice Pattern**:
```typescript
export class MyComponent {
  private container: HTMLElement
  
  private setupEventListeners(): void {
    // ✅ Good pattern - cast immediately when selecting
    const button = this.container.querySelector('#action-btn') as HTMLButtonElement
    const input = this.container.querySelector('#text-input') as HTMLInputElement
    
    if (button) {
      button.addEventListener('click', () => {
        if (input) {
          console.log(input.value)
        }
      })
    }
  }
  
  private updateUI(): void {
    // ✅ Good pattern for style changes
    const loadingEl = this.container.querySelector('#loading') as HTMLElement
    const contentEl = this.container.querySelector('#content') as HTMLElement
    
    if (loadingEl) loadingEl.style.display = 'none'
    if (contentEl) contentEl.style.display = 'block'
  }
}
```

## Recommended Patterns for Rune Tools

### 1. Component Property Access Pattern
```typescript
// Use this pattern for all DOM manipulations in components
private updateElementVisibility(elementId: string, visible: boolean): void {
  const element = this.container.querySelector(`#${elementId}`) as HTMLElement
  if (element) {
    element.style.display = visible ? 'block' : 'none'
  }
}
```

### 2. Form Element Access Pattern
```typescript
private getFormData(): FormData {
  const form = this.container.querySelector('#my-form') as HTMLFormElement
  const input = this.container.querySelector('#my-input') as HTMLInputElement
  const select = this.container.querySelector('#my-select') as HTMLSelectElement
  
  return {
    inputValue: input?.value || '',
    selectedOption: select?.value || ''
  }
}
```

### 3. Event Handler Pattern
```typescript
private setupEventListeners(): void {
  // Cast elements when selecting, not in event handlers
  const button = this.container.querySelector('#submit-btn') as HTMLButtonElement
  const input = this.container.querySelector('#password-input') as HTMLInputElement
  
  button?.addEventListener('click', () => {
    // No casting needed here since we already cast above
    const password = input.value
    this.handleSubmit(password)
  })
}
```

## Why This Matters

1. **Build Safety**: Prevents TypeScript compilation errors
2. **IDE Support**: Better autocomplete and error detection
3. **Runtime Safety**: More explicit about expected element types
4. **Maintenance**: Clearer code intent for future developers

## Quick Reference

```typescript
// Most common DOM element casts in our UI components:
as HTMLElement          // style, classList, dataset
as HTMLInputElement     // value, checked, disabled
as HTMLButtonElement    // disabled, click()
as HTMLSelectElement    // value, selectedIndex, options
as HTMLDivElement       // innerHTML, textContent
as HTMLSpanElement      // textContent, innerHTML
```

Always remember: **Cast early, cast explicitly, check for null**.