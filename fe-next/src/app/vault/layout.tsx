import Headerr from '../../component/Headerr';

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className=''>
      <Headerr />
      {children}
    </div>
  );
}
