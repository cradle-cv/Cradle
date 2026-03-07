import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 初始化 R2 客户端
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: '没有文件' }, { status: 400 });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `jianghuayao/images/${timestamp}-${randomStr}-${file.name}`;

    // 转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到 R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // 构建公开 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    return Response.json({ url: publicUrl });
  } catch (error) {
    console.error('R2 上传错误:', error);
    return Response.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}