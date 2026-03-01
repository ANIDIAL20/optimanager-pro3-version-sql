export type TemplateId = 'classic' | 'modern' | 'minimal' | 'bold' | 'elegant'
export type HeaderLayout = 'logo-left' | 'logo-center' | 'logo-right'
export type FontSize = 'small' | 'medium' | 'large'

export interface DocumentTemplateConfig {
  templateId: TemplateId
  primaryColor: string
  secondaryColor: string
  headerLayout: HeaderLayout
  fontSize: FontSize
  showLogo: boolean
  showAddress: boolean
  showPhone: boolean
  showEmail: boolean
  showICE: boolean
  showRIB: boolean
  showSignatureBox: boolean
  showStamp: boolean
  footerText?: string
}

export const DEFAULT_TEMPLATE_CONFIG: DocumentTemplateConfig = {
  templateId: 'classic',
  primaryColor: '#1e293b',
  secondaryColor: '#64748b',
  headerLayout: 'logo-left',
  fontSize: 'medium',
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showICE: true,
  showRIB: false,
  showSignatureBox: true,
  showStamp: false,
  footerText: '',
}
