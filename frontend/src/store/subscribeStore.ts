import { create } from 'zustand';
import { Transaction } from '@mysten/sui/transactions';
import bcs from '@mysten/sui/bcs';
interface SubscribeState {
    email: string;
    packageName: string;
    setEmail: (email: string) => void;
    createService: (coinType: string, price: number, name: string, serviceAddr: string, yDiscount: number) => Promise<Transaction>;
}

export const useSubscribeStore = create<SubscribeState>((set, get) => ({
    email: '',
    packageName: '0x025fcbe4c2d5566fd28677e4d31f4e8bc51ff16d4cf4a740cad5f6014df02de6',
    setEmail: (email: string) => set({ email }),
    async createService(coinType, price, name, serviceAddr, yDiscount) {
        console.log("Create", coinType, price, name, serviceAddr, yDiscount);
        // Extract the base coin type without module::struct part
        const tx = new Transaction();
        tx.moveCall({
            target: `${get().packageName}::seaVault::createService`,
            arguments: [
                tx.pure.u64(price),
                tx.pure.string(name),
                tx.pure.address(serviceAddr),
                tx.pure.u8(yDiscount)
            ],
            typeArguments: [coinType],
        });
        return tx;
    }
}));