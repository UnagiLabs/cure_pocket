export interface WalletService {
  connect(): Promise<string>; // returns walletAddress
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getAddress(): string | null;
}

class WalletServiceImpl implements WalletService {
  private address: string | null = null;

  async connect(): Promise<string> {
    // MVP: Mock implementation
    // TODO: integrate Sui dApp Kit or real wallet connection
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate a demo wallet address
    const demoAddress = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;
    this.address = demoAddress;

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('walletAddress', demoAddress);
    }

    return demoAddress;
  }

  async disconnect(): Promise<void> {
    this.address = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletAddress');
    }
  }

  isConnected(): boolean {
    return this.address !== null;
  }

  getAddress(): string | null {
    // Try to restore from localStorage if not in memory
    if (!this.address && typeof window !== 'undefined') {
      this.address = localStorage.getItem('walletAddress');
    }
    return this.address;
  }

  // Restore wallet connection from localStorage on page load
  restore(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('walletAddress');
      if (stored) {
        this.address = stored;
      }
    }
  }
}

export const walletService = new WalletServiceImpl();
