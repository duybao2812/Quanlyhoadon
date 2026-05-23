               const r = data.classification;
               const t = typeof r === 'object' ? r.type : (r || 'BB_VT');
               switch(t) {
                 case 'BB_VT': return 'Vật tư';
                 case 'BB_CM': return 'Ca máy';
                 case 'BB_TC': return 'Thi công';
                 default: return t;
               }
             })(),
             'Tên tệp': inv.fileName
           };
         });
 
       const worksheet = XLSX.utils.json_to_sheet(excelData);
       const workbook = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách hóa đơn");
       
       // Auto-size columns
       const maxWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: 20 }));
       worksheet['!cols'] = maxWidths;
 
       XLSX.writeFile(workbook, `Danh_sach_hoa_don_${new Date().getTime()}.xlsx`);
       toast("Đã xuất file Excel thành công", "success");
     } catch (err) {
       console.error("Excel export error:", err);
       toast("Lỗi khi xuất file Excel", "error");
     } finally {
       setIsExportingExcel(false);
     }
   };
 
   const stats = {
     pending: invoices.filter(i => i.status === 'processing').length,
     partners: partners.length,
     invoices: invoices.length,
     recentInvoices: invoices
   };
 
   return (
     <div className="flex h-screen w-full fo