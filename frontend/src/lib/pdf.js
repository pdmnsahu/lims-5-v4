import jsPDF from 'jspdf';

// ─── palette ──────────────────────────────────────────────────────────────────
const K    = [0,0,0];
const DG   = [80,80,80];
const MG   = [150,150,150];
const LG   = [210,210,210];
const HBG  = [242,242,242];   // header-cell background
const W    = [255,255,255];

// ─── helpers ──────────────────────────────────────────────────────────────────
function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return [String(dt.getDate()).padStart(2,'0'),
          String(dt.getMonth()+1).padStart(2,'0'),
          dt.getFullYear()].join('-');
}

// set font+size+color in one call
function T(doc, sz, bold, col) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(sz);
  doc.setTextColor(...(col || K));
}

// Draw a bordered rectangle (optionally filled)
function rect(doc, x, y, w, h, fill, strokeCol, lw) {
  if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F'); }
  doc.setDrawColor(...(strokeCol || LG));
  doc.setLineWidth(lw || 0.2);
  doc.rect(x, y, w, h, 'S');
}

// Draw a cell: border + fill + centered/left text, multiline safe
function C(doc, x, y, w, h, txt, {
  sz=7.5, bold=false, col=K, bg=null, stroke=LG, lw=0.2,
  ha='center', va='middle', px=1.5, py=0,
}={}) {
  rect(doc, x, y, w, h, bg, stroke, lw);
  if (txt === null || txt === undefined) return;
  T(doc, sz, bold, col);
  const s = String(txt);
  const maxW = w - px*2;
  const lines = doc.splitTextToSize(s, maxW);
  const lineH = sz * 0.352 * 1.45;
  const textH = lines.length * lineH;
  const ty = va === 'middle' ? y + h/2 - textH/2 + lineH*0.78
                             : y + py + lineH*0.78;
  const tx = ha === 'center' ? x + w/2 : ha === 'right' ? x + w - px : x + px;
  doc.text(lines, tx, ty, { align: ha });
}

