export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // 转发到主站的 upload API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.cradle.art'}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('上传失败');
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('上传错误:', error);
    return Response.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}