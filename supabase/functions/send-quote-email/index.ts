// Supabase Edge Function — send-quote-email
// Calls Resend API to send the customer PDF quote as an email attachment.
//
// Required Supabase secrets (set via Dashboard → Settings → Edge Functions):
//   RESEND_API_KEY  — from resend.com dashboard
//   FROM_EMAIL      — verified sender address (e.g. bilal@yourdomain.com)
//                     or use "onboarding@resend.dev" for testing
//   FROM_NAME       — display name (e.g. "Bilal from EWP")

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { to, subject, body, pdfBase64, filename, replyTo, fromName } = await req.json()

    if (!to || !pdfBase64) throw new Error('Missing required fields: to, pdfBase64')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY secret is not configured in Supabase')

    const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const FROM_NAME_ENV = Deno.env.get('FROM_NAME')  || 'EWP'
    // Prefer the per-request name (logged-in operator) over the secret fallback
    const senderName = fromName || FROM_NAME_ENV

    const payload: Record<string, unknown> = {
      from: `${senderName} <${FROM_EMAIL}>`,
      to: [to],
      subject: subject || 'Your Quote from Engstrom Wood Products',
      text: body || '',
      attachments: [{ filename: filename || 'Quote.pdf', content: pdfBase64 }],
    }
    if (replyTo) payload.reply_to = replyTo

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || `Resend error ${res.status}`)

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
