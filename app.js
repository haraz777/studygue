(function(){
const $=s=>document.querySelector(s);
const DAYS=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],ORDER=[1,2,3,4,5,6,0];
const S={items:{},seen:{}};let ytOn=false,POLA=[];let base=null,asset=null,filled=false,pk="",pfUrl="";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,"0"),ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fmt=d=>new Date(d).toLocaleString("id-ID",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const safeUrl=u=>{u=(u||"").trim();if(!u)return"";return/^https?:\/\//i.test(u)?u:"https://"+u};
const isLink=s=>/^https?:|zoom|meet\.|teams|\.[a-z]{2,}\//i.test(s||"");
const L=t=>Object.keys(S.items).map(k=>S.items[k]).filter(x=>x._t===t);
const byDl=(a,b)=>new Date(a.deadline)-new Date(b.deadline);
const ST=()=>Object.assign({_t:"settings",id:"settings",sso:"",goal:4,dur:{f:25,s:5,l:15},pomo:{date:"",count:0},photos:[]},S.items.settings);
const PR=()=>S.items.profile||{};
function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.k);toast.k=setTimeout(()=>t.style.display="none",3500)}
function api(a,b){return fetch("api.php?action="+a,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).then(d=>{if(d.error)throw new Error(d.error);return d})}
function put(t,o){o._t=t;if(!o.id)o.id=t+"_"+uid();S.items[o.id]=o;render();api("save",o).catch(e=>toast("Gagal menyimpan: "+e.message));return o}
function del(id){delete S.items[id];render();api("delete",{id:id}).catch(e=>toast("Gagal menghapus: "+e.message))}
async function upFile(f){if(f.size>100*1048576)throw new Error(f.name+" melebihi 100 MB");const fd=new FormData();fd.append("file",f,f.name);
 const r=await fetch("api.php?action=upload",{method:"POST",body:fd}),d=await r.json();if(d.error)throw new Error(f.name+": "+d.error);return d}
function imgBlob(file,sz){return new Promise(ok=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),s=Math.min(im.width,im.height);c.width=c.height=sz;c.getContext("2d").drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,sz,sz);c.toBlob(ok,"image/jpeg",.85)};im.src=r.result};r.readAsDataURL(file)})}

/* NAV */
const views=[["home","🏠 Beranda"],["tugas","📝 Tugas"],["jadwal","📅 Jadwal MK"],["peng","📚 Pengetahuan"],["pomo","🍅 Pomodoro"],["yt","▶️ YouTube Focus"]];
$("#nav").innerHTML=views.map(v=>'<button data-v="'+v[0]+'">'+v[1]+'</button>').join("");
function show(v){if(v==="yt")setTimeout(loadYt,0);document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===v))}
$("#nav").onclick=e=>{if(e.target.dataset.v)show(e.target.dataset.v)};

