import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Key,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  Zap,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AgentHubConfig {
  hubUrl: string;
  securityToken: string;
}

interface HubStatus {
  connected: boolean;
  authorized: boolean;
  message?: string;
}

interface Plugin {
  pluginId: string;
  name: string;
  version: string;
  capabilities: string[];
}

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const DEFAULT_CONFIG: AgentHubConfig = {
  hubUrl: 'http://localhost:56789',
  securityToken: 'CHANGE-THIS-TO-SECURE-TOKEN'
};

const STORAGE_KEY = 'agenthub_config';

const loadConfig = (): AgentHubConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load AgentHub config:', e);
  }
  return DEFAULT_CONFIG;
};

const saveConfig = (config: AgentHubConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AgentHub config:', e);
  }
};

export const AgentHubView: React.FC = () => {
  const [config, setConfig] = useState<AgentHubConfig>(loadConfig);
  const [hubStatus, setHubStatus] = useState<HubStatus>({ connected: false, authorized: false });
  const [isChecking, setIsChecking] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfigEditing, setIsConfigEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<AgentHubConfig>(config);
  const [showToken, setShowToken] = useState(false);
  // THEME STATE DE DEBUG PAYLOAD TRUC TIEP TREN GIAO DIEN
  const [debugPayload, setDebugPayload] = useState<any>(null);

  // States cho Google Apps Script (GAS)
  const [activeTab, setActiveTab] = useState<'gas' | 'desktop'>('gas');
  const [supabaseCredentials, setSupabaseCredentials] = useState<{ supabaseUrl: string, supabaseServiceRoleKey: string } | null>(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  useEffect(() => {
    const fetchCredentials = async () => {
      setIsLoadingCredentials(true);
      try {
        const res = await fetch('/api/agenthub/credentials');
        if (res.ok) {
          const data = await res.json();
          setSupabaseCredentials(data);
        }
      } catch (e) {
        console.error('Failed to fetch Supabase credentials for GAS:', e);
      } finally {
        setIsLoadingCredentials(false);
      }
    };
    fetchCredentials();
  }, []);

  const getGasScriptCode = () => {
    const url = supabaseCredentials?.supabaseUrl || "LẤY_TỪ_ENV_HOẶC_BACKEND";
    const key = supabaseCredentials?.supabaseServiceRoleKey || "LẤY_TỪ_ENV_HOẶC_BACKEND";
    return `// Cấu hình kết nối Supabase (Đã tự động điền sẵn)
const SUPABASE_URL = "${url}";
const SUPABASE_SERVICE_ROLE_KEY = "${key}";

const BANK_CODE = "ACB";
const PROCESSED_LABEL = "agenthub-processed";

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('syncBankEmails')
           .timeBased()
           .everyMinutes(5)
           .create();
  
  Logger.log("Đã cài đặt Trigger thành công! Script sẽ tự động chạy mỗi 5 phút.");
  syncBankEmails();
}

function syncBankEmails() {
  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);
  // Tìm kiếm email gửi từ địa chỉ thông báo chính thức của ACB để tránh lọc sai từ khoá
  var searchQuery = 'from:mailalert@acb.com.vn -label:' + PROCESSED_LABEL;
  
  var batchSize = 100;
  var totalProcessed = 0;
  var maxThreadsToProcess = 1000; // Giới hạn tối đa 1000 luồng mỗi lượt chạy trigger nhờ đã tối ưu batching
  var offset = 0;
  
  // Cache để giảm thiểu các cuộc gọi GET/POST thừa thãi
  var ownerCache = {};
  var bankAccountCache = {};
  
  Logger.log("Bắt đầu quét email giao dịch với từ khóa: " + searchQuery);
  
  while (totalProcessed < maxThreadsToProcess) {
    var threads = GmailApp.search(searchQuery, offset, batchSize);
    if (threads.length === 0) {
      Logger.log("Không còn email giao dịch mới nào cần xử lý.");
      break;
    }
    
    Logger.log("Đang xử lý lô " + threads.length + " luồng email (offset: " + offset + ")...");
    
    var bankTxsToInsert = [];
    var tbTxsToInsert = [];
    var threadList = [];
    var failedThreadIds = {};
    
    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      var threadId = thread.getId();
      threadList.push(thread);
      
      var messages = thread.getMessages();
      var threadParseFailed = false;
      var threadBankTxs = [];
      var threadTbTxs = [];
      
      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j];
        var htmlBody = msg.getBody();
        var body = htmlBody ? cleanHtmlToText(htmlBody) : msg.getPlainBody();
        var subject = msg.getSubject();
        var msgId = msg.getId();
        var msgDate = msg.getDate();
        
        try {
          var tx = parseAcbEmail(subject, body, msgId, msgDate);
          if (tx) {
            // Lấy owner_id (có cache)
            var ownerId = ownerCache[tx.accountNumber];
            if (!ownerId) {
              ownerId = getOwnerId(tx.accountNumber) || getFallbackOwnerId();
              if (ownerId) {
                ownerCache[tx.accountNumber] = ownerId;
              }
            }
            
            if (!ownerId) {
              Logger.log("Lỗi: Không tìm thấy owner_id cho tài khoản " + tx.accountNumber);
              threadParseFailed = true;
              break;
            }
            
            // Lấy bank_account_id (có cache)
            var cacheKey = ownerId + "_" + tx.bankCode + "_" + tx.accountNumber;
            var bankAccountId = bankAccountCache[cacheKey];
            if (!bankAccountId) {
              bankAccountId = upsertBankAccount(ownerId, tx.bankCode, tx.accountNumber);
              if (bankAccountId) {
                bankAccountCache[cacheKey] = bankAccountId;
              }
            }
            
            if (!bankAccountId) {
              Logger.log("Lỗi: Không thể khởi tạo/truy vấn bank_account_id cho tài khoản " + tx.accountNumber);
              threadParseFailed = true;
              break;
            }
            
            // Tạo payload tương thích database cho bank_transactions
            var bankTxPayload = {
              "id": tx.id,
              "owner_id": ownerId,
              "bank_account_id": bankAccountId,
              "bank_code": tx.bankCode,
              "account_number": tx.accountNumber,
              "transaction_date": tx.transactionDate,
              "amount": tx.amount,
              "transaction_type": tx.transactionType,
              "balance": tx.balance,
              "description": tx.description,
              "gmail_message_id": tx.gmailMessageId
            };
            
            // Tạo payload tương thích database cho tb_transactions
            var amountIn = tx.transactionType === "CREDIT" ? tx.amount : 0;
            var amountOut = tx.transactionType === "DEBIT" ? tx.amount : 0;
            var tbTxPayload = {
              "id": tx.id,
              "owner_id": ownerId,
              "gateway": tx.bankCode,
              "transaction_date": tx.transactionDate,
              "account_number": tx.accountNumber,
              "sub_account": null,
              "amount_in": amountIn,
              "amount_out": amountOut,
              "accumulated": tx.balance,
              "code": null,
              "content": tx.description,
              "reference_number": tx.id,
              "body": tx.description,
              "match_status": "unmatched"
            };
            
            threadBankTxs.push(bankTxPayload);
            threadTbTxs.push(tbTxPayload);
          }
        } catch (e) {
          Logger.log("Lỗi xử lý email " + msgId + ": " + e.message);
          threadParseFailed = true;
          break;
        }
      }
      
      if (threadParseFailed) {
        failedThreadIds[threadId] = true;
      } else {
        // Gom các giao dịch của luồng này vào danh sách batch insert chung
        for (var t = 0; t < threadBankTxs.length; t++) {
          bankTxsToInsert.push(threadBankTxs[t]);
          tbTxsToInsert.push(threadTbTxs[t]);
        }
      }
    }
    
    // Tiến hành ghi nhận dữ liệu
    var batchSuccess = true;
    if (bankTxsToInsert.length > 0) {
      batchSuccess = insertTransactionsBatch(bankTxsToInsert, tbTxsToInsert);
    }
    
    // Hậu xử lý gán nhãn hoặc fallback
    if (batchSuccess) {
      for (var k = 0; k < threadList.length; k++) {
        var th = threadList[k];
        var thId = th.getId();
        if (!failedThreadIds[thId]) {
          th.addLabel(label);
          Logger.log("Đã đồng bộ thành công và gán nhãn cho luồng: " + thId);
        } else {
          Logger.log("Luồng email lỗi " + thId + " sẽ được bỏ qua và thử lại sau.");
          offset++; // Bỏ qua luồng lỗi trong lượt chạy tiếp theo
        }
      }
    } else {
      Logger.log("Cảnh báo: Lỗi ghi nhận hàng loạt. Đang chuyển sang chế độ fallback ghi nhận từng dòng...");
      for (var k = 0; k < threadList.length; k++) {
        var th = threadList[k];
        var thId = th.getId();
        if (failedThreadIds[thId]) {
          Logger.log("Luồng email lỗi phân tích " + thId + " bị bỏ qua.");
          offset++;
          continue;
        }
        
        // Tìm các giao dịch thuộc luồng này bằng cách so khớp gmail_message_id với tin nhắn trong luồng
        var msgs = th.getMessages();
        var singleThreadSuccess = true;
        
        for (var m = 0; m < msgs.length; m++) {
          var msg = msgs[m];
          var msgId = msg.getId();
          
          var matchedTx = null;
          for (var txIdx = 0; txIdx < bankTxsToInsert.length; txIdx++) {
            if (bankTxsToInsert[txIdx].gmail_message_id === msgId) {
              matchedTx = bankTxsToInsert[txIdx];
              break;
            }
          }
          
          if (matchedTx) {
            var ok = insertSingleTransaction(matchedTx);
            if (!ok) {
              singleThreadSuccess = false;
            }
          }
        }
        
        if (singleThreadSuccess) {
          th.addLabel(label);
          Logger.log("Đã đồng bộ đơn lẻ thành công và gán nhãn cho luồng: " + thId);
        } else {
          Logger.log("Thất bại khi đồng bộ luồng " + thId + ". Sẽ thử lại sau.");
          offset++; // Bỏ qua luồng lỗi trong lượt chạy tiếp theo
        }
      }
    }
    
    totalProcessed += threads.length;
  }
  
  Logger.log("Hoàn thành đợt đồng bộ email. Tổng số luồng đã xử lý: " + totalProcessed);
}

function parseAcbEmail(subject, body, messageId, messageDate) {
  Logger.log("--- Bắt đầu phân tích cú pháp email ID: " + messageId + " ---");
  try {
    // Chuẩn hóa Unicode sang dạng NFC để tránh lỗi ký tự tiếng Việt phân rã (NFD) từ Gmail
    if (body) body = body.normalize("NFC");
    if (subject) subject = subject.normalize("NFC");

    // 1. Tìm số tài khoản bằng từ khóa (tài khoản/tai khoan/account/tk)
    var accMatch = body.match(/(?:tài khoản|tai khoan|account|tk)\\s*:?\\s*(\\d+)/i);
    if (!accMatch) {
      Logger.log("Phân tích thất bại: Không tìm thấy Số tài khoản trong nội dung.");
      return null;
    }
    var accountNumber = accMatch[1];
    Logger.log("Số tài khoản nhận diện: " + accountNumber);

    // 2. Tìm số tiền và loại giao dịch (Ghi nợ/Ghi no/Ghi có/Ghi co/Debit/Credit)
    var amountMatch = body.match(/(Ghi nợ|Ghi no|Ghi có|Ghi co|Debit|Credit)\\s*:?\\s*([+-]?[\\d,.]+)\\s*(?:VND|đ)?/i);
    if (!amountMatch) {
      Logger.log("Phân tích thất bại: Không tìm thấy Số tiền / Loại giao dịch trong nội dung.");
      return null;
    }
    var typeText = amountMatch[1].toLowerCase();
    var transactionType = (typeText.indexOf("có") !== -1 || typeText.indexOf("co") !== -1 || typeText.indexOf("credit") !== -1) ? "CREDIT" : "DEBIT";
    var rawAmount = amountMatch[2].replace(/,/g, "");
    var amount = Math.abs(parseFloat(rawAmount));
    Logger.log("Loại giao dịch: " + transactionType + ", Số tiền: " + amount);

    if (isNaN(amount) || amount === 0) {
      Logger.log("Phân tích thất bại: Số tiền trích xuất không hợp lệ.");
      return null;
    }

    // 3. Tìm số dư bằng từ khóa (Số dư/So du/balance)
    var balanceMatch = body.match(/(?:Số dư|So du|balance)\\s*.*?\\s*([\\d,.]+)\\s*(?:VND|đ)?/i);
    var balance = 0;
    if (balanceMatch) {
      var rawBalance = balanceMatch[1].replace(/,/g, "");
      balance = parseFloat(rawBalance);
      Logger.log("Số dư tài khoản: " + balance);
    } else {
      Logger.log("Thông tin: Không tìm thấy thông tin Số dư (mặc định = 0).");
    }

    // 4. Tìm nội dung giao dịch bằng từ khóa (Nội dung/Nội dung giao dịch/Content)
    var descMatch = body.match(/(?:Nội dung|Nội dung giao dịch|Content)\\s*:\\s*([\\s\\S]*?)(?:\\r?\\n\\r?\\n|Cảm ơn|Thank|$)/i);
    var description = descMatch ? descMatch[1].trim() : "";
    Logger.log("Nội dung giao dịch trích xuất: " + description);
    
    var transactionDate = messageDate ? messageDate.toISOString() : new Date().toISOString();

    return {
      id: "msg_id_" + messageId,
      bankCode: BANK_CODE,
      accountNumber: accountNumber,
      transactionDate: transactionDate,
      amount: amount,
      transactionType: transactionType,
      balance: balance,
      description: description,
      gmailMessageId: messageId
    };
  } catch (err) {
    Logger.log("Lỗi phân tích cú pháp email: " + err.message);
    return null;
  }
}

function getOwnerId(accountNumber) {
  var url = SUPABASE_URL + "/rest/v1/sepay_accounts?account_number=eq." + accountNumber + "&select=owner_id";
  var response = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY
    },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    if (data.length > 0) {
      return data[0].owner_id;
    }
  } else {
    Logger.log("Lỗi getOwnerId (HTTP " + response.getResponseCode() + "): " + response.getContentText());
  }
  return null;
}

function getFallbackOwnerId() {
  var url = SUPABASE_URL + "/rest/v1/invoices?select=owner_id&limit=1";
  var response = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY
    },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    if (data.length > 0) {
      return data[0].owner_id;
    }
  } else {
    Logger.log("Lỗi getFallbackOwnerId (HTTP " + response.getResponseCode() + "): " + response.getContentText());
  }
  return null;
}

function upsertBankAccount(ownerId, bankCode, accountNumber) {
  var url = SUPABASE_URL + "/rest/v1/bank_accounts";
  var payload = {
    "owner_id": ownerId,
    "bank_code": bankCode,
    "account_number": accountNumber,
    "account_name": bankCode + " Account",
    "email_account": "gmail-api@apps-script.local",
    "is_active": true
  };
  
  var response = UrlFetchApp.fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    if (data.length > 0) {
      return data[0].id;
    }
  } else {
    Logger.log("Thông tin: POST bank_accounts không thành công (HTTP " + response.getResponseCode() + "), đang thử GET lại...");
  }
  
  var queryUrl = SUPABASE_URL + "/rest/v1/bank_accounts?owner_id=eq." + ownerId + "&account_number=eq." + accountNumber + "&select=id";
  var qRes = UrlFetchApp.fetch(queryUrl, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY
    },
    muteHttpExceptions: true
  });
  if (qRes.getResponseCode() === 200) {
    var qData = JSON.parse(qRes.getContentText());
    if (qData.length > 0) {
      return qData[0].id;
    }
  } else {
    Logger.log("Lỗi truy vấn bank_accounts (HTTP " + qRes.getResponseCode() + "): " + qRes.getContentText());
  }
  return null;
}

function insertTransactionsBatch(bankTxs, tbTxs) {
  var headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
  };
  
  var success = true;
  
  var bankTxUrl = SUPABASE_URL + "/rest/v1/bank_transactions";
  var response = UrlFetchApp.fetch(bankTxUrl, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify(bankTxs),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 201 && response.getResponseCode() !== 200) {
    Logger.log("Lỗi ghi nhận batch bank_transactions (HTTP " + response.getResponseCode() + "): " + response.getContentText());
    success = false;
  }
  
  var tbTxUrl = SUPABASE_URL + "/rest/v1/tb_transactions";
  var response2 = UrlFetchApp.fetch(tbTxUrl, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify(tbTxs),
    muteHttpExceptions: true
  });
  
  if (response2.getResponseCode() !== 201 && response2.getResponseCode() !== 200) {
    Logger.log("Lỗi ghi nhận batch tb_transactions (HTTP " + response2.getResponseCode() + "): " + response2.getContentText());
    success = false;
  }
  
  return success;
}

function insertSingleTransaction(tx) {
  var headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
  };
  
  var success = true;
  
  var bankTxUrl = SUPABASE_URL + "/rest/v1/bank_transactions";
  var response = UrlFetchApp.fetch(bankTxUrl, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify(tx),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 201 && response.getResponseCode() !== 200) {
    Logger.log("Lỗi ghi nhận đơn lẻ bank_transactions (HTTP " + response.getResponseCode() + "): " + response.getContentText());
    success = false;
  }
  
  var tbTxUrl = SUPABASE_URL + "/rest/v1/tb_transactions";
  var amountIn = tx.transaction_type === "CREDIT" ? tx.amount : 0;
  var amountOut = tx.transaction_type === "DEBIT" ? tx.amount : 0;
  var tbTxPayload = {
    "id": tx.id,
    "owner_id": tx.owner_id,
    "gateway": tx.bank_code,
    "transaction_date": tx.transaction_date,
    "account_number": tx.account_number,
    "sub_account": null,
    "amount_in": amountIn,
    "amount_out": amountOut,
    "accumulated": tx.balance,
    "code": null,
    "content": tx.description,
    "reference_number": tx.id,
    "body": tx.description,
    "match_status": "unmatched"
  };
  var response2 = UrlFetchApp.fetch(tbTxUrl, {
    method: "POST",
    headers: headers,
    payload: JSON.stringify(tbTxPayload),
    muteHttpExceptions: true
  });
  
  if (response2.getResponseCode() !== 201 && response2.getResponseCode() !== 200) {
    Logger.log("Lỗi ghi nhận đơn lẻ tb_transactions (HTTP " + response2.getResponseCode() + "): " + response2.getContentText());
    success = false;
  }
  
  return success;
}

function cleanHtmlToText(html) {
  if (!html) return "";
  
  // 1. Giải mã các thực thể HTML phổ biến (HTML Entities)
  var decoded = html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&middot;/gi, "·")
    .replace(/&iacute;/gi, "í")
    .replace(/&aacute;/gi, "á")
    .replace(/&agrave;/gi, "à")
    .replace(/&atilde;/gi, "ã")
    .replace(/&acirc;/gi, "â")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&oacute;/gi, "ó")
    .replace(/&ograve;/gi, "ò")
    .replace(/&otilde;/gi, "õ")
    .replace(/&ugrave;/gi, "ù")
    .replace(/&uacute;/gi, "ú")
    .replace(/&yacute;/gi, "ý");

  // 2. Giải mã thực thể dạng số thập phân (ví dụ: &#7917; -> ử)
  decoded = decoded.replace(/&#([0-9]+);/g, function(match, dec) {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // 3. Giải mã thực thể dạng thập lục phân (hex)
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, function(match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // 4. Thay thế các thẻ xuống dòng HTML bằng ký tự xuống dòng thực tế
  var text = decoded
    .replace(/<br\\s*\\/?>/gi, "\\n")
    .replace(/<\\/p>/gi, "\\n")
    .replace(/<\\/tr>/gi, "\\n")
    .replace(/<\\/div>/gi, "\\n");

  // 5. Loại bỏ tất cả các thẻ HTML còn lại
  text = text.replace(/<[^>]+>/g, "");

  // 6. Loại bỏ ký tự về đầu dòng thừa
  text = text.replace(/\\r/g, "");
  
  return text;
}
`;
  };

  // CAU HINH THAM SO CHO CAC HANH DONG CUA PLUGIN
  const [echoMessage, setEchoMessage] = useState('Hello Agent Hub!');
  const [printDocName, setPrintDocName] = useState('TestDocument.pdf');
  const [printCopies, setPrintCopies] = useState(1);
  const [scanDocName, setScanDocName] = useState('HoaDonBanHang');
  const [scanStatus, setScanStatus] = useState('Chua thanh toan');
  const [scanDate, setScanDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  });
  const [scanSimulate, setScanSimulate] = useState(true);

  // Cấu hình cho Bank Email Agent
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [isSavingBankConfig, setIsSavingBankConfig] = useState(false);
  const [bankConfigError, setBankConfigError] = useState<string | null>(null);
  const [bankConfigSuccess, setBankConfigSuccess] = useState<string | null>(null);

  // Ẩn/hiện mật khẩu và các trường nhập
  const [showBankPassword, setShowBankPassword] = useState<{[key: number]: boolean}>({});
  const [showBankConfirmPassword, setShowBankConfirmPassword] = useState<{[key: number]: boolean}>({});
  const [bankPasswords, setBankPasswords] = useState<{[key: number]: string}>({});
  const [bankConfirmPasswords, setBankConfirmPasswords] = useState<{[key: number]: string}>({});

  const fetchBankConfig = useCallback(async () => {
    try {
      const execUrl = `${config.hubUrl.replace(/\/$/, '')}/api/execute`;
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': config.securityToken
        },
        body: JSON.stringify({
          pluginId: 'bank-email-agent',
          action: 'get-config',
          data: {}
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          setBankConfig(data.result);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Bank Email Agent config:', e);
    }
  }, [config]);

  useEffect(() => {
    const activePlugin = plugins.find(p => p.pluginId === 'bank-email-agent');
    if (activePlugin && expandedPlugin === activePlugin.name) {
      fetchBankConfig();
    }
  }, [expandedPlugin, plugins, fetchBankConfig]);

  const syncLastEchoMessage = useCallback(async (hubUrl: string, token: string) => {
    console.log("syncLastEchoMessage: Start syncing with hubUrl =", hubUrl, "token =", token);
    try {
      const execUrl = `${hubUrl.replace(/\/$/, '')}/api/execute`;
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': token
        },
        body: JSON.stringify({
          pluginId: 'sample-hardware-plugin',
          action: 'echo',
          data: {}
        }),
        signal: AbortSignal.timeout(3000)
      });
      console.log("syncLastEchoMessage: Response status =", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("syncLastEchoMessage: Received data =", data);
        if (data.success && data.result && data.result.echoedMessage) {
          console.log("syncLastEchoMessage: Setting echoMessage to", data.result.echoedMessage);
          setEchoMessage(data.result.echoedMessage);
        }
      }
    } catch (e) {
      console.error('Failed to sync last echo message:', e);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    setPlugins([]);
    setHubStatus({ connected: false, authorized: false });

    try {
      // Step 1: Check health endpoint (no token required)
      const healthUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status/health`;
      const healthRes = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!healthRes.ok) {
        setHubStatus({
          connected: false,
          authorized: false,
          message: `Health check failed with status ${healthRes.status}`
        });
        setIsChecking(false);
        return;
      }

      // Step 2: Check status endpoint with token
      const statusUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status`;
      const statusRes = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': config.securityToken
        },
        signal: AbortSignal.timeout(5000)
      });

      if (statusRes.status === 401 || statusRes.status === 403) {
        // Tu dong lay token neu ket noi den localhost
        const isLocalhost = config.hubUrl.includes('localhost') || config.hubUrl.includes('127.0.0.1');
        if (isLocalhost) {
          try {
            console.log('Tu dong tai Token tu localhost Backend...');
            const tokenUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status/token`;
            const tokenRes = await fetch(tokenUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000)
            });

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData.token) {
                console.log('Tu dong tai Token thanh cong:', tokenData.token);
                
                // Cap nhat token moi
                const newConfig = {
                  ...config,
                  securityToken: tokenData.token
                };
                
                // Luu vao state va localStorage
                setConfig(newConfig);
                setTempConfig(newConfig);
                saveConfig(newConfig);

                // Thu lai ket noi voi Token moi vua nhan duoc
                const retryRes = await fetch(statusUrl, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': tokenData.token
                  },
                  signal: AbortSignal.timeout(5000)
                });

                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  const parsedPlugins: Plugin[] = [];
                  if (retryData.plugins && Array.isArray(retryData.plugins)) {
                    for (const plugin of retryData.plugins) {
                      parsedPlugins.push({
                        pluginId: plugin.pluginId || plugin.plugin_id || '',
                        name: plugin.name || 'Unknown Plugin',
                        version: plugin.version || '1.0.0',
                        capabilities: plugin.capabilities || plugin.actions || []
                      });
                    }
                  }
                  setPlugins(parsedPlugins);
                  setHubStatus({
                    connected: true,
                    authorized: true,
                    message: retryData.message || 'Connected & Ready (Auto-Authorized)'
                  });
                  syncLastEchoMessage(config.hubUrl, tokenData.token);
                  setIsChecking(false);
                  return;
                }
              }
            }
          } catch (tokenErr) {
            console.error('Tu dong tai Token that bai:', tokenErr);
          }
        }

        setHubStatus({
          connected: true,
          authorized: false,
          message: 'Unauthorized - Invalid or missing token'
        });
        setIsChecking(false);
        return;
      }

      if (!statusRes.ok) {
        setHubStatus({
          connected: true,
          authorized: false,
          message: `Status check failed with status ${statusRes.status}`
        });
        setIsChecking(false);
        return;
      }

      const statusData = await statusRes.json();

      // Parse plugins from response
      const parsedPlugins: Plugin[] = [];
      if (statusData.plugins && Array.isArray(statusData.plugins)) {
        for (const plugin of statusData.plugins) {
          parsedPlugins.push({
            pluginId: plugin.pluginId || plugin.plugin_id || '',
            name: plugin.name || 'Unknown Plugin',
            version: plugin.version || '1.0.0',
            capabilities: plugin.capabilities || plugin.actions || []
          });
        }
      } else if (statusData.capabilities && Array.isArray(statusData.capabilities)) {
        parsedPlugins.push({
          pluginId: 'hub-capabilities',
          name: 'Hub Capabilities',
          version: statusData.version || '1.0.0',
          capabilities: statusData.capabilities
        });
      }

      setPlugins(parsedPlugins);
      setHubStatus({
        connected: true,
        authorized: true,
        message: statusData.message || 'Connected & Ready'
      });
      syncLastEchoMessage(config.hubUrl, config.securityToken);

    } catch (error: any) {
      console.error('Connection check failed:', error);
      let errorMessage = 'Connection failed';

      if (error.name === 'AbortError') {
        errorMessage = 'Connection timeout - Agent Hub may be offline';
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Cannot reach Agent Hub - Please ensure it is running via `dotnet run`';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      setHubStatus({
        connected: false,
        authorized: false,
        message: errorMessage
      });
    }

    setIsChecking(false);
  }, [config]);

  useEffect(() => {
    // Auto-check connection when config changes
    checkConnection();
  }, []);

  const handleSaveConfig = () => {
    saveConfig(tempConfig);
    setConfig(tempConfig);
    setIsConfigEditing(false);
    checkConnection();
  };

  const handleCancelEdit = () => {
    setTempConfig(config);
    setIsConfigEditing(false);
  };

  const executeAction = async (pluginId: string, action: string, payloadData: any = {}) => {
    const result: ActionResult = {
      success: false,
      timestamp: new Date().toISOString()
    };

    // LOG DE DEBUG PAYLOAD GUI DI
    console.log("DEBUG AGENT HUB PAYLOAD:", { pluginId, action, payloadData });
    setDebugPayload({ pluginId, action, payloadData });

    try {
      const execUrl = `${config.hubUrl.replace(/\/$/, '')}/api/execute`;
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': config.securityToken
        },
        body: JSON.stringify({
          pluginId: pluginId,
          action: action,
          data: payloadData
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (response.ok) {
        result.success = true;
        result.data = data;
      } else {
        result.success = false;
        result.error = data.error || `Request failed with status ${response.status}`;
      }
    } catch (error: any) {
      result.success = false;
      result.error = error.message || 'Execution failed';
    }

    setActionResults(prev => [result, ...prev.slice(0, 9)]);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const getStatusBadge = () => {
    if (isChecking) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Loader2 className="size-4 animate-spin text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">Checking...</span>
        </div>
      );
    }

    if (!hubStatus.connected) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <WifiOff className="size-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Disconnected</span>
        </div>
      );
    }

    if (!hubStatus.authorized) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="size-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">Connected - Unauthorized</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle2 className="size-4 text-green-400" />
        <span className="text-green-400 text-sm font-medium">Connected & Ready</span>
      </div>
    );
  };

  const renderJsonBeautifully = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Server className="size-5" />
            </div>
            Agent Hub Settings
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Cấu hình các tác nhân kết nối và tự động hóa đồng bộ giao dịch ngân hàng
          </p>
        </div>
        {activeTab === 'desktop' && getStatusBadge()}
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-sidebar-dark/45 border border-border-dark p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('gas')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'gas'
              ? "bg-primary text-white shadow-md shadow-primary/10"
              : "text-text-dim hover:text-white"
          )}
        >
          <Zap className="size-3.5" />
          Gmail API qua Google Apps Script (Khuyên dùng)
        </button>
        <button
          onClick={() => setActiveTab('desktop')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'desktop'
              ? "bg-primary text-white shadow-md shadow-primary/10"
              : "text-text-dim hover:text-white"
          )}
        >
          <Plug className="size-3.5" />
          Agent Hub Desktop (Local Client)
        </button>
      </div>

      {activeTab === 'gas' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-dark border border-border-dark rounded-2xl p-6 space-y-6"
        >
          {/* Intro Banner */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Zap className="size-5 text-indigo-400 animate-pulse" />
                Đồng bộ Gmail API qua Google Apps Script
              </h2>
              <p className="text-text-dim text-xs max-w-2xl leading-relaxed">
                Giải pháp chạy trực tiếp trên đám mây của Google giúp đồng bộ email giao dịch ngân hàng (ACB) về hệ thống 24/7 hoàn toàn miễn phí, không cần cài đặt Google Cloud Console và hoạt động độc lập không phụ thuộc máy tính cá nhân.
              </p>
            </div>
            <a
              href="https://script.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/10 flex items-center gap-2 self-start md:self-auto shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Mở Google Apps Script
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span className="size-6 rounded-full bg-sidebar-dark border border-border-dark flex items-center justify-center text-xs font-extrabold text-indigo-400">1</span>
                Tạo Dự án Apps Script mới
              </h3>
              <p className="text-text-dim text-xs pl-8">
                Click vào nút <strong>Mở Google Apps Script</strong> phía trên, đăng nhập bằng tài khoản Gmail của bạn (nơi nhận thông báo biến động số dư ACB), sau đó chọn <strong>New Project (Dự án mới)</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="size-6 rounded-full bg-sidebar-dark border border-border-dark flex items-center justify-center text-xs font-extrabold text-indigo-400">2</span>
                  Sao chép mã nguồn bên dưới
                </h3>
                <button
                  onClick={() => copyToClipboard(getGasScriptCode(), 'gas-code')}
                  className="px-3 py-1.5 bg-sidebar-dark hover:bg-border-dark border border-border-dark rounded-xl text-xs text-text-dim hover:text-white transition-colors flex items-center gap-1.5 font-bold"
                >
                  {copiedId === 'gas-code' ? (
                    <>
                      <Check className="size-3.5 text-green-400" />
                      Đã copy thành công!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Sao chép toàn bộ code
                    </>
                  )}
                </button>
              </div>
              <p className="text-text-dim text-xs pl-8">
                Xóa hết code mặc định trong file <code className="bg-sidebar-dark px-1.5 py-0.5 rounded text-white font-mono">Code.gs</code> của Apps Script, sau đó dán toàn bộ đoạn mã này vào. Thông tin Supabase URL và Service Role Key đã được tự động điền cấu hình chính xác cho bạn:
              </p>
              
              <div className="pl-8">
                {isLoadingCredentials ? (
                  <div className="h-64 bg-sidebar-dark/40 border border-border-dark rounded-2xl flex flex-col items-center justify-center text-text-dim text-xs space-y-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span>Đang tải thông tin kết nối Supabase bảo mật...</span>
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-border-dark bg-sidebar-dark/45 overflow-hidden">
                    <pre className="p-4 text-xs font-mono text-text-dim overflow-x-auto max-h-96 leading-relaxed select-all">
                      {getGasScriptCode()}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span className="size-6 rounded-full bg-sidebar-dark border border-border-dark flex items-center justify-center text-xs font-extrabold text-indigo-400">3</span>
                Lưu và Kích hoạt Trigger tự động
              </h3>
              <div className="text-text-dim text-xs pl-8 space-y-2 leading-relaxed">
                <p>
                  1. Click biểu tượng <strong>Save (Lưu project - hình đĩa mềm)</strong> hoặc ấn <kbd className="bg-sidebar-dark px-1 py-0.5 rounded text-white font-mono">Ctrl + S</kbd>.
                </p>
                <p>
                  2. Tại thanh công cụ phía trên, chọn hàm <strong><code className="bg-sidebar-dark px-1.5 py-0.5 rounded text-white font-mono font-bold">setupTrigger</code></strong> từ danh sách dropdown và click <strong>Run (Chạy)</strong>.
                </p>
                <p>
                  3. Một cửa sổ uỷ quyền sẽ hiện ra. Chọn tài khoản Gmail của bạn, click <strong>Advanced (Nâng cao)</strong> &rarr; click <strong>Go to Untitled project (Unsafe)</strong> &rarr; Click <strong>Allow (Cho phép)</strong> để cấp quyền cho Script đọc email ngân hàng và thực hiện kết nối mạng đến Supabase.
                </p>
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-green-400/90 text-xs">
                  <strong>💡 Lưu ý:</strong> Hàm <code className="font-bold">setupTrigger</code> chỉ cần chạy <strong>duy nhất 1 lần</strong>. Hàm này sẽ tự động lên lịch chạy định kỳ mỗi 5 phút một lần để tự động quét email và đồng bộ vào hệ thống.
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-2 border-t border-border-dark pt-5">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Zap className="size-4 text-indigo-400 animate-pulse" />
                Cơ chế chống trùng lặp & Bảo mật
              </h3>
              <div className="text-text-dim text-xs pl-8 space-y-1 leading-relaxed">
                <p>- Mỗi luồng email giao dịch sau khi quét và import thành công sẽ được gán nhãn <strong><code className="bg-sidebar-dark px-1.5 py-0.5 rounded text-white font-mono">agenthub-processed</code></strong> trong Gmail của bạn. Những lần quét sau script sẽ tự động bỏ qua.</p>
                <p>- Khóa chính của giao dịch được liên kết trực tiếp với ID email gốc. Nếu có trùng lặp xảy ra, database sẽ tự động chặn hoặc ghi đè an toàn (UPSERT), loại bỏ hoàn toàn khả năng bị lệch số dư.</p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Configuration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
          >
        <div
          className="flex items-center justify-between p-4 border-b border-border-dark cursor-pointer"
          onClick={() => !isConfigEditing && setIsConfigEditing(!isConfigEditing)}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
              <Settings2 className="size-5 text-text-dim" />
            </div>
            <div>
              <h2 className="text-white font-bold">Connection Configuration</h2>
              <p className="text-text-dim text-sm">Hub URL and Security Token</p>
            </div>
          </div>
          {isConfigEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm font-medium text-text-dim hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <ChevronDown className={cn("size-5 text-text-dim transition-transform", isConfigEditing && "rotate-180")} />
          )}
        </div>

        <AnimatePresence>
          {isConfigEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-dim">
                      <Server className="size-4" />
                      Agent Hub URL
                    </label>
                    <input
                      type="url"
                      value={tempConfig.hubUrl}
                      onChange={(e) => setTempConfig(prev => ({ ...prev, hubUrl: e.target.value }))}
                      className="w-full px-4 py-3 bg-sidebar-dark border border-border-dark rounded-xl text-white placeholder-text-dim/50 focus:outline-none focus:border-primary transition-colors"
                      placeholder="http://localhost:56789"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-dim">
                      <Key className="size-4" />
                      Security Token (X-Agent-Token)
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={tempConfig.securityToken}
                        onChange={(e) => setTempConfig(prev => ({ ...prev, securityToken: e.target.value }))}
                        className="w-full px-4 py-3 pr-12 bg-sidebar-dark border border-border-dark rounded-xl text-white placeholder-text-dim/50 focus:outline-none focus:border-primary transition-colors"
                        placeholder="CHANGE-THIS-TO-SECURE-TOKEN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-white transition-colors"
                        title={showToken ? "áº¨n token" : "Hiá»‡n token"}
                      >
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={checkConnection}
                    disabled={isChecking}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                      "bg-primary text-white hover:bg-primary-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isChecking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Check Connection
                  </button>

                  {hubStatus.message && !hubStatus.authorized && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <AlertTriangle className="size-4" />
                      {hubStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Plugins & Capabilities */}
      {hubStatus.connected && hubStatus.authorized && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-3">
              <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
                <Plug className="size-5 text-text-dim" />
              </div>
              Available Plugins & Capabilities
            </h2>
          </div>

          <div className="p-4 space-y-3">
            {plugins.length === 0 ? (
              <div className="text-center py-8 text-text-dim">
                <Plug className="size-12 mx-auto mb-3 opacity-50" />
                <p>No plugins available</p>
              </div>
            ) : (
              plugins.map((plugin, index) => (
                <div key={index} className="border border-border-dark rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPlugin(expandedPlugin === plugin.name ? null : plugin.name)}
                    className="w-full flex items-center justify-between p-4 bg-sidebar-dark hover:bg-sidebar-dark/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <Zap className="size-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-white font-bold">{plugin.name}</h3>
                        <p className="text-text-dim text-sm">v{plugin.version}</p>
                      </div>
                    </div>
                    {expandedPlugin === plugin.name ? (
                      <ChevronDown className="size-5 text-text-dim" />
                    ) : (
                      <ChevronRight className="size-5 text-text-dim" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedPlugin === plugin.name && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-text-dim mb-2 flex items-center gap-2">
                              <Zap className="size-4" />
                              Actions
                            </h4>
                            <div className="space-y-3">
                              {plugin.capabilities.map((cap, capIndex) => {
                                if (cap === 'echo') {
                                  return (
                                    <div key={capIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                      <button
                                        onClick={() => executeAction(plugin.pluginId, cap, { message: echoMessage })}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0",
                                          "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                                        )}
                                      >
                                        echo
                                      </button>
                                      <div className="flex-1 flex items-center gap-2">
                                        <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Tin nhắn:</span>
                                        <input
                                          type="text"
                                          value={echoMessage}
                                          onChange={(e) => setEchoMessage(e.target.value)}
                                          className="flex-1 px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                          placeholder="Nhập tin nhắn..."
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (cap === 'simulate-print') {
                                  return (
                                    <div key={capIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                      <button
                                        onClick={() => executeAction(plugin.pluginId, cap, { documentName: printDocName, copies: printCopies })}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0",
                                          "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                                        )}
                                      >
                                        simulate-print
                                      </button>
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                        <div className="flex items-center gap-2">
                                          <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Tên file:</span>
                                          <input
                                            type="text"
                                            value={printDocName}
                                            onChange={(e) => setPrintDocName(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                            placeholder="Tên tài liệu..."
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Số bản in:</span>
                                          <input
                                            type="number"
                                            value={printCopies}
                                            onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
                                            className="w-16 px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                            min="1"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (cap === 'start-scan') {
                                  return (
                                    <div key={capIndex} className="flex flex-col gap-3 p-4 bg-sidebar-dark/45 rounded-xl border border-border-dark space-y-2">
                                      <div className="flex items-center justify-between border-b border-border-dark pb-2 mb-2">
                                        <button
                                          onClick={() => executeAction(plugin.pluginId, cap, {
                                            documentName: scanDocName,
                                            status: scanStatus,
                                            date: scanDate,
                                            simulate: scanSimulate
                                          })}
                                          className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0",
                                            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 flex items-center gap-2"
                                          )}
                                        >
                                          <Zap className="size-4" />
                                          Bắt đầu Quét (start-scan)
                                        </button>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            id="chk_scanSimulate"
                                            checked={scanSimulate}
                                            onChange={(e) => setScanSimulate(e.target.checked)}
                                            className="size-4 accent-indigo-600 rounded"
                                          />
                                          <label htmlFor="chk_scanSimulate" className="text-text-dim text-xs font-bold uppercase cursor-pointer">Chế độ giả lập (Simulation)</label>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Tên tài liệu:</span>
                                          <input
                                            type="text"
                                            value={scanDocName}
                                            onChange={(e) => setScanDocName(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="Tên tài liệu..."
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Trạng thái:</span>
                                          <input
                                            type="text"
                                            value={scanStatus}
                                            onChange={(e) => setScanStatus(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="Trạng thái (Hủy/Bị thay thế sẽ bị chặn)..."
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Ngày (DDMMYYYY):</span>
                                          <input
                                            type="text"
                                            value={scanDate}
                                            onChange={(e) => setScanDate(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="DDMMYYYY"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={capIndex} className="flex items-center justify-between p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                    <button
                                      onClick={() => executeAction(plugin.pluginId, cap, {})}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        "bg-primary/10 text-primary border border-primary/20",
                                        "hover:bg-primary/20 hover:border-primary/40"
                                      )}
                                    >
                                      {cap}
                                    </button>
                                    <span className="text-text-dim text-xs italic">Không yêu cầu tham số</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {plugin.pluginId === 'bank-email-agent' && (
                            <div className="mt-4 p-4 bg-sidebar-dark/45 border border-border-dark rounded-xl space-y-6">
                              {!bankConfig ? (
                                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                  <p className="text-text-dim text-xs">Cấu hình chưa được tải tự động từ Agent Hub hoặc Agent Hub đang ngoại tuyến.</p>
                                  <button
                                    type="button"
                                    onClick={fetchBankConfig}
                                    className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    <RefreshCw className="size-3.5" />
                                    Tải Cấu Hình
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between border-b border-border-dark pb-3">
                                <div>
                                  <h4 className="text-white font-bold text-sm">Cấu hình Bank Email Agent</h4>
                                  <p className="text-text-dim text-xs mt-1">Quản lý tài khoản IMAP và các cài đặt đồng bộ</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={fetchBankConfig}
                                  className="p-1.5 bg-sidebar-dark hover:bg-border-dark border border-border-dark rounded-lg text-text-dim hover:text-white transition-colors"
                                  title="Làm mới cấu hình"
                                >
                                  <RefreshCw className="size-4" />
                                </button>
                              </div>

                              {/* Banners thông báo */}
                              {bankConfigError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-400 flex items-center gap-2">
                                  <AlertTriangle className="size-4 shrink-0" />
                                  <span>{bankConfigError}</span>
                                </div>
                              )}
                              {bankConfigSuccess && (
                                <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-lg text-xs text-green-400 flex items-center gap-2">
                                  <CheckCircle2 className="size-4 shrink-0" />
                                  <span>{bankConfigSuccess}</span>
                                </div>
                              )}

                              {/* Form cấu hình */}
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-dim uppercase">Chu kỳ quét email (Giây)</label>
                                    <input
                                      type="number"
                                      value={bankConfig.checkIntervalSeconds}
                                      onChange={(e) => setBankConfig((prev: any) => ({ ...prev, checkIntervalSeconds: parseInt(e.target.value) || 60 }))}
                                      className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                      min="10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-dim uppercase">Endpoint đồng bộ Web App</label>
                                    <input
                                      type="text"
                                      value={bankConfig.webAppEndpoint}
                                      onChange={(e) => setBankConfig((prev: any) => ({ ...prev, webAppEndpoint: e.target.value }))}
                                      className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                  <h5 className="text-xs font-bold text-text-dim uppercase border-b border-border-dark pb-1.5 flex justify-between items-center">
                                    Danh sách tài khoản IMAP
                                  </h5>
                                  
                                  {bankConfig.accounts.map((account: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-sidebar-dark/60 border border-border-dark rounded-xl space-y-4 relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedAccounts = bankConfig.accounts.filter((_: any, i: number) => i !== idx);
                                          setBankConfig((prev: any) => ({ ...prev, accounts: updatedAccounts }));
                                        }}
                                        className="absolute top-3 right-4 text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                                      >
                                        Xóa tài khoản
                                      </button>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-text-dim uppercase">Email address</label>
                                          <input
                                            type="email"
                                            value={account.email}
                                            onChange={(e) => {
                                              const updated = [...bankConfig.accounts];
                                              updated[idx].email = e.target.value;
                                              setBankConfig((prev: any) => ({ ...prev, accounts: updated }));
                                            }}
                                            className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                            placeholder="user@example.com"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-text-dim uppercase">IMAP Host</label>
                                          <input
                                            type="text"
                                            value={account.imapHost}
                                            onChange={(e) => {
                                              const updated = [...bankConfig.accounts];
                                              updated[idx].imapHost = e.target.value;
                                              setBankConfig((prev: any) => ({ ...prev, accounts: updated }));
                                            }}
                                            className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                            placeholder="imap.gmail.com"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-text-dim uppercase">IMAP Port</label>
                                          <input
                                            type="number"
                                            value={account.imapPort}
                                            onChange={(e) => {
                                              const updated = [...bankConfig.accounts];
                                              updated[idx].imapPort = parseInt(e.target.value) || 993;
                                              setBankConfig((prev: any) => ({ ...prev, accounts: updated }));
                                            }}
                                            className="w-full px-3 py-2 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-text-dim uppercase">Mật khẩu mới (App Password)</label>
                                          <div className="relative">
                                            <input
                                              type={showBankPassword[idx] ? "text" : "password"}
                                              value={bankPasswords[idx] !== undefined ? bankPasswords[idx] : (account.password === '********' ? '********' : '')}
                                              onChange={(e) => {
                                                setBankPasswords(prev => ({ ...prev, [idx]: e.target.value }));
                                              }}
                                              className="w-full px-3 py-2 pr-10 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                              placeholder="Để trống nếu không đổi..."
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setShowBankPassword(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-white transition-colors"
                                            >
                                              {showBankPassword[idx] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                            </button>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-text-dim uppercase">Nhập lại mật khẩu mới</label>
                                          <div className="relative">
                                            <input
                                              type={showBankConfirmPassword[idx] ? "text" : "password"}
                                              value={bankConfirmPasswords[idx] !== undefined ? bankConfirmPasswords[idx] : (account.password === '********' ? '********' : '')}
                                              onChange={(e) => {
                                                setBankConfirmPasswords(prev => ({ ...prev, [idx]: e.target.value }));
                                              }}
                                              className="w-full px-3 py-2 pr-10 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary font-semibold"
                                              placeholder="Nhập lại mật khẩu để đổi..."
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setShowBankConfirmPassword(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-white transition-colors"
                                            >
                                              {showBankConfirmPassword[idx] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1">
                                        <input
                                          type="checkbox"
                                          id={`chk_acc_enabled_${idx}`}
                                          checked={account.enabled}
                                          onChange={(e) => {
                                            const updated = [...bankConfig.accounts];
                                            updated[idx].enabled = e.target.checked;
                                            setBankConfig((prev: any) => ({ ...prev, accounts: updated }));
                                          }}
                                          className="size-4 accent-primary rounded"
                                        />
                                        <label htmlFor={`chk_acc_enabled_${idx}`} className="text-[10px] font-bold text-text-dim uppercase cursor-pointer">
                                          Kích hoạt đồng bộ tài khoản này
                                        </label>
                                      </div>
                                    </div>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newAcc = { email: '', imapHost: 'imap.gmail.com', imapPort: 993, password: '', enabled: true };
                                      setBankConfig((prev: any) => ({ ...prev, accounts: [...prev.accounts, newAcc] }));
                                    }}
                                    className="w-full py-2.5 bg-sidebar-dark hover:bg-border-dark border border-dashed border-border-dark rounded-xl text-xs font-bold text-text-dim hover:text-white transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>+ Thêm tài khoản IMAP mới</span>
                                  </button>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-dark">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setIsSavingBankConfig(true);
                                      setBankConfigError(null);
                                      setBankConfigSuccess(null);

                                      // Validation
                                      for (let i = 0; i < bankConfig.accounts.length; i++) {
                                        const acc = bankConfig.accounts[i];
                                        if (!acc.email) {
                                          setBankConfigError(`Tài khoản #${i + 1} chưa điền Email.`);
                                          setIsSavingBankConfig(false);
                                          return;
                                        }
                                        
                                        const typedPass = bankPasswords[i];
                                        const confirmPass = bankConfirmPasswords[i];

                                        if (typedPass !== undefined && typedPass !== '') {
                                          if (typedPass !== confirmPass) {
                                            setBankConfigError(`Mật khẩu xác nhận tài khoản ${acc.email} không khớp.`);
                                            setIsSavingBankConfig(false);
                                            return;
                                          }
                                          acc.password = typedPass;
                                        }
                                      }

                                      try {
                                        const execUrl = `${config.hubUrl.replace(/\/$/, '')}/api/execute`;
                                        const response = await fetch(execUrl, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'X-Agent-Token': config.securityToken
                                          },
                                          body: JSON.stringify({
                                            pluginId: 'bank-email-agent',
                                            action: 'update-config',
                                            data: bankConfig
                                          }),
                                          signal: AbortSignal.timeout(10000)
                                        });

                                        const data = await response.json();
                                        if (response.ok && data.success) {
                                          setBankConfigSuccess("Cấu hình tài khoản ngân hàng đã lưu thành công!");
                                          setBankPasswords({});
                                          setBankConfirmPasswords({});
                                          fetchBankConfig();
                                        } else {
                                          setBankConfigError(data.error || "Gửi cấu hình thất bại.");
                                        }
                                      } catch (e: any) {
                                        setBankConfigError(e.message || "Lỗi kết nối khi gửi cấu hình.");
                                      } finally {
                                        setIsSavingBankConfig(false);
                                      }
                                    }}
                                    disabled={isSavingBankConfig}
                                    className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    {isSavingBankConfig && <Loader2 className="size-4 animate-spin" />}
                                    Lưu Cấu Hình
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                          </div>
                        )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Hien thi debug payload gui di */}
      {debugPayload && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-400 font-mono">
          [DEBUG] Last Payload: {JSON.stringify(debugPayload)}
        </div>
      )}

      {/* Action Results Log */}
      {actionResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-3">
              <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
                <Terminal className="size-5 text-text-dim" />
              </div>
              Action Results
              <span className="text-text-dim text-sm font-normal">({actionResults.length})</span>
            </h2>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {actionResults.map((result, index) => {
              const resultId = `${result.timestamp}-${index}`;
              return (
                <div
                  key={resultId}
                  className={cn(
                    "border rounded-xl overflow-hidden",
                    result.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <div className="flex items-center justify-between p-3 border-b border-border-dark bg-sidebar-dark/50">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="size-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="size-4 text-red-400" />
                      )}
                      <span className={cn("text-sm font-medium", result.success ? "text-green-400" : "text-red-400")}>
                        {result.success ? 'Success' : 'Error'}
                      </span>
                      <span className="text-text-dim text-xs">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(renderJsonBeautifully(result.success ? result.data : result.error), resultId)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === resultId ? (
                        <Check className="size-4 text-green-400" />
                      ) : (
                        <Copy className="size-4 text-text-dim" />
                      )}
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {result.success && result.data?.result?.base64Data && (
                      <div className="border border-border-dark rounded-lg overflow-hidden max-w-md bg-black/40 p-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Ảnh quét xem trước (Preview):</p>
                        <img 
                          src={`data:image/jpeg;base64,${result.data.result.base64Data}`} 
                          alt="Scanned Document Preview" 
                          className="w-full h-auto rounded border border-border-dark object-contain max-h-64"
                        />
                      </div>
                    )}
                    <pre className="text-xs text-text-dim font-mono whitespace-pre-wrap break-all">
                      {result.success ? renderJsonBeautifully(result.data) : result.error}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Troubleshooting Tips */}
      {!hubStatus.connected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold">Troubleshooting Tips</h3>
              <ul className="text-sm text-text-dim space-y-1">
                <li>â€¢ Make sure the Agent Hub is running: run <code className="bg-sidebar-dark px-2 py-0.5 rounded">dotnet run</code> on your PC</li>
                <li>â€¢ Check if the Hub URL is correct (default: http://localhost:56789)</li>
                <li>â€¢ Verify CORS is enabled on the Agent Hub server</li>
                <li>â€¢ Ensure the Security Token matches the one configured in your Hub</li>
                <li>â€¢ Check your firewall settings to allow connections to the Hub port</li>
              </ul>
              <a
                href={config.hubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                Open Hub in browser
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
        </>
      )}
    </div>
  );
};
