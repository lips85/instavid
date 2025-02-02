import ScriptGenerator from '@/components/ScriptGenerator';
import MusicSelector from '@/components/MusicSelector';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <ScriptGenerator />
      <MusicSelector />
    </div>
  );
} 