/**
 * Loader Component - Animated Dot Loader
 * 
 * A reusable animated loader with 5 scaling dots and customizable text.
 */

export class Loader {
  private container: HTMLElement
  private text: string

  constructor(container: HTMLElement, text: string = 'Loading...') {
    this.container = container
    this.text = text
  }

  render(): void {
    console.log('🔄 Loader rendering with text:', this.text)
    
    this.container.innerHTML = `
      <div class="loader-container">
        <div class="loader">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <div class="loader-text">${this.text}</div>
      </div>
    `
    
    console.log('✅ Loader HTML injected into container')
  }

  updateText(newText: string): void {
    this.text = newText
    const textEl = this.container.querySelector('.loader-text')
    if (textEl) {
      textEl.textContent = newText
    }
  }

  destroy(): void {
    this.container.innerHTML = ''
  }
}