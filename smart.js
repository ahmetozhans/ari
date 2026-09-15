/* Kovan Defteri - koloni değerlendirme motoru */
(function(){
  function latestInspection(hiveId){
    return (db.inspections||[]).filter(x=>x.hive===hiveId).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]||null;
  }
  function colonyScore(hive){
    const i=latestInspection(hive.id);
    if(!i)return {score:null,label:'Kontrol gerekli',reasons:['Henüz kontrol kaydı yok']};
    let s=50,reasons=[];
    const bee=i.beeFrames===''||i.beeFrames==null?null:+i.beeFrames;
    const brood=i.broodFrames===''||i.broodFrames==null?null:+i.broodFrames;
    const honey=i.honeyFrames===''||i.honeyFrames==null?null:+i.honeyFrames;
    const varroa=i.varroaCount===''||i.varroaCount==null?null:+i.varroaCount;
    if(bee!=null){s+=Math.min(20,bee*2);if(bee<=4)reasons.push('Arılı çerçeve düşük');}
    if(brood!=null){s+=Math.min(15,brood*2.5);if(brood<=2)reasons.push('Yavrulu çerçeve düşük');}
    s+=({İyi:10,Orta:5,Zayıf:-5,Yok:-15}[i.brood]||0);
    s+=({'Görüldü':5,'Yumurta görüldü':5,'Görülmedi':-5,'Şüpheli':-10}[i.queen]||0);
    s+=({İyi:5,Orta:2,Az:-4,Yok:-10}[i.food]||0);
    if(i.food==='Az'||i.food==='Yok')reasons.push('Yem/bal stoku '+i.food.toLowerCase());
    if(i.queen==='Görülmedi'||i.queen==='Şüpheli')reasons.push('Ana arı kontrolü gerekli');
    if(i.swarm&&i.swarm!=='Yok'){s-=8;reasons.push('Oğul eğilimi: '+i.swarm);}
    if(varroa!=null&&varroa>0){s-=Math.min(15,varroa);reasons.push('Varroa sayımı: '+varroa);}
    if(hive.status==='Zayıf')s-=10;
    if(hive.status==='Ana arısız'){s-=25;reasons.push('Ana arısız');}
    s=Math.max(0,Math.min(100,Math.round(s)));
    return {score:s,label:s>=80?'Çok iyi':s>=65?'İyi':s>=45?'Orta':'Dikkat',reasons,bee,brood,honey,varroa};
  }
  window.latestInspection=latestInspection;
  window.colonyScore=colonyScore;
  window.kovanSmartAlerts=function(){
    const out=[];
    (db.hives||[]).filter(h=>h.status!=='Pasif').forEach(h=>{
      const g=colonyScore(h);
      if(g.score==null)out.push('⚠️ '+h.name+': kontrol kaydı gerekli');
      else {
        if(g.score<45)out.push('📉 '+h.name+': güç puanı '+g.score+'/100');
        g.reasons.forEach(r=>out.push('⚠️ '+h.name+': '+r));
      }
    });
    return [...new Set(out)];
  };
  window.kovanSmartReport=function(){
    const active=(db.hives||[]).filter(h=>h.status!=='Pasif');
    const scored=active.map(h=>({h,g:colonyScore(h)})).filter(x=>x.g.score!=null);
    const avg=scored.length?Math.round(scored.reduce((a,x)=>a+x.g.score,0)/scored.length):null;
    return {active:active.length,average:avg,attention:scored.filter(x=>x.g.score<45).length,ranking:scored.sort((a,b)=>b.g.score-a.g.score)};
  };
})();