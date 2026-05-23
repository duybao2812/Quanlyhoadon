                       <td className="p-4 text-right font-black text-primary bg-primary/5">
                         {formatVNNumber(item.amount || item.total)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
 
            </section>
           <section className="space-y-6 pt-8 border-t border-border-dark">
             <div className="flex items-center gap-3 text-primary mb-2">
               <PlusSquare className="size-7" />
               <h3 className="font-black text-lg uppercase tracking-[0.2em]">Tổng cộng quyết toán</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-sidebar-dark rounded-[32px] border border-border-dark shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 size-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
               <div>
                 <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Tổng cộng tiền hàng</label>
                 <div className="text-2xl font-black text-white">{formatVNNumber(edited.totals?.subtotal)} đ</div>
               </div>
               <div>
                 <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
                   Tiền thuế GTGT ({edited.invoice?.vatRate !== undefined ? edited.invoice.vatRate : (edited.totals?.subtotal > 0 ? Math.round((Math.abs((edited.totals?.grandTotal || (edited.totals?.subtotal + (edited.totals?.vatAmount || 0))) - edited.totals?.subtotal) / edited.totals?.subtotal) * 100) : 8)}%)
                 </label>
                 <div className="text-2xl font-black text-white">{formatVNNumber(edited.totals?.vatAmount)} đ</div>
               </div>
               <div>
                 <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2 px-3 border-l-2 border-primary">Tổng tiền thanh toán</label>
                 <div className="text-4xl font-black text-primary tracking-tighter drop-shadow-2xl">{formatVNNumber(edited.totals?.grandTotal)} đ</div>
               </div>
             </div>
           </section>
         </div>
 
         <div className="p-8 border-t border-border-dark bg-white/5 flex justify-end gap-4">
           <button onClick={onClose} className="btn-secondary px-8">
             HỦY BỎ
           </button>
           <button 
             onClick={() => onSave(edited)} 
             className="btn-primary min-w-[200px]"
           >
             <Check className="size-4" />
             LƯU VÀO HỆ THỐNG
           </button>
         </div>
       </motion.div>
     </div>
   );
 };
 
 const InvoiceItem: React.FC<InvoiceItemProps & { ref?: React.Ref<HTMLDivElement> }> = ({ inv, onSelectInvoice, onDeleteInvoice, displayName, displayDate, ref }) => (
   <div 
     ref={ref}
     onClick={() => onSelectInvoice(inv)}
     onContextMenu={(e) => {
       e.preventDefault();
       onDeleteInvoice(inv.id);
     }}
     className="flex items-center justify-between p-4 rounded-2xl border border-border-dark bg-card-dark hover:bg-white/5 transition-all cursor-pointer group shadow-lg"
   >
     <div className="flex items-center gap-4">
       <div className={cn(
         "size-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
         inv.fileType === 'xml' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
       )}>