                   <div className="size-8 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-black text-sm shadow-md">3</div>
                   <div>
                     <h3 className="font-black text-xs text-white tracking-tight">Soạn thảo văn bản trực quan</h3>
                     <p className="text-[9px] text-text-dim uppercase tracking-wider">Mô phỏng tài liệu in ấn thực tế (A4 layout)</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">
                   <Check className="size-3" /> Auto-Save
                 </div>
               </div>
 
               {/* A4 Workspace */}
               <div className="flex-1 overflow-y-auto bg-stone-900/60 p-4 md:p-6 custom-scrollbar flex flex-col justify-start">
                 {selectedTemplate === 'GDNTT' ? renderGdnDocument() : renderContractDocument()}
               </div>
 
               {/* Footer */}
               <div className="bg-card-dark border-t border-border-dark p-2 flex items-center justify-between text-[9px] text-text-dim">
                  <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                    <ShieldCheck className="size-3 text-emerald-500" /> Hệ thống bảo mật
                  </div>
                  <div className="italic">Dữ liệu trống mặc định: <span className="text-primary font-bold">"............"</span></div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 };
                 )}
               </div>
 
 const PartnersView = ({ partners, onEdit, onBatchEdit, onDelete }: { 
               <div className="bg-card-dark border-t border-border-dark p-2 flex items-center justify-between text-[9px] text-text-dim">
                  <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                    <ShieldCheck className="size-3 text-emerald-500" /> Hệ thống bảo mật
   onDelete: (id: string) => void 
                  <div className="italic">Dữ liệu trống mặc định: <span className="text-primary">"............"</span></div>
   const { toast } = useToast();
   const [searchTerm, setSearchTerm] = useState('');
   const [showAddressTool, setShowAddressTool] = useState(false);
   const [convInput, setConvInput] = useState('');
   const [convResult, setConvResult] = useState<any>(null);
     </div>
   // State cho Context Menu
   const [contextMenu, setContextMenu] = useState<{ x: number, y: number, partner: Partner | null } | null>(null);
 
 const PartnersView = ({ partners, onEdit, onBatchEdit, onDelete }: { 
     p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    <ShieldCheck className="size-3 text-emerald-500" /> Hệ thống bảo mật
     (p.representative && p.representative.toLowerCase().includes(searchTerm.toLowerCase()))
                  <div className="italic">Dữ liệu trống mặc định: <span className="text-primary">"............"</span></div>
               </div>
   const handleContextMenu = (e: React.MouseEvent, partner: Partner) => {
   const [searchTerm, setSearchTerm] = useState('');
     setContextMenu({ x: e.clientX, y: e.clientY, partner });
       </div>
     </div>
   const closeContextMenu = () => setContextMenu(null);
 };
   const handleConvert = (val: string) => {
 const PartnersView = ({ partners, onEdit, onBatchEdit, onDelete }: { 
     if (val.trim().length > 5) {
       setConvResult(smartConvertAddress(val));
   onBatchEdit: () => void,
   onDelete: (id: string) => void 
 }) => {
   const { toast } = useToast();
   const [searchTerm, setSearchTerm] = useState('');
   const [showAddressTool, setShowAddressTool] = useState(false);
     <div className="space-y-4" onClick={closeContextMenu}>
       <div className="flex justify-between items-center bg-card-dark p-4 px-5 rounded-2xl border border-border-dark shadow-2xl">
         <div className="flex items-center gap-3">
           <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
   const [contextMenu, setContextMenu] = useState<{ x: number, y: number, partner: Partner | null } | null>(null);
           </div>
   const filteredPartners = partners.filter(p => 
             <h2 className="text-base font-black text-white tracking-tighter uppercase">Đối tác & Khách hàng</h2>
             <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] mt-0.5">
     (p.representative && p.representative.toLowerCase().includes(searchTerm.toLowerCase()))
   );
 
   const handleContextMenu = (e: React.MouseEvent, partner: Partner) => {
     e.preventDefault();
     setContextMenu({ x: e.clientX, y: e.clientY, partner });
   };
 
   const closeContextMenu = () => setContextMenu(null);
 
   const handleConvert = (val: string) => {
     setConvInput(val);
     if (val.trim().length > 5) {
       setConvResult(smartConvertAddress(val));
     } else {
       setConvResult(null);
     }
   };
 
   return (
     <div className="space-y-6" onClick={closeContextMenu}>
       <div className="flex justify-between items-center bg-card-dark p-4 px-5 rounded-2xl border border-border-dark shadow-2xl">
         <div className="flex items-center gap-4">
           <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
             <Users className="size-4.5 text-primary" />
           </div>
           <div>
             <h2 className="text-base font-black text-white tracking-tighter uppercase">Đối tác & Khách hàng</h2>
             <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] mt-0.5">
               {partners.length} Công ty liên kết
             </div>
           </div>
         </div>
         <div className="flex items-center gap-4">
           <div className="relative">
             <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
             <input 
               type="text" 
               placeholder="Tìm kiếm đối tác..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-11 pr-4 py-2.5 bg-sidebar-dark border border-border-dark rounded-2xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all w-72 text-white placeholder:text-text-dim"
             />
           </div>
           <div className="w-px h-8 bg-border-dark" />
           <button 
             onClick={() => setShowAddressTool(!showAddressTool)}
             className={cn(
               "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm",
               - Giá trị trên là giá trị tạm tính.
               ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
               : "bg-white/5 border-border-dark text-text-dim hover:text-white hover:bg-white/10"
               - Giá trị thực tế tại công trường là giá trị thanh quyết toán.
             </p>
             <MapPin className="size-4" />
             AI Address
           {/* Article 3 */}
           <button 
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 3: THỜI GIAN THỰC HIỆN HỢP ĐỒNG</h4>
             <p className="pl-4 mt-1">Thời gian thực hiện: kể từ ký hợp đồng.</p>
           </div>
             <Plus className="size-4" />
           {/* Article 4 */}
           </button>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 4: PHƯƠNG THỨC NGHIỆM THU KHỐI LƯỢNG</h4>
             <p className="pl-4 mt-1">
               Căn cứ vào khối lượng thực tế thi công tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận ca máy để làm cơ sở thanh toán.
             </p>
             <Edit2 className="size-4" />
             CHỈNH SỬA
           {/* Article 5 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 5: PHƯƠNG THỨC THANH TOÁN</h4>
             <p className="pl-4 mt-1">Thanh toán bằng chuyển khoản.</p>
       {/* Address Converter Tool - 3 Parts Output */}
               Căn cứ vào Biên bản xác nhận ca máy, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.
         {showAddressTool && (
           <motion.div 
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: 'auto', opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 6: TRÁCH NHIỆM CỦA CÁC BÊN</h4>
             <div className="pl-4 mt-1 space-y-2">
             <div className="card p-8 bg-sidebar-dark border-border-dark shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                 <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-gray-700 text-[11px] text-justify">
                   <li>Bố trí mặt bằng, địa hình tốt để máy hoạt động đảm bảo an toàn;</li>
                   <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                   <li>Thanh toán tiền thuê máy đúng hạn và tuân thủ các điều khoản của hợp đồng;</li>
                   <li>Xác lập lập Biên bản xác nhận ca máy thực tế để làm cơ sở thanh toán;</li>
                   <li>Cam kết sử dụ
                     <h3 className="text-base font-black text-white uppercase tracking-widest">Chuyển đổi địa chỉ 2 cấp</h3>
                     <p className="text-text-dim text-[8px] font-bold uppercase tracking-widest mt-0.5">Chuẩn hóa dữ liệu theo nghị định mới nhất 2025</p>
                   </div>
                 </div>
               </div>
 
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                   <div cla
                   <textarea 
                     value={convInput}
                     onChange={(e) => handleConvert(e.target.value)}
                     placeholder="Ví dụ: Ấp 5, Phạm Văn Hai, Bình Chánh, TP.HCM..."
                     className="w-full px-4 py-4 bg-white/5 border border-border-dark rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[120px] resize-none text-white"
                   />
                 </div>
 
                 <div className="space-y-4">
                   <div className="text-[10px] font-black text-text-dim uppercase tracking-widest px-1">Phân tách thông minh (Real-time)</div>
                   {convResult ? (
                     <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                           <div className="text-[9px] font-bold text-text-dim uppercase mb-2">1. Xã/Phường gốc</div>
                           <div className="text-sm font-black text-white">{convResult.oldWard}</div>
                         </div>
                         <div className="p-4 bg-white/5 border border-border-dark rounded-2xl">
                           <div className="text-[9px] font-bold text-text-dim uppercase mb-2">2. Địa chỉ cũ (3 cấp)</div>
                           <div className="text-[11px] font-bold text-text-dim leading-relaxed truncate" title={convResult.oldFullAddress || `${convResult.detail ? convResult.detail + ', ' : ''}${convResult.oldWard}, ${convResult.oldDistrict}, ${convResult.province}`}>
                             {convResult.oldFullAddress || `${convResult.detail ? convResult.detail + ', ' : ''}${convResult.oldWard}, ${convResult.oldDistrict}, ${convResult.province}`}
                           </div>
                         </div>
                       </div>
 
                       <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl shadow-lg relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-10">
                           <CheckCircle2 className="size-16 text-orange-500" />
               <tr className="bg-white/5 border-b border-white/10">
                         <div className="text-[9px] font-black text-orange-500 uppercase mb-2 tracking-widest">3. Kết quả đã chuyển đổi (Sang 2 cấp)</div>
                         <div className="text-base font-black text-white mb-3 leading-relaxed">{convResult.fullAddress}</div>
                     <Building2 className="size-3.5 opacity-70" /> Thông tin công ty
                           <div className={cn(
                             "rounded px-2 py-1 text-[10px] font-bold border uppercase tracking-tighter",
                             convResult.isConverted ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-text-dim border-border-dark"
                   <div className="flex items-center gap-1.5">
                             {convResult.isConverted ? "Khớp bảng ánh xạ 2025" : "Chưa có dữ liệu chính xác"}
                           </div>
                         </div>
                 <th className="px-5 py-4 text-[10px] font-black text-primary uppercase tracking-[0.25em] w-[15%]">
                   <div className="flex items-center gap-1.5">
               Hợp đồng được lập thành 4 bản có giá trị như nhau, Bên A giữ 02 bản, bên B giữ 02 bản và có giá trị pháp lý như nhau.
                     <div className="h-40 border-2 border-dashed border-border-dark rounded-2xl flex flex-col items-center justify-center text-text-dim gap-2">
                       <MapPin className="size-8 opacity-20" />
                       <div className="text-xs font-bold uppercase tracking-widest opacity-40">Chờ nhập dữ liệu…</div>
                     </div>
         {/* Signatures */}
         <div className="grid grid-cols-2 gap-4 text-center font-bold mt-12 font-serif text-[10.5px]">
               </div>
             ĐẠI DIỆN BÊN A
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAIDIENBENA') || '....................'}</div>
       </AnimatePresence>
           <div>
       <div className="card overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-white/10 bg-card-dark/80 backdrop-blur-xl rounded-[40px]">
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAIDIENBENB') || '....................'}</div>
                       <Users className="size-12 text-white" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Chưa có dữ liệu đối tác</p>
                 <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[22%]">
                   <div className="flex items-center gap-2">
                     <Building2 className="size-4 opacity-70" /> Thông tin công ty
                   </div>
                 filteredPartners.map((partner) => (
                 <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[35%]">
     if (selectedTemplate === 'HDTC') return renderHDTCDocument();
                     <MapPin className="size-4 opacity-70" /> Địa chỉ liên hệ
                     className="hover:bg-primary/5 transition-all duration-300 group relative"
   };('TEN_CONGTRINH', v); setVal('TENCONGTRINH', v); }} placeholder="Nhập tên công trình..." className="w-[80%]" onOpenSelector={() => { setAct
                 <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[15%]">
                       <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     <CreditCard className="size-3.5 opacity-70" /> Tài khoản thanh toán
                         <div className="font-bold text-white group-hover:text-primary transition-colors text-xs tracking-tight leading-tight mb-1.5">
                           {partner.name}
                 <th className="px-8 py-6 text-[11px] font-black text-primary uppercase tracking-[0.25em] w-[18%]">
                         <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md group-hover:border-primary/30 transition-all">
                     <UserCheck className="size-3.5 opacity-70" /> Đại diện pháp luật
                           <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">MST: {partner.taxCode}</span>
                         </div>
                 <th className="py-4 pl-5 pr-[40px] text-[10px] font-black text-primary uppercase tracking-[0.25em] text-right w-[10%]">Hành động</th>
                     </td>
             </thead>
             <tbody className="divide-y divide-white/5">
                       <div className="space-y-2 max-w-md">
             - Bằng chữ: <InlineField tag="BANGCHUGIATRI" value={getVal('BANGCHUGIATRI')} onChange={(v) => setVal('BANGCHUGIATRI', v)} placeholder="Nhập giá trị hợp đồng bằng chữ..." className="w-[80%]" onOpenSelector={() => { setActiveInvoiceTag?.('BANGCHUGIATRI'); setIsInvoiceSelectorOpen?.(true); }} />
                           <div className="shrink-0 size-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-primary/20 transition-all">
       <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
                       <Users className="size-12 text-white" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Chưa có dữ liệu đối tác</p>
         <div className="grid grid-cols-2 gap-4 text-center font-bold mt-12 font-serif text-[10.5px]">
             Tạo Hợp Đồng Chuyên Nghiệp
             ĐẠI DIỆN BÊN A
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAI_DIEN_A') || '....................'}</div>
         <div className="flex items-center gap-2">
                             <div className="shrink-0 size-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                               <MapPin className="size-3 text-primary" />
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAI_DIEN_B') || '....................'}</div>
                               <span className="text-[8px] font-black text-primary/60 uppercase block mb-0.5 tracking-widest">Địa chỉ mới (2025)</span>
                               {partner.addressPostMerger}
                             </div>
                           </div>
                   'HDCM': {},
                   'GDNTT': {}
                     </td>
     <div className="flex flex-col h-full gap-1">
                     <td className="px-5 py-5">
       <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
                         <div className="flex items-center gap-1.5 text-white font-black text-xs group-hover:text-primary transition-colors">
           <h2 className="text-lg font-bold text-white flex items-center gap-2">
                           {partner.accountNumber || '---'}
             className="px-3 py-1.5 text-xs font-medium text-text-dim hover:bg-white/5 hover:text-white rounded-lg transition-colors border border-border-dark"
                         <div className="text-[9px] text-text-dim uppercase font-black tracking-widest leading-tight pl-4 opacity-60">
                           {partner.bankName || '---'}
                         </div>
           {selectedTemplate && (
                     </td>
               onClick={handleGenerate}
                     <td className="px-5 py-5 whitespace-nowrap">
               className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                         <div className="flex items-center gap-2">
                           <div className="size-7 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-primary/30 transition-all">
                             <UserIcon className="size-3.5 text-text-dim group-hover:text-primary" />
                           </div>
                           <div>
                             <div className="text-white font-black text-xs flex items-center gap-1">
                               <span className="text-primary/60">
                                 {(() => {
                                   const g = partner.gender?.toLowerCase();
                                   if (g === 'nam' || g === 'm' || g === 'male' || g === 'ông') return 'Ông.';
                                   if (g === 'nữ' || g === 'f' || g === 'female' || g === 'bà') return 'Bà.';
                          </div>
                     </td>
       </div>ve || '---'}
                             </div>
                             <div className="text-[10px] text-text-dim font-black uppercase mt-1 italic tracking-wider opacity-60">
                               {partner.position || 'Giám đốc'}
                             </div>
                           </div>
                           </div>
                             </div>
                             <div className="text-[10px] text-text-dim font-black uppercase mt-1 italic tracking-wider opacity-60">
                               {partner.position || 'Giám đốc'}
                     <td className="py-6 pl-8 pr-[60px] text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                       <div className="flex justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                       ? "bg-primary/10 border-primary/50 shadow-sm" 
                           className="size-11 bg-white/5 border border-white/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl active:scale-90"
                           className="size-11 bg-white/5 border border-white/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl active:scale-90"
                       <div className="flex flex-col gap-1.5">
                         <div className="flex items-center gap-2.5">
                           <div className="size-9 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-primary/30 transition-all">
                             <UserIcon className="size-4 text-text-dim group-hover:text-primary" />
                        selectedTemplate === t.id ? "bg-primary text-white border-primary" : "bg-white/5 text-text-dim group-hover:bg-primary/10 group-hover:text-primary border-border-dark"
                             e.stopPropagation();
                             <div className="text-white font-black text-sm flex items-center gap-1.5">
                               <span className="text-primary/60">
                     <div className="flex flex-col">
                           className="size-11 bg-red-500/5 border border-red-500/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-90"
                           className="size-11 bg-red-500/5 border border-red-500/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-90"
                                   if (g === 'nữ' || g === 'f' || g === 'female' || g === 'bà') return 'Bà.';
                           <Trash2 className="size-4" />
                           <Trash2 className="size-3.5" />
                     <div className="size-4 bg-primary rounded-full flex items-center justify-center">
                               {partner.representative || '---'}
                           title="Xóa đối tác"
                             <div className="text-[10px] text-text-dim font-black uppercase mt-1 italic tracking-wider opacity-60">
                               {partner.position || 'Giám đốc'}
                             </div>
                           </div>
                         </div>
                       </div>
       </div> {partner.representative || '---'}
       {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
                             <div className="text-[10px] text-text-dim font-black uppercase mt-1 italic tracking-wider opacity-60">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                             </div>
                           onClick={() => onEdit(partner)}
                           className="size-11 bg-white/5 border border-white/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl active:scale-90"
       {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
             className="fixed z-[9999] bg-card-dark border border-border-dark shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
             className="fixed z-[9999] bg-card-dark border border-border-dark shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
                     <td className="py-6 pl-8 pr-[60px] text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="px-3 py-1.5 border-b border-border-dark mb-1">
               <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
                           className="size-11 bg-white/5 border border-white/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl active:scale-90"
             style={{ left: contextMenu.x, top: contextMenu.y }}
             onClick={(e) => e.stopPropagation()}
                           className="size-11 bg-red-500/5 border border-red-500/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-90"
             <div className="px-3 py-1.5 border-b border-border-dark mb-1">
               <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
                 if (contextMenu.partner) onEdit(contextMenu.partner);
                             e.stopPropagation();
               className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
               className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
               onClick={() => {
                           className="size-11 bg-red-500/5 border border-red-500/10 text-text-dim rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-90"
                           title="Xóa đối tác"
                         >
                           <Trash2 className="size-4" />
                         </button>
                       </div>
                     </td>
       {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
                 ))
               )}
             </tbody>
           </table>
         </div>
       </div>
 
       {/* Context Menu Thật sự - Được gắn vào body hoặc container riêng để tránh bị cắt bởi table overflow */}
             onClick={(e) => e.stopPropagation()}
         {contextMenu && (
             <div className="px-3 py-1.5 border-b border-border-dark mb-1">
               <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="fixed z-[9999] bg-card-dark border border-border-dark shadow-2xl rounded-xl py-2 w-44 overflow-hidden"
             style={{ left: contextMenu.x, top: contextMenu.y }}
             onClick={(e) => e.stopPropagation()}
                 if (contextMenu.partner) onEdit(contextMenu.partner);
             <div className="px-3 py-1.5 border-b border-border-dark mb-1">
               <div className="text-[9px] font-bold text-text-dim uppercase truncate" title={contextMenu.partner?.name}>
               className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
               </div>
               <Edit2 className="size-4" />
               Chỉnh sửa
               onClick={() => {
                 if (contextMenu.partner) onEdit(contextMenu.partner);
                 closeContextMenu();
                 if (contextMenu.partner) {
               className="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex items-center gap-3 transition-colors font-medium"
                     onDelete(contextMenu.partner.id);
               <Edit2 className="size-4" />
               Chỉnh sửa
                 closeContextMenu();
             <button 
               className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors font-medium"
             >
               <Trash2 className="size-4" />
               Xóa đối tác
             </button>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 };