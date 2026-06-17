import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function selectPrize(prizes: { id: string; probability: number }[]): string {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0)
  let rand = Math.random() * total
  for (const prize of prizes) {
    rand -= prize.probability
    if (rand <= 0) {
      return prize.id
    }
  }
  return prizes[prizes.length - 1].id
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { participantId } = await req.json()
    const campaignId = params.id

    if (!participantId) {
      return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 })
    }

    // Fetch participant
    const { data: participant, error: pErr } = await supabaseAdmin
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .eq('campaign_id', campaignId)
      .single()

    if (pErr || !participant) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
    }

    if (participant.spins_available <= 0) {
      return NextResponse.json({ error: 'چرخشی باقی نمانده است' }, { status: 400 })
    }

    // Fetch prizes for this campaign
    const { data: prizes, error: prizesErr } = await supabaseAdmin
      .from('prizes')
      .select('id, probability')
      .eq('campaign_id', campaignId)

    if (prizesErr || !prizes || prizes.length === 0) {
      return NextResponse.json({ error: 'جایزه‌ای تعریف نشده' }, { status: 500 })
    }

    // Server-side prize selection
    const prizeId = selectPrize(prizes)

    // Fetch prize name for response
    const { data: prize } = await supabaseAdmin
      .from('prizes')
      .select('name')
      .eq('id', prizeId)
      .single()

    // Record spin
    const { error: spinErr } = await supabaseAdmin
      .from('spins')
      .insert({
        participant_id: participantId,
        prize_id: prizeId,
      })

    if (spinErr) {
      console.error('Spin insert error:', spinErr)
      return NextResponse.json({ error: 'خطا در ثبت چرخش' }, { status: 500 })
    }

    // Decrement spins_available
    const { error: updateErr } = await supabaseAdmin
      .from('participants')
      .update({ spins_available: participant.spins_available - 1 })
      .eq('id', participantId)

    if (updateErr) {
      console.error('Update spins error:', updateErr)
    }

    const newSpinsAvailable = participant.spins_available - 1

    // If referred by someone, update referrer stats
    if (participant.referred_by) {
      const { data: referrer } = await supabaseAdmin
        .from('participants')
        .select('successful_referrals, spins_available, campaign_id')
        .eq('id', participant.referred_by)
        .single()

      if (referrer) {
        // Fetch campaign referrals_needed_for_retry
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('referrals_needed_for_retry')
          .eq('id', referrer.campaign_id)
          .single()

        const needed = campaign?.referrals_needed_for_retry ?? 2
        const newReferrals = referrer.successful_referrals + 1
        const bonusSpin = newReferrals % needed === 0 ? 1 : 0

        await supabaseAdmin
          .from('participants')
          .update({
            successful_referrals: newReferrals,
            spins_available: referrer.spins_available + bonusSpin,
          })
          .eq('id', participant.referred_by)
      }
    }

    return NextResponse.json({
      prizeId,
      prizeName: prize?.name ?? 'جایزه',
      spinsAvailable: newSpinsAvailable,
    })
  } catch (err) {
    console.error('Spin error:', err)
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 })
  }
}
