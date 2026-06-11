import { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image,
  Square,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Link,
  DollarSign,
  List,
  Minus,
  User,
  Building,
  FileText,
  Clock,
  Mail,
  Sparkles,
} from "lucide-react";

// Block types for visual editor
export type BlockType =
  | 'greeting'
  | 'text'
  | 'heading'
  | 'success-box'
  | 'warning-box'
  | 'error-box'
  | 'info-box'
  | 'button'
  | 'amount-display'
  | 'details-table'
  | 'divider'
  | 'footer'
  | 'bullet-list'
  | 'numbered-list';

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  properties: Record<string, string>;
}

export interface VisualEmailData {
  blocks: EmailBlock[];
  headerTitle: string;
  headerColor: string;
}

interface Variable {
  name: string;
  label: string;
  description: string;
  example: string;
  icon: typeof User;
}

// Available variables
const VARIABLES: Variable[] = [
  { name: 'userName', label: 'User Name', description: 'Recipient\'s name', example: 'John Doe', icon: User },
  { name: 'companyName', label: 'Company Name', description: 'Company\'s name', example: 'Acme Corp', icon: Building },
  { name: 'offerTitle', label: 'Offer Title', description: 'Name of the offer', example: 'Summer Sale Promotion', icon: FileText },
  { name: 'amount', label: 'Amount', description: 'Payment amount', example: '$500.00', icon: DollarSign },
  { name: 'grossAmount', label: 'Gross Amount', description: 'Amount before fees', example: '$550.00', icon: DollarSign },
  { name: 'platformFee', label: 'Platform Fee', description: 'Platform fee amount', example: '$22.00', icon: DollarSign },
  { name: 'processingFee', label: 'Processing Fee', description: 'Processing fee amount', example: '$16.50', icon: DollarSign },
  { name: 'trackingLink', label: 'Tracking Link', description: 'Unique affiliate tracking URL', example: 'https://track.example.com/abc123', icon: Link },
  { name: 'trackingCode', label: 'Tracking Code', description: 'Unique tracking code', example: 'ABC123', icon: FileText },
  { name: 'linkUrl', label: 'Action Link', description: 'Link to relevant page', example: 'https://app.example.com/dashboard', icon: Link },
  { name: 'transactionId', label: 'Transaction ID', description: 'Payment transaction reference', example: 'TXN-12345', icon: FileText },
  { name: 'reviewRating', label: 'Review Rating', description: 'Star rating (1-5)', example: '5', icon: Sparkles },
  { name: 'reviewText', label: 'Review Text', description: 'Review content', example: 'Great service!', icon: FileText },
  { name: 'messagePreview', label: 'Message Preview', description: 'Preview of message', example: 'Hello, I wanted to discuss...', icon: Mail },
  { name: 'daysUntilExpiration', label: 'Days Until Expiration', description: 'Countdown for expiring items', example: '7', icon: Clock },
  { name: 'otpCode', label: 'OTP Code', description: 'Verification code', example: '123456', icon: AlertCircle },
  { name: 'verificationUrl', label: 'Verification URL', description: 'Email verification link', example: 'https://app.example.com/verify/abc', icon: Link },
  { name: 'resetUrl', label: 'Password Reset URL', description: 'Password reset link', example: 'https://app.example.com/reset/abc', icon: Link },
  { name: 'applicationId', label: 'Application ID', description: 'Application reference', example: 'APP-12345', icon: FileText },
  { name: 'reason', label: 'Reason', description: 'Reason for action', example: 'Content policy violation', icon: AlertCircle },
];

