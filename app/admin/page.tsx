'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Campaign, Prize } from '@/lib/supabase'

type Tab = 'prizes' | 'campaign' | 'texts' | 'stats'

type Texts = {
  badge: string
  headerTitle: string
  headerSub: string
  regTitle: string
  regSub: string
  phonePlaceholder: string
  regBtn: string
  agreeText: string
  refMsg: string
  spinTitle: string
  spinBtn: string
  winMsg: string
  winNote: string
  refTitle: string
  eitaaMsg: string
}

const DEFAULT_TEXTS: Texts = {
  badge: 'کمپین بهار ۱۴۰۴',
  headerTitle: 'چرخ و فلک',
  headerSub: 'ثبت‌نام کن، بچرخون، ببر!',
  regTitle: 'ثبت‌نام',
  regSub: 'شماره موبایلت را وارد کن',
  phonePlaceholder: '09123456789',
  regBtn: 'شروع کن ←',
  agreeText: 'با ثبت‌نام، قوانین کمپین را می‌پذیرم',
  refMsg: 'از طریق لینک دوست وارد شدی!',
  spinTitle: 'چرخ رو بزن! 🎯',
  spinBtn: '🎁 بزن بریم!',
  winMsg: 'تبریک! برنده شدی 🎉',
  winNote: 'جایزه‌ات ثبت شد. به زودی با تو تماس می‌گیریم',
  refTitle: 'دعوت دوستان',
  eitaaMsg: 'شرکت کن و جایزه ببر!',
}

type Stats = {
  participants: number
  spins: number
  referrals: number
  prizeBreakdown: { name: string; color: string; count: number }[]
}