/* TUGAS */
function status(t){if(t.done)return["Selesai","o"];const ms=new Date(t.deadline)-Date.now();if(ms<0)return["Terlambat","e"];if(ms<864e5)return["< 24 jam","e"];if(ms<2592e5)return["< 3 hari","w"];return["Aktif",""]}
function renderTugas(){
 const f=$("#tFilter").value,cls=L("class"),mkf=$("#tMkFilter").value,seen={},names=[];
 cls.map(c=>c.nama).concat(L("task").map(t=>t.mk)).forEach(n=>{if(n&&!seen[n.toLowerCase()]){seen[n.toLowerCase()]=1;names.push(n)}});names.sort();
 $("#tMkFilter").innerHTML='<option value="">Semua mata kuliah</option>'+names.map(n=>'<option value="'+esc(n)+'"'+(n===mkf?' selected':'')+'>'+esc(n)+'</option>').join("");
 const list=L("task").sort(byDl).filter(t=>(f==="all"||(f==="done")===!!t.done)&&(!mkf||(t.mk||"").toLowerCase()===mkf.toLowerCase()));
 $("#mkList").innerHTML=[...new Set(cls.map(c=>c.nama).concat(L("task").map(t=>t.mk)))].filter(Boolean).map(m=>'<option value="'+esc(m)+'">').join("");
 $("#tList").innerHTML=list.length?list.map(t=>{const st=status(t),has=cls.some(c=>c.nama.toLowerCase()===(t.mk||"").toLowerCase());
  return'<div class="item'+(t.done?' done':'')+'"><input type="checkbox" style="width:auto;margin-top:5px" data-a="done" data-id="'+t.id+'"'+(t.done?' checked':'')+'><div class="sp"><div class="t"><button class="mk" data-a="vt" data-id="'+t.id+'">'+esc(t.judul)+'</button></div><div class="m">'+(has?'<button class="tag" data-a="mkn" data-n="'+esc(t.mk)+'">'+esc(t.mk)+'</button>':'<span class="tag">'+esc(t.mk||"Umum")+'</span>')+(t.pert?'<span class="tag">P'+esc(t.pert)+'</span>':'')+'<span class="tag '+st[1]+'">'+st[0]+'</span> ⏰ '+fmt(t.deadline)+'</div>'+(t.note?'<div class="m" style="margin-top:4px">'+esc(t.note)+'</div>':'')+
  '<div class="row" style="margin-top:6px">'+(t.file?'<button class="btn g s" data-a="pt" data-id="'+t.id+'">👁 '+esc(t.file.name)+'</button>':'')+(t.link?'<a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(t.link)+'">🔗 Kumpulkan</a>':'')+'<button class="btn g s" data-a="vt" data-id="'+t.id+'">Detail</button><button class="btn g s" data-a="edittask" data-id="'+t.id+'">✏️ Edit</button><button class="btn g s" data-a="deltask" data-id="'+t.id+'">Hapus</button></div></div></div>'}).join(""):'<div class="empty">Belum ada tugas.</div>'}
$("#tFilter").onchange=$("#tMkFilter").onchange=render;
function resetTask(){editT="";["tJudul","tMk","tPert","tDl","tNote","tLink","tFile"].forEach(i=>$("#"+i).value="");$("#tAdd").textContent="Simpan tugas";$("#tCancel").style.display="none"}
$("#tAdd").onclick=async()=>{
 const j=$("#tJudul").value.trim(),dl=$("#tDl").value,fl=$("#tFile").files[0];
 if(!j||!dl){$("#tMsg").textContent="Judul dan deadline wajib diisi.";return}
 const old=editT?S.items[editT]:null;
 const t=Object.assign({},old||{done:false,submitted:false},{judul:j,mk:$("#tMk").value.trim(),pert:$("#tPert").value,deadline:new Date(dl).toISOString(),note:$("#tNote").value.trim(),link:safeUrl($("#tLink").value)});
 try{if(fl){$("#tMsg").textContent="Mengunggah file...";t.file=await upFile(fl)}}catch(e){$("#tMsg").textContent=e.message;return}
 put("task",t);resetTask();$("#tMsg").textContent=old?"Perubahan tersimpan ✓":"Tugas tersimpan ✓"};

/* FILE PREVIEW */
function openFile(f){if(!f)return;$("#m2Title").textContent=f.name;$("#m2Open").href=f.url;const b=$("#m2Body"),ty=f.type||"";
 if(/^image\//.test(ty))b.innerHTML='<img alt="" src="'+esc(f.url)+'">';
 else if(/^video\//.test(ty))b.innerHTML='<video controls style="max-width:100%" src="'+esc(f.url)+'"></video>';
 else if(/^audio\//.test(ty))b.innerHTML='<audio controls src="'+esc(f.url)+'"></audio>';
 else if(ty==="application/pdf"||/^text\//.test(ty)||/json|csv/.test(ty))b.innerHTML='<iframe title="Pratinjau" src="'+esc(f.url)+'"></iframe>';
 else b.innerHTML='<div class="empty">Format ini tidak bisa dipratinjau. Gunakan tombol Tab baru.</div>';
 $("#modal2").classList.add("on")}
$("#m2Close").onclick=()=>{$("#modal2").classList.remove("on");$("#m2Body").innerHTML=""};
$("#mClose").onclick=()=>{$("#modal").classList.remove("on");$("#mBody").innerHTML=""};

/* JADWAL */
$("#cHari").innerHTML=[1,2,3,4,5,6].map(d=>'<option value="'+d+'">'+DAYS[d]+'</option>').join("");
function eff(c,k){const o=L("override").filter(x=>x.classId===c.id&&x.tgl===k)[0];return o?Object.assign({},c,{mode:o.mode||c.mode,ruang:o.ruang||c.ruang,mulai:o.mulai||c.mulai,selesai:o.selesai||c.selesai,batal:!!o.batal,ov:o}):c}
let editT="",editC="";
const toLocal=iso=>{const d=new Date(iso);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())};
const modeTag=c=>'<span class="tag '+(c.mode==="online"?"o":"")+'">'+(c.mode==="online"?"Online":"Tatap muka")+'</span>';
function renderClasses(){$("#cList").innerHTML='<div class="days">'+[1,2,3,4,5,6].map(d=>{const cs=L("class").filter(c=>c.hari==d).sort((a,b)=>a.mulai<b.mulai?-1:1);
 return'<div class="dayc"><b>'+DAYS[d]+'</b>'+(cs.length?cs.map(c=>'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--ln)"><button class="mk" data-a="mk" data-id="'+c.id+'">'+esc(c.nama)+'</button><div class="m">'+c.mulai+' – '+c.selesai+'</div><div class="m">'+modeTag(c)+(isLink(c.ruang)?'<a target="_blank" rel="noopener" href="'+esc(safeUrl(c.ruang))+'">Link</a>':esc(c.ruang||""))+'</div></div>').join(""):'<div class="m" style="margin-top:6px">Kosong</div>')+'</div>'}).join("")+'</div>'}
function resetClass(){editC="";$("#cNama").value="";$("#cRuang").value="";$("#cAdd").textContent="Tambah jadwal";$("#cCancel").style.display="none"}
$("#cAdd").onclick=()=>{const n=$("#cNama").value.trim();if(!n)return;
 put("class",{id:editC||undefined,nama:n,hari:+$("#cHari").value,mulai:$("#cMulai").value,selesai:$("#cSelesai").value,ruang:$("#cRuang").value.trim(),mode:$("#cMode").value});resetClass()};
let cm=new Date();cm.setDate(1);let selDay=ymd(new Date());
const calBox=p=>'<div class="row"><button class="btn g s" data-n="-1">←</button><h3 class="sp" id="'+p+'Title" style="margin:0;text-align:center"></h3><button class="btn g s" data-n="1">→</button></div><p class="m"><span class="dot" style="background:#f5a524"></span>Deadline tugas &nbsp;<span class="dot" style="background:#1fae7f"></span>Kuliah</p><div class="cal" id="'+p+'Cal"></div>';
["c","h"].forEach(p=>{const b=$("#"+p+"Box");b.innerHTML=calBox(p);b.onclick=e=>{const c=e.target.closest(".d"),n=e.target.dataset.n;if(c){selDay=c.dataset.k;renderCal();openDay(selDay);return}if(n){cm.setMonth(cm.getMonth()+ +n);renderCal()}}});
function renderCal(){
 const y=cm.getFullYear(),m=cm.getMonth(),ti=cm.toLocaleString("id-ID",{month:"long",year:"numeric"}),T=L("task"),C=L("class");
 const off=(new Date(y,m,1).getDay()+6)%7,start=new Date(y,m,1-off);let h=["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=>'<div class="h">'+x+'</div>').join("");
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=ymd(d),ts=T.filter(t=>ymd(new Date(t.deadline))===k&&!t.done).length,cs=C.filter(c=>c.hari==d.getDay()&&!eff(c,k).batal).length;
  h+='<div class="d'+(d.getMonth()!==m?' x':'')+(k===ymd(new Date())?' td':'')+(k===selDay?' sel':'')+'" data-k="'+k+'"><b>'+d.getDate()+'</b><br>'+(ts?'<span class="dot" style="background:#f5a524"></span>'+ts:'')+(cs?' <span class="dot" style="background:#1fae7f"></span>'+cs:'')+'</div>'}
 ["c","h"].forEach(p=>{$("#"+p+"Title").textContent=ti;$("#"+p+"Cal").innerHTML=h})}
function openDay(k){const p2=k.split("-"),dd=new Date(+p2[0],+p2[1]-1,+p2[2]),ts=L("task").filter(t=>ymd(new Date(t.deadline))===k).sort(byDl),cs=L("class").filter(c=>c.hari==dd.getDay()).map(c=>eff(c,k)).sort((a,b)=>a.mulai<b.mulai?-1:1);
 $("#mTitle").textContent=dd.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 $("#mBody").innerHTML='<h3>📖 Mata kuliah</h3>'+(cs.length?cs.map(c=>'<div class="item"><div class="sp"><div class="t"><button class="mk" data-a="mk" data-id="'+c.id+'">'+esc(c.nama)+'</button> '+(c.batal?'<span class="tag e">Dibatalkan</span>':modeTag(c))+(c.ov?'<span class="tag w">Diubah</span>':'')+'</div><div class="m">'+c.mulai+' – '+c.selesai+(isLink(c.ruang)?'':' · '+esc(c.ruang||"-"))+'</div></div>'+(c.mode==="online"&&!c.batal&&isLink(c.ruang)?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(c.ruang))+'">🎥 Zoom</a>':'')+'<button class="btn g s" data-a="ov" data-id="'+c.id+'" data-k="'+k+'">✏️ Ubah</button></div>').join(""):'<div class="empty">Tidak ada kuliah.</div>')+
  '<h3 style="margin-top:14px">📝 Tugas (deadline hari ini)</h3>'+(ts.length?ts.map(t=>{const st=status(t);return'<div class="item'+(t.done?' done':'')+'"><div class="sp"><div class="t"><button class="mk" data-a="vt" data-id="'+t.id+'">'+esc(t.judul)+'</button></div><div class="m"><span class="tag">'+esc(t.mk||"Umum")+'</span><span class="tag '+st[1]+'">'+st[0]+'</span> ⏰ '+new Date(t.deadline).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})+'</div></div>'+(t.link?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(t.link)+'">🔗 Kumpulkan</a>':'')+'</div>'}).join(""):'<div class="empty">Tidak ada tugas.</div>');
 $("#modal").classList.add("on")}

/* PERTEMUAN / PENGETAHUAN */
function meetHtml(m,c,mg){
 const z=m.zoom||(c&&c.mode==="online"&&isLink(c.ruang)?c.ruang:""),ts=c?L("task").filter(t=>t.mk&&t.mk.toLowerCase()===c.nama.toLowerCase()&&+t.pert===+m.no):[];
 return'<div class="row"><div class="t sp"><button class="mk" data-a="vm" data-id="'+m.id+'">Pertemuan '+m.no+(m.judul?' · '+esc(m.judul):'')+'</button></div>'+(m.tgl?'<span class="tag">'+esc(m.tgl)+'</span>':'')+'</div>'+
 (m.note?'<div class="m" style="margin:6px 0;white-space:pre-wrap">'+esc(m.note)+'</div>':'')+
 '<div class="row" style="margin-top:6px">'+(z?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(z))+'">🎥 Zoom</a>':'')+(m.link?'<a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(m.link))+'">🔗 Link materi</a>':'')+(m.files||[]).map((f,i)=>'<button class="btn g s" data-a="pm" data-id="'+m.id+'" data-i="'+i+'">📄 '+esc(f.name)+'</button>').join("")+'</div>'+
 (ts.length?'<div style="margin-top:8px"><b class="m">Tugas pertemuan ini</b>'+ts.map(t=>'<div class="m" style="margin-top:3px">• '+esc(t.judul)+' — '+fmt(t.deadline)+(t.done?' ✓':'')+(t.file?' <button class="tag" data-a="pt" data-id="'+t.id+'">📄 file</button>':'')+(t.link?' <a target="_blank" rel="noopener" href="'+esc(t.link)+'">kumpulkan</a>':'')+'</div>').join("")+'</div>':'')+
 (mg?'<div class="row" style="margin-top:8px"><button class="btn g s" data-a="vm" data-id="'+m.id+'">Detail</button><button class="btn g s" data-a="editm" data-id="'+m.id+'">✏️ Edit</button><label class="btn g s" style="margin:0;display:inline-block;cursor:pointer;color:var(--tx);font-size:13px">+ File<input type="file" multiple hidden data-a="addf" data-id="'+m.id+'"></label><button class="btn g s" data-a="delm" data-id="'+m.id+'">Hapus</button></div>':'')}
function openMk(id){const c=S.items[id];if(!c)return;const ms=L("meeting").filter(m=>m.classId===id).sort((a,b)=>a.no-b.no),nos=ms.map(m=>+m.no);
 const other=L("task").filter(t=>t.mk&&t.mk.toLowerCase()===c.nama.toLowerCase()&&!nos.includes(+t.pert)),ovs=L("override").filter(o=>o.classId===id).sort((a,b)=>a.tgl<b.tgl?-1:1);
 $("#mTitle").textContent=c.nama;
 $("#mBody").innerHTML='<div class="m">'+DAYS[c.hari]+' · '+c.mulai+' – '+c.selesai+' · '+modeTag(c)+'</div>'+(isLink(c.ruang)?'<a class="btn s" style="text-decoration:none;margin-top:8px;display:inline-block" target="_blank" rel="noopener" href="'+esc(safeUrl(c.ruang))+'">🎥 Buka Zoom MK</a>':(c.ruang?'<div class="m">Ruang: '+esc(c.ruang)+'</div>':''))+
 '<div class="row" style="margin:10px 0"><button class="btn g s" data-a="editc" data-id="'+id+'">✏️ Edit jadwal</button><button class="btn g s" data-a="ov" data-id="'+id+'" data-k="today">🔄 Ubah per tanggal</button><button class="btn g s" data-a="delc" data-id="'+id+'">🗑 Hapus MK</button></div>'+
 (ovs.length?'<div class="card" style="margin:0 0 12px"><b>Perubahan per tanggal</b>'+ovs.map(o=>'<div class="row m" style="margin-top:6px"><span class="sp">'+esc(o.tgl)+' · '+(o.batal?'Dibatalkan':(o.mode==="online"?'Online':'Tatap muka')+(o.mulai?' · '+o.mulai+'–'+o.selesai:''))+(o.note?' · '+esc(o.note):'')+'</span><button class="btn g s" data-a="ov" data-id="'+id+'" data-k="'+o.tgl+'">Ubah</button><button class="btn g s" data-a="ovdel" data-oid="'+o.id+'" data-id="'+id+'">Hapus</button></div>').join("")+'</div>':'')+
 (ms.length?ms.map(m=>'<div class="card" style="margin:12px 0 0">'+meetHtml(m,c,false)+'</div>').join(""):'<div class="empty">Belum ada pertemuan.</div>')+
 (other.length?'<div class="card" style="margin:12px 0 0"><b>Tugas lainnya</b>'+other.map(t=>'<div class="m" style="margin-top:3px">• <button class="mk" data-a="vt" data-id="'+t.id+'">'+esc(t.judul)+'</button> — '+fmt(t.deadline)+(t.file?' <button class="tag" data-a="pt" data-id="'+t.id+'">📄 file</button>':'')+'</div>').join("")+'</div>':'')+
 '<div class="row" style="margin-top:14px"><button class="btn" data-a="gopk" data-id="'+id+'">+ Kelola pertemuan di Pengetahuan</button></div>';
 $("#modal").classList.add("on")}
function renderPeng(){const cs=L("class").sort((a,b)=>a.nama.localeCompare(b.nama));if(pk&&!S.items[pk])pk="";
 $("#pkMk").innerHTML='<option value="">Semua mata kuliah</option>'+cs.map(c=>'<option value="'+c.id+'"'+(c.id===pk?' selected':'')+'>'+esc(c.nama)+'</option>').join("");
 const nm=m=>(S.items[m.classId]||{}).nama||"",ms=L("meeting").filter(m=>!pk||m.classId===pk).sort((a,b)=>nm(a).localeCompare(nm(b))||a.no-b.no);
 if(pk&&!$("#pkNo").value){const mine=L("meeting").filter(m=>m.classId===pk);$("#pkNo").value=mine.length?Math.max.apply(null,mine.map(m=>+m.no))+1:1}
 $("#pkList").innerHTML=ms.length?ms.map(m=>'<div class="card">'+(pk?'':'<span class="tag" style="margin-bottom:6px">'+esc(nm(m)||"?")+'</span>')+meetHtml(m,S.items[m.classId],true)+'</div>').join(""):'<div class="empty">Belum ada pertemuan.</div>'}
$("#pkMk").onchange=()=>{pk=$("#pkMk").value;$("#pkNo").value="";renderPeng()};
let editM="";
function resetMeet(){editM="";["pkNo","pkJudul","pkTgl","pkZoom","pkLink","pkNote","pkFile"].forEach(i=>$("#"+i).value="");$("#pkAdd").textContent="Simpan pertemuan";$("#pkCancel").style.display="none";renderPeng()}
$("#pkAdd").onclick=async()=>{if(!pk){$("#pkMsg").textContent="Pilih satu mata kuliah di filter dulu (bukan Semua).";return}
 const no=+$("#pkNo").value;if(!no){$("#pkMsg").textContent="Isi nomor pertemuan.";return}
 const old=editM?S.items[editM]:null,m=Object.assign({},old||{files:[]},{classId:pk,no:no,judul:$("#pkJudul").value.trim(),tgl:$("#pkTgl").value,zoom:$("#pkZoom").value.trim(),link:$("#pkLink").value.trim(),note:$("#pkNote").value.trim()});
 m.files=(m.files||[]).slice();$("#pkMsg").textContent="Menyimpan...";const err=[];
 for(const f of $("#pkFile").files){try{m.files.push(await upFile(f))}catch(e){err.push(e.message)}}
 put("meeting",m);resetMeet();
 $("#pkMsg").textContent=err.length?"Tersimpan, tapi: "+err.join("; "):(old?"Perubahan tersimpan ✓":"Pertemuan tersimpan ✓")};
const fsize=n=>(n||0)>1048576?((n||0)/1048576).toFixed(1)+" MB":Math.max(1,Math.round((n||0)/1024))+" KB";

/* HOME */
function renderHome(){
 const t=new Date(),n=PR().Nama,T=L("task"),dn=T.filter(x=>x.done).length;
 const qt=typeof QUOTE_TEXT!=="undefined"?QUOTE_TEXT:"The more you know the world. The more fun it is",qb=typeof QUOTE_BY!=="undefined"?QUOTE_BY:"Someone";
 $("#hQuote").innerHTML='<div class="qm">“</div><p class="qt">'+esc(qt)+'</p><div class="qb">— '+esc(qb)+'</div>';
 $("#hHi").textContent="Halo"+(n?", "+n:"")+" 👋";
 $("#hStats").innerHTML=[["Jumlah tugas",T.length],["Tugas selesai",dn],["Belum selesai",T.length-dn]].map(x=>'<div class="card stat" style="margin:0"><b>'+x[1]+'</b><span class="m">'+x[0]+'</span></div>').join("");
 const kk=ymd(t),cs=L("class").filter(c=>c.hari==t.getDay()).map(c=>eff(c,kk)).sort((a,b)=>a.mulai<b.mulai?-1:1);
 $("#hToday").innerHTML=cs.length?cs.map(c=>{const on=c.mode==="online";return'<div class="item"><div class="sp"><div class="t"><button class="mk" data-a="mk" data-id="'+c.id+'">'+esc(c.nama)+'</button> '+(c.batal?'<span class="tag e">Dibatalkan</span>':modeTag(c))+(c.ov?'<span class="tag w">Diubah hari ini</span>':'')+'</div><div class="m">'+c.mulai+' – '+c.selesai+(isLink(c.ruang)?'':' · '+esc(c.ruang||"-"))+(c.ov&&c.ov.note?' · '+esc(c.ov.note):'')+'</div></div>'+(on&&!c.batal&&isLink(c.ruang)?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(c.ruang))+'">🎥 Buka Zoom</a>':'')+'<button class="btn g s" data-a="ov" data-id="'+c.id+'" data-k="'+kk+'">✏️ Ubah</button></div>'}).join(""):'<div class="empty">Tidak ada kuliah hari ini 🎉</div>';
 const ls=T.filter(x=>x.link).sort(byDl);
 $("#hLinks").innerHTML=ls.length?ls.map(x=>'<div class="item'+(x.done?' done':'')+'"><div class="sp"><div class="t">'+esc(x.judul)+'</div><div class="m">'+esc(x.mk||"Umum")+' · '+fmt(x.deadline)+'</div></div><a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(x.link)+'">🔗 Kumpulkan</a></div>').join(""):'<div class="empty">Belum ada link pengumpulan.</div>';
 $("#ssoGo").href=safeUrl(SSO_URL)||"#"}
$("#ssoGo").onclick=e=>{if(!SSO_URL){e.preventDefault();toast("Link SSO belum diisi. Isi di file config.js pada baris const SSO_URL (bukan baris yang diawali //), lalu Ctrl+F5.")}};

/* NOTIFIKASI */
function notify(title,body,key){if(S.seen[key])return;S.seen[key]=1;try{if("Notification"in window&&Notification.permission==="granted")new Notification(title,{body})}catch(e){}}
function checkAlerts(){
 const out=[],now=Date.now(),today=new Date();
 L("task").forEach(t=>{if(t.done)return;const ms=new Date(t.deadline)-now;
  if(ms<0)out.push(['e','⚠️ Terlambat: '+t.judul+' ('+(t.mk||"Umum")+')']);
  else if(ms<864e5){out.push(['e','⏳ Deadline < '+Math.max(1,Math.round(ms/36e5))+' jam: '+t.judul]);notify("Deadline mendekat",t.judul+" – "+fmt(t.deadline),"d24"+t.id)}
  else if(ms<2592e5){out.push(['w','📌 Deadline '+fmt(t.deadline)+': '+t.judul]);notify("Deadline 3 hari lagi",t.judul,"d72"+t.id)}});
 L("class").forEach(c0=>{if(c0.hari!=today.getDay())return;const c=eff(c0,ymd(today));if(c.mode!=="online"||c.batal)return;const p=c.mulai.split(":"),st=new Date();st.setHours(+p[0],+p[1],0,0);const diff=(st-now)/6e4;
  if(diff<=30&&diff>=-15){out.push(['w','💻 Kuliah ONLINE '+(diff>0?'mulai '+Math.ceil(diff)+' menit lagi':'sedang berlangsung')+': '+c.nama]);notify("Kuliah online: "+c.nama,"Mulai "+c.mulai,"c"+c.id+ymd(today))}});
 $("#alerts").innerHTML=out.map(a=>'<div class="alert '+a[0]+'">'+esc(a[1])+'</div>').join("")}
$("#notifBtn").onclick=()=>{if(!("Notification"in window)){toast("Browser tidak mendukung notifikasi");return}Notification.requestPermission().then(p=>$("#notifBtn").textContent=p==="granted"?"🔔 Aktif":"🔕 Ditolak")};
if("Notification"in window&&Notification.permission==="granted")$("#notifBtn").textContent="🔔 Aktif";

/* POMODORO */
const modes={f:"Fokus",s:"Istirahat pendek",l:"Istirahat panjang"};let pm="f",left=25*60,run=false,endAt=0,tick=null;
const tabs=()=>$("#pTabs").innerHTML=Object.keys(modes).map(k=>'<button class="btn s '+(k===pm?'':'g')+'" data-m="'+k+'">'+modes[k]+'</button>').join("");
function cnt(st){return st.pomo.date===ymd(new Date())?st.pomo.count:0}
function draw(){const st=ST(),tot=st.dur[pm]*60;$("#pTime").textContent=pad(Math.floor(left/60))+":"+pad(left%60);$("#pLabel").textContent=modes[pm];
 $("#pArc").style.strokeDashoffset=754*(1-left/tot);$("#pGo").textContent=run?"Jeda":"Mulai";$("#pCount").textContent=cnt(st)+" / "+st.goal;
 document.title=(run?pad(Math.floor(left/60))+":"+pad(left%60)+" · ":"")+"My study"}
function setMode(k){pm=k;run=false;clearInterval(tick);left=ST().dur[k]*60;tabs();draw()}
function beep(){try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.setValueAtTime(.2,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+1);o.start();o.stop(a.currentTime+1)}catch(e){}}
function done(){beep();clearInterval(tick);run=false;
 if(pm==="f"){const st=ST(),c=cnt(st)+1;st.pomo={date:ymd(new Date()),count:c};put("settings",st);if(c===st.goal)reward();notify("Fokus selesai!","Waktunya istirahat.","p"+Date.now());setMode(c%4===0?"l":"s")}
 else{notify("Istirahat selesai","Ayo kembali fokus!","p"+Date.now());setMode("f")}}
$("#pGo").onclick=()=>{if(run){run=false;clearInterval(tick);draw();return}run=true;endAt=Date.now()+left*1000;tick=setInterval(()=>{left=Math.max(0,Math.round((endAt-Date.now())/1000));draw();if(left<=0)done()},250);draw()};
$("#pReset").onclick=()=>setMode(pm);$("#pSkip").onclick=()=>setMode(pm==="f"?"s":"f");
$("#pTabs").onclick=e=>{if(e.target.dataset.m)setMode(e.target.dataset.m)};
[["dF","f"],["dS","s"],["dL","l"]].forEach(x=>{$("#"+x[0]).onchange=function(){const st=ST();st.dur[x[1]]=Math.max(1,+this.value||1);put("settings",st);if(!run)setMode(pm)}});
$("#pGoal").onchange=function(){const st=ST();st.goal=Math.max(1,+this.value||1);put("settings",st)};
const QUOTES=["Kamu hebat! Satu langkah kecil tiap hari itu cukup.","Fokusmu hari ini adalah hadiah untuk dirimu di masa depan.","Target tercapai! Istirahat dulu, kamu pantas.","Pelan-pelan tetap maju. Bangga sama kamu!","Konsistensi kecil mengalahkan semua tugas.","Kamu sudah sejauh ini, lanjutkan!","Hari ini kamu menang melawan rasa malas.","Satu sesi lagi, satu langkah lebih dekat ke mimpimu.","Tugas boleh banyak, tapi kamu lebih kuat.","Bersinar terus ya, kamu luar biasa!"];
const THEMES=[["#ffd1e8","#b9a3ff","💜"],["#cbe9fd","#3781fc","⭐"],["#ffe3b3","#ff9ec7","🌸"],["#b8f1e0","#5fb4ff","🌙"],["#ffd6d6","#ffa8c5","🍓"],["#d4f0ff","#89d0ff","🐰"],["#fff3b8","#ffb86b","☀️"],["#e8d4ff","#8fa4ff","🎀"]];
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const polHtml=c=>{const t=THEMES[(c.t||0)%THEMES.length];if(c.img)return'<div class="pol"><img alt="" src="'+esc(c.img)+'"><p>'+esc(c.q)+'</p><div style="text-align:center;font-size:11px;color:#6b86c9;margin-top:4px">'+esc(c.date)+'</div></div>';return'<div class="pol"><div style="aspect-ratio:1;background:linear-gradient(135deg,'+t[0]+','+t[1]+');display:flex;align-items:center;justify-content:center;font-size:72px;position:relative">'+t[2]+'<span style="position:absolute;top:8px;left:12px;font-size:18px;color:#fff">✦</span><span style="position:absolute;bottom:8px;right:12px;font-size:18px;color:#fff">✧</span></div><p>'+esc(c.q)+'</p><div style="text-align:center;font-size:11px;color:#6b86c9;margin-top:4px">'+esc(c.date)+'</div></div>'};
function giftModal(){$("#mTitle").textContent="🎁 Hadiah menunggu";$("#mBody").innerHTML='<div style="text-align:center;padding:24px 0"><div style="font-size:64px">🎉</div><h3 style="font-size:20px;margin-top:8px">Selamat! Kamu sudah mencapai target hari ini</h3><p class="m">Klik tombol di bawah untuk membuka hadiahmu</p><button class="btn" data-a="open">🎁 Klik untuk membuka hadiah</button></div>';$("#modal").classList.add("on")}
function reward(){const st=ST();st.pending=true;put("settings",st);giftModal()}
function openGift(){const st=ST();st.pending=false;put("settings",st);const c={date:ymd(new Date()),q:rnd(QUOTES),t:Math.floor(Math.random()*THEMES.length),img:POLA.length?rnd(POLA):"",ts:Date.now()};put("card",c);$("#mTitle").textContent="🎁 Hadiahmu!";$("#mBody").innerHTML='<div style="padding:14px 0">'+polHtml(c)+'</div>'}
function renderKoleksi(){const cs=L("card").sort((a,b)=>b.ts-a.ts);
 $("#gift").innerHTML=ST().pending?'<div class="card" style="text-align:center"><b>🎉 Selamat, kamu sudah mencapai target!</b><br><button class="btn" style="margin-top:8px" data-a="gift">Klik untuk membuka hadiah</button></div>':'';
 $("#kGal").innerHTML=cs.length?cs.map(polHtml).join(""):'<div class="empty">Belum ada hadiah. Selesaikan target sesi harianmu!</div>'}

/* YOUTUBE */
function ytParse(u){const l=/[?&]list=([\w-]+)/.exec(u),v=/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/.exec(u);
 if(l&&!v)return"https://www.youtube-nocookie.com/embed/videoseries?list="+l[1];if(v)return"https://www.youtube-nocookie.com/embed/"+v[1]+(l?"?list="+l[1]:"");return""}
function loadYt(){if(ytOn)return;const v=S.items[ST().lastYt];if(v){ytOn=true;$("#ytFrame").src=v.embed;$("#ytNote").textContent="Terakhir ditonton: "+v.judul}}
function renderYt(){const vs=L("video");$("#yList").innerHTML=vs.length?vs.map(v=>'<div class="item"><div class="sp"><div class="t">'+esc(v.judul)+'</div><div class="m">'+esc(v.url)+'</div></div><a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(v.url))+'">↗ YouTube</a><button class="btn s" data-a="play" data-id="'+v.id+'">▶ Putar</button><button class="btn g s" data-a="dely" data-id="'+v.id+'">Hapus</button></div>').join(""):'<div class="empty">Playlist masih kosong.</div>'}
$("#yAdd").onclick=()=>{const u=$("#yUrl").value.trim(),e=ytParse(u);if(!e){toast("Link YouTube tidak valid.");return}
 put("video",{url:u,embed:e,judul:$("#yJudul").value.trim()||"Video "+(L("video").length+1)});$("#yUrl").value="";$("#yJudul").value=""};

/* PENGUMPULAN */
function renderKumpul(){const mkf=$("#tMkFilter").value,l=L("task").filter(t=>!mkf||(t.mk||"").toLowerCase()===mkf.toLowerCase()).sort(byDl);$("#kList").innerHTML=l.length?l.map(t=>'<div class="item'+(t.submitted?' done':'')+'"><input type="checkbox" style="width:auto;margin-top:5px" data-a="sub" data-id="'+t.id+'"'+(t.submitted?' checked':'')+'><div class="sp"><div class="t">'+esc(t.judul)+'</div><div class="m">'+esc(t.mk||"Umum")+' · batas '+fmt(t.deadline)+'</div></div><span class="tag '+(t.submitted?'o':'w')+'">'+(t.submitted?'Sudah dikumpulkan':'Belum')+'</span>'+(t.link?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(t.link)+'">Buka link</a>':'<span class="m">Tanpa link</span>')+'</div>').join(""):'<div class="empty">Belum ada tugas.</div>'}

/* PROFIL */
const PF=["Nama","Nim","Kampus","Ig","Gh","Email","Bio"],noav="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#7fb4ff"/><circle cx="5" cy="4" r="2" fill="#fff"/><path d="M1.5 10a3.5 3.5 0 017 0z" fill="#fff"/></svg>');
$("#pFile").onchange=async function(){const f=this.files[0];if(!f)return;$("#pMsg").textContent="Mengunggah foto...";try{const b=await imgBlob(f,256),r=await upFile(new File([b],"profil.jpg",{type:"image/jpeg"}));pfUrl=r.url;$("#pFoto").src=pfUrl;$("#pMsg").textContent="Foto siap, klik Simpan profil."}catch(e){$("#pMsg").textContent=e.message}};
$("#pSave").onclick=()=>{const p=Object.assign({},PR());PF.forEach(k=>p[k]=$("#p"+k).value.trim());if(pfUrl)p.foto=pfUrl;p.id="profile";put("profile",p);$("#pMsg").textContent="";act.pview();toast("Profil tersimpan ✓")};

function renderProfil(){const p=PR(),av=p.foto||noav,ig=(p.Ig||"").trim(),igu=ig?(/^https?:/i.test(ig)?ig:"https://instagram.com/"+ig.replace(/^@/,"")):"",lk=(h,t)=>'<a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(h)+'">'+t+'</a>';
 $("#hAv").src=av;
 $("#pPrev").innerHTML='<img class="av" alt="" src="'+esc(av)+'" style="width:120px;height:120px"><h3 style="font-size:22px;margin:12px 0 2px">'+esc(p.Nama||"Nama Mahasiswa")+'</h3><div class="m">'+esc([p.Nim,p.Kampus].filter(Boolean).join(" · ")||"NIM · Kampus / Prodi")+'</div><p style="max-width:520px;margin:10px auto">'+esc(p.Bio||"Belum ada deskripsi singkat.")+'</p><div class="row" style="justify-content:center">'+(igu?lk(igu,"📷 Instagram"):"")+(p.Gh?lk(safeUrl(p.Gh),"🔗 LinkedIn / GitHub"):"")+(p.Email?lk("mailto:"+p.Email,"✉️ Email"):"")+'</div><div style="margin-top:16px"><button class="btn" data-a="editprof">✏️ Edit profil</button></div>'}
/* AKSI */
const act={
 vm:b=>{const m=S.items[b.dataset.id];if(!m)return;const c=S.items[m.classId],z=m.zoom||(c&&c.mode==="online"&&isLink(c.ruang)?c.ruang:""),ts=c?L("task").filter(t=>t.mk&&t.mk.toLowerCase()===c.nama.toLowerCase()&&+t.pert===+m.no):[];
  $("#mTitle").textContent="Pertemuan "+m.no+(m.judul?" · "+m.judul:"");
  $("#mBody").innerHTML='<div class="row"><span class="tag">'+esc(c?c.nama:"?")+'</span>'+(m.tgl?'<span class="tag">'+esc(m.tgl)+'</span>':'')+'</div><div style="margin-top:10px"><b>Catatan / ringkasan materi</b><div class="m" style="white-space:pre-wrap">'+esc(m.note||"Tidak ada catatan.")+'</div></div><div class="row" style="margin-top:12px">'+(z?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(z))+'">🎥 Zoom</a>':'')+(m.link?'<a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(safeUrl(m.link))+'">🔗 Link materi</a>':'')+'</div>'+
  '<div style="margin-top:12px"><b>File materi</b>'+((m.files||[]).length?m.files.map((f,i)=>'<div class="row" style="margin-top:6px"><span class="sp">📄 '+esc(f.name)+' <span class="m">('+fsize(f.size)+')</span></span><button class="btn g s" data-a="pm" data-id="'+m.id+'" data-i="'+i+'">👁 Preview</button><a class="btn g s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(f.url)+'">↗ Buka</a><button class="btn g s" data-a="rmf" data-id="'+m.id+'" data-i="'+i+'">✖ Hapus</button></div>').join(""):'<div class="m">Belum ada file.</div>')+'</div>'+
  (ts.length?'<div style="margin-top:12px"><b>Tugas pertemuan ini</b>'+ts.map(t=>'<div class="m" style="margin-top:3px">• <button class="mk" data-a="vt" data-id="'+t.id+'">'+esc(t.judul)+'</button> — '+fmt(t.deadline)+(t.done?' ✓':'')+'</div>').join("")+'</div>':'')+
  '<div class="row" style="margin-top:14px"><button class="btn" data-a="editm" data-id="'+m.id+'">✏️ Edit</button><button class="btn g" data-a="delm" data-id="'+m.id+'">Hapus pertemuan</button></div>';
  $("#modal").classList.add("on")},
 rmf:b=>{const m=S.items[b.dataset.id],f=m.files[+b.dataset.i];if(!confirm("Hapus file "+f.name+"?"))return;m.files=m.files.filter((x,i)=>i!==+b.dataset.i);put("meeting",m);act.vm({dataset:{id:m.id}})},
 editm:b=>{const m=S.items[b.dataset.id];editM=m.id;pk=m.classId;$("#pkNo").value=m.no;$("#pkJudul").value=m.judul||"";$("#pkTgl").value=m.tgl||"";$("#pkZoom").value=m.zoom||"";$("#pkLink").value=m.link||"";$("#pkNote").value=m.note||"";$("#pkFile").value="";
  $("#pkAdd").textContent="Simpan perubahan";$("#pkCancel").style.display="inline-block";$("#pkMsg").textContent="Mengedit pertemuan. File baru ditambahkan ke file yang sudah ada.";$("#mClose").click();show("peng");renderPeng();window.scrollTo({top:0,behavior:"smooth"})},
 pkcancel:()=>{resetMeet();$("#pkMsg").textContent=""},
 vt:b=>{const t=S.items[b.dataset.id];if(!t)return;const st=status(t);$("#mTitle").textContent=t.judul;
  $("#mBody").innerHTML='<div class="row"><span class="tag">'+esc(t.mk||"Umum")+'</span>'+(t.pert?'<span class="tag">Pertemuan '+esc(t.pert)+'</span>':'')+'<span class="tag '+st[1]+'">'+st[0]+'</span>'+(t.submitted?'<span class="tag o">Sudah dikumpulkan</span>':'')+'</div><div style="margin-top:10px">⏰ <b>Deadline:</b> '+fmt(t.deadline)+'</div><div style="margin-top:10px"><b>Catatan</b><div class="m" style="white-space:pre-wrap">'+esc(t.note||"Tidak ada catatan.")+'</div></div><div class="row" style="margin-top:12px">'+(t.file?'<button class="btn g s" data-a="pt" data-id="'+t.id+'">👁 '+esc(t.file.name)+'</button>':'<span class="m">Tidak ada file.</span>')+(t.link?'<a class="btn s" style="text-decoration:none" target="_blank" rel="noopener" href="'+esc(t.link)+'">🔗 Link pengumpulan</a>':'')+'</div><div class="row" style="margin-top:14px"><button class="btn" data-a="edittask" data-id="'+t.id+'">✏️ Edit</button><button class="btn g" data-a="donetask" data-id="'+t.id+'">'+(t.done?"Tandai belum selesai":"Tandai selesai")+'</button><button class="btn g" data-a="deltask" data-id="'+t.id+'">Hapus</button></div>';
  $("#modal").classList.add("on")},
 donetask:b=>{const t=S.items[b.dataset.id];t.done=!t.done;put("task",t);act.vt(b)},
 edittask:b=>{const t=S.items[b.dataset.id];editT=t.id;$("#tJudul").value=t.judul;$("#tMk").value=t.mk||"";$("#tPert").value=t.pert||"";$("#tDl").value=toLocal(t.deadline);$("#tLink").value=t.link||"";$("#tNote").value=t.note||"";$("#tFile").value="";
  $("#tAdd").textContent="Simpan perubahan";$("#tCancel").style.display="inline-block";$("#tMsg").textContent="Mengedit tugas."+(t.file?" File lama tetap dipakai kecuali kamu pilih file baru.":"");
  $("#mClose").click();show("tugas");window.scrollTo({top:0,behavior:"smooth"})},
 tcancel:()=>{resetTask();$("#tMsg").textContent=""},
 editc:b=>{const c=S.items[b.dataset.id];editC=c.id;$("#cNama").value=c.nama;$("#cHari").value=c.hari;$("#cMulai").value=c.mulai;$("#cSelesai").value=c.selesai;$("#cMode").value=c.mode;$("#cRuang").value=c.ruang||"";
  $("#cAdd").textContent="Simpan perubahan";$("#cCancel").style.display="inline-block";$("#mClose").click();show("jadwal");$("#cAdd").scrollIntoView({behavior:"smooth",block:"center"})},
 ccancel:()=>resetClass(),
 ov:b=>{const c=S.items[b.dataset.id],k=b.dataset.k==="today"?ymd(new Date()):b.dataset.k,e=eff(c,k),o=e.ov||{};$("#mTitle").textContent="Ubah jadwal per tanggal · "+c.nama;
  $("#mBody").innerHTML='<div class="m">Perubahan hanya berlaku untuk tanggal yang dipilih. Jadwal mingguan tidak berubah.</div><div class="grid" style="margin-top:10px"><div><label>Tanggal</label><input id="oTgl" type="date" value="'+k+'"></div><div><label>Mode</label><select id="oMode"><option value="online"'+(e.mode==="online"?' selected':'')+'>Online</option><option value="offline"'+(e.mode==="offline"?' selected':'')+'>Tatap muka</option></select></div><div><label>Mulai</label><input id="oMulai" type="time" value="'+e.mulai+'"></div><div><label>Selesai</label><input id="oSelesai" type="time" value="'+e.selesai+'"></div><div style="grid-column:1/-1"><label>Link Zoom / Ruang</label><input id="oRuang" value="'+esc(e.ruang)+'"></div><div style="grid-column:1/-1"><label>Catatan</label><input id="oNote" value="'+esc(o.note||"")+'"></div></div><label style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="oBatal" style="width:auto"'+(e.batal?' checked':'')+'> Kuliah dibatalkan / libur</label><div class="row" style="margin-top:12px"><button class="btn" data-a="ovsave" data-id="'+c.id+'">Simpan</button>'+(o.id?'<button class="btn g" data-a="ovdel" data-oid="'+o.id+'" data-id="'+c.id+'">Kembalikan ke jadwal normal</button>':'')+'</div>';
  $("#modal").classList.add("on")},
 ovsave:b=>{const id=b.dataset.id,tgl=$("#oTgl").value;if(!tgl){toast("Pilih tanggal dulu");return}const ex=L("override").filter(x=>x.classId===id&&x.tgl===tgl)[0]||{};
  put("override",Object.assign(ex,{classId:id,tgl:tgl,mode:$("#oMode").value,ruang:$("#oRuang").value.trim(),mulai:$("#oMulai").value,selesai:$("#oSelesai").value,batal:$("#oBatal").checked,note:$("#oNote").value.trim()}));$("#mClose").click();toast("Perubahan jadwal tanggal "+tgl+" tersimpan")},
 ovdel:b=>{del(b.dataset.oid);$("#mClose").click()},
 done:b=>{const t=S.items[b.dataset.id];t.done=b.checked;put("task",t)},
 sub:b=>{const t=S.items[b.dataset.id];t.submitted=b.checked;if(b.checked)t.done=true;put("task",t)},
 deltask:b=>{if(confirm("Hapus tugas ini?")){del(b.dataset.id);$("#mClose").click()}},
 pt:b=>openFile(S.items[b.dataset.id].file),
 pm:b=>openFile(S.items[b.dataset.id].files[+b.dataset.i]),
 delm:b=>{if(confirm("Hapus pertemuan ini beserta file materinya?")){del(b.dataset.id);$("#mClose").click()}},
 delc:b=>{if(confirm("Hapus MK ini beserta pertemuannya?")){L("meeting").filter(m=>m.classId===b.dataset.id).forEach(m=>del(m.id));del(b.dataset.id);$("#mClose").click()}},
 mk:b=>openMk(b.dataset.id),
 mkn:b=>{const c=L("class").filter(x=>x.nama.toLowerCase()===b.dataset.n.toLowerCase())[0];if(c)openMk(c.id)},
 gopk:b=>{pk=b.dataset.id;$("#pkNo").value="";$("#mClose").click();show("peng");renderPeng()},
 play:b=>{const v=S.items[b.dataset.id];$("#ytFrame").src=v.embed+(v.embed.indexOf("?")>-1?"&":"?")+"autoplay=1";ytOn=true;{const st=ST();st.lastYt=v.id;put("settings",st)}$("#ytNote").textContent="Sedang diputar: "+v.judul;window.scrollTo({top:0,behavior:"smooth"})},
 dely:b=>del(b.dataset.id),avatar:()=>{act.pview();show("profil");window.scrollTo({top:0,behavior:"smooth"})},editprof:()=>{$("#pPrev").style.display="none";$("#pEdit").style.display="block"},pview:()=>{$("#pEdit").style.display="none";$("#pPrev").style.display="block"},open:()=>openGift(),gift:()=>giftModal()};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(b&&act[b.dataset.a])act[b.dataset.a](b,e)});
document.addEventListener("change",async e=>{const b=e.target;if(b.dataset.a!=="addf")return;const m=S.items[b.dataset.id],err=[];m.files=(m.files||[]).slice();
 for(const f of b.files){try{m.files.push(await upFile(f))}catch(x){err.push(x.message)}}put("meeting",m);if(err.length)toast(err.join("; "))});

/* RENDER + DATABASE */
function fillOnce(){if(filled)return;filled=true;const st=ST(),p=PR();$("#pGoal").value=st.goal;$("#dF").value=st.dur.f;$("#dS").value=st.dur.s;$("#dL").value=st.dur.l;
 PF.forEach(k=>$("#p"+k).value=p[k]||"");if(!run)setMode(pm)}
function render(){renderHome();renderTugas();renderClasses();renderCal();renderPeng();renderKumpul();renderYt();renderKoleksi();renderProfil();if($("#v-yt").classList.contains("on"))loadYt();$("#pFoto").src=pfUrl||PR().foto||noav;draw();checkAlerts()}
function status2(t,ok){if(!ok)toast(t)}
(async function(){
 show("home");tabs();render();
 try{const r=await fetch("api.php?action=all"),d=await r.json();if(d.error)throw new Error(d.error);const m={};d.forEach(v=>m[v.id]=v);S.items=m}
 catch(e){toast("Tidak bisa terhubung ke database: "+e.message+" — pastikan Apache dan MySQL Laragon sudah Start dan schema.sql sudah di-import.")}
 try{POLA=await(await fetch("api.php?action=polaroids")).json();if(!Array.isArray(POLA))POLA=[]}catch(e){POLA=[]}
 fillOnce();render();if(ST().pending)giftModal();
 setInterval(checkAlerts,30000)})();
})();