// Block definitions with display info
const BLOCK_DEFINITIONS: Record<BlockType, { label: string; icon: typeof Type; description: string; defaultContent: string; properties?: Record<string, { label: string; type: 'text' | 'color' | 'select'; options?: string[] }> }> = {
  'greeting': {
    label: 'Greeting',
    icon: User,
    description: 'Personal greeting with user name',
    defaultContent: 'Hi {{userName}},',
  },
  'text': {
    label: 'Text Paragraph',
    icon: Type,
    description: 'Regular text content',
    defaultContent: 'Enter your message here...',
  },
  'heading': {
    label: 'Heading',
    icon: Type,
    description: 'Section heading',
    defaultContent: 'Section Title',
    properties: {
      size: { label: 'Size', type: 'select', options: ['large', 'medium', 'small'] },
    },
  },
  'success-box': {
    label: 'Success Message',
    icon: CheckCircle,
    description: 'Green success/confirmation box',
    defaultContent: 'Your action was successful!',
  },
  'warning-box': {
    label: 'Warning Message',
    icon: AlertTriangle,
    description: 'Yellow warning/attention box',
    defaultContent: 'Please note this important information.',
  },
  'error-box': {
    label: 'Error Message',
    icon: AlertCircle,
    description: 'Red error/alert box',
    defaultContent: 'An error or issue occurred.',
  },
  'info-box': {
    label: 'Info Box',
    icon: Info,
    description: 'Blue information box',
    defaultContent: 'Here is some helpful information.',
  },
  'button': {
    label: 'Action Button',
    icon: Square,
    description: 'Call-to-action button',
    defaultContent: 'Click Here',
    properties: {
      url: { label: 'Button Link', type: 'text' },
      color: { label: 'Color', type: 'select', options: ['primary', 'success', 'warning', 'danger', 'gray'] },
    },
  },
  'amount-display': {
    label: 'Amount Display',
    icon: DollarSign,
    description: 'Large amount/price display',
    defaultContent: '{{amount}}',
    properties: {
      label: { label: 'Label Text', type: 'text' },
      style: { label: 'Style', type: 'select', options: ['default', 'success', 'warning'] },
    },
  },
  'details-table': {
    label: 'Details Table',
    icon: List,
    description: 'Key-value pairs table',
    defaultContent: 'Amount:{{amount}}\nOffer:{{offerTitle}}\nTransaction ID:{{transactionId}}',
  },
  'divider': {
    label: 'Divider Line',
    icon: Minus,
    description: 'Horizontal separator line',
    defaultContent: '',
  },
  'footer': {
    label: 'Footer',
    icon: FileText,
    description: 'Standard email footer',
    defaultContent: 'This is an automated notification from AffiliateXchange.\nUpdate your notification preferences anytime.',
  },
  'bullet-list': {
    label: 'Bullet List',
    icon: List,
    description: 'Unordered bullet list',
    defaultContent: 'First item\nSecond item\nThird item',
  },
  'numbered-list': {
    label: 'Numbered List',
    icon: List,
    description: 'Ordered numbered list',
    defaultContent: 'First step\nSecond step\nThird step',
  },
};

// Header color options
const HEADER_COLORS = [
  { value: '#4F46E5', label: 'Primary (Indigo)', preview: 'bg-indigo-600' },
  { value: '#10B981', label: 'Success (Green)', preview: 'bg-emerald-500' },
  { value: '#F59E0B', label: 'Warning (Amber)', preview: 'bg-amber-500' },
  { value: '#EF4444', label: 'Error (Red)', preview: 'bg-red-500' },
  { value: '#3B82F6', label: 'Info (Blue)', preview: 'bg-blue-500' },
  { value: '#6B7280', label: 'Neutral (Gray)', preview: 'bg-gray-500' },
  { value: '#8B5CF6', label: 'Purple', preview: 'bg-purple-500' },
  { value: '#EC4899', label: 'Pink', preview: 'bg-pink-500' },
];

interface VisualEmailBuilderProps {
  value: VisualEmailData;
  onChange: (data: VisualEmailData) => void;
  templateVariables?: Variable[];
}

