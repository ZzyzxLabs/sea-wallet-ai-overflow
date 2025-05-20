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
    packageName: '0x44a617da633e13f2d366ae8480b88706c988707ffdf76eb3f8029016472afb8b',
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
    },
async subscribeTo(OwCap, Vault, service, is_year, coinType) {
    console.log("Subscribe", OwCap, Vault, service, is_year, coinType);
    const tx = new Transaction();
    tx.moveCall({
        target: `${get().packageName}::seaVault::subscribe`, // or ::sea_vault::subscribe if that's the actual module name
        arguments: [
            tx.object(OwCap),
            tx.object(Vault),
            tx.object(service),
            tx.pure.bool(is_year), // Pass boolean directly
        ],
        typeArguments: [coinType],
    });
    return tx;
}
}));