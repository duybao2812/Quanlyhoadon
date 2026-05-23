const fs = require('fs');
const file = 'src/App.tsx';

console.log('📖 Reading src/App.tsx...');
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// List of replacements
const replacements = [
  {
    name: 'handleUpdateInvoice',
    target: `  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {
    try {
        await updateDoc(doc(db, 'invoices', id), data);
    } catch (error) {
        console.error('Update error:', error);
    }
  }, []);`,
    replace: `  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {
    try {
        const mapped = mapInvoiceToSupabase(data);
        const { error } = await supabase.from('invoices').update(mapped).eq('id', id);
        if (error) throw error;
        if (user) fetchInvoices(user.uid);
    } catch (error) {
        console.error('Update error:', error);
    }
  }, [user]);`
  },
  {
    name: 'generateDoc metadata insertion',
    target: `        await addDoc(collection(db, 'generated_docs'), {
            invoiceId: inv.id,
            templateType: tType,
            fileName: \`\${tType}_\${inv.fileName.split('.')[0]}.docx\`,
            ownerId: user.uid,
            createdAt: serverTimestamp()
        }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));`,
    replace: `        const { error: genDocError } = await supabase.from('generated_docs').insert({
            invoice_id: inv.id,
            template_type: tType,
            file_name: \`\${tType}_\${inv.fileName.split('.')[0]}.docx\`,
            owner_id: user.uid,
            created_at: new Date().toISOString()
        });
        if (genDocError) throw genDocError;
        fetchGeneratedDocs(user.uid);`
  },
  {
    name: 'handleUpdatePartner',
    target: `  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    if (!user) return;
    try {
      if (id === 'new') {
         await addDoc(collection(db, 'partners'), cleanObject({
           ...updates,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp(),
           ownerId: user.uid
         }));
      } else {
         await updateDoc(doc(db, 'partners', id), cleanObject({
           ...updates,
           updatedAt: serverTimestamp()
         }));
      }
    } catch (error) {
      handleFirestoreError(error, id === 'new' ? OperationType.CREATE : OperationType.UPDATE, \`partners/\${id}\`);
    }
  };`,
    replace: `  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    if (!user) return;
    try {
      const mapped = cleanObject({
        name: updates.name,
        tax_code: updates.taxCode,
        address: updates.address,
        address_post_merger: updates.addressPostMerger,
        account_number: updates.accountNumber,
        bank_name: updates.bankName,
        representative: updates.representative,
        position: updates.position,
        gender: updates.gender,
        owner_id: user.uid,
        updated_at: new Date().toISOString()
      });

      if (id === 'new') {
        const { error } = await supabase.from('partners').insert({
          ...mapped,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partners').update(mapped).eq('id', id);
        if (error) throw error;
      }
      fetchPartners(user.uid);
    } catch (error: any) {
      console.error("Lỗi khi cập nhật đối tác:", error);
      toast("Lỗi khi cập nhật đối tác: " + error.message, "error");
    }
  };`
  },
  {
    name: 'handleDeletePartner',
    target: `  const handleDeletePartner = async (id: string) => {
    if (!user) return;
    console.log("handleDeletePartner called with id:", id);
    try {
      await deleteDoc(doc(db, 'partners', id));
      toast("Đã xóa đối tác thành công", "success");
    } catch (error) {
      console.error("Delete partner error:", error);
      handleFirestoreError(error, OperationType.DELETE, \`partners/\${id}\`);
      toast("Lỗi khi xóa đối tác", "error");
    }
  };`,
    replace: `  const handleDeletePartner = async (id: string) => {
    if (!user) return;
    console.log("handleDeletePartner called with id:", id);
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      toast("Đã xóa đối tác thành công", "success");
      fetchPartners(user.uid);
    } catch (error: any) {
      console.error("Delete partner error:", error);
      toast("Lỗi khi xóa đối tác: " + error.message, "error");
    }
  };`
  },
  {
    name: 'handleDeleteInvoice',
    target: `  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    console.log("handleDeleteInvoice called with id:", id);
    try {
      await deleteDoc(doc(db, 'invoices', id));
      console.log("Invoice deleted successfully");
    } catch (error) {
      console.error("Delete invoice error:", error);
      handleFirestoreError(error, OperationType.DELETE, \`invoices/\${id}\`);
    }
  };`,
    replace: `  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    console.log("handleDeleteInvoice called with id:", id);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      console.log("Invoice deleted successfully");
      fetchInvoices(user.uid);
    } catch (error: any) {
      console.error("Delete invoice error:", error);
      toast("Lỗi khi xóa hóa đơn: " + error.message, "error");
    }
  };`
  },
  {
    name: 'handleDeleteDoc',
    target: `  const handleDeleteDoc = async (id: string) => {
    console.log("Attempting to delete doc:", id);
    try {
      await deleteDoc(doc(db, 'generated_docs', id));
      toast('Đã xóa 1 tài liệu');
    } catch (error: any) {
      console.error("Delete doc error:", error);
      toast(\`Lỗi khi xóa tài liệu: \${error.message || 'Không xác định'}\`, 'error');
      try {
        handleFirestoreError(error, OperationType.DELETE, \`generated_docs/\${id}\`);
      } catch (err) {
        // Already handled error
      }
    }
  };`,
    replace: `  const handleDeleteDoc = async (id: string) => {
    if (!user) return;
    console.log("Attempting to delete doc:", id);
    try {
      const { error } = await supabase.from('generated_docs').delete().eq('id', id);
      if (error) throw error;
      toast('Đã xóa 1 tài liệu');
      fetchGeneratedDocs(user.uid);
    } catch (error: any) {
      console.error("Delete doc error:", error);
      toast(\`Lỗi khi xóa tài liệu: \${error.message || 'Không xác định'}\`, 'error');
    }
  };`
  },
  {
    name: 'handleBulkDeleteDocs',
    target: `  const handleBulkDeleteDocs = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    console.log("Attempting to bulk delete docs:", ids);
    try {
      setIsProcessing(true);
      // Fallback to individual deletes if batch is tricky, 
      // but let's keep batch first and see if individual error handling helps
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'generated_docs', id));
      });
      await batch.commit();
      toast(\`Đã xóa \${ids.length} tài liệu thành công\`);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast(\`Lỗi khi xóa hàng loạt: \${error.message || 'Không xác định'}\`, 'error');
      
      // If batch fails, try individual as fallback for debugging
      console.log("Trying individual deletes as fallback...");
      let successCount = 0;
      for (const id of ids) {
        try {
          await deleteDoc(doc(db, 'generated_docs', id));
          successCount++;
        } catch (e) {
          console.error(\`Failed to delete individual doc \${id}:\`, e);
        }
      }
      if (successCount > 0) {
        toast(\`Đã xóa thủ công được \${successCount}/\${ids.length} tài liệu\`);
      }
    } finally {
      setIsProcessing(false);
    }
  };`,
    replace: `  const handleBulkDeleteDocs = async (ids: string[]) => {
    if (!user || !ids || ids.length === 0) return;
    console.log("Attempting to bulk delete docs:", ids);
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('generated_docs').delete().in('id', ids);
      if (error) throw error;
      toast(\`Đã xóa \${ids.length} tài liệu thành công\`);
      fetchGeneratedDocs(user.uid);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast(\`Lỗi khi xóa hàng loạt: \${error.message || 'Không xác định'}\`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };`
  },
  {
    name: 'handleContractSave',
    target: `  const handleContractSave = async (data: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'contracts'), {
        ...data,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'contracts'));
    } catch (err: any) {
      toast("Lỗi khi lưu hợp đồng: " + err.message, "error");
    }
  };`,
    replace: `  const handleContractSave = async (data: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('contracts').insert({
        template_id: data.templateId,
        party_a_id: data.partyAId || null,
        party_b_id: data.partyBId || null,
        form_data: data.formData,
        file_name: data.fileName,
        owner_id: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      fetchContracts(user.uid);
    } catch (err: any) {
      console.error("Lỗi khi lưu hợp đồng:", err);
      toast("Lỗi khi lưu hợp đồng: " + err.message, "error");
    }
  };`
  },
  {
    name: 'handleDeleteContract',
    target: `  const handleDeleteContract = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;
    try {
      await deleteDoc(doc(db, 'contracts', id));
      toast("Đã xóa hợp đồng", "success");
    } catch (err: any) {
      toast("Lỗi khi xóa: " + err.message, "error");
    }
  };`,
    replace: `  const handleDeleteContract = async (id: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) return;
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      toast("Đã xóa hợp đồng", "success");
      fetchContracts(user.uid);
    } catch (err: any) {
      toast("Lỗi khi xóa hợp đồng: " + err.message, "error");
    }
  };`
  },
  {
    name: 'handleBulkDeleteContracts',
    target: `  const handleBulkDeleteContracts = async (ids: string[]) => {
    if (!confirm(\`Bạn có chắc muốn xóa \${ids.length} hợp đồng?\`)) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'contracts', id));
      });
      await batch.commit();
      toast(\`Đã xóa \${ids.length} hợp đồng\`, "success");
    } catch (err: any) {
      toast("Lỗi khi xóa hàng loạt: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };`,
    replace: `  const handleBulkDeleteContracts = async (ids: string[]) => {
    if (!user || !ids || ids.length === 0) return;
    if (!confirm(\`Bạn có chắc muốn xóa \${ids.length} hợp đồng?\`)) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('contracts').delete().in('id', ids);
      if (error) throw error;
      toast(\`Đã xóa \${ids.length} hợp đồng thành công\`, "success");
      fetchContracts(user.uid);
    } catch (err: any) {
      toast("Lỗi khi xóa hàng loạt: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };`
  },
  {
    name: 'upsertPartner',
    target: `  const upsertPartner = async (p: any, isPostMerger: boolean) => {
    if (!p || !p.taxCode || !user) return;
    const q = query(
      collection(db, 'partners'), 
      where('ownerId', '==', user.uid),
      where('taxCode', '==', p.taxCode)
    );
    const snap = await getDocs(q);
    const existing = snap.docs[0];
    
    // Address handling and conversion
    const rawAddress = p.address || "";
    let finalAddress = "";
    let finalAddressPostMerger = "";

    // Determine which field to fill based on invoice date
    if (isPostMerger) {
      finalAddressPostMerger = rawAddress;
      // Auto-convert for post-merger invoices to ensure 2nd level normalization
      const converted = smartConvertAddress(rawAddress);
      if (converted.isConverted) {
        finalAddressPostMerger = converted.fullAddress;
      }
    } else {
      finalAddress = rawAddress;
    }

    const partnerData: any = {
      name: fixNgocTham(p.name) || "",
      taxCode: p.taxCode,
      address: finalAddress,
      addressPostMerger: finalAddressPostMerger,
      accountNumber: p.accountNumber || "",
      bankName: p.bankName || "",
      position: p.position || "Giám đốc",
      updatedAt: serverTimestamp(),
      ownerId: user.uid
    };

    if (!existing) {
      await addDoc(collection(db, 'partners'), cleanObject(partnerData));
    } else {
      const current = existing.data();
      const updates: any = {};
      
      // Update fields ONLY if they are currently empty or null
      if (isPostMerger && !current.addressPostMerger && finalAddressPostMerger) {
        updates.addressPostMerger = finalAddressPostMerger;
      }
      if (!isPostMerger && !current.address && finalAddress) {
        updates.address = finalAddress;
      }
      if (!current.accountNumber && p.accountNumber) {
        updates.accountNumber = p.accountNumber;
      }
      if (!current.bankName && p.bankName) {
        updates.bankName = p.bankName;
      }
      if (!current.position) {
        updates.position = "Giám đốc";
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(existing.ref, cleanObject(updates));
      }
    }
  };`,
    replace: `  const upsertPartner = async (p: any, isPostMerger: boolean) => {
    if (!p || !p.taxCode || !user) return;
    try {
      const { data: existingDocs, error: queryError } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user.uid)
        .eq('tax_code', p.taxCode);
      if (queryError) throw queryError;
      
      const existing = existingDocs && existingDocs[0];
      
      // Address handling and conversion
      const rawAddress = p.address || "";
      let finalAddress = "";
      let finalAddressPostMerger = "";

      // Determine which field to fill based on invoice date
      if (isPostMerger) {
        finalAddressPostMerger = rawAddress;
        // Auto-convert for post-merger invoices to ensure 2nd level normalization
        const converted = smartConvertAddress(rawAddress);
        if (converted.isConverted) {
          finalAddressPostMerger = converted.fullAddress;
        }
      } else {
        finalAddress = rawAddress;
      }

      const partnerData: any = {
        name: fixNgocTham(p.name) || "",
        tax_code: p.taxCode,
        address: finalAddress,
        address_post_merger: finalAddressPostMerger,
        account_number: p.accountNumber || "",
        bank_name: p.bankName || "",
        position: p.position || "Giám đốc",
        updated_at: new Date().toISOString(),
        owner_id: user.uid
      };

      if (!existing) {
        const { error: insertError } = await supabase
          .from('partners')
          .insert({
            ...partnerData,
            created_at: new Date().toISOString()
          });
        if (insertError) throw insertError;
      } else {
        const current = existing;
        const updates: any = {};
        
        // Update fields ONLY if they are currently empty or null
        if (isPostMerger && !current.address_post_merger && finalAddressPostMerger) {
          updates.address_post_merger = finalAddressPostMerger;
        }
        if (!isPostMerger && !current.address && finalAddress) {
          updates.address = finalAddress;
        }
        if (!current.account_number && p.accountNumber) {
          updates.account_number = p.accountNumber;
        }
        if (!current.bank_name && p.bankName) {
          updates.bank_name = p.bankName;
        }
        if (!current.position) {
          updates.position = "Giám đốc";
        }
        
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('partners')
            .update(updates)
            .eq('id', existing.id);
          if (updateError) throw updateError;
        }
      }
      fetchPartners(user.uid);
    } catch (err: any) {
      console.error("Lỗi khi lưu/cập nhật đối tác:", err.message);
    }
  };`
  },
  {
    name: 'finalizeInvoice',
    target: `  const finalizeInvoice = async (updatedData: any) => {
    if (!pendingReview) return;
    const { docRef } = pendingReview;
    setIsProcessing(true);
    try {
      const updates = cleanObject({
        status: 'completed',
        extractedData: updatedData
      });

      // Chỉ cập nhật fileURL nếu có link Drive từ GAS thành công
      const newUrl = updatedData.driveUrl || pendingReview.data.driveUrl;
      if (newUrl) {
        updates.fileURL = newUrl;
      }

      await updateDoc(docRef, updates);

      // Sync Partner check
      const { seller, buyer, invoice } = updatedData;
      const invDate = invoice?.date ? new Date(invoice.date) : new Date();
      const cutOffDate = new Date('2025-07-01');
      const isPostMerger = invDate > cutOffDate;

      if (seller) await upsertPartner(seller, isPostMerger);
      if (buyer) await upsertPartner(buyer, isPostMerger);

      toast("Đã lưu hóa đơn thành công!", "success");
      setPendingReview(null);
      clearToasts(); // Xóa sạch toast khi xong
      handleTabChange('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`invoices/\${docRef.id}\`);
    } finally {
      setIsProcessing(false);
    }
  };`,
    replace: `  const finalizeInvoice = async (updatedData: any) => {
    if (!pendingReview) return;
    const { docRef } = pendingReview;
    setIsProcessing(true);
    try {
      const updates = cleanObject({
        status: 'completed',
        extractedData: updatedData
      });

      // Chỉ cập nhật fileURL nếu có link Drive từ GAS thành công
      const newUrl = updatedData.driveUrl || pendingReview.data.driveUrl;
      if (newUrl) {
        updates.fileURL = newUrl;
      }

      const mapped = mapInvoiceToSupabase(updates);
      const { error } = await supabase.from('invoices').update(mapped).eq('id', docRef.id);
      if (error) throw error;
      if (user) fetchInvoices(user.uid);

      // Sync Partner check
      const { seller, buyer, invoice } = updatedData;
      const invDate = invoice?.date ? new Date(invoice.date) : new Date();
      const cutOffDate = new Date('2025-07-01');
      const isPostMerger = invDate > cutOffDate;

      if (seller) await upsertPartner(seller, isPostMerger);
      if (buyer) await upsertPartner(buyer, isPostMerger);

      toast("Đã lưu hóa đơn thành công!", "success");
      setPendingReview(null);
      clearToasts(); // Xóa sạch toast khi xong
      handleTabChange('dashboard');
    } catch (error: any) {
      console.error(error);
      toast("Lỗi khi lưu hóa đơn: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };`
  },
  {
    name: 'generated_docs metadata in InvoiceDetailTable',
    target: `                            await addDoc(collection(db, 'generated_docs'), {
                              invoiceId: selectedInvoice.id,
                              templateType: tType,
                              fileName: \`\${tType}_\${selectedInvoice.fileName.split('.')[0]}.docx\`,
                              ownerId: user.uid,
                              createdAt: serverTimestamp()
                            }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));`,
    replace: `                            const { error: genDocError } = await supabase.from('generated_docs').insert({
                              invoice_id: selectedInvoice.id,
                              template_type: tType,
                              file_name: \`\${tType}_\${selectedInvoice.fileName.split('.')[0]}.docx\`,
                              owner_id: user.uid,
                              created_at: new Date().toISOString()
                            });
                            if (genDocError) throw genDocError;
                            fetchGeneratedDocs(user.uid);`
  },
  {
    name: 'invoice record creation in upload',
    target: `          // Step 1: Create Firestore record
          updateLoading(\`Đang đăng ký hóa đơn: \${file.name}\`);
          docRef = await addDoc(collection(db, 'invoices'), cleanObject({
            fileName: file.name,
            fileType: fileExt,
            fileURL: fileURL,
            storagePath: filePath,
            status: 'processing',
            ownerId: user.uid,
            createdAt: serverTimestamp()
          }));

          if (!docRef) throw new Error("Không thể khởi tạo bản ghi trong Firestore");`,
    replace: `          // Step 1: Create Supabase record
          updateLoading(\`Đang đăng ký hóa đơn: \${file.name}\`);
          const initialInvoiceData: any = {
            file_name: file.name,
            file_type: fileExt,
            status: 'processing',
            owner_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { data: insertedInv, error: insertError } = await supabase
            .from('invoices')
            .insert(initialInvoiceData)
            .select('id')
            .single();

          if (insertError || !insertedInv) throw new Error("Không thể khởi tạo bản ghi trong Supabase: " + (insertError?.message || "unknown"));
          docRef = { id: insertedInv.id };
          fetchInvoices(user.uid);`
  },
  {
    name: 'invoice update in auto-processing',
    target: `            if (isBatchProcessing) {
              const updates = cleanObject({ status: 'completed', extractedData });
              await updateDoc(docRef, updates);

              const { seller, buyer, invoice } = extractedData;
              const invDate = invoice?.date ? new Date(invoice.date) : new Date();
              const cutOffDate = new Date('2025-07-01');
              const isPostMerger = invDate > cutOffDate;

              if (seller) await upsertPartner(seller, isPostMerger);
              if (buyer) await upsertPartner(buyer, isPostMerger);
              
              console.log(\`Successfully auto-processed \${file.name}\`);`,
    replace: `            if (isBatchProcessing) {
              const updates = cleanObject({ status: 'completed', extractedData });
              const mapped = mapInvoiceToSupabase(updates);
              const { error: updateError } = await supabase
                .from('invoices')
                .update(mapped)
                .eq('id', docRef.id);
              if (updateError) throw updateError;
              fetchInvoices(user.uid);

              const { seller, buyer, invoice } = extractedData;
              const invDate = invoice?.date ? new Date(invoice.date) : new Date();
              const cutOffDate = new Date('2025-07-01');
              const isPostMerger = invDate > cutOffDate;

              if (seller) await upsertPartner(seller, isPostMerger);
              if (buyer) await upsertPartner(buyer, isPostMerger);
              
              console.log(\`Successfully auto-processed \${file.name}\`);`
  },
  {
    name: 'invoice deletion on rate-limit',
    target: `                 if (docRef) await deleteDoc(docRef);`,
    replace: `                 if (docRef) await supabase.from('invoices').delete().eq('id', docRef.id);`
  },
  {
    name: 'contract number blur update',
    target: `                                  try {
                                    await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
                                      contractNumber: val
                                    });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, \`invoices/\${selectedInvoice.id}\`);
                                  }`,
    replace: `                                  try {
                                    const { error: updateError } = await supabase
                                      .from('invoices')
                                      .update({ contract_number: val, updated_at: new Date().toISOString() })
                                      .eq('id', selectedInvoice.id);
                                    if (updateError) throw updateError;
                                    if (user) fetchInvoices(user.uid);
                                  } catch (err: any) {
                                    console.error(err);
                                  }`
  },
  {
    name: 'contract date blur update',
    target: `                                  try {
                                    await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
                                      contractDate: val
                                    });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, \`invoices/\${selectedInvoice.id}\`);
                                  }`,
    replace: `                                  try {
                                    const { error: updateError } = await supabase
                                      .from('invoices')
                                      .update({ contract_date: val, updated_at: new Date().toISOString() })
                                      .eq('id', selectedInvoice.id);
                                    if (updateError) throw updateError;
                                    if (user) fetchInvoices(user.uid);
                                  } catch (err: any) {
                                    console.error(err);
                                  }`
  }
];

let replacedCount = 0;
for (const rep of replacements) {
  const normTarget = rep.target.replace(/\r\n/g, '\n');
  const normReplace = rep.replace.replace(/\r\n/g, '\n');
  
  if (content.includes(normTarget)) {
    content = content.replace(normTarget, normReplace);
    console.log(`✅ Replaced: ${rep.name}`);
    replacedCount++;
  } else {
    console.warn(`❌ FAILED to match: ${rep.name}`);
  }
}

if (replacedCount > 0) {
  console.log(`💾 Writing changes back to ${file} (converting to CRLF)...`);
  fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log(`🎉 Successfully applied ${replacedCount} replacements!`);
} else {
  console.error('😭 No replacements were applied.');
}
