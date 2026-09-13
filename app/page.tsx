"use client";

import { useEffect, useMemo, useState } from "react";
import { coveredRangeCount, deepFieldCount, pageCatalog, pageDetails, type FieldDef, type PageDef, type Requirement } from "./cmis-register-data";
import { connectors, descriptorLocation, hex8, hostInterfaces, identifiers, lookup, mediaInterfacesByType, mediaTypes, type SffCode } from "./sff8024-data";

import { MechanismIndex, MechanismPage, RegisterRelations, EncodingView, AddressText, MultiByteValue } from "./guide-views";
import { mechanismGuides, registerHref } from "./mechanism-data";
import { appRoute, siteHref } from "./site-path";

type Ref = { id: string; section: string; title: string; source: string; excerpt: string; rationale: string };

const refs: Record<string, Ref> = {
  overview: { id: "overview", section: "§4.1 / 图 4-1", title: "CMIS 管理协议与分层", source: "CMIS 5.3，第 49 页", excerpt: "CMIS 将基础寄存器访问与可选的 CDB 消息层组织为管理栈。", rationale: "用于解释管理接口、寄存器与可选消息机制之间的边界。" },
  app: { id: "app", section: "§6.2.1.4 / 表 6-1", title: "Application Descriptor structure", source: "CMIS 5.3，第 58–59 页", excerpt: "模块使用 Application Descriptor 声明其支持的 Application 实例。", rationale: "Descriptor 是能力广告；AppSel 是模块内顺序号，不是跨模块固定接口编码。" },
  msm: { id: "msm", section: "§6.3.2 / 图 6-3、6-4", title: "Module State Machine", source: "CMIS 5.3，第 74–83 页", excerpt: "分页模块与 Flat Memory 模块采用不同复杂度的模块状态模型。", rationale: "分页模块必须按状态约束可管理性、功耗和 Data Path 生命周期。" },
  dpsm: { id: "dpsm", section: "§6.3.3 / 图 6-5 / 表 6-18", title: "Data Path State Machine", source: "CMIS 5.3，第 84–93 页", excerpt: "一个 Data Path 的状态在其所有关联 Host Lane 上重复报告。", rationale: "DPState 是模块报告的状态；DPDeinit 是主机的静态请求，两者不能混用。" },
  memory: { id: "memory", section: "§8.1 / 图 8-1、8-2", title: "CMIS Module Memory Map", source: "CMIS 5.3，第 133–140 页", excerpt: "Lower Memory 固定可见；Upper Memory 由 PageSelect 与 BankSelect 选择。", rationale: "访问 Upper Memory 前必须建立 Page/Bank 上下文。" },
  apply: { id: "apply", section: "§8.9.3.1 / 表 8-70", title: "Staged Control Set 0 Apply Triggers", source: "CMIS 5.3，第 196–197 页", excerpt: "ApplyDPInit 是写一触发字段，整字节必须以单字节 WRITE 写入。", rationale: "触发被接受后仍需轮询 ConfigStatus；写入完成不等于配置已经生效。" },
  cdb: { id: "cdb", section: "§8.23 / 表 8-177–180", title: "Banked Page 9Fh (CDB Message)", source: "CMIS 5.3，第 282–285 页", excerpt: "Page 9Fh 是可选 CDB 的主消息页，包含命令头、回复头和本地负载。", rationale: "CDB 功能本身可选；声明实例后，相应页面、Flag 与 Mask 形成条件强制要求。" },
  power: { id: "power", section: "§6.3.2.2 / 表 6-12、6-13", title: "Module Power Transition Signals", source: "CMIS 5.3，第 75–77 页", excerpt: "LowPwrRequestSW 与受允许位控制的硬件请求共同决定 LowPwrS。", rationale: "软件请求与硬件引脚不是互相替代；模块按协议逻辑求值后驱动状态转换。" },
  flags: { id: "flags", section: "§6.3.4 / 表 8-8–10", title: "Flagging Conformance and Summaries", source: "CMIS 5.3，第 94–97、144–147 页", excerpt: "Flag Summary 只指示相应 Bank/Page 存在 Flag；清除需读取具体 Flag。", rationale: "Mask 控制 Interrupt 贡献，不应被解释为阻止 Flag 本身置位。" },
  firmware: { id: "firmware", section: "§9.7 / 表 9-18", title: "CDB Firmware Management Commands", source: "CMIS 5.3，第 307–320 页", excerpt: "固件管理使用 CDB，是可选特性；各命令具有 Required、Conditional 或 Advertised 等级。", rationale: "0100h 在该命令组中为 Required；下载、Run、Commit 的适用性取决于命令支持广告。" },
  timing: { id: "timing", section: "§10 / 表 10-1–9", title: "Management Timing Specifications", source: "CMIS 5.3，第 351–355 页", excerpt: "协议将信号波形、效果延迟、寄存器访问、内容依赖和中断延迟分表规定。", rationale: "具体等待值应从对应参数表取用；协议未定义时不得自行补估。" },
  sff: { id: "sff", section: "Tables 4-1 / 4-3 / 4-5–4-10", title: "Identifier / Connector / Interface ID Assignments", source: "SFF-8024 R4.12，2024-07-17", excerpt: "CMIS 中的形态、连接器、Host 与 Media Interface ID 使用 SFF-8024 的公共编码表。", rationale: "CMIS 规定字段位置和拼装方法；SFF-8024 规定这些字段取值对应的标准接口名称。" },
  advertising: { id: "advertising", section: "§8.4 / Tables 8-42–8-60", title: "Page 01h Module Advertisement", source: "CMIS 5.3，第 160–180 页", excerpt: "Page 01h 以静态只读字段声明页面、时序、控制、Flag、Monitor、SI、CDB、NAD 与 Application 能力。", rationale: "能力位必须按对应 Byte/Bit 解释；置位后，相关页面、控制与行为要求随适用条件生效。" },
  custom: { id: "custom", section: "§8.1 / Tables 8-1、8-4、8-26、8-42、8-61、8-67、8-100、8-125", title: "Custom Memory and Custom Encodings", source: "CMIS 5.3 Memory Map", excerpt: "CMIS 为 Custom 区和 Custom code 保留边界，但不定义厂商私有字段的内部语义。", rationale: "解析器可以可靠说明位置、访问属性、Bank/持久性/校验边界及代码归类；私有 Bit 含义必须来自对应厂商字段表。" },
};

const nav = ["机制目录", "核心流程", "寄存器地图", "编码查询", "声明生成器", "状态机", "故障排查", "覆盖情况"];
const paths:Record<string,string>={"机制目录":"/mechanisms","核心流程":"/flows","寄存器地图":"/registers/Lower/0","编码查询":"/codes/amplitude","声明生成器":"/builder","状态机":"/states","故障排查":"/diagnosis","覆盖情况":"/coverage","协议总览":"/mechanisms"};
const mechanisms: {name:string; en:string; level:Requirement; desc:string; ref:string}[] = [
  { name: "Memory Map", en: "Page · Bank · Access", level: "强制", desc: "Lower/Upper Memory、分页、Bank 与访问一致性。", ref: "memory" },
  { name: "Module 状态机", en: "MSM", level: "条件强制", desc: "模块上电、低功耗、就绪、故障与复位。", ref: "msm" },
  { name: "Data Path 状态机", en: "DPSM", level: "条件强制", desc: "Data Path 初始化、激活、停用与去初始化。", ref: "dpsm" },
  { name: "Application Advertisement", en: "Descriptor · AppSel", level: "条件强制", desc: "接口、Lane 数与可实例化位置的能力广告。", ref: "app" },
  { name: "Control Sets", en: "Staged → Active", level: "条件强制", desc: "配置暂存、验证、提交、反馈与生效。", ref: "apply" },
  { name: "Power Management", en: "Low / High Power", level: "条件强制", desc: "硬件与软件低功耗请求的联合控制。", ref: "msm" },
  { name: "Flags & Interrupt", en: "Flag · Mask · IntL", level: "条件强制", desc: "事件锁存、屏蔽、汇总、读取与清除。", ref: "memory" },
  { name: "CDB Messaging", en: "Command / Reply", level: "可选", desc: "基于 Memory Map 的命令、回复与负载交换。", ref: "cdb" },
  { name: "Monitoring & Threshold", en: "DDM · Alarm", level: "条件强制", desc: "温度、电压、光功率、偏置和阈值告警。", ref: "flags" },
  { name: "Lane Mapping", en: "Host · Media · Data Path", level: "条件强制", desc: "Lane group、起始位置与 Application 实例映射。", ref: "app" },
  { name: "Firmware Management", en: "CDB 0100h–010Ah", level: "可选", desc: "镜像发现、下载、验证、运行与提交。", ref: "firmware" },
  { name: "Reset & Initialization", en: "Reset · MgmtInit", level: "条件强制", desc: "硬件/软件复位、默认值与管理接口就绪。", ref: "msm" },
  { name: "TX/RX Control", en: "Disable · Squelch", level: "条件强制", desc: "Host/Media 方向的输出静默与实际状态。", ref: "dpsm" },
  { name: "Password & Security", en: "CDB 0001h / 0002h", level: "可选", desc: "标准 CDB 密码入口与模块认证能力边界。", ref: "cdb" },
  { name: "Timing Requirements", en: "MSL · RAL", level: "强制", desc: "管理信号、寄存器访问、条件到状态的时间参数。", ref: "timing" },
  { name: "Normalized Advertisement", en: "NAD · Page 1Ch", level: "可选", desc: "可扩展至 240 个 Application 的 8 字节描述符。", ref: "app" },
];

type RegisterRow = { address:string; bits:string; name:string; access:string; level:Requirement; meaning:string; ref:string; tags:string[] };
const registers: RegisterRow[] = [
  { address:"00h:1", bits:"7–0", name:"CmisRevision", access:"RO", level:"强制", meaning:"高半字节为主版本，低半字节为次版本；53h 表示 5.3。", ref:"memory", tags:["版本","Lower Memory"] },
  { address:"00h:2", bits:"7", name:"MemoryModel", access:"RO", level:"强制", meaning:"0b：Paged；1b：Flat（仅支持 Page 00h）。", ref:"memory", tags:["Page","能力"] },
  { address:"00h:2", bits:"6", name:"SteppedConfigOnly", access:"RO", level:"强制", meaning:"1b：只保证基本分步重配置；0b：还支持两类 intervention-free 重配置。", ref:"apply", tags:["配置","能力"] },
  { address:"00h:3", bits:"3–1", name:"ModuleState", access:"RO", level:"强制", meaning:"分页模块报告当前可观察 Module State；Flat 模块始终报告 ModuleReady。", ref:"msm", tags:["状态机","状态"] },
  { address:"00h:26", bits:"6", name:"LowPwrAllowRequestHW", access:"RW", level:"强制", meaning:"控制模块是否对 LowPwrRequestHW 硬件信号求值。", ref:"power", tags:["功耗","控制"] },
  { address:"00h:26", bits:"4", name:"LowPwrRequestSW", access:"RW", level:"强制", meaning:"1b 请求保持或返回低功耗；上电默认 0b。", ref:"power", tags:["功耗","控制"] },
  { address:"00h:26", bits:"3", name:"SoftwareReset", access:"WO/SC", level:"强制", meaning:"写 1 触发与规定保持时间的硬件 Reset 等效的软件复位。", ref:"msm", tags:["复位","触发"] },
  { address:"00h:126", bits:"7–0", name:"BankSelect", access:"RW", level:"条件强制", meaning:"选择 Bank；改变 Bank 时需与 PageSelect 在同一 WRITE 中写入。", ref:"memory", tags:["Bank","选择"] },
  { address:"00h:127", bits:"7–0", name:"PageSelect", access:"RW", level:"条件强制", meaning:"选择映射到 Upper Memory 的 Page。", ref:"memory", tags:["Page","选择"] },
  { address:"01h:163", bits:"7–6", name:"CdbInstancesSupported", access:"RO", level:"强制", meaning:"00b 不支持；01b 一个实例；10b 两个实例；11b Reserved。", ref:"cdb", tags:["CDB","能力"] },
  { address:"10h:128", bits:"7–0", name:"DPDeinitLane<i>", access:"RW", level:"强制", meaning:"每 Host Lane 静态请求：0 初始化关联 Data Path，1 去初始化；同一 Data Path 的所有 Lane 必须一致。", ref:"dpsm", tags:["Data Path","控制"] },
  { address:"10h:143", bits:"7–0", name:"SCS0::ApplyDPInitLane<i>", access:"WO", level:"强制", meaning:"写 1 触发使用 Staged Control Set 0 的 Provision；必须单字节 WRITE。", ref:"apply", tags:["AppSel","触发"] },
  { address:"11h:128–131", bits:"每 Lane 4 bit", name:"DPStateHostLane<i>", access:"RO", level:"强制", meaning:"按 Host Lane 报告关联 Data Path 状态；多 Lane Data Path 各 Lane 值相同。", ref:"dpsm", tags:["Data Path","状态"] },
  { address:"11h:132", bits:"7–0", name:"OutputStatusRx<i>", access:"RO", level:"强制", meaning:"1b 代表模块实际向 Host 发送有效 Rx 输出；独立于 DPSM 状态报告。", ref:"dpsm", tags:["Rx","状态"] },
  { address:"11h:133", bits:"7–0", name:"OutputStatusTx<i>", access:"RO", level:"强制", meaning:"1b 代表模块实际发送有效 Media Lane Tx 信号。", ref:"dpsm", tags:["Tx","状态"] },
  { address:"11h:202–205", bits:"每 Lane 4 bit", name:"ConfigStatusLane<i>", access:"RO", level:"强制", meaning:"最近配置命令的执行/结果；Ch 为 ConfigInProgress，1h 为成功。", ref:"apply", tags:["配置","状态"] },
  { address:"9Fh:128–129", bits:"16 bit", name:"CMDID", access:"RW", level:"条件强制", meaning:"CDB 命令码；写入规定触发位置会发送已组装的命令。", ref:"cdb", tags:["CDB","命令"] },
];

function Badge({level}:{level:Requirement}) { return <span className={`badge badge-${level}`}>{level}</span>; }

export default function Home() {
  const [route,setRoute]=useState('/mechanisms');
  const [navigationKey,setNavigationKey]=useState(0);
  const go=(url:string)=>{const route=appRoute(url);window.history.pushState({},'',siteHref(route));setRoute(route);setNavigationKey(k=>k+1);window.scrollTo(0,0)};
  useEffect(()=>{const sync=()=>{setRoute(appRoute(window.location.pathname+window.location.search));setNavigationKey(k=>k+1)};sync();window.addEventListener('popstate',sync);const click=(e:MouseEvent)=>{const a=(e.target as Element).closest('a');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0||a.target==='_blank')return;const u=new URL(a.href,window.location.href);const route=appRoute(u.pathname+u.search);if(u.origin===window.location.origin&&/^\/(mechanisms|registers|codes|flows|builder|states|diagnosis|coverage)(\/|\?|$)/.test(route)){e.preventDefault();go(route)}};document.addEventListener('click',click);return()=>{window.removeEventListener('popstate',sync);document.removeEventListener('click',click)}},[]);
  const routeParts=route.split('?')[0].split('/').filter(Boolean);const root=routeParts[0]||'mechanisms';
  const active=({'mechanisms':'机制目录','flows':'核心流程','registers':'寄存器地图','codes':'编码查询','builder':'声明生成器','states':'状态机','diagnosis':'故障排查','coverage':'覆盖情况'} as Record<string,string>)[root]||'机制目录';
  const setActive=(name:string)=>{setSourceOpen(false);go(paths[name]||'/mechanisms')};
  const [query, setQuery] = useState("");
  const [refId, updateRefId] = useState("overview");
  const [sourceOpen,setSourceOpen]=useState(false);
  const setRefId=(id:string)=>{updateRefId(refs[id]?id:'overview');setSourceOpen(true)};
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setSourceOpen(false)};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[]);
  const searchResults = useMemo(() => query.trim() ? [
    ...mechanismGuides.filter(m=>(m.title+m.id+m.summary+m.rules.join('')).toLowerCase().includes(query.toLowerCase())).map(m=>({title:m.title,meta:m.subtitle,type:'机制',ref:'overview',target:'/mechanisms/'+m.id})),
    ...pageDetails.flatMap(p=>p.ranges.flatMap(g=>(g.fields||[]).filter(f=>(f.address+' '+f.name+' '+f.meaning).toLowerCase().includes(query.toLowerCase())).map(f=>({title:f.name,meta:f.address+' ['+f.bits+']',type:'字段',ref:'memory',target:registerHref(f.address)})))),
    ...pageDetails.filter(p=>(p.page+' '+p.title).toLowerCase().includes(query.toLowerCase())).map(p=>({title:p.page,meta:p.title,type:'页面',ref:'memory',target:registerHref(p.page+':'+(p.page==='Lower'?0:128))})),
  ].slice(0,16) : [], [query]);
  const reference = refs[refId];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive("协议总览")} aria-label="返回协议总览">
          <span className="brand-mark">C</span><span><b>CMIS 5.3</b><small>协议交互式解析站</small></span>
        </button>
        <div className="search-wrap"><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索机制、Page、字段、章节或命令码…" /><kbd>查找</kbd></label>{query&&<div className="search-popover">{searchResults.map((x,i)=><button key={`${x.type}${x.title}${i}`} onClick={()=>{go(x.target);setQuery("")}}><span>{x.type}</span><div><b>{x.title}</b><small>{x.meta}</small></div><em>↗</em></button>)}{searchResults.length===0&&<p>当前已解析知识项中没有匹配结果</p>}</div>}</div>
        <div className="version"><i /> OIF-CMIS-05.3 <span>2024-09-04</span></div>
      </header>

      <aside className="sidebar">
        <p className="side-label">知识库</p>
        <nav>{nav.map((item, i) => <button key={item} className={active===item?"active":""} onClick={()=>setActive(item)}><span>{String(i+1).padStart(2,"0")}</span>{item}{item==="版本差异"&&<em>预留</em>}</button>)}</nav>
        <div className="scope-card"><span>当前范围</span><b>CMIS Revision 5.3</b><p>完整 Page 目录；{pageDetails.length} 个页面已做地址范围解析，其中核心页可下钻到 Byte/Bit。</p></div>
      </aside>

      <section className="content">
        <div className="crumb">CMIS 5.3 <span>/</span> {active}</div>
        {active === "机制目录" && (routeParts[1]?<MechanismPage key={routeParts[1]} id={routeParts[1]}/>:<MechanismIndex/>)}
        {active === "编码查询" && <EncodingView key={routeParts[1]} kind={routeParts[1]||'amplitude'}/>}
        {active === "核心流程" && <FlowView onRef={setRefId} />}
        {active === "寄存器地图" && <RegisterMapStudio key={navigationKey} initialMediaType={Number(new URLSearchParams(route.split("?")[1]||"").get("media")||2)} initialBank={Number(new URLSearchParams(route.split("?")[1]||"").get("bank")||0)} initialPage={routeParts[1]} initialOffset={Number(routeParts[2]||0)} initialHex={new URLSearchParams(route.split("?")[1]||"").get("value")||"00"} onRef={setRefId} />}
        {active === "声明生成器" && <DeclarationBuilder onRef={setRefId} />}
        {active === "状态机" && <StateMachineView onRef={setRefId} />}
        {active === "故障排查" && <TroubleshootView onRef={setRefId} />}
        {active === "覆盖情况" && <CoverageView />}
      </section>

      {sourceOpen&&<button className="source-backdrop" aria-label="关闭协议依据" onClick={()=>setSourceOpen(false)}/>}
      <aside className={`reference-panel ${sourceOpen?'source-open':''}`} aria-label="协议依据" aria-hidden={!sourceOpen}>
        <button className="source-close" onClick={()=>setSourceOpen(false)}>关闭 ×</button>
        <div className="panel-title"><span>协议依据</span><b>CMIS 5.3</b></div>
        <div className="ref-block"><p>章节定位</p><h3>{reference.section}</h3><b>{reference.title}</b><small>{reference.source}</small></div>
        <div className="quote"><span>规范短摘录 · 中文概括</span><p>“{reference.excerpt}”</p></div>
        <div className="judgement"><span>判断说明</span><p>{reference.rationale}</p></div>
        <div className="related"><span>关联知识</span><button onClick={()=>setActive("寄存器地图")}>相关寄存器 <b>→</b></button><button onClick={()=>setActive("状态机")}>相关状态 <b>→</b></button><button onClick={()=>setActive("核心流程")}>相关流程 <b>→</b></button></div>
        <div className="source-note"><i>i</i><p>字段位置与行为以 OIF-CMIS-05.3（2024-09-04）为准；CMIS 引用的 Identifier、Connector、Host/Media Interface ID 枚举按 SFF-8024 R4.12（2024-07-17）解析。</p></div>
      </aside>
    </main>
  );
}

