// Service xu ly AI Mistral cho Hop Dong - Hoan toan doc lap voi Invoice
import { ExtractedContractData } from '../types/contractData';

const CONTRACT_EXTRACTION_PROMPT = `
Bạn là một chuyên gia phân tích văn bản Hợp Đồng tài chính tiếng Việt.
Đọc và trích xuất thông tin cấu trúc từ tài liệu hợp đồng.

Điều quan trọng:
- Trả về JSON theo đúng cấu trúc yêu cầu
- Các trường không có dữ liệu hoặc không được đề cập trong văn bản thì để trống "" hoặc null. Không tự bịa thông tin. Ví dụ nếu Bên B là cá nhân, chỉ trích xuất tên cá nhân vào "name", địa chỉ vào "address", số điện thoại vào "phone" (nếu có), các trường doanh nghiệp khác như mã số thuế ("taxCode") hay "representative", "position" thì để trống "".
- Số tiền định dạng số (VD: 100000000)
- Ngày tháng định dạng: DD/MM/YYYY hoặc YYYY-MM-DD
- Trong mục "work.items": Đây là bảng giá trị hợp đồng / danh sách thiết bị / vật tư / đơn giá chi tiết nêu trong hợp đồng. Bạn hãy tự động phát hiện tất cả các cột của bảng này trong văn bản PDF (Ví dụ: "STT", "Tên thiết bị", "Đơn vị tính", "Số lượng", "Đơn giá", "Thành tiền", "Ghi chú",...) và trích xuất danh sách các dòng dữ liệu. 
  * CHÚ Ý: Chỉ điền vào danh sách "work.items" này nếu trong văn bản hợp đồng thực sự có bảng phân rã chi tiết hạng mục công việc/vật tư/thiết bị kèm theo đơn giá/thành tiền cụ thể. Nếu hợp đồng không có bảng chi tiết (chỉ ghi tổng giá trị hoặc liệt kê bằng đoạn văn bản thông thường), hãy để "work.items" là mảng rỗng []. Tuyệt đối không tự tạo/giả lập ra một dòng dữ liệu (ví dụ: gộp tổng giá trị hợp đồng thành 1 dòng công việc với khối lượng = 1 và đơn giá = tổng giá trị).
  * Mỗi dòng dữ liệu trích xuất phải là một đối tượng JSON với các khóa (keys) là tên các cột viết bằng chữ HOA tiếng Việt có dấu đúng như trên bảng tiêu đề của PDF.

Phân loại loại hợp đồng (templateId):
- "HDCM": Hợp đồng thuê ca máy, thuê thiết bị (xe cuốc, xe lu, xe tải, máy đào, xe đào, máy ủi, v.v.)
- "HDTC": Hợp đồng thi công xây dựng, xây lắp, sửa chữa công trình
- "HDNT": Hợp đồng mua ban vật tư, nguyên tắc mua bán hàng hóa, cung cấp dịch vụ chung
Xác định loại dựa vào nội dung, tên hợp đồng, tiêu đề tài liệu.

Trả về JSON chính xác như sau:

{
  "contract": {
    "templateId": "HDCM hoặc HDTC hoặc HDNT",
    "number": "Số hợp đồng (VD: 001/2024/HĐ-BB)",
    "date": "Ngày ký (VD: 15/01/2024)",
    "effectiveDate": "Ngày có hiệu lực",
    "expiredDate": "Ngày hết hạn"
  },
  "parties": {
    "partyA": {
      "name": "Tên công ty hoặc cá nhân bên A",
      "taxCode": "Mã số thuế bên A (nếu có)",
      "address": "Địa chỉ đầy đủ bên A",
      "representative": "Người đại diện",
      "position": "Chức vụ người đại diện",
      "gender": "Nam/Nữ",
      "accountNumber": "Số tài khoản",
      "bankName": "Tên ngân hàng",
      "phone": "Số điện thoại",
      "email": "Email"
    },
    "partyB": {
      "name": "Tên công ty hoặc cá nhân bên B",
      "taxCode": "Mã số thuế bên B (nếu có)",
      "address": "Địa chỉ đầy đủ bên B",
      "representative": "Người đại diện (nếu có)",
      "position": "Chức vụ người đại diện (nếu có)",
      "gender": "Nam/Nữ",
      "accountNumber": "Số tài khoản (nếu có)",
      "bankName": "Tên ngân hàng (nếu có)",
      "phone": "Số điện thoại (nếu có)",
      "email": "Email (nếu có)"
    }
  },
  "project": {
    "name": "Tên dự án/công trình",
    "address": "Địa chỉ dự án",
    "value": 0,
    "valueInWords": "Số tiền bằng chữ"
  },
  "work": {
    "description": "Mô tả nội dung công việc/hành lang thi công",
    "startDate": "Ngày bắt đầu",
    "endDate": "Ngày kết thúc",
    "items": []
  },
  "payment": {
    "method": "Phương thức thanh toán (chuyển khoản/tiền mặt)",
    "term": "Điều khoản thanh toán",
    "advancePercentage": 0,
    "vatRate": 10,
    "values": [
      {
        "type": "Loại giá trị (Ví dụ: Giá trị tạm ứng, Giá trị bảo lãnh thực hiện hợp đồng, Giá trị bảo lãnh tạm ứng, Giá trị bảo hành, Giá trị phạt vi phạm...)",
        "value": 0,
        "valueInWords": "Số tiền bằng chữ của giá trị này",
        "description": "Mô tả chi tiết các tỷ lệ %, điều kiện tạm ứng/bảo lãnh/bảo hành hoặc các nội dung ràng buộc liên quan"
      }
    ]
  },
  "terms": {
    "warranty": "Bảo hành",
    "penalty": "Phạt vi phạm hợp đồng",
    "termination": "Điều khoản chấm dứt",
    "disputeResolution": "Giải quyết tranh chấp",
    "other": "Điều khoản khác"
  },
  "markdownContent": "Toàn bộ nội dung hợp đồng chuyển sang định dạng Markdown. Giữ nguyên cấu trúc phân cấp: dùng # cho tiêu đề chính (tên hợp đồng), ## cho điều khoản lớn (VD: ## Điều 1: Phạm vi công việc), ### cho mục con, - cho danh sách, và | cho bảng. Trích xuất toàn bộ nội dung văn bản, bao gồm tất cả các điều khoản chung, điều khoản các bên, nghĩa vụ, quyền hạn, và mọi điều khoản khác trong hợp đồng."
}

LƯU Ý: Chỉ trả về JSON, không có text khác ngoài JSON.
`;

