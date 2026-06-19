import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PlusCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddManualRecordDialog({ open, onClose, onSuccess }: Props) {
  const [remark, setRemark] = useState("");
  const [nodeLink, setNodeLink] = useState("");
  const [clashLink, setClashLink] = useState("");
  const [groupId, setGroupId] = useState<string>("none");

  const { data: groupsData } = trpc.admin.getGroups.useQuery(undefined, { enabled: open });
  const activeGroups = (groupsData ?? []).filter((g) => g.status === "active");

  const addRecord = trpc.admin.addManualRecord.useMutation({
    onSuccess: () => {
      toast.success("节点已录入");
      handleClose();
      onSuccess();
    },
    onError: (err) => {
      toast.error(`录入失败：${err.message}`);
    },
  });

  const handleClose = () => {
    setRemark("");
    setNodeLink("");
    setClashLink("");
    setGroupId("none");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim()) { toast.error("请填写节点名称"); return; }
    if (!nodeLink.trim()) { toast.error("请填写节点链接"); return; }

    addRecord.mutate({
      remark: remark.trim(),
      nodeLink: nodeLink.trim(),
      clashLink: clashLink.trim() || undefined,
      groupId: groupId !== "none" ? Number(groupId) : undefined,
    });
  };

  // 根据链接前缀自动识别协议
  const detectedProtocol = (() => {
    const l = nodeLink.toLowerCase();
    if (l.startsWith("vmess://")) return "VMess";
    if (l.startsWith("vless://")) return "VLESS";
    if (l.startsWith("trojan://")) return "Trojan";
    if (l.startsWith("ss://")) return "Shadowsocks";
    if (l.startsWith("ssr://")) return "ShadowsocksR";
    return nodeLink ? "未知协议" : "";
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            手动录入节点
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* 节点名称 */}
          <div className="space-y-1.5">
            <Label htmlFor="mr-remark">
              节点名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mr-remark"
              placeholder="例如：香港节点 01"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={256}
              autoFocus
            />
          </div>

          {/* 节点链接 */}
          <div className="space-y-1.5">
            <Label htmlFor="mr-nodelink">
              节点链接 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mr-nodelink"
              placeholder="vmess:// 或 vless:// 或 trojan:// 等"
              value={nodeLink}
              onChange={(e) => setNodeLink(e.target.value)}
            />
            {detectedProtocol && (
              <p className="text-xs text-muted-foreground">
                识别协议：
                <span className="font-medium text-primary">{detectedProtocol}</span>
              </p>
            )}
          </div>

          {/* Clash 订阅链接（可选） */}
          <div className="space-y-1.5">
            <Label htmlFor="mr-clashlink">
              Clash 订阅链接
              <span className="text-muted-foreground text-xs ml-1">（可选）</span>
            </Label>
            <Input
              id="mr-clashlink"
              placeholder="https://... 或留空"
              value={clashLink}
              onChange={(e) => setClashLink(e.target.value)}
            />
          </div>

          {/* 选择分组 */}
          <div className="space-y-1.5">
            <Label>
              加入分组
              <span className="text-muted-foreground text-xs ml-1">（可选，也可录入后再分配）</span>
            </Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="不加入分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不加入分组</SelectItem>
                {activeGroups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.customerName}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({g.recordCount} 条)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={addRecord.isPending}>
              {addRecord.isPending ? "录入中..." : "确认录入"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
