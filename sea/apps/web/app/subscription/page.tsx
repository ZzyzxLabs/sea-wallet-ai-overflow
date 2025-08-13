"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Tile } from "../../components/tile";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  RefreshCw,
  Search,
  Settings,
  Users,
  DollarSign,
  Pause,
  Play,
  XCircle,
  Wallet,
  Layers,
} from "lucide-react";
import { Transaction } from "@mysten/sui/transactions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";

// ----- Types -----
type Plan = {
  id: string;
  name: string;
  price: number; // monthly price in fiat for display (or use stable coin as unit)
  interval: "month" | "year";
  active: boolean;
  currency: "USD" | "TWD" | "SUI";
};

type Service = {
  id: string;
  title: string;
  description?: string;
  plans: Plan[];
  subscribers: number;
  monthlyRecurringRevenue: number; // MRR
  status: "active" | "paused";
};

type Subscription = {
  id: string;
  providerServiceId: string;
  provider: string; // service owner or name
  title: string; // service title
  planName: string;
  amount: number;
  currency: "USD" | "TWD" | "SUI";
  interval: "month" | "year";
  status: "active" | "paused" | "canceled";
  nextBillDate: string; // ISO date
};

const COIN_OPTIONS = [
  { symbol: "SUI", coinType: "0x2::sui::SUI", decimals: 9 },
  // 下面兩個僅示意，請換成你環境的實際 coinType
  { symbol: "USDC", coinType: "0x0000000000000000000000000000000000000002::usdc::USDC", decimals: 6 },
  { symbol: "USDT", coinType: "0x0000000000000000000000000000000000000003::usdt::USDT", decimals: 6 },
  { symbol: "Custom", coinType: "custom", decimals: 0 },
];

// ----- Mock (hardcode) data -----
const MOCK_MY_SERVICES: Service[] = [
  {
    id: "svc-001",
    title: "Pro Analytics API",
    description: "Real-time analytics & insights API for dApps",
    subscribers: 138,
    monthlyRecurringRevenue: 2760, // USD
    status: "active",
    plans: [
      { id: "pl-001", name: "Starter", price: 10, interval: "month", active: true, currency: "USD" },
      { id: "pl-002", name: "Pro", price: 25, interval: "month", active: true, currency: "USD" },
      { id: "pl-003", name: "Enterprise", price: 199, interval: "month", active: true, currency: "USD" },
    ],
  },
  {
    id: "svc-002",
    title: "NFT Media CDN",
    description: "Fast, resilient media CDN optimized for NFT content",
    subscribers: 42,
    monthlyRecurringRevenue: 945,
    status: "paused",
    plans: [
      { id: "pl-004", name: "Core", price: 15, interval: "month", active: true, currency: "USD" },
      { id: "pl-005", name: "Plus", price: 35, interval: "month", active: false, currency: "USD" },
    ],
  },
];

const MOCK_MY_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub-001",
    providerServiceId: "svc-101",
    provider: "Alice Labs",
    title: "On-chain Alerts",
    planName: "Pro",
    amount: 9.99,
    currency: "USD",
    interval: "month",
    status: "active",
    nextBillDate: "2025-09-01",
  },
  {
    id: "sub-002",
    providerServiceId: "svc-102",
    provider: "NodeX",
    title: "RPC Premium",
    planName: "Starter",
    amount: 15,
    currency: "USD",
    interval: "month",
    status: "paused",
    nextBillDate: "2025-08-20",
  },
  {
    id: "sub-003",
    providerServiceId: "svc-103",
    provider: "IndexHub",
    title: "Indexing Service",
    planName: "Team",
    amount: 49,
    currency: "USD",
    interval: "month",
    status: "canceled",
    nextBillDate: "—",
  },
];

