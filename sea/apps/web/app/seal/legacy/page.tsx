import { Navigation } from '@/components/Navigation';
import { WillListDisplay } from './_components/heirview';

export default function Dashboard() {
    return (
      <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
        <Navigation />
        <WillListDisplay/>
      </div>
    ); 
  }