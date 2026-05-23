import React from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { InvoiceItem } from '../../types/invoiceData';
import { InvoiceCardContent } from './InvoiceCardContent';

interface Props {
  invoice: InvoiceItem;
  children: React.ReactNode;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  onGenerateDoc?: (invoice: InvoiceItem) => void;
}

export const InvoiceResponsiveCard: React.FC<Props> = ({ invoice, children, placement = 'right', onGenerateDoc }) => {
  return (
    <HoverCard.Root openDelay={150} closeDelay={100}>
      <HoverCard.Trigger asChild>
        {children}
      </HoverCard.Trigger>
      
      <HoverCard.Portal>
        <HoverCard.Content 
          side={placement}
          sideOffset={5}
          className="z-[9999] bg-card-dark shadow-2xl border border-border-dark rounded-3xl overflow-hidden p-1 backdrop-blur-md"
        >
          <div className="bg-card-dark text-white max-h-[85vh] overflow-y-auto custom-scrollbar">
            <InvoiceCardContent invoice={invoice} onGenerateDoc={onGenerateDoc} />
          </div>
          <HoverCard.Arrow className="fill-card-dark stroke-border-dark" height={8} width={16} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};