function Overview({onRef,onOpenFlow,onOpenMap}:{onRef:(id:string)=>void;onOpenFlow:()=>void;onOpenMap:()=>void}) {
  const steps = ["读取标识与版本", "确认 Memory Model", "读取能力广告", "选择 Application", "写入 Staged Set", "触发并轮询", "初始化 Data Path", "验证输出状态"];
  return <>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow">CMIS 5.3 ENGINEERING REFERENCE</div><h1>流程、寄存器、写值<br/><span>集中在一个页面体系</span></h1><p>面向光模块研发、测试、驱动与交换机适配。重点保留初始化、Application 配置、状态机、Page/Bank、逐字节字段和实际读写值解释。</p><div className="hero-actions"><button className="primary" onClick={onOpenMap}>打开寄存器地图</button><button className="secondary" onClick={onOpenFlow}>查看完整初始化</button></div></div>
      <div className="architecture" aria-label="CMIS 管理架构图">
        <div className="arch-head"><span>HOST</span><small>Management initiator</small></div>
        <div className="arch-layers"><button onClick={()=>onRef("memory")}>Register Access <span>essential</span></button><button onClick={()=>onRef("cdb")}>CDB Messaging <span>optional</span></button></div>
        <div className="bus"><i/><b>Management Communication Interface</b><i/></div>
        <div className="module-box"><div className="arch-head"><span>MODULE</span><small>Management target</small></div><div className="module-grid"><button onClick={()=>onRef("msm")}>Module SM</button><button onClick={()=>onRef("dpsm")}>Data Path SM</button><button onClick={()=>onRef("memory")}>Memory Map</button><button onClick={()=>onRef("app")}>Capabilities</button><button onClick={()=>onRef("memory")}>Monitoring</button><button onClick={()=>onRef("cdb")}>Optional Functions</button></div></div>
        <p>依据：§4.1、图 4-1、章节 6–9</p>
      </div>
    </section>

    <section className="stats"><div><b>128</b><span>每页可点击 Offset</span></div><div><b>8</b><span>单字节 Bit 位</span></div><div><b>29</b><span>完整初始化步骤</span></div><div><b>{pageDetails.length}</b><span>已建模 Page</span></div><div className="progress-stat"><b>核心寄存器优先</b><span>逐位内容持续扩充</span><i><em/></i></div></section>

    <section className="journey"><div className="section-head"><div><p className="eyebrow">HOST JOURNEY</p><h2>从插入模块到业务可用</h2></div><button onClick={onOpenFlow}>查看 29 步完整流程 →</button></div><div className="step-track">{steps.map((s,i)=><button key={s} onClick={()=>onRef(i<3?"memory":i<5?"app":i<7?"apply":"dpsm")}><b>{i+1}</b><span>{s}</span>{i<steps.length-1&&<i>→</i>}</button>)}</div><p className="caption">这里展示主路径；完整页面进一步区分主机 I/O、模块动作、状态变化与完成判据。</p></section>
  </>;
}

function PageIntro({kicker,title,desc,children}:{kicker:string;title:string;desc:string;children?:React.ReactNode}) {
  return <section className="page-intro"><div><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{desc}</p></div>{children}</section>;
}

