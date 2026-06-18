import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: number;
  customerName: string;
  description?: string | null;
  groupToken: string;
}

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  onSuccess: () => void;
}

export default function EditGroupDialog({
  open,
  onClose,
  group,
  onSuccess,
}: EditGroupDialogProps) {
  const [customerName, setCustomerName] = useState(group.customerName);
  const [description, setDescription] = useState(group.description ?? "");
  const [regenerateToken, setRegenerateToken] = useState(false);

  const updateGroup = trpc.admin.updateGroup.useMutation({
    onSuccess: (data) => {
      toast.success("分组信息已更新");
      if (regenerateToken && data.groupToken) {
        toast.info(`新 Token：${data.groupToken}`, { duration: 8000 });
      }
      onSuccess();
      handleClose();
    },
    onError: (err) => {
      toast.error(`更新失败：${err.message}`);
    },
  });

  const handleSave = () => {
    if (!customerName.trim()) {
      toast.error("客户名称不能为空");
      return;
    }
    updateGroup.mutate({
      groupId: group.id,
      customerName: customerName.trim(),
      regenerateToken,
    });
  };

  const handleClose = () => {
    setCustomerName(group.customerName);
    setDescription(group.description ?? "");
    setRegenerateToken(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            编辑分组信息
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-customerName">客户名称 *</Label>
            <Input
              id="edit-customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">备注（可选）</Label>
            <Textarea
              id="edit-description"
              placeholder="分组备注信息..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">重新生成访问 Token</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                开启后，原有客户链接将立即失效
              </p>
            </div>
            <Switch
              checked={regenerateToken}
              onCheckedChange={setRegenerateToken}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateGroup.isPending || !customerName.trim()}
          >
            {updateGroup.isPending ? "保存中..." : "保存修改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
