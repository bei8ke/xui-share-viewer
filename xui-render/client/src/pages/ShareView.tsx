import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Copy, Check, Shield, AlertTriangle, Wifi, Server,
  Link2, QrCode, LayoutGrid, List, Zap, Info, ChevronDown,
  MessageSquarePlus, X, Pencil
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type ViewMode = "card" | "list";

// ─── 复制按钮 ─────────────────────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
        bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 hover:border-white/40 active:scale-95"
      title={label || "复制"}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "已复制" : (label || "复制")}
    </button>
  );
}

// Clash 客户端列表
const CLASH_CLIENTS = [
  { label: "Clash for Windows",      scheme: "clash" },
  { label: "Clash Verge / Nyanpasu", scheme: "clash-verge" },
  { label: "ClashX (Mac)",           scheme: "clashx" },
  { label: "ClashX Pro (Mac)",       scheme: "clashx-pro" },
];

// ─── Clash 导入按钮 ───────────────────────────────────────────────────────────
function ClashImportButton({ clashLink }: { clashLink: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (scheme: string) => {
    setOpen(false);
    const encoded = encodeURIComponent(clashLink);
    window.location.href = `${scheme}://install-config?url=${encoded}`;
    toast.info(`正在唤醒 Clash 客户端导入订阅...`, { duration: 3000 });
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
          bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 hover:text-pink-200 border border-pink-500/30 hover:border-pink-400/50 active:scale-95"
        title="一键导入到 Clash 客户端"
      >
        <Zap className="w-3.5 h-3.5" />
        导入 Clash
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 min-w-[190px] rounded-xl border border-white/20 bg-gray-900/95 backdrop-blur-sm shadow-xl overflow-hidden">
          {CLASH_CLIENTS.map(c => (
            <button
              key={c.scheme}
              onClick={() => handleSelect(c.scheme)}
              className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-100"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 记录类型 ─────────────────────────────────────────────────────────────────
type RecordData = {
  id: number;
  remark?: string | null;
  accelerateIp: string;
  acceleratePort: number;
  vmessLink?: string | null;
  clashLink?: string | null;
  protocol?: string | null;
  status: string;
};

// ─── 节点备注钩子（存储在 localStorage） ─────────────────────────────────────
function useLocalRemark(token: string, recordId: number) {
  const key = `remark_${token}_${recordId}`;
  const [remark, setRemark] = useState<string>(() => {
    try { return localStorage.getItem(key) || ""; } catch { return ""; }
  });
  const save = useCallback((val: string) => {
    setRemark(val);
    try {
      if (val) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    } catch { /* ignore */ }
  }, [key]);
  return [remark, save] as const;
}

// ─── 备注编辑弹窗 ─────────────────────────────────────────────────────────────
// mode="card"：备注文字显示在按钮后面（行内）
// mode="list"：备注文字显示在节点名称上方（由父组件渲染），弹窗用 fixed 定位避免被截断
function RemarkPopover({
  token,
  recordId,
  nodeName,
  mode = "card",
  onSaved,
}: {
  token: string;
  recordId: number;
  nodeName: string;
  mode?: "card" | "list";
  onSaved?: () => void;
}) {
  const [remark, saveRemark] = useLocalRemark(token, recordId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(remark);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setDraft(remark);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, remark]);

  // 打开时聚焦 + 计算 fixed 位置（列表模式）
  useEffect(() => {
    if (open) {
      setDraft(remark);
      if (mode === "list" && btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setPopupPos({
          top: rect.bottom + 6 + window.scrollY,
          left: Math.min(rect.right - 288, window.innerWidth - 296),
        });
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, remark, mode]);

  const handleSave = () => {
    saveRemark(draft.trim());
    setOpen(false);
    toast.success(draft.trim() ? "备注已保存" : "备注已清除");
    onSaved?.();
  };

  const popupContent = open && (
    <div
      ref={popoverRef}
      style={mode === "list" && popupPos ? { position: "fixed", top: popupPos.top, left: popupPos.left, zIndex: 9999 } : {}}
      className={mode === "card" ? "absolute z-50 right-0 mt-2 w-72 rounded-xl border border-white/20 bg-gray-900/98 backdrop-blur-sm shadow-2xl p-4" : "w-72 rounded-xl border border-white/20 bg-gray-900/98 backdrop-blur-sm shadow-2xl p-4"}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-white/80">我的备注</div>
        <button onClick={() => { setOpen(false); setDraft(remark); }} className="text-white/40 hover:text-white/70 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-xs text-white/40 mb-2 truncate">{nodeName}</div>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setOpen(false); setDraft(remark); } }}
        placeholder="输入备注（仅本设备可见）"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-400/60 focus:bg-white/15 transition-all"
        maxLength={100}
      />
      <div className="flex items-center justify-between mt-3 gap-2">
        <span className="text-xs text-white/30">{draft.length}/100 · 仅存本设备</span>
        <div className="flex gap-2">
          {remark && (
            <button
              onClick={() => { saveRemark(""); setDraft(""); setOpen(false); toast.success("备注已清除"); onSaved?.(); }}
              className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 transition-all"
            >
              清除
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 border border-blue-500/40 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "card") {
    return (
      <div className="relative inline-block">
        <button
          ref={btnRef}
          onClick={() => setOpen(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95
            ${remark
              ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
              : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white border border-white/20 hover:border-white/40"
            }`}
          title={remark ? `我的备注：${remark}` : "添加我的备注"}
        >
          {remark ? <Pencil className="w-3.5 h-3.5" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
          {remark ? "编辑备注" : "备注"}
        </button>
        {popupContent}
      </div>
    );
  }

  // 列表模式：只渲染按钮，弹窗用 fixed 定位挂到 body 层
  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95
          ${remark
            ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
            : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white border border-white/20 hover:border-white/40"
          }`}
        title={remark ? `我的备注：${remark}` : "添加我的备注"}
      >
        {remark ? <Pencil className="w-3.5 h-3.5" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
        {remark ? "编辑备注" : "备注"}
      </button>
      {/* 列表模式弹窗用 portal 挂到 #portal-root，避免被 overflow:hidden 截断 */}
      {open && typeof document !== "undefined" && (() => {
        const container = document.getElementById("portal-root");
        if (!container) return popupContent;
        return createPortal(popupContent, container);
      })()}
    </>
  );
}

// ─── 内联二维码组件 ──────────────────────────────────────────────────────────
function InlineQrCode({ value, expanded, onToggle }: { value: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
          <QrCode className="w-4 h-4" />
          <span>二维码（VMess）</span>
        </div>
        <button
          onClick={onToggle}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? "收起" : "展开"}
        </button>
      </div>
      {expanded && (
        <div className="flex justify-center pt-2">
          <div className="p-3 bg-white rounded-xl inline-block">
            <QRCodeSVG value={value} size={176} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 卡片模式 ─────────────────────────────────────────────────────────────────
function RecordCard({ record, index, token }: { record: RecordData; index: number; token: string }) {
  const [qrExpanded, setQrExpanded] = useState(true);
  const nodeName = record.remark || `节点 ${index + 1}`;
  // 卡片模式下独立读取备注，用于在节点名称后面显示
  const cardRemarkKey = `remark_${token}_${record.id}`;
  const [cardRemark, setCardRemark] = useState<string>(() => {
    try { return localStorage.getItem(cardRemarkKey) || ""; } catch { return ""; }
  });
  const refreshCardRemark = useCallback(() => {
    try { setCardRemark(localStorage.getItem(cardRemarkKey) || ""); } catch { /* ignore */ }
  }, [cardRemarkKey]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            {/* 节点名称 + 备注文字（显示在名称后面，同一行） */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-white font-semibold text-sm">{nodeName}</div>
              {cardRemark && (
                <div className="text-xs text-yellow-300/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5 max-w-[160px] truncate">
                  {cardRemark}
                </div>
              )}
            </div>
            <div className="text-white/50 text-xs mt-0.5 font-mono">{record.accelerateIp}:{record.acceleratePort}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
            {record.protocol?.toUpperCase() || "VMESS"}
          </span>
          <RemarkPopover token={token} recordId={record.id} nodeName={nodeName} onSaved={refreshCardRemark} />
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="p-5 flex flex-col gap-3">
        {/* 加速节点信息 */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Wifi className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-300/70 mb-0.5">加速节点</div>
            <div className="text-sm text-blue-200 font-mono font-medium">{record.accelerateIp}:{record.acceleratePort}</div>
          </div>
          <CopyButton text={`${record.accelerateIp}:${record.acceleratePort}`} label="复制" />
        </div>

        {/* VMess 链接 */}
        {record.vmessLink && (
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <Link2 className="w-4 h-4 flex-shrink-0" />
                <span>VMess 链接</span>
              </div>
              <CopyButton text={record.vmessLink} label="复制链接" />
            </div>
            <div className="text-xs text-white/60 font-mono break-all leading-relaxed">{record.vmessLink}</div>
          </div>
        )}

        {/* Clash 订阅链接 */}
        {record.clashLink && (
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
                <Server className="w-4 h-4 flex-shrink-0" />
                <span>Clash 订阅</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <CopyButton text={record.clashLink} label="复制链接" />
                <ClashImportButton clashLink={record.clashLink} />
              </div>
            </div>
            <div className="text-xs text-pink-300/70 font-mono break-all leading-relaxed">{record.clashLink.substring(0, 80)}{record.clashLink.length > 80 ? "..." : ""}</div>
          </div>
        )}

        {/* 二维码（根据 vmessLink 动态生成） */}
        {record.vmessLink && (
          <InlineQrCode
            value={record.vmessLink}
            expanded={qrExpanded}
            onToggle={() => setQrExpanded(!qrExpanded)}
          />
        )}
      </div>
    </div>
  );
}

// ─── 列表模式（表格行） ───────────────────────────────────────────────────────
function RecordListRow({ record, index, token }: { record: RecordData; index: number; token: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const nodeName = record.remark || `节点 ${index + 1}`;
  // 列表模式下独立读取备注，用于在节点名称上方显示
  const remarkKey = `remark_${token}_${record.id}`;
  const [localRemark, setLocalRemark] = useState<string>(() => {
    try { return localStorage.getItem(remarkKey) || ""; } catch { return ""; }
  });
  // 备注保存后同步显示（监听 storage 事件）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === remarkKey) {
        try { setLocalRemark(localStorage.getItem(remarkKey) || ""); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [remarkKey]);
  // 备注弹窗关闭后也刷新（同页内不触发 storage 事件）
  const handleRemarkChange = useCallback(() => {
    try { setLocalRemark(localStorage.getItem(remarkKey) || ""); } catch { /* ignore */ }
  }, [remarkKey]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 space-y-2">
        {/* 第一行：序号 + 名称区域 + 协议标签 */}
        <div className="flex items-start gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 text-xs flex items-center justify-center flex-shrink-0 font-medium mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            {/* 备注内容显示在节点名称上方（小字体） */}
            {localRemark && (
              <div className="text-xs text-yellow-300/70 mb-0.5 truncate">{localRemark}</div>
            )}
            <div className="text-white text-sm font-medium truncate">{nodeName}</div>
            <div className="text-white/40 text-xs font-mono mt-0.5">{record.accelerateIp}:{record.acceleratePort}</div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex-shrink-0 mt-0.5">
            {record.protocol?.toUpperCase() || "VMESS"}
          </span>
        </div>

        {/* 第二行：操作按钮组（自动换行） */}
        <div className="flex items-center gap-2 flex-wrap pl-8">
          {record.vmessLink && (
            <CopyButton text={record.vmessLink} label="VMess" />
          )}
          {record.clashLink && (
            <>
              <CopyButton text={record.clashLink} label="Clash" />
              <ClashImportButton clashLink={record.clashLink} />
            </>
          )}
          {record.vmessLink && (
            <button
              onClick={() => setQrOpen(!qrOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 hover:border-white/40 active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              {qrOpen ? "收起" : "二维码"}
            </button>
          )}
          {/* 备注按钮：传入 mode="list"，弹窗用 fixed 定位，备注保存后回调刷新显示 */}
          <RemarkPopover
            token={token}
            recordId={record.id}
            nodeName={nodeName}
            mode="list"
            onSaved={handleRemarkChange}
          />
        </div>
      </div>

      {/* 展开的二维码 */}
      {qrOpen && record.vmessLink && (
        <div className="border-t border-white/10 px-4 py-4 flex justify-center bg-white/3">
          <div className="p-3 bg-white rounded-xl inline-block">
            <QRCodeSVG value={record.vmessLink} size={160} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 状态页：链接无效 ─────────────────────────────────────────────────────────
function InvalidPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">链接无效</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          您访问的链接不存在或已被删除，请联系您的服务提供商获取正确的访问链接。
        </p>
      </div>
    </div>
  );
}

// ─── 状态页：链接已失效 ───────────────────────────────────────────────────────
function DisabledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">链接已失效</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          您的访问链接已被停用，请联系您的服务提供商重新获取有效链接。
        </p>
      </div>
    </div>
  );
}

// ─── 加载骨架屏 ───────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded-xl w-48" />
          <div className="h-4 bg-white/5 rounded-lg w-64" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function ShareView() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  // 默认列表模式
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data, isLoading, error } = trpc.share.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (!token) return <InvalidPage />;
  if (isLoading) return <LoadingSkeleton />;
  if (error || !data) return <InvalidPage />;
  if (data.status === "not_found") return <InvalidPage />;
  if (data.status === "disabled") return <DisabledPage />;

  const { group, records } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 pb-16">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{group?.customerName || "配置信息"}</h1>
              <p className="text-white/40 text-xs mt-0.5">专属访问链接 · 仅供本人使用</p>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-white">{records.length}</div>
              <div className="text-xs text-white/40 mt-0.5">节点数量</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-emerald-400">
                {records.filter((r) => r.status === "success").length}
              </div>
              <div className="text-xs text-white/40 mt-0.5">可用节点</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center flex-1">
              <div className="text-sm font-medium text-white/60">
                {group?.createdAt ? new Date(group.createdAt).toLocaleDateString("zh-CN") : "-"}
              </div>
              <div className="text-xs text-white/40 mt-0.5">创建日期</div>
            </div>
          </div>
        </div>

        {/* 视图模式切换 */}
        {records.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/40 text-sm">{records.length} 个节点</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  viewMode === "card"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                卡片
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  viewMode === "list"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                列表
              </button>
            </div>
          </div>
        )}

        {/* 记录列表 */}
        {records.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">暂无配置数据</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="flex flex-col gap-4">
            {records.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} token={token} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((record, index) => (
              <RecordListRow key={record.id} record={record} index={index} token={token} />
            ))}
          </div>
        )}

        {/* 使用提示 */}
        {records.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/8">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-white/30 leading-relaxed space-y-1">
                <p><span className="text-white/50 font-medium">VMess 链接：</span>可复制后在 v2rayN、Shadowrocket 等客户端中手动添加节点。</p>
                <p><span className="text-white/50 font-medium">导入 Clash：</span>点击「导入 Clash」按钮可直接唤醒 Clash / ClashX / ClashVerge 等客户端并自动导入节点。</p>
                <p><span className="text-white/50 font-medium">二维码：</span>可使用手机客户端（如 Shadowrocket）扫码导入。</p>
                <p><span className="text-white/50 font-medium">备注：</span>点击「备注」可为节点添加个人标注，仅保存在本设备浏览器中。</p>
              </div>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-6 text-center text-white/20 text-xs">
          请妥善保管您的专属链接，切勿分享给他人
        </div>
      </div>
    </div>
  );
}
