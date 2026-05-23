                                 <td className="border border-border-dark p-2 text-right font-bold text-white table-cell">{amount > 0 ? formatVNNumber(amount) : '0'}</td>
                               </tr>
                             );
                           })}
                           <tr className="bg-white/5 font-bold">
                             <td colSpan={5} className="border border-border-dark p-2 text-right uppercase text-[10px] tracking-wider text-white">Tổng cộng</td>
                             <td className="border border-border-dark p-2 text-right text-white">{formatVNNumber(selectedInvoice.extractedData?.totals?.subtotal)}</td>
                           </tr>
                                 const rate = selectedInvoice.extractedData?.invoice?.vatRate;
                             <td colSpan={5} className="border border-border-dark p-2 text-right italic text-[10px]">
                                 const sub = selectedInvoice.extractedData?.totals?.subtotal;
                                 const total = selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total;
                                 const total = selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total;
                                 if (sub > 0 && total > 0) return Math.round((Math.abs(total - sub) / sub) * 100);
                                 const total = selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total;
                                 if (sub > 0 && total > 0) return Math.round((Math.abs(total - sub) / sub) * 100);
                             <td className="border border-border-dark p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                             <td className="border border-border-dark p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                             <td className="border border-border-dark p-2 text-right">{formatVNNumber(selectedInvoice.extractedData?.totals?.vatAmount)}</td>
                             <td colSpan={5} className="border border-border-dark p-2 text-right text-xs uppercase tracking-tight">Thành tiền (Sau thuế)</td>
                             <td className="border border-border-dark p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                             <td className="border border-border-dark p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                             <td className="border border-border-dark p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                             <td className="border border-border-dark p-2 text-right text-xs">{formatVNNumber(selectedInvoice.extractedData?.totals?.grandTotal || selectedInvoice.extractedData?.totals?.grand_total)}</td>
                         </tbody>
                     { id: 'BB_CM', label: 'Biên bản Ca Máy', icon: HardHat, desc: 'Dành cho các hóa đơn thuê máy móc, thiết bị.' },
                     { id: 'BB_VT', label: 'Biên bản Vật Tư', icon: Box, desc: 'Dành cho các hóa đơn mua bán vật tư, hàng hóa.' },
                     { id: 'BB_TC', label: 'Biên bản Thi Công', icon: Construction, desc: 'Dành cho các hóa đơn dịch vụ xây dựng, lắp đặt.' },
               {activeTab === 'upload' && (
                     const isAvailableOnServer = availableTemplates.includes(t.id);
                     const isAvailableLocally = localTemplates.some(lt => lt.id === t.id);
                   queue={uploadQueue}
                   rejectedFiles={rejectedFiles}
                       <div key={t.id} className="card p-8 flex flex-col items-center text-center group relative overflow-hidden transition-all hover:translate-y-[-4px]">
                         <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                         {isAvailableLocally && !isAvailableOnServer && (
                           <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-500/10 text-orang
                   processingStatus={processingStatus}
                   onRemoveRejected={removeRejectedFile}
                   processingStatus={processingStatus}
                   isProcessing={isProcessing}
                   processingStatus={processingStatus}
               {activeTab === 'partners' && (
                   onEdit={(p) => handlePartnerEditSelect(p)} 
                   onBatchEdit={handleBatchPartnerEditStart}
                   onEdit={(p) => handlePartnerEditSelect(p)} 
                   onBatchEdit={handleBatchPartnerEditStart}
                   onDelete={handleDeletePartner} 
                   onBatchEdit={handleBatchPartnerEditStart}
                   onDelete={handleDeletePartner} 
               {activeTab === 'templates' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {activeTab === 'templates' && (
                     { id: 'BB_CM', label: 'Biên bản Ca Máy', icon: HardHat, desc: 'Dành cho các hóa đơn thuê máy móc, thiết bị.' },
                     { id: 'BB_VT', label: 'Biên bản Vật Tư', icon: Box, desc: 'Dành cho các hóa đơn mua bán vật tư, hàng hóa.' },
                     { id: 'BB_TC', label: 'Biên bản Thi Công', icon: Construction, desc: 'Dành cho các hóa đơn dịch vụ xây dựng, lắp đặt.' },
                     { id: 'BB_VT', label: 'Biên bản Vật Tư', icon: Box, desc: 'Dành cho các hóa đơn mua bán vật tư, hàng hóa.' },
                     { id: 'BB_TC', label: 'Biên bản Thi Công', icon: Construction, desc: 'Dành cho các hóa đơn dịch vụ xây dựng, lắp đặt.' },
                     const isAvailableLocally = localTemplates.some(lt => lt.id === t.id);
                     const isAvailableOnServer = availableTemplates.includes(t.id);
                     const isAvailableLocally = localTemplates.some(lt => lt.id === t.id);
                       <div key={t.id} className="card p-8 flex flex-col items-center text-center group relative overflow-hidden transition-all hover:translate-y-[-4px]">
                         <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                       <div key={t.id} className="card p-5 rounded-2xl flex flex-col items-center text-center group relative overflow-hidden transition-all hover:translate-y-[-4px]">
                           <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-500/10 text-orange-500 text-[8px] font-black px-2 py-1 uppercase rounded-lg border border-orange-500/20 animate-pulse">
                         {isAvailableLocally && !isAvailableOnServer && (
                           <div className="absolute top-3 right-3 flex items-center gap-1 bg-orange-500/10 text-orange-500 text-[8px] font-black px-1.5 py-0.5 uppercase rounded-lg border border-orange-500/20 animate-pulse">
                             <Zap className="size-2" />
                             Cần khôi phục