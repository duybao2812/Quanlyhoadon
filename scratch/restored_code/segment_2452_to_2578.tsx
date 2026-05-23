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
             >
               <Layers className="size-3 text-blue-800" />
             </button>
           )}
         </span>
       )}
     </span>
   );
 };
 
 const GDNTableInputWordLike: React.FC<GDNTableInputProps> = ({ value, onChange }) => {
   const rows: GdnRow[] = useMemo(() => {
     try {
       if (value) {
         const parsed = JSON.parse(value);
         if (Array.isArray(parsed) && parsed.length > 0) {
           return parsed;
         }
       }
     } catch (e) {}
     return [{ stt: "1", noidung: "", donvi: "Đồng", giatri: "" }];
   }, [value]);
 
   const updateRows = (newRows: GdnRow[]) => {
     onChange(JSON.stringify(newRows));
   };
 
   const handleCellChange = (index: number, field: keyof GdnRow, val: string) => {
     const next = [...rows];
     if (field === 'giatri') {
       const rawDigits = val.replace(/\D/g, '');
       next[index][field] = rawDigits;
     } else {
       next[index][field] = val;
     }
     updateRows(next);
   };
 
   const handleAddRow = () => {
     const nextIndex = rows.length + 1;
     const next = [
       ...rows,
       { stt: nextIndex.toString(), noidung: "", donvi: rows[0]?.donvi || "Đồng", giatri: "" }
     ];
     updateRows(next);
   };
 
   const handleRemoveRow = (index: number) => {
     if (rows.length <= 1) {
       updateRows([{ stt: "1", noidung: "", donvi: "Đồng", giatri: "" }]);
       return;
     }
     const filtered = rows.filter((_, i) => i !== index);
     const next = filtered.map((row, i) => ({
       ...row,
       stt: (i + 1).toString()
     }));
     updateRows(next);
   };
 
   const grandTotal = useMemo(() => {
     return rows.reduce((sum, row) => {
       const num = parseInt(row.giatri, 10) || 0;
       return sum + num;
     }, 0);
   }, [rows]);
 
   return (
     <div className="w-full my-4 font-serif text-[#1a1a1a]">
       <table className="w-full text-[11px] border-collapse border border-black">
         <thead>
           <tr className="bg-gray-100 border border-black">
             <th className="border border-black px-2 py-1.5 text-center font-bold uppercase w-12">STT</th>
             <th className="border border-black px-2 py-1.5 text-left font-bold uppercase">Nội dung đề nghị</th>
             <th className="border border-black px-2 py-1.5 text-center font-bold uppercase w-20">Đơn vị</th>
             <th className="border border-black px-2 py-1.5 text-right font-bold uppercase w-32">Số tiền</th>
             <th className="border-0 px-2 py-1.5 text-center w-10 bg-white"></th>
           </tr>
         </thead>
         <tbody>
           {rows.map((row, idx) => (
             <tr key={idx} className="border border-black group/row">
               <td className="border border-black px-2 py-1 text-center font-bold font-mono">
                 <input
                   type="text"
                   value={row.stt}
                   onChange={(e) => handleCellChange(idx, 'stt', e.target.value)}
                   className="w-full text-center bg-transparent bo