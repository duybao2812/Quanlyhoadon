const fs = require('fs');
const file = 'src/App.tsx';

console.log('📖 Reading src/App.tsx...');
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// List of replacements
const replacements = [
  {
    name: 'handleUpdateInvoice',
    target: "  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {\n" +
            "    try {\n" +
            "        await updateDoc(doc(db, 'invoices', id), data);\n" +
            "    } catch (error) {\n" +
            "        console.error('Update error:', error);\n" +
            "    }\n" +
            "  }, []);",
    replace: "  const handleUpdateInvoice = useCallback(async (id: string, data: any) => {\n" +
             "    try {\n" +
             "        const mapped = mapInvoiceToSupabase(data);\n" +
             "        const { error } = await supabase.from('invoices').update(mapped).eq('id', id);\n" +
             "        if (error) throw error;\n" +
             "        if (user) fetchInvoices(user.uid);\n" +
             "    } catch (error) {\n" +
             "        console.error('Update error:', error);\n" +
             "    }\n" +
             "  }, [user]);"
  },
  {
    name: 'generateDoc metadata insertion',
    target: "        await addDoc(collection(db, 'generated_docs'), {\n" +
            "            invoiceId: inv.id,\n" +
            "            templateType: tType,\n" +
            "            fileName: `${tType}_${inv.fileName.split('.')[0]}.docx`,\n" +
            "            ownerId: user.uid,\n" +
            "            createdAt: serverTimestamp()\n" +
            "        }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));",
    replace: "        const { error: genDocError } = await supabase.from('generated_docs').insert({\n" +
             "            invoice_id: inv.id,\n" +
             "            template_type: tType,\n" +
             "            file_name: `${tType}_${inv.fileName.split('.')[0]}.docx`,\n" +
             "            owner_id: user.uid,\n" +
             "            created_at: new Date().toISOString()\n" +
             "        });\n" +
             "        if (genDocError) throw genDocError;\n" +
             "        fetchGeneratedDocs(user.uid);"
  },
  {
    name: 'handleUpdatePartner',
    target: "  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {\n" +
            "    if (!user) return;\n" +
            "    try {\n" +
            "      if (id === 'new') {\n" +
            "         await addDoc(collection(db, 'partners'), cleanObject({\n" +
            "           ...updates,\n" +
            "           createdAt: serverTimestamp(),\n" +
            "           updatedAt: serverTimestamp(),\n" +
            "           ownerId: user.uid\n" +
            "         }));\n" +
            "      } else {\n" +
            "         await updateDoc(doc(db, 'partners', id), cleanObject({\n" +
            "           ...updates,\n" +
            "           updatedAt: serverTimestamp()\n" +
            "         }));\n" +
            "      }\n" +
            "    } catch (error) {\n" +
            "      handleFirestoreError(error, id === 'new' ? OperationType.CREATE : OperationType.UPDATE, `partners/${id}`);\n" +
            "    }\n" +
            "  };",
    replace: "  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {\n" +
             "    if (!user) return;\n" +
             "    try {\n" +
             "      const mapped = cleanObject({\n" +
             "        name: updates.name,\n" +
             "        tax_code: updates.taxCode,\n" +
             "        address: updates.address,\n" +
             "        address_post_merger: updates.addressPostMerger,\n" +
             "        account_number: updates.accountNumber,\n" +
             "        bank_name: updates.bankName,\n" +
             "        representative: updates.representative,\n" +
             "        position: updates.position,\n" +
             "        gender: updates.gender,\n" +
             "        owner_id: user.uid,\n" +
             "        updated_at: new Date().toISOString()\n" +
             "      });\n" +
             "\n" +
             "      if (id === 'new') {\n" +
             "        const { error } = await supabase.from('partners').insert({\n" +
             "          ...mapped,\n" +
             "          created_at: new Date().toISOString()\n" +
             "        });\n" +
             "        if (error) throw error;\n" +
             "      } else {\n" +
             "        const { error } = await supabase.from('partners').update(mapped).eq('id', id);\n" +
             "        if (error) throw error;\n" +
             "      }\n" +
             "      fetchPartners(user.uid);\n" +
             "    } catch (error: any) {\n" +
             "      console.error(\"Lỗi khi cập nhật đối tác:\", error);\n" +
             "      toast(\"Lỗi khi cập nhật đối tác: \" + error.message, \"error\");\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleDeletePartner',
    target: "  const handleDeletePartner = async (id: string) => {\n" +
            "    if (!user) return;\n" +
            "    console.log(\"handleDeletePartner called with id:\", id);\n" +
            "    try {\n" +
            "      await deleteDoc(doc(db, 'partners', id));\n" +
            "      toast(\"Đã xóa đối tác thành công\", \"success\");\n" +
            "    } catch (error) {\n" +
            "      console.error(\"Delete partner error:\", error);\n" +
            "      handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);\n" +
            "      toast(\"Lỗi khi xóa đối tác\", \"error\");\n" +
            "    }\n" +
            "  };",
    replace: "  const handleDeletePartner = async (id: string) => {\n" +
             "    if (!user) return;\n" +
             "    console.log(\"handleDeletePartner called with id:\", id);\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('partners').delete().eq('id', id);\n" +
             "      if (error) throw error;\n" +
             "      toast(\"Đã xóa đối tác thành công\", \"success\");\n" +
             "      fetchPartners(user.uid);\n" +
             "    } catch (error: any) {\n" +
             "      console.error(\"Delete partner error:\", error);\n" +
             "      toast(\"Lỗi khi xóa đối tác: \" + error.message, \"error\");\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleDeleteInvoice',
    target: "  const handleDeleteInvoice = async (id: string) => {\n" +
            "    if (!user) return;\n" +
            "    console.log(\"handleDeleteInvoice called with id:\", id);\n" +
            "    try {\n" +
            "      await deleteDoc(doc(db, 'invoices', id));\n" +
            "      console.log(\"Invoice deleted successfully\");\n" +
            "    } catch (error) {\n" +
            "      console.error(\"Delete invoice error:\", error);\n" +
            "      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);\n" +
            "    }\n" +
            "  };",
    replace: "  const handleDeleteInvoice = async (id: string) => {\n" +
             "    if (!user) return;\n" +
             "    console.log(\"handleDeleteInvoice called with id:\", id);\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('invoices').delete().eq('id', id);\n" +
             "      if (error) throw error;\n" +
             "      console.log(\"Invoice deleted successfully\");\n" +
             "      fetchInvoices(user.uid);\n" +
             "    } catch (error: any) {\n" +
             "      console.error(\"Delete invoice error:\", error);\n" +
             "      toast(\"Lỗi khi xóa hóa đơn: \" + error.message, \"error\");\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleDeleteDoc',
    target: "  const handleDeleteDoc = async (id: string) => {\n" +
            "    console.log(\"Attempting to delete doc:\", id);\n" +
            "    try {\n" +
            "      await deleteDoc(doc(db, 'generated_docs', id));\n" +
            "      toast('Đã xóa 1 tài liệu');\n" +
            "    } catch (error: any) {\n" +
            "      console.error(\"Delete doc error:\", error);\n" +
            "      toast(`Lỗi khi xóa tài liệu: ${error.message || 'Không xác định'}`, 'error');\n" +
            "      try {\n" +
            "        handleFirestoreError(error, OperationType.DELETE, `generated_docs/${id}`);\n" +
            "      } catch (err) {\n" +
            "        // Already handled error\n" +
            "      }\n" +
            "    }\n" +
            "  };",
    replace: "  const handleDeleteDoc = async (id: string) => {\n" +
             "    if (!user) return;\n" +
             "    console.log(\"Attempting to delete doc:\", id);\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('generated_docs').delete().eq('id', id);\n" +
             "      if (error) throw error;\n" +
             "      toast('Đã xóa 1 tài liệu');\n" +
             "      fetchGeneratedDocs(user.uid);\n" +
             "    } catch (error: any) {\n" +
             "      console.error(\"Delete doc error:\", error);\n" +
             "      toast(`Lỗi khi xóa tài liệu: ${error.message || 'Không xác định'}`, 'error');\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleBulkDeleteDocs',
    target: "  const handleBulkDeleteDocs = async (ids: string[]) => {\n" +
            "    if (!ids || ids.length === 0) return;\n" +
            "    console.log(\"Attempting to bulk delete docs:\", ids);\n" +
            "    try {\n" +
            "      setIsProcessing(true);\n" +
            "      // Fallback to individual deletes if batch is tricky, \n" +
            "      // but let's keep batch first and see if individual error handling helps\n" +
            "      const batch = writeBatch(db);\n" +
            "      ids.forEach(id => {\n" +
            "        batch.delete(doc(db, 'generated_docs', id));\n" +
            "      });\n" +
            "      await batch.commit();\n" +
            "      toast(`Đã xóa ${ids.length} tài liệu thành công`);\n" +
            "    } catch (error: any) {\n" +
            "      console.error('Bulk delete error:', error);\n" +
            "      toast(`Lỗi khi xóa hàng loạt: ${error.message || 'Không xác định'}`, 'error');\n" +
            "      \n" +
            "      // If batch fails, try individual as fallback for debugging\n" +
            "      console.log(\"Trying individual deletes as fallback...\");\n" +
            "      let successCount = 0;\n" +
            "      for (const id of ids) {\n" +
            "        try {\n" +
            "          await deleteDoc(doc(db, 'generated_docs', id));\n" +
            "          successCount++;\n" +
            "        } catch (e) {\n" +
            "          console.error(`Failed to delete individual doc ${id}:`, e);\n" +
            "        }\n" +
            "      }\n" +
            "      if (successCount > 0) {\n" +
            "        toast(`Đã xóa thủ công được ${successCount}/${ids.length} tài liệu`);\n" +
            "      }\n" +
            "    } finally {\n" +
            "      setIsProcessing(false);\n" +
            "    }\n" +
            "  };",
    replace: "  const handleBulkDeleteDocs = async (ids: string[]) => {\n" +
             "    if (!user || !ids || ids.length === 0) return;\n" +
             "    console.log(\"Attempting to bulk delete docs:\", ids);\n" +
             "    try {\n" +
             "      setIsProcessing(true);\n" +
             "      const { error } = await supabase.from('generated_docs').delete().in('id', ids);\n" +
             "      if (error) throw error;\n" +
             "      toast(`Đã xóa ${ids.length} tài liệu thành công`);\n" +
             "      fetchGeneratedDocs(user.uid);\n" +
             "    } catch (error: any) {\n" +
             "      console.error('Bulk delete error:', error);\n" +
             "      toast(`Lỗi khi xóa hàng loạt: ${error.message || 'Không xác định'}`, 'error');\n" +
             "    } finally {\n" +
             "      setIsProcessing(false);\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleContractSave',
    target: "  const handleContractSave = async (data: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => {\n" +
            "    if (!user) return;\n" +
            "    try {\n" +
            "      await addDoc(collection(db, 'contracts'), {\n" +
            "        ...data,\n" +
            "        ownerId: user.uid,\n" +
            "        createdAt: serverTimestamp()\n" +
            "      }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'contracts'));\n" +
            "    } catch (err: any) {\n" +
            "      toast(\"Lỗi khi lưu hợp đồng: \" + err.message, \"error\");\n" +
            "    }\n" +
            "  };",
    replace: "  const handleContractSave = async (data: Omit<SmartContract, 'id' | 'ownerId' | 'createdAt'>) => {\n" +
             "    if (!user) return;\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('contracts').insert({\n" +
             "        template_id: data.templateId,\n" +
             "        party_a_id: data.partyAId || null,\n" +
             "        party_b_id: data.partyBId || null,\n" +
             "        form_data: data.formData,\n" +
             "        file_name: data.fileName,\n" +
             "        owner_id: user.uid,\n" +
             "        created_at: new Date().toISOString(),\n" +
             "        updated_at: new Date().toISOString()\n" +
             "      });\n" +
             "      if (error) throw error;\n" +
             "      fetchContracts(user.uid);\n" +
             "    } catch (err: any) {\n" +
             "      console.error(\"Lỗi khi lưu hợp đồng:\", err);\n" +
             "      toast(\"Lỗi khi lưu hợp đồng: \" + err.message, \"error\");\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleDeleteContract',
    target: "  const handleDeleteContract = async (id: string) => {\n" +
            "    if (!confirm(\"Bạn có chắc chắn muốn xóa hợp đồng này?\")) return;\n" +
            "    try {\n" +
            "      await deleteDoc(doc(db, 'contracts', id));\n" +
            "      toast(\"Đã xóa hợp đồng\", \"success\");\n" +
            "    } catch (err: any) {\n" +
            "      toast(\"Lỗi khi xóa: \" + err.message, \"error\");\n" +
            "    }\n" +
            "  };",
    replace: "  const handleDeleteContract = async (id: string) => {\n" +
             "    if (!user) return;\n" +
             "    if (!confirm(\"Bạn có chắc chắn muốn xóa hợp đồng này?\")) return;\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('contracts').delete().eq('id', id);\n" +
             "      if (error) throw error;\n" +
             "      toast(\"Đã xóa hợp đồng\", \"success\");\n" +
             "      fetchContracts(user.uid);\n" +
             "    } catch (err: any) {\n" +
             "      toast(\"Lỗi khi xóa hợp đồng: \" + err.message, \"error\");\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'handleBulkDeleteContracts',
    target: "  const handleBulkDeleteContracts = async (ids: string[]) => {\n" +
            "    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hợp đồng?`)) return;\n" +
            "    setIsProcessing(true);\n" +
            "    try {\n" +
            "      const batch = writeBatch(db);\n" +
            "      ids.forEach(id => {\n" +
            "        batch.delete(doc(db, 'contracts', id));\n" +
            "      });\n" +
            "      await batch.commit();\n" +
            "      toast(`Đã xóa ${ids.length} hợp đồng`, \"success\");\n" +
            "    } catch (err: any) {\n" +
            "      toast(\"Lỗi khi xóa hàng loạt: \" + err.message, \"error\");\n" +
            "    } finally {\n" +
            "      setIsProcessing(false);\n" +
            "    }\n" +
            "  };",
    replace: "  const handleBulkDeleteContracts = async (ids: string[]) => {\n" +
             "    if (!user || !ids || ids.length === 0) return;\n" +
             "    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hợp đồng?`)) return;\n" +
             "    setIsProcessing(true);\n" +
             "    try {\n" +
             "      const { error } = await supabase.from('contracts').delete().in('id', ids);\n" +
             "      if (error) throw error;\n" +
             "      toast(`Đã xóa ${ids.length} hợp đồng thành công`, \"success\");\n" +
             "      fetchContracts(user.uid);\n" +
             "    } catch (err: any) {\n" +
             "      toast(\"Lỗi khi xóa hàng loạt: \" + err.message, \"error\");\n" +
             "    } finally {\n" +
             "      setIsProcessing(false);\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'upsertPartner',
    target: "  const upsertPartner = async (p: any, isPostMerger: boolean) => {\n" +
            "    if (!p || !p.taxCode || !user) return;\n" +
            "    const q = query(\n" +
            "      collection(db, 'partners'), \n" +
            "      where('ownerId', '==', user.uid),\n" +
            "      where('taxCode', '==', p.taxCode)\n" +
            "    );\n" +
            "    const snap = await getDocs(q);\n" +
            "    const existing = snap.docs[0];\n" +
            "    \n" +
            "    // Address handling and conversion\n" +
            "    const rawAddress = p.address || \"\";\n" +
            "    let finalAddress = \"\";\n" +
            "    let finalAddressPostMerger = \"\";\n" +
            "\n" +
            "    // Determine which field to fill based on invoice date\n" +
            "    if (isPostMerger) {\n" +
            "      finalAddressPostMerger = rawAddress;\n" +
            "      // Auto-convert for post-merger invoices to ensure 2nd level normalization\n" +
            "      const converted = smartConvertAddress(rawAddress);\n" +
            "      if (converted.isConverted) {\n" +
            "        finalAddressPostMerger = converted.fullAddress;\n" +
            "      }\n" +
            "    } else {\n" +
            "      finalAddress = rawAddress;\n" +
            "    }\n" +
            "\n" +
            "    const partnerData: any = {\n" +
            "      name: fixNgocTham(p.name) || \"\",\n" +
            "      taxCode: p.taxCode,\n" +
            "      address: finalAddress,\n" +
            "      addressPostMerger: finalAddressPostMerger,\n" +
            "      accountNumber: p.accountNumber || \"\",\n" +
            "      bankName: p.bankName || \"\",\n" +
            "      position: p.position || \"Giám đốc\",\n" +
            "      updatedAt: serverTimestamp(),\n" +
            "      ownerId: user.uid\n" +
            "    };\n" +
            "\n" +
            "    if (!existing) {\n" +
            "      await addDoc(collection(db, 'partners'), cleanObject(partnerData));\n" +
            "    } else {\n" +
            "      const current = existing.data();\n" +
            "      const updates: any = {};\n" +
            "      \n" +
            "      // Update fields ONLY if they are currently empty or null\n" +
            "      if (isPostMerger && !current.addressPostMerger && finalAddressPostMerger) {\n" +
            "        updates.addressPostMerger = finalAddressPostMerger;\n" +
            "      }\n" +
            "      if (!isPostMerger && !current.address && finalAddress) {\n" +
            "        updates.address = finalAddress;\n" +
            "      }\n" +
            "      if (!current.accountNumber && p.accountNumber) {\n" +
            "        updates.accountNumber = p.accountNumber;\n" +
            "      }\n" +
            "      if (!current.bankName && p.bankName) {\n" +
            "        updates.bankName = p.bankName;\n" +
            "      }\n" +
            "      if (!current.position) {\n" +
            "        updates.position = \"Giám đốc\";\n" +
            "      }\n" +
            "      \n" +
            "      if (Object.keys(updates).length > 0) {\n" +
            "        updates.updatedAt = serverTimestamp();\n" +
            "        await updateDoc(existing.ref, cleanObject(updates));\n" +
            "      }\n" +
            "    }\n" +
            "  };",
    replace: "  const upsertPartner = async (p: any, isPostMerger: boolean) => {\n" +
             "    if (!p || !p.taxCode || !user) return;\n" +
             "    try {\n" +
             "      const { data: existingDocs, error: queryError } = await supabase\n" +
             "        .from('partners')\n" +
             "        .select('*')\n" +
             "        .eq('owner_id', user.uid)\n" +
             "        .eq('tax_code', p.taxCode);\n" +
             "      if (queryError) throw queryError;\n" +
             "      \n" +
             "      const existing = existingDocs && existingDocs[0];\n" +
             "      \n" +
             "      // Address handling and conversion\n" +
             "      const rawAddress = p.address || \"\";\n" +
             "      let finalAddress = \"\";\n" +
             "      let finalAddressPostMerger = \"\";\n" +
             "\n" +
             "      // Determine which field to fill based on invoice date\n" +
             "      if (isPostMerger) {\n" +
             "        finalAddressPostMerger = rawAddress;\n" +
             "        // Auto-convert for post-merger invoices to ensure 2nd level normalization\n" +
             "        const converted = smartConvertAddress(rawAddress);\n" +
             "        if (converted.isConverted) {\n" +
             "          finalAddressPostMerger = converted.fullAddress;\n" +
             "        }\n" +
             "      } else {\n" +
             "        finalAddress = rawAddress;\n" +
             "      }\n" +
             "\n" +
             "      const partnerData: any = {\n" +
             "        name: fixNgocTham(p.name) || \"\",\n" +
             "        tax_code: p.taxCode,\n" +
             "        address: finalAddress,\n" +
             "        address_post_merger: finalAddressPostMerger,\n" +
             "        account_number: p.accountNumber || \"\",\n" +
             "        bank_name: p.bankName || \"\",\n" +
             "        position: p.position || \"Giám đốc\",\n" +
             "        updated_at: new Date().toISOString(),\n" +
             "        owner_id: user.uid\n" +
             "      };\n" +
             "\n" +
             "      if (!existing) {\n" +
             "        const { error: insertError } = await supabase\n" +
             "          .from('partners')\n" +
             "          .insert({\n" +
             "            ...partnerData,\n" +
             "            created_at: new Date().toISOString()\n" +
             "          });\n" +
             "        if (insertError) throw insertError;\n" +
             "      } else {\n" +
             "        const current = existing;\n" +
             "        const updates: any = {};\n" +
             "        \n" +
             "        // Update fields ONLY if they are currently empty or null\n" +
             "        if (isPostMerger && !current.address_post_merger && finalAddressPostMerger) {\n" +
             "          updates.address_post_merger = finalAddressPostMerger;\n" +
             "        }\n" +
             "        if (!isPostMerger && !current.address && finalAddress) {\n" +
             "          updates.address = finalAddress;\n" +
             "        }\n" +
             "        if (!current.account_number && p.accountNumber) {\n" +
             "          updates.account_number = p.accountNumber;\n" +
             "        }\n" +
             "        if (!current.bank_name && p.bankName) {\n" +
             "          updates.bank_name = p.bankName;\n" +
             "        }\n" +
             "        if (!current.position) {\n" +
             "          updates.position = \"Giám đốc\";\n" +
             "        }\n" +
             "        \n" +
             "        if (Object.keys(updates).length > 0) {\n" +
             "          updates.updated_at = new Date().toISOString();\n" +
             "          const { error: updateError } = await supabase\n" +
             "            .from('partners')\n" +
             "            .update(updates)\n" +
             "            .eq('id', existing.id);\n" +
             "          if (updateError) throw updateError;\n" +
             "        }\n" +
             "      }\n" +
             "      fetchPartners(user.uid);\n" +
             "    } catch (err: any) {\n" +
             "      console.error(\"Lỗi khi lưu/cập nhật đối tác:\", err.message);\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'finalizeInvoice',
    target: "  const finalizeInvoice = async (updatedData: any) => {\n" +
            "    if (!pendingReview) return;\n" +
            "    const { docRef } = pendingReview;\n" +
            "    setIsProcessing(true);\n" +
            "    try {\n" +
            "      const updates = cleanObject({\n" +
            "        status: 'completed',\n" +
            "        extractedData: updatedData\n" +
            "      });\n" +
            "\n" +
            "      // Chỉ cập nhật fileURL nếu có link Drive từ GAS thành công\n" +
            "      const newUrl = updatedData.driveUrl || pendingReview.data.driveUrl;\n" +
            "      if (newUrl) {\n" +
            "        updates.fileURL = newUrl;\n" +
            "      }\n" +
            "\n" +
            "      await updateDoc(docRef, updates);\n" +
            "\n" +
            "      // Sync Partner check\n" +
            "      const { seller, buyer, invoice } = updatedData;\n" +
            "      const invDate = invoice?.date ? new Date(invoice.date) : new Date();\n" +
            "      const cutOffDate = new Date('2025-07-01');\n" +
            "      const isPostMerger = invDate > cutOffDate;\n" +
            "\n" +
            "      if (seller) await upsertPartner(seller, isPostMerger);\n" +
            "      if (buyer) await upsertPartner(buyer, isPostMerger);\n" +
            "\n" +
            "      toast(\"Đã lưu hóa đơn thành công!\", \"success\");\n" +
            "      setPendingReview(null);\n" +
            "      clearToasts(); // Xóa sạch toast khi xong\n" +
            "      handleTabChange('dashboard');\n" +
            "    } catch (error) {\n" +
            "      handleFirestoreError(error, OperationType.UPDATE, `invoices/${docRef.id}`);\n" +
            "    } finally {\n" +
            "      setIsProcessing(false);\n" +
            "    }\n" +
            "  };",
    replace: "  const finalizeInvoice = async (updatedData: any) => {\n" +
             "    if (!pendingReview) return;\n" +
             "    const { docRef } = pendingReview;\n" +
             "    setIsProcessing(true);\n" +
             "    try {\n" +
             "      const updates = cleanObject({\n" +
             "        status: 'completed',\n" +
             "        extractedData: updatedData\n" +
             "      });\n" +
             "\n" +
             "      // Chỉ cập nhật fileURL nếu có link Drive từ GAS thành công\n" +
             "      const newUrl = updatedData.driveUrl || pendingReview.data.driveUrl;\n" +
             "      if (newUrl) {\n" +
             "        updates.fileURL = newUrl;\n" +
             "      }\n" +
             "\n" +
             "      const mapped = mapInvoiceToSupabase(updates);\n" +
             "      const { error } = await supabase.from('invoices').update(mapped).eq('id', docRef.id);\n" +
             "      if (error) throw error;\n" +
             "      if (user) fetchInvoices(user.uid);\n" +
             "\n" +
             "      // Sync Partner check\n" +
             "      const { seller, buyer, invoice } = updatedData;\n" +
             "      const invDate = invoice?.date ? new Date(invoice.date) : new Date();\n" +
             "      const cutOffDate = new Date('2025-07-01');\n" +
             "      const isPostMerger = invDate > cutOffDate;\n" +
             "\n" +
             "      if (seller) await upsertPartner(seller, isPostMerger);\n" +
             "      if (buyer) await upsertPartner(buyer, isPostMerger);\n" +
             "\n" +
             "      toast(\"Đã lưu hóa đơn thành công!\", \"success\");\n" +
             "      setPendingReview(null);\n" +
             "      clearToasts(); // Xóa sạch toast khi xong\n" +
             "      handleTabChange('dashboard');\n" +
             "    } catch (error: any) {\n" +
             "      console.error(error);\n" +
             "      toast(\"Lỗi khi lưu hóa đơn: \" + error.message, \"error\");\n" +
             "    } finally {\n" +
             "      setIsProcessing(false);\n" +
             "    }\n" +
             "  };"
  },
  {
    name: 'generated_docs metadata in InvoiceDetailTable',
    target: "                            await addDoc(collection(db, 'generated_docs'), {\n" +
            "                              invoiceId: selectedInvoice.id,\n" +
            "                              templateType: tType,\n" +
            "                              fileName: `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`,\n" +
            "                              ownerId: user.uid,\n" +
            "                              createdAt: serverTimestamp()\n" +
            "                            }).catch(error => handleFirestoreError(error, OperationType.CREATE, 'generated_docs'));",
    replace: "                            const { error: genDocError } = await supabase.from('generated_docs').insert({\n" +
             "                              invoice_id: selectedInvoice.id,\n" +
             "                              template_type: tType,\n" +
             "                              file_name: `${tType}_${selectedInvoice.fileName.split('.')[0]}.docx`,\n" +
             "                              owner_id: user.uid,\n" +
             "                              created_at: new Date().toISOString()\n" +
             "                            });\n" +
             "                            if (genDocError) throw genDocError;\n" +
             "                            fetchGeneratedDocs(user.uid);"
  },
  {
    name: 'invoice record creation in upload',
    target: "          // Step 1: Create Firestore record\n" +
            "          updateLoading(`Đang đăng ký hóa đơn: ${file.name}`);\n" +
            "          docRef = await addDoc(collection(db, 'invoices'), cleanObject({\n" +
            "            fileName: file.name,\n" +
            "            fileType: fileExt,\n" +
            "            fileURL: fileURL,\n" +
            "            storagePath: filePath,\n" +
            "            status: 'processing',\n" +
            "            ownerId: user.uid,\n" +
            "            createdAt: serverTimestamp()\n" +
            "          }));\n" +
            "\n" +
            "          if (!docRef) throw new Error(\"Không thể khởi tạo bản ghi trong Firestore\");",
    replace: "          // Step 1: Create Supabase record\n" +
             "          updateLoading(`Đang đăng ký hóa đơn: ${file.name}`);\n" +
             "          const initialInvoiceData: any = {\n" +
             "            file_name: file.name,\n" +
             "            file_type: fileExt,\n" +
             "            status: 'processing',\n" +
             "            owner_id: user.uid,\n" +
             "            created_at: new Date().toISOString(),\n" +
             "            updated_at: new Date().toISOString()\n" +
             "          };\n" +
             "          const { data: insertedInv, error: insertError } = await supabase\n" +
             "            .from('invoices')\n" +
             "            .insert(initialInvoiceData)\n" +
             "            .select('id')\n" +
             "            .single();\n" +
             "\n" +
             "          if (insertError || !insertedInv) throw new Error(\"Không thể khởi tạo bản ghi trong Supabase: \" + (insertError?.message || \"unknown\"));\n" +
             "          docRef = { id: insertedInv.id };\n" +
             "          fetchInvoices(user.uid);"
  },
  {
    name: 'invoice update in auto-processing',
    target: "            if (isBatchProcessing) {\n" +
            "              const updates = cleanObject({ status: 'completed', extractedData });\n" +
            "              await updateDoc(docRef, updates);\n" +
            "\n" +
            "              const { seller, buyer, invoice } = extractedData;\n" +
            "              const invDate = invoice?.date ? new Date(invoice.date) : new Date();\n" +
            "              const cutOffDate = new Date('2025-07-01');\n" +
            "              const isPostMerger = invDate > cutOffDate;\n" +
            "\n" +
            "              if (seller) await upsertPartner(seller, isPostMerger);\n" +
            "              if (buyer) await upsertPartner(buyer, isPostMerger);\n" +
            "              \n" +
            "              console.log(`Successfully auto-processed ${file.name}`);",
    replace: "            if (isBatchProcessing) {\n" +
             "              const updates = cleanObject({ status: 'completed', extractedData });\n" +
             "              const mapped = mapInvoiceToSupabase(updates);\n" +
             "              const { error: updateError } = await supabase\n" +
             "                .from('invoices')\n" +
             "                .update(mapped)\n" +
             "                .eq('id', docRef.id);\n" +
             "              if (updateError) throw updateError;\n" +
             "              fetchInvoices(user.uid);\n" +
             "\n" +
             "              const { seller, buyer, invoice } = extractedData;\n" +
             "              const invDate = invoice?.date ? new Date(invoice.date) : new Date();\n" +
             "              const cutOffDate = new Date('2025-07-01');\n" +
             "              const isPostMerger = invDate > cutOffDate;\n" +
             "\n" +
             "              if (seller) await upsertPartner(seller, isPostMerger);\n" +
             "              if (buyer) await upsertPartner(buyer, isPostMerger);\n" +
             "              \n" +
             "              console.log(`Successfully auto-processed ${file.name}`);"
  },
  {
    name: 'invoice deletion on rate-limit',
    target: "                 if (docRef) await deleteDoc(docRef);",
    replace: "                 if (docRef) await supabase.from('invoices').delete().eq('id', docRef.id);"
  },
  {
    name: 'contract number blur update',
    target: "                                  try {\n" +
            "                                    await updateDoc(doc(db, 'invoices', selectedInvoice.id), {\n" +
            "                                      contractNumber: val\n" +
            "                                    });\n" +
            "                                  } catch (err) {\n" +
            "                                    handleFirestoreError(err, OperationType.UPDATE, `invoices/${selectedInvoice.id}`);\n" +
            "                                  }",
    replace: "                                  try {\n" +
             "                                    const { error: updateError } = await supabase\n" +
             "                                      .from('invoices')\n" +
             "                                      .update({ contract_number: val, updated_at: new Date().toISOString() })\n" +
             "                                      .eq('id', selectedInvoice.id);\n" +
             "                                    if (updateError) throw updateError;\n" +
             "                                    if (user) fetchInvoices(user.uid);\n" +
             "                                  } catch (err: any) {\n" +
             "                                    console.error(err);\n" +
             "                                  }"
  },
  {
    name: 'contract date blur update',
    target: "                                  try {\n" +
            "                                    await updateDoc(doc(db, 'invoices', selectedInvoice.id), {\n" +
            "                                      contractDate: val\n" +
            "                                    });\n" +
            "                                  } catch (err) {\n" +
            "                                    handleFirestoreError(err, OperationType.UPDATE, `invoices/${selectedInvoice.id}`);\n" +
            "                                  }",
    replace: "                                  try {\n" +
             "                                    const { error: updateError } = await supabase\n" +
             "                                      .from('invoices')\n" +
             "                                      .update({ contract_date: val, updated_at: new Date().toISOString() })\n" +
             "                                      .eq('id', selectedInvoice.id);\n" +
             "                                    if (updateError) throw updateError;\n" +
             "                                    if (user) fetchInvoices(user.uid);\n" +
             "                                  } catch (err: any) {\n" +
             "                                    console.error(err);\n" +
             "                                  }"
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
