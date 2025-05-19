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
    packageName: '0x2ce19738ec9d4e832abb2a09c1c0816bf487a7eaa226258280cd6b7234d82b65',
    setEmail: (email: string) => set({ email }),
    async createService(coinType, price, name, serviceAddr, yDiscount) {
        console.log("Create", coinType, price, name, serviceAddr, yDiscount);
        // Extract the base coin type without module::struct part
        const tx = new Transaction();
        tx.moveCall({
            target: `${get().packageName}::subscription::create_service`,
            arguments: [
                tx.pure.u64(price),
                tx.pure.string(name),
                tx.pure.string(coinType),
                tx.pure.address(serviceAddr),
                tx.pure.u8(yDiscount)
            ],
            typeArguments: [coinType],
        });
        return tx;
    }
}));