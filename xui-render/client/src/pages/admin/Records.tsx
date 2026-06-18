import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, FolderPlus, FolderSymlink, RefreshCw, QrCode, Zap, Trash2, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import CreateGroupDialog from "./CreateGroupDialog";
import AddToGroupDialog from "./AddToGroupDialog";

type FilterType = "all" | "assigned" | "unassigned";

// Clash 客户端列表
const CLASH_CLIENTS = [
  { label: "Clash for Windows",      scheme: "clash" },
  { label: "Clash Verge / Nyanpasu", scheme: "clash-verge" },
  { label: "ClashX (Mac)",           scheme: "clashx" },
  { label: "ClashX Pro (Mac)",       scheme: "clashx-pro" },
];

// Clash 导入下拉按钮
function ClashImportDropdown({ clashLink, onStopPropagation }: { clashLink: string; onStopPropagation?: (e: React.MouseEvent) => void }) {
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
    toast.info("正在唤醒 Clash 客户端导入订阅...", { duration: 3000 });
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { onStopPropagation?.(e); setOpen(v => !v); }}
        className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
        title="一键导入 Clash"
      >
        <Zap className="w-3 h-3" />
        导入
        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 min-w-[180px] rounded-xl border border-white/20 bg-gray-900/95 backdrop-blur-sm shadow-xl overflow-hidden">
          {CLASH_CLIENTS.map(c => (
            <button
              key={c.scheme}
              onClick={(e) => { e.stopPropagation(); handleSelect(c.scheme); }}
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

// 二维码预览对话框（动态生成）
function QrPreviewDialog({ vmessLink, onClose }: { vmessLink: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">VMess 二维码</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={vmessLink} size={192} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Records() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [qrVmessLink, setQrVmessLink] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();
  const { data: records = [], isLoading, refetch } = trpc.admin.getRecords.useQuery({ filter });

  const deleteRecord = trpc.admin.deleteRecord.useMutation({
    onSuccess: () => {
      toast.success("记录已删除");
      refetch();
      setDeleteConfirmId(null);
    },
    onError: () => toast.error("删除失败"),
  });

  const deleteRecordsBatch = trpc.admin.deleteRecordsBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`已删除 ${data.deleted} 条记录`);
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
      refetch();
    },
    onError: () => toast.error("批量删除失败"),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  };


  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      success: { label: "成功", variant: "default" },
      failed: { label: "失败", variant: "destructive" },
      skipped: { label: "跳过", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">所有记录</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {records.length} 条记录
            {selectedIds.size > 0 && (
              <span className="ml-2 text-primary font-medium">已选 {selectedIds.size} 条</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={(v) => { setFilter(v as FilterType); setSelectedIds(new Set()); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部记录</SelectItem>
              <SelectItem value="unassigned">未分配</SelectItem>
              <SelectItem value="assigned">已分配</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            刷新
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                <FolderPlus className="w-4 h-4 mr-1.5" />
                创建分组（{selectedIds.size}）
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddToGroup(true)}>
                <FolderSymlink className="w-4 h-4 mr-1.5" />
                添加到分组（{selectedIds.size}）
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowBatchDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                批量删除（{selectedIds.size}）
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={records.length > 0 && selectedIds.size === records.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>面板 ID</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>加速IP:端口</TableHead>
                <TableHead>协议</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>VMess 链接</TableHead>
                <TableHead>Clash 订阅</TableHead>
                <TableHead>二维码</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow
                    key={record.id}
                    className={`border-white/10 cursor-pointer transition-colors ${
                      selectedIds.has(record.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleSelect(record.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[140px] truncate">
                      {record.panelId}
                    </TableCell>
                    <TableCell className="text-sm max-w-[100px] truncate">
                      {record.remark || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {record.accelerateIp}:{record.acceleratePort}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(record.protocol || "vmess").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.vmessLink ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyText(record.vmessLink!); }}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          复制
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.clashLink ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyText(record.clashLink!); }}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            复制
                          </button>
                          <ClashImportDropdown
                            clashLink={record.clashLink!}
                            onStopPropagation={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.vmessLink ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setQrVmessLink(record.vmessLink!); }}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <QrCode className="w-3 h-3" />
                          查看
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteConfirmId(record.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateGroupDialog
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          setSelectedIds(new Set());
          setShowCreateGroup(false);
          refetch();
        }}
      />

      <AddToGroupDialog
        open={showAddToGroup}
        onClose={() => setShowAddToGroup(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          setSelectedIds(new Set());
          setShowAddToGroup(false);
          refetch();
        }}
      />

      {qrVmessLink && (
        <QrPreviewDialog vmessLink={qrVmessLink} onClose={() => setQrVmessLink(null)} />
      )}

      {/* 单条删除确认 */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该记录，且无法恢复。确定要删除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && deleteRecord.mutate({ recordId: deleteConfirmId })}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除确认</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <strong>{selectedIds.size}</strong> 条记录，此操作不可恢复。确定继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRecordsBatch.mutate({ recordIds: Array.from(selectedIds) })}
            >
              确认删除 {selectedIds.size} 条
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
