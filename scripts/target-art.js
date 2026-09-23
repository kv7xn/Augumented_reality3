// Original high-contrast, asymmetric illustrations: no QR codes or external artwork.
export function drawTarget(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900;
  const ctx = canvas.getContext('2d');
  let seed = kind === 'earth' ? 42 : 1987;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = '#f5f1e7'; ctx.fillRect(0, 0, 720, 900);
  ctx.fillStyle = '#14233e'; ctx.fillRect(24, 24, 672, 852);
  for (let i = 0; i < 360; i++) {
    const x = 40 + random() * 640, y = 40 + random() * 820, r = .8 + random() * 3;
    ctx.fillStyle = ['#cbdde6', '#7e9aae', '#fff4d3'][i % 3];
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (i % 11 === 0) { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.strokeStyle = '#92a7b6'; ctx.stroke(); }
  }
  ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#f5f1e7'; ctx.fillText('ORBIT LAB / FIELD STUDY', 60, 82);
  ctx.font = 'bold 70px sans-serif'; ctx.fillText(kind.toUpperCase(), 56, 169);
  const gradient = ctx.createRadialGradient(290, 365, 20, 360, 460, 246);
  gradient.addColorStop(0, kind === 'earth' ? '#50c7d9' : '#fff1a4');
  gradient.addColorStop(.6, kind === 'earth' ? '#1261a1' : '#f99c22');
  gradient.addColorStop(1, kind === 'earth' ? '#092647' : '#b52f15');
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(360, 460, 235, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(360, 460, 231, 0, Math.PI * 2); ctx.clip();
  if (kind === 'earth') {
    const regions = [ [[160,340],[235,274],[322,290],[331,355],[278,400],[270,447],[222,417]], [[276,440],[334,454],[374,505],[355,558],[315,637],[287,571]], [[398,315],[470,287],[577,334],[622,407],[551,446],[510,416],[483,448],[419,409]], [[397,409],[475,444],[483,506],[439,563],[407,507]], [[510,552],[572,528],[614,572],[562,606]] ];
    for (const points of regions) { ctx.beginPath(); points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = '#92b572'; ctx.fill(); ctx.strokeStyle = '#d1dfa0'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  for (let i = 0; i < 1100; i++) {
    const x = 126 + random() * 468, y = 226 + random() * 468;
    ctx.fillStyle = kind === 'earth' ? ['#b6dce088','#1c354e66','#b5cb8066'][i % 3] : ['#9e371999','#ffec9866','#e2621855'][i % 3];
    ctx.beginPath(); ctx.ellipse(x,y, 1 + random() * 5, 1 + random() * 3, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#d9e6e4'; ctx.lineWidth = 2;
  const callouts = kind === 'earth' ? [[213,323,69,245,'MAGNETIC WORLD'],[472,440,513,725,'LAYERED INTERIOR'],[265,566,67,751,'OUR HOME']] : [[275,313,67,241,'FUSION ENGINE'],[536,475,511,724,'SOLAR PLASMA'],[271,561,66,751,'A LIVING STAR']];
  ctx.font = 'bold 16px monospace';
  for (const [x,y,tx,ty,text] of callouts) { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(tx + 12,ty + 12); ctx.lineTo(tx + 120,ty + 12); ctx.stroke(); ctx.fillStyle = '#fff8dc'; ctx.fillText(text,tx,ty); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle = '#f5f1e7'; ctx.font = '18px monospace'; ctx.fillText(kind === 'earth' ? '01 / EARTH     6,371 km mean radius' : '02 / SUN       5772 K effective T', 57, 828);
  return canvas;
}
