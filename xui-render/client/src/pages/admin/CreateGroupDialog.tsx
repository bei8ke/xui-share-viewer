import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Check, Users } from "lucide-react";
import { useState as useLocalState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess: () => void;
}

export default function CreateGroupDialog({ open, onClose, selectedIds, onSuccess }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const createGroup = trpc.admin.createGroup.useMutation({
    onSuccess: (data) => {
      const origin = window.location.origin;
      const link = `${origin}/s/${data.groupToken}`;
      setCreatedLink(link);
      utils.admin.getGroups.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("分组创建成功！");
    },
    onError: (err) => {
      toast.error(`创建失败：${err.message}`);
    },
  });

  const handleCreate = () => {
    if (!customerName.trim()) {
      toast.error("请输入客户名称");
      return;
    }
    createGroup.mutate({
      customerName: customerName.trim(),
      description: description.trim() || undefined,
      recordIds: selectedIds,
    });
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      toast.success("链接已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const handleClose = () => {
    setCustomerName("");
    setDescription("");
    setCreatedLink(null);
    setCopied(false);
    onClose();
    if (createdLink) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            创建客户分组
          </DialogTitle>
        </DialogHeader>

        {!createdLink ? (
          <>
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                已选择 <strong className="text-foreground">{selectedIds.length}</strong> 条记录，将分配到新分组。
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">客户名称 *</Label>
                <Input
                  id="customerName"
                  placeholder="例如：张三、客户A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">备注（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="分组备注信息..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createGroup.isPending || !customerName.trim()}
              >
                {createGroup.isPending ? "创建中..." : "创建分组"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">分组创建成功</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    客户专属链接已生成，请复制后发送给客户
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">客户专属访问链接</p>
                <p className="text-sm font-mono break-all text-foreground leading-relaxed">
                  {createdLink}
                </p>
              </div>

              <Button className="w-full" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-400" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                完成
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
