export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: '没有文件' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${randomStr}-${file.name}`;

    // Cloudflare R2 信息
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

    // 构建 R2 上传 URL
    const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/jianghuayao/images/${fileName}`;

    // 获取文件内容
    const buffer = await file.arrayBuffer();

    // 上传到 R2（使用 S3 兼容 API）
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}`,
      },
      body: buffer,
    });

    if (!response.ok) {
      console.error('R2 上传错误:', response.statusText);
      
      // 如果 AWS 签名方式失败，尝试简单上传
      const simpleResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer,
      });

      if (!simpleResponse.ok) {
        throw new Error('R2 上传失败');
      }
    }

    // 构建公开 URL
    const publicUrl = `${R2_PUBLIC_URL}/jianghuayao/images/${fileName}`;

    return Response.json({ url: publicUrl });
  } catch (error) {
    console.error('上传错误:', error);
    return Response.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}