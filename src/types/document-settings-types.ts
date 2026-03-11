export const SUPPORTED_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Roboto'] as const;
export const SUPPORTED_LAYOUTS = ['classic', 'modern', 'minimal', 'compact'] as const;
export const SUPPORTED_THEMES = ['default', 'blue', 'green', 'dark', 'elegant'] as const;
export const SUPPORTED_LANGS = ['fr', 'ar', 'en'] as const;
export const CURRENT_DOC_VERSION = 3;

export type FontFamily = (typeof SUPPORTED_FONTS)[number];
export type Layout = (typeof SUPPORTED_LAYOUTS)[number];
export type Theme = (typeof SUPPORTED_THEMES)[number];
export type Language = (typeof SUPPORTED_LANGS)[number];
export type DocType = 'facture' | 'devis' | 'bc' | 'bl';

export interface DocTypeOverride {
  primaryColor?: string;
  secondaryColor?: string;
  showLogo?: boolean;
  showFooter?: boolean;
  footerText?: string;
  layout?: Layout;
  theme?: Theme;
  showWatermark?: boolean;
  watermarkText?: string;
}

export interface DocumentSettingsBase {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: FontFamily;
  layout: Layout;
  theme: Theme;
  language: Language;
  showLogo: boolean;
  showFooter: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showIce: boolean;
  showRc: boolean;
  showRib: boolean;
  showWatermark: boolean;
  showPageNumber: boolean;
  showSignature: boolean;
  footerText: string;
  watermarkText: string;
  logoPosition: 'left' | 'center' | 'right';
  borderRadius: number;
  fontSize: 'small' | 'medium' | 'large';
}

export interface DocumentSettings {
  version: number;
  default: DocumentSettingsBase;
  overrides: Partial<Record<DocType, Partial<DocTypeOverride>>>;
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  version: CURRENT_DOC_VERSION,
  default: {
    primaryColor: '#2563eb',
    secondaryColor: '#f8fafc',
    fontFamily: 'Arial',
    layout: 'classic',
    theme: 'default',
    language: 'fr',
    showLogo: true,
    showFooter: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showIce: true,
    showRc: false,
    showRib: false,
    showWatermark: false,
    showPageNumber: true,
    showSignature: false,
    footerText: 'Merci pour votre confiance.',
    watermarkText: 'CONFIDENTIEL',
    logoPosition: 'left',
    borderRadius: 4,
    fontSize: 'medium',
  },
  overrides: {
    devis: { showWatermark: true, watermarkText: 'DEVIS' },
  },
};
