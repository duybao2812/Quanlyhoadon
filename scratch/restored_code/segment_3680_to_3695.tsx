             ĐẠI DIỆN BÊN B
             <div className="font-normal italic text-[8.5px] text-gray-500 mt-1">(Ký tên, đóng dấu)</div>
             <div className="mt-20 text-blue-900 font-bold">{getVal('DAI_DIEN_B') || '....................'}</div>
           </div>
         </div>
       </div>
     );
   };
 
   return (
     <div className="flex flex-col h-full gap-1">
       {/* Top Header Section */}
       <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between bg-card-dark p-2 rounded-2xl shadow-sm border border-border-dark">
         <div className="space-y-0 text-left">
           <h2 className="text-lg font-bold text-white flex items-center gap-2">
             <PlusSquare className="size-5 text-primary" />