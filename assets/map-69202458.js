import"./index-d9fea552.js";const{create:f,xy:T,L:I,simpleMarker:u,setApiUrl:M,AdvancedTileLayer:U,loader:w,getRegion:$,setCdnUrl:h,version:E,crel:b}=YZWF.eorzeaMap;const c=e=>document.getElementById(e),v=c("title"),x=c("eorzea-map");let t,l={map:1};const s=({map:e,markers:n})=>{t.loadMapKey(e).then(()=>{if(v.textContent=t.mapInfo.placeName,!n||n.length===0)return;for(const{x:d,y:p,icon:i,title:a}of n){const m=w.getIconUrl(`ui/icon/${i.substring(0,3)}000/${i}.tex`),r=u(d,p,m,t.mapInfo);a&&r.bindTooltip(a.replace(/\[icon:(\d+)\]/g,(y,g)=>`<i class="icon">&#${g};</i>`),{permanent:!0,direction:"top",className:"marker-tooltip"}).openTooltip(),t.addMarker(r)}const o=n[0];setTimeout(()=>t.setView(t.mapToLatLng2D(o.x,o.y),-1),10)})};f(x).then(e=>{t=e,s(l)});window.addEventListener("error",e=>{e.preventDefault()});window.addEventListener("message",e=>{e.origin===window.location.origin&&(t?s(e.data):l=e.data)});