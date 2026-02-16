import React, { useState, useRef, useEffect } from 'react';
import type { ExportButtonProps, ExportFormat } from './types';
import { Download, FileText, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ExportButton - Export button with dropdown menu for different formats
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  isExporting,
  compact = false
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const exportOptions: { format: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
    {
      format: 'pptx-editable',
      label: t('exportFormats.pptxEditable.label'),
      description: t('exportFormats.pptxEditable.desc'),
      icon: <FileText size={16} />
    },
    {
      format: 'pptx-image',
      label: t('exportFormats.pptxImage.label'),
      description: t('exportFormats.pptxImage.desc'),
      icon: <FileText size={16} />
    },
    {
      format: 'png',
      label: t('exportFormats.png.label'),
      description: t('exportFormats.png.desc'),
      icon: <ImageIcon size={16} />
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative" data-testid="export-button-container" ref={menuRef}>
      <button
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
          ${compact ? 'aspect-square justify-center p-2' : ''}
          ${isExporting
            ? 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed border-transparent'
            : 'bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none'
          }
        `}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={isExporting}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={isExporting ? t('toolbar.exportingAria') : t('toolbar.exportOptionsAria')}
        data-testid="export-button"
        title={t('toolbar.exportTitle')}
      >
        <Download size={18} />
        {!compact && (
          <>
            <span>{isExporting ? t('toolbar.exporting') : t('toolbar.export')}</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isMenuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 p-1 rounded-xl glass-card z-50 animate-in fade-in zoom-in-95 duration-200"
          data-testid="export-menu"
          role="menu"
          aria-label={t('toolbar.exportMenu')}
        >
          {exportOptions.map((option) => (
            <button
              key={option.format}
              className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
              onClick={() => handleExport(option.format)}
              data-testid={`export-option-${option.format}`}
              role="menuitem"
              aria-label={`${option.label}: ${option.description}`}
            >
              <div className="flex items-center gap-2 mb-1 text-slate-900 dark:text-white font-medium">
                {React.isValidElement(option.icon) && React.cloneElement(option.icon as React.ReactElement<any>, { size: 16, className: 'text-primary' })}
                <span>{option.label}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 pl-6 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
