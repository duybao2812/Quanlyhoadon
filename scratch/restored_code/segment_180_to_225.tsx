         if (!isPinned && isHovered) {
           setIsHovered(false);
         }
       }
     };
     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [isPinned, isHovered]);
 
   const menuItems = [
     { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển' },
     { id: 'upload', icon: UploadCloud, label: 'Tải lên hóa đơn' },
     { id: 'partners', icon: Users, label: 'Đối tác' },
     { id: 'contract', icon: PlusSquare, label: 'Tạo hợp đồng' },
     { id: 'templates', icon: FileText, label: 'Mẫu tài liệu' },
     { id: 'docs', icon: Files, label: 'Tài liệu đã tạo' },
   ];
 
   const { addToast } = useToast();
 
   const handleLogin = async () => {
     try {
       console.log("Starting Google login...");
       const { error } = await supabase.auth.signInWithOAuth({
         provider: 'google',
         options: {
           queryParams: {
             prompt: 'select_account',
           },
           redirectTo: window.location.origin
         }
       });
       if (error) throw error;
     } catch (error: any) {
       console.error("Login failed:", error);
       addToast(`Lỗi đăng nhập: ${error.message}`, "error");
     }
   };
 
   const handleLogout = async () => {
     try {
       const { error } = await supabase.auth.signOut();
       if (error) throw error;
     } catch (error) {
       console.error("Logout failed:", error);
     }