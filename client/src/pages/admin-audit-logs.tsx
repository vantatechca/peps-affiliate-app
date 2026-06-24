import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { TopNavBar } from "../components/TopNavBar";
import { TableRowSkeleton } from "../components/skeletons";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, any> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export default function AdminAuditLogs() {
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterEntityType, setFilterEntityType] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs", { action: filterAction, entityType: filterEntityType, userId: filterUserId, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterAction) params.append("action", filterAction);
      if (filterEntityType) params.append("entityType", filterEntityType);
      if (filterUserId) params.append("userId", filterUserId);
      params.append("limit", limit.toString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("approve")) return "bg-green-500";
    if (action.includes("reject")) return "bg-red-500";
    if (action.includes("suspend") || action.includes("ban")) return "bg-orange-500";
    if (action.includes("update")) return "bg-blue-500";
    return "bg-gray-500";
  };

  const clearFilters = () => {
    setFilterAction("");
    setFilterEntityType("");
    setFilterUserId("");
  };

  return (
    <div className="space-y-6 fx-page px-4 sm:px-6">
      <TopNavBar />
      <div>
        <h1 className="text-3xl font-bold fx-text-in fx-text-glow"><span className="fx-text-sweep">Audit Trail</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Track all administrative actions and changes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={filterAction || "all"} onValueChange={(val) => setFilterAction(val === "all" ? "" : val)}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="mark_payout_paid">Mark Payout Paid</SelectItem>
                  <SelectItem value="cancel_payout">Cancel Payout</SelectItem>
                  <SelectItem value="issue_payout_paid">Issue Payout (paid)</SelectItem>
                  <SelectItem value="issue_payout_pending">Issue Payout (pending)</SelectItem>
                  <SelectItem value="approve_offer">Approve Offer</SelectItem>
                  <SelectItem value="reject_offer">Reject Offer</SelectItem>
                  <SelectItem value="suspend_user">Suspend User</SelectItem>
                  <SelectItem value="ban_user">Ban User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={filterEntityType || "all"} onValueChange={(val) => setFilterEntityType(val === "all" ? "" : val)}>
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="content_link">Content Link</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="company">Merchant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID..."
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Select value={limit.toString()} onValueChange={(val) => setLimit(parseInt(val))}>
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Logs {logs && `(${logs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.entityType}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId ? (
                          <span className="truncate block max-w-[150px]" title={log.entityId}>
                            {log.entityId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {log.reason ? (
                          <span className="text-sm">{log.reason}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ipAddress || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {log.changes ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-blue-600">View</summary>
                            <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-auto max-w-[300px]">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