// ----- Utils -----
function formatCurrency(value: number, currency: "USD" | "TWD" | "SUI") {
  if (currency === "SUI") return `${value} SUI`;
  if (currency === "TWD") return `NT$${value.toLocaleString("en-US")}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInterval(i: "month" | "year") {
  return i === "month" ? "/mo" : "/yr";
}

function statusBadge(status: Service["status"] | Subscription["status"]) {
  const base = "text-xs";
  switch (status) {
    case "active":
      return <Badge variant="secondary" className={base}>Active</Badge>;
    case "paused":
      return <Badge variant="outline" className={base}>Paused</Badge>;
    case "canceled":
      return <Badge variant="destructive" className={base}>Canceled</Badge>;
    default:
      return null;
  }
}

// ----- Page -----
export default function SubscriptionDashboard() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isRefreshing, setIsRefreshing] = useState(false);
 const [createOpen, setCreateOpen] = useState(false);
 const [form, setForm] = useState({
    serviceName: "",
    serviceAddr: "",
    yearDiscount: "",
    price: "",
    coinType: COIN_OPTIONS[0].coinType, // default SUI
    customCoinType: "",
 });

 // 封裝欄位變更
const setField = useCallback(
  (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v })),
  []
);

// 基本驗證（必要欄位、範圍）
const validateCreate = useCallback(() => {
  const errs: string[] = [];
  if (!form.serviceName.trim()) errs.push("Service Name is required");
  if (!form.serviceAddr.trim()) errs.push("Service Address is required");
  if (!form.price.trim() || Number.isNaN(Number(form.price)) || Number(form.price) <= 0)
    errs.push("Monthly Price must be a positive number");
  const yd = Number(form.yearDiscount);
  if (form.yearDiscount.trim() && (Number.isNaN(yd) || yd < 0 || yd > 100))
    errs.push("Year Discount must be between 0 and 100");
  const selected = form.coinType === "custom" ? form.customCoinType.trim() : form.coinType;
  if (!selected) errs.push("coinType is required");
  // 粗略檢查 coinType 型別格式（允許自訂略過）
  if (form.coinType !== "custom" && !/^0x[a-fA-F0-9]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+$/.test(selected)) {
    errs.push("coinType format looks invalid");
  }
  return errs;
}, [form]);

  // My services & subscribers
  const [services, setServices] = useState<Service[]>(MOCK_MY_SERVICES);
  const totalMRR = useMemo(
    () => services.reduce((sum, s) => sum + s.monthlyRecurringRevenue, 0),
    [services]
  );
  const totalSubs = useMemo(
    () => services.reduce((sum, s) => sum + s.subscribers, 0),
    [services]
  );

  // My subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(MOCK_MY_SUBSCRIPTIONS);
  const [search, setSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<"all" | "active" | "paused" | "canceled">("all");

  const filteredSubscriptions = useMemo(() => {
    const s = search.trim().toLowerCase();
    return subscriptions.filter((sub) => {
      const matchText =
        sub.title.toLowerCase().includes(s) ||
        sub.provider.toLowerCase().includes(s) ||
        sub.planName.toLowerCase().includes(s);
      const matchStatus = subStatusFilter === "all" ? true : sub.status === subStatusFilter;
      return matchText && matchStatus;
    });
  }, [subscriptions, search, subStatusFilter]);

  const handleCreateService = useCallback(() => {
  const errs = validateCreate();
  if (errs.length > 0) {
    alert("Please fix the following:\n\n" + errs.join("\n"));
    return;
  }

  const monthPrice = Number(form.price);
  const yd = form.yearDiscount.trim() ? Number(form.yearDiscount) : 0;
  const yearPrice = Math.max(0, monthPrice * 12 * (1 - yd / 100));
  const chosen = form.coinType === "custom" ? form.customCoinType.trim() : form.coinType;

  // 估計 symbol（若為 custom，從最後一段取）
  const symbolGuess =
    form.coinType === "custom"
      ? (chosen.split("::").pop() || "COIN").toUpperCase()
      : (COIN_OPTIONS.find((c) => c.coinType === form.coinType)?.symbol || "COIN");

  // 將新服務加入 services（保持你原先 Service 型別結構）
  const newService: Service = {
    id: `svc-${Date.now()}`,
    title: form.serviceName.trim(),
    description: `Service at ${form.serviceAddr.trim()}`,
    subscribers: 0,
    monthlyRecurringRevenue: 0,
    status: "active",
    plans: [
      {
        id: `pl-${Date.now()}-m`,
        name: "Monthly",
        price: monthPrice,
        interval: "month",
        active: true,
        currency: "SUI", // 僅作展示；實際用 coinType
        // @ts-ignore - 擴充屬性（若你要嚴格 typing，可把 Plan 型別加上 coinType/symbol）
        coinType: chosen,
        // @ts-ignore
        symbol: symbolGuess,
      },
      {
        id: `pl-${Date.now()}-y`,
        name: `Yearly (-${yd || 0}%)`,
        price: Number(yearPrice.toFixed(6)),
        interval: "year",
        active: true,
        currency: "SUI",
        // @ts-ignore
        coinType: chosen,
        // @ts-ignore
        symbol: symbolGuess,
      },
    ],
  };

  setServices((prev) => [newService, ...prev]);

  // reset & close
  setForm({
    serviceName: "",
    serviceAddr: "",
    yearDiscount: "",
    price: "",
    coinType: COIN_OPTIONS[0].coinType,
    customCoinType: "",
  });
  setCreateOpen(false);
}, [form, setServices, validateCreate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // TODO: 接上鏈上/後端拉取最新訂閱、服務資料
      await new Promise((res) => setTimeout(res, 600));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ----- Actions: My Services -----
  const toggleServiceStatus = useCallback((svc: Service) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svc.id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s
      )
    );
  }, []);

  // ----- Actions: My Subscriptions -----
  const mutateSubscription = useCallback(
    (id: string, next: Partial<Subscription>) => {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));
    },
    []
  );

  const onPause = useCallback(
    async (sub: Subscription) => {
      if (sub.status !== "active") return;
      // TODO: 接實際 Move call / 後端操作
      mutateSubscription(sub.id, { status: "paused" });
    },
    [mutateSubscription]
  );

  const onResume = useCallback(
    async (sub: Subscription) => {
      if (sub.status !== "paused") return;
      mutateSubscription(sub.id, { status: "active" });
    },
    [mutateSubscription]
  );

  const onCancel = useCallback(
    async (sub: Subscription) => {
      if (sub.status === "canceled") return;
      // TODO: 接實際取消流程
      mutateSubscription(sub.id, { status: "canceled", nextBillDate: "—" });
    },
    [mutateSubscription]
  );

  // （範例）如需串鏈上：使用 signAndExecuteTransaction + Move call
  const exampleMoveCall = useCallback(async () => {
    if (!account?.address) {
      alert("Please connect your wallet first.");
      return;
    }
    const tx = new Transaction();
    // TODO: tx.moveCall({...}) 接你的 subscription module
    signAndExecuteTransaction(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: () => console.log("Tx success"),
        onError: (e) => console.error("Tx error", e),
      }
    );
  }, [account?.address, signAndExecuteTransaction]);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold tracking-tight">Vault Console</div>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <ConnectButton />
            </nav>
          </div>
          <div />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Page Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Dashboard</h1>
          <p className="text-slate-400">
            Manage your services and subscriptions in one place. View MRR, subscribers, and more.
          </p>
        </div>

        {/* Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile title="Total MRR" description="Monthly Recurring Revenue">
            <div className="flex items-center justify-between p-2">
              <div className="text-2xl font-semibold">{formatCurrency(totalMRR, "USD")}</div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </Tile>
          <Tile title="Total Subscribers" description="Across all services">
            <div className="flex items-center justify-between p-2">
              <div className="text-2xl font-semibold">{totalSubs}</div>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </Tile>
          <Tile title="Connected Wallet" description="Current account">
            <div className="flex items-center justify-between p-2">
              <div className="font-mono text-sm">
                {account?.address ? `${account.address.slice(0, 8)}...${account.address.slice(-6)}` : "—"}
              </div>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </Tile>
        </div>

        {/* My Services */}
        <Tile
            title="My Services"
            description="Service you provide to others"
            headerExtra={
                <div className="flex items-center gap-2">
                {/* 新增 Create Service 按鈕 */}
                <Button
                variant="default"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCreateOpen(true)}
                >
                + Create Service
                </Button>

                <Badge variant="secondary" className="text-xs">
                    {services.length} services
                </Badge>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8"
                >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                </div>
            }
            minHeight="min-h-[18rem]"
            >
          {services.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              No services yet.
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((svc) => (
                <div key={svc.id} className="p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="font-medium">{svc.title}</span>
                        {statusBadge(svc.status)}
                        <Badge variant="outline" className="text-xs">
                          {svc.subscribers} subs
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          MRR {formatCurrency(svc.monthlyRecurringRevenue, "USD")}
                        </Badge>
                      </div>
                      {svc.description && (
                        <div className="text-sm text-muted-foreground">{svc.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Plans:&nbsp;
                        {svc.plans.map((p) => (
                          <span key={p.id} className="mr-2">
                            <span className="font-medium">{p.name}</span>{" "}
                            <span className="font-mono">
                              {formatCurrency(p.price, p.currency)}
                              {formatInterval(p.interval)}
                            </span>{" "}
                            {p.active ? "" : <em>(inactive)</em>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleServiceStatus(svc)}
                        className="h-8 text-xs"
                      >
                        {svc.status === "active" ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" /> Resume
                          </>
                        )}
                      </Button>
                      <Button variant="default" size="sm" className="h-8 text-xs">
                        <Settings className="h-3 w-3 mr-1" /> Manage
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tile>

        {/* My Subscriptions */}
        <Tile
          title="My Subscriptions"
          description="Services you are subscribed to"
          headerExtra={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 opacity-70" />
                <Input
                  placeholder="Search..."
                  className="pl-7 h-8 w-44"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Button
                  variant={subStatusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSubStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={subStatusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSubStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={subStatusFilter === "paused" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSubStatusFilter("paused")}
                >
                  Paused
                </Button>
                <Button
                  variant={subStatusFilter === "canceled" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSubStatusFilter("canceled")}
                >
                  Canceled
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          }
          minHeight="min-h-[20rem]"
        >
          {filteredSubscriptions.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              No subscriptions.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubscriptions.map((sub) => (
                <div key={sub.id} className="p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{sub.title}</span>
                        {statusBadge(sub.status)}
                        <Badge variant="outline" className="text-xs">
                          {sub.provider}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {sub.planName}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Billing:{" "}
                        <span className="font-mono">
                          {formatCurrency(sub.amount, sub.currency)}
                          {formatInterval(sub.interval)}
                        </span>{" "}
                        · Next bill:{" "}
                        <span className="font-mono">{sub.nextBillDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sub.status !== "active"}
                        onClick={() => onPause(sub)}
                        className="h-8 text-xs"
                      >
                        <Pause className="h-3 w-3 mr-1" /> Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sub.status !== "paused"}
                        onClick={() => onResume(sub)}
                        className="h-8 text-xs"
                      >
                        <Play className="h-3 w-3 mr-1" /> Resume
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={sub.status === "canceled"}
                        onClick={() => onCancel(sub)}
                        className="h-8 text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Debug (dev only) */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Debug Information
              </summary>
              <div className="mt-2 space-y-2">
                <div className="text-xs">
                  <h4 className="font-medium mb-1">Account:</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify({ address: account?.address }, null, 2)}
                  </pre>
                </div>
                <div className="text-xs">
                  <h4 className="font-medium mb-1">Services:</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(services, null, 2)}
                  </pre>
                </div>
                <div className="text-xs">
                  <h4 className="font-medium mb-1">Subscriptions:</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(subscriptions, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </Tile>
      </main>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
  <DialogContent className="sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle>Create Service</DialogTitle>
    </DialogHeader>

    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-4 items-center gap-3">
        <Label htmlFor="serviceName" className="text-right">
          Service Name
        </Label>
        <Input
          id="serviceName"
          placeholder="e.g., Pro Analytics API"
          className="col-span-3"
          value={form.serviceName}
          onChange={(e) => setField("serviceName", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label htmlFor="serviceAddr" className="text-right">
          Service Address
        </Label>
        <Input
          id="serviceAddr"
          placeholder="e.g., service owner address or object id"
          className="col-span-3"
          value={form.serviceAddr}
          onChange={(e) => setField("serviceAddr", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label htmlFor="price" className="text-right">
          Monthly Price
        </Label>
        <Input
          id="price"
          type="number"
          step="0.000001"
          min="0"
          placeholder="e.g., 1.5"
          className="col-span-3"
          value={form.price}
          onChange={(e) => setField("price", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label htmlFor="yearDiscount" className="text-right">
          Year Discount (%)
        </Label>
        <Input
          id="yearDiscount"
          type="number"
          min="0"
          max="100"
          step="1"
          placeholder="e.g., 20"
          className="col-span-3"
          value={form.yearDiscount}
          onChange={(e) => setField("yearDiscount", e.target.value)}
        />
      </div>

      {/* Coin Selector */}
      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="text-right">Coin Type</Label>
        <div className="col-span-3">
          <Select
            value={form.coinType}
            onValueChange={(v) => setField("coinType", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select coin" />
            </SelectTrigger>
            <SelectContent>
              {COIN_OPTIONS.map((c) => (
                <SelectItem key={c.coinType} value={c.coinType}>
                  {c.symbol} {c.coinType !== "custom" ? `· ${c.coinType}` : "(Custom)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {form.coinType === "custom" && (
            <Input
              className="mt-2"
              placeholder="Enter full coinType, e.g. 0x2::sui::SUI"
              value={form.customCoinType}
              onChange={(e) => setField("customCoinType", e.target.value)}
            />
          )}
        </div>
      </div>

      {/* 預覽區（可選） */}
      <div className="rounded-md border p-3 text-xs text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">Preview</div>
        <div>Name: {form.serviceName || "—"}</div>
        <div>Addr: {form.serviceAddr || "—"}</div>
        <div>
          Price (Monthly): {form.price || "—"} {form.coinType === "custom"
            ? (form.customCoinType ? `(${form.customCoinType})` : "")
            : `(${form.coinType})`}
        </div>
        <div>
          Year Discount: {form.yearDiscount || 0}%
        </div>
        <div>
          Est. Yearly:{" "}
          {form.price
            ? (
                Number(form.price) *
                12 *
                (1 - (form.yearDiscount ? Number(form.yearDiscount) : 0) / 100)
              ).toFixed(6)
            : "—"}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setCreateOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleCreateService}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400 text-center">
        Sea Vault Console - Secure Digital Asset Management
      </footer>
    </div>
  );
}