export default function AdminPage() {
  const [envDebug, setEnvDebug] = useState<string | null>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('prizes')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [texts, setTexts] = useState<Texts>(DEFAULT_TEXTS)
  const [stats, setStats] = useState<Stats>({ participants: 0, spins: 0, referrals: 0, prizeBreakdown: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    slug: '',
    referrals_needed_for_retry: 2,
    is_active: true,
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const debugMsg = `URL: ${url || '(EMPTY)'}\nKEY length: ${key ? key.length : 'EMPTY'}\nKEY starts with: ${key ? key.slice(0, 15) : 'N/A'}`
    setEnvDebug(debugMsg)
    try {
      if (!url || !key) {
        throw new Error('Env vars missing at runtime: url=' + !!url + ' key=' + !!key)
      }
      // dynamic import to avoid module-level crash
      import('@supabase/supabase-js').then(({ createClient }) => {
        const client = createClient(url, key)
        setSupabaseClient(client)
      })
    } catch (e: any) {
      setLoadError('خطای راه‌اندازی Supabase: ' + e.message + '\n\n' + debugMsg)
      setLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!supabaseClient) return
    const supabase = supabaseClient
    setLoading(true)
    setLoadError('')
    try {
      const { data: camps, error: campErr } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (campErr) throw campErr
      if (!camps) {
        setLoadError('هیچ کمپینی در دیتابیس پیدا نشد. ابتدا schema.sql را در Supabase اجرا کنید.')
        setLoading(false)
        return
      }

      setCampaign(camps)
      setCampaignForm({
        name: camps.name,
        slug: camps.slug,
        referrals_needed_for_retry: camps.referrals_needed_for_retry,
        is_active: camps.is_active,
      })

      const dbTexts = (camps as any).texts
      if (dbTexts && typeof dbTexts === 'object' && Object.keys(dbTexts).length > 0) {
        setTexts({ ...DEFAULT_TEXTS, ...dbTexts })
      } else {
        setTexts(DEFAULT_TEXTS)
      }

      const { data: prizeData, error: prizeErr } = await supabase
        .from('prizes')
        .select('*')
        .eq('campaign_id', camps.id)
        .order('probability', { ascending: false })
      if (prizeErr) throw prizeErr
      setPrizes(prizeData || [])

      const { count: pCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', camps.id)

      const { count: rCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', camps.id)
        .gt('successful_referrals', 0)

      const participantIds: string[] = (
        await supabase.from('participants').select('id').eq('campaign_id', camps.id)
      ).data?.map((p: { id: string }) => p.id) || []

      let spinRows: any[] = []
      if (participantIds.length > 0) {
        const { data: sData } = await supabase
          .from('spins')
          .select('prize_id')
          .in('participant_id', participantIds)
        spinRows = sData || []
      }

      const prizeMap: Record<string, { name: string; color: string }> = {}
      ;(prizeData || []).forEach((p: Prize) => { prizeMap[p.id] = { name: p.name, color: p.color } })

      const breakdown: Record<string, { name: string; color: string; count: number }> = {}
      spinRows.forEach((s: { prize_id: string }) => {
        const info = prizeMap[s.prize_id] || { name: '—', color: '#ccc' }
        if (!breakdown[s.prize_id]) breakdown[s.prize_id] = { ...info, count: 0 }
        breakdown[s.prize_id].count++
      })

      setStats({
        participants: pCount || 0,
        spins: spinRows.length,
        referrals: rCount || 0,
        prizeBreakdown: Object.values(breakdown),
      })
    } catch (err: any) {
      console.error(err)
      setLoadError('خطا در بارگذاری اطلاعات: ' + (err?.message || 'نامشخص'))
    } finally {
      setLoading(false)
    }
  }, [supabaseClient])

  useEffect(() => { if (supabaseClient) fetchData() }, [fetchData, supabaseClient])

  const savePrizes = async () => {
    if (!campaign || !supabaseClient) return
    const total = prizes.reduce((s, p) => s + Number(p.probability), 0)
    if (Math.abs(total - 100) > 0.01) {
      showToast('⚠️ مجموع احتمال‌ها باید ۱۰۰ باشد')
      return
    }
    setSaving(true)
    try {
      await supabaseClient.from('prizes').delete().eq('campaign_id', campaign.id)
      const { error } = await supabaseClient.from('prizes').insert(
        prizes.map(p => ({ campaign_id: campaign.id, name: p.name, probability: p.probability, color: p.color }))
      )
      if (error) throw error
      showToast('✓ جوایز ذخیره شد')
      fetchData()
    } catch (err: any) {
      showToast('❌ خطا در ذخیره: ' + (err?.message || ''))
    } finally {
      setSaving(false)
    }
  }

  const saveCampaign = async () => {
    if (!campaign || !supabaseClient) return
    setSaving(true)
    try {
      const { error } = await supabaseClient
        .from('campaigns')
        .update(campaignForm)
        .eq('id', campaign.id)
      if (error) throw error
      showToast('✓ تنظیمات ذخیره شد')
      fetchData()
    } catch (err: any) {
      showToast('❌ خطا در ذخیره: ' + (err?.message || ''))
    } finally {
      setSaving(false)
    }
  }

  const saveTexts = async () => {
    if (!campaign || !supabaseClient) return
    setSaving(true)
    try {
      const { error } = await supabaseClient
        .from('campaigns')
        .update({ texts } as any)
        .eq('id', campaign.id)
      if (error) throw error
      showToast('✓ متون ذخیره شد')
    } catch (err: any) {
      try {
        localStorage.setItem(`texts_${campaign.id}`, JSON.stringify(texts))
        showToast('⚠️ ذخیره موقت شد (migration را اجرا کنید)')
      } catch {
        showToast('❌ خطا در ذخیره متون')
      }
    } finally {
      setSaving(false)
    }
  }

  const addPrize = () => {
    setPrizes(prev => [...prev, {
      id: 'new_' + Date.now(),
      campaign_id: campaign?.id || '',
      name: 'جایزه جدید',
      probability: 0,
      color: '#a78bfa',
    }])
  }

  const removePrize = (idx: number) => {
    if (prizes.length <= 2) return
    setPrizes(prev => prev.filter((_, i) => i !== idx))
  }

  const updatePrize = (idx: number, field: keyof Prize, value: string | number) => {
    setPrizes(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const probSum = prizes.reduce((s, p) => s + Number(p.probability), 0)

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'prizes', label: 'جوایز', icon: '🎁' },
    { key: 'campaign', label: 'تنظیمات', icon: '⚙️' },
    { key: 'texts', label: 'متون', icon: '✏️' },
    { key: 'stats', label: 'آمار', icon: '📊' },
  ]

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.loadWrap}>
          <div style={S.spinner} />
          <p style={{ color: '#888', fontSize: 14 }}>در حال بارگذاری...</p>
          {envDebug && (
            <pre style={{ color: '#aaa', fontSize: 11, background: '#f3f4f6', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', maxWidth: 500, direction: 'ltr', textAlign: 'left' }}>{envDebug}</pre>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={S.page}>
        <div style={S.loadWrap}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <p style={{ color: '#dc2626', fontSize: 14, maxWidth: 420, textAlign: 'center', padding: '0 20px', whiteSpace: 'pre-wrap' }}>{loadError}</p>
          {envDebug && (
            <pre style={{ color: '#aaa', fontSize: 11, background: '#f3f4f6', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', maxWidth: 500, direction: 'ltr', textAlign: 'left' }}>{envDebug}</pre>
          )}
          <button style={S.btnPrimary} onClick={fetchData}>تلاش دوباره</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {toast && <div style={S.toast}>{toast}</div>}

      <div style={S.layout}>
        <aside style={S.sidebar}>
          <div style={S.logo}>
            <div style={S.logoIcon}>🎡</div>
            <div>
              <div style={S.logoTitle}>پنل مدیریت</div>
              <div style={S.logoSub}>{campaign?.name || '—'}</div>
            </div>
          </div>
          {tabs.map(t => (
            <button
              key={t.key}
              style={{ ...S.navItem, ...(tab === t.key ? S.navActive : {}) }}
              onClick={() => setTab(t.key)}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '16px', borderTop: '0.5px solid #e5e7eb' }}>
            <a
              href={`/campaign/${campaign?.slug || 'spring-2025'}`}
              target="_blank"
              rel="noreferrer"
              style={S.previewLink}
            >
              ↗ مشاهده اپ
            </a>
          </div>
        </aside>

        <main style={S.main}>

          {tab === 'prizes' && (
            <div>
              <h1 style={S.pageTitle}>جوایز چرخ و فلک</h1>
              <p style={S.pageSub}>هر جایزه یک بخش از چرخ است. مجموع احتمال‌ها باید دقیقاً ۱۰۰ باشد.</p>

              <div style={S.card}>
                <div style={S.cardTitle}>🎁 لیست جوایز</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 36px', gap: 8, marginBottom: 6 }}>
                  {['نام جایزه', 'احتمال ٪', 'رنگ', ''].map((h, i) => (
                    <div key={i} style={S.colHeader}>{h}</div>
                  ))}
                </div>
                {prizes.map((p, i) => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input style={S.inp} value={p.name} onChange={e => updatePrize(i, 'name', e.target.value)} />
                    <input style={S.inp} type="number" min={0} max={100} value={p.probability} onChange={e => updatePrize(i, 'probability', +e.target.value)} />
                    <input type="color" value={p.color} onChange={e => updatePrize(i, 'color', e.target.value)}
                      style={{ width: '100%', height: 38, borderRadius: 8, border: '0.5px solid #d1d5db', cursor: 'pointer', padding: 2 }} />
                    <button style={S.btnDanger} onClick={() => removePrize(i)} disabled={prizes.length <= 2} aria-label="حذف">✕</button>
                  </div>
                ))}
                <button style={S.btnAdd} onClick={addPrize}>+ افزودن جایزه</button>
                <div style={S.divider} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    مجموع احتمال: <span style={{ fontWeight: 600, color: Math.abs(probSum - 100) < 0.01 ? '#166534' : '#dc2626' }}>{probSum}</span>٪
                  </div>
                  <button style={S.btnPrimary} onClick={savePrizes} disabled={saving}>
                    {saving ? 'در حال ذخیره...' : 'ذخیره جوایز'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'campaign' && (
            <div>
              <h1 style={S.pageTitle}>تنظیمات کمپین</h1>
              <p style={S.pageSub}>پارامترهای اصلی کمپین را از اینجا مدیریت کنید.</p>

              <div style={S.card}>
                <div style={S.cardTitle}>⚙️ اطلاعات کمپین</div>
                <div style={S.field}>
                  <label style={S.lbl}>نام کمپین</label>
                  <input style={S.inp} value={campaignForm.name} onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={S.field}>
                    <label style={S.lbl}>آدرس (slug)</label>
                    <input style={{ ...S.inp, direction: 'ltr', textAlign: 'left' }} value={campaignForm.slug} onChange={e => setCampaignForm(p => ({ ...p, slug: e.target.value }))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.lbl}>دعوت برای چرخش مجدد</label>
                    <input style={S.inp} type="number" min={1} max={20} value={campaignForm.referrals_needed_for_retry} onChange={e => setCampaignForm(p => ({ ...p, referrals_needed_for_retry: +e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>کمپین فعال است</span>
                  <label style={{ ...S.togWrap }}>
                    <input
                      type="checkbox"
                      checked={campaignForm.is_active}
                      onChange={e => setCampaignForm(p => ({ ...p, is_active: e.target.checked }))}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{ ...S.togSlider, background: campaignForm.is_active ? '#7c3aed' : '#d1d5db' }} />
                    <span style={{ ...S.togThumb, transform: campaignForm.is_active ? 'translateX(-16px)' : 'none' }} />
                  </label>
                </div>
                <div style={S.divider} />
                <button style={S.btnPrimary} onClick={saveCampaign} disabled={saving}>
                  {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                </button>
              </div>
            </div>
          )}

          {tab === 'texts' && (
            <div>
              <h1 style={S.pageTitle}>ویرایش متون</h1>
              <p style={S.pageSub}>تمام متن‌های نمایش‌داده‌شده در اپ موبایل را از اینجا تغییر دهید.</p>

              {[
                {
                  title: 'هدر صفحه', icon: '🏷️',
                  fields: [
                    { lbl: 'تگ روی هدر', key: 'badge' as keyof Texts },
                    { lbl: 'عنوان اصلی', key: 'headerTitle' as keyof Texts },
                    { lbl: 'زیرعنوان', key: 'headerSub' as keyof Texts },
                  ]
                },
                {
                  title: 'صفحه ثبت‌نام', icon: '📱',
                  fields: [
                    { lbl: 'عنوان کارت', key: 'regTitle' as keyof Texts },
                    { lbl: 'زیرعنوان کارت', key: 'regSub' as keyof Texts },
                    { lbl: 'placeholder اینپوت', key: 'phonePlaceholder' as keyof Texts },
                    { lbl: 'متن دکمه', key: 'regBtn' as keyof Texts },
                    { lbl: 'متن توافق‌نامه', key: 'agreeText' as keyof Texts },
                    { lbl: 'پیام ورود با رفرال', key: 'refMsg' as keyof Texts },
                  ]
                },
                {
                  title: 'صفحه چرخش', icon: '🎯',
                  fields: [
                    { lbl: 'عنوان صفحه', key: 'spinTitle' as keyof Texts },
                    { lbl: 'متن دکمه چرخش', key: 'spinBtn' as keyof Texts },
                  ]
                },
                {
                  title: 'صفحه نتیجه', icon: '🏆',
                  fields: [
                    { lbl: 'پیام تبریک', key: 'winMsg' as keyof Texts },
                    { lbl: 'توضیح زیر جایزه', key: 'winNote' as keyof Texts },
                  ]
                },
                {
                  title: 'صفحه دعوت', icon: '📤',
                  fields: [
                    { lbl: 'عنوان کارت', key: 'refTitle' as keyof Texts },
                    { lbl: 'پیام اشتراک ایتا', key: 'eitaaMsg' as keyof Texts },
                  ]
                },
              ].map(section => (
                <div key={section.title} style={S.card}>
                  <div style={S.cardTitle}>{section.icon} {section.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {section.fields.map(f => (
                      <div key={f.key} style={S.field}>
                        <label style={S.lbl}>{f.lbl}</label>
                        <input style={S.inp} value={texts[f.key]} onChange={e => setTexts(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={S.card}>
                <div style={S.cardTitle}>👁️ پیش‌نمایش هدر</div>
                <div style={S.previewBox}>
                  <div style={S.previewInner}>
                    <div style={S.previewBadge}>{texts.badge}</div>
                    <div style={S.previewTitle}>{texts.headerTitle}</div>
                    <div style={S.previewSub}>{texts.headerSub}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'left' }}>
                  <button style={S.btnPrimary} onClick={saveTexts} disabled={saving}>
                    {saving ? 'در حال ذخیره...' : 'ذخیره متون'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div>
              <h1 style={S.pageTitle}>آمار کمپین</h1>
              <p style={S.pageSub}>اطلاعات کلی شرکت‌کنندگان از دیتابیس</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { n: stats.participants, l: 'ثبت‌نام‌کننده' },
                  { n: stats.spins, l: 'چرخش انجام‌شده' },
                  { n: stats.referrals, l: 'کاربر با رفرال' },
                ].map(s => (
                  <div key={s.l} style={S.statCard}>
                    <div style={S.statN}>{s.n.toLocaleString('fa-IR')}</div>
                    <div style={S.statL}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>🎁 توزیع جوایز</div>
                {stats.prizeBreakdown.length ? stats.prizeBreakdown.map(pb => {
                  const pct = stats.spins ? Math.round(pb.count / stats.spins * 100) : 0
                  return (
                    <div key={pb.name} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: pb.color, display: 'inline-block' }} />
                          <span>{pb.name}</span>
                        </span>
                        <span style={{ color: '#888' }}>{pb.count} نفر ({pct}٪)</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pb.color, borderRadius: 99, transition: 'width .5s' }} />
                      </div>
                    </div>
                  )
                }) : <p style={{ color: '#aaa', fontSize: 13 }}>هنوز چرخشی ثبت نشده</p>}
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>🔄 بروزرسانی</div>
                <button style={S.btnPrimary} onClick={fetchData}>بروزرسانی آمار</button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: "Tahoma, 'Vazirmatn', sans-serif", direction: 'rtl' },
  loadWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 },
  spinner: { width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, flexShrink: 0, background: '#fff', borderLeft: '0.5px solid #e5e7eb', display: 'flex', flexDirection: 'column' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '0.5px solid #e5e7eb' },
  logoIcon: { fontSize: 24 },
  logoTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  logoSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', fontSize: 14, color: '#666', background: 'transparent', border: 'none', width: '100%', textAlign: 'right', fontFamily: 'inherit', transition: 'background .15s', borderRight: '2px solid transparent' },
  navActive: { background: '#f5f3ff', color: '#7c3aed', fontWeight: 500, borderRight: '2px solid #7c3aed' },
  previewLink: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#7c3aed', textDecoration: 'none' },
  main: { flex: 1, padding: 28, overflowY: 'auto' as const, maxWidth: 760 },
  pageTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#aaa', marginBottom: 20 },
  card: { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 500, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  field: { marginBottom: 12 },
  lbl: { fontSize: 12, color: '#666', marginBottom: 5, display: 'block' },
  inp: { width: '100%', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', color: '#1a1a2e', background: '#fff', outline: 'none' },
  colHeader: { fontSize: 11, color: '#aaa' },
  divider: { height: '0.5px', background: '#e5e7eb', margin: '14px 0' },
  btnPrimary: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' },
  btnDanger: { background: 'transparent', color: '#dc2626', border: '0.5px solid #fca5a5', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', fontSize: 14 },
  btnAdd: { background: 'transparent', border: '0.5px dashed #d1d5db', borderRadius: 8, padding: 9, fontSize: 13, color: '#888', cursor: 'pointer', width: '100%', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  togWrap: { position: 'relative', width: 38, height: 22, cursor: 'pointer', display: 'block', flexShrink: 0 },
  togSlider: { position: 'absolute', inset: 0, borderRadius: 99, transition: 'background .2s', display: 'block' },
  togThumb: { position: 'absolute', width: 16, height: 16, right: 3, top: 3, background: '#fff', borderRadius: '50%', transition: 'transform .2s', display: 'block' },
  previewBox: { background: 'linear-gradient(135deg,#4c1d95,#831843)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  previewInner: { background: 'rgba(255,255,255,.96)', borderRadius: 14, padding: '14px 18px', textAlign: 'center', width: '100%' },
  previewBadge: { display: 'inline-block', background: '#f3f4f6', borderRadius: 99, padding: '2px 12px', fontSize: 11, color: '#555', marginBottom: 6 },
  previewTitle: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  previewSub: { fontSize: 13, color: '#888', marginTop: 3 },
  statCard: { background: '#f9fafb', borderRadius: 8, padding: '14px 16px' },
  statN: { fontSize: 26, fontWeight: 500, color: '#1a1a2e' },
  statL: { fontSize: 11, color: '#aaa', marginTop: 3 },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 13, zIndex: 999, whiteSpace: 'nowrap' },
}
