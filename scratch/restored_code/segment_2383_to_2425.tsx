   const d = new Date(dateStr);
   if (isNaN(d.getTime())) return dateStr;
   const day = d.getDate().toString().padStart(2, '0');
   const month = (d.getMonth() + 1).toString().padStart(2, '0');
   const year = d.getFullYear();
   return `ngày ${day} tháng ${month} năm ${year}`;
 };
 
 const InlineField: React.FC<{
   tag: string;
   value: string;
   onChange: (val: string) => void;
   placeholder?: string;
   type?: 'text' | 'date' | 'select';
   options?: string[];
   onOpenSelector?: () => void;
   isCurrency?: boolean;
   className?: string;
 }> = ({ tag, value, onChange, placeholder, type = 'text', options = [], onOpenSelector, isCurrency, className }) => {
   const [isFocused, setIsFocused] = useState(false);
   const friendlyLabel = placeholder || getFriendlyLabel(tag);
 
   const displayValue = value || friendlyLabel;
   const isPlaceholder = !value;
   
   // Calculate character width dynamically
   const charWidth = 7.5;
   const inputWidth = Math.max(displayValue.length * charWidth + (type === 'select' ? 20 : 12), 45);
 
   return (
     <span
       className={cn(
         "inline-flex items-center relative rounded transition-all duration-200 align-baseline mx-0.5 px-1 py-0.5",
         isFocused
           ? "bg-blue-100/90 ring-1 ring-blue-400 text-blue-950"
           : isPlaceholder
             ? "bg-amber-50/40 text-amber-600/70 border-b border-dashed border-amber-400 hover:bg-amber-100/40 hover:text-amber-700 cursor-pointer"
             : "text-blue-900 font-bold bg-blue-50/40 border-b border-blue-400 hover:bg-blue-100/30 hover:text-blue-950 cursor-pointer",
         className
       )}
     >
       {type === 'select' ? (
         <select