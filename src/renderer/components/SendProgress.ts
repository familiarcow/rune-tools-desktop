/**
 * SendProgress Component - Transaction Progress Display
 * 
 * Shows a simple animated loader during transaction processing.
 */

import { BackendService } from '../services/BackendService'
import { Loader } from './Loader'

export interface TransactionResponse {
  code: number
  transactionHash: string
  rawLog: string
  events: any[]
}

export class SendProgress {
  private container: HTMLElement
  private backend: BackendService
  private loader: Loader

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    this.loader = new Loader(container, 'Submitting...')
    
    console.log('🔧 SendProgress component created')
  }

  initialize(): void {
    console.log('📊 Initializing transaction progress with animated loader')
    
    // Render animated loader
    this.loader.render()
  }

  // Clean up
  destroy(): void {
    this.loader.destroy()
    console.log('🧹 SendProgress component destroyed')
  }
}