async function loadImg(url) {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise(res => {
      const r = new FileReader();
      r.onload = () => {
        const i = new Image();
        i.onload  = () => res({ d:r.result, w:i.naturalWidth,  h:i.naturalHeight });
        i.onerror = () => res({ d:r.result, w:800, h:600 });
        i.src = r.result;
      };
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── SAMPLE REPORT ────────────────────────────────────────────────────────────
export async function downloadSampleReport(sample, tests) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const PW = 210, PH = 297;
  const ML = 10, MR = PW-ML, CW = MR-ML;   // 190 mm usable

  const bn  = n => tests.find(t => t.test_name === n) || {};
  const tM  = bn('Moisture');
  const tA  = bn('Ash');
  const tG  = bn('Gross Calorific Value');

  const labID    = sample.lab_internal_id  || '—';
  const custID   = sample.sample_ref_id    || '—';
  const grpRef   = sample.group_ref_id     || '—';
  const repDate  = dd(tG.reviewed_at || tA.reviewed_at || tM.reviewed_at || new Date());
  const rcvDate  = dd(sample.group_created_at);
  const anaStart = dd(tM.submitted_at || tA.submitted_at || tG.submitted_at);
  const anaEnd   = dd(tM.reviewed_at  || tA.reviewed_at  || tG.reviewed_at);

  // ── 1. HEADER ────────────────────────────────────────────────────────────────
  let y = 8;

  // Top-left: small italic "Unit of …"
  T(doc, 6, false, DG); doc.setFont('helvetica','italic');
  doc.text('Unit of CoalLIMS Laboratory', ML, y);

  // Lab name — large bold
  T(doc, 15, true, K);
  doc.text('CoalLIMS Laboratory', ML, y+7);

  // Top-right address block
  T(doc, 6, false, DG);
  const addr = [
    'Laboratory: Coal Testing Division,',
    sample.lab_address || 'India.',
    sample.lab_phone   ? `Phone: ${sample.lab_phone}`   : 'Phone: —',
    sample.lab_email   ? `Email: ${sample.lab_email}`   : 'Email: lab@coallims.com',
    sample.lab_website ? `Website: ${sample.lab_website}`: 'Website: www.coallims.com',
  ];
  doc.text(addr, MR, y, { align:'right' });

  // Format line — bottom right of header
  T(doc, 5.5, false, MG);
  doc.text(`Format: LIMS/F01/01  Date: ${dd(new Date())}  Rev: 01`, MR, y+17, { align:'right' });

  y += 20;

  // Double rule
  doc.setDrawColor(...K); doc.setLineWidth(0.7); doc.line(ML, y,   MR, y);
  doc.setLineWidth(0.25); doc.line(ML, y+1.3, MR, y+1.3);
  y += 4.5;

  // ── 2. TITLE BOX ─────────────────────────────────────────────────────────────
  const titleH = 14;
  rect(doc, ML, y, CW, titleH, null, K, 0.4);
  T(doc, 16, true, K);
  doc.text('TEST REPORT', PW/2, y+6.5, { align:'center' });
  T(doc, 7.5, false, DG);
  doc.text(labID, PW/2, y+11.5, { align:'center' });
  y += titleH+0.5;

  // ── 3. METADATA ROWS ─────────────────────────────────────────────────────────
  // Row A: Discipline | Chemical | Group | Solid Fuels
  const rA = 6;
  const wA = [CW*0.22, CW*0.28, CW*0.18, CW*0.32];
  let cx = ML;
  C(doc, cx, y, wA[0], rA, 'Discipline',  {bold:true, bg:HBG, ha:'left', sz:7}); cx+=wA[0];
  C(doc, cx, y, wA[1], rA, 'Chemical',    {ha:'left', sz:7}); cx+=wA[1];
  C(doc, cx, y, wA[2], rA, 'Group',       {bold:true, bg:HBG, ha:'left', sz:7}); cx+=wA[2];
  C(doc, cx, y, wA[3], rA, 'Solid Fuels', {ha:'left', sz:7});
  y += rA;

  // Row B: labels
  const rB = 5.5;
  const wB = [CW*0.20, CW*0.18, CW*0.22, CW*0.18, CW-CW*0.20-CW*0.18-CW*0.22-CW*0.18];
  const lblB = ['Test Report No','Report date','Customer PO','Date','Text Pages'];
  cx = ML;
  lblB.forEach((l,i) => { C(doc, cx, y, wB[i], rB, l, {bold:true, bg:HBG, ha:'left', sz:6.5}); cx+=wB[i]; });
  y += rB;

  // Row C: values
  const valB = [labID, repDate, grpRef, rcvDate, '1'];
  cx = ML;
  valB.forEach((v,i) => { C(doc, cx, y, wB[i], rB, v, {bold:i===0, ha:'left', sz:7}); cx+=wB[i]; });
  y += rB+1;

  // ── 4. CUSTOMER / DESCRIPTION BOX ────────────────────────────────────────────
  const half = CW/2;
  const hdrH = 5.5;

  // Header row
  C(doc, ML,      y, half, hdrH, 'Customer Name and address',      {bold:true, bg:HBG, ha:'left', sz:7});
  C(doc, ML+half, y, half, hdrH, 'Description of test item:- COAL',{bold:true, bg:HBG, ha:'left', sz:7});
  y += hdrH;

  // Body: left = customer details, right = empty bordered box
  const bodyH = 25;
  rect(doc, ML,      y, half, bodyH, null, LG, 0.2);
  rect(doc, ML+half, y, half, bodyH, null, LG, 0.2);

  T(doc, 7.5, false, K);
  const custLines = [
    sample.client_name || '',
    sample.client_address || '',
    sample.client_email ? sample.client_email : '',
  ].filter(Boolean);
  doc.text(custLines, ML+2, y+5);
  y += bodyH+1;

  // ── 5. AMBIENT CONDITIONS ROW ─────────────────────────────────────────────────
  const aW = CW/4, aLH = 5, aVH = 5.5;
  const ambLabels = ['Ambient Humidity (% RH)','Ambient Temperature (C)','Customer Sample ID','Sample lab ID'];
  const ambVals   = ['—', '—', custID, labID];
  cx = ML;
  ambLabels.forEach((l,i) => { C(doc, cx, y, aW, aLH, l, {bold:true, bg:HBG, ha:'left', sz:6.5}); cx+=aW; });
  y += aLH;
  cx = ML;
  ambVals.forEach((v,i) => { C(doc, cx, y, aW, aVH, v, {bold:i>=2, sz:8, ha:'center'}); cx+=aW; });
  y += aVH+2;

  // ── 6. TEST METHOD LINE ───────────────────────────────────────────────────────
  T(doc, 7.5, true, K);
  doc.text(
    'Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis',
    ML, y
  );
  y += 5.5;

  // ── 7. RESULTS TABLE ─────────────────────────────────────────────────────────
  // Exact column widths (mm) tuned to match reference layout at 190mm total
  const TW = { date:22, per:24, tm:18, aM:18, aA:17, aG:21, eM:18, eA:17, eG:21, gr:14 };
  const twTot = Object.values(TW).reduce((a,b)=>a+b,0);
  const sc = CW/twTot;
  Object.keys(TW).forEach(k=>TW[k]*=sc);

  const TX = {}; let tx2 = ML;
  for (const k of ['date','per','tm','aM','aA','aG','eM','eA','eG','gr']) {
    TX[k]=tx2; tx2+=TW[k];
  }
  const adbW = TW.aM+TW.aA+TW.aG;
  const eqW  = TW.eM+TW.eA+TW.eG;

  const R1H = 12;   // merged row for date/per/tm/gr (spans two header sub-rows)
  const R2H = 5.5;  // sub-header row for ADB/EQ columns
  const RDH = 9;    // data row

  const hOpts = { bold:true, bg:HBG, ha:'center', sz:6.5, stroke:LG };

  // Row 1 — tall cells for fixed columns + ADB/EQ super-headers (top half only)
  C(doc, TX.date, y, TW.date, R1H, 'Date of\nsample\nreceipt', hOpts);
  C(doc, TX.per,  y, TW.per,  R1H, 'Period of\nanalysis',      hOpts);
  C(doc, TX.tm,   y, TW.tm,   R1H, 'Total\nMoisture\n(%)',     hOpts);
  // ADB super-header — top R2H of the R1H slot
  C(doc, TX.aM,   y, adbW, R2H, 'Air Dried Basis (ADB)',       {...hOpts, sz:7});
  // EQ super-header
  C(doc, TX.eM,   y, eqW,  R2H, 'Equilibrated basis (60% RH and 40\u00b0C)', {...hOpts, sz:5.8});
  C(doc, TX.gr,   y, TW.gr, R1H, 'Grade', hOpts);

  // Row 2 — ADB/EQ sub-headers (bottom R2H of the R1H slot)
  const y2h = y + R2H;
  C(doc, TX.aM, y2h, TW.aM, R2H, 'Moisture\n(%)',   hOpts);
  C(doc, TX.aA, y2h, TW.aA, R2H, 'Ash\n(%)',        hOpts);
  C(doc, TX.aG, y2h, TW.aG, R2H, 'GCV\n(kCal/kg)', {...hOpts, sz:6});
  C(doc, TX.eM, y2h, TW.eM, R2H, 'Moisture\n(%)',   hOpts);
  C(doc, TX.eA, y2h, TW.eA, R2H, 'Ash\n(%)',        hOpts);
  C(doc, TX.eG, y2h, TW.eG, R2H, 'GCV\n(kCal/kg)', {...hOpts, sz:6});
  y += R1H;

  // Data row
  const dO = { ha:'center', sz:7, stroke:LG };
  const perStr = (anaStart && anaEnd && anaStart!==anaEnd)
    ? `${anaStart} to\n${anaEnd}`
    : (anaStart || '—');

  C(doc, TX.date, y, TW.date, RDH, rcvDate,              dO);
  C(doc, TX.per,  y, TW.per,  RDH, perStr,               {...dO, sz:6.2});
  C(doc, TX.tm,   y, TW.tm,   RDH, '—',                  dO);
  C(doc, TX.aM,   y, TW.aM,   RDH, tM.result_value||'—', dO);
  C(doc, TX.aA,   y, TW.aA,   RDH, tA.result_value||'—', dO);
  C(doc, TX.aG,   y, TW.aG,   RDH, tG.result_value||'—', dO);
  C(doc, TX.eM,   y, TW.eM,   RDH, '—',                  dO);
  C(doc, TX.eA,   y, TW.eA,   RDH, '—',                  dO);
  C(doc, TX.eG,   y, TW.eG,   RDH, '—',                  dO);
  C(doc, TX.gr,   y, TW.gr,   RDH, '—',                  dO);
  y += RDH + 4;

  // ── 8. PARR IMAGE (left) + AUTHORISED BY (right) ──────────────────────────────
  const gcvImg = tG.image_url ? await loadImg(tG.image_url) : null;

  // Remaining page height before declaration
  const declH  = 52;  // rough space for declaration + end + footer
  const footH  = 22;
  const availH = PH - y - declH - footH;
  const imgAreaW  = CW * 0.60;
  const authX     = ML + imgAreaW + 5;
  const authW     = CW - imgAreaW - 5;
  const maxImgH   = Math.min(availH, 65);

  if (gcvImg) {
    const asp = gcvImg.w / gcvImg.h;
    let iW = imgAreaW, iH = iW / asp;
    if (iH > maxImgH) { iH = maxImgH; iW = iH * asp; }

    doc.addImage(gcvImg.d, 'JPEG', ML, y, iW, iH);

    // Auth block — vertically centred on image height
    const authMidY = y + iH/2;

    T(doc, 7.5, false, DG);
    doc.text('Re Reviewed and Authorised By', authX, authMidY - 4);

    // Signature (italic, simulates cursive)
    const authName = tG.assigned_by_name || tM.assigned_by_name || tA.assigned_by_name || '';
    if (authName) {
      T(doc, 9, false, K); doc.setFont('helvetica','italic');
      doc.text(authName, authX, authMidY + 8);
      doc.setFont('helvetica','normal');
    }

    // Signature line
    doc.setDrawColor(...K); doc.setLineWidth(0.3);
    doc.line(authX, authMidY + 11, authX + authW - 2, authMidY + 11);

    // Printed name below line
    if (authName) { T(doc, 7.5, false, K); doc.text(authName, authX, authMidY + 16); }

    y += iH + 4;
  } else {
    // No image — just auth block
    T(doc, 7.5, false, DG);
    doc.text('Re Reviewed and Authorised By', authX, y + 8);
    doc.setDrawColor(...K); doc.setLineWidth(0.3);
    doc.line(authX, y+22, authX+authW-2, y+22);
    y += 30;
  }

  // ── 9. DECLARATION ────────────────────────────────────────────────────────────
  if (y + 38 > PH - footH - 8) { doc.addPage(); y = 12; }

  T(doc, 7, true, K);
  doc.text('Declaration:', ML, y);
  y += 4;

  const decls = [
    'The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.',
    'This report cannot be reproduced except in full without prior written approval from the laboratory head.',
    'The report cannot be used as an evidence in the court of law, without written approval of laboratory.',
    'The sample will be retained for three months.',
    'Total liability of the laboratory of this report is limited only to the invoiced amount.',
    'All disputes are subject to the jurisdiction of the competent court.',
    'Sampling is not done by the laboratory.',
    'This report relates to only to the particular sample as received for testing.',
    'Grade of coal is given basis of GCV on EQ Basis as per Gazette notification from Ministry of coal for Declaration of Grade.',
  ];

  T(doc, 6.2, false, DG);
  for (let i=0; i<decls.length; i++) {
    const lines = doc.splitTextToSize(`${i+1}. ${decls[i]}`, CW);
    if (y + lines.length*2.7 > PH - footH - 10) { doc.addPage(); y=12; }
    doc.text(lines, ML, y);
    y += lines.length * 2.7 + 0.5;
  }

  y += 4;

  // ── 10. END OF REPORT ─────────────────────────────────────────────────────────
  if (y + 8 > PH - footH - 4) { doc.addPage(); y=12; }

  doc.setDrawColor(...K); doc.setLineWidth(0.4);
  doc.line(ML, y, MR, y); y+=4;
  T(doc, 8, true, K);
  doc.text('---------------END OF REPORT---------------', PW/2, y, { align:'center' });
  y += 4;
  doc.line(ML, y, MR, y);

  // ── 11. FOOTER BAR (pinned to bottom) ─────────────────────────────────────────
  const FY = PH - footH;
  doc.setFillColor(237,237,237);
  doc.rect(0, FY, PW, footH, 'F');
  doc.setDrawColor(...LG); doc.setLineWidth(0.3);
  doc.line(0, FY, PW, FY);

  // Vertical dividers inside footer
  doc.line(ML + CW/3, FY+2, ML + CW/3, PH-2);
  doc.line(ML + CW*2/3, FY+2, ML + CW*2/3, PH-2);

  // Left column
  T(doc, 9, true, K);
  doc.text('CoalLIMS', ML+2, FY+6);
  T(doc, 5.5, false, DG);
  doc.text(['Laboratory: Coal Testing Division', sample.lab_address || 'India'].filter(Boolean), ML+2, FY+10);

  // Center column
  const cMid = ML + CW/3;
  T(doc, 5.5, false, DG);
  doc.text([
    'Corporate Office: Contact your administrator',
    sample.client_address ? '' : '',
  ].filter(Boolean), cMid+2, FY+7);

  // Right column
  const cRight = ML + CW*2/3;
  T(doc, 5.5, false, DG);
  doc.text([
    sample.lab_phone   ? `Phone: ${sample.lab_phone}`   : '',
    sample.lab_email   ? `Email: ${sample.lab_email}`   : 'Email: lab@coallims.com',
    sample.lab_website ? `Website: ${sample.lab_website}`: 'Website: www.coallims.com',
  ].filter(Boolean), cRight+2, FY+7);

  doc.save(`TestReport_${labID}_${repDate}.pdf`);
}

// ─── GROUP REPORT (landscape) ─────────────────────────────────────────────────
export async function downloadGroupReport(group, tests) {
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  const PW=297, PH=210, ML=10, MR=PW-ML, CW=MR-ML;

  // Header
  T(doc, 14, true, K); doc.text('CoalLIMS Laboratory', ML, 12);
  T(doc, 8, false, DG); doc.text('GROUP ANALYSIS REPORT', MR, 12, {align:'right'});
  T(doc, 6, false, MG); doc.text(`Generated: ${dd(new Date())}`, MR, 17, {align:'right'});
  doc.setDrawColor(...K); doc.setLineWidth(0.7); doc.line(ML,20,MR,20);
  doc.setLineWidth(0.2); doc.line(ML,21.3,MR,21.3);

  let y = 27;
  T(doc, 7.5, true, K);
  doc.text(`Group: ${group.group_ref_id}`, ML, y);
  doc.text(`Client: ${group.client_name}`, ML+55, y);
  doc.text(`Contact: ${group.contact_person||'—'}`, ML+130, y);
  doc.text(`Date: ${dd(group.created_at)}`, MR, y, {align:'right'});
  y += 8;

  const cols = [
    {l:'Sample Ref ID',   k:'sample_ref_id',   w:30},
    {l:'Lab Internal ID', k:'lab_internal_id',  w:30},
    {l:'Parameter',       k:'test_name',        w:50},
    {l:'Result',          k:'result_value',     w:22, ha:'center'},
    {l:'Unit',            k:'test_unit',        w:22, ha:'center'},
    {l:'Analyst',         k:'chemist_name',     w:40},
    {l:'Approved',        k:'reviewed_at',      w:28, ha:'center'},
  ];
  const tw = cols.reduce((a,c)=>a+c.w,0);
  cols.forEach(c=>c.w=c.w/tw*CW);

  const RH=7;
  let cx=ML;
  cols.forEach(c=>{ C(doc,cx,y,c.w,RH,c.l,{bold:true,bg:HBG,ha:c.ha||'left',sz:7}); cx+=c.w; });
  y+=RH;

  tests.forEach((t,ri)=>{
    const bg = ri%2===0 ? null : [248,248,248];
    cx=ML;
    cols.forEach(c=>{
      let v=t[c.k]??'—';
      if(c.k==='reviewed_at') v=dd(t.reviewed_at);
      C(doc,cx,y,c.w,RH,v,{fill:bg,sz:7,ha:c.ha||'left'});
      cx+=c.w;
    });
    y+=RH;
    if(y>PH-20){ doc.addPage(); y=15; }
  });

  const FY=PH-14;
  doc.setFillColor(237,237,237); doc.rect(0,FY,PW,14,'F');
  doc.setDrawColor(...LG); doc.setLineWidth(0.3); doc.line(0,FY,PW,FY);
  T(doc,6,false,DG);
  doc.text('CoalLIMS — Group Analysis Report', ML, FY+6);
  doc.text('This report is computer generated.', PW/2, FY+6, {align:'center'});
  doc.text(`Generated: ${dd(new Date())}`, MR, FY+6, {align:'right'});

  doc.save(`GroupReport_${group.group_ref_id}.pdf`);
}
