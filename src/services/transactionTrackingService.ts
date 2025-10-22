import axios, { AxiosInstance } from 'axios';

export interface TxBasicInfo {
  id: string;
  chain: string;
  from_address: string;
  to_address: string;
  coins: Array<{
    asset: string;
    amount: string;
  }>;
  gas: Array<{
    asset: string;
    amount: string;
  }>;
  memo: string;
  status: string;
  in_hash: string;
  out_hashes: string[];
  keysign_metric?: {
    tx_id: string;
    node_tss_times: any[];
  };
}

export interface TxDetails {
  tx: TxBasicInfo;
  actions: Array<{
    date: string;
    height: string;
    in: Array<{
      address: string;
      coins: Array<{
        asset: string;
        amount: string;
      }>;
      txID: string;
    }>;
    out: Array<{
      address: string;
      coins: Array<{
        asset: string;
        amount: string;
      }>;
      height: string;
      txID: string;
    }>;
    metadata: {
      swap: {
        memo: string;
        networkFees: Array<{
          asset: string;
          amount: string;
        }>;
        swapSlip: string;
        swapTarget: string;
      };
    };
    pools: string[];
    status: string;
    type: string;
  }>;
}

export interface TxStageInfo {
  started: boolean;
  final_count: number;
  completed: boolean;
}

export interface TxStages {
  stages: {
    inbound_observed: TxStageInfo;
    inbound_confirmation_counted?: TxStageInfo;
    inbound_finalised?: TxStageInfo;
    swap_status?: TxStageInfo;
    swap_finalised?: TxStageInfo;
    outbound_delay?: TxStageInfo;
    outbound_signed?: TxStageInfo;
  };
}


export class TransactionTrackingService {
  private api: AxiosInstance;

  constructor(baseUrl: string = 'https://thornode.ninerealms.com') {
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get basic transaction information
   */
  public async getTx(hash: string): Promise<TxBasicInfo> {
    try {
      const response = await this.api.get(`/thorchain/tx/${hash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw new Error(`Failed to fetch transaction ${hash}`);
    }
  }

  /**
   * Get detailed transaction information with actions
   */
  public async getTxDetails(hash: string): Promise<TxDetails> {
    try {
      const response = await this.api.get(`/thorchain/tx/details/${hash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw new Error(`Failed to fetch transaction details for ${hash}`);
    }
  }

  /**
   * Get transaction processing stages
   */
  public async getTxStages(hash: string): Promise<TxStages> {
    try {
      const response = await this.api.get(`/thorchain/tx/stages/${hash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction stages:', error);
      throw new Error(`Failed to fetch transaction stages for ${hash}`);
    }
  }


  /**
   * Get formatted transaction status summary
   */
  public async getTransactionSummary(hash: string): Promise<{
    hash: string;
    status: string;
    stages: {
      name: string;
      started: boolean;
      completed: boolean;
      final_count: number;
      details?: string;
    }[];
    basicInfo?: TxBasicInfo;
    error?: string;
  }> {
    try {
      // Get stages from the correct endpoint
      const stages_data = await this.getTxStages(hash);
      
      // Try to get basic transaction info (optional, might not exist for all txs)
      let basicInfo: TxBasicInfo | undefined;
      try {
        basicInfo = await this.getTx(hash);
      } catch (e) {
        // Basic tx info not available, that's okay
        console.debug('Basic tx info not available for', hash);
      }

      const stages = [];
      
      // Inbound Observed (always present)
      if (stages_data.stages.inbound_observed) {
        stages.push({
          name: 'Inbound Observed',
          started: stages_data.stages.inbound_observed.started,
          completed: stages_data.stages.inbound_observed.completed,
          final_count: stages_data.stages.inbound_observed.final_count,
          details: stages_data.stages.inbound_observed.final_count > 0 
            ? `Confirmations: ${stages_data.stages.inbound_observed.final_count}` 
            : undefined
        });
      }

      // Inbound Confirmation Counted
      if (stages_data.stages.inbound_confirmation_counted) {
        stages.push({
          name: 'Inbound Confirmed',
          started: stages_data.stages.inbound_confirmation_counted.started,
          completed: stages_data.stages.inbound_confirmation_counted.completed,
          final_count: stages_data.stages.inbound_confirmation_counted.final_count
        });
      }

      // Inbound Finalized
      if (stages_data.stages.inbound_finalised) {
        stages.push({
          name: 'Inbound Finalized',
          started: stages_data.stages.inbound_finalised.started,
          completed: stages_data.stages.inbound_finalised.completed,
          final_count: stages_data.stages.inbound_finalised.final_count
        });
      }

      // Swap Status
      if (stages_data.stages.swap_status) {
        stages.push({
          name: 'Swap Processing',
          started: stages_data.stages.swap_status.started,
          completed: stages_data.stages.swap_status.completed,
          final_count: stages_data.stages.swap_status.final_count
        });
      }

      // Swap Finalized
      if (stages_data.stages.swap_finalised) {
        stages.push({
          name: 'Swap Finalized',
          started: stages_data.stages.swap_finalised.started,
          completed: stages_data.stages.swap_finalised.completed,
          final_count: stages_data.stages.swap_finalised.final_count
        });
      }

      // Outbound Delay
      if (stages_data.stages.outbound_delay) {
        stages.push({
          name: 'Outbound Delay',
          started: stages_data.stages.outbound_delay.started,
          completed: stages_data.stages.outbound_delay.completed,
          final_count: stages_data.stages.outbound_delay.final_count
        });
      }

      // Outbound Signed
      if (stages_data.stages.outbound_signed) {
        stages.push({
          name: 'Outbound Signed',
          started: stages_data.stages.outbound_signed.started,
          completed: stages_data.stages.outbound_signed.completed,
          final_count: stages_data.stages.outbound_signed.final_count
        });
      }

      // Determine overall status based on stages
      const allStagesCompleted = stages.every(stage => stage.completed);
      const anyStageStarted = stages.some(stage => stage.started);
      
      let overallStatus: string;
      if (allStagesCompleted) {
        overallStatus = 'completed';
      } else if (anyStageStarted) {
        overallStatus = 'processing';
      } else {
        overallStatus = 'pending';
      }

      return {
        hash,
        status: overallStatus,
        stages,
        basicInfo
      };

    } catch (error) {
      console.error('Error getting transaction summary:', error);
      return {
        hash,
        status: 'unknown',
        stages: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Poll transaction status until completion or timeout
   */
  public async pollTransactionStatus(
    hash: string, 
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<{
    hash: string;
    status: string;
    completed: boolean;
    stages: any[];
    attempts: number;
  }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const summary = await this.getTransactionSummary(hash);
        
        if (summary.error) {
          console.warn(`Attempt ${attempts}: ${summary.error}`);
        } else {
          const isCompleted = summary.stages.every(stage => stage.completed);
          
          if (isCompleted || summary.status === 'done') {
            return {
              hash,
              status: summary.status,
              completed: true,
              stages: summary.stages,
              attempts
            };
          }
        }

        // Wait before next attempt
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Max attempts reached
    const finalSummary = await this.getTransactionSummary(hash);
    return {
      hash,
      status: finalSummary.status,
      completed: false,
      stages: finalSummary.stages,
      attempts
    };
  }
}