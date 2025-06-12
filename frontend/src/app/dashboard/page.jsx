import VaultList from "../../component/VaultList";
import ContractAlterScroll from "../../component/VaultScroll";


export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">

      <div className="flex flex-col items-center justify-center flex-1 bg-primary/10 relative overflow-hidden">
      <div className="w-2/3 rounded-2xl bg-white/45 p-12">
        <h1 className="text-4xl font-bold mb-4 relative z-10">Vault Content</h1>
        <VaultList />
      </div>
      </div>
    </div>
  );
}
