'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Gift, Share2, Copy, CheckCircle, ChevronLeft, Star, Trophy } from 'lucide-react'
import SpinWheel from '@/components/SpinWheel'
import type { Campaign, Prize } from '@/lib/supabase'

type Step = 'register' | 'spin' | 'result' | 'referral'

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

interface Props {
  campaign: Campaign
  prizes: Prize[]
  referralCodeFromUrl?: string
}

export default function CampaignClient({ campaign, prizes, referralCodeFromUrl }: Props) {
  const texts: Texts = { ...DEFAULT_TEXTS, ...((campaign as any).texts || {}) }
  const [step, setStep] = useState<Step>('register')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [loading, setLoading] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [spinsAvailable, setSpinsAvailable] = useState(0)
  const [successfulReferrals, setSuccessfulReferrals] = useState(0)
  const [wonPrize, setWonPrize] = useState<Prize | null>(null)
  const [wonPrizeId, setWonPrizeId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const referralLink = `${origin}/campaign/${campaign.slug}?ref=${referralCode}`

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) return 'شماره موبایل را وارد کنید'
    if (!/^(09|9)\d{9}$/.test(cleaned)) return 'شماره موبایل معتبر نیست'
    return ''
  }

  const handleRegister = async () => {
    const error = validatePhone(phone)
    if (error) { setPhoneError(error); return }
    setPhoneError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, referralCode: referralCodeFromUrl }),
      })
      if (!res.ok) { const d = await res.json(); setPhoneError(d.error || 'خطایی رخ داد'); return }
      const data = await res.json()
      setParticipantId(data.participantId)
      setReferralCode(data.referralCode)
      setSpinsAvailable(data.spinsAvailable)
      setSuccessfulReferrals(data.successfulReferrals)
      setStep('spin')
    } catch { setPhoneError('خطا در اتصال به سرور') }
    finally { setLoading(false) }
  }

  const handleSpin = async () => {
    if (!participantId || spinsAvailable <= 0 || isSpinning) return
    setIsSpinning(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })
      if (!res.ok) { setIsSpinning(false); return }
      const data = await res.json()
      setWonPrizeId(data.prizeId)
      setSpinsAvailable(data.spinsAvailable)
      setWonPrize(prizes.find(p => p.id === data.prizeId) || null)
    } catch { setIsSpinning(false) }
  }

  const handleSpinComplete = () => {
    setIsSpinning(false)
    setTimeout(() => setStep('result'), 400)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareEitaa = () => {
    window.open(
      `https://eitaa.com/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(texts.eitaaMsg)}`,
      '_blank'
    )
  }

  const progressPercent = Math.min(
    (successfulReferrals % campaign.referrals_needed_for_retry) / campaign.referrals_needed_for_retry * 100,
    100
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-white/90 text-sm font-medium">{texts.badge}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {texts.headerTitle}
            <span className="block text-transparent bg-clip-text bg-gradient-to-l from-yellow-300 to-pink-300">
              🎡
            </span>
          </h1>
          <p className="text-white/60 text-sm">{texts.headerSub}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              className="card-glass rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{texts.regTitle}</h2>
                  <p className="text-sm text-gray-500">{texts.regSub}</p>
                </div>
              </div>
              <div className="mb-6">
                <input type="tel" inputMode="numeric" value={phone}
                  onChange={e => { setPhone(e.target.value); if (phoneError) setPhoneError(validatePhone(e.target.value)) }}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder={texts.phonePlaceholder}
                  className={`input-field ${phoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  dir="ltr" style={{ textAlign: 'center', letterSpacing: '2px' }} />
                {phoneError && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm mt-2 text-center">
                    {phoneError}
                  </motion.p>
                )}
              </div>
              {referralCodeFromUrl && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-green-700 text-sm">{texts.refMsg}</p>
                </div>
              )}
              <button onClick={handleRegister} disabled={loading} className="btn-primary w-full text-lg flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />در حال ثبت‌نام...</> : <>{texts.regBtn}<ChevronLeft className="w-5 h-5" /></>}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">{texts.agreeText}</p>
            </motion.div>
          )}

          {step === 'spin' && (
            <motion.div key="spin" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="card-glass rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{texts.spinTitle}</h2>
                <p className="text-gray-500">{spinsAvailable > 0 ? `${spinsAvailable} چرخش باقی مانده` : 'چرخشی باقی نمانده'}</p>
              </div>
              <SpinWheel prizes={prizes} targetPrizeId={wonPrizeId} isSpinning={isSpinning} onSpinComplete={handleSpinComplete} />
              <button onClick={handleSpin} disabled={spinsAvailable <= 0 || isSpinning} className="btn-primary w-full text-xl mt-6 flex items-center justify-center gap-2">
                {isSpinning ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />در حال چرخش...</> : spinsAvailable <= 0 ? 'چرخشی باقی نمانده' : <><Gift className="w-6 h-6" />{texts.spinBtn}</>}
              </button>
              {spinsAvailable <= 0 && (
                <button onClick={() => setStep('referral')} className="btn-secondary w-full mt-3 flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5" />دوستانت را دعوت کن
                </button>
              )}
            </motion.div>
          )}

          {step === 'result' && wonPrize && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="card-glass rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-28 h-28 rounded-full mx-auto flex items-center justify-center shadow-2xl text-5xl mb-6"
                style={{ background: `linear-gradient(135deg, ${wonPrize.color}dd, ${wonPrize.color})` }}>🏆</div>
              <p className="text-gray-500 text-lg mb-2">{texts.winMsg}</p>
              <h2 className="text-4xl font-extrabold mb-2" style={{ color: wonPrize.color }}>{wonPrize.name}</h2>
              <p className="text-gray-400 text-sm mb-8">{texts.winNote}</p>
              <div className="flex gap-3">
                <button onClick={() => setStep('referral')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5" />دعوت از دوستان
                </button>
                {spinsAvailable > 0 && (
                  <button onClick={() => setStep('spin')} className="btn-secondary flex items-center justify-center gap-2 px-4">
                    <Gift className="w-5 h-5" />چرخش مجدد
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'referral' && (
            <motion.div key="referral" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              className="card-glass rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{texts.refTitle}</h2>
                  <p className="text-sm text-gray-500">{campaign.referrals_needed_for_retry} نفر دعوت کن، یه چرخش بیشتر بگیر!</p>
                </div>
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-600">پیشرفت دعوت‌ها</span>
                  <span className="text-sm font-bold text-purple-600">
                    {successfulReferrals % campaign.referrals_needed_for_retry} از {campaign.referrals_needed_for_retry}
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-l from-purple-500 to-pink-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-2">لینک اختصاصی تو:</p>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500 truncate font-mono" dir="ltr" style={{ textAlign: 'left' }}>{referralLink}</p>
              </div>
              <div className="flex gap-3 mb-3">
                <button onClick={handleCopyLink}
                  className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 border-2 ${copied ? 'bg-green-50 border-green-400 text-green-600' : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'}`}>
                  {copied ? <><CheckCircle className="w-5 h-5" />کپی شد!</> : <><Copy className="w-5 h-5" />کپی لینک</>}
                </button>
                <button onClick={handleShareEitaa}
                  className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-l from-orange-500 to-amber-500 text-white">
                  <Share2 className="w-5 h-5" />اشتراک در ایتا
                </button>
              </div>
              {spinsAvailable > 0 && (
                <button onClick={() => setStep('spin')} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5" />چرخش مجدد ({spinsAvailable} باقی‌مانده)
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-center text-white/40 text-xs mt-6">چرخ و فلک جایزه © ۱۴۰۴</p>
      </div>
    </div>
  )
}
