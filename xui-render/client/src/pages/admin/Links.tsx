import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Power, PowerOff, RefreshCw, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function Links() {
  const utils = trpc.useUtils();
  const { data: groups = [], isLoading, refetch } = trpc.admin.getGroups.useQuery();

  const [editTarget, setEditTarget] = useState<{ id: number; customerName: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [regenerateTarget, setRegenerateTarget] = useState<{ id: number; customerName: string } | null>(null);

  const toggleStatus = trpc.admin.toggleGroupStatus.useMutation({
    onSuccess: () => {
      utils.admin.getGroups.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("状态已更新");
    },
    onError: (err) => toast.error(`操作失败：${err.message}`),
  });

  const updateGroup = trpc.admin.updateGroup.useMutation({
    onSuccess: () => {
      utils.admin.getGroups.invalidate();
      toast.success("更新成功");
      setEditTarget(null);
    },
    onError: (err) => toast.error(`更新失败：${err.message}`),
  });

  const regenerateToken = trpc.admin.updateGroup.useMutation({
    onSuccess: (data) => {
      utils.admin.getGroups.invalidate();
      toast.success("链接已更换，旧链接立即失效");
      setRegenerateTarget(null);
      // 自动复制新链接
      if (data.groupToken) {
        const newLink = `${window.location.origin}/s/${data.groupToken}`;
        navigator.clipboard.writeText(newLink).catch(() => {});
        toast.info("新链接已自动复制到剪贴板");
      }
    },
    onError: (err) => toast.error(`更换失败：${err.message}`),
  });

  const copyLink = async (groupToken: string) => {
    const link = `${window.location.origin}/s/${groupToken}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const openLink = (groupToken: string) => {
    window.open(`${window.location.origin}/s/${groupToken}`, "_blank");
  };

  const openEdit = (group: { id: number; customerName: string }) => {
    setEditTarget(group);
    setEditName(group.customerName);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">链接管理</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            管理所有客户专属访问链接，支持编辑名称和更换链接
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          刷新
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">暂无链接，请先在「分组管理」中创建分组</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const link = `${window.location.origin}/s/${group.groupToken}`;
            return (
              <div
                key={group.id}
                className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{group.customerName}</span>
                        {group.status === "active" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                            活跃
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.recordCount} 条记录 · 创建于 {new Date(group.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 编辑客户名称 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => openEdit({ id: group.id, customerName: group.customerName })}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      编辑名称
                    </Button>
                    {/* 更换链接（重新生成 token） */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      onClick={() => setRegenerateTarget({ id: group.id, customerName: group.customerName })}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      更换链接
                    </Button>
                    {/* 复制链接 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => copyLink(group.groupToken)}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      复制链接
                    </Button>
                    {/* 新标签页打开 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="在新标签页打开"
                      onClick={() => openLink(group.groupToken)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {/* 禁用/启用 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={group.status === "active" ? "禁用链接" : "启用链接"}
                      onClick={() =>
                        toggleStatus.mutate({
                          groupId: group.id,
                          status: group.status === "active" ? "disabled" : "active",
                        })
                      }
                    >
                      {group.status === "active" ? (
                        <PowerOff className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Power className="w-4 h-4 text-emerald-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 链接展示 */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                  <span
                    className={`flex-1 text-xs font-mono truncate ${
                      group.status === "disabled" ? "line-through text-muted-foreground/50" : "text-muted-foreground"
                    }`}
                  >
                    {link}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑客户名称弹窗 */}
      <Dialog open={editTarget !== null} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑客户名称</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="输入新的客户名称"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editName.trim() && editTarget) {
                  updateGroup.mutate({ groupId: editTarget.id, customerName: editName.trim() });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button
              onClick={() => {
                if (editName.trim() && editTarget) {
                  updateGroup.mutate({ groupId: editTarget.id, customerName: editName.trim() });
                }
              }}
              disabled={!editName.trim() || updateGroup.isPending}
            >
              {updateGroup.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更换链接确认弹窗 */}
      <AlertDialog open={regenerateTarget !== null} onOpenChange={() => setRegenerateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认更换链接？</AlertDialogTitle>
            <AlertDialogDescription>
              更换后，客户 <strong>{regenerateTarget?.customerName}</strong> 的旧链接将<strong>立即失效</strong>，
              需要将新链接重新发送给客户。新链接将自动复制到剪贴板。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => {
                if (regenerateTarget) {
                  regenerateToken.mutate({ groupId: regenerateTarget.id, regenerateToken: true });
                }
              }}
            >
              确认更换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
