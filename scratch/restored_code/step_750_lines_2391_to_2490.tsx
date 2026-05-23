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
             <input
               type="date"
               className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-125"
               onChange={(e) => {
                 if (e.target.value) {
                   onChange(formatVietnameseDateGlobal(e.target.value));
                 }
               }}
             />
           </span>
         </span>
       ) : (
         <span className="inline-flex items-center gap-0.5 align-baseline">
           <input
             type="text"
             value={isCurrency && value ? parseInt(value.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : value}
             placeholder={friendlyLabel}
             onChange={(e) => {
               const val = e.target.value;
               if (isCurrency) {
                 onChange(val.replace(/\D/g, ''));
               } else {
                 onChange(val);
               }
             }}
             onFocus={() => setIsFocused(true)}
             onBlur={() => setIsFocused(false)}
             className="bg-transparent border-none p-0 font-bold text-xs text-blue-900 focus:ring-0 focus:outline-none outline-none font-serif leading-none h-auto min-h-0"
             style={{ width: `${inputWidth}px` }}
           />
           {onOpenSelector && (
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 onOpenSelector();
               }}
               className="opacity-30 hover:opacity-100 transition-opacity p-0.5 self-center"
               title="Bóc tách từ hóa đơn"