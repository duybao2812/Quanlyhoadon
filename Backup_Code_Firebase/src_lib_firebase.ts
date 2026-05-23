import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence,
  browserPopupRedirectResolver
} from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "@/firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Sử dụng initializeFirestore thay vì getFirestore để có thể cấu hình experimentalForceLongPolling
// Điều này giúp vượt qua các vấn đề về gRPC/Tường lửa trong môi trường local/Electron
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Custom Auth initialization for Electron compatibility
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    // Thử lấy một document mẫu để kiểm tra kết nối
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("✅ Firebase connected successfully");
  } catch (error: any) {
    console.error("❌ Firebase Connection Error:", error.message);
    if (error.message.includes('the client is offline') || error.message.includes('Could not reach Cloud Firestore backend')) {
      console.error("Gợi ý: Kiểm tra kết nối mạng hoặc cấu hình Database ID trong firebase-applet-config.json");
    }
  }
}
testConnection();
