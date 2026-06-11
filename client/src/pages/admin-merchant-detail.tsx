import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  PlayCircle,
  ExternalLink,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Eye,
  Download,
  ShieldCheck,
  RefreshCw,
  Copy,
  Code,
  Server,
  Clock,
  AlertTriangle,
  Info,
  Shield,
  Loader2,
  Image,
  Maximize2,
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { TopNavBar } from "../components/TopNavBar";
import { useLocation, useRoute } from "wouter";
import { GenericErrorDialog } from "../components/GenericErrorDialog";

type VerificationDocument = {
  id: string;
  documentUrl: string;
  documentName: string;
  documentType: string;
  fileSize: number | null;
  uploadedAt?: string;
};

type CompanyDetail = {
  id: string;
  legalName: string;
  tradeName?: string;
  industry?: string;
  websiteUrl?: string;
  companySize?: string;
  yearFounded?: number;
  logoUrl?: string;
  description?: string;
  contactName?: string;
  contactJobTitle?: string;
  phoneNumber?: string;
  businessAddress?: string;
  verificationDocumentUrl?: string;
  // Website verification fields
  websiteVerificationToken?: string;
  websiteVerified?: boolean;
  websiteVerificationMethod?: 'meta_tag' | 'dns_txt';
  websiteVerifiedAt?: string;
  // Per-company fee override
  customPlatformFeePercentage?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
};

type RiskIndicator = {
  type: 'warning' | 'info' | 'success';
  category: string;
  title: string;
  description: string;
  recommendation: 'increase' | 'decrease' | 'neutral';
};

type CompanyRiskInfo = {
  companyId: string;
  companyName: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  overallRecommendation: 'increase' | 'decrease' | 'maintain';
  recommendationText: string;
  indicators: RiskIndicator[];
  stats: {
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    refundedPayments: number;
    disputedPayments: number;
    totalVolume: string;
    accountAgeDays: number;
  };
};

