// app/dashboard/components/DashboardFooter.tsx
export default function DashboardFooter() {
    return (
      <footer className="bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-600 text-sm">
        <div className="flex justify-center space-x-6">
          <a href="#" className="hover:text-blue-600">服務條款</a>
          <a href="#" className="hover:text-blue-600">隱私政策</a>
          <a href="#" className="hover:text-blue-600">支援</a>
        </div>
        <div className="mt-2">
          © {new Date().getFullYear()} SeaWallet Copyright Reserved 
        </div>
      </footer>
    );
  }