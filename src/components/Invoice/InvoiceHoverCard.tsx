import React from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { InvoiceItem } from '../../types/invoiceData';
import { InvoiceCardContent } from './InvoiceCardContent';

interface Props {
  invoice: InvoiceItem;
  children: React.ReactNode;
  onGenerateDoc?: (invoice: InvoiceItem) => void;
}

export const InvoiceHoverCard: React.FC<Props> = ({ invoice, children, onGenerateDoc }) => {
  return (
    <HoverCard.Root openDelay={150} closeDelay={100}>
      <HoverCard.Trigger asChild>
        {children}
      </HoverCard.Trigger>
      
      <HoverCard.Portal>
        <HoverCard.Content 
          side="right"
          sideOffset={5}
          className="z-[9999] bg-[#1e1e1e] shadow-2xl shadow-black/50 border border-white/10 rounded-2xl overflow-hidden p-1 backdrop-blur-xl"
        >
          <InvoiceCardContent invoice={invoice} onGenerateDoc={onGenerateDoc} />
          <HoverCard.Arrow className="fill-[#1e1e1e]" height={10} width={20} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};
