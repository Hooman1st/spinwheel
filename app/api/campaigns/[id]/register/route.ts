import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { phone, referralCode } = await req.json()
    const campaignId = params.id

    if (!phone) {
      return NextResponse.json({ error: 'شماره موبایل الزامی است' }, { status: 400 })
    }

    // Normalize phone
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^98/, '0').replace(/^9/, '09')

    // Check if participant already exists
    const { data: existing } = await supabaseAdmin
      .from('participants')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('phone', normalizedPhone)
      .single()

    if (existing) {
      return NextResponse.json({
        participantId: existing.id,
        referralCode: existing.referral_code,
        spinsAvailable: existing.spins_available,
        successfulReferrals: existing.successful_referrals,
      })
    }

    // Find referrer if referralCode provided
    let referredById: string | null = null
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('participants')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (referrer) {
        referredById = referrer.id
      }
    }

    // Generate unique referral code
    let newReferralCode: string
    let attempts = 0
    do {
      newReferralCode = generateReferralCode()
      const { data: existing } = await supabaseAdmin
        .from('participants')
        .select('id')
        .eq('referral_code', newReferralCode)
        .single()
      if (!existing) break
      attempts++
    } while (attempts < 10)

    // Create participant
    const { data: participant, error } = await supabaseAdmin
      .from('participants')
      .insert({
        campaign_id: campaignId,
        phone: normalizedPhone,
        referral_code: newReferralCode!,
        referred_by: referredById,
        spins_available: 1,
      })
      .select()
      .single()

    if (error || !participant) {
      console.error('Insert participant error:', error)
      return NextResponse.json({ error: 'خطا در ثبت‌نام' }, { status: 500 })
    }

    return NextResponse.json({
      participantId: participant.id,
      referralCode: participant.referral_code,
      spinsAvailable: participant.spins_available,
      successfulReferrals: participant.successful_referrals,
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 })
  }
}
