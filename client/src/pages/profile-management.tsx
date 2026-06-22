import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CityCombobox } from "../components/CityCombobox";
import { apiRequest, queryClient } from "../lib/queryClient";
import { uploadToCloudinary } from "../lib/cloudinary-upload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Upload, Building2, X, ChevronsUpDown, Download, Trash2, Shield, AlertTriangle, Video, Globe, FileText, Plus, Eye, ShieldCheck, User, Mail, Key, KeyRound, LogOut, ExternalLink, Camera, Link2, RefreshCw, CheckCircle2, Unlink, Loader2, Image, Maximize2 } from "lucide-react";
import { TwoFactorSetup } from "../components/TwoFactorSetup";
import { SettingsNavigation, SettingsSection } from "../components/SettingsNavigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { TopNavBar } from "../components/TopNavBar";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { proxiedSrc } from "../lib/image";

type VerificationDocument = {
  id: string;
  documentUrl: string;
  documentName: string;
  documentType: string;
  fileSize: number | null;
  uploadedAt?: string;
};

// Rela Logo component
const RelaLogo = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="45" fill="url(#relaGradient)" />
    <path
      d="M30 35h15c8 0 14 6 14 14s-6 14-14 14h-5v12h-10V35zm10 20h5c2 0 4-2 4-4s-2-4-4-4h-5v8z"
      fill="white"
    />
    <circle cx="65" cy="55" r="8" fill="white" opacity="0.9" />
    <defs>
      <linearGradient id="relaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  
  // Creator profile states
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

  // Company profile states
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactJobTitle, setContactJobTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [yearFounded, setYearFounded] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [companyInstagramUrl, setCompanyInstagramUrl] = useState("");
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState(""); // Keep for backward compatibility
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocument[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

  // PDF Viewer Dialog states
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState("");
  const [currentDocumentName, setCurrentDocumentName] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState("");
  const [currentDocumentType, setCurrentDocumentType] = useState("");
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [documentError, setDocumentError] = useState(false);

  // Account info states
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Creator city (used to show merchants near them). Saved instantly via the
  // affiliate city endpoint, independent of the main profile save.
  const [city, setCity] = useState<string | null>(null);
  const { data: merchantCities = [] } = useQuery<string[]>({
    queryKey: ["/api/affiliate/merchant-cities"],
    enabled: isAuthenticated && user?.role === "creator",
  });
  const { data: affiliateMe } = useQuery<{ city: string | null }>({
    queryKey: ["/api/affiliate/me"],
    enabled: isAuthenticated && user?.role === "creator",
  });
  useEffect(() => { if (affiliateMe?.city) setCity(affiliateMe.city); }, [affiliateMe?.city]);
  const saveCity = useMutation({
    mutationFn: async (c: string) => {
      const r = await fetch("/api/affiliate/me/city", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ city: c }),
      });
      if (!r.ok) throw new Error("Failed to save city");
      return r.json();
    },
    onSuccess: (_d, c) => { setCity(c); queryClient.invalidateQueries({ queryKey: ["/api/affiliate/me"] }); },
  });

  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const requiresPasswordForEmailChange = (!user?.googleId || Boolean(user?.password));

  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Privacy & Data states
  const [isExportingData, setIsExportingData] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showActiveItemsDialog, setShowActiveItemsDialog] = useState(false);
  const [activeItemsDetails, setActiveItemsDetails] = useState<any>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  // Password change with OTP states
  const [passwordChangeOtpSent, setPasswordChangeOtpSent] = useState(false);
  const [passwordChangeOtpCode, setPasswordChangeOtpCode] = useState("");
  const [passwordChangeMaskedEmail, setPasswordChangeMaskedEmail] = useState("");
  const [isRequestingPasswordChangeOtp, setIsRequestingPasswordChangeOtp] = useState(false);
  const [newPasswordWithOtp, setNewPasswordWithOtp] = useState("");
  const [confirmPasswordWithOtp, setConfirmPasswordWithOtp] = useState("");
  const [isChangingPasswordWithOtp, setIsChangingPasswordWithOtp] = useState(false);

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  // Fetch verification documents for company users
  const { data: fetchedVerificationDocs = [] } = useQuery<VerificationDocument[]>({
    queryKey: ["/api/company/verification-documents"],
    enabled: isAuthenticated && user?.role === 'company',
  });

  // Sync fetched documents with local state
  useEffect(() => {
    if (fetchedVerificationDocs.length > 0) {
      setVerificationDocuments(fetchedVerificationDocs);
    }
  }, [fetchedVerificationDocs]);

  // Load saved form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('settings-form-data');
    if (savedFormData) {
      try {
        const data = JSON.parse(savedFormData);
        // Restore creator profile fields
        if (data.bio !== undefined) setBio(data.bio);
        if (data.profileImageUrl !== undefined) setProfileImageUrl(data.profileImageUrl);
        // Restore company profile fields
        if (data.tradeName !== undefined) setTradeName(data.tradeName);
        if (data.legalName !== undefined) setLegalName(data.legalName);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.industry !== undefined) setIndustry(data.industry);
        if (data.websiteUrl !== undefined) setWebsiteUrl(data.websiteUrl);
        if (data.companyDescription !== undefined) setCompanyDescription(data.companyDescription);
        if (data.contactName !== undefined) setContactName(data.contactName);
        if (data.contactJobTitle !== undefined) setContactJobTitle(data.contactJobTitle);
        if (data.phoneNumber !== undefined) setPhoneNumber(data.phoneNumber);
        if (data.businessAddress !== undefined) setBusinessAddress(data.businessAddress);
        if (data.companySize !== undefined) setCompanySize(data.companySize);
        if (data.yearFounded !== undefined) setYearFounded(data.yearFounded);
        if (data.linkedinUrl !== undefined) setLinkedinUrl(data.linkedinUrl);
        if (data.twitterUrl !== undefined) setTwitterUrl(data.twitterUrl);
        if (data.facebookUrl !== undefined) setFacebookUrl(data.facebookUrl);
        if (data.companyInstagramUrl !== undefined) setCompanyInstagramUrl(data.companyInstagramUrl);
        if (data.verificationDocumentUrl !== undefined) setVerificationDocumentUrl(data.verificationDocumentUrl);
      } catch (error) {
        console.error('[Settings] Error loading saved form data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Load user account data
      setUsername(user.username || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      console.log("[Settings] Profile loaded:", profile);

      // Load creator profile data
      if (user?.role === 'creator') {
        setBio(profile.bio || "");
        // profileImageUrl is stored in user table, not creator_profiles table
        setProfileImageUrl(user?.profileImageUrl || "");
      }

      // Load company profile data
      if (user?.role === 'company') {
        setTradeName(profile.tradeName || "");
        setLegalName(profile.legalName || "");
        setLogoUrl(profile.logoUrl || "");
        setIndustry(profile.industry || "");
        setWebsiteUrl(profile.websiteUrl || "");
        setCompanyDescription(profile.description || "");
        setContactName(profile.contactName || "");
        setContactJobTitle(profile.contactJobTitle || "");
        setPhoneNumber(profile.phoneNumber || "");
        setBusinessAddress(profile.businessAddress || "");
        setCompanySize(profile.companySize || "");
        setYearFounded(profile.yearFounded?.toString() || "");
        setLinkedinUrl(profile.linkedinUrl || "");
        setTwitterUrl(profile.twitterUrl || "");
        setFacebookUrl(profile.facebookUrl || "");
        setCompanyInstagramUrl(profile.instagramUrl || "");
        setVerificationDocumentUrl(profile.verificationDocumentUrl || "");
      }
    }
  }, [profile, user?.role, user?.profileImageUrl]);

  // Save form state to localStorage whenever fields change
  useEffect(() => {
    // Only save if user is authenticated and we have at least some data
    if (!isAuthenticated) return;

    const formData = {
      // Creator profile fields
      bio,
      profileImageUrl,
      // Company profile fields
      tradeName,
      legalName,
      logoUrl,
      industry,
      websiteUrl,
      companyDescription,
      contactName,
      contactJobTitle,
      phoneNumber,
      businessAddress,
      companySize,
      yearFounded,
      linkedinUrl,
      twitterUrl,
      facebookUrl,
      companyInstagramUrl,
      verificationDocumentUrl,
    };

    localStorage.setItem('settings-form-data', JSON.stringify(formData));
  }, [
    isAuthenticated, bio, profileImageUrl, tradeName, legalName,
    logoUrl, industry, websiteUrl, companyDescription, contactName, contactJobTitle,
    phoneNumber, businessAddress, companySize, yearFounded, linkedinUrl, twitterUrl,
    facebookUrl, companyInstagramUrl, verificationDocumentUrl
  ]);

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImage = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isImage) {
      setErrorDialog({
        title: "Invalid File Type",
        message: "Please upload an image file (JPG, PNG, GIF, WebP)",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5242880) {
      setErrorDialog({
        title: "File Too Large",
        message: "Image file must be less than 5MB",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Use user ID for folder structure (same pattern as creator profile)
      const folder = user?.id
        ? `company-logos/${user.id}`
        : "company-logos";

      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folder,
          resourceType: "image",
          type: "private",
          contentType: file.type,
          fileName: file.name,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const uploadData = await uploadResponse.json();

      const uploadResult = await uploadToCloudinary(uploadData, file);

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to upload file to storage");
      }

      const uploadedUrl = uploadResult.secure_url;
      setLogoUrl(uploadedUrl);

      // Clear the file input
      event.target.value = '';

      toast({
        title: "Success!",
        description: "Logo uploaded successfully. Don't forget to save your changes.",
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      setErrorDialog({
        title: "Upload Failed",
        message: "Failed to upload logo. Please try again.",
      });
      // Clear the file input even on error
      event.target.value = '';
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isImage = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isImage) {
      setErrorDialog({
        title: "Invalid File Type",
        message: "Please upload an image file (JPG, PNG, GIF, WebP)",
      });
      return;
    }

    if (file.size > 5242880) {
      setErrorDialog({
        title: "File Too Large",
        message: "Image file must be less than 5MB",
      });
      return;
    }

    setIsUploadingProfileImage(true);

    try {
      const folder = user?.id
        ? `creatorprofile/${user.id}`
        : "creatorprofile";

      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folder,
          resourceType: "image",
          type: "private",
          contentType: file.type,
          fileName: file.name,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const uploadData = await uploadResponse.json();

      const uploadResult = await uploadToCloudinary(uploadData, file);

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to upload file to storage");
      }

      const uploadedUrl = uploadResult.secure_url;
      setProfileImageUrl(uploadedUrl);

      toast({
        title: "Success!",
        description: "Profile image uploaded successfully. Don't forget to save your changes.",
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      setErrorDialog({
        title: "Upload Failed",
        message: "Failed to upload profile image. Please try again.",
      });
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const isValid = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValid) {
      setErrorDialog({
        title: "Invalid File Type",
        message: "Please upload a PDF or image file",
      });
      return;
    }

    if (file.size > 10485760) { // 10MB
      setErrorDialog({
        title: "File Too Large",
        message: "Document must be less than 10MB",
      });
      return;
    }

    // Check max documents limit
    if (verificationDocuments.length >= 5) {
      setErrorDialog({
        title: "Maximum Documents Reached",
        message: "You can upload a maximum of 5 verification documents",
      });
      return;
    }

    setIsUploadingDocument(true);

    try {
      // Use user ID for organized folder structure
      const folder = user?.id
        ? `verification-documents/${user.id}`
        : "verification-documents";

      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folder,
          resourceType: 'image', // Use 'image' for both images and PDFs - Cloudinary handles PDFs under image type
          type: "private",
          contentType: file.type,
          fileName: file.name
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const uploadData = await uploadResponse.json();

      const uploadResult = await uploadToCloudinary(uploadData, file);

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to upload file to storage");
      }

     const uploadedUrl = uploadResult.secure_url;

      // Determine document type
      const documentType = file.type === 'application/pdf' ? 'pdf' : 'image';

      // Save document to API
      const saveResponse = await fetch("/api/company/verification-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          documentUrl: uploadedUrl,
          documentName: file.name,
          type: "private",
          documentType,
          fileSize: file.size,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save document");
      }

      const saveData = await saveResponse.json();

      // Add to local state
      if (saveData.document) {
        setVerificationDocuments(prev => [...prev, saveData.document]);
      }

      // Also update the legacy field for backward compatibility
      if (verificationDocuments.length === 0) {
        setVerificationDocumentUrl(uploadedUrl);
      }

      // Invalidate the query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/company/verification-documents"] });

      toast({
        title: "Success!",
        description: "Verification document uploaded successfully.",
      });
    } catch (error) {
      console.error("Document upload error:", error);
      setErrorDialog({
        title: "Upload Failed",
        message: "Failed to upload document. Please try again.",
      });
    } finally {
      setIsUploadingDocument(false);
      // Reset the input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/company/verification-documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      // Remove from local state
      setVerificationDocuments(prev => prev.filter(doc => doc.id !== documentId));

      // Update the legacy field
      const remainingDocs = verificationDocuments.filter(doc => doc.id !== documentId);
      setVerificationDocumentUrl(remainingDocs.length > 0 ? remainingDocs[0].documentUrl : "");

      // Invalidate the query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/company/verification-documents"] });

      toast({
        title: "Success",
        description: "Document removed successfully.",
      });
    } catch (error) {
      console.error("Error removing document:", error);
      toast({
        title: "Error",
        description: "Failed to remove document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Opens document in dialog viewer
  const handleViewDocument = (documentId: string, documentName: string, documentType: string) => {
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

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      queryClient.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setErrorDialog({
        title: "Error",
        message: "Failed to logout. Please try again.",
      });
      setIsLoggingOut(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExportingData(true);

      const response = await fetch("/api/user/export-data", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      // Get the JSON data
      const data = await response.json();

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-data-${user?.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Your data has been exported successfully.",
      });
    } catch (error: any) {
      console.error("Export data error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to export data. Please try again.",
      });
    } finally {
      setIsExportingData(false);
    }
  };

  // Handle email change verification with password
  const handleVerifyEmailChange = async () => {
    try {
      setIsVerifyingEmail(true);

      // Basic validation
      if (!newEmail) {
        setErrorDialog({
          title: "Error",
          message: "Please enter a new email address.",
        });
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        setErrorDialog({
          title: "Error",
          message: "Please enter a valid email address.",
        });
        return;
      }

      // For OAuth users, verify directly without password
      if (user?.googleId && !user?.password) {
        const response = await fetch("/api/auth/verify-email-change", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newEmail: newEmail.trim(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to verify email change");
        }

        setIsEmailVerified(true);
        toast({
          title: "Verified",
          description: "You can now update your email address.",
        });
        return;
      }

      // For local auth users, require password
      if (!emailChangePassword) {
        setErrorDialog({
          title: "Error",
          message: "Password is required to change your email.",
        });
        return;
      }

      const response = await fetch("/api/auth/verify-email-change", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: emailChangePassword,
          newEmail: newEmail.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify email change");
      }

      setIsEmailVerified(true);
      toast({
        title: "Verified",
        description: "Password verified. You can now update your email address.",
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to verify. Please check your password.",
      });
      setIsEmailVerified(false);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Handle email update after verification
  const handleUpdateEmail = async () => {
    try {
      setIsUpdatingEmail(true);

      const response = await fetch("/api/auth/email", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          password: emailChangePassword || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update email");
      }

      toast({
        title: "Success",
        description: "Email updated successfully. Please verify your new email address.",
      });

      // Reset states
      setShowEmailChange(false);
      setEmailChangePassword("");
      setNewEmail("");
      setIsEmailVerified(false);

      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      console.error("Email update error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to update email. Please try again.",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleRequestDeleteOtp = async () => {
    try {
      setIsRequestingOtp(true);

      const response = await fetch("/api/user/request-account-deletion", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send verification code");
      }

      setOtpSent(true);
      setMaskedEmail(result.email || user?.email || "");
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit code has been sent to your email address.",
      });
    } catch (error: any) {
      console.error("Request OTP error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to send verification code. Please try again.",
      });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);

      if (!otpCode) {
        setErrorDialog({
          title: "Error",
          message: "Please enter the verification code sent to your email.",
        });
        return;
      }

      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp: otpCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if there are active items preventing deletion
        if (result.details && result.activeItems) {
          setActiveItemsDetails(result);
          setShowActiveItemsDialog(true);
          setShowDeleteDialog(false);
          setDeletePassword("");
          setOtpCode("");
          setOtpSent(false);
          setMaskedEmail("");
          return;
        }
        throw new Error(result.error || result.details || "Failed to delete account");
      }

      toast({
        title: "Account Deleted",
        description: result.message || "Your account has been successfully deleted.",
      });

      // Clear everything and redirect to home
      queryClient.clear();
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("Delete account error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to delete account. Please try again.",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeletePassword("");
      setOtpCode("");
      setOtpSent(false);
      setMaskedEmail("");
    }
  };

  const updateAccountMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      };

      if (!payload.username) {
        throw new Error("Username is required");
      }

      const result = await apiRequest("PUT", "/api/auth/account", payload);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Account information updated successfully",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to update account information",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword) {
        throw new Error("Current password is required");
      }

      if (!newPassword) {
        throw new Error("New password is required");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const payload = {
        currentPassword,
        newPassword,
      };

      const result = await apiRequest("PUT", "/api/auth/password", payload);
      return result;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to change password",
      });
    },
  });

  // Handle requesting password change OTP
  const handleRequestPasswordChangeOtp = async () => {
    try {
      setIsRequestingPasswordChangeOtp(true);

      const response = await fetch("/api/auth/request-password-change-otp", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send verification code");
      }

      setPasswordChangeOtpSent(true);
      setPasswordChangeMaskedEmail(result.email || user?.email || "");
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit code has been sent to your email address.",
      });
    } catch (error: any) {
      console.error("Request password change OTP error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to send verification code. Please try again.",
      });
    } finally {
      setIsRequestingPasswordChangeOtp(false);
    }
  };

  // Handle changing password with OTP
  const handleChangePasswordWithOtp = async () => {
    try {
      setIsChangingPasswordWithOtp(true);

      if (!passwordChangeOtpCode) {
        setErrorDialog({
          title: "Error",
          message: "Please enter the verification code sent to your email.",
        });
        return;
      }

      if (!newPasswordWithOtp) {
        setErrorDialog({
          title: "Error",
          message: "Please enter a new password.",
        });
        return;
      }

      if (newPasswordWithOtp.length < 8) {
        setErrorDialog({
          title: "Error",
          message: "New password must be at least 8 characters.",
        });
        return;
      }

      if (newPasswordWithOtp !== confirmPasswordWithOtp) {
        setErrorDialog({
          title: "Error",
          message: "Passwords do not match.",
        });
        return;
      }

      const response = await fetch("/api/auth/verify-password-change-otp", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: passwordChangeOtpCode,
          newPassword: newPasswordWithOtp
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to change password");
      }

      toast({
        title: "Password Changed",
        description: result.message || "Your password has been changed successfully.",
      });

      // Reset states
      setPasswordChangeOtpSent(false);
      setPasswordChangeOtpCode("");
      setPasswordChangeMaskedEmail("");
      setNewPasswordWithOtp("");
      setConfirmPasswordWithOtp("");
    } catch (error: any) {
      console.error("Change password with OTP error:", error);
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to change password. Please try again.",
      });
    } finally {
      setIsChangingPasswordWithOtp(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let payload: any = {};

      // Creator profile payload
      if (user?.role === 'creator') {
        payload = {
          bio,
          profileImageUrl: profileImageUrl || null,
        };
      }

      // Company profile payload
      if (user?.role === 'company') {
        payload = {
          tradeName,
          legalName,
          logoUrl,
          industry,
          websiteUrl,
          description: companyDescription,
          contactName,
          contactJobTitle,
          phoneNumber,
          businessAddress,
          companySize,
          yearFounded: yearFounded ? parseInt(yearFounded) : null,
          linkedinUrl,
          twitterUrl,
          facebookUrl,
          instagramUrl: companyInstagramUrl,
          verificationDocumentUrl,
        };
      }

      const result = await apiRequest("PUT", "/api/profile", payload);
      return result;
    },
    onSuccess: () => {
      setIsProfileEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Invalidate company stats to update navbar logo for company users
      if (user?.role === 'company') {
        queryClient.invalidateQueries({ queryKey: ["/api/company/stats"] });
      }
      // Clear saved form data from localStorage since changes are now persisted
      localStorage.removeItem('settings-form-data');
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to update profile",
      });
    },
  });

  // Delete company logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("DELETE", "/api/company-logos");
      return result;
    },
    onSuccess: () => {
      setLogoUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/stats"] });
      toast({
        title: "Success",
        description: "Logo deleted successfully",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        title: "Error",
        message: error.message || "Failed to delete logo",
      });
    },
  });


  const handleSaveProfile = () => {
    updateProfileMutation.mutate();
  };

  // Define navigation sections based on user role
  const settingsSections: SettingsSection[] = useMemo(() => {
    const sections: SettingsSection[] = [
      { id: "account-info", label: "Account Information", icon: <User className="h-4 w-4" /> },
      { id: "change-email", label: "Change Email", icon: <Mail className="h-4 w-4" /> },
      { id: "change-password-legacy", label: "Change Password", icon: <KeyRound className="h-4 w-4" /> },
    ];
    return sections;
  }, []);

  const isProfileEditingDisabled = !isProfileEditMode || updateProfileMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:pl-2 lg:pr-8 py-8 fx-page">
        <div className="sticky top-0 z-30 mb-6 bg-background/95 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h1 className="text-3xl font-bold fx-text-in fx-text-glow"><span className="fx-text-sweep">Profile Management</span><span className="fx-caret ml-1">_</span></h1>
          <p className="text-muted-foreground mt-1 fx-slide-up fx-delay-2">Manage your profile and account information</p>
        </div>

        <div className="flex gap-6">
          <SettingsNavigation sections={settingsSections} />

          <div className="flex-1 space-y-8 min-w-0 max-w-4xl">

            <Card id="account-info" className="border-card-border scroll-mt-24">
              <CardHeader className="pb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription className="mt-1">
                    Manage your account details and personal information
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsProfileEditMode(!isProfileEditMode)}
                  disabled={updateProfileMutation.isPending}
                  variant={isProfileEditMode ? "default" : "outline"}
                  data-testid="button-edit-profile"
                >
                  {isProfileEditMode ? "Cancel" : "Edit Profile"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-8">

                {/* Basic Account Information Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={!isProfileEditMode}
                        data-testid="input-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isProfileEditMode}
                        data-testid="input-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={!isProfileEditMode}
                        data-testid="input-first-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={!isProfileEditMode}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  {user?.role === 'creator' && (
                    <div className="space-y-2 mt-4">
                      <Label>City</Label>
                      <div>
                        <CityCombobox
                          cities={merchantCities}
                          value={city}
                          onChange={(c) => saveCity.mutate(c)}
                          placeholder="Select your city…"
                          className="w-full max-w-xs"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Used to show peptide merchants near you. Saved instantly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* COMPANY PROFILE SECTION */}
                {user?.role === 'company' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold border-b pb-2">Company Profile</h3>
                    {/* Company Logo Section - Horizontal Layout */}
                    <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarImage
                      src={proxiedSrc(logoUrl) || ''}
                      alt={tradeName || 'Company'}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {tradeName?.[0] || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  {isProfileEditMode && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5">
                      <Camera className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isProfileEditingDisabled || isUploadingLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isProfileEditingDisabled || isUploadingLogo}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {isUploadingLogo ? 'Uploading...' : 'Upload New'}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isProfileEditingDisabled || deleteLogoMutation.isPending}
                      onClick={() => deleteLogoMutation.mutate()}
                    >
                      {deleteLogoMutation.isPending ? 'Deleting...' : 'Delete Logo'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Company Form Fields - Two Column Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tradeName">Company Name (Trade Name) <span className="text-destructive">*</span></Label>
                  <Input
                    id="tradeName"
                    type="text"
                    placeholder="Your Company Name"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    data-testid="input-trade-name"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Company Name</Label>
                  <Input
                    id="legalName"
                    type="text"
                    placeholder="Official registered company name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    data-testid="input-legal-name"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry} disabled={isProfileEditingDisabled}>
                    <SelectTrigger id="industry" data-testid="select-industry" disabled={isProfileEditingDisabled}>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                      <SelectItem value="beauty">Beauty & Cosmetics</SelectItem>
                      <SelectItem value="health">Health & Wellness</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="food">Food & Beverage</SelectItem>
                      <SelectItem value="travel">Travel & Hospitality</SelectItem>
                      <SelectItem value="finance">Finance & Insurance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Company Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    data-testid="input-website-url"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    type="text"
                    placeholder="Primary contact person"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    data-testid="input-contact-name"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactJobTitle">Contact Job Title</Label>
                  <Input
                    id="contactJobTitle"
                    type="text"
                    placeholder="Marketing Director, CEO, etc."
                    value={contactJobTitle}
                    onChange={(e) => setContactJobTitle(e.target.value)}
                    data-testid="input-contact-job-title"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="input-phone-number"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize} disabled={isProfileEditingDisabled}>
                    <SelectTrigger id="companySize" data-testid="select-company-size" disabled={isProfileEditingDisabled}>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearFounded">Year Founded</Label>
                  <Input
                    id="yearFounded"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    placeholder={new Date().getFullYear().toString()}
                    value={yearFounded}
                    onChange={(e) => setYearFounded(e.target.value)}
                    data-testid="input-year-founded"
                    disabled={isProfileEditingDisabled}
                  />
                </div>
              </div>

              {/* Full Width Fields */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description</Label>
                <Textarea
                  id="companyDescription"
                  placeholder="Tell creators about your company, products, and what makes you unique..."
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  className="min-h-24"
                  data-testid="textarea-company-description"
                  disabled={isProfileEditingDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  placeholder="Full business address including street, city, state, ZIP, and country"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="min-h-20"
                  data-testid="textarea-business-address"
                  disabled={isProfileEditingDisabled}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-semibold">Verification Documents</Label>
                  </div>
                  <Badge variant="outline">
                    {verificationDocuments.length}/5
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload business registration certificate, EIN/Tax ID, incorporation certificate, or other supporting documents (max 5 files)
                </p>

                {/* Uploaded Documents List */}
                {verificationDocuments.length > 0 && (
                  <div className="space-y-2">
                    {verificationDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200"
                      >
                        <FileText className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-green-900 dark:text-green-100 truncate">
                            {doc.documentName}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {doc.documentType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDocument(doc.id, doc.documentName, doc.documentType)}
                            title="View document"
                          >
                            <Eye className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadDocument(doc.id, doc.documentName)}
                            title="Download document"
                          >
                            <Download className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveDocument(doc.id)}
                            title="Delete document"
                            disabled={isProfileEditingDisabled}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                {verificationDocuments.length < 5 && (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleDocumentUpload}
                      disabled={isProfileEditingDisabled || isUploadingDocument}
                      className="hidden"
                      id="document-upload"
                    />
                    <label
                      htmlFor="document-upload"
                      className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer block ${
                        isUploadingDocument || isProfileEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      aria-disabled={isProfileEditingDisabled}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {isUploadingDocument ? (
                          <>
                            <Upload className="h-6 w-6 text-blue-600 animate-pulse" />
                            <div className="text-sm font-medium text-blue-600">
                              Uploading Document...
                            </div>
                          </>
                        ) : (
                          <>
                            <Plus className="h-6 w-6 text-primary" />
                            <div className="text-sm font-medium">
                              {verificationDocuments.length === 0
                                ? "Click to upload verification document"
                                : "Add another document"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              PDF, JPG, PNG (max 10MB per file)
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">Social Media Profiles</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Optional: Add your social media profiles to build trust with creators
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn Company Page</Label>
                    <Input
                      id="linkedinUrl"
                      type="url"
                    placeholder="https://linkedin.com/company/yourcompany"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    data-testid="input-linkedin-url"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterUrl">Twitter/X Profile</Label>
                    <Input
                      id="twitterUrl"
                      type="url"
                    placeholder="https://twitter.com/yourcompany"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    data-testid="input-twitter-url"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook Page</Label>
                    <Input
                      id="facebookUrl"
                      type="url"
                    placeholder="https://facebook.com/yourcompany"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    data-testid="input-facebook-url"
                    disabled={isProfileEditingDisabled}
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyInstagramUrl">Instagram Profile</Label>
                    <Input
                      id="companyInstagramUrl"
                      type="url"
                    placeholder="https://instagram.com/yourcompany"
                    value={companyInstagramUrl}
                    onChange={(e) => setCompanyInstagramUrl(e.target.value)}
                    data-testid="input-company-instagram-url"
                    disabled={isProfileEditingDisabled}
                  />
                </div>
                </div>
              </div>

              {/* Show warning if critical fields are missing */}
              {(!tradeName || !logoUrl) && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-900 dark:text-yellow-300">Important</AlertTitle>
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    Please fill in your Company Name and upload a Logo.
                    These are required for your offers to display properly.
                  </AlertDescription>
                </Alert>
                    )}
                  </div>
                )}

                {/* CREATOR PROFILE SECTION */}
                {user?.role === 'creator' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold border-b pb-2">Creator Profile</h3>
                    {/* Profile Image and Bio Section */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="space-y-3">
                  <div className={`relative inline-block ${isProfileEditMode ? "group" : ""}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      disabled={isProfileEditingDisabled || isUploadingProfileImage}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    {isProfileEditMode && (
                      <label
                        htmlFor="profile-image-upload"
                        className="absolute inset-0 z-10 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer text-xs font-medium"
                        aria-disabled={isProfileEditingDisabled}
                      >
                        <Camera className="h-5 w-5 mb-1" />
                        <span>{isUploadingProfileImage ? 'Uploading...' : 'Update Photo'}</span>
                      </label>
                    )}
                    <Avatar className="h-24 w-24 ring-2 ring-border">
                      <AvatarImage
                        src={proxiedSrc(profileImageUrl || user?.profileImageUrl) || ''}
                        alt={user?.firstName || 'Creator profile'}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {user?.firstName?.[0] || user?.username?.[0] || 'C'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isProfileEditMode && profileImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileImageUrl("")}
                      disabled={isProfileEditingDisabled}
                    >
                      Delete Avatar
                    </Button>
                  )}
                </div>

                {/* Bio Section */}
                <div className="flex-1 w-full space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  {isProfileEditMode ? (
                    <Textarea
                      id="bio"
                      placeholder="Tell companies about yourself and your audience..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="min-h-24 resize-none"
                      data-testid="textarea-bio"
                      disabled={isProfileEditingDisabled}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground" data-testid="bio-readonly">
                      {bio?.trim() ? bio : "Add a short bio to tell companies about yourself."}
                    </p>
                  )}
                </div>
              </div>

                  </div>
                )}

                {/* ADMIN PROFILE SECTION */}
                {user?.role === 'admin' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold border-b pb-2">Administrator Profile</h3>
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24 ring-2 ring-border">
                        <AvatarImage
                          src={proxiedSrc(user?.profileImageUrl) || ''}
                          alt={user?.firstName || 'Admin'}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          <Shield className="h-10 w-10" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Administrator
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Full access to platform administration
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button - saves both profile and account info */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      // Save profile info if in edit mode (for company/creator)
                      if (isProfileEditMode && (user?.role === 'company' || user?.role === 'creator')) {
                        handleSaveProfile();
                      }
                      // Also save account info
                      updateAccountMutation.mutate();
                    }}
                    disabled={!isProfileEditMode || updateAccountMutation.isPending || updateProfileMutation.isPending}
                    data-testid="button-save-account"
                  >
                    {(updateAccountMutation.isPending || updateProfileMutation.isPending) ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

      {/* Email Change Section */}
      <Card id="change-email" className="border-card-border scroll-mt-24">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Change Email Address
          </CardTitle>
          <CardDescription>
            Update your account email address. {user?.googleId && !user?.password ? "As an OAuth user, you can change your email directly." : "You'll need to verify your password to change your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showEmailChange ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Current Email</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowEmailChange(true)}
              >
                Change Email
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Email Change</AlertTitle>
                <AlertDescription>
                  Changing your email will require you to verify the new email address. You'll receive verification emails at both your old and new addresses.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="current-email-display">Current Email</Label>
                <Input
                  id="current-email-display"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="newemail@example.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setIsEmailVerified(false); // Reset verification when email changes
                  }}
                  disabled={isEmailVerified}
                />
              </div>

              {requiresPasswordForEmailChange && (
                <div className="space-y-2">
                  <Label htmlFor="email-change-password">Current Password *</Label>
                  <Input
                    id="email-change-password"
                    type="password"
                    placeholder="Enter your current password"
                    value={emailChangePassword}
                    onChange={(e) => {
                      setEmailChangePassword(e.target.value);
                      setIsEmailVerified(false); // Reset verification when password changes
                    }}
                    disabled={isEmailVerified}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your password is required to verify this change
                  </p>
                </div>
              )}

              {!isEmailVerified ? (
                <div className="flex gap-2">
                  <Button
                    onClick={handleVerifyEmailChange}
                    disabled={
                      isVerifyingEmail ||
                      !newEmail ||
                      (requiresPasswordForEmailChange && !emailChangePassword)
                    }
                  >
                    {isVerifyingEmail ? "Verifying..." : "Verify & Enable Change"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailChange(false);
                      setEmailChangePassword("");
                      setNewEmail("");
                      setIsEmailVerified(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900 dark:text-green-100">Verified</AlertTitle>
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      You can now update your email address.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateEmail}
                      disabled={isUpdatingEmail}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUpdatingEmail ? "Updating..." : "Update Email Address"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEmailChange(false);
                        setEmailChangePassword("");
                        setNewEmail("");
                        setIsEmailVerified(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="change-password-legacy" className="border-card-border scroll-mt-24">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.googleId ? (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">Google Account</AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  You signed in with Google. Your password is managed by Google.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </>
            )}
        </CardContent>
      </Card>

      <GenericErrorDialog
        open={!!errorDialog}
        onOpenChange={(open) => !open && setErrorDialog(null)}
        title={errorDialog?.title || "Error"}
        description={errorDialog?.message || "An error occurred"}
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
        </div>
      </div>
    </div>
  );
}