export function VisualEmailBuilder({ value, onChange, templateVariables }: VisualEmailBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const variables = templateVariables || VARIABLES;

  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addBlock = useCallback((type: BlockType) => {
    const definition = BLOCK_DEFINITIONS[type];
    const newBlock: EmailBlock = {
      id: generateId(),
      type,
      content: definition.defaultContent,
      properties: {},
    };

    // Set default properties
    if (definition.properties) {
      Object.entries(definition.properties).forEach(([key, prop]) => {
        if (prop.options) {
          newBlock.properties[key] = prop.options[0];
        } else {
          newBlock.properties[key] = key === 'url' ? '{{linkUrl}}' : '';
        }
      });
    }

    onChange({
      ...value,
      blocks: [...value.blocks, newBlock],
    });
    setSelectedBlockId(newBlock.id);
  }, [value, onChange]);

  const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
    onChange({
      ...value,
      blocks: value.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    });
  }, [value, onChange]);

  const deleteBlock = useCallback((id: string) => {
    onChange({
      ...value,
      blocks: value.blocks.filter(block => block.id !== id),
    });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [value, onChange, selectedBlockId]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const index = value.blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.blocks.length) return;

    const newBlocks = [...value.blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];

    onChange({
      ...value,
      blocks: newBlocks,
    });
  }, [value, onChange]);

  const insertVariable = useCallback((blockId: string, variableName: string) => {
    const block = value.blocks.find(b => b.id === blockId);
    if (!block) return;

    updateBlock(blockId, {
      content: block.content + `{{${variableName}}}`,
    });
  }, [value.blocks, updateBlock]);

  const selectedBlock = value.blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="space-y-4">
      {/* Header Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Header Title</Label>
              <Input
                placeholder="e.g., Congratulations!"
                value={value.headerTitle}
                onChange={(e) => onChange({ ...value, headerTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Header Color</Label>
              <Select
                value={value.headerColor}
                onValueChange={(color) => onChange({ ...value, headerColor: color })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {HEADER_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.preview}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {/* Blocks Panel */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Add Content Block</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(BLOCK_DEFINITIONS).map(([type, def]) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => addBlock(type as BlockType)}
                  >
                    <def.icon className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate text-xs">{def.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{def.label}</p>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Canvas - Block List */}
        <div className="col-span-2 space-y-3">
          <Label className="text-sm font-semibold">Email Content</Label>

          {value.blocks.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No content blocks yet</p>
              <p className="text-sm">Click a block type on the left to add content</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {value.blocks.map((block, index) => {
                const def = BLOCK_DEFINITIONS[block.type];
                const isSelected = selectedBlockId === block.id;

                return (
                  <Card
                    key={block.id}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                            disabled={index === value.blocks.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <def.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{def.label}</span>
                            {block.type === 'button' && block.properties.color && (
                              <Badge variant="secondary" className="text-xs">
                                {block.properties.color}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {block.content || '(empty)'}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Block Editor Panel */}
      {selectedBlock && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const def = BLOCK_DEFINITIONS[selectedBlock.type];
                  return (
                    <>
                      <def.icon className="h-5 w-5" />
                      <span className="font-semibold">Edit {def.label}</span>
                    </>
                  );
                })()}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Insert Variable
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Click to insert variable</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {variables.map(v => (
                    <DropdownMenuItem
                      key={v.name}
                      onClick={() => insertVariable(selectedBlock.id, v.name)}
                    >
                      <v.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{v.label}</span>
                          <code className="text-xs bg-muted px-1 rounded">{`{{${v.name}}}`}</code>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{v.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content Editor */}
            {selectedBlock.type !== 'divider' && (
              <div className="space-y-2">
                <Label>
                  {selectedBlock.type === 'details-table'
                    ? 'Table Rows (Label:Value per line)'
                    : selectedBlock.type.includes('list')
                    ? 'List Items (one per line)'
                    : 'Content'}
                </Label>
                {selectedBlock.type === 'text' ||
                 selectedBlock.type === 'details-table' ||
                 selectedBlock.type.includes('list') ||
                 selectedBlock.type === 'footer' ? (
                  <Textarea
                    value={selectedBlock.content}
                    onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                    rows={selectedBlock.type === 'footer' ? 3 : 4}
                    placeholder={
                      selectedBlock.type === 'details-table'
                        ? 'Amount:{{amount}}\nOffer:{{offerTitle}}'
                        : selectedBlock.type.includes('list')
                        ? 'Item 1\nItem 2\nItem 3'
                        : 'Enter content...'
                    }
                  />
                ) : (
                  <Input
                    value={selectedBlock.content}
                    onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                    placeholder="Enter content..."
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Use {`{{variableName}}`} to insert dynamic content
                </p>
              </div>
            )}

            {/* Block Properties */}
            {(() => {
              const def = BLOCK_DEFINITIONS[selectedBlock.type];
              if (!def.properties) return null;

              return (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(def.properties).map(([key, prop]) => (
                    <div key={key} className="space-y-2">
                      <Label>{prop.label}</Label>
                      {prop.type === 'select' && prop.options ? (
                        <Select
                          value={selectedBlock.properties[key] || prop.options[0]}
                          onValueChange={(val) => updateBlock(selectedBlock.id, {
                            properties: { ...selectedBlock.properties, [key]: val }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {prop.options.map(opt => (
                              <SelectItem key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={selectedBlock.properties[key] || ''}
                          onChange={(e) => updateBlock(selectedBlock.id, {
                            properties: { ...selectedBlock.properties, [key]: e.target.value }
                          })}
                          placeholder={key === 'url' ? '{{linkUrl}} or https://...' : ''}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Convert visual blocks to HTML
export function visualBlocksToHtml(data: VisualEmailData): string {
  const baseStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: ${data.headerColor || '#4F46E5'}; color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #E5E7EB; }
  `;

  const renderBlock = (block: EmailBlock): string => {
    switch (block.type) {
      case 'greeting':
        return `<p>${block.content}</p>`;

      case 'text':
        return `<p>${block.content.replace(/\n/g, '<br>')}</p>`;

      case 'heading':
        const sizes: Record<string, string> = {
          large: 'font-size: 24px; margin: 20px 0 15px 0;',
          medium: 'font-size: 20px; margin: 18px 0 12px 0;',
          small: 'font-size: 16px; margin: 15px 0 10px 0;',
        };
        return `<h3 style="${sizes[block.properties.size || 'medium']} font-weight: 600; color: #111827;">${block.content}</h3>`;

      case 'success-box':
        return `<div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #065F46;">${block.content.replace(/\n/g, '<br>')}</p>
        </div>`;

      case 'warning-box':
        return `<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400E;">${block.content.replace(/\n/g, '<br>')}</p>
        </div>`;

      case 'error-box':
        return `<div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991B1B;">${block.content.replace(/\n/g, '<br>')}</p>
        </div>`;

      case 'info-box':
        return `<div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1E40AF;">${block.content.replace(/\n/g, '<br>')}</p>
        </div>`;

      case 'button':
        const buttonColors: Record<string, string> = {
          primary: '#4F46E5',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          gray: '#6B7280',
        };
        const btnColor = buttonColors[block.properties.color || 'primary'];
        const btnUrl = block.properties.url || '{{linkUrl}}';
        return `<div style="text-align: center; margin: 30px 0;">
          <a href="${btnUrl}" style="display: inline-block; padding: 12px 30px; background-color: ${btnColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${block.content}</a>
        </div>`;

      case 'amount-display':
        const amountStyles: Record<string, { bg: string; label: string; amount: string }> = {
          default: { bg: '#F3F4F6', label: '#6B7280', amount: '#111827' },
          success: { bg: '#ECFDF5', label: '#065F46', amount: '#047857' },
          warning: { bg: '#FEF3C7', label: '#92400E', amount: '#D97706' },
        };
        const style = amountStyles[block.properties.style || 'default'];
        return `<div style="background-color: ${style.bg}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: ${style.label};">${block.properties.label || 'Amount'}</p>
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${style.amount};">${block.content}</p>
        </div>`;

      case 'details-table':
        const rows = block.content.split('\n').filter(line => line.includes(':'));
        const tableRows = rows.map(row => {
          const [label, ...valueParts] = row.split(':');
          const value = valueParts.join(':').trim();
          return `<tr style="border-bottom: 1px solid #D1D5DB;">
            <td style="padding: 12px 0; color: #6B7280;">${label.trim()}</td>
            <td style="padding: 12px 0; font-weight: 600; color: #111827; text-align: right;">${value}</td>
          </tr>`;
        }).join('');
        return `<div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">${tableRows}</table>
        </div>`;

      case 'divider':
        return `<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">`;

      case 'footer':
        const footerLines = block.content.split('\n').map(line => `<p>${line}</p>`).join('');
        return `<div class="footer">${footerLines}</div>`;

      case 'bullet-list':
        const bulletItems = block.content.split('\n').filter(Boolean).map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('');
        return `<ul style="margin: 15px 0; padding-left: 20px; color: #374151;">${bulletItems}</ul>`;

      case 'numbered-list':
        const numberedItems = block.content.split('\n').filter(Boolean).map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('');
        return `<ol style="margin: 15px 0; padding-left: 20px; color: #374151;">${numberedItems}</ol>`;

      default:
        return '';
    }
  };

  // Separate footer blocks from content blocks
  const contentBlocks = data.blocks.filter(b => b.type !== 'footer');
  const footerBlocks = data.blocks.filter(b => b.type === 'footer');

  const bodyContent = contentBlocks.map(renderBlock).join('\n');
  const footerContent = footerBlocks.length > 0
    ? footerBlocks.map(renderBlock).join('\n')
    : `<div class="footer">
        <p>This is an automated notification from AffiliateXchange.</p>
        <p>Update your <a href="/settings" style="color: #4F46E5;">notification preferences</a> anytime.</p>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${data.headerTitle || 'Notification'}</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    ${footerContent}
  </div>
</body>
</html>`;
}

// Parse HTML back to visual blocks (for editing existing templates)
export function htmlToVisualBlocks(html: string): VisualEmailData | null {
  // This is a simplified parser - in production you might want a more robust solution
  try {
    const data: VisualEmailData = {
      blocks: [],
      headerTitle: 'Notification',
      headerColor: '#4F46E5',
    };

    // Extract header title
    const headerMatch = html.match(/<div class="header"[^>]*>[\s\S]*?<h1[^>]*>(.*?)<\/h1>/i);
    if (headerMatch) {
      data.headerTitle = headerMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract header color
    const headerColorMatch = html.match(/\.header\s*\{[^}]*background-color:\s*([^;]+)/i);
    if (headerColorMatch) {
      data.headerColor = headerColorMatch[1].trim();
    }

    return data;
  } catch {
    return null;
  }
}

// Create empty visual data structure
export function createEmptyVisualData(): VisualEmailData {
  return {
    blocks: [
      {
        id: `block-${Date.now()}-1`,
        type: 'greeting',
        content: 'Hi {{userName}},',
        properties: {},
      },
    ],
    headerTitle: 'Notification',
    headerColor: '#4F46E5',
  };
}

export { VARIABLES, BLOCK_DEFINITIONS };
