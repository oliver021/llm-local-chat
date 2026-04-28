import React from 'react';
import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  MessageSquare,
  Sparkles,
  Pin,
  Plus,
  Settings,
  Sun,
  Moon,
  Send,
  Menu,
  MoreHorizontal,
  Bot,
  X,
  User,
  Palette,
  Shield,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Cpu,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Download,
  Search,
  Heart,
  Info,
  ChevronDown,
  Star,
  Square,
  Mic,
  Globe,
} from 'lucide-react';

interface ColorfulIconProps {
  icon: FC<LucideProps>;
  colorClass: string;
  size?: number;
  className?: string;
}

// Wrapper to easily apply colorful gradients or specific colors to icons
export const ColorfulIcon = ({ icon: Icon, colorClass, size = 20, className = '' }: ColorfulIconProps) => (
  <div className={`${colorClass} ${className} flex items-center justify-center`}>
    <Icon size={size} strokeWidth={2.5} />
  </div>
);

export {
  MessageSquare,
  Sparkles,
  Pin,
  Plus,
  Settings,
  Sun,
  Moon,
  Send,
  Menu,
  MoreHorizontal,
  Bot,
  X,
  User,
  Palette,
  Shield,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Cpu,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Download,
  Search,
  Heart,
  Info,
  ChevronDown,
  Star,
  Square,
  Mic,
  Globe,
};
