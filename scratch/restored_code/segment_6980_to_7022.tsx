                               contractDate: selectedInvoice.contractDate
                             });
 
                             const url = window.URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`;
                             a.click();
 
                             await supabase.from('generated_docs').insert({
                               invoice_id: selectedInvoice.id,
                               template_type: tType,
                               file_name: `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`,
                               owner_id: user.uid
                             });
                           } catch (err: any) {
                             alert(err.message || "Generation failed.");
                           } finally {
                             setIsProcessing(false);
                           }
                         }}
                         className="btn-primary"
                       >
                         {isProcessing ? 'Đang tạo...' : 'Tạo docx'}
                       </button>
                     </div>
                     <div className="flex-1 overflow-auto p-4">
                       <table className="w-full border-collapse border border-border-dark text-[11px]">
                         <thead>
                           <tr className="bg-sidebar-dark font-bold text-text-dim">
                             <th className="border border-border-dark p-2 w-8">Stt</th>
                             <th className="border border-border-dark p-2 text-left">Nội dung hàng hóa/dịch vụ</th>
                             <th className="border border-border-dark p-2">ĐVT</th>
                             <th className="border border-border-dark p-2">SL</th>
                             <th className="border border-border-dark p-2">Đơn giá</th>
                             <th className="border border-border-dark p-2 text-right">Thành tiền</th>
                           </tr>
                         </thead>
                         <tbody>
                           {selectedInvoice.extractedData?.items?.map((item: any, i: number) => {
                             const qty = parseFloat(item.quantity) || 0;
                             const price = parseFloat(item.unitPrice) || 0;
                             const 