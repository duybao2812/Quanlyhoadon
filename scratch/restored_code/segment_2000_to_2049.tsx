   <w:tblGrid>
     ${columns.map(c => `<w:gridCol w:w="${c.width}"/>`).join('')}
   </w:tblGrid>
   ${headerRowXml}
   ${dataRowsXml}
   ${totalRowXml}
 </w:tbl>`;
 };
 
 interface GDNTableInputProps {
   value: string;
   onChange: (val: string) => void;
 }
 
 const GDNTableInput: React.FC<GDNTableInputProps> = ({ value, onChange }) => {
   const rows: GdnRow[] = useMemo(() => {
     try {
       if (value) {
         const parsed = JSON.parse(value);
         if (Array.isArray(parsed) && parsed.length > 0) {
           return parsed;
         }
       }
     } catch (e) {
       // Ignore
     }
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
     ]