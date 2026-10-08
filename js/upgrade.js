/* CARTOK upgrade.js — mode ringan + bottom nav HP. ES5-friendly, aman Win7. */
(function(){
  var d=document,de=d.documentElement,ua=navigator.userAgent||"";
  var lowEnd=/Windows NT (5|6\.0|6\.1)/.test(ua)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)||(navigator.deviceMemory&&navigator.deviceMemory<=2);
  if(lowEnd)de.className+=" lite";
  function bnav(){
    if(d.querySelector(".dash-sidebar")||d.querySelector(".mobile-cta-bar"))return;
    var p=(location.pathname.split("/").pop()||"index.html");
    var ic={
      h:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
      s:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
      f:'<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
      u:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'};
    var items=[["index.html","Beranda",ic.h],["search.html","Cari",ic.s],["favorites.html","Favorit",ic.f],["login.html","Akun",ic.u]];
    var n=d.createElement("nav");n.className="bnav";n.setAttribute("aria-label","Navigasi utama");
    var html="";
    for(var i=0;i<items.length;i++){html+='<a href="'+items[i][0]+'"'+(p===items[i][0]||(p===""&&i===0)?' class="on"':'')+'>'+items[i][2]+items[i][1]+'</a>';}
    n.innerHTML=html;d.body.appendChild(n);d.body.className+=" has-bnav";
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",bnav);else bnav();
})();
/* Tombol ke atas (throttle rAF, ringan) */
(function(){
  var d=document,b=null,tick=false;
  function init(){
    b=d.createElement("button");b.className="totop";b.setAttribute("aria-label","Ke atas");
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
    b.onclick=function(){window.scrollTo(0,0);};d.body.appendChild(b);
    window.addEventListener("scroll",function(){
      if(tick)return;tick=true;
      (window.requestAnimationFrame||setTimeout)(function(){tick=false;b.className="totop"+((window.pageYOffset||0)>700?" show":"");});
    },{passive:true});
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
/* Bar prototipe + catatan footer + cahaya kursor */
(function(){
  var d=document;
  var T='Prototipe Cartok \u2014 hanya contoh untuk keperluan testing. <a href="https://benyoriki.com/" target="_blank" rel="noopener">benyoriki.com</a>';
  function init(){
    if(!d.querySelector(".dash-sidebar")){
      var bar=d.createElement("div");bar.className="proto-bar";bar.innerHTML=T;
      var nav=d.getElementById("site-navbar");
      if(nav&&nav.parentNode)nav.parentNode.insertBefore(bar,nav);else d.body.insertBefore(bar,d.body.firstChild);
    }
    var f=d.getElementById("site-footer");
    if(f){var p=d.createElement("div");p.className="proto-foot";p.innerHTML=T;f.appendChild(p);}
    if(/\blite\b/.test(d.documentElement.className)||!window.requestAnimationFrame)return;
    var sel=".cat,.stat-card,.bento-item,.testi-card",t=false,ev;
    d.addEventListener("mousemove",function(e){
      ev=e;if(t)return;t=true;
      requestAnimationFrame(function(){
        t=false;var el=ev.target&&ev.target.closest&&ev.target.closest(sel);
        if(!el)return;var r=el.getBoundingClientRect();
        el.style.setProperty("--mx",(ev.clientX-r.left)+"px");el.style.setProperty("--my",(ev.clientY-r.top)+"px");
      });
    },{passive:true});
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
