// PDFTemplates.jsx — @react-pdf/renderer v4 components for EWP Quote App
// Generates true vector PDFs (selectable text, no rasterisation)

import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet, Font, pdf
} from '@react-pdf/renderer'

// Display-only ID formatter — converts legacy EWPyyyymmddHHmmss → B-yymmdd-hhmm
const fmtId = (id = '') => {
  if (!id) return id
  if (id.startsWith('EWP') && id.length >= 13) {
    const s = id.slice(3)
    return `B-${s.slice(2,4)}${s.slice(4,6)}${s.slice(6,8)}-${s.slice(8,10)}${s.slice(10,12)}`
  }
  return id
}

// Logo: must be an absolute URL so @react-pdf/image uses fetchRemoteFile (fetch API)
// instead of fetchLocalFile (Node fs) which fails in the browser.
const LOGO_SRC = typeof window !== 'undefined'
  ? `${window.location.origin}/ewp-logo-dark.png`
  : '/ewp-logo-dark.png'

// Built-in PDF standard fonts — no registration needed, no network fetch.
// IMPORTANT: never combine these with fontWeight; use the explicit Bold variant instead.
const FONT_SANS    = 'Helvetica'
const FONT_SANS_BD = 'Helvetica-Bold'
const FONT_SERIF   = 'Times-Roman'
const FONT_SERIF_BD= 'Times-Bold'

// Avoid rare @react-pdf text-layout hangs on quote data with unusual words,
// IDs, or punctuation-heavy labels.
Font.registerHyphenationCallback(word => [word])

// ── COLOUR PALETTE ─────────────────────────────────────────────────────────
const C = {
  ivory:       '#FAF7F2',
  ivoryMid:    '#F2EDE4',
  border:      '#DDD5C8',
  border2:     '#EDE6DC',
  stone:       '#1A1A1A',
  ink:         '#1A1A1A',
  body:        '#1A1A1A',
  muted:       '#1A1A1A',
  amount:      '#1A1A1A',
  tableHdr:    '#1A1A1A',
  grandBg:     '#E8E0D4',
  grandBorder: '#C8B89A',
  grandAccent: '#1A1A1A',
  grandText:   '#1A1A1A',
  grandVal:    '#1A1A1A',
  white:       '#FFFFFF',
}

// ── STYLE SHEET ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: FONT_SANS,
    fontSize: 9,
    color: C.body,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 34,
    paddingRight: 34,
    backgroundColor: C.white,
  },

  // Header
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: C.ivory,
    borderBottom: `2 solid ${C.stone}`,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 8,
  },
  coLogo: { width: 42, height: 42 },
  coBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coName: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 22,
    color: C.ink,
    letterSpacing: 0.3,
  },
  coTag: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  docType: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 13,
    color: C.stone,
    letterSpacing: 1.5,
    textAlign: 'right',
  },
  docId: {
    fontFamily: FONT_SANS,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: 'right',
  },
  docDate: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'right',
  },
  continuationRibbon: {
    flexDirection: 'row',
    alignItems: 'stretch',
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.stone}`,
    backgroundColor: C.ivory,
    marginTop: -4,
    marginBottom: 8,
  },
  continuationCell: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    borderRight: `1 solid ${C.border}`,
  },
  continuationCellWide: {
    width: '36%',
  },
  continuationCellMid: {
    width: '28%',
  },
  continuationCellLast: {
    width: '36%',
    borderRight: 'none',
  },
  continuationLabel: {
    fontFamily: FONT_SANS_BD,
    fontSize: 5.5,
    color: C.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 1.5,
  },
  continuationValue: {
    fontFamily: FONT_SANS,
    fontSize: 8,
    color: C.ink,
  },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.stone}`,
    marginBottom: 10,
    backgroundColor: C.ivory,
  },
  ic: {
    width: '50%',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    borderRight: `1 solid ${C.border}`,
    borderBottom: `1 solid ${C.border}`,
  },
  icEven: { borderRight: 'none' },
  icLbl: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6,
    color: C.stone,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  icVal: {
    fontFamily: FONT_SANS,
    fontSize: 9.5,
    color: C.ink,
  },

  // Section label
  sec: {
    fontFamily: FONT_SANS_BD,
    fontSize: 7,
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    backgroundColor: C.ivoryMid,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    borderTop: `1.5 solid ${C.stone}`,
    borderLeft: `1 solid ${C.border}`,
    borderRight: `1 solid ${C.border}`,
  },

  // Table
  tblWrap: {
    border: `1 solid ${C.border}`,
    borderTop: 'none',
  },
  tRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${C.border2}`,
  },
  tRowAlt: {
    backgroundColor: C.ivory,
  },
  tRowHdr: {
    backgroundColor: C.ivoryMid,
    borderBottom: `1 solid ${C.border}`,
  },
  tCell: {
    fontFamily: FONT_SANS,
    fontSize: 8,
    color: C.body,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  tCellHdr: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6,
    color: C.tableHdr,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  tCellR: { textAlign: 'right' },
  tCellAmt: {
    textAlign: 'right',
    color: C.amount,
  },
  tCellMuted: {
    color: C.muted,
    fontStyle: 'italic',
  },
  tBorderL: { borderLeft: `1 solid ${C.border}` },
  tBorderL2: { borderLeft: `1 solid ${C.border2}` },

  // Sub bar (section total)
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.ivory,
    borderLeft: `1 solid ${C.border}`,
    borderRight: `1 solid ${C.border}`,
    borderBottom: `1 solid ${C.border}`,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 5,
  },
  subBarLbl: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subBarVal: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 11,
    color: C.ink,
  },

  // Totals strip (4-column)
  totalsStrip: {
    flexDirection: 'row',
    backgroundColor: C.ivoryMid,
    border: `1 solid ${C.border}`,
    borderTop: `2 solid ${C.stone}`,
    marginTop: 4,
    marginBottom: 0,
  },
  ts: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderRight: `1 solid ${C.border}`,
  },
  tsLast: { borderRight: 'none' },
  tsLbl: {
    fontFamily: FONT_SANS,
    fontSize: 6,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  tsVal: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 12,
    color: C.ink,
  },

  // Grand total bar
  grandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.grandBg,
    border: `1 solid ${C.grandBorder}`,
    borderLeft: `5 solid ${C.grandAccent}`,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 14,
    paddingRight: 14,
  },
  grandBarStandalone: {
    borderTop: `2 solid ${C.grandAccent}`,
    marginTop: 6,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 16,
    paddingRight: 16,
  },
  grandBarSmall: {
    backgroundColor: C.ivory,
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.stone}`,
    marginTop: 3,
  },
  gl: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 12,
    color: C.grandText,
    letterSpacing: 0.8,
  },
  glStandalone: { fontSize: 13 },
  glSmall: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 9,
    color: C.stone,
  },
  gs: {
    fontFamily: FONT_SANS,
    fontSize: 6.5,
    color: C.muted,
    marginTop: 2,
  },
  gv: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 20,
    color: C.grandVal,
  },
  gvStandalone: { fontSize: 22 },
  gvSmall: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 11,
    color: C.stone,
  },

  // Footer
  footer: {
    fontFamily: FONT_SANS,
    fontSize: 8,
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTop: `1 solid ${C.border}`,
    letterSpacing: 0.3,
  },

  // Signature blocks
  sigGrid: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  sigBlock: { flex: 1 },
  sigTitle: {
    fontFamily: FONT_SANS_BD,
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  sigLine: {
    borderBottom: `1 solid ${C.ink}`,
    height: 22,
    marginBottom: 3,
  },
  sigSubLine: {
    borderBottom: `1 solid ${C.border}`,
    height: 14,
    marginBottom: 2,
  },
  sigSubLbl: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
  },
  gap: { height: 4 },
})

