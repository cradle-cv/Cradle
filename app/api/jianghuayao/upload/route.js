export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: '没有文件' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `jianghuayao/images/${timestamp}-${randomStr}-${file.name}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // R2 信息
    const endpoint = new URL(process.env.R2_ENDPOINT);
    const bucket = process.env.R2_BUCKET_NAME;
    const key = fileName;

    // 上传 URL
    const uploadUrl = `${process.env.R2_ENDPOINT}/${bucket}/${key}`;

    // 直接上传到 R2（用简单的 PUT 请求）
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`R2 上传失败: ${response.statusText}`);
    }

    // 构建公开 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return Response.json({ url: publicUrl });
  } catch (error) {
    console.error('上传错误:', error);
    return Response.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}