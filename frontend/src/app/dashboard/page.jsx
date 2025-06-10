import VaultList from "../../component/VaultList";
import ContractAlterScroll from "../../component/VaultScroll";
import WaveEffect from "../../component/WaveEffect";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary/30 relative overflow-hidden">
      <WaveEffect isBackground={true} showInstructions={false} />
      <h1 className="text-4xl font-bold mb-4 relative z-10">Vault Content</h1>
      <VaultList />
    </div>
  );
}