// ── HELPERS ────────────────────────────────────────────────────────────────
const fmtN = (n) =>
  n == null
    ? '$0.00'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtD = (d) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Truncate long strings so PDF cells never overflow their column
const trunc = (str, max = 40) => {
  const s = String(str ?? '')
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── SHARED LAYOUT COMPONENTS ───────────────────────────────────────────────

function ProjectRibbon({ project }) {
  if (!project) return null

  const contactBits = [
    project.contactName,
    project.contactPhone,
    project.email,
  ].filter(Boolean)

  return (
    <View style={s.continuationRibbon} fixed>
      <View style={[s.continuationCell, s.continuationCellWide]}>
        <Text style={s.continuationLabel}>Project</Text>
        <Text style={s.continuationValue}>{trunc(project.name, 46) || '-'}</Text>
      </View>
      <View style={[s.continuationCell, s.continuationCellMid]}>
        <Text style={s.continuationLabel}>Address</Text>
        <Text style={s.continuationValue}>{trunc(project.address, 42) || '-'}</Text>
      </View>
      <View style={[s.continuationCell, s.continuationCellLast]}>
        <Text style={s.continuationLabel}>Contact</Text>
        <Text style={s.continuationValue}>{trunc(contactBits.join(' | '), 54) || '-'}</Text>
      </View>
    </View>
  )
}

function PageHeader({ docType, docId, docDate, project, showProjectRibbon = false }) {
  return (
    <>
      <View style={s.hdr} fixed>
        <View style={s.coBrand}>
          <Image style={s.coLogo} src={LOGO_SRC} />
          <View>
            <Text style={s.coName}>Engstrom Wood Products</Text>
            <Text style={s.coTag}>Custom Cabinetry  ·  Fine Woodworking  ·  Precision Installation</Text>
          </View>
        </View>
        <View>
          <Text style={s.docType}>{docType}</Text>
          <Text style={s.docId}>{docId}</Text>
          {docDate && <Text style={s.docDate}>{docDate}</Text>}
        </View>
      </View>
      {showProjectRibbon && <ProjectRibbon project={project} />}
    </>
  )
}

function InfoStrip({ cells }) {
  // cells = [{ label, value }, ...]  — rendered 2-per-row
  return (
    <View style={s.infoStrip}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[
            s.ic,
            i % 2 === 1 ? s.icEven : {},
            i >= cells.length - 2 ? { borderBottom: 'none' } : {},
          ]}
        >
          <Text style={s.icLbl}>{cell.label}</Text>
          <Text style={s.icVal}>{trunc(cell.value, 48) || '—'}</Text>
        </View>
      ))}
    </View>
  )
}

function SectionLabel({ label }) {
  return <Text style={s.sec}>{label}</Text>
}

function SubBar({ label, value }) {
  return (
    <View style={s.subBar}>
      <Text style={s.subBarLbl}>{label}</Text>
      <Text style={s.subBarVal}>{fmtN(value)}</Text>
    </View>
  )
}

function GrandBar({ label, sub, value, standalone = false, small = false }) {
  return (
    <View style={[
      s.grandBar,
      standalone ? s.grandBarStandalone : {},
      small ? s.grandBarSmall : {},
    ]}>
      <View>
        <Text style={[s.gl, standalone ? s.glStandalone : {}, small ? s.glSmall : {}]}>{label}</Text>
        {sub ? <Text style={s.gs}>{sub}</Text> : null}
      </View>
      <Text style={[s.gv, standalone ? s.gvStandalone : {}, small ? s.gvSmall : {}]}>{fmtN(value)}</Text>
    </View>
  )
}

function TotalsStrip({ items }) {
  return (
    <View style={s.totalsStrip}>
      {items.map((item, i) => (
        <View key={i} style={[s.ts, i === items.length - 1 ? s.tsLast : {}]}>
          <Text style={s.tsLbl}>{item.label}</Text>
          <Text style={s.tsVal}>{fmtN(item.value)}</Text>
        </View>
      ))}
    </View>
  )
}

function PageFooter({ project, preparedBy }) {
  return (
    <View style={{ position: 'absolute', bottom: 14, left: 34, right: 34 }} fixed>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTop: `1 solid ${C.border}`, paddingTop: 4 }}>
        <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A' }}>
          {`${fmtId(project?.id)}  |  ${fmtD(project?.bidDate)}${project?.contactName ? `  |  ${project.contactName}` : ''}`}
        </Text>
        <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A' }}>
          {`${preparedBy ? `Prepared by ${preparedBy}  |  ` : ''}Engstrom Wood Products`}
        </Text>
      </View>
    </View>
  )
}

