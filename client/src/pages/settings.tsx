import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Upload, Building2, X, ChevronsUpDown, Download, Trash2, Shield, AlertTriangle, Video, Globe, FileText, Plus, Eye, ShieldCheck, User, Mail, Key, KeyRound, LogOut, ExternalLink, Loader2, Image, Maximize2, RefreshCw } from "lucide-react";
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

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  
  // Creator profile states
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeFollowers, setYoutubeFollowers] = useState("");
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  
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

  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const requiresPasswordForEmailChange = (!user?.googleId || Boolean(user?.password));

  // Dialog state for video platform warning
  const [showVideoPlatformDialog, setShowVideoPlatformDialog] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Privacy & Data states
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

  // Fetch niches from API
  const { data: niches = [], isLoading: nichesLoading } = useQuery<Array<{ id: string; name: string; description: string | null; isActive: boolean }>>({
    queryKey: ["/api/niches"],
  });

  // Convert niches to the format expected by the component
  const AVAILABLE_NICHES = niches.map(niche => ({
    value: niche.name.toLowerCase().replace(/\s+/g, '_'),
    label: niche.name
  }));

  // Load saved form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('settings-form-data');
    if (savedFormData) {
      try {
        const data = JSON.parse(savedFormData);
        // Restore creator profile fields
        if (data.bio !== undefined) setBio(data.bio);
        if (data.profileImageUrl !== undefined) setProfileImageUrl(data.profileImageUrl);
        if (data.selectedNiches !== undefined) setSelectedNiches(data.selectedNiches);
        if (data.youtubeUrl !== undefined) setYoutubeUrl(data.youtubeUrl);
        if (data.tiktokUrl !== undefined) setTiktokUrl(data.tiktokUrl);
        if (data.instagramUrl !== undefined) setInstagramUrl(data.instagramUrl);
        if (data.youtubeFollowers !== undefined) setYoutubeFollowers(data.youtubeFollowers);
        if (data.tiktokFollowers !== undefined) setTiktokFollowers(data.tiktokFollowers);
        if (data.instagramFollowers !== undefined) setInstagramFollowers(data.instagramFollowers);
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
        setSelectedNiches(profile.niches || []);
        setYoutubeUrl(profile.youtubeUrl || "");
        setTiktokUrl(profile.tiktokUrl || "");
        setInstagramUrl(profile.instagramUrl || "");
        setYoutubeFollowers(profile.youtubeFollowers?.toString() || "");
        setTiktokFollowers(profile.tiktokFollowers?.toString() || "");
        setInstagramFollowers(profile.instagramFollowers?.toString() || "");
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
      selectedNiches,
      youtubeUrl,
      tiktokUrl,
      instagramUrl,
      youtubeFollowers,
      tiktokFollowers,
      instagramFollowers,
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
    isAuthenticated, bio, profileImageUrl, selectedNiches, youtubeUrl, tiktokUrl, instagramUrl,
    youtubeFollowers, tiktokFollowers, instagramFollowers, tradeName, legalName,
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

  // Toggle niche selection
  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche)
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  // Remove a specific niche
  const removeNiche = (niche: string) => {
    setSelectedNiches(prev => prev.filter(n => n !== niche));
  };

  const updateAccountMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
          niches: selectedNiches,
          youtubeUrl,
          tiktokUrl,
          instagramUrl,
          youtubeFollowers: youtubeFollowers ? parseInt(youtubeFollowers) : null,
          tiktokFollowers: tiktokFollowers ? parseInt(tiktokFollowers) : null,
          instagramFollowers: instagramFollowers ? parseInt(instagramFollowers) : null,
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
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

  // Handler for save profile button - checks video platform requirement first
  const handleSaveProfile = () => {
    // Only check for creators
    if (user?.role === 'creator') {
      const hasVideoPlatform = youtubeUrl || tiktokUrl || instagramUrl;
      if (!hasVideoPlatform) {
        setShowVideoPlatformDialog(true);
        return;
      }
    }

    // Proceed with save
    updateProfileMutation.mutate();
  };

  // Define navigation sections based on user role
  const settingsSections: SettingsSection[] = useMemo(() => {
    const sections: SettingsSection[] = [
      { id: "two-factor-auth", label: "Two-Factor Auth", icon: <ShieldCheck className="h-4 w-4" /> },
    ];
    if (user?.role !== 'admin') {
      sections.push({ id: "privacy-data", label: "Account Deletion", icon: <Shield className="h-4 w-4" /> });
    }
    sections.push({ id: "logout-section", label: "Logout", icon: <LogOut className="h-4 w-4" /> });
    return sections;
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:pl-2 lg:pr-8 py-8 fx-page">
        <div className="sticky top-0 z-10 mb-6 border-b border-border bg-background/90 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h1 className="text-3xl font-bold fx-text-in fx-text-glow"><span className="fx-text-sweep">Settings</span><span className="fx-caret ml-1">_</span></h1>
          <p className="text-muted-foreground mt-1 fx-slide-up fx-delay-2">Manage your account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <SettingsNavigation sections={settingsSections} />

          <div className="flex-1 space-y-8 min-w-0 max-w-4xl">

      {/* Two-Factor Authentication Section */}
      <div id="two-factor-auth" className="scroll-mt-24">
        <TwoFactorSetup />
      </div>

      {user?.role !== 'admin' && (
        <Card id="privacy-data" className="border-card-border scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Deletion
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium text-destructive">Delete Account</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This action cannot
                  be undone.
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeletingAccount}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="logout-section" className="border-card-border scroll-mt-24">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Log Out</div>
              <div className="text-sm text-muted-foreground">Sign out of your account</div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
            >
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog - Only for creators and companies */}
      {user?.role !== 'admin' && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Account - Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This action <strong>cannot be undone</strong>. This will permanently delete
                  your account and remove all your data from our servers.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-semibold mb-2">The following data will be deleted:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Personal information (email, name, profile)</li>
                    <li>Payment information and settings</li>
                    <li>Profile images and uploaded content</li>
                    <li>Applications and favorites</li>
                    <li>Notifications and preferences</li>
                  </ul>
                </div>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-semibold mb-2">The following will be kept (anonymized):</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Reviews (content kept, author anonymized)</li>
                    <li>Messages (content kept, sender anonymized)</li>
                  </ul>
                </div>

                {/* Two-step verification */}
                <div className="space-y-3 pt-2">
                  {!otpSent ? (
                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                        Security Verification Required
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        To proceed with account deletion, we'll send a verification code to your email address.
                      </p>
                      <Button
                        onClick={handleRequestDeleteOtp}
                        disabled={isRequestingOtp}
                        variant="outline"
                        className="w-full border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900"
                      >
                        {isRequestingOtp ? "Sending..." : "Send Verification Code to Email"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800 mb-3">
                        <p className="text-sm text-green-900 dark:text-green-100">
                          ✓ Verification code sent to <strong>{maskedEmail}</strong>
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          The code will expire in 15 minutes.
                        </p>
                      </div>
                      <Label htmlFor="delete-otp">
                        Enter the 6-digit verification code:
                      </Label>
                      <Input
                        id="delete-otp"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="font-mono text-lg tracking-widest text-center"
                      />
                      <Button
                        onClick={handleRequestDeleteOtp}
                        disabled={isRequestingOtp}
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        {isRequestingOtp ? "Resending..." : "Didn't receive? Resend code"}
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeletePassword("");
                setOtpCode("");
                setOtpSent(false);
                setMaskedEmail("");
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !otpSent || otpCode.length !== 6}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingAccount ? "Deleting..." : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Active Items Warning Dialog - Only for creators and companies */}
      {user?.role !== 'admin' && (
        <AlertDialog open={showActiveItemsDialog} onOpenChange={setShowActiveItemsDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
                Cannot Delete Account - Active Activities Found
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 text-base">
                <p className="font-semibold text-foreground">
                  You have active activities that must be completed or cancelled before deleting your account.
                </p>

                {activeItemsDetails && (
                  <div className="space-y-3">
                    {activeItemsDetails.details.applications > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.applications} Active Application{activeItemsDetails.details.applications > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          {user?.role === 'creator'
                            ? 'You have active offers you are working on. Please complete or cancel these applications first.'
                            : 'You have active applications from creators. Please complete or cancel these applications first.'}
                        </p>
                      </div>
                    )}

                    {activeItemsDetails.details.retainerContracts > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.retainerContracts} Active Retainer Contract{activeItemsDetails.details.retainerContracts > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          {user?.role === 'creator'
                            ? 'You are currently assigned to active retainer contracts. Please complete or cancel these contracts first.'
                            : 'You have active retainer contracts with creators. Please complete or cancel these contracts first.'}
                        </p>
                      </div>
                    )}

                    {activeItemsDetails.details.retainerApplications > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.retainerApplications} Pending Retainer Application{activeItemsDetails.details.retainerApplications > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          You have pending retainer applications. Please wait for them to be processed or cancel them first.
                        </p>
                      </div>
                    )}

                    {activeItemsDetails.details.offersWithApplications > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.offersWithApplications} Active Offer{activeItemsDetails.details.offersWithApplications > 1 ? 's' : ''} with Applications
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          You have active offers with creator applications. Please complete or cancel these offers first.
                        </p>
                      </div>
                    )}

                    {activeItemsDetails.details.pendingPayments > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.pendingPayments} Pending Payment{activeItemsDetails.details.pendingPayments > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          You have pending or processing payments. Please wait for them to complete before deleting your account.
                        </p>
                      </div>
                    )}

                    {activeItemsDetails.details.pendingDeliverables > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {activeItemsDetails.details.pendingDeliverables} Pending Deliverable{activeItemsDetails.details.pendingDeliverables > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          You have pending or revision-requested deliverables. Please submit final versions or cancel the associated retainer contracts first.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>💡 What to do:</strong> Go to your {user?.role === 'creator' ? 'applications or retainer contracts' : 'offers or retainer contracts'} page and complete or cancel all active items. Then you can return here to delete your account.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowActiveItemsDialog(false)}>
                I Understand
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 flex-wrap gap-2">
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
