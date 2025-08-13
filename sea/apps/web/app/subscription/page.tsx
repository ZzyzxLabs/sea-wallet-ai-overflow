"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Tile } from "../../components/tile"; // ← 確認路徑
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
import { package_addr } from "@/utils/package";

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
                    onClick={() => {
                    // TODO: 未來可改成打開 Modal / 跳轉建立服務頁面
                    alert("Open create service form...");
                    }}
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

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400 text-center">
        Sea Vault Console - Secure Digital Asset Management
      </footer>
    </div>
  );
}