function MechanismView({onRef}:{onRef:(id:string)=>void}) {
  const [filter,setFilter]=useState("全部");
  const shown=mechanisms.filter(m=>filter==="全部"||m.level===filter);
  return <>
    <PageIntro kicker="MECHANISM KNOWLEDGE MODEL" title="机制导航" desc="按工程问题组织协议内容。每项机制使用相同的数据结构：适用范围、规范等级、能力声明、主机/模块职责、操作流程、寄存器、异常路径与协议依据。"><div className="summary-pill"><b>16</b><span>已建立机制入口</span></div></PageIntro>
    <div className="filterbar">{["全部","强制","条件强制","可选"].map(f=><button className={filter===f?"active":""} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <section className="detail-grid">{shown.map((m,i)=><button className="detail-card" key={m.name} onClick={()=>onRef(m.ref)}><div><span>{String(i+1).padStart(2,"0")}</span><Badge level={m.level}/></div><h2>{m.name}</h2><small>{m.en}</small><p>{m.desc}</p><ul><li>适用条件与能力声明</li><li>主机/模块职责</li><li>字段、状态与流程引用</li></ul><b className="detail-link">打开协议依据 →</b></button>)}</section>
  </>;
}

const moduleStates=[
  {name:"Resetting",type:"transient",power:"Transition",desc:"从除 Reset 外的任意状态进入；所有 DPSM 消失并执行完整模块复位。",next:"Reset",ref:"§6.3.2.5.1"},
  {name:"Reset",type:"steady",power:"Low",desc:"插入或上电后的初始状态；内部电子电路保持复位。",next:"MgmtInit",ref:"§6.3.2.5.2"},
  {name:"MgmtInit",type:"transient",power:"Low",desc:"初始化 Memory Map 默认值与管理通信接口。",next:"ModuleLowPwr",ref:"§6.3.2.5.3"},
  {name:"ModuleLowPwr",type:"steady",power:"Low",desc:"管理接口完整可用，所有 Data Path 仍为 DPDeactivated。",next:"ModulePwrUp",ref:"§6.3.2.5.4"},
  {name:"ModulePwrUp",type:"transient",power:"Transition",desc:"模块向高功耗模式上电，所有 Data Path 保持 DPDeactivated。",next:"ModuleReady",ref:"§6.3.2.5.5"},
  {name:"ModuleReady",type:"steady",power:"High",desc:"完全运行；主机可以初始化或去初始化 Data Path。",next:"ModulePwrDn",ref:"§6.3.2.5.6"},
  {name:"ModulePwrDn",type:"transient",power:"Transition",desc:"返回低功耗；完成后回到 ModuleLowPwr。",next:"ModuleLowPwr",ref:"§6.3.2.5.7"},
  {name:"ModuleFault",type:"steady",power:"Implementation specific",desc:"安全相关故障稳态；进入条件及响应存在实现相关部分。",next:"Resetting",ref:"§6.3.2.5.8"},
];
const dpStates=[
  {name:"DPDeactivated",code:"1h",output:"Quiescent",next:"DPInit",condition:"DPDeinitS = FALSE"},
  {name:"DPInit",code:"2h",output:"Quiescent",next:"DPInitialized",condition:"资源初始化完成"},
  {name:"DPInitialized",code:"7h",output:"依 Lane 控制",next:"DPTxTurnOn",condition:"DPDeactivateS = FALSE"},
  {name:"DPTxTurnOn",code:"5h",output:"In transition",next:"DPActivated",condition:"全部 Tx 输出 operational"},
  {name:"DPActivated",code:"4h",output:"Operational",next:"DPTxTurnOff",condition:"DPDeactivateS = TRUE"},
  {name:"DPTxTurnOff",code:"6h",output:"In transition",next:"DPInitialized",condition:"关闭过程完成"},
  {name:"DPDeinit",code:"3h",output:"In transition",next:"DPDeactivated",condition:"模块相关去初始化完成"},
];

function StateMachineView({onRef}:{onRef:(id:string)=>void}) {
 const [kind,setKind]=useState<"module"|"data">("module");
 const [selected,setSelected]=useState(0);
 const current=kind==="module"?moduleStates[selected]:dpStates[selected];
 return <>
  <PageIntro kicker="STATE MACHINES" title="状态机" desc="状态名称、编码和主要转移依据 CMIS 5.3 原文。点击状态查看进入后的模块行为与寄存器定位。"><div className="segmented"><button className={kind==="module"?"active":""} onClick={()=>{setKind("module");setSelected(0)}}>Module MSM</button><button className={kind==="data"?"active":""} onClick={()=>{setKind("data");setSelected(0)}}>Data Path DPSM</button></div></PageIntro>
  <section className="state-workbench">
   <div className="state-canvas">
    <div className="canvas-head"><div><b>{kind==="module"?"Module 状态索引":"Data Path 状态索引"}</b><span>{kind==="module"?"图 6-3 · §6.3.2":"图 6-5 · §6.3.3"}</span></div><div className="legend"><i className="steady"/>稳态 <i className="transient"/>瞬态</div></div>
    <div className={`state-flow ${kind}`}>{(kind==="module"?moduleStates:dpStates).map((s,i)=><button key={s.name} className={`${selected===i?"selected":""} ${"type" in s?s.type:"steady"}`} onClick={()=>{setSelected(i)}}><small>{kind==="data"&&(s as typeof dpStates[number]).code}</small><b>{s.name}</b></button>)}</div>
    <div className="state-notes"><span>全局路径</span><p>{kind==="module"?"Resetting 可从除 Reset 外的状态进入；ModuleFault 的精确进入条件为 Implementation Specific。":"DPDeinit 可由初始化后的状态返回 DPDeactivated；DPSM 主要控制 Tx，Rx 输出还受独立静默控制。"}</p></div>
   </div>
   <aside className="inspector"><p>当前状态</p><h2>{current.name}</h2>{"code" in current&&<span className="code-chip">Encoding {current.code}</span>}<dl>{"power" in current&&<><dt>功耗</dt><dd>{current.power}</dd></>}<dt>输出状态</dt><dd>{"output" in current?current.output:current.desc}</dd><dt>离开/下一步</dt><dd>{"condition" in current?current.condition:`→ ${current.next}`}</dd><dt>协议依据</dt><dd>{"ref" in current?current.ref:"表 6-18、表 8-84"}</dd></dl><button className="primary" onClick={()=>onRef(kind==="module"?"msm":"dpsm")}>查看协议依据</button></aside>
  </section>
  <section className="info-banner"><b>关键边界</b><p>DPState 是模块报告；DPDeinit 是主机请求。多 Lane Data Path 在所有关联 Host Lane 上应报告相同状态，但主机只需读取第一条 Lane 即可判断该 Data Path 状态。</p><button onClick={()=>onRef("dpsm")}>§6.3.3.2–3</button></section>
 </>;
}

type ProcedureStep={phase:string;actor:"HOST"|"MODULE"|"BUS";title:string;io:string;detail:string;check:string};
type Procedure={name:string;level:Requirement;goal:string;source:string;completion:string;steps:ProcedureStep[]};
const ps=(phase:string,actor:ProcedureStep["actor"],title:string,io:string,detail:string,check:string):ProcedureStep=>({phase,actor,title,io,detail,check});
const procedures:Procedure[]=[
 {name:"完整软件控制初始化",level:"条件强制",goal:"Appendix D.2.1：主机先锁住 Data Path 与 Tx 输出，再上电、Provision、初始化并激活。",source:"附录 D.2.1 · 图 D-2 / D-3",completion:"ConfigStatus=1h 只证明配置被接受；最终完成条件是 DPState=DPActivated，且目标 Lane 的 OutputStatusRx/Tx 与业务预期一致。",steps:[
  ps("上电与管理初始化","HOST","建立安全硬件条件","LowPwrRequestHW=1 · ModSel=0 · Reset=1","给 Vcc，上电前保持低功耗请求；选择模块并释放 Reset。","总线电气条件满足 MCI 访问要求"),
  ps("上电与管理初始化","BUS","模块热插入","—","模块连接并开始内部复位/管理初始化。","模块开始 MgmtInit"),
  ps("上电与管理初始化","MODULE","装载默认值","10h:128=00h · 10h:130=00h · Lower:26.6=1 · Lower:26.4=0","在 MgmtInit 中初始化 Memory Map、Active/Staged Set 与默认控制。","默认值完成、MCI 即将可用"),
  ps("上电与管理初始化","MODULE","进入 ModuleLowPwr","R Lower:3；R Lower:8.0","置 ModuleStateChangedFlag；所有 Data Path 仍为 DPDeactivated。","ModuleState=ModuleLowPwr"),
  ps("上电与管理初始化","HOST","响应中断并读取具体 Flag","R Lower:3–13","先看 Summary，再读取具体 Flag；不要只读 Summary 后假定事件已清除。","确认 MgmtInit 已结束"),
  ps("上电与管理初始化","HOST","读取功耗要求","R 00h:200–201 · R 01h:145–154","确认模块功耗等级和上电最大持续时间。","Host 端口预算允许模块进入高功耗"),
  ps("上电与管理初始化","HOST","建立初始化互锁","R Lower:26.7；W 10h:128=FFh · W 10h:130=FFh","先明确 Bank 广播是否启用，再禁止目标范围的 Data Path 自动初始化并禁用 Media Tx 输出。","回读确认静态控制值"),
  ps("模块进入 Ready","HOST","撤销硬件低功耗影响","RMW Lower:26.6=0","确认 LowPwrRequestSW=0，再清除 LowPwrAllowRequestHW；也可按系统设计撤销硬件请求。","LowPwrS 变为 FALSE"),
  ps("模块进入 Ready","BUS","等待状态事件","WAIT IntL / tPwrUpMax","等待 ModuleStateChangedFlag；不可用固定经验延时替代模块广告时长。","IntL 或受限轮询发现状态变化"),
  ps("模块进入 Ready","MODULE","执行 ModulePwrUp","R Lower:3","内部电路进入高功耗，Data Path 继续保持 DPDeactivated。","ModuleState=ModulePwrUp"),
  ps("模块进入 Ready","MODULE","进入 ModuleReady","R Lower:3；R Lower:8.0","完成上电并置 ModuleStateChangedFlag。","ModuleState=ModuleReady"),
  ps("模块进入 Ready","HOST","读取并确认 Ready","R Lower:3–13","读取具体 Flag 和 ModuleState。","确认 ModuleReady，无 ModuleFault"),
  ps("能力选择与 Provision","HOST","读取 Application 广告","R Lower:85–117 · R 01h:223–250 · 可选 R 1Ch","按模块自己的 Descriptor 顺序选择 AppSel/Lane 组合。","目标 Application、Host/Media Lane 集合法"),
  ps("能力选择与 Provision","HOST","写入 SCS0 Data Path 配置","W 10h:145–152","相关 Lane 写相同 AppSel；DataPathID=最低 Host Lane 索引-1；按需要设置 ExplicitControl。","SCS0 的全部相关 Lane 字节一致"),
  ps("能力选择与 Provision","HOST","让 Host Tx 输入有效","Host SerDes action","在释放模块 Tx 之前准备有效 Host 电信号，避免错误传播。","Host Tx 信号满足目标 Application"),
  ps("能力选择与 Provision","HOST","单字节触发 ApplyDPInit","W1 10h:143=lane-mask","只写 1 个字节，位图覆盖完整 Data Path Host Lane。","事务边界确认是 single-byte WRITE"),
  ps("能力选择与 Provision","MODULE","验证并复制到 Active Set","R 11h:202–235","验证配置，更新 DPInitPending，并将合法配置复制到 ACS。","ConfigStatus 从 Ch 退出"),
  ps("能力选择与 Provision","HOST","检查每条 Lane 的 ConfigStatus","R 11h:202–205","目标 Data Path 的所有 Lane 必须为 1h；拒绝码需按 3h/4h/5h/6h/7h 等定位。","全部相关 Lane=1h"),
  ps("Data Path 初始化","HOST","清除目标 DPDeinit 位","RMW 10h:128 &= ~lane-mask","读取后构造新值，再按寄存器规则写入；串行化访问并保留其他 Data Path 的控制位。","同一 Data Path 所有相关位均为 0"),
  ps("Data Path 初始化","BUS","等待 Data Path 状态事件","WAIT IntL / tInitMax","模块看到 DPDeinitS=FALSE 后进入 DPInit。","DPStateChangedFlag 置位或轮询状态变化"),
  ps("Data Path 初始化","MODULE","执行 DPInit","R 11h:128–131 · R 11h:235","初始化硬件资源，完成后清除 DPInitPending。","DPInitPending=0"),
  ps("Data Path 初始化","MODULE","进入 DPInitialized","R 11h:128–131","进入稳态并置 DPStateChangedFlag；Tx 仍被 OutputDisableTx 互锁。","相关 Lane DPState=7h"),
  ps("Data Path 初始化","HOST","读取状态 Flag","R Lower:4–7 · R 11h:134–153","定位并读取具体 Lane Flag。","DPInitialized 已确认"),
  ps("Tx 激活与业务确认","HOST","释放目标 Media Tx 输出","RMW 10h:130 &= ~media-mask","只清除当前 Data Path 对应 Media Lane；保留其他 Lane Disable 位。","目标 OutputDisableTx 位=0"),
  ps("Tx 激活与业务确认","BUS","等待 Tx Turn-On","WAIT IntL / tTxTurnOnMax","模块从 DPInitialized 经 DPTxTurnOn 激活输出。","DPStateChangedFlag 或状态轮询"),
  ps("Tx 激活与业务确认","MODULE","使能有效 Tx 输出","R 11h:133","完成光/电 Media Tx 输出启动。","目标 OutputStatusTx=1"),
  ps("Tx 激活与业务确认","MODULE","进入 DPActivated","R 11h:128–133","进入 DPActivated 并报告实际 Rx/Tx 输出状态。","相关 Lane DPState=4h"),
  ps("Tx 激活与业务确认","HOST","读取并交叉确认","R 11h:128–133 · R Flags","同时检查 DPState、OutputStatusRx、OutputStatusTx 和错误 Flag。","无拒绝/告警，输出状态符合拓扑"),
  ps("Tx 激活与业务确认","HOST","放行业务流量","Traffic enable","只有状态与实际输出均满足后才向上层宣布链路可用。","业务数据面通过端到端检查"),
 ]},
 {name:"默认 Application 快速初始化",level:"条件强制",goal:"适用于模块默认 Active Set 与默认 Application 已满足主机需求的简化路径。",source:"附录 D.1",completion:"快速路径仍不能跳过 ModuleReady、DPState 与 OutputStatus 的完成确认。",steps:[
  ps("进入就绪","HOST","读取基本标识与状态","R Lower:0–3","确认 CMIS 版本、Paged/Flat Memory 和 ModuleState。","MgmtInit 已结束"),
  ps("进入就绪","HOST","读取功耗和默认 Application","R 00h:200–201 · R Lower:85–117","确认默认配置正是目标 Application。","默认 ACS 与主机端口一致"),
  ps("进入就绪","HOST","请求高功耗","RMW Lower:26.6=0","撤销硬件低功耗请求影响。","ModuleState 进入 ModulePwrUp"),
  ps("进入就绪","HOST","确认 ModuleReady","R Lower:3 / Flags","等待广告最大时长内状态完成。","ModuleState=ModuleReady"),
  ps("初始化","HOST","请求默认 Data Path 初始化","RMW 10h:128 &= ~lane-mask","默认 ACS 合法时可直接清除 DPDeinit。","相关位为 0"),
  ps("初始化","MODULE","完成 DPInit","R 11h:128–131","经 DPInit 进入 DPInitialized。","DPState=7h"),
  ps("激活","HOST","释放目标 Tx 输出","RMW 10h:130 &= ~media-mask","保持其他 Lane 禁用。","目标 Disable 位清除"),
  ps("激活","HOST","确认 Activated 与输出","R 11h:128–133","交叉检查 DPSM 与实际输出。","DPState=4h 且 OutputStatus 符合预期"),
 ]},
 {name:"软件控制去初始化 / 低功耗",level:"条件强制",goal:"Appendix D.2.2：先静默并去初始化 Data Path，再安全返回 ModuleLowPwr。",source:"附录 D.2.2 · 图 D-4",completion:"所有目标 Data Path 为 DPDeactivated，ModuleState 返回 ModuleLowPwr；如果仍有 Data Path 激活，不应进入低功耗完成态。",steps:[
  ps("去激活","HOST","请求 Data Path 去初始化","RMW 10h:128 |= lane-mask","同一 Data Path 所有 Host Lane 位必须同时置 1。","DPDeinitS=TRUE"),
  ps("去激活","MODULE","关闭 Tx 输出","R 11h:128–133","从 DPActivated 经 DPTxTurnOff 返回 DPInitialized。","OutputStatusTx 清零"),
  ps("去初始化","MODULE","执行 DPDeinit","R 11h:128–131","释放与该 Data Path 相关的硬件资源。","DPState 经 3h"),
  ps("去初始化","MODULE","进入 DPDeactivated","R 11h:128–131","完成并置 DPStateChangedFlag。","相关 Lane DPState=1h"),
  ps("去初始化","HOST","读取具体状态 Flag","R Lower:4–7 · R 11h Flags","确认没有 Data Path 仍处于瞬态。","全部目标 DPDeactivated"),
  ps("返回低功耗","HOST","重新允许硬件低功耗请求","RMW Lower:26.6=1","在 LowPwrRequestHW 已断言时使 LowPwrS 变为 TRUE。","模块进入 ModulePwrDn"),
  ps("返回低功耗","MODULE","执行 ModulePwrDn","R Lower:3","关闭高功耗资源。","ModuleState=ModulePwrDn"),
  ps("返回低功耗","HOST","确认 ModuleLowPwr","R Lower:3 / Flags","读取状态与 Flag，结束流程。","ModuleState=ModuleLowPwr"),
 ]},
 {name:"CDB 固件下载",level:"可选",goal:"按广告能力完成镜像下载、校验、运行与提交。",source:"§9.7 / 表 9-18",completion:"Run 与 Commit 是两个动作；Commit 仅接受当前运行镜像，并决定后续 Reset 的启动镜像。",steps:[
  ps("能力发现","HOST","查询 CDB 与固件能力","R 01h:163 · CMD 0041h","确认实例、LPL/EPL 和具体 FW 命令支持。","CDB 实例与命令已广告"),
  ps("下载会话","HOST","Start Firmware Download","CDB 0101h","提供镜像大小与可选 VendorData。","CdbCmdCompleteFlag + 成功状态"),
  ps("下载会话","HOST","传输镜像块","CDB 0103h / 0104h","按广告选择 LPL 或 EPL，逐块检查 Reply。","全部块已确认"),
  ps("校验","HOST","Complete Firmware Download","CDB 0107h","结束镜像并触发模块校验。","镜像完成且校验成功"),
  ps("切换","HOST","Run Firmware Image","CDB 0109h","运行目标镜像。","当前 running image 已变化"),
  ps("持久化","HOST","Commit Firmware Image","CDB 010Ah","提交当前运行镜像作为 Reset 后启动镜像。","committed image 与目标一致"),
 ]},
];
function FlowView({onRef}:{onRef:(id:string)=>void}){
 const [idx,setIdx]=useState(0);const [phase,setPhase]=useState("全部");const flow=procedures[idx];
 const phases=["全部",...Array.from(new Set(flow.steps.map(s=>s.phase)))];const shown=flow.steps.filter(s=>phase==="全部"||s.phase===phase);
 return <><PageIntro kicker="REGISTER-I/O PLAYBOOKS" title="完整操作流程与寄存器 I/O" desc="按主机动作、总线事务、模块行为和完成判据拆解。所有 WRITE 都标出地址与事务语义；所有等待都指向 Flag、State 或广告持续时间。"><div className="summary-pill"><b>{flow.steps.length}</b><span>当前流程检查点</span></div></PageIntro><section className="flow-layout deep-flow"><nav className="flow-list">{procedures.map((f,i)=><button className={idx===i?"active":""} key={f.name} onClick={()=>{setIdx(i);setPhase("全部")}}><Badge level={f.level}/><b>{f.name}</b><span>{f.steps.length} 个严格步骤</span></button>)}</nav><article className="flow-detail"><div className="flow-title"><div><Badge level={flow.level}/><h2>{flow.name}</h2><p>{flow.goal}</p><code>{flow.source}</code></div><button onClick={()=>onRef(idx===3?"firmware":idx===0?"apply":"dpsm")}>协议依据 ↗</button></div><div className="phase-filter">{phases.map(x=><button className={phase===x?"active":""} onClick={()=>setPhase(x)} key={x}>{x}</button>)}</div><div className="io-head"><span>步骤 / 责任方</span><span>寄存器 / I/O</span><span>行为规定</span><span>完成判据</span></div><ol className="io-steps">{shown.map((s,i)=><li key={`${s.phase}${s.title}${i}`}><div className="step-label"><span>{String(flow.steps.indexOf(s)+1).padStart(2,"0")}</span><div><small>{s.phase}</small><b>{s.title}</b><em className={`actor actor-${s.actor.toLowerCase()}`}>{s.actor}</em></div></div><div className="io-links"><AddressText text={s.io}/></div><p>{s.detail}</p><p className="step-check"><i>✓</i>{s.check}</p></li>)}</ol><div className="completion"><b>最终完成判断</b><p>{flow.completion}</p></div></article></section></>;
}

type BitMeaning={bits:string;name:string;access:string;level:Requirement;meaning:string;value:string};
function addressCovers(field:FieldDef,page:PageDef,offset:number){
 const [prefix,raw=""]=field.address.split(":");if(prefix!==page.page)return false;
 const m=raw.match(/(\d+)(?:[–-](\d+))?/);if(!m)return false;
 const start=Number(m[1]),end=m[2]?Number(m[2]):start;return offset>=start&&offset<=end;
}
function fieldsAt(page:PageDef,offset:number){return page.ranges.flatMap(x=>x.fields||[]).filter(x=>addressCovers(x,page,offset));}
function selectedRange(page:PageDef,offset:number){return page.ranges.find(x=>offset>=x.start&&offset<=x.end)||page.ranges[0];}
function compactFieldName(name:string,offset:number){
 const names:Record<string,string>={SFF8024Identifier:"标识符",CmisRevision:"CMIS版本",MemoryModel:"Memory模型",SteppedConfigOnly:"配置模式",ModuleState:"模块状态",ModuleStateChangedFlag:"状态变化Flag",LowPwrAllowRequestHW:"硬件低功耗允许",LowPwrRequestSW:"软件低功耗请求",SoftwareReset:"软件复位",BankSelect:"Bank选择",PageSelect:"Page选择",CMDID:"CDB命令ID",CdbChkCode:"CDB校验",RPLLength:"回复长度",RPLChkCode:"回复校验"};
 if(names[name])return names[name];
 if(name.includes("DPConfigLane"))return `DP配置 L${offset>=145&&offset<=152?offset-144:""}`;
 if(name.includes("DPStateHostLane"))return "Data Path状态";
 if(name.includes("ConfigStatusLane"))return "配置结果";
 if(name.includes("OutputDisableTx"))return "Tx输出禁用";
 if(name.includes("ApplyDPInit"))return "ApplyDPInit";
 return name.replace(/<[^>]+>/g,"").replace(/SCS0::|ACS::/g,"").slice(0,18);
}
function toneFor(label:string,access:string){const s=`${label} ${access}`.toLowerCase();if(s.includes("reserved"))return"reserved";if(s.includes("custom"))return"custom";if(s.includes("flag")||s.includes("mask"))return"flag";if(s.includes("monitor")||s.includes("threshold"))return"monitor";if(s.includes("status")||s.includes("state"))return"status";if(s.includes("control")||s.includes("staged")||s.includes("configuration"))return"control";if(s.includes("application")||s.includes("advert"))return"app";if(s.includes("cdb")||s.includes("payload"))return"cdb";return"base"}
function laneBits(name:string,access:string,level:Requirement,meaning:string,value:number):BitMeaning[]{return Array.from({length:8},(_,i)=>{const bit=7-i,v=(value>>bit)&1;return{bits:String(bit),name:`${name} Lane ${bit+1}`,access,level,meaning:name.includes("AssignmentOptions")?(v?`允许从 Lane ${bit+1} 开始该 Application 实例`:`不允许从 Lane ${bit+1} 开始该 Application 实例`):`${meaning} 当前位=${v}。`,value:String(v)}})}
function dpStateName(v:number){return ["Reserved","DPDeactivated","DPInit","DPDeinit","DPActivated","DPTxTurnOn","DPTxTurnOff","DPInitialized","Reserved","Reserved","Reserved","Reserved","Reserved","Reserved","Reserved","Reserved"][v]}
function configStatusName(v:number){return ["Undefined","Success","Rejected · unspecified","Rejected · invalid AppSel","Rejected · invalid Data Path/Lane set","Rejected · invalid SI","Rejected · lanes in use","Rejected · partial Data Path","Reserved","Reserved","Reserved","Reserved","ConfigInProgress","Custom reject D","Custom reject E","Custom reject F"][v]}
function bitWindow(bits:string){const m=bits.match(/^(\d+)(?:[–-](\d+))?$/);if(!m)return null;const high=Number(m[1]),low=m[2]?Number(m[2]):high;if(high>7||low>7||high<low)return null;return{high,low,width:high-low+1}}
function parseCodePart(part:string){const m=part.trim().match(/^([0-9A-F]+)([bh])$/i);if(!m)return null;return parseInt(m[1],m[2].toLowerCase()==="b"?2:16)}
function enumFor(values:string[]|undefined,n:number){if(!values)return undefined;for(const line of values){const token=line.split(/[：: ]/,1)[0];const range=token.split(/[–-]/);if(range.length===1){const x=parseCodePart(range[0]);if(x===n)return line}else{const a=parseCodePart(range[0]),b=parseCodePart(range[1]);if(a!==null&&b!==null&&n>=a&&n<=b)return line}}return undefined}
function dynamicFieldMeaning(field:FieldDef,n:number,raw:number){if(field.name==='AutoCommissioning')return !(raw&64)?'SteppedConfigOnly=0：regular 和 hot 均支持，本字段不限制能力':['00b：只保证基本分步配置','01b：额外支持 regular 自动重配置（ApplyDPInit）','10b：额外支持 hot 重配置（ApplyImmediate）','11b：Reserved'][n];if(field.name.includes('AppSelCodeLane'))return n===0?'未使用 Lane；DataPathID 和 ExplicitControl 被忽略':`AppSel ${n}：必须对应模块已广告的描述符`;
 if(field.name.includes('DataPathIDLane'))return raw>>4===0?'AppSel=0：此字段被忽略':`编码 ${n} → 本 Bank 最低 Host Lane ${n+1}；同一 Data Path 各 Lane 一致`;
 if(field.name.includes('ExplicitControlLane')&&raw>>4===0)return 'AppSel=0：EC 不参与配置，字段被忽略';
 const listed=enumFor(field.values,n);if(listed)return listed;const signed=n>127?n-256:n;
 if(field.name==="BaseLengthSMF"){const mult=[.1,1,10][raw>>6];return raw>>6===3?`基础值 ${n}；扩展倍率需结合 01h:137.7–6`:`${n} × ${mult} km = ${n*(mult||0)} km`}
 if(["LengthOM5","LengthOM4","LengthOM3"].includes(field.name))return n===0?"00h：该光纤类型不支持/未声明":`${n} × 2 m = ${n*2} m`;
 if(field.name==="LengthOM2")return n===0?"00h：OM2 不支持/未声明":`${n} × 1 m = ${n} m`;
 if(field.name==="ModSelWaitTimeExponent"||field.name==="ModSelWaitTimeMantissa"){const e=raw>>5,m=raw&31;return m===0?`e=${e}，m=0：无等待时间数据`:`e=${e}，m=${m}：ModSelWaitTime=${m}×2^${e}=${m*(2**e)} μs`}
 if(field.name==="ModuleTempMax"||field.name==="ModuleTempMin")return `${signed} °C（S8=${n}）`;
 if(field.name==="OperatingVoltageMin")return n===0?"00h：未指定最低工作电压":`${n} × 20 mV = ${(n*.02).toFixed(2)} V`;
 if(field.name==="CDRPowerSavedPerLane")return `${n} × 0.01 W = ${(n*.01).toFixed(2)} W / Lane`;
 if(field.name==="CdbReadWriteLengthExtension")return `EPL 最大 ${8*(1+n)} B；LPL 最大 ${8*(1+Math.min(n,15))} B`;
 if(field.name==="CdbExtMaxBusyTime")return `X=${n}：扩展最大 Busy Time=${Math.max(1,n)*160} ms（仅 Method=1 有效）`;
 if(field.name==="CdbMaxBusyTime")return `X=${n}：最大 Busy Time=${80-Math.min(80,n)} ms（仅 Method=0 有效）`;
 if(field.name==="MaxDurationBPC")return `i=${n}：最大切页 hold-off=tBPC / ${2**n}`;
 if(field.name==="NADBanksSupported")return n===0?"不支持 Normalized Application Descriptor":`${n} 个 Page 1Ch Bank；最多 ${n*15} 个 NAD`;
 if(/^(VendorName|VendorPN|VendorRev|VendorSN|DateCode|CLEICode)Byte|^DateCode/.test(field.name)){const c=n===0?'NUL / 未指定':n===0x20?'ASCII 空格（20h，常用于右侧填充）':n>=0x20&&n<=0x7e?`ASCII “${String.fromCharCode(n)}”`:'非可打印 ASCII';return `${c}；当前字节仍需与同一区域其余字节拼接。`}
 if(field.name.startsWith('VendorOUIByte'))return `OUI 八位组 ${field.name.slice(-1)} = ${n.toString(16).padStart(2,'0').toUpperCase()}h；需要合并 145–147 才得到 24-bit Company ID。`;
 if(field.name==="MaxPower")return `${n} × 0.25 W = ${(n*.25).toFixed(2)} W（向上取整的最坏最大功耗声明）`;
 if(field.name.startsWith('AttenuationAt'))return n===0?'0 dB 编码：该衰减特性不可用、无关或未知':`${n} dB（U8，1 dB/LSB）`;
 if(field.name==="BaseLength"){if(raw===0xff)return 'FFh：线缆长度大于 6300 m';const mult=[.1,1,10,100][raw>>6];return n===0?'基础值 0：链路长度未定义':`${n} × ${mult} m = ${n*mult} m`}
 if(field.name==="MciFlowControlDuration"){const speedDependent=Boolean(raw&0x80);return speedDependent?`参数 ${n}：D=${(n*.2).toFixed(1)} μs；dummy byte 数还需结合 Lower:27 的 SPI 速度计算`:`参数 ${n}：N=2+${n}=${n+2} 个 dummy bytes`}
 if(field.level==="Reserved"||field.name==="Reserved")return n===0?"Reserved = 0，符合要求":`Reserved 字段为非零值 ${n}，不得解释为功能`;
 return `${field.meaning} 当前字段值=${n}。`}
function genericFieldRows(fields:FieldDef[],raw:number):BitMeaning[]{return fields.map(field=>{const w=bitWindow(field.bits);if(!w)return{bits:field.bits,name:field.name,access:field.access,level:field.level,meaning:`${field.meaning} 这是多字节/跨字节字段；当前仅显示所选原始字节 ${hex8(raw)}。`,value:hex8(raw)};const n=(raw>>w.low)&((1<<w.width)-1);const shown=w.width===1?`${n}b`:`${n.toString(2).padStart(w.width,"0")}b / ${n.toString(16).toUpperCase()}h`;return{bits:field.bits,name:field.name,access:field.access,level:field.level,meaning:dynamicFieldMeaning(field,n,raw),value:shown}})}
function codeRow(items:SffCode[],value:number,name:string,source:string):BitMeaning[]{const item=lookup(items,value);return[{bits:"7–0",name,access:"RO",level:"强制",meaning:item?`${item.name}${item.lanes?` · ${item.lanes} Lane`:""}${item.modulation?` · ${item.modulation}`:""}`:`未在 ${source} 的标准枚举项中命中；请检查 Reserved/Custom 范围`,value:hex8(value)}]}
function bitMeanings(page:PageDef,offset:number,value:number,mediaType=2):BitMeaning[]{
 const fs=fieldsAt(page,offset);if(fs.length&&fs.every(f=>f.note?.startsWith('逐位核对')))return genericFieldRows(fs,value);const mk=(bits:string,name:string,access:string,level:Requirement,meaning:string,val:number)=>({bits,name,access,level,meaning,value:String(val)});
 if((page.page==="Lower"&&offset===0)||(page.page==="00h"&&offset===128))return codeRow(identifiers,value,"SFF8024Identifier","SFF-8024 Table 4-1");
 if(page.page==="00h"&&offset===203)return codeRow(connectors,value,"ConnectorType","SFF-8024 Table 4-3");
 if(page.page==="Lower"&&offset===85)return codeRow(mediaTypes,value,"MediaType","CMIS Table 8-20");
 if(page.page==="Lower"&&offset>=86&&offset<=117){const app=Math.floor((offset-86)/4)+1,pos=(offset-86)%4;if(pos===0)return codeRow(hostInterfaces,value,`HostInterfaceIDApp${app}`,"SFF-8024 Table 4-5");if(pos===1)return codeRow(mediaInterfacesByType[mediaType]||[],`MediaInterfaceIDApp${app}`,`SFF-8024 Media Table selected by MediaType ${hex8(mediaType)}`);if(pos===2)return[mk("7–4",`HostLaneCountApp${app}`,"RO","强制",value>>4>8?"Reserved：9h–Fh 不表示 Lane 数":value>>4?`${value>>4} 条 Host Lane`:"0h：Lane 数由 HostInterfaceID 隐含",value>>4),mk("3–0",`MediaLaneCountApp${app}`,"RO","强制",(value&15)>8?"Reserved：9h–Fh 不表示 Lane 数":value&15?`${value&15} 条 Media Lane`:"0h：Lane 数由 MediaInterfaceID 隐含",value&15)];return laneBits(`HostLaneAssignmentOptionsApp${app}`,"RO","强制","1b：可从该 Host Lane 开始",value)}
 if(page.page==="01h"&&offset>=176&&offset<=190)return laneBits(`MediaLaneAssignmentOptionsApp${offset-175}`,"RO","强制","1b：可从该 Media Lane 开始",value);
 if(page.page==="01h"&&offset>=223&&offset<=250){const app=Math.floor((offset-223)/4)+9,pos=(offset-223)%4;if(pos===0)return codeRow(hostInterfaces,value,`HostInterfaceIDApp${app}`,"SFF-8024 Table 4-5");if(pos===1)return codeRow(mediaInterfacesByType[mediaType]||[],`MediaInterfaceIDApp${app}`,`SFF-8024 Media Table selected by MediaType ${hex8(mediaType)}`);if(pos===2)return[mk("7–4",`HostLaneCountApp${app}`,"RO","条件强制",value>>4>8?"Reserved：9h–Fh 不表示 Lane 数":value>>4?`${value>>4} 条 Host Lane`:"0h：由 HostInterfaceID 隐含",value>>4),mk("3–0",`MediaLaneCountApp${app}`,"RO","条件强制",(value&15)>8?"Reserved：9h–Fh 不表示 Lane 数":value&15?`${value&15} 条 Media Lane`:"0h：由 MediaInterfaceID 隐含",value&15)];return laneBits(`HostLaneAssignmentOptionsApp${app}`,"RO","条件强制","1b：可从该 Host Lane 开始",value)}
 if(page.page==="10h"&&[128,129,130,131,132,134,137,138,139,143,144,153,160,161,176,177].includes(offset)){const name=fs[0]?.name||selectedRange(page,offset).label;return laneBits(compactFieldName(name,offset),fs[0]?.access||"RW",fs[0]?.level||"条件强制",fs[0]?.meaning||selectedRange(page,offset).summary,value)}
 if(page.page==="10h"&&offset>=145&&offset<=152)return[mk("7–4",`AppSelCode · Lane ${offset-144}`,"RW","强制",`选择模块广告中的第 ${value>>4} 个 Application Descriptor`,value>>4),mk("3–1","DataPathID","RW","强制",`Data Path 最低 Host Lane 索引 = ${((value>>1)&7)+1}`,(value>>1)&7),mk("0","ExplicitControl","RW","强制",value&1?"使用显式 Signal Integrity 控制":"使用模块默认 Signal Integrity 控制",value&1)];
 if(page.page==="11h"&&offset>=128&&offset<=131){const l1=(offset-128)*2+1,l2=l1+1;return[mk("7–4",`DPState Host Lane ${l2}`,"RO","强制",dpStateName(value>>4),value>>4),mk("3–0",`DPState Host Lane ${l1}`,"RO","强制",dpStateName(value&15),value&15)]}
 if(page.page==="11h"&&[132,133,153,235].includes(offset)){const name=fs[0]?.name||selectedRange(page,offset).label;return laneBits(compactFieldName(name,offset),"RO",fs[0]?.level||"强制",fs[0]?.meaning||selectedRange(page,offset).summary,value)}
 if(page.page==="11h"&&offset>=202&&offset<=205){const l1=(offset-202)*2+1,l2=l1+1;return[mk("7–4",`ConfigStatus Lane ${l2}`,"RO","强制",configStatusName(value>>4),value>>4),mk("3–0",`ConfigStatus Lane ${l1}`,"RO","强制",configStatusName(value&15),value&15)]}
 if(fs.length)return genericFieldRows(fs,value);
 const g=selectedRange(page,offset);return[{bits:"7–0",name:g.label,access:g.access,level:g.level,meaning:g.summary,value:String(value)}];
}
function valueAnalysis(page:PageDef,offset:number,value:number,rows:BitMeaning[]){
 const lines:string[]=[];const rw=rows.some(x=>/RW|WO|RWW/.test(x.access));const currentGroup=selectedRange(page,offset);
 if(page.page==="10h"&&offset===128){const ones=Array.from({length:8},(_,i)=>value&(1<<i)?i+1:0).filter(Boolean);lines.push(`写入后请求去初始化的 Host Lane：${ones.join("、")||"无"}`);lines.push(`其余 Lane 请求初始化；同一 Data Path 的相关 Lane 必须保持一致。`)}
 else if(page.page==="10h"&&offset===130){const ones=Array.from({length:8},(_,i)=>value&(1<<i)?i+1:0).filter(Boolean);lines.push(`被禁用的 Media Tx Lane：${ones.join("、")||"无"}`);lines.push(`值 00h 允许全部 Tx 输出；FFh 禁用全部 Tx 输出。`)}
 else if(page.page==="10h"&&offset===143){const ones=Array.from({length:8},(_,i)=>value&(1<<i)?i+1:0).filter(Boolean);lines.push(`触发 ApplyDPInit 的 Host Lane：${ones.join("、")||"无"}`);lines.push(`该字节必须使用单字节 WRITE；位图应覆盖完整 Data Path。`)}
 else if(page.page==="Lower"&&offset===126)lines.push(`BankSelect = ${value}；切换 Bank 时应与 PageSelect 在同一 WRITE 事务写入。`);
 else if(page.page==="Lower"&&offset===127)lines.push(`PageSelect = ${value.toString(16).padStart(2,"0").toUpperCase()}h；Upper Memory 将映射到该 Page。`);
 else if(page.page==="9Fh"&&offset>=128&&offset<=135)lines.push(`这是 CDB 头部字节；多字节字段需与相邻字节合并后按字段规定解释。`);
 else if(page.page==="00h"&&offset>=129&&offset<=199){const ascii=value===0?'NUL':value>=32&&value<=126?`“${String.fromCharCode(value)}”`:'不可打印字符';lines.push(`当前原始字节 ${hex8(value)} 按 ASCII 为 ${ascii}；完整文本必须拼接整个字段范围。`);lines.push(`这是只读静态身份信息，值变化会改变主机看到的厂商/型号/序列号/日期等信息，但不是实时控制命令。`)}
 else if(page.page==="00h"&&offset>=200&&offset<=213){lines.push(...rows.map(x=>`Bit ${x.bits} · ${x.name}: ${x.meaning}`));lines.push(`这是只读静态特性声明。主机可将它用于功耗准入、连接器/介质识别、Lane/拓扑或管理事务决策；它本身不直接执行控制。`)}
 else if(page.page==="00h"&&offset===222){lines.push(`需要读取 00h:128–221，计算全部字节算术和的低 8 bit，再与 ${hex8(value)} 比较。`);lines.push(`Checksum 只验证覆盖区的一致性，不定义 223–255 Custom 区的内容。`)}
 else if(currentGroup.label.toLowerCase().includes("custom")){const ascii=value>=32&&value<=126?String.fromCharCode(value):"不可打印";lines.push(`原始值：${hex8(value)} / ${value} / ${value.toString(2).padStart(8,"0")}b / ASCII ${ascii}`);lines.push(currentGroup.summary);lines.push(`CMIS 只规定该 Custom 区的地址边界与页面上下文；没有厂商字段表时，不把 Bit 自动解释成功能声明。`)}
 else lines.push(...rows.map(x=>`Bit ${x.bits} · ${x.name}: ${x.meaning}`));
 lines.unshift(rw?"该位置含可写字段：下列解释表示写入后的请求/控制含义。":"该位置为只读或状态字段：输入值用于解释读回内容，不能据此执行写入。");return lines;
}
function RegisterMapStudio({onRef,initialPage,initialOffset=0,initialHex="00",initialBank=0,initialMediaType=2}:{onRef:(id:string)=>void;initialPage?:string;initialOffset?:number;initialHex?:string;initialBank?:number;initialMediaType?:number}){
 const initial=pageDetails.find(p=>p.page===initialPage)||pageDetails[0];
 const [pageId,setPageId]=useState(initial.id),[offset,setOffset]=useState(Math.max(initial.page==="Lower"?0:128,Math.min(initial.page==="Lower"?127:255,initialOffset))),[hex,setHex]=useState(/^[0-9a-f]{1,2}$/i.test(initialHex)?initialHex.toUpperCase():"00"),[bank,setBank]=useState(Math.max(0,Math.min(initial.page==="9Fh"?1:initial.page==="1Ch"?15:3,initialBank))),[mediaType,setMediaType]=useState(Number.isInteger(initialMediaType)&&initialMediaType>=0&&initialMediaType<=255?initialMediaType:2);const page=pageDetails.find(x=>x.id===pageId)||pageDetails[0];const base=page.page==="Lower"?0:128;const value=Math.max(0,Math.min(255,parseInt(hex||"0",16)||0));const group=selectedRange(page,offset);const fs=fieldsAt(page,offset);const rows=bitMeanings(page,offset,value,mediaType);const analysis=valueAnalysis(page,offset,value,rows);
 useEffect(()=>{const u=registerHref(page.page+':'+offset)+'?value='+hex+'&bank='+bank+'&media='+mediaType;window.history.replaceState({},'',u)},[page.page,offset,hex,bank,mediaType]);
 const choosePage=(id:string)=>{const p=pageDetails.find(x=>x.id===id)||pageDetails[0];setPageId(id);setOffset(p.page==="Lower"?0:128);setHex("00")};
 const toggle=(bit:number)=>setHex((value^(1<<bit)).toString(16).padStart(2,"0").toUpperCase());
 const mediaContextNeeded=(page.page==="Lower"&&offset>=87&&offset<=115&&(offset-87)%4===0)||(page.page==="01h"&&offset>=224&&offset<=248&&(offset-224)%4===0);
 return <><PageIntro kicker="REGISTER MEMORY SHEET" title="逐字节、逐位寄存器地图" desc="每个格子对应一个实际 Offset。点击后查看字段表，并输入或点击 Bit 组合，直接解释该值代表的状态、请求或控制动作。"><div className="summary-pill"><b>16×8</b><span>每 Page 固定字节表</span></div></PageIntro><section className="map-toolbar"><label>Page<select value={pageId} onChange={e=>choosePage(e.target.value)}>{pageDetails.map(x=><option value={x.id} key={x.id}>{x.page} · {x.title}</option>)}</select></label>{!page.bank.includes("非")&&page.bank.includes("Bank")&&<label>Bank<input type="number" min="0" max={page.page==="1Ch"?15:page.category==="CDB"?1:3} value={bank} onChange={e=>setBank(Math.max(0,Math.min(page.page==="1Ch"?15:page.category==="CDB"?1:3,Number(e.target.value))))}/></label>}{mediaContextNeeded&&<label>MediaType<select value={mediaType} onChange={e=>setMediaType(Number(e.target.value))}>{mediaTypes.slice(0,6).map(x=><option value={x.code} key={x.code}>{hex8(x.code)} · {x.name}</option>)}</select></label>}<div><span>访问</span><b>{page.access}</b></div><div><span>页面要求</span><Badge level={page.level}/></div><div><span>协议位置</span><code>{page.ref}</code></div></section><RegisterRelations page={page.page} offset={offset}/><section className="byte-sheet-wrap"><div className="byte-sheet"><div className="sheet-corner">{page.page}<small>{page.page==="Lower"?"LOW":"UPPER"}</small></div>{Array.from({length:16},(_,i)=><div className="sheet-col" key={i}>{i.toString(16).toUpperCase()}</div>)}{Array.from({length:8},(_,row)=><div className="sheet-row-fragment" key={row}><div className="sheet-row">{((base>>4)+row).toString(16).toUpperCase()}</div>{Array.from({length:16},(_,col)=>{const n=base+row*16+col,g=selectedRange(page,n),fields=fieldsAt(page,n),label=fields[0]?compactFieldName(fields[0].name,n):g.label,tone=toneFor(label,g.access);return <button className={`byte-cell tone-${tone} ${n===offset?"active":""}`} key={n} onClick={()=>{setOffset(n);setHex("00")}} title={`${page.page}:${n} · ${label}`}><span>{n}</span><b>{label}</b><small>{g.access}</small></button>})}</div>)}</div><div className="map-legend">{[["base","基础/信息"],["status","状态"],["control","控制/配置"],["flag","Flag/Mask"],["monitor","监控/阈值"],["app","Application"],["cdb","CDB"],["reserved","Reserved"],["custom","Custom"]].map(x=><span key={x[0]}><i className={`tone-${x[0]}`}/>{x[1]}</span>)}</div></section><section className="byte-detail"><article><div className="detail-address"><div><span>当前地址</span><h2>{page.page}:{offset} <small>0x{offset.toString(16).padStart(2,"0").toUpperCase()}</small></h2><p>Bank {bank} · {group.label} · {group.access}</p></div><Badge level={group.level}/></div><div className="field-definition"><h3>Bit 字段定义</h3><div className="bit-strip">{Array.from({length:8},(_,i)=>7-i).map(bit=>{const f=rows.find(x=>{const w=bitWindow(x.bits);return w&&bit>=w.low&&bit<=w.high});return <button key={bit} onClick={()=>toggle(bit)} title={f?.name||'未展开'}><small>Bit {bit}</small><b>{(value>>bit)&1}</b><span>{f?.name||'未展开'}</span></button>})}</div><div className="bit-table"><div className="bit-row head"><span>Bit</span><span>字段</span><span>访问</span><span>当前值</span><span>含义</span></div>{rows.map((x,i)=><div className="bit-row" key={`${x.bits}${x.name}${i}`}><code>{x.bits}</code><b>{x.name}</b><span>{x.access}</span><code>{x.value}</code><p>{x.meaning}</p></div>)}</div>{fs.length>0&&<details className="field-rules"><summary>字段规定、全部取值与协议来源</summary>{fs.map((f,i)=><div key={i}><b>{f.name} · Bit {f.bits}</b><p><AddressText text={f.meaning}/></p>{f.values&&<ul>{f.values.map(v=><li key={v}>{v}</li>)}</ul>}<small><AddressText text={f.note||page.ref}/></small></div>)}</details>}{!fs.length&&<p className="range-disclosure">当前字节已按协议地址范围定位，尚未拆成独立命名 Bit；表中只显示规范对该范围的整体规定。</p>}</div></article><aside className="value-decoder"><span>WRITE / READ VALUE DECODER</span><h2>数值含义解析</h2><label>十六进制值<div><b>0x</b><input value={hex} maxLength={2} onChange={e=>setHex(e.target.value.replace(/[^0-9a-f]/gi,"").toUpperCase())}/></div></label><div className="value-formats"><p><span>十进制</span><b>{value}</b></p><p><span>二进制</span><code>{value.toString(2).padStart(8,"0")}</code></p></div><div className="bit-switches">{Array.from({length:8},(_,i)=>7-i).map(bit=><button className={value&(1<<bit)?"on":""} onClick={()=>toggle(bit)} key={bit}><span>Bit {bit}</span><b>{value&(1<<bit)?1:0}</b></button>)}</div><MultiByteValue key={`${page.page}:${offset}`} page={page.page} offset={offset} value={value}/><div className="analysis-result"><b>值 0x{value.toString(16).padStart(2,"0").toUpperCase()} 的解释</b>{analysis.map((x,i)=><p key={`${x}${i}`}>{i===0?<i>i</i>:<i>→</i>}{x}</p>)}</div><button className="secondary" onClick={()=>onRef((page.page==="Lower"&&offset===0)||(page.page==="00h"&&[128,203].includes(offset))?"sff":page.category==="CDB"?"cdb":"memory")}>查看协议依据</button></aside></section></>;
}

type BuilderTab="descriptor"|"advertisements"|"dpconfig"|"bitmap"|"codes"|"custom";
function byteList(text:string){const items=text.trim().split(/[\s,;:-]+/).filter(Boolean);if(!items.length||items.some(x=>! /^(?:0x)?[0-9a-f]{1,2}h?$/i.test(x)))return [];return items.map(x=>parseInt(x.replace(/^0x/i,"").replace(/h$/i,""),16))}
function startLanes(mask:number){return Array.from({length:8},(_,i)=>mask&(1<<i)?i+1:0).filter(Boolean)}
function CodeSelect({items,value,onChange}:{items:SffCode[];value:number;onChange:(value:number)=>void}){return <select value={value} onChange={e=>onChange(Number(e.target.value))}>{items.map(x=><option key={`${x.code}${x.name}`} value={x.code}>{hex8(x.code)} · {x.name}{x.lanes?` · ${x.lanes}L`:""}</option>)}</select>}

const advertisementBytes=[
 {offset:142,label:"Supported Pages",table:"Table 8-46"},{offset:143,label:"ModSel Durations",table:"Table 8-47"},{offset:144,label:"DP Init / Deinit Durations",table:"Tables 8-47/48"},
 {offset:145,label:"Module Characteristics",table:"Table 8-49"},{offset:151,label:"Detector / Rx / Disable",table:"Table 8-49"},{offset:153,label:"SI Limits · Tx",table:"Table 8-49"},{offset:154,label:"SI Limits · Rx",table:"Table 8-49"},
 {offset:155,label:"Tx Controls",table:"Table 8-50"},{offset:156,label:"Rx Controls",table:"Table 8-50"},{offset:157,label:"Tx Flags",table:"Table 8-51"},{offset:158,label:"Rx Flags",table:"Table 8-51"},
 {offset:159,label:"Module Monitors",table:"Table 8-52"},{offset:160,label:"Lane Monitors",table:"Table 8-52"},{offset:161,label:"Tx SI",table:"Table 8-53"},{offset:162,label:"Rx SI / SCS / VCS",table:"Table 8-53"},
 {offset:163,label:"CDB Capacity",table:"Table 8-54"},{offset:164,label:"CDB Access Length",table:"Table 8-54"},{offset:165,label:"CDB Trigger / Busy",table:"Table 8-54"},{offset:166,label:"CDB Busy Method",table:"Table 8-54"},
 {offset:167,label:"Module Power Durations",table:"Table 8-56"},{offset:168,label:"Tx Turn Durations",table:"Table 8-56"},{offset:169,label:"Page / Bank Change",table:"Table 8-56"},{offset:175,label:"NAD Support",table:"Table 8-57"},
 {offset:251,label:"Miscellaneous",table:"Table 8-60"},{offset:252,label:"Lane Switching / LT",table:"Table 8-60"},
];

function AdvertisementPanel({onRef}:{onRef:(id:string)=>void}){
 const [offset,setOffset]=useState(142),[hex,setHex]=useState("00");const page=pageDetails.find(x=>x.page==="01h")!;const value=Math.max(0,Math.min(255,parseInt(hex||"0",16)||0));const choice=advertisementBytes.find(x=>x.offset===offset)!;const rows=bitMeanings(page,offset,value);const toggle=(bit:number)=>setHex((value^(1<<bit)).toString(16).padStart(2,"0").toUpperCase());
 return <section className="builder-grid advertisement-builder"><article className="builder-form"><h2>选择能力声明 Byte</h2><label className="full-label">Page 01h 静态广告<select value={offset} onChange={e=>{setOffset(Number(e.target.value));setHex("00")}}>{advertisementBytes.map(x=><option value={x.offset} key={x.offset}>01h:{x.offset} · {x.label} · {x.table}</option>)}</select></label><div className="advertisement-note"><b>模块广告 · RO / Static</b><p>这是模块声明值，不是主机控制写入。置位只在对应功能适用时建立配套要求；Reserved 位应保持 0。</p></div><label className="full-label">整个 Byte 的读回值<div className="inline-hex"><b>0x</b><input value={hex} maxLength={2} onChange={e=>setHex(e.target.value.replace(/[^0-9a-f]/gi,"").toUpperCase())}/></div></label><div className="bit-switches capability-switches">{Array.from({length:8},(_,i)=>7-i).map(bit=><button className={value&(1<<bit)?"on":""} onClick={()=>toggle(bit)} key={bit}><span>Bit {bit}</span><b>{value&(1<<bit)?1:0}</b></button>)}</div><div className="field-equation"><code>{value.toString(2).padStart(8,"0")}b</code><b>{hex8(value)}</b></div><button className="source-button" onClick={()=>onRef("advertising")}>打开 {choice.table} 协议依据 →</button></article><article className="builder-output"><div className="output-head"><span>01h:{offset} · {choice.label}</span><code>{hex8(value)}</code></div><div className="bit-table"><div className="bit-row head"><span>Bit</span><span>字段</span><span>访问</span><span>当前值</span><span>当前值的准确含义</span></div>{rows.map((x,i)=><div className="bit-row" key={`${x.bits}${x.name}${i}`}><code>{x.bits}</code><b>{x.name}</b><span>{x.access}</span><code>{x.value}</code><p>{x.meaning}</p></div>)}</div><div className="analysis-result"><b>改变值后的解释规则</b>{valueAnalysis(page,offset,value,rows).map((x,i)=><p key={`${x}${i}`}><i>{i?"→":"i"}</i>{x}</p>)}</div></article></section>;
}

type CodeBand={from:number;to:number;label:string;kind:"standard"|"reserved"|"custom"|"lookup"};
type CustomArea={kind:"memory"|"encoding"|"page";title:string;location:string;access:string;persistence:string;checksum:string;scope:string;rule:string;mask?:number;shift?:number;bands?:CodeBand[]};
const customAreas:CustomArea[]=[
 {kind:"memory",title:"Custom Management / PCIe 协调区",location:"Lower:64–84",access:"Mixed · 始终可见",persistence:"由厂商字段定义",checksum:"无 Page Checksum",scope:"全模块",rule:"CMIS 不定义内部字段。PCI-SIG 已协调该区用于 PCIe Application 专用能力；其余用途需厂商字段表。"},
 {kind:"memory",title:"Custom Static Information",location:"00h:221",access:"RO · 非 Banked",persistence:"静态",checksum:"计入 00h:222 Page Checksum",scope:"全模块",rule:"一个厂商自定义静态信息字节；CMIS 只定义位置和校验覆盖。"},
 {kind:"memory",title:"Custom Non-volatile Information",location:"00h:223–255",access:"Vendor-defined · 非 Banked",persistence:"Non-volatile",checksum:"不计入 00h:222 Page Checksum",scope:"全模块",rule:"非易失厂商区；字节格式、写保护与提交语义均需厂商说明。"},
 {kind:"memory",title:"Custom Static Advertisement",location:"01h:191–222",access:"RO · 非 Banked",persistence:"Static",checksum:"计入 01h:255 Page Checksum",scope:"全模块",rule:"用于厂商静态能力广告；CMIS 不分配 Bit。应用描述符从 223 开始，不能与本区混淆。"},
 {kind:"memory",title:"Custom Dynamic Thresholds",location:"02h:230–254",access:"RO · 非 Banked",persistence:"可随 commissioned Applications 变化",checksum:"计入 02h:255 Page Checksum",scope:"当前模块/Application 上下文",rule:"厂商动态阈值区；变化时应与该 Page 的校验和和已 commissioned Application 保持一致。"},
 {kind:"memory",title:"Custom Banked Controls",location:"10h:240–255",access:"RW · Banked",persistence:"控制值，复位行为需厂商定义",checksum:"无 Page Checksum",scope:"每 Bank / 每 8 Lane",rule:"厂商控制区。写值可能触发硬件动作，未取得厂商访问规则前不应试写。"},
 {kind:"memory",title:"Custom Banked Diagnostics",location:"13h:196–205",access:"RO · Banked",persistence:"动态诊断值",checksum:"无 Page Checksum",scope:"每 Bank / 每 8 Lane",rule:"厂商诊断读回区；单位、缩放、有效条件和告警含义均由厂商定义。"},
 {kind:"memory",title:"Custom Selector Context",location:"14h:130–131",access:"RW / RO · 非 Banked",persistence:"选择器上下文",checksum:"无 Page Checksum",scope:"当前诊断选择",rule:"配合 DiagnosticsSelector 使用的厂商上下文字节；必须按厂商定义建立多字节选择上下文。"},
 {kind:"encoding",title:"MediaType Custom",location:"Lower:85 [7–0]",access:"RO",persistence:"Static",checksum:"不适用",scope:"Media Interface ID 枚举表选择",rule:"40h–8Fh 选择厂商自定义 MediaType；后续 MediaInterfaceID 必须按同一厂商表解释。",bands:[{from:0x00,to:0x05,label:"CMIS-defined MediaType",kind:"standard"},{from:0x06,to:0x3F,label:"Reserved",kind:"reserved"},{from:0x40,to:0x8F,label:"Custom",kind:"custom"},{from:0x90,to:0xFF,label:"Reserved",kind:"reserved"}]},
 {kind:"encoding",title:"Host Interface ID Custom",location:"Application Descriptor Byte 1",access:"RO",persistence:"Static advertisement",checksum:"随所在 Page",scope:"每个 Application Descriptor",rule:"C0h–FEh 为 Custom Host Electrical Interface ID；FFh 在描述符列表中具有终止语义，不能当作 Custom。",bands:[{from:0x00,to:0xBF,label:"逐项查 SFF-8024 Table 4-5",kind:"lookup"},{from:0xC0,to:0xFE,label:"Custom",kind:"custom"},{from:0xFF,to:0xFF,label:"End-of-list / Undefined sentinel",kind:"reserved"}]},
 {kind:"encoding",title:"Media Interface ID Custom",location:"Application Descriptor Byte 2",access:"RO",persistence:"Static advertisement",checksum:"随所在 Page",scope:"由 MediaType 选择的枚举表",rule:"C0h–FFh 是所选 MediaType 表内的 Custom 编码；同一数值在不同 MediaType 下不能交叉解释。",bands:[{from:0x00,to:0xBF,label:"逐项查当前 MediaType 对应的 SFF-8024 表",kind:"lookup"},{from:0xC0,to:0xFF,label:"Custom",kind:"custom"}]},
 {kind:"encoding",title:"Aux1 Custom Observable 声明",location:"01h:145 [0]",access:"RO",persistence:"Static capability",checksum:"计入 01h checksum",scope:"Aux1 Monitor 的被测量",rule:"Bit 0=0 声明 Aux1 是 Custom observable；数值单位、缩放和物理对象由厂商定义。Bit 0=1 声明标准 TEC Current。",mask:0x01,bands:[{from:0,to:0,label:"Custom Aux1 observable",kind:"custom"},{from:1,to:1,label:"TEC Current",kind:"standard"}]},
 {kind:"encoding",title:"Custom Monitor 支持声明",location:"01h:159 [5]",access:"RO",persistence:"Static capability",checksum:"计入 01h checksum",scope:"模块 Custom Monitor 能力",rule:"Bit 5=1 只声明支持 Custom Monitor；其位置配套、单位、缩放和阈值语义仍需厂商字段表。",mask:0x01,shift:5,bands:[{from:0,to:0,label:"Custom Monitor not supported",kind:"standard"},{from:1,to:1,label:"Custom Monitor supported",kind:"custom"}]},
 {kind:"encoding",title:"Tx Input EQ Custom",location:"01h:153 [3–0]",access:"RO",persistence:"Static capability",checksum:"计入 01h checksum",scope:"最大支持代码",rule:"Dh–Fh 为 Custom；若声明这些值，其 dB、算法和对应控制编码必须由厂商文档给出。",mask:0x0F,bands:[{from:0,to:12,label:"Standard · 0–12 dB",kind:"standard"},{from:13,to:15,label:"Custom",kind:"custom"}]},
 {kind:"encoding",title:"Rx Output EQ Custom",location:"01h:154 [7–4] / [3–0]",access:"RO",persistence:"Static capability",checksum:"计入 01h checksum",scope:"Pre/Post-cursor 最大代码",rule:"Bh–Fh 为 Custom；8h–Ah 是 Reserved，不能当作厂商扩展。",mask:0x0F,bands:[{from:0,to:7,label:"Standard",kind:"standard"},{from:8,to:10,label:"Reserved",kind:"reserved"},{from:11,to:15,label:"Custom",kind:"custom"}]},
 {kind:"encoding",title:"Rx Output Amplitude Custom",location:"Rx Output Amplitude control field [3–0]",access:"RW / advertisement dependent",persistence:"控制值",checksum:"不适用",scope:"每 Lane",rule:"Fh 为 Custom；4h–Eh 是 Reserved。只有模块厂商明示支持时，Fh 才有可执行含义。",mask:0x0F,bands:[{from:0,to:3,label:"Standard",kind:"standard"},{from:4,to:14,label:"Reserved",kind:"reserved"},{from:15,to:15,label:"Custom",kind:"custom"}]},
 {kind:"encoding",title:"ConfigStatus Custom Reject",location:"11h:202–205 · 每 Lane 4 bit",access:"RO",persistence:"最近配置结果",checksum:"不适用",scope:"每 Host Lane",rule:"Dh–Fh 是 Custom rejection code；具体拒绝原因需厂商文档。",mask:0x0F,bands:[{from:0,to:7,label:"CMIS-defined status",kind:"standard"},{from:8,to:11,label:"Reserved",kind:"reserved"},{from:12,to:12,label:"ConfigInProgress",kind:"standard"},{from:13,to:15,label:"Custom rejection",kind:"custom"}]},
 {kind:"encoding",title:"DiagnosticsSelector Custom",location:"14h:128 [7–0]",access:"RW",persistence:"当前选择",checksum:"不适用",scope:"Page 14h:192–255 诊断窗口",rule:"C0h–FFh 选择 Custom diagnostics；选中后 192–255 的布局和单位由厂商定义。",bands:[{from:0,to:0xBF,label:"逐项查 CMIS Table 8-126",kind:"lookup"},{from:0xC0,to:0xFF,label:"Custom diagnostics",kind:"custom"}]},
 {kind:"page",title:"Custom Pages 1Eh–1Fh",location:"Page 1Eh–1Fh · Upper Memory",access:"Vendor-defined",persistence:"Vendor-defined",checksum:"Vendor-defined",scope:"Page/Bank 规则由厂商说明",rule:"整页属于 Custom；先写 PageSelect/BankSelect 后访问，页面存在性、Bank 数与内部字段均需厂商发现机制。"},
 {kind:"page",title:"Custom Pages B0h–FFh",location:"Page B0h–FFh · Upper Memory",access:"Vendor-defined",persistence:"Vendor-defined",checksum:"Vendor-defined",scope:"厂商扩展 Page 空间",rule:"CMIS 只分配地址空间，不提供通用字段定义。主机不得假设不同厂商同一 Page/Offset 含义相同。"},
];

function customClassification(area:CustomArea,raw:number){const value=(raw>>(area.shift??0))&(area.mask??0xFF);const band=area.bands?.find(x=>value>=x.from&&value<=x.to);return{value,band,label:band?.label||"厂商原始数据",kind:band?.kind||"custom"}}
function CustomBoundaryPanel({onRef}:{onRef:(id:string)=>void}){
 const [kind,setKind]=useState<CustomArea["kind"]>("memory"),[selected,setSelected]=useState(0),[raw,setRaw]=useState("00");const filtered=customAreas.filter(x=>x.kind===kind);const area=filtered[Math.min(selected,filtered.length-1)];const bytes=byteList(raw);const parsed=bytes.length?bytes:[0];const classification=customClassification(area,parsed[0]);const names:Record<CustomArea["kind"],string>={memory:"整段 Custom Memory",encoding:"标准字段中的 Custom 编码",page:"整页 Custom"};
 const fieldScope=area.shift!==undefined?`解析 Bit ${area.shift}；输入整字节 ${hex8(parsed[0])}。`:area.mask===0x0F?`只解析低 4 bit；输入整字节 ${hex8(parsed[0])}。`:"按完整 8 bit 编码归类。";
 return <section className="custom-browser"><aside className="custom-nav"><h2>Custom 定义分组</h2>{(["memory","encoding","page"] as const).map(x=><button className={kind===x?"active":""} onClick={()=>{setKind(x);setSelected(0);setRaw("00")}} key={x}>{names[x]}<span>{customAreas.filter(a=>a.kind===x).length}</span></button>)}<div className="custom-area-list">{filtered.map((x,i)=><button className={selected===i?"active":""} onClick={()=>{setSelected(i);setRaw("00")}} key={x.location}><code>{x.location}</code><b>{x.title}</b></button>)}</div></aside><article className="custom-main"><div className="custom-head"><div><span>{names[area.kind]}</span><h2>{area.title}</h2><code>{area.location}</code></div><Badge level="允许"/></div><div className="custom-meta"><div><span>访问</span><b>{area.access}</b></div><div><span>持久性</span><b>{area.persistence}</b></div><div><span>Checksum</span><b>{area.checksum}</b></div><div><span>作用域</span><b>{area.scope}</b></div></div><div className="custom-rule"><b>CMIS 规定的内容边界</b><p>{area.rule}</p></div><label className="raw-input">输入读回/拟写字节（空格分隔）<textarea value={raw} onChange={e=>setRaw(e.target.value)} spellCheck={false} placeholder="例如 C0 01 7F"/></label>{area.bands&&<div className={`classification ${classification.kind}`}><span>用于编码归类的值</span><b>{hex8(classification.value)} · {classification.label}</b><p>{fieldScope} {classification.kind==="custom"?"CMIS 确认这是 Custom 范围，但不定义该值的具体功能。":classification.kind==="reserved"?"该值为 Reserved，不应赋予自定义含义。":classification.kind==="lookup"?"该值需按指定的 CMIS/SFF-8024 枚举表逐项判断 Standard 或 Reserved。":"该值是本字段的标准定义。"}</p></div>}<div className="raw-byte-table"><div className="raw-byte-row head"><span>相对字节</span><span>Hex</span><span>Dec</span><span>Binary</span><span>ASCII</span><span>可确认含义</span></div>{parsed.map((v,i)=><div className="raw-byte-row" key={`${i}${v}`}><b>+{i}</b><code>{hex8(v)}</code><span>{v}</span><code>{v.toString(2).padStart(8,"0")}</code><span>{v>=32&&v<=126?String.fromCharCode(v):"·"}</span><p>{area.bands&&i===0?classification.label:"厂商原始字节；需厂商字段表"}</p></div>)}</div><button className="source-button" onClick={()=>onRef("custom")}>查看 CMIS Custom 边界依据 →</button></article><aside className="custom-safety"><span>值变化后的解释</span><h3>{hex8(parsed[0])}</h3><p>原始值、位形态、ASCII 与标准/Reserved/Custom 归类会随输入即时更新。</p><div><b>可由 CMIS 确认</b><ul><li>物理地址与 Page/Bank 上下文</li><li>访问类型、持久性与校验覆盖</li><li>值是否落入 Custom/Reserved 范围</li></ul></div><div className="builder-warning"><p>厂商区中的每一 Bit 只有在导入该厂商字段表后才能解释。对 RW Custom 区，未确认写入副作用前不要在真实模块上试值。</p></div></aside></section>;
}
function DeclarationBuilder({onRef}:{onRef:(id:string)=>void}){
 const [tab,setTab]=useState<BuilderTab>("descriptor");
 const [appSel,setAppSel]=useState(1),[mediaType,setMediaType]=useState(2),[hostCode,setHostCode]=useState(0x4F),[mediaCode,setMediaCode]=useState(0x1C),[hostLanes,setHostLanes]=useState(4),[mediaLanes,setMediaLanes]=useState(4),[hostMask,setHostMask]=useState(0x11),[mediaMask,setMediaMask]=useState(0x01),[reverse,setReverse]=useState("4F 1C 44 11 01");
 const [scs,setScs]=useState(0),[dpApp,setDpApp]=useState(1),[dpStart,setDpStart]=useState(1),[dpLanes,setDpLanes]=useState(4),[explicit,setExplicit]=useState(false),[dpReverse,setDpReverse]=useState("10");
 const [bitmapTarget,setBitmapTarget]=useState("10h:128 · DPDeinitLane"),[bitmap,setBitmap]=useState(0);
 const [codeKind,setCodeKind]=useState("identifier"),[codeSearch,setCodeSearch]=useState(""),[codeValue,setCodeValue]=useState(0x1E);
 const mediaItems=mediaInterfacesByType[mediaType]||[];const loc=descriptorLocation(appSel)!;const descriptor=[hostCode,mediaCode,((hostLanes&15)<<4)|(mediaLanes&15),hostMask,mediaMask];
 const decoded=byteList(reverse);const decodedValid=decoded.length===5;const dh=decoded[0]??0,dm=decoded[1]??0,dl=decoded[2]??0,dho=decoded[3]??0,dmo=decoded[4]??0;const decodedHost=lookup(hostInterfaces,dh),decodedMedia=lookup(mediaItems,dm);
 const descriptorWarnings=[hostLanes>8||mediaLanes>8?"Lane Count 9h–Fh 为 Reserved。":"",...startLanes(hostMask).filter(x=>hostLanes>0&&x+hostLanes-1>8).map(x=>`Host 起始 Lane ${x} 加 ${hostLanes} Lane 会越过本组 Lane 8。`),...startLanes(mediaMask).filter(x=>mediaLanes>0&&x+mediaLanes-1>8).map(x=>`Media 起始 Lane ${x} 加 ${mediaLanes} Lane 会越过本组 Lane 8。`)].filter(Boolean);
 const dpValid=dpStart+dpLanes-1<=8;const dpByte=((dpApp&15)<<4)|(((dpStart-1)&7)<<1)|(explicit?1:0);const dpBytes=Array.from({length:dpValid?8:0},(_,i)=>i+1>=dpStart&&i+1<dpStart+dpLanes?dpByte:0);const applyMask=dpValid?((1<<dpLanes)-1)<<(dpStart-1):0;const dpRaw=byteList(dpReverse)[0]??0;const dpReverseValid=byteList(dpReverse).length===1;
 const codeSets:Record<string,{title:string;items:SffCode[];source:string;target:string}>={identifier:{title:"Identifier",items:identifiers,source:"SFF-8024 R4.12 · Table 4-1",target:"Lower:0；镜像 00h:128"},connector:{title:"Connector Type",items:connectors,source:"SFF-8024 R4.12 · Table 4-3",target:"00h:203"},host:{title:"Host Electrical Interface ID",items:hostInterfaces,source:"SFF-8024 R4.12 · Table 4-5",target:"Application Descriptor Byte 1"},media:{title:"Media Interface ID",items:mediaItems,source:`SFF-8024 R4.12 · ${lookup(mediaTypes,mediaType)?.note||"Media table"}`,target:"Application Descriptor Byte 2"}};const codeSet=codeSets[codeKind];const shownCodes=codeSet.items.filter(x=>`${hex8(x.code)} ${x.name} ${x.family||""}`.toLowerCase().includes(codeSearch.toLowerCase()));const chosenCode=lookup(codeSet.items,codeValue);
 const tabs:[BuilderTab,string][]=[["descriptor","Application Descriptor"],["advertisements","CMIS 能力声明"],["dpconfig","DPConfig + Apply"],["bitmap","Lane 位图"],["codes","SFF-8024 枚举"],["custom","Custom 边界"]];
 return <><PageIntro kicker="FORWARD ENCODE ↔ REVERSE DECODE" title="声明生成器" desc="先选择想声明的标准、Lane 数和允许位置，再得到应写/应广告的确切字节；也可以粘贴读回值反向解析。每一行同时给出 CMIS 物理地址与字段来源。"><div className="summary-pill"><b>双向</b><span>声明 → 数值 → 反向校验</span></div></PageIntro><div className="register-relations"><a href="/mechanisms/application">Application 分配机制</a><a href="/mechanisms/explicit">ExplicitControl / SI 生效条件</a><a href="/mechanisms/control">Apply 与结果确认</a><a href="/codes/host">编码查询</a></div><div className="builder-tabs">{tabs.map(x=><button className={tab===x[0]?"active":""} onClick={()=>setTab(x[0])} key={x[0]}>{x[1]}</button>)}</div>
 {tab==="descriptor"&&<section className="builder-grid"><article className="builder-form"><h2>我要声明一个 Application</h2><div className="form-grid"><label>AppSel<select value={appSel} onChange={e=>setAppSel(Number(e.target.value))}>{Array.from({length:15},(_,i)=><option value={i+1} key={i}>AppSel {i+1}</option>)}</select></label><label>MediaType<CodeSelect items={mediaTypes.slice(0,6)} value={mediaType} onChange={v=>{setMediaType(v);const first=mediaInterfacesByType[v]?.[0];if(first)setMediaCode(first.code)}}/></label><label>Host Interface ID<CodeSelect items={hostInterfaces} value={hostCode} onChange={v=>{setHostCode(v);const item=lookup(hostInterfaces,v);if(item?.lanes&&item.lanes<=8)setHostLanes(item.lanes)}}/></label><label>Media Interface ID<CodeSelect items={mediaItems} value={mediaCode} onChange={v=>{setMediaCode(v);const item=lookup(mediaItems,v);if(item?.lanes&&item.lanes<=8)setMediaLanes(item.lanes)}}/></label><label>HostLaneCount<select value={hostLanes} onChange={e=>setHostLanes(Number(e.target.value))}>{Array.from({length:9},(_,i)=><option value={i} key={i}>{i===0?"0 · 由 Interface ID 隐含":i}</option>)}</select></label><label>MediaLaneCount<select value={mediaLanes} onChange={e=>setMediaLanes(Number(e.target.value))}>{Array.from({length:9},(_,i)=><option value={i} key={i}>{i===0?"0 · 由 Interface ID 隐含":i}</option>)}</select></label></div><div className="lane-picker"><b>Host 合法起始 Lane</b>{Array.from({length:8},(_,i)=><button className={hostMask&(1<<i)?"on":""} onClick={()=>setHostMask(hostMask^(1<<i))} key={i}>L{i+1}</button>)}</div><div className="lane-picker"><b>Media 合法起始 Lane</b>{Array.from({length:8},(_,i)=><button className={mediaMask&(1<<i)?"on":""} onClick={()=>setMediaMask(mediaMask^(1<<i))} key={i}>L{i+1}</button>)}</div>{descriptorWarnings.length>0&&<div className="builder-warning">{descriptorWarnings.map(x=><p key={x}>⚠ {x}</p>)}</div>}<button className="source-button" onClick={()=>onRef("sff")}>打开 SFF-8024 枚举依据 →</button></article><article className="builder-output"><div className="output-head"><span>生成结果</span><code>{descriptor.map(hex8).join(" ")}</code></div><div className="write-table"><div className="write-row head"><span>逻辑字节</span><span>Bit</span><span>值</span><span>物理位置</span><span>内容</span></div>{[["Byte 1","7–0",descriptor[0],loc.bytes[0],lookup(hostInterfaces,hostCode)?.name||"Undefined"],["Byte 2","7–0",descriptor[1],loc.bytes[1],lookup(mediaItems,mediaCode)?.name||"Undefined"],["Byte 3","7–4",`${hex8(descriptor[2])} · field ${hostLanes.toString(16).toUpperCase()}h`,loc.bytes[2],`HostLaneCount = ${hostLanes||"implicit"}`],["Byte 3","3–0",`${hex8(descriptor[2])} · field ${mediaLanes.toString(16).toUpperCase()}h`,loc.bytes[2],`MediaLaneCount = ${mediaLanes||"implicit"}`],["Byte 4","7–0",descriptor[3],loc.bytes[3],`Host start: ${startLanes(hostMask).join(", ")||"none"}`],["Byte 5","7–0",descriptor[4],loc.bytes[4],`Media start: ${startLanes(mediaMask).join(", ")||"none"}`]].map((x,i)=><div className="write-row" key={i}><b>{x[0]}</b><code>{x[1]}</code><code>{typeof x[2]==="number"?hex8(x[2]):x[2]}</code><span><AddressText text={String(x[3])}/></span><span>{x[4]}</span></div>)}</div><p className="split-note"><b>位置注意：</b>前四字节声明位置 {loc.first}；第五字节单独位于 {loc.media}。AppSel 是此模块内 Descriptor 顺序号，不是 SFF-8024 接口编码。</p><div className="reverse-box"><h3>反向解析 5 字节</h3><input value={reverse} onChange={e=>setReverse(e.target.value)} placeholder="例如 4F 1C 44 11 01"/>{!decodedValid?<p role="alert" className="input-error">需要恰好 5 个完整十六进制字节，每项 00–FF，以空格分隔。</p>:<ul><li>Host: {decodedHost?`${hex8(dh)} · ${decodedHost.name}`:`${hex8(dh)} · 未定义/未收录`}</li><li>Media: {decodedMedia?`${hex8(dm)} · ${decodedMedia.name}`:`${hex8(dm)} · 当前 MediaType 下未定义/未收录`}</li><li>Lane Count: Host {(dl>>4)>8?"Reserved":(dl>>4)||"由接口 ID 隐含"} / Media {(dl&15)>8?"Reserved":(dl&15)||"由接口 ID 隐含"}</li><li>Host 起点: {startLanes(dho).join(", ")||"无"}；Media 起点: {startLanes(dmo).join(", ")||"无"}</li></ul>}</div></article></section>}
 {tab==="advertisements"&&<AdvertisementPanel onRef={onRef}/>}
 {tab==="dpconfig"&&<section className="builder-grid"><article className="builder-form"><h2>我要配置一个 Data Path</h2><div className="form-grid"><label>Staged Set<select value={scs} onChange={e=>setScs(Number(e.target.value))}><option value={0}>SCS0 · Required</option><option value={1}>SCS1 · Optional</option></select></label><label>AppSel<select value={dpApp} onChange={e=>setDpApp(Number(e.target.value))}>{Array.from({length:15},(_,i)=><option value={i+1} key={i}>{i+1}</option>)}</select></label><label>最低 Host Lane<select value={dpStart} onChange={e=>setDpStart(Number(e.target.value))}>{Array.from({length:8},(_,i)=><option value={i+1} key={i}>Lane {i+1}</option>)}</select></label><label>Host Lane 数<select value={dpLanes} onChange={e=>setDpLanes(Number(e.target.value))}>{Array.from({length:8},(_,i)=><option value={i+1} key={i}>{i+1}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={explicit} onChange={e=>setExplicit(e.target.checked)}/>ExplicitControl = 1</label></div>{!dpValid&&<div className="builder-warning"><p>⚠ Data Path 超出当前 8-Lane Bank；请选择较低起点或较少 Lane。</p></div>}<div className="field-equation"><code>DPConfig = (AppSel&lt;&lt;4) | ((最低Lane−1)&lt;&lt;1) | Explicit</code><b>{hex8(dpByte)}</b></div><button className="source-button" onClick={()=>onRef("apply")}>打开 CMIS Table 8-70–77 →</button></article><article className="builder-output"><div className="output-head"><span>8 个 Lane 的 DPConfig 数组</span><code>{dpBytes.map(hex8).join(" ")}</code></div><div className="write-table"><div className="write-row head"><span>Lane</span><span>AppSel</span><span>DataPathID</span><span>地址</span><span>写值</span></div>{dpBytes.map((v,i)=><div className="write-row" key={i}><b>Lane {i+1}</b><code>{v>>4}</code><code>{(v>>1)&7}</code><a className="address-link" href={registerHref(`10h:${(scs?180:145)+i}`)+"?value="+v.toString(16)}>{`10h:${(scs?180:145)+i}`}</a><code>{hex8(v)}</code></div>)}</div>{dpValid&&<div className="apply-card"><span>最后单独触发</span><b>10h:{scs?178:143} = {hex8(applyMask)}</b><p>ApplyDPInit 必须使用 single-byte WRITE；位图覆盖完整 Data Path：{startLanes(applyMask).join(", ")||"无"}。</p></div>}<div className="reverse-box"><h3>反向解析单个 DPConfig</h3><input value={dpReverse} onChange={e=>setDpReverse(e.target.value)} maxLength={5}/>{!dpReverseValid?<p role="alert" className="input-error">请输入一个完整十六进制字节（00–FF）。</p>:<ul><li>AppSelCode = {dpRaw>>4}</li><li>DataPathID = {(dpRaw>>1)&7}，{(dpRaw>>4)===0?"AppSel=0，此字段忽略":`最低 Host Lane = ${((dpRaw>>1)&7)+1}`}</li><li>ExplicitControl = {dpRaw&1} · {(dpRaw>>4)===0?"AppSel=0，此字段忽略":dpRaw&1?"使用 Staged SI 控制":"使用 Application-dependent 默认设置"}</li></ul>}</div></article></section>}
 {tab==="bitmap"&&<section className="builder-grid"><article className="builder-form"><h2>逐位生成 Lane 位图</h2><label className="full-label">目标寄存器<select value={bitmapTarget} onChange={e=>setBitmapTarget(e.target.value)}><option>10h:128 · DPDeinitLane</option><option>10h:130 · OutputDisableTx</option><option>10h:138 · OutputDisableRx</option><option>10h:143 · SCS0 ApplyDPInit</option><option>10h:178 · SCS1 ApplyDPInit</option></select></label><div className="lane-picker large"><b>选择值为 1 的 Lane</b>{Array.from({length:8},(_,i)=><button className={bitmap&(1<<i)?"on":""} onClick={()=>setBitmap(bitmap^(1<<i))} key={i}>Bit {i}<small>Lane {i+1}</small></button>)}</div><div className="field-equation"><code>{bitmap.toString(2).padStart(8,"0")}b</code><b>{hex8(bitmap)}</b></div></article><article className="builder-output"><div className="output-head"><span>写入声明</span><code>{bitmapTarget.split(" · ")[0]} = {hex8(bitmap)}</code></div><div className="write-table"><div className="write-row head"><span>Bit</span><span>Lane</span><span>值</span><span>掩码</span><span>声明</span></div>{Array.from({length:8},(_,i)=><div className="write-row" key={i}><b>{i}</b><span>Lane {i+1}</span><code>{bitmap&(1<<i)?1:0}</code><code>{hex8(1<<i)}</code><span>{bitmap&(1<<i)?"置 1 / 选中":"置 0 / 未选"}</span></div>)}</div><p className="split-note">DPDeinit / Disable 是静态控制，可按字段规则更新；ApplyDPInit 是写一触发，必须用单字节 WRITE，不能套用普通 read-modify-write。</p></article></section>}
 {tab==="codes"&&<section className="code-browser"><aside><h2>字段类型</h2>{[["identifier","Identifier"],["connector","Connector"],["host","Host Interface ID"],["media","Media Interface ID"]].map(x=><button className={codeKind===x[0]?"active":""} onClick={()=>{setCodeKind(x[0]);setCodeValue(codeSets[x[0]].items[0]?.code||0)}} key={x[0]}>{x[1]}</button>)}{codeKind==="media"&&<label>MediaType<CodeSelect items={mediaTypes.slice(1,6)} value={mediaType} onChange={v=>{setMediaType(v);setCodeValue(mediaInterfacesByType[v]?.[0]?.code||0)}}/></label>}</aside><article><div className="code-search"><input value={codeSearch} onChange={e=>setCodeSearch(e.target.value)} placeholder="按名称、代码或系列搜索…"/><span>{shownCodes.length} 项</span></div><div className="code-list">{shownCodes.map(x=><button className={codeValue===x.code?"active":""} onClick={()=>setCodeValue(x.code)} key={`${x.code}${x.name}`}><code>{hex8(x.code)}</code><div><b>{x.name}</b><span>{[x.family,x.lanes?`${x.lanes} Lane`:"",x.modulation].filter(Boolean).join(" · ")||"标准枚举"}</span></div></button>)}</div></article><aside className="code-inspector"><span>反向 / 正向结果</span><code>{hex8(codeValue)}</code><h2>{chosenCode?.name||"Reserved / Custom / 未收录"}</h2><dl><dt>写入位置</dt><dd>{codeSet.target}</dd><dt>枚举来源</dt><dd>{codeSet.source}</dd><dt>十进制</dt><dd>{codeValue}</dd><dt>二进制</dt><dd>{codeValue.toString(2).padStart(8,"0")}</dd></dl><label>输入数值反查<input value={codeValue.toString(16).padStart(2,"0").toUpperCase()} onChange={e=>setCodeValue(Math.max(0,Math.min(255,parseInt(e.target.value.replace(/[^0-9a-f]/gi,""),16)||0)))}/></label><button onClick={()=>onRef("sff")}>查看 SFF-8024 依据 →</button></aside></section>}
 {tab==="custom"&&<CustomBoundaryPanel onRef={onRef}/>}
 </>;
}

function MemoryMapView({onRef,onOpenRegisters}:{onRef:(id:string)=>void;onOpenRegisters:()=>void}){
 const [idx,setIdx]=useState(10);const item=pageCatalog[idx];const detail=pageDetails.find(p=>p.page===item[0]);
 return <><PageIntro kicker="COMPLETE PAGE DIRECTORY" title="CMIS 5.3 全 Page / Range 目录" desc="从 Lower Memory 到 FFh 的完整分配表。Reserved 表示协议禁止当作普通 Page 使用；Restricted 表示内容由对应 OIF 外部规范定义；Custom 只能由厂商文档解释。"><div className="address-chip">Lower:126 <b>BankSelect</b> · Lower:127 <b>PageSelect</b></div></PageIntro><section className="memory-layout catalog-layout"><div className="page-stack catalog-stack"><div className="memory-strip"><b>{pageCatalog.length} 个目录项</b><span>覆盖 00h–FFh</span></div>{pageCatalog.map((x,i)=><button className={idx===i?"active":""} key={x[0]} onClick={()=>{setIdx(i);onRef(x[0]==="9Fh"||x[0]==="A0h–AFh"?"cdb":"memory")}}><code>{x[0]}</code><div><b>{x[1]}</b><span>{x[2]} · {x[3]}</span></div>{pageDetails.some(p=>p.page===x[0])?<em className="coverage-tag">已解析</em>:<em className="coverage-tag external">边界</em>}</button>)}</div><article className="page-detail"><div className="page-title"><code>{item[0]}</code><div><span>{item[4]}</span><h2>{item[1]}</h2><p>{item[2]} · {item[3]}</p></div>{detail&&<Badge level={detail.level}/>}</div>{detail?<><div className="range-map"><span>{detail.page==="Lower"?0:128}</span>{detail.ranges.map(x=><button style={{flexGrow:x.end-x.start+1}} key={`${x.start}${x.label}`} title={`${x.start}–${x.end}: ${x.label}`}><b>{x.label}</b><small>{x.start===x.end?x.start:`${x.start}–${x.end}`}</small></button>)}<span>{detail.page==="Lower"?127:255}</span></div><div className="page-coverage"><b>{detail.status}</b><span>{detail.ranges.length} 个连续地址范围 · {detail.ranges.reduce((n,x)=>n+(x.fields?.length||0),0)} 个可下钻字段</span></div><h3>访问规则</h3><ul className="check-list">{detail.notes.map(x=><li key={x}>{x}</li>)}</ul></>:<div className="boundary-card"><b>此范围不在 CMIS 5.3 主文中定义寄存器内容</b><p>{item[1].includes("Reserved")?"主机不得访问 Reserved Page；若模块对访问产生响应，也不能把返回值解释为标准字段。":item[1].includes("Restricted")?"该地址已由 OIF 保留给其他规范。本网页只标明所有权边界，避免把外部规范内容误写成 CMIS 5.3。":"Custom Page 的字节和行为完全依赖厂商文档；CMIS 不提供通用解码。"}</p></div>}<button className="primary" disabled={!detail} onClick={()=>detail&&onOpenRegisters()}>{detail?"在寄存器浏览器逐组查看":"无 CMIS 5.3 字段可展开"}</button></article></section></>;
}

function RegisterView({onRef}:{onRef:(id:string)=>void}){
 const [q,setQ]=useState("");const [category,setCategory]=useState("全部");const [pageId,setPageId]=useState("10");const [rangeIdx,setRangeIdx]=useState(0);const [fieldIdx,setFieldIdx]=useState(0);const [hex,setHex]=useState("53");const [context,setContext]=useState("revision");const [bank,setBank]=useState(0);const [lane,setLane]=useState(1);
 const pages=pageDetails.filter(p=>(category==="全部"||p.category===category)&&`${p.page}${p.title}${p.ranges.map(x=>x.label+x.summary+(x.fields||[]).map(f=>f.name+f.meaning).join("")).join("")}`.toLowerCase().includes(q.toLowerCase()));
 const page=pages.find(p=>p.id===pageId)||pages[0]||pageDetails[0];const group=page.ranges[Math.min(rangeIdx,page.ranges.length-1)];const field=group.fields?.[Math.min(fieldIdx,(group.fields?.length||1)-1)];
 const parsed=parseHex(hex,context);
 return <><PageIntro kicker="PAGE → RANGE → BYTE → BIT" title="逐 Page 寄存器浏览器" desc="同类连续字节归为一个地址组；点击地址组后查看字段、Bit、访问类型、枚举值和行为规定。核心初始化页已逐字段展开，其余页按协议 Overview 表完整覆盖地址范围。"><div className="summary-pill"><b>{deepFieldCount}</b><span>可下钻字段定义</span></div></PageIntro><section className="register-tools"><label>⌕<input value={q} onChange={e=>{setQ(e.target.value);setRangeIdx(0);setFieldIdx(0)}} placeholder="搜索 Page、地址组、字段或语义"/></label><select value={category} onChange={e=>{setCategory(e.target.value);setRangeIdx(0);setFieldIdx(0)}}><option>全部</option>{["基础","能力","Data Path","诊断","扩展","CDB"].map(x=><option key={x}>{x}</option>)}</select><span>{pages.length} Pages · {coveredRangeCount} 地址组</span></section><section className="register-browser"><nav className="register-pages">{pages.map(p=><button className={p.id===page.id?"active":""} key={p.id} onClick={()=>{setPageId(p.id);setRangeIdx(0);setFieldIdx(0);onRef(p.category==="CDB"?"cdb":"memory")}}><code>{p.page}</code><div><b>{p.title}</b><span>{p.ranges.length} 组 · {p.status}</span></div></button>)}</nav><article className="register-page"><div className="register-page-head"><div><code>PAGE {page.page}</code><h2>{page.title}</h2><p>{page.bank} · {page.access} · {page.ref}</p></div><Badge level={page.level}/></div>{page.page==="10h"||page.page==="11h"?<div className="bank-calc"><b>Bank / Lane 计算器</b><label>Bank <input type="number" min="0" max="3" value={bank} onChange={e=>setBank(Math.max(0,Math.min(3,Number(e.target.value))))}/></label><label>页内 Lane <input type="number" min="1" max="8" value={lane} onChange={e=>setLane(Math.max(1,Math.min(8,Number(e.target.value))))}/></label><span>全局 Lane <strong>{bank*8+lane}</strong></span></div>:null}<div className="range-map register-range-map"><span>{page.page==="Lower"?0:128}</span>{page.ranges.map((x,i)=><button className={group===x?"active":""} style={{flexGrow:x.end-x.start+1}} key={`${x.start}${x.label}`} onClick={()=>{setRangeIdx(i);setFieldIdx(0)}} title={`${x.start}–${x.end}: ${x.label}`}><b>{x.label}</b><small>{x.start===x.end?x.start:`${x.start}–${x.end}`}</small></button>)}<span>{page.page==="Lower"?127:255}</span></div><div className="group-head"><div><span>地址组 {group.start===group.end?group.start:`${group.start}–${group.end}`}</span><h3>{group.label}</h3><p>{group.summary}</p></div><div><Badge level={group.level}/><code>{group.access}</code></div></div>{group.fields?.length?<div className="field-table"><div className="field-row head"><span>地址</span><span>Bit</span><span>字段</span><span>访问</span><span>等级</span></div>{group.fields.map((x,i)=><button className={`field-row ${field===x?"active":""}`} key={`${x.address}${x.name}`} onClick={()=>setFieldIdx(i)}><code>{x.address}</code><code>{x.bits}</code><b>{x.name}</b><span>{x.access}</span><Badge level={x.level}/></button>)}</div>:<div className="range-only"><b>地址范围已完整定位</b><p>本组当前按协议 Overview 表解析到连续地址语义；需要逐 Bit 时将继续补充该组字段表。Reserved/Custom 不会虚构字段。</p></div>}</article><aside className="field-inspector deep-inspector"><span>{field?"字段规定":"地址组规定"}</span><code>{field?.address||`${page.page}:${group.start}–${group.end}`} {field&&`[${field.bits}]`}</code><h2>{field?.name||group.label}</h2><div><Badge level={field?.level||group.level}/><em>{field?.access||group.access}</em></div><p>{field?.meaning||group.summary}</p>{field?.values&&<><h3>编码 / 内容规定</h3><ul>{field.values.map(x=><li key={x}>{x}</li>)}</ul></>}<dl><dt>页面上下文</dt><dd>{page.page} · {page.bank}</dd><dt>来源</dt><dd>CMIS 5.3 · {page.ref}</dd><dt>解析状态</dt><dd>{page.status}</dd></dl><button onClick={()=>onRef(page.category==="CDB"?"cdb":"memory")}>打开协议依据 →</button></aside></section><section className="hex-tool"><div className="tool-title"><div><p className="eyebrow">CONTEXT-AWARE DECODER</p><h2>十六进制解析工具</h2></div><span>按已核对字段模板解析</span></div><div className="hex-grid"><div><label>解析上下文<select value={context} onChange={e=>{setContext(e.target.value);setHex(e.target.value==="revision"?"53":e.target.value==="module"?"06":e.target.value==="dp"?"14":"11 1C 84 01 01")}}><option value="revision">Lower:1 · CmisRevision</option><option value="module">Lower:3 · ModuleState</option><option value="dp">11h:128 · DPState Lane 1/2</option><option value="app">Application Descriptor · 5 bytes</option></select></label><label>原始十六进制<textarea value={hex} onChange={e=>setHex(e.target.value)} spellCheck={false}/></label></div><div className="decoded"><span>解析结果</span><h3>{parsed.title}</h3><p>{parsed.description}</p><code>{parsed.binary}</code><ul>{parsed.lines.map(x=><li key={x}>{x}</li>)}</ul>{parsed.warning&&<div className="warning">⚠ {parsed.warning}</div>}</div></div></section></>;
}

function parseHex(value:string,context:string){
 const vals=value.trim().split(/[\s,]+/).filter(Boolean).map(x=>parseInt(x.replace(/^0x/i,""),16)).filter(x=>Number.isFinite(x)&&x>=0&&x<=255);
 const binary=vals.map(x=>x.toString(2).padStart(8,"0")).join(" ");
 if(!vals.length)return{title:"等待有效输入",description:"请输入 00–FF 的十六进制字节。",binary:"—",lines:[],warning:"输入不是有效的十六进制字节"};
 if(context==="revision")return{title:`CMIS ${vals[0]>>4}.${vals[0]&15}`,description:`高半字节 ${(vals[0]>>4).toString(16)} 为主版本，低半字节 ${(vals[0]&15).toString(16)} 为次版本。`,binary,lines:[`Raw: 0x${vals[0].toString(16).padStart(2,"0").toUpperCase()}`,"字段：CmisRevision · RO · Required"],warning:vals.length!==1?"此模板只解析第 1 字节":undefined};
 if(context==="module"){const code=(vals[0]>>1)&7;const names=["Reserved","ModuleLowPwr","ModulePwrUp","ModuleReady","ModulePwrDn","ModuleFault","Reserved","Reserved"];return{title:names[code],description:`ModuleState 编码 ${code.toString(2).padStart(3,"0")}b。`,binary,lines:[`InterruptDeasserted = ${vals[0]&1}`,`模块状态：${names[code]}`],warning:[0,6,7].includes(code)?"该编码为 Reserved；不能作为正常状态解释":undefined}}
 if(context==="dp"){const names=["Reserved","DPDeactivated","DPInit","DPDeinit","DPActivated","DPTxTurnOn","DPTxTurnOff","DPInitialized"];const a=vals[0]&15,b=(vals[0]>>4)&15;return{title:"DPState Lane 1 / 2",description:"低半字节对应 Lane 1，高半字节对应 Lane 2。",binary,lines:[`Lane 1: ${names[a]||"Reserved"} (${a.toString(16)}h)`,`Lane 2: ${names[b]||"Reserved"} (${b.toString(16)}h)`],warning:(a>7||b>7||a===0||b===0)?"包含 Reserved 状态编码":undefined}}
 const [host=0,media=0,lanes=0,hostOpt=0,mediaOpt=0]=vals;const hc=lanes>>4,mc=lanes&15;const starts=(x:number)=>Array.from({length:8},(_,i)=>x&(1<<i)?i+1:0).filter(Boolean).join(", ")||"无";return{title:"Basic Application Descriptor",description:"接口 ID 的具体标准名称需结合 SFF-8024；本解析仅展开 CMIS 5.3 定义的结构字段。",binary,lines:[`HostInterfaceID: 0x${host.toString(16).padStart(2,"0").toUpperCase()}`,`MediaInterfaceID: 0x${media.toString(16).padStart(2,"0").toUpperCase()}`,`Host/Media Lane Count: ${hc} / ${mc}`,`Host 起始 Lane: ${starts(hostOpt)}`,`Media 起始 Lane: ${starts(mediaOpt)}`],warning:vals.length<5?"Application Descriptor 需要 5 个字节；当前上下文不足":hc>8||mc>8?"Lane Count 9–15 为 Reserved":undefined};
}

const capabilities=[
 ["Paged Memory","条件强制","00h:2.7 MemoryModel","Page/Bank Select","页面访问/NACK","Paged 模块"],
 ["Intervention-free 重配置","可选","00h:2.6 SteppedConfigOnly","ApplyImmediate","ConfigStatus","SteppedConfigOnly=0"],
 ["CDB Messaging","可选","01h:163.7–6","9Fh:128–129 CMDID","CdbStatus / CompleteFlag","实例数 > 0"],
 ["CDB Background Mode","可选","01h:163.5","CDB 命令协议","CdbStatus","已支持 CDB"],
 ["Normalized Application Descriptor","可选","表 8-57","Page 1Ch","Active Control Set 扩展","模块广告 NAD"],
 ["Firmware Management","可选","CMD 0041h","0101h–010Ah","CdbStatus / Reply","命令逐项广告"],
 ["Rx Output Status","强制","固定能力","Lane 运行状态","11h:132 / 11h:153","Paged 模块"],
 ["ConfigStatus","强制","固定能力","Apply*","11h:202–205","Paged 模块"],
];
function CapabilityMatrix({onRef}:{onRef:(id:string)=>void}){const [f,setF]=useState("全部");return <><PageIntro kicker="CAPABILITY → CONTROL → STATUS" title="能力与要求矩阵" desc="从能力声明追踪到控制、状态、错误与适用条件；“可选”能力一旦声明支持，其后续行为通常转化为条件强制。"/><div className="filterbar">{["全部","强制","可选"].map(x=><button key={x} className={f===x?"active":""} onClick={()=>setF(x)}>{x}</button>)}</div><section className="matrix"><div className="matrix-row head"><span>能力</span><span>支持等级</span><span>声明位置</span><span>控制/入口</span><span>状态/错误</span><span>适用条件</span></div>{capabilities.filter(x=>f==="全部"||x[1]===f).map(x=><button className="matrix-row" key={x[0]} onClick={()=>onRef(x[0].includes("CDB")||x[0].includes("Firmware")?"cdb":x[0].includes("重配置")||x[0].includes("Config")?"apply":"memory")}><b>{x[0]}</b><Badge level={x[1] as Requirement}/><code>{x[2]}</code><span>{x[3]}</span><span>{x[4]}</span><span>{x[5]}</span></button>)}</section><div className="info-banner"><b>判定规则</b><p>“CDB 可选”不等于 CDB 内所有内容都可随意实现。模块广告一个或两个 CDB 实例后，相应 Bank、Page 9Fh、CompleteFlag 和 Mask 具有明确的配套要求。</p><button onClick={()=>onRef("cdb")}>表 8-54</button></div></>}

const responsibilities=[
 ["识别 MemoryModel","读取 00h:2.7，并据此选择访问模型","正确广告 Paged/Flat，并匹配可访问页面","强制","§8.2.1"],
 ["Page/Bank 切换","改变 Bank 时同一 WRITE 写 BankSelect + PageSelect","在 PageSelect 写入后才处理 BankSelect","条件强制","§8.2.15"],
 ["Application 选择","只选择模块广告的 AppSel 与合法 Lane 组合","连续广告支持的 Application，并以 FFh 终止列表","条件强制","§6.2.1.4"],
 ["ApplyDPInit","单字节写触发，覆盖完整 Data Path Lane","验证、复制至 Active Set、执行并更新 ConfigStatus","条件强制","§6.2.3 / 表 8-70"],
 ["Data Path 初始化","确保 Active Set 正确后清除相关 DPDeinit 位","在 ModuleReady 中求值请求并报告 DPState","条件强制","§6.3.3.2"],
 ["Flag/Interrupt","读取具体 Flag 定位并完成协议规定的清除动作","按事件置 Flag；Mask 仅控制 Interrupt 贡献","条件强制","§6.3.4"],
 ["CDB 命令","先发现实例与命令支持，按触发规则组装并发送","广告支持后处理消息、状态、回复和校验","可选","§7.2 / §8.23"],
];
function ResponsibilityView({onRef}:{onRef:(id:string)=>void}){return <><PageIntro kicker="HOST ↔ MODULE" title="主机与模块职责矩阵" desc="把同一操作拆成双方责任，突出前置条件、完成条件和不符合后果。"/><section className="responsibility"><div className="resp-head"><span>机制/操作</span><span>HOST 必须/应做</span><span>MODULE 必须/应做</span><span>等级与依据</span></div>{responsibilities.map(x=><button className="resp-row" key={x[0]} onClick={()=>onRef(x[0].includes("CDB")?"cdb":x[0].includes("Application")||x[0].includes("Apply")?"apply":x[0].includes("Data Path")?"dpsm":"memory")}><b>{x[0]}</b><p><i>H</i>{x[1]}</p><p><i>M</i>{x[2]}</p><span><Badge level={x[3] as Requirement}/><code>{x[4]}</code></span></button>)}</section></>}

const faults=[
 {title:"AppSel 写入后未生效",ref:"apply",checks:["确认目标 AppSel 来自当前模块广告，不假设不同模块顺序一致","检查 Staged Control Set 的 DataPathID 与 Lane 集合","确认 ApplyDPInit 写到正确 SCS 且为单字节 WRITE","轮询 ConfigStatus：Ch 进行中，3h/4h/6h/7h 等分别定位拒绝原因","读取 Active Control Set，确认配置是否已被复制","最后结合 DPState 与 OutputStatus 判断是否真正可用"]},
 {title:"Data Path 无法进入 Activated",ref:"dpsm",checks:["ModuleState 是否为 ModuleReady","同一 Data Path 的 DPDeinit 位是否一致且已清零","Active Control Set 是否为合法 Application/Lane 组合","DPState 停在哪个状态；瞬态可能被允许短时不报告","OutputDisableTx / OutputSquelchForceTx 是否阻止 Tx 输出","结合 OutputStatusRx/Tx，而非只看 DPState"]},
 {title:"CDB 一直 Busy",ref:"cdb",checks:["确认实例 Bank 与 CdbStatus/CompleteFlag 对应关系","区分 Foreground 与 Background 模式支持","检查 CMDID 触发方式与头部/负载写入顺序","复算 CdbChkCode，排除校验错误","根据命令广告的最大持续时间设置轮询边界","需要终止时，仅在支持且条件允许时使用 Abort 0004h"]},
 {title:"Firmware Commit 成功但版本未变化",ref:"firmware",checks:["用 CMD 0100h 读取当前 running / committed 状态","确认 0109h 已实际 Run 目标镜像","010Ah 只能提交当前运行镜像","区分当前运行版本与下次 Reset 的启动选择","检查 CdbStatus 与 Reply，而非只看命令写入成功","若协议字段正常但版本字符串未变化，转向厂商镜像/实现说明"]},
 {title:"Module State 一直未就绪",ref:"msm",checks:["R Lower:3，按 [3:1] 提取 ModuleState，不把整字节直接当状态码","确认 Reset 已释放且管理初始化已完成","读取 Lower:26，检查 SW / AllowHW 以及硬件请求的组合","检查模块广告功耗和 Host 端口供电预算是否满足","若停在 ModulePwrUp，按模块广告时长判断是否超时；若 ModuleFault，保存状态与 Flag","确认 ModuleReady 后再判断 Data Path，两个状态机分开处理"]},
 {title:"Page 切换后数据异常",ref:"memory",checks:["读取 Lower:2.7 区分 Flat 与 Paged Memory","确认目标 Page 和 Bank 已被模块广告支持","改变 Bank 时在同一连续 WRITE 中写 Lower:126–127","按 Page / Bank 切换时序等待，避免立即读到旧窗口","串行化共享管理接口的 Page 选择和后续访问，排除其他进程切页","核对地址单位：Page 为十六进制，Byte 为十进制；Lower 不受切页影响"]},
 {title:"告警位无法清除",ref:"flags",checks:["区分 Flag Summary、具体 Flag 与实时状态，读取 Summary 不等于清除具体 Flag","查字段访问类型，只有 COR 字段有相应读取清除语义","先保存原始具体 Flag，再按对应 Page / Bank 读取","确认是否有新事件重新置位；持续异常要结合当前监控值判断","检查 Mask 仅影响中断贡献，不会阻止 Flag 记录或主动清除 Flag","排除其他主机轮询抢先读走事件，保证同一诊断时段访问顺序可追溯"]},
 {title:"低功耗无法退出",ref:"power",checks:["读取 Lower:26.4，确认 LowPwrRequestSW 为 0","读取 Lower:26.6；若为 1，还需确认硬件低功耗请求已撤销","按 LowPwrS = SW OR (AllowHW AND HW asserted) 计算实际请求","确认主机允许模块高功耗且供电满足广告预算","轮询 Lower:3[3:1]，区分 ModuleLowPwr、ModulePwrUp 和 ModuleFault","达到 ModuleReady 后，再检查独立的 DPDeinit 和 Data Path 配置"]},
];
function TroubleshootView({onRef}:{onRef:(id:string)=>void}){const [i,setI]=useState(0);return <><PageIntro kicker="PROTOCOL-LEVEL DIAGNOSIS" title="故障排查" desc="从能力、上下文、控制、状态和错误反馈逐层收敛。结论只覆盖协议层，厂商内部实现留作明确边界。"/><section className="trouble-layout"><nav>{faults.map((x,n)=><button className={n===i?"active":""} onClick={()=>setI(n)} key={x.title}><span>{String(n+1).padStart(2,"0")}</span>{x.title}</button>)}</nav><article><div className="trouble-title"><span>DECISION TREE</span><h2>{faults[i].title}</h2><button onClick={()=>onRef(faults[i].ref)}>协议依据 ↗</button></div><div className="tree"><div className="root-node">问题复现并记录原始 Page / Bank / Byte</div>{faults[i].checks.map((x,n)=><div className="tree-node" key={x}><i>{n+1}</i><p><AddressText text={x}/></p><span>{n===faults[i].checks.length-1?"完成":"核查"}</span></div>)}</div><div className="boundary"><b>协议边界</b><p>若能力广告、控制写入、状态机、反馈码均符合，而内部处理结果仍异常，CMIS 5.3 可能不足以判断，需要厂商实现说明或硬件级诊断。</p></div></article></section></>}

const terms=[
 ["Application","应用","一对 Host Interface 与 Media Interface 组合及其模块实现属性。","§6.2.1"],
 ["Application Descriptor","应用描述符","模块用来广告可支持 Application 实例的结构；基本格式 5 字节。","表 6-1"],
 ["AppSel","应用选择码","基本 Application Descriptor 列表中的顺序号；顺序由模块定义。","§6.2.1.4"],
 ["Data Path","数据路径","模块中把一组 Host Lane 与一组 Media Lane 关联并共同配置/管理的功能实体。","§6.2.1"],
 ["Staged Control Set","暂存控制集","主机写入、尚未 provision 到 Active Control Set 的配置副本。","§6.2.3"],
 ["Active Control Set","活动控制集","模块当前已 provision 的 Data Path 与 SI 设置报告。","§8.10.6"],
 ["ApplyDPInit","配置并初始化触发","对指定 Lane 触发 Provision；是否连带状态循环取决于当前状态和能力。","表 8-70"],
 ["Flag","标志","由事件或状态变化置位、具有协议规定清除语义的通知状态。","§6.3.4"],
 ["Mask","掩码","控制相应 Flag 是否贡献到 Interrupt，不等同于禁止 Flag 置位。","§6.3.4"],
 ["CDB","Command Data Block","基于 Page 9Fh/A0h–AFh 的可选命令/回复消息机制。","§7.2"],
 ["NAD","Normalized Application Descriptor","8 字节规范化描述符，可通过 Page 1Ch 的 16 个 Bank 广告最多 240 项。","§6.2.1.4.2"],
];
function GlossaryView({onRef}:{onRef:(id:string)=>void}){const [q,setQ]=useState("");return <><PageIntro kicker="CONTROLLED VOCABULARY" title="术语表" desc="保留英文规范术语，中文解释用于工程理解；容易混淆的术语通过关联机制交叉引用。"><label className="gloss-search">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索中英文术语"/></label></PageIntro><section className="glossary">{terms.filter(x=>x.join("").toLowerCase().includes(q.toLowerCase())).map(x=><button key={x[0]} onClick={()=>onRef(x[0]==="CDB"?"cdb":x[0].includes("Apply")||x[0].includes("Control")?"apply":x[0].includes("Data")?"dpsm":x[0].includes("Flag")||x[0]==="Mask"?"flags":"app")}><div><b>{x[0]}</b><span>{x[1]}</span></div><p>{x[2]}</p><code>{x[3]}</code></button>)}</section></>}

const chapters=[
 ["1","Introduction","已解析","信息性与范围"],["2","References","部分解析","外部规范索引"],["3","Definitions and Abbreviations","已解析","术语模型"],["4","General Concepts","已解析","协议分层"],["5","Behaviors","部分解析","通用行为与同步"],["6","Transmission Module Management","已解析","Application / MSM / DPSM"],["7","Optional Management Features","部分解析","CDB、FW、VDM 等"],["8","Memory Map","部分解析",`${pageCatalog.length} 个 Page/Range 目录项；${coveredRangeCount} 个地址组；核心页逐 Byte/Bit`],["9","CDB Command Reference","部分解析","Page 9Fh 头部逐字段；固件流程已建模"],["10","Management Timing","部分解析","流程已关联广告最大时长，精确参数表待录入"],["A–I","Appendices","部分解析","D.1/D.2 初始化与去初始化已逐步解析"],
];
function CoverageView(){return <><PageIntro kicker="TRACEABILITY & COVERAGE" title="协议覆盖情况" desc="覆盖率以“已定位并进入结构化模型”为口径。逐字段、地址范围、外部规范边界三种状态严格分开，不把只有导航入口的内容算作完整解析。"><div className="coverage-score"><b>深解析版</b><span>初始化与核心寄存器已展开</span></div></PageIntro><section className="coverage-stats"><div><b>{pageCatalog.length}</b><span>完整 Page/Range 目录项</span></div><div><b>{pageDetails.length}</b><span>已解析页面</span></div><div><b>{coveredRangeCount}</b><span>连续地址组</span></div><div><b>{deepFieldCount}</b><span>可下钻字段定义</span></div><div><b>{procedures[0].steps.length}</b><span>完整初始化步骤</span></div><div><b>0</b><span>虚构保留字段</span></div></section><section className="coverage-legend"><div><b>逐字段</b><p>地址、Bit、Access、Requirement、枚举和行为可点击查看。</p></div><div><b>范围解析</b><p>Overview 表的地址连续性与用途已覆盖，字段细节仍按组补充。</p></div><div><b>边界</b><p>Reserved / Restricted / Custom 只说明访问和归属，绝不猜测内容。</p></div></section><section className="coverage-table"><div className="coverage-head"><span>章节</span><span>标题</span><span>状态</span><span>当前范围</span></div>{chapters.map(x=><div className="coverage-row" key={x[0]}><code>{x[0]}</code><b>{x[1]}</b><span className={x[2]==="已解析"?"done":"partial"}><i/>{x[2]}</span><p>{x[3]}</p></div>)}</section><section className="quality-gates"><h2>一致性检查规则</h2><div>{["字段必须具有 Page / Byte / Bit 来源","流程步骤必须关联读写字段与完成条件","状态转换名称保持 CMIS 5.3 原文","规范等级同时检查措辞与适用条件","Reserved/Restricted/Custom 不创建伪字段","同一字段在流程、状态和寄存器视图共享语义"].map(x=><p key={x}><span>✓</span>{x}</p>)}</div></section></>}

function VersionPlaceholder(){return <><PageIntro kicker="VERSION MODEL RESERVED" title="版本差异" desc="数据模型已为 introduced_in、modified_in、deprecated_in、requirement_changed_in、address_changed_in 与 behavior_changed_in 预留字段。当前版本只使用 CMIS 5.3，不生成未经逐版协议核对的差异。"><Badge level="待解析"/></PageIntro><section className="version-roadmap"><div><span>5.0</span><b>待导入</b><p>字段与行为逐项对齐后开放</p></div><div><span>5.1</span><b>待导入</b><p>保持独立来源与引用</p></div><div><span>5.2</span><b>待导入</b><p>记录规范等级变化</p></div><div className="current"><span>5.3</span><b>当前版本</b><p>OIF-CMIS-05.3 · 2024-09-04</p></div><div><span>5.4</span><b>待导入</b><p>需提供或核对正式正文</p></div></section><div className="info-banner"><b>准确性边界</b><p>版本差异不能只依靠 Revision History 摘要生成。后续将按字段地址、枚举、状态机、流程、时序和规范等级逐项建立双向引用。</p><button>数据模型已预留</button></div></>}
