import { MAPPING_DATA } from './addressData';

/**
 * Chuẩn hóa chuỗi để so khớp chính xác
 */
function normalizeForMatch(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/tp\./g, 'thành phố')
    .replace(/q\./g, 'quận')
    .replace(/p\./g, 'phường')
    .replace(/h\./g, 'huyện')
    .replace(/x\./g, 'xã')
    .trim();
}

export interface SmartAddressResult {
  detail: string;       // Số nhà, đường
  oldWard: string;      // Phường/Xã cũ
  oldDistrict: string;  // Quận/Huyện cũ
  province: string;     // Tỉnh/Thành phố
  newWard: string;      // Phường/Xã mới (sau khi tra cứu)
  fullAddress: string;  // Địa chỉ đã chuẩn hóa (Bỏ Quận/Huyện)
  oldFullAddress?: string; // Địa chỉ cũ đã format chữ hoa
  isConverted: boolean;
}

/**
 * Viết hoa chữ cái đầu của mỗi từ trong địa chỉ, xử lý cả số nhà phức tạp (ví dụ: B7/2A)
 * Hỗ trợ chuyển tp. -> TP. và t. -> T.
 */
function formatTitleCase(str: string): string {
  if (!str) return "";
  
  // Chuyển về lowercase và xử lý viết hoa sau khoảng trắng, dấu xẹt, dấu gạch ngang hoặc số
  let result = str.toLowerCase().replace(/(^|[\s\/\-\d])([a-zà-ỹáâăéêíóôơúưýđ])/g, (match) => match.toUpperCase());
  
  // Xử lý các từ viết tắt cụ thể
  result = result.replace(/\bTp\./g, "TP.");
  result = result.replace(/\bT\./g, "T.");
  
  // Điều chỉnh riêng cho cụm "Thành Phố" thành "Thành phố" nếu cần theo ví dụ "Thành phố Hồ Chí Minh"
  result = result.replace(/Thành Phố/g, "Thành phố");
  
  return result;
}

/**
 * Chức năng chuyển đổi địa chỉ thông minh (Cũ -> Mới)
 * 1. Trích xuất Phường/Xã, Quận/Huyện, Tỉnh/Thành.
 * 2. Dò tìm trong bảng ánh xạ.
 * 3. Loại bỏ Quận/Huyện khỏi kết quả cuối cùng.
 * 4. Định dạng lại chữ hoa chữ cái đầu theo yêu cầu.
 */
export function smartConvertAddress(input: string): SmartAddressResult {
  const result: SmartAddressResult = {
    detail: "",
    oldWard: "",
    oldDistrict: "",
    province: "",
    newWard: "",
    fullAddress: input,
    isConverted: false
  };

  if (!input || input.trim().length < 8) return result;

  // Tách chuỗi bằng dấu phẩy
  const parts = input.split(',').map(p => p.trim());
  
  // Loại bỏ "Việt Nam" ở cuối nếu có
  if (parts.length > 0 && normalizeForMatch(parts[parts.length - 1]).includes("việt nam")) {
    parts.pop();
  }

  if (parts.length >= 3) {
    // Giả định cấu trúc: [Chi tiết], [Phường/Xã], [Quận/Huyện], [Tỉnh/Thành]
    const provinceOrig = parts[parts.length - 1];
    const districtOrig = parts[parts.length - 2];
    const wardOrig = parts[parts.length - 3];
    const detailParts = parts.slice(0, parts.length - 3);
    const detailOrig = detailParts.join(', ');

    // Áp dụng định dạng chữ hoa ngay từ đầu cho các biến kết quả
    result.province = formatTitleCase(provinceOrig);
    result.oldDistrict = formatTitleCase(districtOrig);
    result.oldWard = formatTitleCase(wardOrig);
    result.detail = formatTitleCase(detailOrig);
    result.newWard = result.oldWard; // Mặc định là phường cũ đã format

    // Tự động chuyển Thừa Thiên Huế -> Thành phố Huế (Giữ chuẩn đặt tên)
    if (normalizeForMatch(provinceOrig).includes("thừa thiên huế")) {
      result.province = "Thành phố Huế";
    }

    // Fix lỗi font tiếng Việt bằng cách normalize NFC
    const normWard = normalizeForMatch(wardOrig.normalize("NFC"));
    const normDistrict = normalizeForMatch(districtOrig.normalize("NFC"));
    const normProvince = normalizeForMatch(provinceOrig.normalize("NFC"));

    // Tạo key để dò tìm (Phuong_Xa_Cu, Quan_Huyen_Cu, Tinh_Thanh_Cu)
    const exactMatchKey = `${normWard}, ${normDistrict}, ${normProvince}`;
    
    // Tìm kiếm tương đối: nếu có cả Phường và Quận khớp trong CSDL thì lấy
    const keys = Object.keys(MAPPING_DATA);
    let matchedKeyStr = keys.find(k => k === exactMatchKey);
    
    if (!matchedKeyStr) {
      matchedKeyStr = keys.find(k => k.includes(normWard) && k.includes(normDistrict));
    }

    if (matchedKeyStr && MAPPING_DATA[matchedKeyStr]) {
      // Nếu tìm thấy trong mapping, lấy giá trị mới và format lại chữ hoa
      result.newWard = formatTitleCase(MAPPING_DATA[matchedKeyStr]);
      result.isConverted = true;
    } else {
      // Ngay cả khi không có trong mapping, vẫn coi là "converted" vì sẽ loại bỏ Quận/Huyện
      result.isConverted = true;
    }

    // Ghép lại chuỗi output: Detail, Phường/Xã mới, Tỉnh/Thành (BỎ QUA Quận/Huyện)
    const finalParts = [];
    if (result.detail) finalParts.push(result.detail);
    if (result.newWard) finalParts.push(result.newWard);
    if (result.province) finalParts.push(result.province);

    result.fullAddress = finalParts.join(', ');

    // Ghép lại địa chỉ cũ đã định dạng (để hiển thị theo yêu cầu)
    const oldFormattedParts = [];
    if (result.detail) oldFormattedParts.push(result.detail);
    if (result.oldWard) oldFormattedParts.push(result.oldWard);
    if (result.oldDistrict) oldFormattedParts.push(result.oldDistrict);
    if (result.province) oldFormattedParts.push(result.province);
    result.oldFullAddress = oldFormattedParts.join(', ');
  }

  return result;
}
