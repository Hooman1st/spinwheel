import { supabase } from '@/lib/supabase'
import CampaignClient from './CampaignClient'

interface PageProps {
  params: { slug: string }
  searchParams: { ref?: string }
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (error || !campaign) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', color: '#fff', background: '#1a1a2e', minHeight: '100vh' }}>
        <h1 style={{ color: '#f87171' }}>DEBUG: Campaign not found</h1>
        <p>slug requested: {params.slug}</p>
        <p>SUPABASE_URL set: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO'}</p>
        <p>SUPABASE_URL value: {process.env.NEXT_PUBLIC_SUPABASE_URL || '(empty)'}</p>
        <p>ANON_KEY set: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES (length ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NO'}</p>
        <p>Supabase error: {error ? JSON.stringify(error) : 'none (campaign was just null/undefined)'}</p>
      </div>
    )
  }

  const { data: prizes } = await supabase
    .from('prizes')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('probability', { ascending: false })

  return (
    <CampaignClient
      campaign={campaign}
      prizes={prizes || []}
      referralCodeFromUrl={searchParams.ref}
    />
  )
}
