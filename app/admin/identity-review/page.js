// ═══════════════════════════════════════════════════════════════
// 补丁说明 - 给 /app/admin/identity-review/page.js 打补丁
// 
// 目标:
// - 艺术家申请的审核区新增两个按钮
//   - "转为驻地创作者"(温柔拒绝 + 授予 resident)
//   - "完全拒绝"(hard reject)
// - 其他申请类型(curator / partner)保持原有 review_identity_application 流程
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// 1. 新的处理函数(加到组件 body 里)
// ─────────────────────────────────────────────

async function handleRejectAsResident(applicationId) {
  const note = window.prompt(
    '可选:向申请者说明未通过原因(会附在站内信中,留空则只发默认温柔文案)',
    ''
  )
  // 允许留空
  const confirmed = window.confirm(
    '将:\n' +
    '1. 将此申请标记为未通过\n' +
    '2. 授予申请者 "驻地创作者" 身份\n' +
    '3. 发送温柔的站内信\n\n' +
    '确定继续吗?'
  )
  if (!confirmed) return

  try {
    const { error } = await supabase.rpc('admin_reject_as_resident', {
      p_application_id: applicationId,
      p_admin_note: note?.trim() || null,
    })
    if (error) throw error
    alert('✓ 已转为驻地创作者')
    loadApplications()  // 刷新列表,函数名需匹配你的页面
  } catch (e) {
    alert('操作失败:' + e.message)
  }
}

async function handleRejectCompletely(applicationId) {
  const note = window.prompt(
    '必填:拒绝理由(会附在站内信中,让申请者知道为什么)',
    ''
  )
  if (!note || note.trim().length < 5) {
    alert('拒绝理由需要至少 5 个字')
    return
  }
  const confirmed = window.confirm(
    '将完全拒绝此申请(不授予任何身份)。\n' +
    '适用场景:广告号、恶意账户等明显不合适的申请。\n\n' +
    '确定继续吗?'
  )
  if (!confirmed) return

  try {
    const { error } = await supabase.rpc('admin_reject_completely', {
      p_application_id: applicationId,
      p_admin_note: note.trim(),
    })
    if (error) throw error
    alert('✓ 已完全拒绝')
    loadApplications()
  } catch (e) {
    alert('操作失败:' + e.message)
  }
}


// ─────────────────────────────────────────────
// 2. UI 按钮(集成到申请详情卡片的操作区)
// ─────────────────────────────────────────────

/* 
在显示申请详情的 JSX 里,找到原来的 "通过 / 拒绝" 按钮组。
对于 identity_type === 'artist' 的申请,替换为以下三个按钮:
*/

{application.identity_type === 'artist' ? (
  <div className="flex flex-wrap items-center gap-2">
    {/* 通过 */}
    <button
      onClick={() => handleApprove(application.id)}
      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
      style={{ backgroundColor: '#059669' }}
    >
      ✓ 通过艺术家
    </button>
    
    {/* 转驻地(推荐路径) */}
    <button
      onClick={() => handleRejectAsResident(application.id)}
      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
      style={{ backgroundColor: '#8a7a5c' }}
      title="作品还不够成熟,但鼓励留下来继续创作"
    >
      📜 转为驻地创作者
    </button>
    
    {/* 完全拒绝(少用) */}
    <button
      onClick={() => handleRejectCompletely(application.id)}
      className="px-4 py-2 rounded-lg text-sm font-medium"
      style={{ 
        backgroundColor: 'transparent',
        color: '#DC2626',
        border: '0.5px solid #DC2626',
      }}
      title="明显不合适的申请(广告号、恶意等)"
    >
      ✗ 完全拒绝
    </button>
  </div>
) : (
  // 非艺术家申请(curator / partner 等)走原有流程
  <div className="flex items-center gap-2">
    <button
      onClick={() => handleApprove(application.id)}
      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
      style={{ backgroundColor: '#059669' }}
    >
      ✓ 通过
    </button>
    <button
      onClick={() => handleReject(application.id)}
      className="px-4 py-2 rounded-lg text-sm font-medium"
      style={{ 
        backgroundColor: 'transparent',
        color: '#DC2626',
        border: '0.5px solid #DC2626',
      }}
    >
      ✗ 拒绝
    </button>
  </div>
)}


// ─────────────────────────────────────────────
// 3. 列表展示区(可选增强)
// ─────────────────────────────────────────────

/* 
在历史已处理申请里,现在有三种结果:
  - 通过 (approved)
  - 转驻地 (rejected, outcome_detail = 'converted_to_resident')
  - 完全拒绝 (rejected, outcome_detail = 'fully_rejected')

可以在列表里用不同 tag 区分:
*/

function ApplicationStatusTag({ app }) {
  if (app.status === 'pending') {
    return <span className="px-2 py-0.5 rounded-full text-xs" 
      style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>⏳ 待审</span>
  }
  if (app.status === 'approved') {
    return <span className="px-2 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>✓ 通过</span>
  }
  // rejected
  if (app.outcome_detail === 'converted_to_resident') {
    return <span className="px-2 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: '#F5EBDC', color: '#8a7a5c' }}>📜 转驻地</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs"
    style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>✗ 拒绝</span>
}
