
export type DocType = 'facture' | 'devis' | 'bc' | 'bl';

export interface DocumentSettings {
  version: number;
  default: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: 'Helvetica' | 'Courier' | 'Times-Roman';
    layout: 'standard' | 'modern' | 'minimalist';
    showLogo: boolean;
    showFooter: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showIce: boolean;
    showRc: boolean;
    showRib: boolean;
    footerText?: string;
    logoPosition?: 'left' | 'center' | 'right';
    borderRadius?: number;
  };
  overrides?: any;
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  version: 1,
  default: {
    primaryColor: '#000000',
    secondaryColor: '#555555',
    fontFamily: 'Helvetica',
    layout: 'standard',
    showLogo: true,
    showFooter: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showIce: true,
    showRc: true,
    showRib: true,
    borderRadius: 4,
  },
};
