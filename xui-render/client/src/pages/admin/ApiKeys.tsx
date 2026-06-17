import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Copy, Key, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeys() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: keys = [], isLoading, refetch } = trpc.admin.getApiKeys.useQuery();

  const createKey = trpc.admin.createApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.rawKey);
      utils.admin.getApiKeys.invalidate();
      toast.success("API 密钥已创建");
    },
    onError: (err) => toast.error(`创建失败：${err.message}`),
  });

  const deleteKey = trpc.admin.deleteApiKey.useMutation({
    onSuccess: () => {
      utils.admin.getApiKeys.invalidate();
      setDeleteTarget(null);
      toast.success("密钥已删除");
    },
    onError: (err) => toast.error(`删除失败：${err.message}`),
  });

  const toggleKey = trpc.admin.toggleApiKey.useMutation({
    onSuccess: () => {
      utils.admin.getApiKeys.invalidate();
      toast.success("状态已更新");
    },
    onError: (err) => toast.error(`操作失败：${err.message}`),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("请输入密钥名称");
      return;
    }
    createKey.mutate({ name: newKeyName.trim() });
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success("密钥已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setNewKeyName("");
    setCreatedKey(null);
    setCopied(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">API 密钥</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            管理本地端工具的数据推送密钥
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            刷新
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            创建密钥
          </Button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
        <p className="font-medium text-blue-300 mb-1">本地端配置说明</p>
        <p className="text-blue-200/70 text-xs leading-relaxed">
          在本地端工具的配置文件中填入 API 密钥和服务地址：
          <br />
          <code className="font-mono bg-blue-900/30 px-1.5 py-0.5 rounded mt-1 inline-block">
            API_URL: {window.location.origin}/api/import
          </code>
          <br />
          <code className="font-mono bg-blue-900/30 px-1.5 py-0.5 rounded mt-1 inline-block">
            API_KEY: xui_xxxxxxxx...（在下方创建）
          </code>
        </p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead>名称</TableHead>
              <TableHead>密钥前缀</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>使用次数</TableHead>
              <TableHead>最后使用</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  暂无密钥，点击「创建密钥」开始
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id} className="border-white/10">
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    {key.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        启用
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        禁用
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.usageCount} 次
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString("zh-CN")
                      : "从未使用"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(key.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => toggleKey.mutate({ keyId: key.id, isActive: !key.isActive })}
                      >
                        {key.isActive ? "禁用" : "启用"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(key.id)}
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

      {/* 创建密钥弹窗 */}
      <Dialog open={showCreate} onOpenChange={handleCloseCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              创建 API 密钥
            </DialogTitle>
          </DialogHeader>

          {!createdKey ? (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="keyName">密钥名称</Label>
                  <Input
                    id="keyName"
                    placeholder="例如：本地工具-主机A"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  <p className="text-xs text-muted-foreground">
                    用于标识密钥的用途，方便管理
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreate}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createKey.isPending || !newKeyName.trim()}>
                  {createKey.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4 space-y-4">
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Key className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">密钥创建成功</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      请立即复制并妥善保存，此后将不再显示完整密钥
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-400 mb-2 font-medium">⚠️ 仅显示一次</p>
                  <p className="text-sm font-mono break-all text-foreground">{createdKey}</p>
                </div>

                <Button className="w-full" onClick={handleCopyKey}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-emerald-400" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      复制密钥
                    </>
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreate}>
                  完成
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除密钥？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，使用该密钥的本地端工具将无法继续推送数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteKey.mutate({ keyId: deleteTarget })}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
