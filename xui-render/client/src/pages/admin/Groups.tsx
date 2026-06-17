import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Copy, Eye, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GroupDetailSheet from "./GroupDetailSheet";

export default function Groups() {
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [detailGroupId, setDetailGroupId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: groups = [], isLoading, refetch } = trpc.admin.getGroups.useQuery();

  const toggleStatus = trpc.admin.toggleGroupStatus.useMutation({
    onSuccess: () => {
      utils.admin.getGroups.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("状态已更新");
    },
    onError: (err) => toast.error(`操作失败：${err.message}`),
  });

  const deleteGroup = trpc.admin.deleteGroup.useMutation({
    onSuccess: () => {
      utils.admin.getGroups.invalidate();
      utils.admin.getStats.invalidate();
      setDeleteTarget(null);
      toast.success("分组已删除");
    },
    onError: (err) => toast.error(`删除失败：${err.message}`),
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">分组管理</h2>
          <p className="text-muted-foreground mt-1 text-sm">共 {groups.length} 个客户分组</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          刷新
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>客户名称</TableHead>
                <TableHead>记录数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    暂无分组，请在「所有记录」页面选择记录后创建分组
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id} className="border-white/10">
                    <TableCell className="font-medium">{group.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.recordCount} 条</Badge>
                    </TableCell>
                    <TableCell>
                      {group.status === "active" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                          已禁用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">
                      {group.description || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(group.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="查看详情"
                          onClick={() => setDetailGroupId(group.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="复制链接"
                          onClick={() => copyLink(group.groupToken)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={group.status === "active" ? "禁用" : "启用"}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="删除分组"
                          onClick={() => setDeleteTarget(group.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分组？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，该分组的客户专属链接将立即失效，且无法恢复。分组内的记录数据不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteGroup.mutate({ groupId: deleteTarget })}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 分组详情侧边栏 */}
      {detailGroupId && (
        <GroupDetailSheet
          groupId={detailGroupId}
          onClose={() => setDetailGroupId(null)}
        />
      )}
    </div>
  );
}
