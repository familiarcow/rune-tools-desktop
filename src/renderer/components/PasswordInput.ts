/**
 * PasswordInput Component - Reusable password input with inline show/hide toggle
 * 
 * A clean, reusable password input component with an integrated eye button
 * for toggling password visibility. The eye button is properly positioned
 * inline within the input field.
 */

export interface PasswordInputOptions {
  id: string
  placeholder?: string
  label?: string
  required?: boolean
  autocomplete?: string
  className?: string
}

export class PasswordInput {
  private container: HTMLElement
  private options: PasswordInputOptions
  private isPasswordVisible: boolean = false

  constructor(container: HTMLElement, options: PasswordInputOptions) {
    this.container = container
    this.options = {
      placeholder: 'Enter password',
      label: 'Password',
      required: false,
      autocomplete: 'current-password',
      className: '',
      ...options
    }
    
    this.render()
    this.setupEventListeners()
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="password-input-component">
        ${this.options.label ? `
          <label class="password-label" for="${this.options.id}">
            ${this.options.label}
            ${this.options.required ? '<span class="required">*</span>' : ''}
          </label>
        ` : ''}
        <div class="password-input-wrapper">
          <input 
            type="password" 
            id="${this.options.id}"
            class="password-field ${this.options.className}"
            placeholder="${this.options.placeholder}"
            autocomplete="${this.options.autocomplete}"
          >
          <button type="button" class="password-toggle" aria-label="Toggle password visibility">
            <span class="password-toggle-icon">👁️</span>
          </button>
        </div>
        <div class="password-error hidden"></div>
      </div>
    `
  }

  private setupEventListeners(): void {
    const input = this.getInput()
    const toggleButton = this.container.querySelector('.password-toggle') as HTMLButtonElement
    const icon = this.container.querySelector('.password-toggle-icon') as HTMLSpanElement

    if (!input || !toggleButton || !icon) return

    // Toggle password visibility
    toggleButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      this.isPasswordVisible = !this.isPasswordVisible
      
      if (this.isPasswordVisible) {
        input.type = 'text'
        icon.textContent = '🙈'
        toggleButton.setAttribute('aria-label', 'Hide password')
      } else {
        input.type = 'password'
        icon.textContent = '👁️'
        toggleButton.setAttribute('aria-label', 'Show password')
      }
    })

    // Prevent form submission on Enter in password field if needed
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // Dispatch custom event that parent components can listen for
        const enterEvent = new CustomEvent('passwordEnter', {
          detail: { value: input.value }
        })
        this.container.dispatchEvent(enterEvent)
      }
    })
  }

  // Public API methods
  public getValue(): string {
    const input = this.getInput()
    return input ? input.value : ''
  }

  public setValue(value: string): void {
    const input = this.getInput()
    if (input) input.value = value
  }

  public focus(): void {
    const input = this.getInput()
    if (input) input.focus()
  }

  public clear(): void {
    const input = this.getInput()
    if (input) input.value = ''
  }

  public showError(message: string): void {
    const errorElement = this.container.querySelector('.password-error')
    if (errorElement) {
      errorElement.textContent = message
      errorElement.classList.remove('hidden')
    }
  }

  public clearError(): void {
    const errorElement = this.container.querySelector('.password-error')
    if (errorElement) {
      errorElement.textContent = ''
      errorElement.classList.add('hidden')
    }
  }

  public setRequired(required: boolean): void {
    this.options.required = required
    const requiredSpan = this.container.querySelector('.required')
    if (required && !requiredSpan && this.options.label) {
      const label = this.container.querySelector('.password-label')
      if (label) {
        label.innerHTML = `${this.options.label} <span class="required">*</span>`
      }
    } else if (!required && requiredSpan) {
      requiredSpan.remove()
    }
  }

  public addEventListener(event: string, handler: EventListener): void {
    const input = this.getInput()
    if (input) {
      input.addEventListener(event, handler)
    }
  }

  public removeEventListener(event: string, handler: EventListener): void {
    const input = this.getInput()
    if (input) {
      input.removeEventListener(event, handler)
    }
  }

  private getInput(): HTMLInputElement | null {
    return this.container.querySelector(`#${this.options.id}`) as HTMLInputElement
  }

  // Method to handle validation state
  public setValidationState(isValid: boolean, message?: string): void {
    const wrapper = this.container.querySelector('.password-input-wrapper')
    
    if (wrapper) {
      wrapper.classList.remove('error', 'valid')
      
      if (isValid === false) {
        wrapper.classList.add('error')
        if (message) this.showError(message)
      } else if (isValid === true) {
        wrapper.classList.add('valid')
        this.clearError()
      }
    }
  }
}