export default function AdminMerchantDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  // Match both the new and legacy URLs so deep links still work.
  const [, paramsNew] = useRoute("/admin/merchants/:id");
  const [, paramsLegacy] = useRoute("/admin/companies/:id");
  const params = paramsNew ?? paramsLegacy;
  const companyId = params?.id;

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState("");
  const [currentDocumentName, setCurrentDocumentName] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState("");
  const [currentDocumentType, setCurrentDocumentType] = useState("");
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [documentError, setDocumentError] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setErrorDialog({
        open: true,
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading]);

  // Fetch company details
  const { data: company, isLoading: loadingCompany, error } = useQuery<CompanyDetail>({
    queryKey: [`/api/admin/companies/${companyId}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch company details");
      return response.json();
    },
    enabled: isAuthenticated && !!companyId,
  });

  useEffect(() => {
    if (error) {
      setErrorDialog({
        open: true,
        title: "Error Loading Company",
        description: "Failed to load company details. Please try again.",
      });
    } else if (!loadingCompany && !company && companyId) {
      setErrorDialog({
        open: true,
        title: "Merchant Not Found",
        description: "The requested merchant could not be found.",
      });
    }
  }, [company, error, loadingCompany, companyId]);

  // Opens document in dialog viewer
  const handleViewDocument = (documentId: string, documentName: string = "Document", documentType: string = "") => {
    if (!documentId) {
      toast({
        title: "Error",
        description: "Missing document ID",
        variant: "destructive",
      });
      return;
    }
    // Use the authenticated backend endpoint to serve the document
    const viewerUrl = `/api/company/verification-documents/${documentId}/file`;
    // Reset states and open the document in a dialog viewer
    setIsDocumentLoading(true);
    setDocumentError(false);
    setCurrentDocumentId(documentId);
    setCurrentDocumentUrl(viewerUrl);
    setCurrentDocumentName(documentName);
    setCurrentDocumentType(documentType);
    setIsPdfViewerOpen(true);
  };

  // Downloads document via backend endpoint
  const handleDownloadDocument = async (documentId: string, documentName: string) => {
    if (!documentId) {
      toast({
        title: "Error",
        description: "Missing document ID",
        variant: "destructive",
      });
      return;
    }
    try {
      // Use the authenticated backend endpoint with download parameter
      const downloadUrl = `/api/company/verification-documents/${documentId}/file?download=true`;
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to download document");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // Fetch company offers
  const { data: offers = [], isLoading: loadingOffers } = useQuery<any[]>({
    queryKey: [`/api/admin/companies/${companyId}/offers`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${companyId}/offers`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch company offers");
      return response.json();
    },
    enabled: isAuthenticated && !!companyId && activeTab === "offers",
  });

  // Fetch verification documents
  const { data: verificationDocuments = [] } = useQuery<VerificationDocument[]>({
    queryKey: [`/api/admin/companies/${companyId}/verification-documents`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${companyId}/verification-documents`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch verification documents");
      return response.json();
    },
    enabled: isAuthenticated && !!companyId,
  });

  // Fetch company risk indicators
  const { data: riskInfo, isLoading: loadingRiskInfo } = useQuery<CompanyRiskInfo>({
    queryKey: [`/api/admin/companies/${companyId}/risk-indicators`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${companyId}/risk-indicators`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch risk indicators");
      return response.json();
    },
    enabled: isAuthenticated && !!companyId,
  });

  // Helper function to format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/companies/${companyId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Merchant approved successfully",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to approve merchant",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/admin/companies/${companyId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Merchant rejected",
      });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to reject merchant",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/companies/${companyId}/suspend`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/all"] });
      toast({
        title: "Success",
        description: "Merchant suspended",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to suspend merchant",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/companies/${companyId}/reactivate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/all"] });
      toast({
        title: "Success",
        description: "Merchant reactivated",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to reactivate merchant",
      });
    },
  });

  if (isLoading || loadingCompany) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading company details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Merchant not found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'suspended':
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <div className="container mx-auto px-4 py-6 max-w-7xl fx-page">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/merchants")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt={`${company.legalName} logo`}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{company.legalName}</h1>
              {company.tradeName && company.tradeName !== company.legalName && (
                <p className="text-lg text-muted-foreground">Trading as: {company.tradeName}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(company.status)}>
                  {getStatusIcon(company.status)}
                  <span className="ml-1">{company.status.charAt(0).toUpperCase() + company.status.slice(1)}</span>
                </Badge>
                {company.websiteVerified && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Website Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {company.status === 'pending' && (
              <>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsRejectDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {company.status === 'approved' && (
              <Button
                variant="destructive"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            )}
            {company.status === 'suspended' && (
              <Button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Reactivate
              </Button>
            )}
          </div>
        </div>

        {/* Rejection Reason Alert */}
        {company.status === 'rejected' && company.rejectionReason && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Rejection Reason</AlertTitle>
            <AlertDescription className="text-red-700">
              {company.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Company Info Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {company.industry && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Industry</div>
                      <div className="font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {company.industry}
                      </div>
                    </div>
                  )}
                  {company.companySize && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Merchant Size</div>
                      <div className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {company.companySize}
                      </div>
                    </div>
                  )}
                  {company.yearFounded && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Year Founded</div>
                      <div className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {company.yearFounded}
                      </div>
                    </div>
                  )}
                  {company.websiteUrl && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Website</div>
                      <a
                        href={company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        {company.websiteUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {company.description && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                      <p className="text-sm">{company.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {company.user && (
                    <>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Account Email</div>
                        <div className="font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {company.user.email}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Username</div>
                        <div className="font-medium">@{company.user.username}</div>
                      </div>
                      {(company.user.firstName || company.user.lastName) && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Account Name</div>
                          <div className="font-medium">
                            {company.user.firstName} {company.user.lastName}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {company.contactName && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Contact Person</div>
                      <div className="font-medium">{company.contactName}</div>
                      {company.contactJobTitle && (
                        <div className="text-sm text-muted-foreground">{company.contactJobTitle}</div>
                      )}
                    </div>
                  )}
                  {company.phoneNumber && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Phone</div>
                      <div className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {company.phoneNumber}
                      </div>
                    </div>
                  )}
                  {company.businessAddress && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Business Address</div>
                      <div className="font-medium flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                        <span>{company.businessAddress}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              {riskInfo && (
                <Card className={`border-2 ${getRiskColor(riskInfo.riskLevel)}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Risk Assessment
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {riskInfo.riskLevel} Risk
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
                      <div className="text-3xl font-bold">{riskInfo.riskScore}/100</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Recommendation</div>
                      <div className="font-medium flex items-center gap-2">
                        {riskInfo.overallRecommendation === 'increase' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {riskInfo.overallRecommendation === 'decrease' && <TrendingDown className="h-4 w-4 text-red-600" />}
                        {riskInfo.overallRecommendation === 'maintain' && <Info className="h-4 w-4 text-blue-600" />}
                        {riskInfo.recommendationText}
                      </div>
                    </div>

                    {riskInfo.indicators.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Key Indicators</div>
                        {riskInfo.indicators.slice(0, 3).map((indicator, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              indicator.type === 'warning'
                                ? 'bg-amber-50 border-amber-200'
                                : indicator.type === 'success'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <div className="font-medium text-sm">{indicator.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{indicator.description}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Payments:</span>
                        <span className="font-medium ml-2">{riskInfo.stats.totalPayments}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-medium ml-2">{riskInfo.stats.completedPayments}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>
                        <span className="font-medium ml-2 text-red-600">{riskInfo.stats.failedPayments}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Disputed:</span>
                        <span className="font-medium ml-2 text-amber-600">{riskInfo.stats.disputedPayments}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Total Volume:</span>
                        <span className="font-medium ml-2">{riskInfo.stats.totalVolume}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Account Age:</span>
                        <span className="font-medium ml-2">{riskInfo.stats.accountAgeDays} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timestamps */}
              <Card className="border-card-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Joined</div>
                    <div className="font-medium">
                      {new Date(company.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  {company.approvedAt && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Approved</div>
                      <div className="font-medium">
                        {new Date(company.approvedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Last Updated</div>
                    <div className="font-medium">
                      {new Date(company.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Documents */}
              {(verificationDocuments.length > 0 || company.verificationDocumentUrl) && (
                <Card className="border-card-border md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Verification Documents
                      <Badge variant="outline">
                        {verificationDocuments.length > 0 ? verificationDocuments.length : 1}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {verificationDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {verificationDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                          >
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.documentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.documentType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                                {doc.uploadedAt && (
                                  <> • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDocument(doc.id, doc.documentName, doc.documentType)}
                                title="View document"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc.id, doc.documentName)}
                                title="Download document"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No verification documents uploaded</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Website Verification Card */}
              {company.websiteUrl && (
                <Card className="border-card-border md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Website Verification
                      {company.websiteVerified ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 ml-2">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {company.websiteVerified && company.websiteVerifiedAt && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200">Website Ownership Verified</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Verified via {company.websiteVerificationMethod === 'meta_tag' ? 'Meta Tag' : 'DNS TXT Record'} on{' '}
                              {new Date(company.websiteVerifiedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {company.websiteVerificationToken && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Verification Token:</p>
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                          {company.websiteVerificationToken}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await apiRequest("POST", `/api/admin/companies/${companyId}/generate-verification-token`);
                            const data = await response.json();
                            queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
                            toast({
                              title: "Token Generated",
                              description: "Verification token has been generated",
                            });
                          } catch (error: any) {
                            setErrorDialog({
                              open: true,
                              title: "Error",
                              description: error.message || "Failed to generate token",
                            });
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {company.websiteVerificationToken ? 'Regenerate Token' : 'Generate Token'}
                      </Button>

                      {company.websiteVerificationToken && !company.websiteVerified && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await apiRequest("POST", `/api/admin/companies/${companyId}/verify-website`, { method: 'meta_tag' });
                                const data = await response.json();
                                if (data.success) {
                                  queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
                                  toast({
                                    title: "Verification Successful",
                                    description: "Website verified via Meta Tag",
                                  });
                                } else {
                                  toast({
                                    title: "Verification Failed",
                                    description: data.error || "Could not verify website",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Verification Failed",
                                  description: error.message || "Could not verify website",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            Verify Meta Tag
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await apiRequest("POST", `/api/admin/companies/${companyId}/verify-website`, { method: 'dns_txt' });
                                const data = await response.json();
                                if (data.success) {
                                  queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
                                  toast({
                                    title: "Verification Successful",
                                    description: "Website verified via DNS TXT Record",
                                  });
                                } else {
                                  toast({
                                    title: "Verification Failed",
                                    description: data.error || "Could not verify website",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Verification Failed",
                                  description: error.message || "Could not verify website",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Server className="h-4 w-4 mr-2" />
                            Verify DNS TXT
                          </Button>
                        </>
                      )}

                      {company.websiteVerified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await apiRequest("POST", `/api/admin/companies/${companyId}/unverify-website`);
                              const data = await response.json();
                              queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${companyId}`] });
                              toast({
                                title: "Website Unverified",
                                description: "Website verification has been removed",
                              });
                            } catch (error: any) {
                              setErrorDialog({
                                open: true,
                                title: "Error",
                                description: error.message || "Failed to unverify website",
                              });
                            }
                          }}
                        >
                          Remove Verification
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Company Offers ({offers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOffers ? (
                  <div className="text-center py-8 text-muted-foreground">Loading offers...</div>
                ) : offers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No offers yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Compensation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium">{offer.title}</TableCell>
                          <TableCell>${(offer.compensation / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={offer.status === 'approved' ? 'default' : 'secondary'}>
                              {offer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Merchant</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this company registration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectionReason.trim()) {
                  rejectMutation.mutate(rejectionReason);
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Merchant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GenericErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        variant="error"
      />

      {/* Document Viewer Dialog */}
      <Dialog open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {currentDocumentType === 'image' ? (
                  <Image className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-lg truncate" title={currentDocumentName}>
                  {currentDocumentName || "Document"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {currentDocumentType === 'image' ? 'Image' : 'PDF'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Verification Document</span>
                </div>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 min-h-0 relative bg-muted/20">
            {/* Loading State */}
            {isDocumentLoading && !documentError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            )}

            {/* Error State */}
            {documentError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Failed to load document</h3>
                  <p className="text-muted-foreground mb-4">The document could not be displayed in the preview.</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDocumentError(false);
                        setIsDocumentLoading(true);
                        setCurrentDocumentUrl(`${currentDocumentUrl}?retry=${Date.now()}`);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                    <Button onClick={() => window.open(currentDocumentUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Document Display */}
            {currentDocumentUrl && (
              currentDocumentType === 'image' ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={currentDocumentUrl}
                    alt={currentDocumentName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onLoad={() => setIsDocumentLoading(false)}
                    onError={() => {
                      setIsDocumentLoading(false);
                      setDocumentError(true);
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={currentDocumentUrl}
                  className="w-full h-full border-0"
                  title={currentDocumentName}
                  onLoad={() => setIsDocumentLoading(false)}
                  onError={() => {
                    setIsDocumentLoading(false);
                    setDocumentError(true);
                  }}
                />
              )
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleDownloadDocument(currentDocumentId, currentDocumentName)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(currentDocumentUrl, '_blank')}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
            <Button
              onClick={() => setIsPdfViewerOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}