import ContractAlter from "../../component/ContractAlter";
import ContractAlterScroll from "../../component/VaultScroll"
export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary">
      <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
      <p className="text-lg">Welcome to the Dashboard!</p>
      <p className="text-lg">This is where you can manage your account and settings.</p>
      <ContractAlter />
    </div>
  ); 
}