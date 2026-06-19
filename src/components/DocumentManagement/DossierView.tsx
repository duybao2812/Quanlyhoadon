import { useState } from 'react';
import { FileText, Download, Upload, FolderArchive, BarChart3, Search } from 'lucide-react';
import { IncomingDocumentsView } from './IncomingDocumentsView';
import { OutgoingDocumentsView } from './OutgoingDocumentsView';
import { ContractsView } from './ContractsView';
import { ArchivesView } from './ArchivesView';
import { StatisticsView } from './StatisticsView';
import { SearchPage } from './GlobalSearch';

type SubTab = 'incoming' | 'outgoing' | 'contracts' | 'archives' | 'document-stats' | 'search';

interface DossierViewProps {
  ownerId: string;
  partners: any[];
  onTabChange?: (tab: any) => void;
  onDownload?: any;
  onEditOcr?: any;
  defaultSubTab?: SubTab;
}

export function DossierView({ ownerId, partners, onTabChange, onDownload, onEditOcr, defaultSubTab = 'incoming' }: DossierViewProps) {
  const [subTab, setSubTab] = useState<SubTab>(defaultSubTab);

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'incoming', label: 'Văn bản đến', icon: Download },
    { id: 'outgoing', label: 'Văn bản đi', icon: Upload },
    { id: 'contracts', label: 'Hợp đồng', icon: FileText },
    { id: 'archives', label: 'Hồ sơ lưu trữ', icon: FolderArchive },
    { id: 'document-stats', label: 'Thống kê', icon: BarChart3 },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-dark pb-2 overflow-x-auto">
        {subTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              subTab === item.id
                ? 'bg-primary text-white shadow-lg'
                : 'text-text-dim hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      {subTab === 'incoming' && <IncomingDocumentsView ownerId={ownerId} />}
      {subTab === 'outgoing' && <OutgoingDocumentsView ownerId={ownerId} />}
      {subTab === 'contracts' && (
        <ContractsView
          ownerId={ownerId}
          partners={partners}
          onTabChange={onTabChange}
          onDownload={onDownload}
          onEditOcr={onEditOcr}
        />
      )}
      {subTab === 'archives' && <ArchivesView ownerId={ownerId} />}
      {subTab === 'document-stats' && <StatisticsView ownerId={ownerId} />}
      {subTab === 'search' && <SearchPage ownerId={ownerId} />}
    </div>
  );
}
