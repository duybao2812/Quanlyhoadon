           onSave={finalizeInvoice}
         />
       )}
 
       <Sidebar 
         activeTab={activeTab} 
                 <Plus className="size-4" />
                 <span>Bắt đầu lượt mới</span>
         isPinned={isSidebarPinned} 
         setIsPinned={setIsSidebarPinned} 
             <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shadow-inner">
               {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "GA"}
       <main className="flex-1 flex flex-col h-full overflow-hidden">
         <header className="h-[64px] bg-sidebar-dark border-b border-border-dark flex items-center justify-between px-6 shrink-0 shadow-sm">
           <div className="flex items-center gap-2 text-text-dim text-sm italic">
             <span>DocuForge AI</span>
             <span className="text-text-dim/50">/</span>
             <span className="text-white font-bold not-italic uppercase text-xs">
               {activeTab === 'dashboard' && !selectedInvoice && (
                 <div className="zoom-125">
                   case 'dashboard': return 'Bảng điều khiển';
                   case 'upload': return 'Tải lên hóa đơn';
                     onSelectInvoice={handleInvoiceSelect} 
                   case 'templates': return 'Mẫu tài liệu';
                     onExportExcel={exportInvoicesToExcel}
                     onBulkExport={() => setShowBulkExport(true)}
                     isExportingExcel={isExportingExcel}
                     isLoadingData={isLoadingInvoices}
                     subTab={dashboardSubTab}
                     onSubTabChange={handleDashboardSubTabChange}
           <div className="flex items-center gap-4">
             <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-border-dark gap-1">
                     invoices={invoices}
                 onClick={() => handleTabChange('upload')}
                 className="btn-primary py-1.5"
               >
                 <Plus className="size-4" />
                 <span>Bắt đầu lượt mới</span>
               </button>
             </div>
             <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shadow-inner">
               {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "GA"}
             </div>
           </div>
         </header>
 
         <div className="flex-1 p-4 overflow-y-auto">
           <div className="h-full">
               {activeTab === 'dashboard' && !selectedInvoice && (
                   {/* Left Panel: Extracted Source */}
                   <div className="col-span-4 flex flex-col card h-full">
                     <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                       <h3 className="font-bold text-sm text-white truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                     onDeleteInvoice={handleDeleteInvoice}
                         onClick={() => handleInvoiceSelect(null)}
                         className="text-xs text-text-dim hover:text-white"
                     isExportingExcel={isExportingExcel}
                     isLoadingData={isLoadingInvoices}
                   onSubTabChange={handleDashboardSubTabChange}
                     onSubTabChange={handleDashboardSubTabChange}
                     <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
                     contracts={contracts}
                         const rawT = selectedInvoice.extractedData?.classification;
                         const tType = typeof rawT === 'object' ? rawT.type : (rawT || 'BB_CM');
                         const isCM = tType.includes('CM');
                     onBulkDeleteDocs={handleBulkDeleteDocs}
                         const isTC = tType.includes('TC');
                         const isSwapped = isVT || isCM || isTC;
                   onBulkDeleteContracts={handleBulkDeleteContracts}
                         let labelSeller = isSwapped ? "Người bán (Bên B)" : "Người bán (Bên A)";
                         let labelBuyer = isSwapped ? "Người mua (Bên A)" : "Người mua (Bên B)";
                   rankMap={rankMap}
                     rankMap={rankMap}
                           labelSeller = "Bên cho thuê (Bên B)";
               {activeTab === 'dashboard' && selectedInvoice && (
                 <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
               {activeTab === 'dashboard' && selectedInvoice && (
                 <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
                     <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                       <h3 className="font-bold text-sm text-white truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                     <div className="p-4 border-b border-border-dark flex justify-between items-center bg-sidebar-dark">
                       <h3 className="font-bold text-sm text-white truncate mr-2">Nguồn: {selectedInvoice.fileName}</h3>
                         className="text-xs text-text-dim hover:text-white"
                         onClick={() => handleInvoiceSelect(null)}
                         className="text-xs text-text-dim hover:text-white"
                       </button>
                         Quay lại
                       </button>
                     </div>
                     <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
                     <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
                         const rawT = selectedInvoice.extractedData?.classification;
                         const tType = typeof rawT === 'object' ? rawT.type : (rawT || 'BB_CM');
                         const tType = typeof rawT === 'object' ? rawT.type : (rawT || 'BB_CM');
                         const isVT = tType.includes('VT');
                         const isTC = tType.includes('TC');
                         const isSwapped = isVT || isCM || isTC;
                         const isSwapped = isVT || isCM || isTC;
                         let labelSeller = isSwapped ? "Người bán (Bên B)" : "Người bán (Bên A)";
                         let labelSeller = isSwapped ? "Người bán (Bên B)" : "Người bán (Bên A)";
                         let labelBuyer = isSwapped ? "Người mua (Bên A)" : "Người mua (Bên B)";
                         
                         if (isCM) {
                           labelSeller = "Bên cho thuê (Bên B)";
                           labelBuyer = "Bên thuê (Bên A)";
                         } else if (isTC) {
                           labelSeller = "Người nhận thầu (Bên B)";
                           labelBuyer = "Người giao thầu (Bên A)";
                         }
 
                         const sellerSection = (
                             <label className="text-sm text-primary font-black uppercase block mb-2">
                             <label className="text-sm text-primary font-black uppercase block mb-2">
                               {labelSeller}
                             <div className="text-xl font-semibold text-white leading-tight tracking-tight">{selectedInvoice.extractedData?.seller?.name}</div>
                             <div className="text-base font-bold text-white mt-2 bg-primary/20 px-3 py-1 rounded-lg w-fit border border-primary/30">MST: {selectedInvoice.extractedData?.seller?.taxCode}</div>
                           </div>
                         );
 
                         const buyerSection = (
                           <div key="buyer">
                             <label className="text-sm text-emerald-500 font-black uppercase block mb-2">
                               {labelBuyer}
                             </label>
                             <div className="text-xl font-semibold text-white leading-tight tracking-tight">{selectedInvoice.extractedData?.buyer?.name}</div>
                             <div className="text-base font-bold text-white mt-2 bg-emerald-500/10 px-3 py-1 rounded-lg w-fit border border-emerald-500/20">MST: {selectedInvoice.extractedData?.buyer?.taxCode}</div>
                           </div>
                         );
 
                         return (
                           <>
                             {isSwapped ? [buyerSection, sellerSection] : [sellerSection, buyerSection]}
                           </>
                         );
                       })()}
                       