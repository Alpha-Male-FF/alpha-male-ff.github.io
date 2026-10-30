(function(){
function sortable(table){
 if(table.dataset.sortable)return;table.dataset.sortable='true';
 const heads=[...table.querySelectorAll('thead th')];const body=table.querySelector('tbody');if(!body)return;
 heads.forEach((th,index)=>{
  th.style.cursor='pointer';th.title='Click to sort ascending or descending';th.tabIndex=0;th.setAttribute('role','button');
  const sort=()=>{
   const direction=(th.dataset.order==='desc')?'asc':'desc';
   heads.forEach(t=>{delete t.dataset.order;t.removeAttribute('aria-sort')});
   th.dataset.order=direction;th.setAttribute('aria-sort',direction==='desc'?'descending':'ascending');
   const value=row=>{const raw=(row.children[index]?.textContent||'').trim(),numeric=raw.replace(/[,−%+]/g,'').replace(/(?<=\d)–(?=\d)/g,'');
     return /^[-+]?\d+(\.\d+)?%?$/.test(raw.replace(/,/g,''))?Number(raw.replace(/[,%]/g,'')):null};
   const rows=[...body.rows];
   rows.sort((a,b)=>{const av=value(a),bv=value(b);let v=av!==null&&bv!==null?av-bv:(a.children[index]?.textContent||'').localeCompare(b.children[index]?.textContent||'',undefined,{numeric:true});return direction==='desc'?-v:v});
   body.replaceChildren(...rows);
  };
  th.addEventListener('click',sort);
  th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sort()}});
 });
}
const observer=new MutationObserver(()=>{document.querySelectorAll('#content table').forEach(sortable)});
observer.observe(document.body,{subtree:true,childList:true});
document.querySelectorAll('#content table').forEach(sortable);
})();