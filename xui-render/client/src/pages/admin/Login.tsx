import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("登录成功");
        window.location.href = "/admin";
      } else {
        toast.error(data.error || "登录失败");
      }
    } catch (err) {
      toast.error("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center w-full max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">管理员登录</h1>
        <p className="text-muted-foreground text-sm mb-8">
          请输入管理员密码以访问后台
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="请输入管理员密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-center"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </div>
    </div>
  );
}
