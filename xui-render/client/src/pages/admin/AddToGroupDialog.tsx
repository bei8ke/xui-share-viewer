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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface AddToGroupDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess: () => void;
}

export default function AddToGroupDialog({
  open,
  onClose,
  selectedIds,
  onSuccess,
}: AddToGroupDialogProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: groups = [], isLoading: groupsLoading } = trpc.admin.getGroups.useQuery(
    undefined,
    { enabled: open }
  );

  const addToGroup = trpc.admin.addRecordsToGroup.useMutation({
    onSuccess: () => {
      utils.admin.getGroups.invalidate();
      utils.admin.getStats.invalidate();
      toast.success(`已将 ${selectedIds.length} 条记录添加到分组`);
      handleClose();
      onSuccess();
    },
    onError: (err) => {
      toast.error(`操作失败：${err.message}`);
    },
  });

  const handleAdd = () => {
    if (!selectedGroupId) {
      toast.error("请选择一个分组");
      return;
    }
    addToGroup.mutate({
      groupId: parseInt(selectedGroupId),
      recordIds: selectedIds,
    });
  };

  const handleClose = () => {
    setSelectedGroupId("");
    onClose();
  };

  const activeGroups = groups.filter((g) => g.status === "active");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            添加到已有分组
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            已选择 <strong className="text-foreground">{selectedIds.length}</strong> 条记录，将添加到所选分组。
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">选择分组</label>
            {groupsLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : activeGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">暂无活跃分组，请先创建分组</p>
            ) : (
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择分组..." />
                </SelectTrigger>
                <SelectContent>
                  {activeGroups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.customerName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({group.recordCount} 条记录)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleAdd}
            disabled={addToGroup.isPending || !selectedGroupId || activeGroups.length === 0}
          >
            {addToGroup.isPending ? "添加中..." : "确认添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
