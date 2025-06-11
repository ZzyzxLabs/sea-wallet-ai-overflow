import VaultList from "../../component/VaultList";
import ContractAlterScroll from "../../component/VaultScroll";
import WaveEffect from "../../component/WaveEffect";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <WaveEffect className="relative -z-5"> </WaveEffect>
      <div className="flex flex-col items-center justify-center flex-1 bg-primary/10 relative overflow-hidden">
        <h1 className="text-4xl font-bold mb-4 relative z-10">Vault Content</h1>
        <VaultList />
      </div>
    </div>
  );
}
