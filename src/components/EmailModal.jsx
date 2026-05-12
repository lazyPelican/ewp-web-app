import React, { useState } from "react"
import { supabase } from "../supabase.js"
import { fmtDate, fmtId } from "../appUtils.js"
import { buildCustomerPDFBlob } from "../pdfExport.js"

export function EmailModal({ project, rooms, preparedBy, operatorEmail, operatorName, onClose }) {
  const safeName   = (project.name        || 'Quote').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Quote'
  const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
  const defaultFilename = (safeClient ? `${safeClient} – ${safeName}` : safeName) + ' – Quote.pdf'

  const defaultBody = [
    `Hi ${project.contactName || 'there'},`,
    '',
    `Please find attached your quote for ${project.name}.`,
    '',
    `Project Address: ${project.address || '–'}`,
    `Bid Date: ${fmtDate(project.bidDate || '')}`,
    `Quote ID: ${fmtId(project.id)}`,
    '',
    "Please don't hesitate to reach out with any questions.",
    '',
    'Best regards,',
    'Engstrom Wood Products',
  ].join('\n')

  const [to,      setTo]      = useState(project.email || '')
  const [subject, setSubject] = useState(`Quote: ${project.name}`)
  const [body,    setBody]    = useState(defaultBody)
  const [status,  setStatus]  = useState('idle') // idle | generating | sending | done | error
  const [errMsg,  setErrMsg]  = useState('')

  const busy = status === 'generating' || status === 'sending'

  const handleSend = async () => {
    if (!to.trim()) { setErrMsg('Recipient email is required.'); return }
    setErrMsg('')
    setStatus('generating')
    try {
      const blob = await buildCustomerPDFBlob(project, rooms, preparedBy)
      setStatus('sending')

      // Convert blob → base64
      const arrayBuf = await blob.arrayBuffer()
      const uint8    = new Uint8Array(arrayBuf)
      let binary = ''
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
      const pdfBase64 = btoa(binary)

      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          pdfBase64,
          filename: defaultFilename,
          replyTo: operatorEmail || undefined,
          fromName: operatorName ? `${operatorName} from EWP` : undefined,
        },
      })
      if (error) {
        let msg = error.message || 'Send failed'
        try { const b = await error.context?.json?.(); if (b?.error) msg = b.error } catch {}
        throw new Error(msg)
      }
      setStatus('done')
    } catch (err) {
      setErrMsg(err.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(20,16,10,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  }
  const boxStyle = {
    background: 'var(--card-bg, #fff)',
    border: '1px solid var(--border, #EDE8DF)',
    borderRadius: 14,
    padding: '32px 28px 24px',
    width: '100%', maxWidth: 500,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex', flexDirection: 'column', gap: 14,
  }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--mid, #9B8E82)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'block' }
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--border, #DDD5C8)', borderRadius: 7,
    padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
    background: 'var(--input-bg, #F8F8F4)', color: 'var(--text, #15171C)',
    outline: 'none',
  }

  if (status === 'done') return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...boxStyle, alignItems: 'center', textAlign: 'center', gap: 12 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 42 }}>✅</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Email sent!</div>
        <div style={{ fontSize: 13, color: 'var(--mid)' }}>Quote delivered to <strong>{to}</strong></div>
        <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={onClose}>Close</button>
      </div>
    </div>
  )

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>✉ Email Quote to Client</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--mid)', lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        <div>
          <label style={labelStyle}>To</label>
          <input style={inputStyle} type="email" value={to} onChange={e => setTo(e.target.value)}
            placeholder="client@email.com" disabled={busy} />
        </div>

        <div>
          <label style={labelStyle}>Subject</label>
          <input style={inputStyle} type="text" value={subject} onChange={e => setSubject(e.target.value)}
            disabled={busy} />
        </div>

        <div>
          <label style={labelStyle}>Message</label>
          <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} disabled={busy} />
        </div>

        <div style={{ fontSize: 11, color: 'var(--mid)', background: 'var(--bg, #FDFAF5)',
          border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px' }}>
          📎 <strong>{defaultFilename}</strong> will be attached automatically.
          {operatorEmail && <span> Replies go to <strong>{operatorEmail}</strong>.</span>}
        </div>

        {errMsg && <div style={{ fontSize: 12, color: 'var(--red, #C0392B)' }}>{errMsg}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-gold" onClick={handleSend} disabled={busy} style={{ minWidth: 110 }}>
            {status === 'generating' ? '⳿ Building PDF…'
              : status === 'sending'  ? '📤 Sending…'
              : '✉ Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