export async function extractFromContract(file: File, onProgress?: (progress: string) => void): Promise<ExtractedContractData> {
  const logPrefix = `[CONTRACT-AI][${file.name}]`;
  console.log(`${logPrefix} Bat dau quy trinh trich xuat hop dong...`);

  try {
    if (onProgress) onProgress('Đang đọc tệp tin dưới dạng base64...');
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error("Khong the doc tep tin duoi dang base64."));
      reader.readAsDataURL(file);
    });

    const processUrl = '/api/process-contract';

    console.log(`${logPrefix} Gui yeu cau tao nhiem vu toi: ${processUrl}`);
    if (onProgress) onProgress('Đang tải tệp tin lên máy chủ và khởi tạo nhiệm vụ...');

    const res = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data,
        fileType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 
                          file.name.endsWith('.png') ? 'image/png' : 
                          file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? 'image/jpeg' : 'application/pdf'),
        prompt: CONTRACT_EXTRACTION_PROMPT
      })
    });

    if (!res.ok) {
      const responseText = await res.text();
      console.error(`${logPrefix} Loi khoi tao backend (HTTP ${res.status}):`, responseText);
      let errorMsg = "Loi khoi tao tai may chu.";
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.details || errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const initData = await res.json();
    const taskId = initData.taskId;
    console.log(`${logPrefix} Nhiem vu duoc khoi tao, Task ID: ${taskId}`);

    if (onProgress) onProgress('Nhiệm vụ đã được khởi tạo. Đang chờ hàng đợi xử lý...');

    // Vong lap Polling kiem tra trang thai nhiem vu moi 3 giay
    const pollInterval = 3000;
    
    return new Promise<ExtractedContractData>((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const statusRes = await fetch(`/api/process-contract/status/${taskId}`);
          if (!statusRes.ok) {
            const errText = await statusRes.text();
            reject(new Error(errText || 'Lỗi hệ thống khi kiểm tra tiến trình.'));
            return;
          }
          
          const task = await statusRes.json();
          console.log(`${logPrefix} Task ${taskId} status: ${task.status}, progress: ${task.progress}`);
          
          if (task.progress && onProgress) {
            onProgress(task.progress);
          }

          if (task.status === 'success') {
            console.log(`${logPrefix} Task hoan thanh thanh cong.`);
            resolve(task.result);
          } else if (task.status === 'failed') {
            console.error(`${logPrefix} Task bi loi:`, task.error);
            reject(new Error(task.error || 'Nhiệm vụ bóc tách hợp đồng thất bại.'));
          } else {
            // Tiep tuc poll sau pollInterval
            setTimeout(checkStatus, pollInterval);
          }
        } catch (pollErr: any) {
          console.error(`${logPrefix} Loi khi poll trang thai:`, pollErr);
          reject(new Error(`Lỗi kết nối kiểm tra trạng thái: ${pollErr.message}`));
        }
      };

      // Bat dau poll sau 1.5 giay
      setTimeout(checkStatus, 1500);
    });
  } catch (error: any) {
    console.error(`${logPrefix} Loi trich xuat:`, error);
    const message = error.message || "Loi khong xac dinh trong quy trinh boc tach.";
    throw new Error(message);
  }
}

