import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { FileText, CheckCircle, AlertCircle, DollarSign, ThumbsUp } from "lucide-react";

interface MessageTemplate {
  id: string;
  label: string;
  content: string;
  icon: React.ReactNode;
}

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
  trackingLink?: string;
  creatorName?: string;
}

export function MessageTemplates({
  onSelectTemplate,
  trackingLink,
  creatorName = "there",
}: MessageTemplatesProps) {
  const templates: MessageTemplate[] = [
    {
      id: "application-approved",
      label: "Application Approved",
      content: trackingLink
        ? `Great news! Your application has been approved. Here's your tracking link:\n\n${trackingLink}\n\nPlease use this link in your content and let us know once you've posted!`
        : `Great news! Your application has been approved! Your tracking link will be available shortly. Please let us know once you've posted your content.`,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    },
    {
      id: "content-approval",
      label: "Request Content Approval",
      content: `Hi ${creatorName},\n\nBefore you post your content, could you please share a preview with us for approval? This helps ensure it aligns with our brand guidelines.\n\nThanks for your cooperation!`,
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    },
    {
      id: "payment-processed",
      label: "Payment Processed",
      content: `Good news! Your payment has been processed and should arrive within 3-5 business days.\n\nThank you for your great work promoting our product!`,
      icon: <DollarSign className="h-4 w-4 text-blue-500" />,
    },
    {
      id: "thank-you",
      label: "Thank You",
      content: `Thank you so much for promoting our product! We really appreciate the effort you put into creating quality content.\n\nLooking forward to continuing our partnership!`,
      icon: <ThumbsUp className="h-4 w-4 text-purple-500" />,
    },
    {
      id: "follow-up",
      label: "Follow Up",
      content: `Hi ${creatorName},\n\nJust following up to see how things are going. Have you had a chance to create content for this campaign?\n\nLet me know if you need any assets or have any questions!`,
      icon: <FileText className="h-4 w-4 text-gray-500" />,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          title="Message Templates"
        >
          <FileText className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Message Templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelectTemplate(template.content)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {template.icon}
            <span className="text-sm">{template.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
