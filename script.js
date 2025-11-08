// script.js — final: fix double-invoked typing by (1) removing duplicate delegated triggers
// (2) adding a guard around openCard, and (3) making the typer use a single cancellable timer.

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const isIndex = page === "index" || page === "merged";
  const isSurprise = page === "surprise" || page === "merged";
  const go = (file) => (window.location.href = file);

  try { document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden"; } catch(e){}

  /* ===== Audio ===== */
  const countdownSound = document.getElementById("countdownSound");
  const popperSound    = document.getElementById("popperSound");
  const balloonSound   = document.getElementById("balloonSound");
  const albumSong      = document.getElementById("albumSong");
  let soundEnabled = false;

  const safePlay = async (el, {fromStart=true} = {}) => {
    if (!el) return false;
    try { if (fromStart) el.currentTime = 0; const p = el.play(); if (p?.catch) await p; return true; } catch { return false; }
  };
  const safePause = (el) => { try { el?.pause?.(); } catch {} };

  const enableSound = async () => { soundEnabled = true; await safePlay(countdownSound); };
  document.addEventListener("click", () => { if (!soundEnabled) enableSound(); }, { once:true });

  /* ===== Confetti helper ===== */
  const burst = (opts = {}) => {
    const { playSound = true, ...rest } = opts;
    if (typeof confetti === "function") {
      confetti(Object.assign({
        particleCount: 120,
        spread: 90,
        ticks: 180,
        colors: ["#ff6aa2","#ffb86c","#8be0ff","#a7f0c0","#ffffff"],
      }, rest));
      if (playSound && soundEnabled) safePlay(popperSound);
    }
  };

  /* ===== URL params (optional name/age) ===== */
  const params = new URLSearchParams(location.search);
  const nameParam = (params.get("name") || "").trim();
  const ageParam  = (params.get("age")  || "").trim();
  const setTxt = (id, fallback) => { const el = document.getElementById(id); if (el) el.textContent = (nameParam || fallback); };
  if (ageParam) { const ageEl = document.getElementById("age"); if (ageEl) ageEl.textContent = ageParam; }
  setTxt("nameHero","you"); setTxt("nameWish","Madam Ji");

  /* ================= COUNTDOWN ================= */
  if (isIndex) {
    const START_NUM=3; let cur=START_NUM; let intervalId;
    const numEl=document.getElementById("num");
    const ring=document.getElementById("ring");
    const countdownStage=document.getElementById("countdownStage");
    const surpriseSection=document.getElementById("surpriseSection");

    async function tickVisual(n){
      if (!numEl || !ring) return;
      if (soundEnabled) await safePlay(countdownSound);
      numEl.textContent=n; ring.classList.add("pulse"); numEl.style.transform="scale(1.10)";
      setTimeout(()=>{ ring.classList.remove("pulse"); numEl.style.transform="scale(1)"; },420);
    }

    function startCountdown(){
      clearInterval(intervalId); cur=START_NUM; tickVisual(cur);
      intervalId=setInterval(async () => {
        cur--;
        if (cur >= 0) tickVisual(cur);
        else {
          clearInterval(intervalId);
          if (surpriseSection){
            setTimeout(()=>{ countdownStage.classList.add("hidden"); surpriseSection.classList.remove("hidden"); document.body.dataset.page="surprise"; window.scrollTo({ top: 0, behavior: "smooth" }); },600);
          } else setTimeout(()=>go("surprise.html"),600);
        }
      },1000);
    }
    startCountdown();
    window.addEventListener("pageshow", startCountdown);
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) startCountdown(); });
  }

  /* ================= SURPRISE FLOW ================= */
  if (isSurprise) {
    const hero=document.getElementById("heroStage");
    const cakeStage=document.getElementById("cakeStage");
    const decorateStage=document.getElementById("decorateStage");
    const litStage=document.getElementById("litStage");
    const partyStage=document.getElementById("partyStage");
    const balloonStage=document.getElementById("balloonStage");
    const balloonContainer=document.getElementById("balloonContainer");
    const afterImage=document.getElementById("afterImage");
    const revealWrap=document.getElementById("revealWrap");
    const tapHint=document.getElementById("tapHint");
    const allStages=[hero,cakeStage,decorateStage,litStage,partyStage,balloonStage];
    const showStage=(el)=>{ allStages.forEach(s=>s&&s.classList.add("hidden")); if(el) el.classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"}); };

    /* ===== Balloons (slow upward + auto-pop at TOP) ===== */
    let balloonWatcherId = null;

    function startBalloonWatcher(getRemaining){
      stopBalloonWatcher();
      balloonWatcherId = setInterval(() => {
        if (!balloonContainer) return;
        const balloons = Array.from(balloonContainer.children);
        balloons.forEach(b => {
          if (b.dataset.popped === "1") return;
          const r = b.getBoundingClientRect();
          const outTop = (r.bottom <= 0);
          if (outTop) {
            b.dataset.popped = "1";
            try { b.remove(); } catch {}
            getRemaining(-1);
          }
        });
      }, 250);
    }
    function stopBalloonWatcher(){ if (balloonWatcherId) { clearInterval(balloonWatcherId); balloonWatcherId = null; } }

    function spawnBalloons(count = 7){
      if(!balloonContainer) return;
      balloonContainer.innerHTML = "";
      balloonContainer.style.pointerEvents = "auto";
      balloonContainer.classList.remove("hidden");
      afterImage?.classList.add("hidden");
      revealWrap?.classList.add("hidden");
      tapHint?.classList.add("hidden");
      const colors = ["red","blue","green","red","blue","green","red"];
      let remaining = count;
      const updateRemaining = (delta) => {
        remaining = Math.max(0, remaining + delta);
        if (remaining <= 0) { stopBalloonWatcher(); revealFinal(); }
      };
      const vw = window.innerWidth; const vh = window.innerHeight;
      for (let i = 0; i < count; i++){
        const b = document.createElement("div");
        b.className = `balloon ${colors[i % colors.length]}`;
        const shine = document.createElement("div"); shine.className = "shine"; b.appendChild(shine);
        const startX = Math.random() * (vw - 100) + 10;
        const startY = vh + Math.random() * 80;
        b.style.left = `${startX}px`; b.style.top  = `${startY}px`;
        balloonContainer.appendChild(b);
        const up = vh * (1.2 + Math.random() * 1.2);
        const drift = (Math.random() - 0.5) * vw * 0.035;
        const rotateDeg = (Math.random() - 0.5) * 8;
        const dur = 35000 + Math.random() * 20000;
        const delay = Math.random() * 900;
        const easing = "cubic-bezier(.25,.85,.2,1)";
        const kf = [
          { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1, offset: 0 },
          { transform: `translate3d(${drift*0.33}px, -${up*0.33}px, 0) rotate(${rotateDeg*0.33}deg)`, opacity: 1, offset: 0.33 },
          { transform: `translate3d(${drift*0.66}px, -${up*0.66}px, 0) rotate(${rotateDeg*0.66}deg)`, opacity: 1, offset: 0.66 },
          { transform: `translate3d(${drift}px, -${up}px, 0) rotate(${rotateDeg}deg)`, opacity: 0.98, offset: 1 }
        ];
        const anim = b.animate(kf, { duration: dur, delay, easing, fill: "forwards" });
        b.dataset.popped = "0";
        anim.onfinish = () => {
          if (b.dataset.popped === "1") return;
          b.dataset.popped = "1"; try { b.remove(); } catch {} ; updateRemaining(-1);
        };
        b.addEventListener("click", async () => {
          if (b.dataset.popped === "1") return;
          b.dataset.popped = "1";
          if (soundEnabled) await safePlay(balloonSound);
          b.classList.add("pop");
          b.animate([
            { transform: getComputedStyle(b).transform || "translate3d(0,0,0) scale(1)", opacity: 1 },
            { transform: `translate3d(0, -20px, 0) scale(1.22) rotate(${rotateDeg}deg)`, opacity: 0 }
          ], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
          setTimeout(() => { try { b.remove(); } catch {} ; updateRemaining(-1); }, 330);
        }, { passive: true });
      }
      startBalloonWatcher(updateRemaining);
    }

    function disableBalloonLayer(){
      if (!balloonContainer) return;
      balloonContainer.innerHTML = "";
      balloonContainer.style.pointerEvents = "none";
      balloonContainer.classList.add("hidden");
    }

    function revealFinal(){
      if(!afterImage||!revealWrap) return;
      disableBalloonLayer();
      revealWrap.classList.remove("hidden"); revealWrap.classList.add("visible");
      afterImage.classList.remove("hidden"); afterImage.style.opacity = "0"; afterImage.style.transform = "scale(.98)";
      const show = () => { afterImage.style.transition = "opacity .45s ease, transform .45s cubic-bezier(.2,.9,.3,1)"; afterImage.style.opacity = "1"; afterImage.style.transform = "scale(1)"; };
      afterImage.complete ? setTimeout(show, 20) : (afterImage.onload = show);
      tapHint?.classList.remove("hidden");
    }

    /* ===== Album (video-first with letterbox) ===== */
    const albumModal=document.getElementById("albumModal");
    const albumClose=document.getElementById("albumClose");
    const viewer=document.getElementById("viewer");
    const cardImg=document.getElementById("cardImg");
    const albumHint=document.getElementById("albumHint");
    const videoWrap = document.getElementById("videoWrap");
    const albumVideo = document.getElementById("albumVideo");
    const playVideoBtn = document.getElementById("playVideoBtn");
    const seeMsgBtn = document.getElementById("seeMsgBtnInAlbum");
    const replaySlideBtn = document.getElementById("replaySlideshowBtn");

    const album = Array.from({length:22},(_,i)=>`images/${i+1}.jpg`);
    let idx=0, isTurning=false;

    const preload = (src) => new Promise((resolve, reject) => {
      const im = new Image(); im.onload = () => resolve(src); im.onerror = reject; im.src = src;
    });

    function pageTurn(){ isTurning=true; setTimeout(()=>{ isTurning=false; }, 760); }
    async function goTo(direction){
      if(isTurning) return;
      const nextIdx = direction === "next" ? (idx+1) % album.length : (idx-1+album.length) % album.length;
      const nextSrc = album[nextIdx];
      try { await preload(nextSrc); cardImg.src = nextSrc; requestAnimationFrame(() => { pageTurn(); idx = nextIdx; }); }
      catch { cardImg.src = nextSrc; idx = nextIdx; }
    }

    function openAlbum(){
      stopPartyFX();
      videoWrap?.classList.remove("hidden");
      viewer?.classList.add("hidden");
      seeMsgBtn?.classList.add("hidden");
      replaySlideBtn?.classList.add("hidden");
      albumHint.textContent = "Your slideshow will start now…";
      albumModal?.classList.remove("hidden");
      requestAnimationFrame(()=> albumModal?.classList?.add("show"));

      if (albumVideo) {
        albumVideo.muted = false;
        albumVideo.volume = 1.0;
        albumVideo.removeAttribute("controls");
        safePlay(albumVideo, {fromStart:true}).then((ok)=>{
          if (!ok) playVideoBtn?.classList.remove("hidden");
          else { albumVideo.setAttribute("controls", ""); }
        }).catch(()=>{ playVideoBtn?.classList.remove("hidden"); });
      }
    }

    function afterVideoEnds(){
      videoWrap?.classList.add("hidden");
      viewer?.classList.remove("hidden");
      seeMsgBtn?.classList.remove("hidden");
      replaySlideBtn?.classList.remove("hidden");
      albumHint.textContent = "Swipe the photo or use ← / →";
      if (albumSong) {
        try { albumSong.muted = false; albumSong.volume = 1.0; } catch {}
        safePlay(albumSong).catch(()=>{ /* ignore play failure */ });
      }
      cardImg.src = album[idx];
    }

    function replaySlideshow(){
      safePause(albumSong);
      viewer?.classList.add("hidden");
      videoWrap?.classList.remove("hidden");
      seeMsgBtn?.classList.add("hidden");
      replaySlideBtn?.classList.add("hidden");
      albumHint.textContent = "Replaying your slideshow…";
      if (albumVideo) {
        albumVideo.muted = false;
        albumVideo.currentTime = 0;
        albumVideo.play().catch(()=>{ albumVideo.muted = true; albumVideo.play().catch(()=>{}); });
      }
    }

    function closeAlbum(){
      albumModal?.classList.remove("show");
      albumModal?.classList.add("hide");
      safePause(albumSong);
      if (albumVideo) { try { albumVideo.pause(); } catch{} }
      const onEnd = () => {
        albumModal.classList.add("hidden");
        albumModal.classList.remove("hide");
        albumModal.removeEventListener("animationend", onEnd);
        if (!document.getElementById("partyStage").classList.contains("hidden")) startPartyFX();
      };
      albumModal?.addEventListener("animationend", onEnd);
    }

    // Video events & fallbacks
    albumVideo?.addEventListener("ended", afterVideoEnds);
    albumVideo?.addEventListener("error", () => {
      albumHint.textContent = "Couldn’t load the video. Check if videos/album.mp4 exists.";
      playVideoBtn?.classList.remove("hidden");
    });

    // Overlay play button (appears if autoplay blocked)
    playVideoBtn?.addEventListener("click", async () => {
      if (!albumVideo) return;
      albumVideo.muted = false;
      albumVideo.volume = 1.0;
      albumVideo.setAttribute("controls", "");
      const ok = await safePlay(albumVideo, {fromStart:true});
      if (!ok) {
        albumVideo.muted = true;
        albumVideo.volume = 0.0;
        albumVideo.removeAttribute("controls");
        await safePlay(albumVideo, {fromStart:true});
      }
      playVideoBtn.classList.add("hidden");
    });

    // Direct, single bindings to avoid duplicates (card/album openers & closers):
    afterImage?.addEventListener("click", openAlbum);
    afterImage?.addEventListener("touchstart", (e)=>{ e.preventDefault(); openAlbum(); }, {passive:false});
    tapHint?.addEventListener("click", openAlbum);
    document.getElementById("seeMsgBtnInAlbum")?.addEventListener("click", () => openCard());
    document.getElementById("replaySlideshowBtn")?.addEventListener("click", replaySlideshow);
    albumClose?.addEventListener("click", closeAlbum);
    albumModal?.addEventListener("click", (e)=>{ if(e.target===albumModal) closeAlbum(); });

    // Swipe / keys (work after video ends when viewer visible)
    let sx=null; const TH=40; let px=null;
    const next = () => goTo("next"); const prev = () => goTo("prev");
    viewer?.addEventListener("touchstart", e=>sx=e.touches[0].clientX, {passive:true});
    viewer?.addEventListener("touchmove",  e=>{ if(sx===null || isTurning) return; const dx=e.touches[0].clientX-sx; if(dx>TH){ prev(); sx=null; } else if(dx<-TH){ next(); sx=null; } }, {passive:true});
    viewer?.addEventListener("touchend", ()=>sx=null, {passive:true});
    viewer?.addEventListener("pointerdown", e=>{ px=e.clientX; viewer.setPointerCapture(e.pointerId); });
    viewer?.addEventListener("pointermove", e=>{ if(px==null || isTurning) return; const dx=e.clientX-px; if(Math.abs(dx)>50){ dx<0 ? next() : prev(); px=e.clientX; }});
    viewer?.addEventListener("pointerup", ()=> px=null);
    document.addEventListener("keydown",(e)=>{
      if(albumModal?.classList.contains("hidden") || isTurning) return;
      if (!viewer.classList.contains("hidden")) {
        if(e.key==="ArrowRight") next();
        if(e.key==="ArrowLeft")  prev();
      }
      if(e.key==="Escape") closeAlbum();
    });

    /* ===== Message Card (typing + mobile-friendly) ===== */
    const cardModal=document.getElementById("cardModal");
    const cardClose=document.getElementById("cardClose");
    const gcard=document.getElementById("gcard");
    const typedEl=document.getElementById("typedText");
    const replayBtn=document.getElementById("replayBtn");

    // typing state (prevents duplicate timers)
    let typingHandle = null;
    function cancelTyping(){
      if (typingHandle) { clearTimeout(typingHandle); typingHandle = null; }
    }
    function typeText(el, text, speed=28, onComplete=()=>{}){
      if(!el) return;
      cancelTyping(); // ensure no prior typer is running
      el.classList.add("typing");
      el.innerHTML = "";
      let i=0;
      const step = () => {
        if(i >= text.length){
          el.classList.remove("typing");
          typingHandle = null;
          onComplete();
          return;
        }
        const ch = text[i++];
        el.innerHTML += ch === "\n" ? "<br>" : ch;
        typingHandle = setTimeout(step, speed);
      };
      step();
    }

    // Your message preserved
    const messageText =
"Happpieee Bday to my favt. Person ❤🥂🥰\n\n" +
"i know u r very happy without me but i still hope ki ek din sab thk ho jayegaaa and i will wait for u till the last\n\n" +
"enjoy ur day mei nhi aunga gharpe tujhe apni shkl dikhane jisse tera din khrb ho but yes I’m always there for u\n\n" +
"jab lage koi bhi nhi h tere paas tab a jaio bs khush raho enjoy ur day with ur friends and family bcz ab mei un dono mei se ksii ka bhi hissa nhi bacha hun pr thk h\n\n" +
"……..Happpieee Bday once again❤🧿🙇🏻….\n\n" +
"Or agar koi galti ho gai ho toh maafi mangta hun";

    // Guard to prevent double invocation of openCard
    let cardOpening = false;
    function openCard(){
      if (cardOpening) return; // prevent re-entry
      cardOpening = true;

      closeAlbum();
      cardModal?.classList.remove("hidden");
      setTimeout(()=>{
        gcard?.classList.add("open");
        setTimeout(()=> {
          burst({ particleCount: 180, spread: 100, origin: { y: 0.3 } });
          typeText(typedEl, messageText, 22, () => {
            replayBtn?.classList.remove("hidden");
            replayBtn?.scrollIntoView({ behavior:"smooth", block:"end" });
            cardOpening = false; // finished opening
          });
        }, 180);
      }, 1500);
    }

    function closeCard(){
      cancelTyping(); // stop any ongoing typer
      cardModal?.classList.add("hidden");
      gcard?.classList.remove("open");
      if(typedEl){ typedEl.innerHTML=""; typedEl.classList.remove("typing"); }
      replayBtn?.classList.add("hidden");
      cardOpening = false; // allow opening again after close
    }

    // single bindings for card controls
    replayBtn?.addEventListener("click", () => { location.reload(); });
    cardClose?.addEventListener("click", closeCard);
    cardModal?.addEventListener("click",(e)=>{ if(e.target===cardModal) closeCard(); });

    /* ================= PARTY FIREWORKS (crackers) ================= */
    const fwCanvas = document.getElementById("fireworks");
    const fwCtx = fwCanvas?.getContext?.("2d");
    let fwRunning = false, fwRaf;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function resizeCanvas(){ if(!fwCanvas) return; fwCanvas.width = Math.floor(innerWidth * dpr); fwCanvas.height= Math.floor(innerHeight* dpr); fwCanvas.style.width = innerWidth+"px"; fwCanvas.style.height= innerHeight+"px"; }
    resizeCanvas();
    addEventListener("resize", resizeCanvas);

    const sparks=[];
    function spawnFirework(){ if(!fwCanvas) return; const x = Math.random() * fwCanvas.width; const y = (0.45 + Math.random()*0.3) * fwCanvas.height; const hue = Math.floor(300 + Math.random()*120); for(let i=0;i<80;i++){ const angle = (Math.PI*2) * (i/80); const speed = (Math.random()*2 + 1.5) * dpr; sparks.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 60 + Math.random()*40, age:0, hue }); } }
    function tickFireworks(){ if(!fwCtx || !fwCanvas) return; fwCtx.globalCompositeOperation="destination-out"; fwCtx.fillStyle="rgba(0,0,0,0.12)"; fwCtx.fillRect(0,0,fwCanvas.width,fwCanvas.height); fwCtx.globalCompositeOperation="lighter"; for(let i=sparks.length-1;i>=0;i--){ const s=sparks[i]; s.age++; s.x+=s.vx; s.y+=s.vy; s.vy+=0.02*dpr; const alpha = 1 - (s.age/s.life); fwCtx.beginPath(); fwCtx.arc(s.x, s.y, 1.6*dpr, 0, Math.PI*2); fwCtx.fillStyle=`hsla(${s.hue}, 90%, 60%, ${alpha})`; fwCtx.fill(); if(s.age > s.life) sparks.splice(i,1); } if (Math.random() < 0.05) spawnFirework(); fwRaf = requestAnimationFrame(tickFireworks); }
    function startPartyFX(){ if(fwRunning || !fwCanvas) return; fwRunning = true; spawnFirework(); tickFireworks(); let t=0; const id=setInterval(()=>{ t++; if (!fwRunning) { clearInterval(id); return; } burst({particleCount: t%3?30:60, spread: 80, origin:{x:Math.random(), y: -0.05}}); }, 1400); }
    function stopPartyFX(){ fwRunning = false; if (fwRaf) cancelAnimationFrame(fwRaf); }

    /* ========== Minimal delegated handler (no duplicates for card/album) ========== */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button, [role='button']");
      if (!btn) return;
      const id = btn.id;

      switch(id) {
        case "startBtn":
          burst({particleCount:80,origin:{y:.6}}); showStage(cakeStage); break;
        case "decorateBtn":
          burst({particleCount:100,origin:{y:.6}}); showStage(decorateStage); break;
        case "lightBtn":
          showStage(litStage); burst({particleCount:160,origin:{y:.6}});
          setTimeout(()=>{ showStage(partyStage); startPartyFX(); }, 1500);
          break;
        case "popBalloonsBtn":
          burst({particleCount:180,spread:120,origin:{y:.3}});
          showStage(balloonStage); spawnBalloons(7);
          break;
        // intentionally NOT handling seeMsgBtnInAlbum/afterImage/tapHint here to avoid double triggers
        case "replayBtn":
          location.reload();
          break;
        case "cardClose":
          // covered by direct binding, keep as safety:
          break;
        default:
          break;
      }
    }, { passive: true });
  } // end isSurprise
});
