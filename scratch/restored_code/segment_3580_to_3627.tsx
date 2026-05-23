               Bên A cung cấp vật tư xây dựng cho bên B phục vụ cho các công trình như sau:
             </p>
             <div className="pl-4 mt-2">
               <InlineField tag="BANGGIATRIHOPDONG" value={getVal('BANGGIATRIHOPDONG')} onChange={(v) => setVal('BANGGIATRIHOPDONG', v)} placeholder="Nhập bảng hoặc nội dung danh mục vật tư..." className="w-full min-h-[50px] block" />
             <InlineField tag="MST_A" value={getVal('MST_A')} onChange={(v) => setVal('MST_A', v)} placeholder="Mã số thuế..." />
           </div>
           <p className="pl-4">
             <span className="font-bold">Đại diện: </span>
             <InlineField tag="GIOITINH_A" type="select" options={['Ông', 'Bà']} value={getVal('GIOITINH_A')} onChange={(v) => setVal('GIOITINH_A', v)} placeholder="Ông/Bà" />
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG</h4>
             <InlineField tag="DAI_DIEN_A" value={getVal('DAI_DIEN_A')} onChange={(v) => setVal('DAI_DIEN_A', v)} placeholder="Họ tên đại diện Bên A..." />
               - Tổng giá trị hợp đồng là: <InlineField tag="GIATRIHOPDONG" value={getVal('GIATRIHOPDONG')} onChange={(v) => setVal('GIATRIHOPDONG', v)} placeholder="Nhập giá trị hợp đồng..." isCurrency onOpenSelector={() => { setActiveInvoiceTag?.('GIATRIHOPDONG'); setIsInvoiceSelectorOpen?.(true); }} /> <span className="font-bold">đ</span> (đã bao gồm thuế GTGT).
             <InlineField tag="CHUC_VU_A" value={getVal('CHUC_VU_A') || getVal('CHUCVU_A')} onChange={(v) => { setVal('CHUC_VU_A', v); setVal('CHUCVU_A', v); }} placeholder="Chức vụ..." />
             <p className="pl-4 italic mt-1">
               (Bằng chữ: <InlineField tag="BANGCHUGIATRI" value={getVal('BANGCHUGIATRI')} onChange={(v) => setVal('BANGCHUGIATRI', v)} placeholder="Nhập số tiền bằng chữ..." className="w-[80%]" onOpenSelector={() => { setActiveInvoiceTag?.('BANGCHUGIATRI'); setIsInvoiceSelectorOpen?.(true); }} />).
             <span className="font-bold">Số tài khoản: </span>
             <InlineField tag="STK_A" value={getVal('STK_A')} onChange={(v) => setVal('STK_A', v)} placeholder="Số tài khoản ngân hàng..." />
             <span className="ml-4 font-bold">Tại ngân hàng: </span>
             <InlineField tag="NH_A" value={getVal('NH_A') || getVal('NGAN_HANG_A')} onChange={(v) => { setVal('NH_A', v); setVal('NGAN_HANG_A', v); }} placeholder="Tên ngân hàng..." />
             <p className="pl-4 mt-1">
               - Giá trị thực tế tại công trường là giá trị thanh quyết toán.
             </p>
           </div>
 
           {/* Article 3 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 3: THỜI GIAN THỰC HIỆN HỢP ĐỒNG</h4>
             <p className="pl-4 mt-1">Thời gian thực hiện: kể từ ký hợp đồng.</p>
           </div>
 
           {/* Article 4 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 4: PHƯƠNG THỨC NGHIỆM THU KHỐI LƯỢNG</h4>
             <p className="pl-4 mt-1">
               Căn cứ vào khối lượng bàn giao vật tư thực tế tại công trình, Bên A và Bên B đo đạc, lập Biên bản xác nhận khối lượng vật tư để làm cơ sở thanh toán.
             </p>
           </div>
 
           {/* Article 5 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 5: PHƯƠNG THỨC THANH TOÁN</h4>
             <p className="pl-4 mt-1">Thanh toán bằng chuyển khoản.</p>
             <p className="pl-4 mt-1">
               Căn cứ vào Biên bản xác nhận khối lượng vật tư, Bên B xuất hóa đơn cho bên A và bên A sẽ thanh toán cho bên B 100% giá trị trong vòng 240 ngày kể từ ngày hai bên đối chiếu và xác nhận công nợ.
             </p>
           </div>
 
  