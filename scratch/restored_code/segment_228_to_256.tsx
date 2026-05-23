   return (
     <motion.aside 
       ref={sidebarRef}
       animate={{ width: isExpanded ? 256 : 80 }}
       transition={{ duration: 0.15, ease: "easeOut" }}
       onMouseEnter={() => !isPinned && setIsHovered(true)}
       onMouseLeave={() => !isPinned && setIsHovered(false)}
       className="bg-sidebar-dark text-text-dim flex flex-col h-full shrink-0 relative z-50 shadow-2xl transition-width duration-150 border-r border-border-dark"
     >
       <button 
         onClick={(e) => {
           e.stopPropagation();
           setIsPinned(!isPinned);
         }}
         className="absolute -right-3 top-20 size-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-primary-hover transition-colors"
       >
         {isPinned ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
       </button>
 
       <div className={cn(
         "border-b border-border-dark flex items-center transition-all duration-300", 
         !isExpanded ? "p-4 justify-center" : "p-6 justify-between"
       )}>
         <div className="flex items-center gap-3 overflow-hidden shrink-0">
           <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xl shadow-inner border border-primary/20 shrink-0 aspect-square">AX</div>
           {isExpanded && (
             <motion.span 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity