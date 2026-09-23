import * as THREE from 'three';

function sphere(radius, material, half = false) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32, half ? Math.PI : 0, half ? Math.PI : Math.PI * 2), material);
}

function surfaceTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = kind === 'earth' ? 21 : 73;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = kind === 'earth' ? '#155388' : '#ffb63d'; ctx.fillRect(0, 0, 1024, 512);
  if (kind === 'earth') {
    // Stylized equirectangular land masses; intentionally not cartographic data.
    const regions = [ [[70,96],[133,53],[243,70],[296,109],[262,143],[211,148],[193,199],[146,173],[113,129]], [[226,212],[270,227],[300,270],[278,324],[260,363],[239,402],[218,333],[208,258]], [[470,114],[489,87],[530,95],[548,122],[508,137]], [[473,155],[532,143],[568,199],[542,261],[504,291],[480,245],[454,198]], [[536,101],[622,56],[740,76],[852,120],[836,171],[782,195],[726,169],[694,230],[652,173],[590,158]], [[789,280],[849,262],[881,291],[867,320],[812,323]], [[342,56],[390,35],[402,68],[372,101]], [[0,474],[147,462],[343,470],[530,458],[699,465],[900,455],[1024,480],[1024,512],[0,512]] ];
    for (const points of regions) { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = '#67a77c'; ctx.fill(); ctx.strokeStyle = '#a2bd87'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.fillStyle = '#dceff0'; ctx.fillRect(0,0,1024,18); ctx.fillRect(0,494,1024,18);
    for (let i = 0; i < 130; i++) { ctx.fillStyle = '#eaf5ef25'; ctx.beginPath(); ctx.ellipse(random()*1024,random()*470+20,12+random()*28,2+random()*5,-.3,0,Math.PI*2); ctx.fill(); }
  } else {
    for (let i = 0; i < 10000; i++) { ctx.fillStyle = ['#f27830','#ffdc70','#d65b1d','#fff0a0'][i % 4]; ctx.globalAlpha = .2 + random()*.4; ctx.beginPath(); ctx.ellipse(random()*1024,random()*512,1+random()*4,1+random()*3,0,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 12; i++) { const x=random()*1024,y=180+random()*140; ctx.fillStyle='#bd5f27';ctx.beginPath();ctx.ellipse(x,y,5+random()*8,3+random()*5,.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#723c24';ctx.beginPath();ctx.ellipse(x,y,3,2,.4,0,Math.PI*2);ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function line(points, color, opacity = .65) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

export function createBody(kind) {
  const earth = kind === 'earth';
  const root = new THREE.Group(), spin = new THREE.Group(); root.add(spin);
  const surface = new THREE.Group(), section = new THREE.Group(), field = new THREE.Group();
  spin.add(surface, section, field);
  const texture = surfaceTexture(kind);
  const outerMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: .85, emissive: earth ? '#082c49' : '#ff9f25', emissiveMap: earth ? null : texture, emissiveIntensity: earth ? .2 : .9 });
  const outer = sphere(1, outerMaterial); surface.add(outer); outer.userData.topic = earth ? 'surface' : 'photosphere';
  const radii = earth ? [1,.965,.546,.191] : [1,.98,.71,.25];
  const colors = earth ? ['#579fac','#d88854','#ffbb50','#fff1a2'] : ['#ffb544','#f69035','#efc85c','#fff3a0'];
  const topicIds = earth ? ['surface','mantle','outer-core','inner-core'] : ['photosphere','convection','radiation','core'];
  const layerMeshes = [];
  radii.forEach((radius, index) => {
    const material = new THREE.MeshStandardMaterial({ color: colors[index], roughness: .75, emissive: colors[index], emissiveIntensity: .15, side: THREE.DoubleSide });
    const shell = sphere(radius, index === 0 ? outerMaterial.clone() : material.clone(), true);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material);
    face.position.z = .004 + index * .003;
    shell.userData.topic = face.userData.topic = topicIds[index];
    section.add(shell, face); layerMeshes.push([shell, face]);
  });
  const halo = sphere(earth ? 1.035 : 1.08, new THREE.MeshBasicMaterial({ color: earth ? '#6accff' : '#ffb43b', transparent: true, opacity: earth ? .1 : .12, side: THREE.BackSide, depthWrite: false }));
  surface.add(halo);
  if (!earth) {
    for (let i=0;i<3;i++) surface.add(sphere(1.12+i*.065,new THREE.MeshBasicMaterial({color:'#ff932e',transparent:true,opacity:.035,side:THREE.BackSide,depthWrite:false})));
  }
  const paths = [], particles = [];
  if (earth) {
    // Ideal dipole: r = L sin²θ. End each line at the schematic surface.
    for (let i = 0; i < 10; i++) {
      const L = 1.8, phi = i / 10 * Math.PI * 2, start = Math.asin(Math.sqrt(1 / L));
      const points = Array.from({length:81},(_,j) => { const theta=start+(Math.PI-2*start)*j/80,r=L*Math.sin(theta)**2; return new THREE.Vector3(r*Math.sin(theta)*Math.cos(phi),r*Math.cos(theta),r*Math.sin(theta)*Math.sin(phi)); });
      paths.push(points); field.add(line(points,'#79e6d7',.5));
    }
    field.rotation.z = THREE.MathUtils.degToRad(11);
    const axis = line([new THREE.Vector3(0,-1.3,0),new THREE.Vector3(0,1.3,0)],'#bfd9f3',.35); surface.add(axis);
  } else {
    // Local loops above the surface, not a global terrestrial dipole.
    for (let i = 0; i < 7; i++) {
      const phi = i * 2.399, normal = new THREE.Vector3(Math.cos(phi),Math.sin(phi),.35).normalize();
      const tangent = new THREE.Vector3(-Math.sin(phi),Math.cos(phi),0);
      const points=Array.from({length:61},(_,j)=>{const t=j/60*Math.PI;return normal.clone().multiplyScalar(.98+.5*Math.sin(t)).addScaledVector(tangent,.25*Math.cos(t));});
      paths.push(points); field.add(line(points,'#ffc66c',.8));
    }
  }
  paths.forEach((points,i) => { const particle = sphere(.024,new THREE.MeshBasicMaterial({color:earth?'#cdfff4':'#fff4cb'})); field.add(particle); particles.push({mesh:particle,points,offset:i*.13}); });
  // Schematic circulation cells in the exposed solar convection layer.
  const convection = new THREE.Group(); section.add(convection);
  const flowParticles=[];
  if (!earth) {
    for(let i=0;i<10;i++) {
      const angle=i/10*Math.PI*2,points=Array.from({length:41},(_,j)=>{const t=j/40*Math.PI*2,r=.84+.08*Math.cos(t),a=angle+.08*Math.sin(t);return new THREE.Vector3(r*Math.cos(a),r*Math.sin(a),.035);});
      convection.add(line(points,'#ffe2a0',.45));
      const dot=sphere(.017,new THREE.MeshBasicMaterial({color:'#fff5cd'}));convection.add(dot);flowParticles.push({mesh:dot,points,offset:i*.1});
    }
  }
  let angle=0, time=0, offset=0;
  section.visible=false;field.visible=false;
  return {
    root, spin, surface, section, field, outer,
    setView(cutaway, magnetic) { surface.visible=!cutaway;section.visible=cutaway;field.visible=magnetic; },
    select(topic) { layerMeshes.forEach((pair,index)=>pair.forEach(mesh=>{mesh.material.emissiveIntensity = index === topic.layer ? .65 : (index === 0 && !earth ? .9 : .15);})); },
    setRotation(degrees) { offset=THREE.MathUtils.degToRad(degrees); angle=0;spin.rotation.y=offset; },
    setScale(value) { root.scale.setScalar(value); },
    reset() { angle=0;time=0;offset=0;spin.rotation.set(0,0,0);root.scale.setScalar(1); },
    update(delta,animate) {
      if(animate){ time+=delta; if(!section.visible) angle+=delta*(earth ? .065 : .045); }
      spin.rotation.y=offset+angle;
      for(const {mesh,points,offset:phase} of [...particles,...flowParticles]) { const progress=((time*.16+phase)%1)*(points.length-1),index=Math.floor(progress);mesh.position.copy(points[index]).lerp(points[Math.min(index+1,points.length-1)],progress-index); }
      if(!earth) halo.material.opacity=.11+(animate?Math.sin(time*1.2)*.02:0);
    }
  };
}

export function addLighting(scene) {
  scene.add(new THREE.HemisphereLight('#e2f3ff','#364b67',2.1));
  const key=new THREE.DirectionalLight('#ffffff',2.4);key.position.set(3,4,5);scene.add(key);
}

export function addStars(scene) {
  const positions=[];
  for(let i=0;i<500;i++){const n=Math.sin(i*127.1+31.7)*43758.5453;const a=n-Math.floor(n);const m=Math.sin(i*91.9+15.2)*15731.743;const b=m-Math.floor(m);positions.push((a-.5)*24,(b-.5)*18,-5-(i%17));}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:'#bdd5ff',size:.025,transparent:true,opacity:.75})));
}
