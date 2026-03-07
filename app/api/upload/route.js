import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from('jianghuayao-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data: publicUrl } = supabase.storage
      .from('jianghuayao-images')
      .getPublicUrl(fileName);

    return Response.json({ url: publicUrl.publicUrl });
  } catch (error) {
    console.error('上传错误:', error);
    return Response.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}