import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request) {
  try {
    console.log('=== 开始处理上传请求 ===');
    
    // 1. 检查环境变量
    console.log('环境变量检查:');
    console.log('CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ 已设置' : '❌ 未设置');
    console.log('CLOUDFLARE_ACCESS_KEY_ID:', process.env.CLOUDFLARE_ACCESS_KEY_ID ? '✅ 已设置' : '❌ 未设置');
    console.log('CLOUDFLARE_SECRET_ACCESS_KEY:', process.env.CLOUDFLARE_SECRET_ACCESS_KEY ? '✅ 已设置' : '❌ 未设置');
    console.log('CLOUDFLARE_R2_BUCKET:', process.env.CLOUDFLARE_R2_BUCKET || '❌ 未设置');
    console.log('CLOUDFLARE_R2_PUBLIC_URL:', process.env.CLOUDFLARE_R2_PUBLIC_URL || '❌ 未设置');

    // 2. 检查文件
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: '没有上传文件' }, { status: 400 });
    }

    console.log('文件信息:', file.name, file.type, file.size);

    // 3. 初始化 S3 客户端
    const endpoint = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    console.log('R2 Endpoint:', endpoint);

    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      },
      endpoint: endpoint,
    });

    console.log('S3 客户端初始化成功');

    // 4. 读取文件
    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const filename = `jianghuayao/images/${timestamp}-${random}.${ext}`;

    console.log('准备上传到:', filename);

    // 5. 上传到 R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
        Key: filename,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
      })
    );

    console.log('✅ 文件上传到 R2 成功');

    // 6. 生成公开 URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filename}`;
    console.log('公开 URL:', publicUrl);

    return Response.json({
      filename,
      url: publicUrl,
      size: buffer.byteLength,
    }, { status: 201 });
  } catch (error) {
    console.error('❌ 上传错误详情:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}