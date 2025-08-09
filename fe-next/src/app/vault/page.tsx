import VaultList from "@/component/VaultList";
export default function VaultPage() {
  return (
    <div className="flex justify-center items-center bg-[#12184d] h-screen">
      {/* VaultBox */}

      <div className="bg-white/40 p-10 rounded-xl min-w-2/3">
        <VaultList />
      </div>
    </div>
  );
}
