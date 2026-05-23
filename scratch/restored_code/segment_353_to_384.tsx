                 !isExpanded ? "p-3" : "py-3 px-4"
               )}
             >
               <Users className="size-5 shrink-0" />
               {isExpanded && <span className="ml-2">Đăng nhập</span>}
             </button>
             {!isExpanded && (
               <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-dark text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover/login:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/login:translate-x-0 z-[100] whitespace-nowrap border border-border-dark">
                 Đăng nhập Google
                 <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-sidebar-dark rotate-45 border-l border-b border-border-dark" />
               </div>
             )}
           </div>
         )}
         
         {isExpanded && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="mt-2"
           >
             <div className="text-[10px] text-text-dim uppercase font-bold mb-2 tracking-widest px-1">Hệ thống</div>
             <div className="flex items-center gap-2 text-xs text-white bg-sidebar-dark p-2 rounded-lg border border-border-dark">
               <div className={cn("size-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]", user ? "bg-green-500" : "bg-yellow-500")}></div>
               <span>{user ? "AI: Sẵn sàng" : "Đang chờ user"}</span>
             </div>
           </motion.div>
         )}
       </div>
     </motion.aside>
   );
 };