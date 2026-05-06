/* cursor */
const dot=document.getElementById('dot'),ring=document.getElementById('ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
(function a(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(a);})();
document.querySelectorAll('a,button,.dropzone,.chip').forEach(el=>{
  el.addEventListener('mouseenter',()=>{dot.style.transform='translate(-50%,-50%) scale(2.5)';ring.style.width='42px';ring.style.height='42px';ring.style.opacity='.8';});
  el.addEventListener('mouseleave', ()=>{dot.style.transform='translate(-50%,-50%) scale(1)'; ring.style.width='28px';ring.style.height='28px';ring.style.opacity='.55';});
});

/* file handling */
const dz=document.getElementById('dz'),fi=document.getElementById('fi');
let ftxt='';
['dragover','dragenter'].forEach(e=>dz.addEventListener(e,ev=>{ev.preventDefault();dz.classList.add('over');}));
['dragleave','drop'].forEach(e=>dz.addEventListener(e,ev=>{ev.preventDefault();dz.classList.remove('over');}));
dz.addEventListener('drop',e=>{if(e.dataTransfer.files[0])go(e.dataTransfer.files[0]);});
fi.addEventListener('change',()=>{if(fi.files[0])go(fi.files[0]);});

async function go(f){
  if(!/\.(pdf|txt|doc)$/i.test(f.name)){alert('Please upload a PDF, TXT, or DOC file.');return;}
  document.getElementById('fname').textContent=f.name;
  document.getElementById('fsize').textContent=(f.size/1024).toFixed(1)+' KB';
  document.getElementById('fbadge').classList.add('on');
  document.getElementById('dicon').className='fas fa-circle-check';
  document.getElementById('dtitle').textContent='Resume loaded!';
  dz.classList.add('ready');
  document.getElementById('gobtn').disabled=false;
  ftxt=await read(f);
}

function removeFile(){
  ftxt='';fi.value='';
  document.getElementById('fbadge').classList.remove('on');
  document.getElementById('dicon').className='fas fa-cloud-upload-alt';
  document.getElementById('dtitle').textContent='Drop your resume here';
  dz.classList.remove('ready');
  document.getElementById('gobtn').disabled=true;
}

async function read(f){
  return new Promise(res=>{
    const r=new FileReader();
    if(f.name.endsWith('.pdf')){
      r.onload=e=>{
        const b=new Uint8Array(e.target.result);
        let t='';
        for(let i=0;i<b.length;i++){if(b[i]>=32&&b[i]<127)t+=String.fromCharCode(b[i]);else if(b[i]===10||b[i]===13)t+=' ';}
        res(t.replace(/\s+/g,' ').replace(/[^\x20-\x7E]/g,'').trim().substring(0,5000));
      };
      r.readAsArrayBuffer(f);
    } else {r.onload=e=>res(e.target.result.substring(0,5000));r.readAsText(f);}
  });
}

/* analyze */
async function analyze(){
  document.getElementById('ucard').style.display='none';
  document.getElementById('lw').classList.add('on');
  document.getElementById('rw').classList.remove('on');

  const p=`You are a senior HR director and resume coach with 15+ years experience. Analyze the resume below.
Return ONLY valid JSON — absolutely no markdown, no code fences, no extra text.

Resume:
"""
${ftxt||'[No text extracted — provide general feedback for a Computer Science student in their first or second year]'}
"""

Return exactly:
{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "verdict": "<2-3 honest, specific, encouraging sentences summarizing this resume>",
  "strengths": ["<point 1>","<point 2>","<point 3>"],
  "improvements": ["<point 1>","<point 2>","<point 3>","<point 4>"],
  "missing_skills": ["<skill>","<skill>","<skill>","<skill>","<skill>","<skill>"],
  "action_items": ["<concrete step 1>","<concrete step 2>","<concrete step 3>","<concrete step 4>"]
}`;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:p}]})
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    let raw=data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim();
    render(JSON.parse(raw));
  }catch(e){
    document.getElementById('lw').classList.remove('on');
    document.getElementById('ucard').style.display='block';
    alert('Error: '+e.message+'\n\nPlease try again.');
  }
}

function cls(n){return n>=75?'g':n>=50?'y':'r';}
function lbl(n){return n>=75?'Strong':n>=50?'Average':'Needs Work';}

function render(d){
  document.getElementById('lw').classList.remove('on');
  document.getElementById('rw').classList.add('on');

  /* scores */
  const sc=[
    {l:'Overall Score',v:d.overall_score,h:'Resume strength'},
    {l:'ATS Friendly',  v:d.ats_score,    h:'Auto-screening'},
    {l:'Impact Score',  v:d.impact_score,  h:'Impression'},
  ];
  document.getElementById('sgrid').innerHTML=sc.map((s,i)=>`
    <div class="sc ${cls(s.v)}">
      <div class="sc-shine"></div>
      <div class="sc-lbl">${s.l}</div>
      <div class="sc-num">${Math.round(s.v)}</div>
      <span class="sc-tag">${lbl(s.v)}</span>
      <div class="sc-bar"><div class="sc-fill" id="bf${i}"></div></div>
    </div>`).join('');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    sc.forEach((_,i)=>{const el=document.getElementById('bf'+i);if(el)el.style.width=Math.round(sc[i].v)+'%';});
  }));

  /* verdict */
  document.getElementById('vbox').innerHTML=`
    <div class="v-head"><i class="fas fa-sparkles"></i> AI Verdict</div>
    <p>${d.verdict}</p>`;

  /* cards */
  document.getElementById('rcards').innerHTML=`
    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ig"><i class="fas fa-thumbs-up"></i></div>
        <h3>What You're Doing Well</h3>
        <span class="rc-badge">${d.strengths.length} found</span>
      </div>
      <ul class="rl rg">${d.strengths.map(s=>`<li><i class="fas fa-check-circle"></i>${s}</li>`).join('')}</ul>
    </div>

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico iy"><i class="fas fa-triangle-exclamation"></i></div>
        <h3>Areas to Improve</h3>
        <span class="rc-badge">${d.improvements.length} found</span>
      </div>
      <ul class="rl ry">${d.improvements.map(s=>`<li><i class="fas fa-arrow-right"></i>${s}</li>`).join('')}</ul>
    </div>

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ir"><i class="fas fa-puzzle-piece"></i></div>
        <h3>Missing Skills to Add</h3>
        <span class="rc-badge">${d.missing_skills.length} skills</span>
      </div>
      <div class="tags">${d.missing_skills.map(s=>`<span class="stag"><i class="fas fa-plus" style="font-size:.6rem;margin-right:.25rem"></i>${s}</span>`).join('')}</div>
    </div>

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ib"><i class="fas fa-list-check"></i></div>
        <h3>Your Action Plan</h3>
        <span class="rc-badge">${d.action_items.length} steps</span>
      </div>
      <div class="action-grid">${d.action_items.map((s,i)=>`
        <div class="aitem"><div class="anum">${i+1}</div><span>${s}</span></div>`).join('')}
      </div>
    </div>`;
}

function resetAll(){
  removeFile();
  document.getElementById('rw').classList.remove('on');
  document.getElementById('ucard').style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}