function ExecutiveSummaryPage({ project, roomTotals, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy, docType }) {
  const perRoomDelivery = delivery > 0 && roomTotals.length > 0 ? delivery / roomTotals.length : 0
  const projectSubtotal = roomTotals.reduce((sum, r) => sum + r.total, 0) + delivery
  const hasTax = project.installationType ? project.installationType === "contractor" : project.taxEnabled

  const hasCab = roomTotals.some(r => r.cab + r.upg > 0)
  const hasCtp = roomTotals.some(r => r.ctp > 0)
  const hasFin = roomTotals.some(r => r.fin > 0)
  const hasInst = roomTotals.some(r => r.inst > 0)

  const cols = [{ w: null, label: 'Room' }]
  if (hasCab) cols.push({ w: null, label: 'Cabinetry', right: true })
  if (hasCtp) cols.push({ w: null, label: 'Countertops', right: true })
  if (hasFin) cols.push({ w: null, label: 'Finishing', right: true })
  if (hasInst) cols.push({ w: null, label: 'Installation', right: true })
  cols.push({ w: null, label: 'Room Total', right: true })

  const dataCols = cols.length
  const nameW = dataCols <= 4 ? '40%' : '28%'
  const numW = `${Math.floor((100 - parseInt(nameW)) / (dataCols - 1))}%`
  const roomTableCols = cols.map((c, i) => ({ ...c, w: i === 0 ? nameW : numW }))

  const grandCab = roomTotals.reduce((s, r) => s + r.cab + r.upg, 0)
  const grandCtp = roomTotals.reduce((s, r) => s + r.ctp, 0)
  const grandFin = roomTotals.reduce((s, r) => s + r.fin, 0)
  const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0)

  return (
    <Page size="LETTER" orientation="landscape" style={[s.page, { paddingTop: 24, paddingBottom: 38 }]}>
      <View style={[s.hdr, { paddingTop: 8, paddingBottom: 8, marginBottom: 14 }]} fixed>
        <View style={s.coBrand}>
          <Image style={{ width: 38, height: 38 }} src={LOGO_SRC} />
          <View>
            <Text style={[s.coName, { fontSize: 20 }]}>Engstrom Wood Products</Text>
            <Text style={[s.coTag, { fontSize: 6.5 }]}>Custom Cabinetry  ·  Fine Woodworking  ·  Precision Installation</Text>
          </View>
        </View>
        <View>
          <Text style={[s.docType, { fontSize: 12 }]}>{docType || 'QUOTE'}</Text>
          <Text style={s.docId}>{fmtId(project.id)}</Text>
          <Text style={[s.docDate, { fontSize: 6.5 }]}>{fmtD(project.bidDate)}</Text>
        </View>
      </View>

      <Text style={{ fontFamily: FONT_SERIF_BD, fontSize: 16, color: '#1A1A1A', letterSpacing: 0.5, marginBottom: 12, textAlign: 'center' }}>
        Executive Summary
      </Text>

      <View style={[s.infoStrip, { marginBottom: 14 }]}>
        {[
          { label: 'Project Name', value: project.name },
          { label: 'Address', value: project.address },
          { label: 'Bid Date', value: fmtD(project.bidDate) },
          { label: 'Contact', value: project.contactName },
          { label: 'Phone', value: project.contactPhone },
          { label: 'Email', value: project.email },
        ].map((cell, i) => (
          <View key={i} style={[s.ic, i % 2 === 1 ? s.icEven : {}, i >= 4 ? { borderBottom: 'none' } : {}, { paddingTop: 5, paddingBottom: 5 }]}>
            <Text style={[s.icLbl, { fontSize: 6, marginBottom: 2 }]}>{cell.label}</Text>
            <Text style={[s.icVal, { fontSize: 9.5 }]}>{trunc(cell.value, 48) || '—'}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginBottom: 14 }}>
        <SectionLabel label="Room Summary" />
      </View>
      <View style={[s.tblWrap, { marginBottom: 16 }]}>
        <TableHeader colDefs={roomTableCols} />
        {roomTotals.map((r, i) => {
          const cells = [{ val: trunc(r.name || `Room ${i + 1}`, 50) }]
          if (hasCab) cells.push({ val: fmtN(r.cab + r.upg), right: true })
          if (hasCtp) cells.push({ val: fmtN(r.ctp), right: true })
          if (hasFin) cells.push({ val: fmtN(r.fin), right: true })
          if (hasInst) cells.push({ val: fmtN(r.inst), right: true })
          cells.push({ val: fmtN(r.total + perRoomDelivery), amt: true })
          return (
            <TableRow
              key={i}
              colDefs={roomTableCols}
              isEven={i % 2 === 1}
              cells={cells}
            />
          )
        })}
        {(() => {
          const cells = [{ val: 'TOTALS', bold: true }]
          if (hasCab) cells.push({ val: fmtN(grandCab), right: true, bold: true })
          if (hasCtp) cells.push({ val: fmtN(grandCtp), right: true, bold: true })
          if (hasFin) cells.push({ val: fmtN(grandFin), right: true, bold: true })
          if (hasInst) cells.push({ val: fmtN(grandInst), right: true, bold: true })
          cells.push({ val: fmtN(roomTotals.reduce((s, r) => s + r.total, 0) + delivery), amt: true, bold: true })
          return <TableRow colDefs={roomTableCols} cells={cells} />
        })()}
      </View>

      <View wrap={false} style={{ marginTop: 'auto' }}>
        {hasTax && (
          <GrandBar label={`Estimated Tax (${pdfTaxRate}%)`} sub={`Applied to project subtotal${delivery > 0 ? ' including delivery' : ''}`} value={pdfTaxAmt} standalone small />
        )}
        <GrandBar
          label="Grand Total"
          sub={[
            `${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`,
            delivery > 0 ? 'delivery included in room totals' : '',
            hasTax ? `incl. ${pdfTaxRate}% tax` : '',
          ].filter(Boolean).join('  ·  ')}
          value={grandTotal}
          standalone
        />
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

function AcceptancePage({ project, preparedBy }) {
  return (
    <Page size="LETTER" orientation="landscape" style={[s.page, { paddingBottom: 40 }]}>
      <PageHeader
        docType="ACCEPTANCE"
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
        project={project}
        showProjectRibbon
      />

      <Text style={{ fontFamily: FONT_SERIF_BD, fontSize: 15, color: '#1A1A1A', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' }}>
        Terms & Acceptance
      </Text>

      <View style={{ border: `1 solid ${C.border}`, borderLeft: `3 solid ${C.stone}`, backgroundColor: C.ivory, paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, marginBottom: 12 }}>
        <Text style={{ fontFamily: FONT_SANS_BD, fontSize: 8, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Disclaimer</Text>
        <Text style={{ fontFamily: FONT_SANS, fontSize: 8, color: '#1A1A1A', lineHeight: 1.6 }}>
          Pricing provided in this proposal is based on preliminary cabinet layouts, specifications, and selections. Final pricing is subject to adjustment upon completion and approval of final cabinet build plans, dimensions, materials, finishes, hardware, accessories, and any other customer-selected options. Any changes to the scope, design, or specifications may result in revisions to the quoted price.
        </Text>
      </View>

      <View style={{ border: `1 solid ${C.border}`, borderLeft: `3 solid ${C.stone}`, backgroundColor: C.ivory, paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, marginBottom: 12 }}>
        <Text style={{ fontFamily: FONT_SANS_BD, fontSize: 8, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Validity</Text>
        <Text style={{ fontFamily: FONT_SANS, fontSize: 8, color: '#1A1A1A', lineHeight: 1.6 }}>
          This estimate is valid for 30 days from the bid date shown above. All prices are subject to final measurement verification. Pricing does not include permits, engineering, or items not explicitly listed in this proposal.
        </Text>
      </View>

      <View style={{ border: `1 solid ${C.border}`, borderLeft: `3 solid ${C.stone}`, backgroundColor: C.ivory, paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, marginBottom: 16 }}>
        <Text style={{ fontFamily: FONT_SANS_BD, fontSize: 8, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Payment Terms</Text>
        <Text style={{ fontFamily: FONT_SANS, fontSize: 8, color: '#1A1A1A', lineHeight: 1.6 }}>
          A deposit of 50% is due upon acceptance. The remaining balance is due upon completion of installation. All payments are non-refundable once materials have been ordered.
        </Text>
      </View>

      <Text style={{ fontFamily: FONT_SANS, fontSize: 8, color: '#1A1A1A', marginBottom: 8, lineHeight: 1.5 }}>
        By signing below, the client acknowledges that they have reviewed the scope of work, pricing, and terms outlined in this proposal and agrees to proceed as described.
      </Text>

      <View style={[s.sigGrid, { marginTop: 4, gap: 30 }]}>
        <View style={s.sigBlock}>
          <Text style={[s.sigTitle, { marginBottom: 4 }]}>Client Acceptance</Text>
          <View style={[s.sigLine, { height: 24 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A', marginBottom: 8 }}>Signature</Text>
          <View style={[s.sigSubLine, { height: 16 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A', marginBottom: 8 }}>Printed Name</Text>
          <View style={[s.sigSubLine, { height: 16 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A' }}>Date</Text>
        </View>
        <View style={s.sigBlock}>
          <Text style={[s.sigTitle, { marginBottom: 4 }]}>Authorized by Engstrom Wood Products</Text>
          <View style={[s.sigLine, { height: 24 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A', marginBottom: 8 }}>Signature</Text>
          <View style={[s.sigSubLine, { height: 16 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A', marginBottom: 8 }}>Printed Name</Text>
          <View style={[s.sigSubLine, { height: 16 }]} />
          <Text style={{ fontFamily: FONT_SANS, fontSize: 6.5, color: '#1A1A1A' }}>Date</Text>
        </View>
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

// ── TABLE HELPERS ──────────────────────────────────────────────────────────

// colDefs: [{ w: '22%', label: 'Product Type', right: false }, ...]
function TableHeader({ colDefs }) {
  return (
    <View style={[s.tRow, s.tRowHdr]}>
      {colDefs.map((col, i) => (
        <View key={i} style={[{ width: col.w }, i > 0 ? s.tBorderL : {}]}>
          <Text style={[s.tCellHdr, col.right ? s.tCellR : {}]}>{col.label}</Text>
        </View>
      ))}
    </View>
  )
}

function TableRow({ colDefs, cells, isEven }) {
  // cells: [{ val, right, amt, muted, bold }]
  return (
    <View style={[s.tRow, isEven ? s.tRowAlt : {}]}>
      {colDefs.map((col, i) => {
        const cell = cells[i] || {}
        return (
          <View key={i} style={[{ width: col.w }, i > 0 ? s.tBorderL2 : {}]}>
            <Text style={[
              s.tCell,
              cell.right ? s.tCellR : {},
              cell.amt ? s.tCellAmt : {},
              cell.muted ? s.tCellMuted : {},
              cell.bold ? { fontFamily: FONT_SANS_BD } : {},
            ]}>
              {cell.val ?? ''}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function EmptyRow({ colCount, label }) {
  return (
    <View style={[s.tRow]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.tCell, s.tCellMuted]}>{label}</Text>
      </View>
    </View>
  )
}

// ── INTERNAL SUMMARY PAGE ──────────────────────────────────────────────────

function InternalSummaryPage({
  project, roomTotals,
  grandCab, grandUpg, grandCtp, grandFin, grandInst,
  delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy,
}) {
  const perRoomDelivery = delivery > 0 && roomTotals.length > 0 ? delivery / roomTotals.length : 0
  const roomTableCols = [
    { w: '22%', label: 'Room' },
    { w: '13%', label: 'Cabinetry', right: true },
    { w: '12%', label: 'Upgrades', right: true },
    { w: '12%', label: 'Countertops', right: true },
    { w: '12%', label: 'Finishing', right: true },
    { w: '14%', label: 'Installation', right: true },
    { w: '15%', label: 'Room Total', right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={[s.page, { paddingBottom: 40 }]}>
      <PageHeader
        docType="INTERNAL — ROOM BREAKDOWN"
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
        project={project}
        showProjectRibbon
      />

      <SectionLabel label="Room Breakdown" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={roomTableCols} />
        {roomTotals.map((r, i) => (
          <TableRow
            key={i}
            colDefs={roomTableCols}
            isEven={i % 2 === 1}
            cells={[
              { val: trunc(r.name || `Room ${i + 1}`, 36) },
              { val: fmtN(r.cab), right: true },
              { val: fmtN(r.upg), right: true },
              { val: fmtN(r.ctp), right: true },
              { val: fmtN(r.fin), right: true },
              { val: fmtN(r.inst), right: true },
              { val: fmtN(r.total + perRoomDelivery), amt: true },
            ]}
          />
        ))}
      </View>

      <View wrap={false}>
        <SubBar
          label={`Project Totals — all ${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''} combined${delivery > 0 ? ' (incl. delivery)' : ''}`}
          value={grandCab + grandUpg + grandCtp + grandFin + grandInst + delivery}
        />

        {(project.installationType ? project.installationType === "contractor" : project.taxEnabled) && (
          <GrandBar label={`Estimated Tax (${pdfTaxRate}%)`} sub={`Applied to project subtotal${delivery > 0 ? ' including delivery' : ''}`} value={pdfTaxAmt} standalone small />
        )}

        <GrandBar
          label="Grand Total"
          sub={[
            `All rooms · ${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`,
            delivery > 0 ? 'delivery included in room totals' : '',
            (project.installationType ? project.installationType === "contractor" : project.taxEnabled) ? `incl. ${pdfTaxRate}% tax` : '',
          ].filter(Boolean).join('  ·  ')}
          value={grandTotal}
          standalone
        />
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

// ── INTERNAL ROOM PAGE ─────────────────────────────────────────────────────

const HOURLY_RATE = 'Hourly Rate'

function InternalRoomPage({ project, room, roomIndex, totalRooms, rt, pricing, preparedBy, delivery }) {
  const cabItems = room.cabinetry.filter(i => i.product && parseFloat(i.qty) !== 0)
  const upgItems = room.upgrades.filter(i => i.upgrade && parseFloat(i.qty) !== 0)
  const ctpItems = (room.countertops || []).filter(i => i.product && parseFloat(i.qty) !== 0)
  const finItems = room.finishing.filter(i => i.type && parseFloat(i.lf) !== 0)
  const instDef  = pricing.installType?.find(i => i.name === room.install.type)

  const qs = project.quoteSections || {}
  const qd = { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" }
  const cfgI = (k) => ({ ...qd, ...(qs[k] || {}) })

  const cabCols = [
    { w: '22%', label: 'Product Type' },
    { w: '14%', label: 'Construction' },
    { w: '11%', label: 'Wood Type' },
    { w: '6%',  label: 'Con%', right: true },
    { w: '6%',  label: 'Spec%', right: true },
    { w: '6%',  label: 'Qty', right: true },
    { w: '6%',  label: 'Fin.LF', right: true },
    { w: '12%', label: 'Std Price', right: true },
    { w: '17%', label: 'Mod. Total', right: true },
  ]

  const upgCols = [
    { w: '36%', label: 'Description' },
    { w: '8%',  label: 'Qty', right: true },
    { w: '12%', label: 'Unit $', right: true },
    { w: '12%', label: 'Price', right: true },
    { w: '8%',  label: '% Adj', right: true },
    { w: '12%', label: 'Total', right: true },
    { w: '12%', label: 'Notes' },
  ]

  const finCols = [
    { w: '30%', label: 'Type' },
    { w: '9%',  label: 'Lin.Ft', right: true },
    { w: '13%', label: 'Price/LF', right: true },
    { w: '13%', label: 'Subtotal', right: true },
    { w: '8%',  label: '% Adj', right: true },
    { w: '13%', label: 'Total', right: true },
    { w: '14%', label: 'Notes' },
  ]

  // Compute install display values
  const instMetric = room.install.type === HOURLY_RATE
    ? `${room.install.metric || '0'} hrs × $135.00/hr`
    : instDef ? `${(instDef.rate * 100).toFixed(0)}% of cabinetry` : '—'
  const instPrice = room.install.type === HOURLY_RATE
    ? fmtN((parseFloat(room.install.metric) || 0) * 135)
    : fmtN(instDef ? rt.cab * instDef.rate : 0)
  const instAdj = room.install.adjPct ? `${room.install.adjPct}%` : '0%'

  // Build cabinetry row cells
  const cabRowCells = cabItems.map(item => {
    const prod = pricing.woodwork?.find(w => w.name === item.product)
    const con  = pricing.construction?.find(c => c.name === item.construction)
    const wood = pricing.wood?.find(w => w.name === item.wood)
    const sp   = prod ? prod.price * (1 + (con?.premium || 0)) * (1 + (wood?.premium || 0)) : 0
    const qty  = parseFloat(item.qty) || 0
    const finLF = prod ? (prod.finLF * qty).toFixed(1) : '0.0'
    const adj  = parseFloat(item.adjPct) || 0
    const tot  = sp * qty * (1 + adj / 100)
    return [
      { val: trunc(item.product, 36) },
      { val: item.construction === 'Not Applicable' ? '—' : trunc(item.construction || '—', 22) },
      { val: item.wood === 'Not Applicable' ? '—' : trunc(item.wood || '—', 18) },
      { val: con?.premium ? `${(con.premium * 100).toFixed(0)}%` : '0%', right: true },
      { val: wood?.premium ? `${(wood.premium * 100).toFixed(0)}%` : '0%', right: true },
      { val: String(qty), right: true },
      { val: finLF, right: true },
      { val: fmtN(sp), right: true },
      { val: fmtN(tot), amt: true },
    ]
  })

  const upgRowCells = upgItems.map(item => {
    const upg = pricing.upgrades?.find(u => u.name === item.upgrade)
    const qty = parseFloat(item.qty) || 0
    const adj = parseFloat(item.adjPct) || 0
    const tot = (upg?.price || 0) * qty * (1 + adj / 100)
    return [
      { val: trunc(item.upgrade, 44) },
      { val: String(qty), right: true },
      { val: fmtN(upg?.price || 0), right: true },
      { val: fmtN((upg?.price || 0) * qty), right: true },
      { val: adj ? `${adj}%` : '—', right: true },
      { val: fmtN(tot), amt: true },
      { val: trunc(item.notes || '', 30) },
    ]
  })

  const finRowCells = finItems.map(item => {
    const fin = pricing.finishing?.find(f => f.name === item.type)
    const lf  = parseFloat(item.lf) || 0
    const adj = parseFloat(item.adjPct) || 0
    const sub2 = (fin?.pricePerLF || 0) * lf
    const tot  = sub2 * (1 + adj / 100)
    return [
      { val: trunc(item.type, 38) },
      { val: String(lf), right: true },
      { val: `${fmtN(fin?.pricePerLF || 0)}/LF`, right: true },
      { val: fmtN(sub2), right: true },
      { val: adj ? `${adj}%` : '—', right: true },
      { val: fmtN(tot), amt: true },
      { val: trunc(item.notes || '', 30) },
    ]
  })

  const instInfoCols = [
    { w: '25%', label: 'Install Type' },
    { w: '25%', label: 'Metric / Method' },
    { w: '25%', label: 'Base Price' },
    { w: '25%', label: '% Adjustment' },
  ]
  const instInfoCells = [
    { val: room.install.type || '—' },
    { val: instMetric },
    { val: instPrice, right: true },
    { val: instAdj, right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={[s.page, { paddingBottom: 40 }]}>
      <PageHeader
        docType={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  ${roomIndex + 1} of ${totalRooms}`}
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
        project={project}
        showProjectRibbon
      />

      {/* Cabinetry */}
      {cfgI('cabinetry').showInternal && (<>
      <SectionLabel label="Cabinetry" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={cabCols} />
        {cabItems.length === 0
          ? <EmptyRow colCount={9} label="No cabinetry items entered" />
          : cabRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={cabCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Cabinetry Total" value={rt.cab} />
      </>)}

      {/* Upgrades */}
      {cfgI('upgrades').showInternal && (<>
      <SectionLabel label="Upgrades / Overrides" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={upgCols} />
        {upgItems.length === 0
          ? <EmptyRow colCount={7} label="No upgrades entered" />
          : upgRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={upgCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Upgrades Total" value={rt.upg} />
      </>)}

      {/* Countertops */}
      {cfgI('countertops').showInternal && (<>
      <SectionLabel label="Countertops" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={[
          { w: '36%', label: 'Description' },
          { w: '8%',  label: 'Qty', right: true },
          { w: '12%', label: 'Unit $', right: true },
          { w: '12%', label: 'Price', right: true },
          { w: '8%',  label: '% Adj', right: true },
          { w: '12%', label: 'Total', right: true },
          { w: '12%', label: 'Notes' },
        ]} />
        {ctpItems.length === 0
          ? <EmptyRow colCount={7} label="No countertop items entered" />
          : ctpItems.map((item, i) => {
              const ctp = pricing.countertops?.find(c => c.name === item.product)
              const qty = parseFloat(item.qty) || 0
              const adj = parseFloat(item.adjPct) || 0
              const tot = (ctp?.price || 0) * qty * (1 + adj / 100)
              return (
                <TableRow
                  key={i}
                  colDefs={[
                    { w: '36%' }, { w: '8%' }, { w: '12%' }, { w: '12%' }, { w: '8%' }, { w: '12%' }, { w: '12%' },
                  ]}
                  isEven={i % 2 === 1}
                  cells={[
                    { val: trunc(item.product, 44) },
                    { val: String(qty), right: true },
                    { val: fmtN(ctp?.price || 0), right: true },
                    { val: fmtN((ctp?.price || 0) * qty), right: true },
                    { val: adj ? `${adj}%` : '—', right: true },
                    { val: fmtN(tot), amt: true },
                    { val: trunc(item.notes || '', 30) },
                  ]}
                />
              )
            })
        }
      </View>
      <SubBar label="Countertops Total" value={rt.ctp} />
      </>)}

      {/* Finishing */}
      {cfgI('finishing').showInternal && (<>
      <SectionLabel label="Finishing" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={finCols} />
        {finItems.length === 0
          ? <EmptyRow colCount={7} label="No finishing items entered" />
          : finRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={finCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Finishing Total" value={rt.fin} />
      </>)}

      {/* Installation */}
      {cfgI('install').showInternal && (<>
      <SectionLabel label="Installation" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={instInfoCols} />
        <TableRow colDefs={instInfoCols} cells={instInfoCells} isEven={false} />
      </View>
      <SubBar label="Install Total" value={rt.inst} />
      </>)}

      <View wrap={false}>
        <TotalsStrip items={[
          ...(cfgI('cabinetry').showInternal ? [{ label: 'Cabinetry', value: rt.cab }] : []),
          ...(cfgI('upgrades').showInternal ? [{ label: 'Upgrades', value: rt.upg }] : []),
          ...(cfgI('countertops').showInternal ? [{ label: 'Countertops', value: rt.ctp }] : []),
          ...(cfgI('finishing').showInternal ? [{ label: 'Finishing', value: rt.fin }] : []),
          ...(cfgI('install').showInternal ? [{ label: 'Installation', value: rt.inst }] : []),
        ]} />
        <GrandBar
          label="Room Grand Total"
          sub={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  Room ${roomIndex + 1} of ${totalRooms}`}
          value={rt.total + delivery}
        />
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

// ── INTERNAL DOCUMENT ──────────────────────────────────────────────────────

function InternalPDFDoc({ project, rooms, roomTotals, grandCab, grandUpg, grandCtp, grandFin, grandInst, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, pricing, preparedBy }) {
  return (
    <Document title={`${project.name || 'Estimate'} — Internal`} author="Engstrom Wood Products">
      <ExecutiveSummaryPage
        project={project}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
        docType="QUOTE — INTERNAL"
      />
      <InternalSummaryPage
        project={project}
        roomTotals={roomTotals}
        grandCab={grandCab}
        grandUpg={grandUpg}
        grandCtp={grandCtp}
        grandFin={grandFin}
        grandInst={grandInst}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
      {rooms.map((room, i) => (
        <InternalRoomPage
          key={i}
          project={project}
          room={room}
          roomIndex={i}
          totalRooms={rooms.length}
          rt={roomTotals[i]}
          pricing={pricing}
          preparedBy={preparedBy}
          delivery={rooms.length > 0 ? delivery / rooms.length : 0}
        />
      ))}
      <AcceptancePage project={project} preparedBy={preparedBy} />
    </Document>
  )
}

// ── CUSTOMER SUMMARY PAGE ──────────────────────────────────────────────────

function CustomerSummaryPage({
  project, roomTotals,
  delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy,
  compact = false,
}) {
  const perRoomDelivery = delivery > 0 && roomTotals.length > 0 ? delivery / roomTotals.length : 0
  const hasCab = roomTotals.some(r => r.cab + r.upg > 0)
  const hasCtp = roomTotals.some(r => r.ctp > 0)
  const hasFin = roomTotals.some(r => r.fin > 0)
  const hasInst = roomTotals.some(r => r.inst > 0)

  const cols = [{ w: null, label: 'Room' }]
  if (hasCab) cols.push({ w: null, label: 'Cabinetry', right: true })
  if (hasCtp) cols.push({ w: null, label: 'Countertops', right: true })
  if (hasFin) cols.push({ w: null, label: 'Finishing', right: true })
  if (hasInst) cols.push({ w: null, label: 'Installation', right: true })
  cols.push({ w: null, label: 'Room Total', right: true })

  const dataCols = cols.length
  const nameW = dataCols <= 4 ? '40%' : '28%'
  const numW = `${Math.floor((100 - parseInt(nameW)) / (dataCols - 1))}%`
  const roomTableCols = cols.map((c, i) => ({ ...c, w: i === 0 ? nameW : numW }))

  const grandCab = roomTotals.reduce((s, r) => s + r.cab + r.upg, 0)
  const grandCtp = roomTotals.reduce((s, r) => s + r.ctp, 0)
  const grandFin = roomTotals.reduce((s, r) => s + r.fin, 0)
  const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0)

  const pgStyle = compact
    ? [s.page, { paddingTop: 18, paddingBottom: 30, paddingLeft: 28, paddingRight: 28 }]
    : [s.page, { paddingBottom: 40 }]

  return (
    <Page size="LETTER" orientation="landscape" style={pgStyle}>
      <PageHeader
        docType="QUOTE — ROOM SUMMARY"
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
        project={project}
        showProjectRibbon
      />

      <SectionLabel label="Room Summary" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={roomTableCols} />
        {roomTotals.map((r, i) => {
          const cells = [{ val: trunc(r.name || `Room ${i + 1}`, 50) }]
          if (hasCab) cells.push({ val: fmtN(r.cab + r.upg), right: true })
          if (hasCtp) cells.push({ val: fmtN(r.ctp), right: true })
          if (hasFin) cells.push({ val: fmtN(r.fin), right: true })
          if (hasInst) cells.push({ val: fmtN(r.inst), right: true })
          cells.push({ val: fmtN(r.total + perRoomDelivery), amt: true })
          return (
            <TableRow
              key={i}
              colDefs={roomTableCols}
              isEven={i % 2 === 1}
              cells={cells}
            />
          )
        })}
        {/* Totals row */}
        {(() => {
          const cells = [{ val: 'TOTALS', bold: true }]
          if (hasCab) cells.push({ val: fmtN(grandCab), right: true, bold: true })
          if (hasCtp) cells.push({ val: fmtN(grandCtp), right: true, bold: true })
          if (hasFin) cells.push({ val: fmtN(grandFin), right: true, bold: true })
          if (hasInst) cells.push({ val: fmtN(grandInst), right: true, bold: true })
          cells.push({ val: fmtN(roomTotals.reduce((s, r) => s + r.total, 0) + delivery), amt: true, bold: true })
          return <TableRow colDefs={roomTableCols} cells={cells} />
        })()}
      </View>

      <View wrap={false}>
        {(project.installationType ? project.installationType === "contractor" : project.taxEnabled) && (
          <GrandBar label={`Estimated Tax (${pdfTaxRate}%)`} sub={`Applied to project subtotal${delivery > 0 ? ' including delivery' : ''}`} value={pdfTaxAmt} standalone small />
        )}

        <GrandBar
          label="Grand Total"
          sub={[
            `${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`,
            delivery > 0 ? 'delivery included in room totals' : '',
            (project.installationType ? project.installationType === "contractor" : project.taxEnabled) ? `incl. ${pdfTaxRate}% tax` : '',
          ].filter(Boolean).join('  ·  ')}
          value={grandTotal}
          standalone
        />
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

// ── CUSTOMER ROOM PAGE ─────────────────────────────────────────────────────

function CustomerRoomPage({ project, room, roomIndex, totalRooms, rt, delivery, preparedBy }) {
  const qs = project.quoteSections || {}
  const qd = { showInternal: true, showExternal: true, showDetailExt: true, showPricingExt: false, rollInto: "" }
  const cfg = (k) => ({ ...qd, ...(qs[k] || {}) })

  const cabItems = room.cabinetry.filter(i => i.product && parseFloat(i.qty) !== 0)
  const upgItems = room.upgrades.filter(i => i.upgrade && parseFloat(i.qty) !== 0)
  const ctpItems = (room.countertops || []).filter(i => i.product && parseFloat(i.qty) !== 0)
  const finItems = room.finishing.filter(i => i.type && parseFloat(i.lf) !== 0)
  const hasInstall = room.install.type && room.install.type !== 'No Install'

  const descCols = [
    { w: '60%', label: 'Description' },
    { w: '40%', label: 'Notes' },
  ]

  const cabDescCols = [
    { w: '60%', label: 'Description' },
    { w: '40%', label: 'Notes' },
  ]

  const upgDescCols = [
    { w: '45%', label: 'Description' },
    { w: '15%', label: 'Qty', right: true },
    { w: '40%', label: 'Notes' },
  ]

  // Build summary with roll-up logic from quoteSections
  const amounts = { cabinetry: rt.cab, upgrades: rt.upg, countertops: rt.ctp, finishing: rt.fin, install: rt.inst, delivery: delivery }
  const labels  = { cabinetry: 'Cabinets / Casework', upgrades: 'Upgrades / Overrides', countertops: 'Countertops', finishing: 'Finishing', install: 'Installation', delivery: 'Delivery' }
  const keys = ['cabinetry', 'upgrades', 'countertops', 'finishing', 'install', 'delivery']

  // Calculate rolled totals
  const rolledTotals = {}
  keys.forEach(k => {
    const c = cfg(k)
    if (!c.showExternal) return
    const target = c.rollInto && c.rollInto !== k ? c.rollInto : k
    rolledTotals[target] = (rolledTotals[target] || 0) + (amounts[k] || 0)
  })

  // Build summary items preserving order, combining labels for rolled items
  const rolledLabels = {}
  keys.forEach(k => {
    const c = cfg(k)
    if (!c.showExternal) return
    const target = c.rollInto && c.rollInto !== k ? c.rollInto : k
    if (!rolledLabels[target]) rolledLabels[target] = []
    rolledLabels[target].push(labels[k])
  })

  const summaryItems = keys
    .filter(k => rolledTotals[k] != null && rolledTotals[k] > 0)
    .map(k => ({ label: rolledLabels[k].join(' + '), value: rolledTotals[k] }))

  const roomTotalWithDelivery = rt.total + delivery

  const sumCols = [
    { w: '60%', label: 'Category' },
    { w: '40%', label: 'Total', right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={[s.page, { paddingBottom: 40 }]}>
      <PageHeader
        docType={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  ${roomIndex + 1} of ${totalRooms}`}
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
        project={project}
        showProjectRibbon
      />

      {/* 1. Cabinets / Casework */}
      {cfg('cabinetry').showExternal && ((cfg('cabinetry').showDetailExt && cabItems.length > 0) || cfg('cabinetry').showPricingExt) && (
        <>
          <SectionLabel label="Cabinets / Casework" />
          {cfg('cabinetry').showDetailExt && cabItems.length > 0 && (
            <View style={s.tblWrap}>
              <TableHeader colDefs={cabDescCols} />
              {cabItems.map((item, i) => {
                const notes = [item.construction, item.wood]
                  .filter(v => v && v !== 'Not Applicable')
                  .join(' · ') || ''
                return (
                  <TableRow
                    key={i}
                    colDefs={cabDescCols}
                    isEven={i % 2 === 1}
                    cells={[
                      { val: trunc(item.product, 60) },
                      { val: trunc(notes, 50) },
                    ]}
                  />
                )
              })}
            </View>
          )}
          {cfg('cabinetry').showPricingExt ? <SubBar label="Cabinetry Total" value={rt.cab} /> : <View style={s.gap} />}
        </>
      )}

      {/* 2. Upgrades / Overrides */}
      {cfg('upgrades').showExternal && ((cfg('upgrades').showDetailExt && upgItems.length > 0) || cfg('upgrades').showPricingExt) && (
        <>
          <SectionLabel label="Upgrades / Overrides" />
          {cfg('upgrades').showDetailExt && upgItems.length > 0 && (
            <View style={s.tblWrap}>
              <TableHeader colDefs={upgDescCols} />
              {upgItems.map((item, i) => (
                <TableRow
                  key={i}
                  colDefs={upgDescCols}
                  isEven={i % 2 === 1}
                  cells={[
                    { val: trunc(item.upgrade, 50) },
                    { val: String(parseFloat(item.qty) || 0), right: true },
                    { val: trunc(item.notes || '', 40) },
                  ]}
                />
              ))}
            </View>
          )}
          {cfg('upgrades').showPricingExt ? <SubBar label="Upgrades Total" value={rt.upg} /> : <View style={s.gap} />}
        </>
      )}

      {/* 3. Countertops */}
      {cfg('countertops').showExternal && ((cfg('countertops').showDetailExt && ctpItems.length > 0) || cfg('countertops').showPricingExt) && (
        <>
          <SectionLabel label="Countertops" />
          {cfg('countertops').showDetailExt && ctpItems.length > 0 && (
            <View style={s.tblWrap}>
              <TableHeader colDefs={descCols} />
              {ctpItems.map((item, i) => (
                <TableRow
                  key={i}
                  colDefs={descCols}
                  isEven={i % 2 === 1}
                  cells={[
                    { val: trunc(item.product, 60) },
                    { val: trunc(item.notes || '', 50) },
                  ]}
                />
              ))}
            </View>
          )}
          {cfg('countertops').showPricingExt ? <SubBar label="Countertops Total" value={rt.ctp} /> : <View style={s.gap} />}
        </>
      )}

      {/* 4. Finishing */}
      {cfg('finishing').showExternal && ((cfg('finishing').showDetailExt && finItems.length > 0) || cfg('finishing').showPricingExt) && (
        <>
          <SectionLabel label="Finishing" />
          {cfg('finishing').showDetailExt && finItems.length > 0 && (
            <View style={s.tblWrap}>
              {finItems.map((item, i) => (
                <View key={i} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
                  <View style={{ width: '100%' }}>
                    <Text style={s.tCell}>{trunc(item.type, 60)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {cfg('finishing').showPricingExt ? <SubBar label="Finishing Total" value={rt.fin} /> : <View style={s.gap} />}
        </>
      )}

      {/* 5. Installation */}
      {cfg('install').showExternal && ((cfg('install').showDetailExt && hasInstall) || cfg('install').showPricingExt) && (
        <>
          <SectionLabel label="Installation" />
          {cfg('install').showDetailExt && hasInstall && (
            <View style={s.tblWrap}>
              <View style={s.tRow}>
                <View style={{ width: '100%' }}>
                  <Text style={s.tCell}>Professional installation — {room.install.type}</Text>
                </View>
              </View>
            </View>
          )}
          {cfg('install').showPricingExt ? <SubBar label="Installation Total" value={rt.inst} /> : <View style={s.gap} />}
        </>
      )}

      {/* 6. Delivery */}
      {cfg('delivery').showExternal && delivery > 0 && (cfg('delivery').showDetailExt || cfg('delivery').showPricingExt) && (
        <>
          <SectionLabel label="Delivery" />
          {cfg('delivery').showDetailExt && (
            <View style={s.tblWrap}>
              <View style={s.tRow}>
                <View style={{ width: '100%' }}>
                  <Text style={s.tCell}>
                    {project.deliveryNotes ? trunc(project.deliveryNotes, 80) : 'Delivery included'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {cfg('delivery').showPricingExt ? <SubBar label="Delivery Total" value={delivery} /> : <View style={s.gap} />}
        </>
      )}

      {/* Room Investment Summary — rolled totals */}
      <SectionLabel label="Room Summary" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={sumCols} />
        {summaryItems.map((sec, i) => (
          <TableRow
            key={i}
            colDefs={sumCols}
            isEven={i % 2 === 1}
            cells={[
              { val: sec.label },
              { val: fmtN(sec.value), amt: true },
            ]}
          />
        ))}
      </View>

      <View wrap={false}>
        <GrandBar
          label="Room Total"
          sub={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  Room ${roomIndex + 1} of ${totalRooms}`}
          value={roomTotalWithDelivery}
          standalone
        />
      </View>

      <PageFooter project={project} preparedBy={preparedBy} />
    </Page>
  )
}

// ── CUSTOMER DOCUMENT ──────────────────────────────────────────────────────

function CustomerPDFDoc({ project, rooms, roomTotals, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy }) {
  return (
    <Document title={`${project.name || 'Quote'} — Quote`} author="Engstrom Wood Products">
      <ExecutiveSummaryPage
        project={project}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
        docType="QUOTE"
      />
      {rooms.map((room, i) => (
        <CustomerRoomPage
          key={i}
          project={project}
          room={room}
          roomIndex={i}
          totalRooms={rooms.length}
          rt={roomTotals[i]}
          delivery={rooms.length > 0 ? delivery / rooms.length : 0}
          preparedBy={preparedBy}
        />
      ))}
      <AcceptancePage project={project} preparedBy={preparedBy} />
    </Document>
  )
}

// ── SUMMARY-ONLY CUSTOMER DOCUMENT (no per-room breakout) ─────────────────

function SummaryPDFDoc({ project, rooms, roomTotals, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy }) {
  return (
    <Document title={`${project.name || 'Quote'} — Summary`} author="Engstrom Wood Products">
      <CustomerSummaryPage
        project={project}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
        compact
      />
      <AcceptancePage project={project} preparedBy={preparedBy} />
    </Document>
  )
}

// ── EXPORT FUNCTIONS ───────────────────────────────────────────────────────
// Called from App.jsx; calc functions + PRICING are passed in.

export async function exportPDFInternal(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, pricing, preparedBy }, onStatus) {
  onStatus('generating')
  try {
    const roomTotals = rooms.map(r => {
      const cab  = calcCabinetry(r.cabinetry)
      const upg  = calcUpgrades(r.upgrades)
      const ctp  = calcCountertops(r.countertops)
      const fin  = calcFinishing(r.finishing)
      const inst = calcInstall(r.install, cab)
      return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
    })
    const grandCab  = roomTotals.reduce((s, r) => s + r.cab,  0)
    const grandUpg  = roomTotals.reduce((s, r) => s + r.upg,  0)
    const grandCtp  = roomTotals.reduce((s, r) => s + r.ctp,  0)
    const grandFin  = roomTotals.reduce((s, r) => s + r.fin,  0)
    const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0)
    const delivery   = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
    const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
    const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
    const pdfSubtotal = grandCab + grandUpg + grandCtp + grandFin + grandInst + delivery
    const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
    const grandTotal = pdfSubtotal + pdfTaxAmt

    const blob = await pdf(
      <InternalPDFDoc
        project={project}
        rooms={rooms}
        roomTotals={roomTotals}
        grandCab={grandCab}
        grandUpg={grandUpg}
        grandCtp={grandCtp}
        grandFin={grandFin}
        grandInst={grandInst}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        pricing={pricing}
        preparedBy={preparedBy}
      />
    ).toBlob()

    const safeName   = (project.name    || 'Estimate').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Estimate'
    const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
    const filePrefix = safeClient ? `${safeClient} — ${safeName}` : safeName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filePrefix} — Internal.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onStatus('done')
  } catch (err) {
    console.error('PDF generation error (internal):', err)
    onStatus('error', err?.message || 'PDF generation failed.')
  }
}

export async function exportPDFCustomer(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, preparedBy }, onStatus) {
  onStatus('generating')
  try {
    const roomTotals = rooms.map(r => {
      const cab  = calcCabinetry(r.cabinetry)
      const upg  = calcUpgrades(r.upgrades)
      const ctp  = calcCountertops(r.countertops)
      const fin  = calcFinishing(r.finishing)
      const inst = calcInstall(r.install, cab)
      return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
    })
    const delivery   = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
    const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
    const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
    const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
    const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
    const grandTotal = pdfSubtotal + pdfTaxAmt

    const blob = await pdf(
      <CustomerPDFDoc
        project={project}
        rooms={rooms}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
    ).toBlob()

    const safeName   = (project.name    || 'Quote').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Quote'
    const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
    const filePrefix = safeClient ? `${safeClient} — ${safeName}` : safeName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filePrefix} — Quote.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onStatus('done')
  } catch (err) {
    console.error('PDF generation error (customer):', err)
    onStatus('error', err?.message || 'PDF generation failed.')
  }
}

// Returns the internal PDF as a Blob (no download) — used for preview.
export async function buildInternalPDFBlob(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, pricing, preparedBy }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry)
    const upg  = calcUpgrades(r.upgrades)
    const ctp  = calcCountertops(r.countertops)
    const fin  = calcFinishing(r.finishing)
    const inst = calcInstall(r.install, cab)
    return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
  })
  const grandCab  = roomTotals.reduce((s, r) => s + r.cab,  0)
  const grandUpg  = roomTotals.reduce((s, r) => s + r.upg,  0)
  const grandCtp  = roomTotals.reduce((s, r) => s + r.ctp,  0)
  const grandFin  = roomTotals.reduce((s, r) => s + r.fin,  0)
  const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0)
  const delivery   = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
  const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
  const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  const pdfSubtotal = grandCab + grandUpg + grandCtp + grandFin + grandInst + delivery
  const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
  const grandTotal = pdfSubtotal + pdfTaxAmt

  return pdf(
    <InternalPDFDoc
      project={project}
      rooms={rooms}
      roomTotals={roomTotals}
      grandCab={grandCab}
      grandUpg={grandUpg}
      grandCtp={grandCtp}
      grandFin={grandFin}
      grandInst={grandInst}
      delivery={delivery}
      pdfTaxRate={pdfTaxRate}
      pdfTaxAmt={pdfTaxAmt}
      grandTotal={grandTotal}
      pricing={pricing}
      preparedBy={preparedBy}
    />
  ).toBlob()
}

// Returns the customer PDF as a Blob (no download) — used for email attachment and preview.
export async function buildCustomerPDFBlob(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, preparedBy }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry)
    const upg  = calcUpgrades(r.upgrades)
    const ctp  = calcCountertops(r.countertops)
    const fin  = calcFinishing(r.finishing)
    const inst = calcInstall(r.install, cab)
    return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
  })
  const delivery    = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
  const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
  const pdfTaxRate  = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
  const pdfTaxAmt   = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
  const grandTotal  = pdfSubtotal + pdfTaxAmt

  return pdf(
    <CustomerPDFDoc
      project={project}
      rooms={rooms}
      roomTotals={roomTotals}
      delivery={delivery}
      pdfTaxRate={pdfTaxRate}
      pdfTaxAmt={pdfTaxAmt}
      grandTotal={grandTotal}
      preparedBy={preparedBy}
    />
  ).toBlob()
}

// Summary PDF — just the overview page, no per-room breakout
export async function exportPDFSummary(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, preparedBy }, onStatus) {
  onStatus('generating')
  try {
    const roomTotals = rooms.map(r => {
      const cab  = calcCabinetry(r.cabinetry)
      const upg  = calcUpgrades(r.upgrades)
      const ctp  = calcCountertops(r.countertops)
      const fin  = calcFinishing(r.finishing)
      const inst = calcInstall(r.install, cab)
      return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
    })
    const delivery   = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
    const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
    const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
    const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
    const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
    const grandTotal = pdfSubtotal + pdfTaxAmt

    const blob = await pdf(
      <SummaryPDFDoc
        project={project}
        rooms={rooms}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
    ).toBlob()

    const safeName   = (project.name    || 'Quote').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Quote'
    const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
    const filePrefix = safeClient ? `${safeClient} — ${safeName}` : safeName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filePrefix} — Summary.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onStatus('done')
  } catch (err) {
    console.error('PDF generation error (summary):', err)
    onStatus('error', err?.message || 'PDF generation failed.')
  }
}

export async function buildSummaryPDFBlob(project, rooms, { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, preparedBy }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry)
    const upg  = calcUpgrades(r.upgrades)
    const ctp  = calcCountertops(r.countertops)
    const fin  = calcFinishing(r.finishing)
    const inst = calcInstall(r.install, cab)
    return { name: r.name, cab, upg, ctp, fin, inst, total: cab + upg + ctp + fin + inst }
  })
  const delivery    = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
  const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
  const pdfTaxRate  = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
  const pdfTaxAmt   = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
  const grandTotal  = pdfSubtotal + pdfTaxAmt

  return pdf(
    <SummaryPDFDoc
      project={project}
      rooms={rooms}
      roomTotals={roomTotals}
      delivery={delivery}
      pdfTaxRate={pdfTaxRate}
      pdfTaxAmt={pdfTaxAmt}
      grandTotal={grandTotal}
      preparedBy={preparedBy}
    />
  ).toBlob()
}
