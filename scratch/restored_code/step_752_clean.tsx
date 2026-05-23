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
 