import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function CopyButton({ 
  value, 
  className, 
  iconSize = 14, 
  variant = "ghost",
  size = "icon",
  title = "Copy to clipboard"
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation(); // Prevent triggering row clicks or inline edits
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [value]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(
        "h-7 w-7 transition-all duration-200",
        copied ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10",
        className
      )}
      title={copied ? "Copied!" : title}
    >
      {copied ? (
        <Check size={iconSize} className="animate-in zoom-in duration-200" />
      ) : (
        <Copy size={iconSize} />
      )}
    </Button>
  );
}
