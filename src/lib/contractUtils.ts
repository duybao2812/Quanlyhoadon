
export const formatThousands = (value: string): string => {
  if (!value) return '';
  let str = String(value).trim();
  // Strip thousands separators if there are multiple dots or commas
  if ((str.match(/\./g) || []).length > 1) {
    str = str.replace(/\./g, '');
  }
  if ((str.match(/,/g) || []).length > 1) {
    str = str.replace(/,/g, '');
  }
  // Handle mixed separators (dot and comma)
  if (str.includes('.') && str.includes(',')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // 1.234,56 -> 1234.56
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // 1,234.56 -> 1234.56
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',') && !str.includes('.')) {
    // 1234,56 -> 1234.56
    str = str.replace(/,/g, '.');
  }
  const parsed = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (isNaN(parsed)) return '';
  
  const parts = str.split('.');
  const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: Math.max(decimalPlaces, 3)
  }).format(parsed);
};

export const numberToVietnameseWords = (number: number): string => {
  if (number === 0) return 'Không';

  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const places = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  const readThreeDigits = (num: number, isLast: boolean): string => {
    let res = '';
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const unit = num % 10;

    if (hundred > 0 || !isLast) {
      res += units[hundred] + ' trăm ';
      if (ten === 0 && unit > 0) res += 'lẻ ';
    }

    if (ten > 0) {
      if (ten === 1) res += 'mười ';
      else res += units[ten] + ' mươi ';
    }

    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt ';
      else if (unit === 5 && ten > 0) res += 'lăm ';
      else res += units[unit];
    }

    return res.trim();
  };

  let res = '';
  let i = 0;
  let tempNumber = number;

  while (tempNumber > 0) {
    const group = tempNumber % 1000;
    if (group > 0) {
      const groupStr = readThreeDigits(group, tempNumber < 1000);
      res = groupStr + ' ' + places[i] + ' ' + res;
    }
    tempNumber = Math.floor(tempNumber / 1000);
    i++;
  }

  const finalized = res.trim();
  return finalized.charAt(0).toUpperCase() + finalized.slice(1) + ' đồng';
};
