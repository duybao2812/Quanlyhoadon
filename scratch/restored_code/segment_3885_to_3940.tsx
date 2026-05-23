                   <li>Thanh toán kinh phí cho bên B như Điều 5.</li>
                 </ul>
               </div>
               <div>
                 <p className="font-bold">- Trách nhiệm của Bên B:</p>
                 <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-gray-700 text-[11px] text-justify">
                   <li>Lập tiến độ và phương án tổ chức thi công gửi bên A sau 07 ngày để bên A theo dõi kiểm tra trong thi công;</li>
                   <li>Phối hợp cùng bên A nhận bàn giao mặt bằng thi công, quản lý thống nhất mặt bằng thi công sau khi được bàn giao;</li>
                   <li>Thi công theo đúng Hồ sơ thiết kế, chất lượng đúng quy trình quy phạm hiện hành;</li>
                   <li>Trong quá trình thi công phải đảm bảo vệ sinh môi trường chung, các vật liệu thừa phải thu dọn vận chuyển ngay đi nơi khác theo chỉ dẫn của tư vấn giám sát;</li>
                   <li>Chịu trách nhiệm về an toàn lao động, phòng chống cháy nổ, đảm bảo giao thông, an toàn giao thông trong suốt quá trình thi công tại công trường. Nếu để xảy ra sự cố bên B phải chịu xử lý theo luật định;</li>
                   <li>Cùng bên B lập Biên bản xác nhận khối lượng thi công thực tế để làm cơ sở thanh toán và thanh lý hợp đồng.</li>
                   <li>Xuất hóa đơn thuế GTGT cho bên A .</li>
                 </ul>
               </div>
             </div>
           </div>
 
           {/* Article 7 */}
           <div>
             <h4 className="font-bold uppercase text-[10px]">ĐIỀU 7: ĐIỀU KHOẢN KHÁC</h4>
             <p className="pl-4 mt-1">
               Hai bên cam kết thực hiện đúng các điều khoản đã thống nhất trong hợp đồng. Trong quá trình thực hiện hợp đồng nếu có gì vướng mắc, phát sinh hay thay đổi, hai bên chủ động gặp nhau bàn bạc giải quyết. Trong trường hợp không giải quyết được sẽ đưa ra tòa án Kinh tế có thẩm quyền để phân xử. Quyết định của tòa án là phán quyết cuối cùng.
             </p>
             <p className="pl-4 mt-1">
               Hợp đồng này có hiệu lực kể từ ngày ký và hết hiệu lực khi các bên đã thực hiện xong các điều khoản của hợp đồng. Sau khi các bên hoàn thành đầy đủ nghĩa vụ của mình theo thỏa thuận trong hợp đồng thì hợp đồng được xem như thanh lý .
             </p>
             <p className="pl-4 mt-1">
               Hợp đồng được lập thành 4 bản có giá trị như nhau, Bên A giữ 02 bản, bên B giữ 02 bản và có giá trị pháp lý như nhau.
             </p>
           </div>
         </div>
 
         {/* Signatures */}
         <div className="grid grid-cols-2 gap-4 text-center font-bold mt-12 font-serif text-[10.5px]">
           <div>
             ĐẠI DIỆN BÊN A
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAIDIENBENA') || '....................'}</div>
           </div>
           <div>
             ĐẠI DIỆN BÊN B
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAIDIENBENB') || '....................'}</div>
           </div>
         </div>
       </div>
     );
   };
 
   const renderHDCMDocument = () => {
     const getVal = (tag: string) => formData[tag] || '';
     const setVal = (tag: string, val: string) => handleFieldChange(tag, val);
 
     const contractNumber = getVal('SO_HOPDONG') || getVal('SO_HD') || getVal('SOHOPDONG') || getVal('SOHD');
     const setContractNumber = (v: string) => {