(() => {
  "use strict";

  if (!/^\/profile\/[^/]+\/?$/.test(location.pathname)) return;
  if (document.getElementById("cfpr-shadow-host")) return;

  const HANDLE_KEY = "cfprHandle";
  const CACHE_KEY = "cfprProblemsetCache";
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const PAGE_SIZE = 10000;
  const TAGS = [
    "2-sat", "binary search", "bitmasks", "brute force",
    "chinese remainder theorem", "combinatorics", "constructive algorithms",
    "data structures", "dfs and similar", "divide and conquer", "dp", "dsu",
    "expression parsing", "fft", "flows", "games", "geometry",
    "graph matchings", "graphs", "greedy", "hashing", "implementation",
    "interactive", "math", "matrices", "meet-in-the-middle",
    "number theory", "probabilities", "shortest paths", "sortings",
    "string suffix structures", "strings", "ternary search", "trees", "two pointers"
  ];

  const api = (method, params = {}) => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "CFPR_API", method, params }, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || "API request failed"));
      resolve(response.result);
    });
  });

  const problemKey = p => `${p.contestId ?? "gym"}-${p.index}`;

  function make(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") node.className = value;
      else node.setAttribute(key, String(value));
    }
    if (text) node.textContent = text;
    return node;
  }

  function findAnchor() {
    const page = document.querySelector("#pageContent");
    if (!page) return null;
    const graph = page.querySelector("#userActivityGraph");
    if (!graph) return null;

    const frame =
      graph.closest("._UserActivityFrame_frame") ||
      graph.closest(".userActivityRoundBox") ||
      graph;
    if (!frame.parentNode) return null;
    return { parent: frame.parentNode, before: frame.nextSibling };
  }

  function detectLoggedInHandle() {
    const header = document.querySelector("#header") || document;
    const links = [...header.querySelectorAll('a[href^="/profile/"]')];
    const hasLogout = [...document.querySelectorAll("a")].some(a =>
      /logout/i.test(`${a.textContent || ""} ${a.getAttribute("href") || ""}`)
    );
    if (!hasLogout) return "";

    for (const link of links) {
      const match = (link.getAttribute("href") || "").match(/^\/profile\/([^/?#]+)\/?$/);
      if (match && link.getClientRects().length) {
        try { return decodeURIComponent(match[1]); }
        catch { return match[1]; }
      }
    }
    return "";
  }

  function buildUI(shadow, initialHandle = '', isLoggedIn = false) {
    const style = make("style");
    style.textContent = `
      :host { all: initial; display:block; color-scheme:dark; }
      * { box-sizing:border-box; }
      .panel { display:block; width:100%; max-width:100%; min-width:0; overflow:hidden; margin:18px 0 22px; padding:18px 20px 16px;
        color:#e9e9e9; background:#17191b; border:1px solid #3b4145; border-radius:12px;
        font:14px/1.4 Arial,Helvetica,sans-serif; }
      .heading { display:flex; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px; min-width:0; }
      .brand { display:flex; align-items:center; gap:11px; }
      .logo { display:block; width:48px; height:48px; flex:0 0 48px; object-fit:contain; border-radius:10px; }
      .title-wrap { min-width:0; }
      h2 { margin:0; color:#f5f5f5; font:700 20px/1.3 Arial,sans-serif; }
      .subtitle { margin:2px 0 0; color:#a5aaae; font:12px/1.4 Arial,sans-serif; }
      .controls { display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1fr) minmax(190px,.75fr);
        align-items:end; gap:12px; min-width:0; padding:14px; background:#202326; border:1px solid #363c40; border-radius:10px; }
      .control-field { min-width:0; }
      label { display:block; margin:0 0 6px; color:#c5c9cc; font:600 12px Arial,sans-serif; }
      select { display:block; width:100%; min-width:0; height:42px; padding:0 10px; color:#f4f4f4; background:#171a1c;
        border:1px solid #4a5156; border-radius:7px; font:13px Arial,sans-serif; outline:none; }
      input:focus,select:focus { border-color:#4d8dff; }
      button { display:block; width:100%; min-width:0; min-height:42px; padding:8px 12px; color:#111820; background:#f0a43a; border:0;
        border-radius:7px; font:700 13px Arial,sans-serif; cursor:pointer; white-space:normal; overflow-wrap:anywhere; }
      button:hover { background:#ffb74f; } button:disabled { opacity:.65; cursor:wait; }
      .status { min-height:33px; padding:10px 2px 8px; color:#58d597; font:12px/1.4 Arial,sans-serif; overflow-wrap:anywhere; }
      .status.ok { color:#58d597; } .status.error { color:#ff8585; }
      .table-wrap { width:100%; overflow-x:auto; }
      table { width:100%; border-collapse:collapse; background:#191c1e; }
      th { padding:10px 12px; color:#e6e6e6; background:#24282b; border-bottom:1px solid #454b4f;
        font:600 15px Arial,sans-serif; text-align:left; }
      th:first-child,td:first-child { width:52px; }
      th:last-child { width:150px; text-align:right; }
      td { padding:10px 12px; border-bottom:1px solid #353b3f; color:#a5a5a5; font:14px Arial,sans-serif; }
      tr:last-child td { border-bottom:0; }
      td a { color:#5793ff; font-weight:700; text-decoration:underline; text-underline-offset:2px; }
      td a:hover { color:#83b0ff; }
      td.solved { color:#58d597; font-weight:700; text-align:right; white-space:nowrap; }
      .empty { padding:22px 12px; color:#aeb5ba; text-align:center; }
      @media(max-width:760px) {
        .panel { padding:14px; }
        .controls { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .button-wrap { grid-column:1/-1; }
      }
      @media(max-width:480px) {
        .panel { padding:10px; }
        .heading { align-items:flex-start; }
        h2 { font-size:18px; }
        .subtitle { font-size:11px; }
        .controls { grid-template-columns:minmax(0,1fr); padding:10px; gap:10px; }
        .button-wrap { grid-column:auto; }
        th,td { padding:9px 7px; font-size:12px; }
        th:first-child,td:first-child { width:34px; }
        th:last-child { width:92px; }
      }
    `;
    shadow.append(style);

    const panel = make("section", { className:"panel" });
    const heading = make("div", { className:"heading" });
    const brand = make("div", { className:"brand" });
    const logo = make("img", { className:"logo", alt:"CF Problem Recommender" });
    logo.src = chrome.runtime.getURL("icons/icon48.png");
    const title = make("div", { className:"title-wrap" });
    title.append(make("h2", {}, "Problem Recommender"),
      make("p", { className:"subtitle" }, "Your 5 most popular unsolved problems"));
    brand.append(logo,title);
    heading.append(brand);

    const controls=make("div",{className:"controls"});
    const ratingField=make("div",{className:"control-field"});
    ratingField.append(make("label",{for:"cfpr-rating"},"Rating"));
    const rating=make("select",{id:"cfpr-rating"});
    for(let n=800;n<=3500;n+=100){const o=make("option",{value:n},String(n));if(n===1200)o.selected=true;rating.append(o);}
    ratingField.append(rating);

    const tagField=make("div",{className:"control-field"});
    tagField.append(make("label",{for:"cfpr-tag"},"Tag (optional)"));
    const tag=make("select",{id:"cfpr-tag"});
    tag.append(make("option",{value:""},"All tags"));
    TAGS.forEach(t=>tag.append(make("option",{value:t},t)));
    tagField.append(tag);

    const buttonWrap=make("div",{className:"button-wrap"});
    const button=make("button",{type:"button"},"Recommend Problems");
    buttonWrap.append(button);
    controls.append(ratingField,tagField,buttonWrap);

    const status=make("div",{className:"status ok"},
      `Recommendations will be fetched for ${initialHandle || "the current profile"}.`);
    const tableWrap=make("div",{className:"table-wrap"});
    const table=make("table");
    const thead=make("thead"),head=make("tr");
    head.append(make("th",{},"#"),make("th",{},"Problem"),make("th",{},"Solved by"));
    thead.append(head);
    const tbody=make("tbody");
    table.append(thead,tbody);tableWrap.append(table);
    panel.append(heading,controls,status,tableWrap);
    shadow.append(panel);
    return {handle:{value:initialHandle},rating,tag,button,status,tbody};
  }

  function setStatus(ui,message,type=""){ui.status.textContent=message;ui.status.className=`status ${type}`.trim();}

  async function getProblemset(status){
    const saved=await chrome.storage.local.get(CACHE_KEY),cached=saved[CACHE_KEY];
    if(cached&&Date.now()-cached.savedAt<CACHE_TTL)return cached.result;
    setStatus({status},"Loading Codeforces problem list and statistics…");
    const result=await api("problemset.problems");
    await chrome.storage.local.set({[CACHE_KEY]:{savedAt:Date.now(),result}});
    return result;
  }

  async function getSolved(handle,status){
    const solved=new Set();let from=1;
    while(true){
      setStatus({status},`Checking accepted submissions… (from ${from})`);
      const batch=await api("user.status",{handle,from,count:PAGE_SIZE});
      for(const s of batch)if(s.verdict==="OK"&&s.problem)solved.add(problemKey(s.problem));
      if(batch.length<PAGE_SIZE)break;
      from+=batch.length;
    }
    return solved;
  }

  function render(tbody,problems){
    tbody.replaceChildren();
    if(!problems.length){
      const row=make("tr"),cell=make("td",{colspan:3,className:"empty"},
        "No unsolved problems match these filters. Try another rating or choose All tags.");
      row.append(cell);tbody.append(row);return;
    }
    const fragment=document.createDocumentFragment();
    problems.forEach((p,i)=>{
      const row=make("tr");
      row.append(make("td",{},String(i+1)));
      const cell=make("td");
      const link=make("a",{href:`https://codeforces.com/problemset/problem/${p.contestId}/${encodeURIComponent(p.index)}`,target:"_blank",rel:"noopener noreferrer"},`${p.contestId}${p.index} - ${p.name}`);
      cell.append(link);row.append(cell);
      row.append(make("td",{className:"solved"},Number(p.solvedCount||0).toLocaleString("en-US")));
      fragment.append(row);
    });
    tbody.append(fragment);
  }

  async function run(ui){
    const handle=ui.handle.value.trim();
    if(!handle){setStatus(ui,"Enter your Codeforces username first.","error");ui.handle.focus();return;}
    ui.button.disabled=true;ui.button.textContent="Loading…";ui.tbody.replaceChildren();
    try{
      await chrome.storage.local.set({[HANDLE_KEY]:handle});
      setStatus(ui,`Fetching recommendations for ${handle} · validating Codeforces handle…`,"ok");
      await api("user.info",{handles:handle});
      const problemset=await getProblemset(ui.status);
      const solved=await getSolved(handle,ui.status);
      const rating=Number(ui.rating.value),tag=ui.tag.value;
      setStatus(ui,`Fetching for ${handle} · filtering unsolved problems…`,"ok");
      const list=problemset.problems.map((p,i)=>({...p,solvedCount:problemset.problemStatistics?.[i]?.solvedCount??0}))
        .filter(p=>p.contestId!=null)
        .filter(p=>p.rating===rating)
        .filter(p=>!tag||(p.tags||[]).includes(tag))
        .filter(p=>!solved.has(problemKey(p)))
        .sort((a,b)=>b.solvedCount-a.solvedCount).slice(0,5);
      render(ui.tbody,list);
      setStatus(ui,`Top ${list.length} most-solved unsolved problem(s) for ${handle} · rating ${rating} · ${tag||"all tags"}`,"ok");
    }catch(e){setStatus(ui,e.message||"Unexpected error. Please retry.","error");}
    finally{ui.button.disabled=false;ui.button.textContent="Recommend Problems";}
  }

  function inject(){
    if(document.getElementById("cfpr-shadow-host"))return true;
    const anchor=findAnchor();
    if(!anchor)return false;

    const profileHandle = (() => {
      try { return decodeURIComponent(location.pathname.split("/")[2] || ""); }
      catch { return location.pathname.split("/")[2] || ""; }
    })();
    const loggedInHandle = detectLoggedInHandle();
    const initialHandle = loggedInHandle || profileHandle;

    const host=make("div",{id:"cfpr-shadow-host"});
    host.style.cssText="display:block!important;float:none!important;width:100%!important;max-width:100%!important;clear:none!important;position:relative!important;z-index:auto!important;box-sizing:border-box!important;margin:18px 0 22px!important;";
    const shadow=host.attachShadow({mode:"open"});
    const ui=buildUI(shadow,initialHandle,!!loggedInHandle);
    anchor.parent.insertBefore(host,anchor.before||null);

    chrome.storage.local.set({[HANDLE_KEY]:initialHandle}).catch(()=>{});
    ui.button.addEventListener("click",()=>run(ui));
    return true;
  }

  function start(){
    if(inject())return;
    const observer=new MutationObserver(()=>{if(inject())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),20000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();