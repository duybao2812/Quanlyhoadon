/**
 * ==========================================
 * FIRESTORE TO SUPABASE DATA MIGRATION SCRIPT
 * ==========================================
 * 
 * Script này tự động đọc toàn bộ các document từ 4 collections Firestore
 * ('partners', 'invoices', 'generated_docs', 'contracts') và
 * ghi tương ứng vào cơ sở dữ liệu Supabase PostgreSQL.
 * 
 * Yêu cầu:
 * 1. Đã cài đặt thư viện: npm install @supabase/supabase-js firebase-admin dotenv
 * 2. Đã tạo file cấu hình tài khoản dịch vụ Firebase Service Account (.json)
 * 3. Đã có Supabase URL và Supabase Service Role Key (để ghi đè RLS trong lúc migrate)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// 1. Cấu hình khóa và kết nối
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Sử dụng Service Role Key để bypass RLS khi di chuyển dữ liệu

if (!fs.existsSync(firebaseServiceAccountPath)) {
  console.error(`❌ Không tìm thấy file Firebase Service Account tại: ${firebaseServiceAccountPath}`);
  console.log('👉 Vui lòng tải file JSON Service Account từ Firebase Console > Project Settings > Service Accounts và lưu vào thư mục dự án.');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY!');
  console.log('👉 Vui lòng khai báo các biến này trong file .env hoặc chạy lệnh kèm biến môi trường.');
  process.exit(1);
}

// Khởi tạo các SDK
admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(firebaseServiceAccountPath)))
});

// Nạp cấu hình database ID từ firebase-applet-config.json
let databaseId = '(default)';
const firebaseConfigPath = './firebase-applet-config.json';
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (config.firestoreDatabaseId) {
      databaseId = config.firestoreDatabaseId;
      console.log(`📡 Tự động nạp Database ID từ cấu hình: "${databaseId}"`);
    }
  } catch (e) {
    console.warn('⚠️ Không thể đọc tệp firebase-applet-config.json:', e.message);
  }
}

const firestore = getFirestore(databaseId);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper định dạng timestamp Firestore sang định dạng chuỗi ISO của Postgres
function formatTimestamp(firestoreValue) {
  if (!firestoreValue) return new Date().toISOString();
  // Nếu là Firestore Timestamp object
  if (firestoreValue._seconds !== undefined) {
    return new Date(firestoreValue._seconds * 1000).toISOString();
  }
  if (typeof firestoreValue.toDate === 'function') {
    return firestoreValue.toDate().toISOString();
  }
  // Nếu là milliseconds
  if (typeof firestoreValue === 'number') {
    return new Date(firestoreValue).toISOString();
  }
  return firestoreValue;
}

// 2. Các hàm di chuyển từng bảng

// A. Di chuyển Partners
async function migratePartners() {
  console.log('\n--- 🤝 ĐANG DI CHUYỂN DỮ LIỆU ĐỐI TÁC (partners) ---');
  const snapshot = await firestore.collection('partners').get();
  console.log(`Tìm thấy ${snapshot.size} đối tác trên Firestore.`);
  
  let successCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const mapped = {
      id: doc.id,
      name: data.name || 'Không rõ',
      tax_code: data.taxCode || '',
      address: data.address || '',
      address_post_merger: data.addressPostMerger || null,
      account_number: data.accountNumber || null,
      bank_name: data.bankName || null,
      representative: data.representative || null,
      position: data.position || null,
      gender: data.gender || null,
      owner_id: data.ownerId || 'system',
      created_at: formatTimestamp(data.createdAt),
      updated_at: formatTimestamp(data.updatedAt)
    };

    const { error } = await supabase.from('partners').upsert(mapped);
    if (error) {
      console.error(`❌ Lỗi đối tác ${doc.id}:`, error.message);
    } else {
      successCount++;
    }
  }
  console.log(`✅ Di chuyển thành công ${successCount}/${snapshot.size} đối tác.`);
}

// B. Di chuyển Invoices
async function migrateInvoices() {
  console.log('\n--- 📄 ĐANG DI CHUYỂN DỮ LIỆU HÓA ĐƠN (invoices) ---');
  const snapshot = await firestore.collection('invoices').get();
  console.log(`Tìm thấy ${snapshot.size} hóa đơn trên Firestore.`);
  
  let successCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Định dạng tổng số tiền sang số numeric
    let totalAmount = null;
    if (data.totalAmount !== undefined && data.totalAmount !== null) {
      totalAmount = typeof data.totalAmount === 'number' 
        ? data.totalAmount 
        : parseFloat(String(data.totalAmount).replace(/[^0-9.-]/g, ''));
    }

    const mapped = {
      id: doc.id,
      file_name: data.fileName || 'unnamed_file',
      file_type: data.fileType || 'pdf',
      status: data.status || 'pending',
      contract_number: data.contractNumber || null,
      contract_date: data.contractDate || null,
      seller_name: data.sellerName || null,
      buyer_name: data.buyerName || null,
      seller_tax_code: data.sellerTaxCode || null,
      buyer_tax_code: data.buyerTaxCode || null,
      type: data.type || null,
      category: data.category || null,
      total_amount: isNaN(totalAmount) ? null : totalAmount,
      extracted_data: data.extractedData || null,
      line_items: data.lineItems || null,
      owner_id: data.ownerId || 'system',
      created_at: formatTimestamp(data.createdAt),
      updated_at: formatTimestamp(data.updatedAt || data.createdAt)
    };

    const { error } = await supabase.from('invoices').upsert(mapped);
    if (error) {
      console.error(`❌ Lỗi hóa đơn ${doc.id}:`, error.message);
    } else {
      successCount++;
    }
  }
  console.log(`✅ Di chuyển thành công ${successCount}/${snapshot.size} hóa đơn.`);
}

// C. Di chuyển Generated Docs
async function migrateGeneratedDocs() {
  console.log('\n--- 📎 ĐANG DI CHUYỂN DỮ LIỆU BIÊN BẢN (generated_docs) ---');
  const snapshot = await firestore.collection('generated_docs').get();
  console.log(`Tìm thấy ${snapshot.size} biên bản trên Firestore.`);
  
  let successCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Kiểm tra liên kết invoiceId có tồn tại hay không
    let invoiceId = data.invoiceId;
    if (invoiceId) {
      const { data: inv } = await supabase.from('invoices').select('id').eq('id', invoiceId).single();
      if (!inv) {
        invoiceId = null;
      }
    }

    const mapped = {
      id: doc.id,
      invoice_id: invoiceId || null,
      template_type: data.templateType || 'BB_VT',
      file_name: data.fileName || 'unnamed_doc',
      download_url: data.downloadUrl || null,
      owner_id: data.ownerId || 'system',
      created_at: formatTimestamp(data.createdAt),
      updated_at: formatTimestamp(data.updatedAt || data.createdAt)
    };

    const { error } = await supabase.from('generated_docs').upsert(mapped);
    if (error) {
      console.error(`❌ Lỗi biên bản ${doc.id}:`, error.message);
    } else {
      successCount++;
    }
  }
  console.log(`✅ Di chuyển thành công ${successCount}/${snapshot.size} biên bản.`);
}

// D. Di chuyển Contracts
async function migrateContracts() {
  console.log('\n--- ✍️ ĐANG DI CHUYỂN DỮ LIỆU HỢP ĐỒNG (contracts) ---');
  const snapshot = await firestore.collection('contracts').get();
  console.log(`Tìm thấy ${snapshot.size} hợp đồng trên Firestore.`);
  
  let successCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Kiểm tra khóa ngoại bên A và bên B
    let partyA = data.partyAId;
    if (partyA) {
      const { data: partner } = await supabase.from('partners').select('id').eq('id', partyA).single();
      if (!partner) partyA = null;
    }
    let partyB = data.partyBId;
    if (partyB) {
      const { data: partner } = await supabase.from('partners').select('id').eq('id', partyB).single();
      if (!partner) partyB = null;
    }

    const mapped = {
      id: doc.id,
      template_id: data.templateId || '',
      party_a_id: partyA || null,
      party_b_id: partyB || null,
      form_data: data.formData || {},
      file_name: data.fileName || 'unnamed_contract',
      owner_id: data.ownerId || 'system',
      created_at: formatTimestamp(data.createdAt),
      updated_at: formatTimestamp(data.updatedAt || data.createdAt)
    };

    const { error } = await supabase.from('contracts').upsert(mapped);
    if (error) {
      console.error(`❌ Lỗi hợp đồng ${doc.id}:`, error.message);
    } else {
      successCount++;
    }
  }
  console.log(`✅ Di chuyển thành công ${successCount}/${snapshot.size} hợp đồng.`);
}

// 3. Hàm kích hoạt tổng thể
async function runMigration() {
  console.log('🚀 BẮT ĐẦU QUÁ TRÌNH DI CHUYỂN DỮ LIỆU SANG SUPABASE...');
  try {
    await migratePartners();
    await migrateInvoices();
    await migrateGeneratedDocs();
    await migrateContracts();
    console.log('\n🌟 QUÁ TRÌNH DI CHUYỂN DỮ LIỆU HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
  } catch (err) {
    console.error('❌ Lỗi hệ thống khi di chuyển dữ liệu:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();