export async function processContractOCR(base64Data: string, fileType: string): Promise<any> {
  const logPrefix = '[CONTRACT-OCR]';
  console.log(`${logPrefix} Khoi dong OCR cho tep ${fileType}`);

  try {
    const res = await fetch('/api/process-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data,
        fileType,
        prompt: CONTRACT_EXTRACTION_PROMPT
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'OCR processing failed');
    }

    const result = await res.json();
    return result;
  } catch (error: any) {
    console.error(`${logPrefix} OCR Error:`, error);
    throw error;
  }
}

export function convertContractDataToFormData(extracted: ExtractedContractData): any {
  const cacGiaTri = extracted.payment?.values || [];
  const cacGiaTriDaLoc = cacGiaTri.map((v: any) => {
    const typeStr = (v.type || '').toLowerCase();
    if (typeStr.includes('giá trị hợp đồng') || typeStr.includes('tổng giá trị')) {
      const desc = (v.description || '').toLowerCase();
      // Neu chua thong tin dac biet, doi ten de tranh trung lap va giu lai thong tin quan trong nhu thue VAT
      if (desc.includes('vat') || desc.includes('thuế') || desc.includes('bao gồm')) {
        return { ...v, type: 'Ghi chú giá trị hợp đồng' };
      }
    }
    return v;
  }).filter((v: any) => {
    const typeStr = (v.type || '').toLowerCase();
    // Loc bo neu la dong trung lap don thuan vi da co dong mac dinh
    if (typeStr.includes('giá trị hợp đồng') || typeStr.includes('tổng giá trị')) {
      return false;
    }
    return true;
  });

  return {
    // Phân loại hợp đồng từ AI
    templateId: extracted.contract?.templateId || '',
    contractNumber: extracted.contract?.number || '',
    contractDate: extracted.contract?.date || '',
    effectiveDate: extracted.contract?.effectiveDate || '',
    expiredDate: extracted.contract?.expiredDate || '',
    value: extracted.project?.value || 0,
    valueInWords: extracted.project?.valueInWords || '',
    currency: 'VND',
    paymentMethod: extracted.payment?.method || '',
    paymentTerm: extracted.payment?.term || '',
    advancePercentage: extracted.payment?.advancePercentage || 0,
    vatRate: extracted.payment?.vatRate || 10,
    partyA: {
      name: extracted.parties?.partyA?.name || '',
      taxCode: extracted.parties?.partyA?.taxCode || '',
      address: extracted.parties?.partyA?.address || '',
      representative: extracted.parties?.partyA?.representative || '',
      position: extracted.parties?.partyA?.position || '',
      gender: extracted.parties?.partyA?.gender || '',
      accountNumber: extracted.parties?.partyA?.accountNumber || '',
      bankName: extracted.parties?.partyA?.bankName || '',
      phone: extracted.parties?.partyA?.phone || '',
      email: extracted.parties?.partyA?.email || ''
    },
    partyB: {
      name: extracted.parties?.partyB?.name || '',
      taxCode: extracted.parties?.partyB?.taxCode || '',
      address: extracted.parties?.partyB?.address || '',
      representative: extracted.parties?.partyB?.representative || '',
      position: extracted.parties?.partyB?.position || '',
      gender: extracted.parties?.partyB?.gender || '',
      accountNumber: extracted.parties?.partyB?.accountNumber || '',
      bankName: extracted.parties?.partyB?.bankName || '',
      phone: extracted.parties?.partyB?.phone || '',
      email: extracted.parties?.partyB?.email || ''
    },
    projectName: extracted.project?.name || '',
    projectAddress: extracted.project?.address || '',
    workDescription: extracted.work?.description || '',
    startDate: extracted.work?.startDate || '',
    endDate: extracted.work?.endDate || '',
    warrantyPeriod: extracted.terms?.warranty || '',
    penaltyClause: extracted.terms?.penalty || '',
    terminationClause: extracted.terms?.termination || '',
    disputeResolution: extracted.terms?.disputeResolution || '',
    otherTerms: extracted.terms?.other || '',
    items: extracted.work?.items || [],
    values: cacGiaTriDaLoc,
    // Noi dung Markdown day du cua hop dong (dung cho tab "Cau truc tai lieu")
    markdownContent: extracted.markdownContent || ''
  };
}
