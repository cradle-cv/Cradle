import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PUT - 更新文章
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    console.log('更新文章 ID:', id);

    const body = await request.json();

    const { data, error } = await supabase
      .from('jianghuayao_articles')
      .update({
        title: body.title,
        subtitle: body.subtitle || null,
        excerpt: body.excerpt || null,
        content: body.content || null,
        image: body.image || null,
        year: body.year || new Date().getFullYear().toString(),
        related_type: body.relatedType,
        type: body.type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase 更新错误:', error);
      throw new Error(`更新失败: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return Response.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    console.log('文章更新成功');
    return Response.json(data[0]);
  } catch (error) {
    console.error('PUT /api/jianghuayao/articles/[id] 错误:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除文章
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log('删除文章 ID:', id);

    const { error } = await supabase
      .from('jianghuayao_articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase 删除错误:', error);
      throw new Error(`删除失败: ${error.message}`);
    }

    console.log('文章删除成功');
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/jianghuayao/articles/[id] 错误:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}