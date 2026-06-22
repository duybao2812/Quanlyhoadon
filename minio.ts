import { 
  S3Client, 
  PutObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand, 
  CreateBucketCommand, 
  HeadBucketCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// Read configuration from environment variables
let endpoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
let port = process.env.MINIO_PORT || '9000';
let useSSL = process.env.MINIO_USE_SSL === 'true';
let accessKey = process.env.MINIO_ACCESS_KEY || '';
let secretKey = process.env.MINIO_SECRET_KEY || '';
const bucketName = process.env.MINIO_BUCKET || 'quanlyhoadon';

// Check if credentials.json exists and override values dynamically
const credentialsPath = path.join(process.cwd(), 'credentials.json');
if (fs.existsSync(credentialsPath)) {
  try {
    const credsRaw = fs.readFileSync(credentialsPath, 'utf-8');
    const creds = JSON.parse(credsRaw);
    if (creds.accessKey && creds.secretKey) {
      console.log('[MINIO] Found credentials.json. Overriding settings.');
      accessKey = creds.accessKey;
      secretKey = creds.secretKey;
      
      if (creds.url) {
        try {
          const parsedUrl = new URL(creds.url);
          endpoint = parsedUrl.hostname;
          port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
          useSSL = parsedUrl.protocol === 'https:';
        } catch (urlError) {
          // If URL parsing fails, check if url is hostname:port
          const cleanUrl = creds.url.replace(/^(https?:\/\/)?/, '');
          const parts = cleanUrl.split(':');
          endpoint = parts[0];
          port = parts[1] || '9000';
          useSSL = creds.url.startsWith('https://');
        }
      }
    }
  } catch (err: any) {
    console.error('[MINIO] Failed to parse credentials.json:', err.message);
  }
}

let s3Client: S3Client | null = null;
let isConfigured = false;

// Check if credentials are provided
if (accessKey && secretKey) {
  const protocol = useSSL ? 'https' : 'http';
  // If endpoint already includes a protocol, don't prepend it
  const endpointUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://') 
    ? endpoint 
    : `${protocol}://${endpoint}:${port}`;

  console.log(`[MINIO] Initializing client... Endpoint: ${endpointUrl}, Bucket: ${bucketName}`);
  
  s3Client = new S3Client({
    endpoint: endpointUrl,
    region: 'us-east-1', // Required by SDK, but not used by MinIO
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // Crucial for MinIO to work correctly
  });
  isConfigured = true;
} else {
  console.warn('[MINIO] Credentials missing. MinIO storage will run in degraded mode.');
}

/**
 * Check if MinIO client is configured and bucket is initialized
 */
export async function initializeMinio(): Promise<boolean> {
  if (!isConfigured || !s3Client) {
    console.warn('[MINIO] Client is not configured. Skipping initialization.');
    return false;
  }

  try {
    // Check if bucket exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`[MINIO] Bucket "${bucketName}" exists and is ready.`);
      return true;
    } catch (headError: any) {
      // Bucket does not exist, try to create it
      if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
        console.log(`[MINIO] Bucket "${bucketName}" does not exist. Creating it...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`[MINIO] Bucket "${bucketName}" created successfully.`);
        return true;
      }
      throw headError;
    }
  } catch (error: any) {
    console.error('[MINIO] Error during initialization:', error.message || error);
    return false;
  }
}

/**
 * Upload a local file (multer format) to MinIO
 */
export async function uploadToMinio(file: any): Promise<{ key: string; originalName: string; size: number }> {
  if (!isConfigured || !s3Client) {
    throw new Error('Cấu hình MinIO chưa được thiết lập trong biến môi trường (.env).');
  }

  // Fix Vietnamese filename encoding bug in Multer (decodes ISO-8859-1/latin1 back to UTF-8)
  try {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  } catch (err) {
    console.warn('[MINIO] Could not decode filename from latin1:', err);
  }

  // Create a unique key using timestamp to avoid conflicts, preserving extension
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext);
  // Key format: timestamp_originalname
  const key = `${timestamp}_${file.originalname}`;

  try {
    const fileStream = fs.readFileSync(file.path);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype,
    }));

    console.log(`[MINIO] File uploaded successfully: ${key}`);

    // Try to remove temporary file synchronously
    try {
      fs.unlinkSync(file.path);
    } catch (unlinkErr) {
      console.warn(`[MINIO] Could not delete temp file ${file.path}:`, unlinkErr);
    }

    return {
      key,
      originalName: file.originalname,
      size: file.size,
    };
  } catch (error: any) {
    console.error(`[MINIO] Upload error for key ${key}:`, error);
    throw new Error(`Lỗi tải tệp lên MinIO: ${error.message}`);
  }
}

/**
 * List files in the MinIO bucket
 */
export async function listMinioFiles(search?: string): Promise<any[]> {
  if (!isConfigured || !s3Client) {
    return [];
  }

  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
    }));

    const objects = response.Contents || [];
    
    const files = objects.map((obj) => {
      const key = obj.Key || '';
      
      // Parse original name by removing the timestamp prefix
      let originalName = key;
      const underscoreIndex = key.indexOf('_');
      if (underscoreIndex !== -1) {
        const prefix = key.substring(0, underscoreIndex);
        // Ensure prefix is a timestamp (digits only)
        if (/^\d+$/.test(prefix)) {
          originalName = key.substring(underscoreIndex + 1);
        }
      }

      return {
        key,
        originalName,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      };
    });

    // If search term is provided, filter the results
    if (search) {
      const searchLower = search.toLowerCase();
      return files.filter(f => f.originalName.toLowerCase().includes(searchLower));
    }

    // Sort by LastModified desc
    return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  } catch (error: any) {
    console.error('[MINIO] List objects error:', error.message || error);
    throw new Error(`Lỗi lấy danh sách tệp từ MinIO: ${error.message}`);
  }
}

/**
 * Delete file from MinIO
 */
export async function deleteFromMinio(key: string): Promise<boolean> {
  if (!isConfigured || !s3Client) {
    throw new Error('Cấu hình MinIO chưa được thiết lập.');
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    console.log(`[MINIO] File deleted successfully: ${key}`);
    return true;
  } catch (error: any) {
    console.error(`[MINIO] Delete error for key ${key}:`, error);
    throw new Error(`Lỗi xóa tệp khỏi MinIO: ${error.message}`);
  }
}

/**
 * Generate a presigned URL for a file
 */
export async function getMinioPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (!isConfigured || !s3Client) {
    throw new Error('Cấu hình MinIO chưa được thiết lập.');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error: any) {
    console.error(`[MINIO] Generate presigned URL error for key ${key}:`, error);
    throw new Error(`Lỗi tạo link tải tệp: ${error.message}`);
  }
}

/**
 * Get S3 object readable stream for proxying download
 */
export async function getMinioObjectStream(key: string): Promise<{ stream: any; contentType: string; size: number }> {
  if (!isConfigured || !s3Client) {
    throw new Error('Cấu hình MinIO chưa được thiết lập.');
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));

    return {
      stream: response.Body,
      contentType: response.ContentType || 'application/octet-stream',
      size: response.ContentLength || 0,
    };
  } catch (error: any) {
    console.error(`[MINIO] Fetch object stream error for key ${key}:`, error);
    throw new Error(`Lỗi đọc tệp từ MinIO: ${error.message}`);
  }
}
