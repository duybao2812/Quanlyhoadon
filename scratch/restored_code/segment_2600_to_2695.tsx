             placeholder={`Nhập ${friendlyLabel.toLowerCase()}...`}
             rows={value && value.length > 50 ? 3 : (isWords ? 2 : 1)}
             onInput={(e) => {
               const target = e.target as HTMLTextAreaElement;
               target.style.height = 'auto';
               target.style.height = target.scrollHeight + 'px';
             }}
           />
         </div>
       )}
                   onClick={() => handleRemoveRow(idx)}
                   className="opacity-0 group-hover/row:opacity-100 p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-all"
                   title="Xóa dòng"
                 >
                   <Trash2 className="size-3" />
                 </button>
               </td>
             </tr>
   setFormData, 
           <tr className="border border-black font-bold bg-gray-50">
             <td colSpan={2} className="border border-black px-3 py-2 text-center uppercase text-[10px]">
               Tổng số tiền đề nghị thanh toán / tạm ứng
   selectedPartyAId, 
             <td className="border border-black px-3 py-2 text-center text-[10px]">
               {rows[0]?.donvi || 'Đồng'}
             </td>
             <td className="border border-black px-3 py-2 text-right font-mono text-[11px] text-emerald-800 font-black">
               {grandTotal.toLocaleString('vi-VN')}
   hideWrapperStyle
             <td className="border-0 bg-white"></td>
           </tr>
         </tbody>
     value={formData[tag] || ''} 
       <div className="mt-2 text-left">
     onChange={(val) => handleFieldChange(tag, val)}
     hideWrapperStyle={hideWrapperStyle}
           onClick={handleAddRow}
           className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors active:scale-95"
       setIsInvoiceSelectorOpen?.(true);
           <Plus className="size-3" /> THÊM DÒNG MỚI
     onAutoFill={(party) => {
       const partnerId = party === 'A' ? selectedPartyAId : selectedPartyBId;
       const partner = partners.find(p => p.id === partnerId);
       if (partner) {
         const upperTag = tag.toUpperCase();
         let val = '';
         if (upperTag.includes('DIA_CHI') || upperTag.includes('DIACHI')) {
           val = getEffectiveAddressByCurrentDate(partner);
         } else {
           val = abbreviateCompanyName(partner.name);
   contractForm,
         setFormData((p: Record<string, string>) => ({ ...p, [tag]: val }));
         setVtLinks((p: any) => ({ ...p, [tag]: party }));
         toast(`Đã cập nhật ${getFriendlyLabel(tag)} từ Bên ${party}`, "success");
   setActiveInvoiceTag,
         toast(`Vui lòng chọn đối tác Bên ${party} trước`, "error");
       }
   partners: Partner[], 
   user: User | null,
   contractForm: {
     selectedTemplate: string;
 const ContractView = ({ 
     templateFormData: Record<string, Record<string, string>>;
     selectedPartyAId: string;
     selectedPartyBId: string;
     templateBuffer: ArrayBuffer | null;
     vtLinks: Record<string, 'A' | 'B' | null>;
   setIsInvoiceSelectorOpen,
   updateContractForm: (updates: any) => void,
   onContractSaved: (contractData: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>,
   setIsInvoiceSelectorOpen?: (open: boolean) => void,
   setActiveInvoiceTag?: (tag: string | null) => void,
   handleFieldChange: (tag: string, val: string) => void
   contractForm: {
   const { toast } = useToast();
   const dayRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const monthRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const yearRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const { selectedTemplate, tags, templateFormData, selectedPartyAId, selectedPartyBId, templateBuffer, vtLinks } = contractForm;
     templateBuffer: ArrayBuffer | null;
     vtLinks: Record<string, 'A' | 'B' | null>;
   const formData = useMemo(() => templateFormData[selectedTemplate] || {}, [templateFormData, selectedTemplate]);
   updateContractForm: (updates: any) => void,
   onContractSaved: (contractData: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>,
   setIsInvoiceSelectorOpen?: (open: boolean) => void,
   setActiveInvoiceTag?: (tag: string | null) => void,
   handleFieldChange: (tag: string, val: string) => void
 }) => {
   const { toast } = useToast();
   const dayRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const monthRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const yearRefs = useRef<Record<string, HTMLInputElement | null>>({});
   const { selectedTemplate, tags, templateFormData, selectedPartyAId, selectedPartyBId, templateBuffer, vtLinks } = contractForm;
   
   // Use data for current template
   const formData = useMemo(() => templateFormData[selectedTemplate] || {}, [templateFormData, selectedTemplate]);