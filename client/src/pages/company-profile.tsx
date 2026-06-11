import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { TopNavBar } from "../components/TopNavBar";
import { proxiedSrc } from "../lib/image";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

export default function CompanyProfile() {
  const [, params] = useRoute("/company-profile/:id");
  const companyId = params?.id;

  const { data: company, isLoading } = useQuery<any>({
    queryKey: [`/api/companies/${companyId}`],
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TopNavBar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg">Loading company profile...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <TopNavBar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Merchant Not Found</h2>
            <p className="text-muted-foreground">The merchant you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (company.status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Not Verified
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <TopNavBar />

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={proxiedSrc(company.logoUrl) || ''} alt={company.tradeName || company.legalName} />
              <AvatarFallback className="text-2xl">
                {(company.tradeName || company.legalName)?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold">
                    {company.tradeName || company.legalName}
                  </h1>
                  {company.tradeName && company.legalName && company.tradeName !== company.legalName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Legal Name: {company.legalName}
                    </p>
                  )}
                </div>
                {getStatusBadge()}
              </div>

              {company.industry && (
                <Badge variant="secondary" className="mt-2 capitalize">
                  {company.industry}
                </Badge>
              )}

              {company.description && (
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {company.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {company.websiteUrl && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Website</p>
                  <a
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {company.websiteUrl.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {company.companySize && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Merchant Size</p>
                  <p className="text-sm text-muted-foreground">
                    {company.companySize} employees
                  </p>
                </div>
              </div>
            )}

            {company.yearFounded && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Founded</p>
                  <p className="text-sm text-muted-foreground">{company.yearFounded}</p>
                </div>
              </div>
            )}

            {company.businessAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {company.businessAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {(company.contactName || company.phoneNumber || company.user?.email) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {company.contactName && (
                <div>
                  <p className="text-sm font-medium">Contact Person</p>
                  <p className="text-sm text-muted-foreground">
                    {company.contactName}
                    {company.contactJobTitle && ` - ${company.contactJobTitle}`}
                  </p>
                </div>
              )}

              {company.user?.email && (
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a
                    href={`mailto:${company.user.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {company.user.email}
                  </a>
                </div>
              )}

              {company.phoneNumber && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <a
                    href={`tel:${company.phoneNumber}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {company.phoneNumber}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Media */}
      {(company.linkedinUrl || company.twitterUrl || company.facebookUrl || company.instagramUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {company.linkedinUrl && (
                <a
                  href={company.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                >
                  <Linkedin className="h-5 w-5 text-[#0077B5]" />
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
              )}

              {company.twitterUrl && (
                <a
                  href={company.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                >
                  <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                  <span className="text-sm font-medium">Twitter/X</span>
                </a>
              )}

              {company.facebookUrl && (
                <a
                  href={company.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                >
                  <Facebook className="h-5 w-5 text-[#1877F2]" />
                  <span className="text-sm font-medium">Facebook</span>
                </a>
              )}

              {company.instagramUrl && (
                <a
                  href={company.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                >
                  <Instagram className="h-5 w-5 text-[#E4405F]" />
                  <span className="text-sm font-medium">Instagram</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
