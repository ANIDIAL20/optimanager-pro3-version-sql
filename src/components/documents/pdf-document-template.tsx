import React, { useMemo } from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, isValid } from 'date-fns';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import { DEFAULT_DOCUMENT_SETTINGS, type DocType, type DocumentSettings, type DocumentSettingsBase } from '@/types/document-settings-types';

// Helper for formatting currency
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);

// Helper for radius
export const safeRadius = (value: unknown, fallback = 4) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

interface PdfDocumentTemplateProps {
  docType: DocType;
  data: {
    document: any;
    client: any;
    settings: any;
    documentSettings?: DocumentSettings;
  };
  documentSettings?: DocumentSettingsBase | null;
}

export const PdfDocumentTemplate = ({ docType, data, documentSettings }: PdfDocumentTemplateProps) => {
  // Robust check/fallback
  if (!data) {
    return (
        <Document>
            <Page size="A4" style={{ padding: 40 }}>
                <Text>Données du document manquantes.</Text>
            </Page>
        </Document>
    );
  }

  // extract from data for legacy support, or use prop
  const { document: doc, client, settings, documentSettings: dataSettings } = data;

  const legacyResolved = useMemo(() => {
    const legacy = dataSettings as any;
    if (!legacy) return null;

    const base = {
      ...DEFAULT_DOCUMENT_SETTINGS.default,
      ...(legacy.default || {}),
    };

    const legacyOverride = legacy.overrides?.[docType] || {};
    return {
      ...base,
      ...legacyOverride,
    } as DocumentSettingsBase;
  }, [dataSettings, docType]);

  const resolvedSettings: DocumentSettingsBase =
    documentSettings ?? legacyResolved ?? DEFAULT_DOCUMENT_SETTINGS.default;

  const {
    primaryColor,
    secondaryColor,
    fontFamily,
    fontSize,
    borderRadius,
    logoPosition,
    language,
    showLogo,
    showFooter,
    footerText,
    showAddress,
    showPhone,
    showEmail,
    showIce,
    showRc,
    showRib,
    showWatermark,
    watermarkText,
    showSignature,
    showPageNumber,
  } = resolvedSettings;

  const r = safeRadius(borderRadius, 4);
  const radiusCorners = {
      borderTopLeftRadius: r, borderTopRightRadius: r,
      borderBottomLeftRadius: r, borderBottomRightRadius: r,
  };

  const mappedFontFamily = useMemo(() => {
    if (fontFamily === 'Arial' || fontFamily === 'Roboto') return 'Helvetica';
    if (fontFamily === 'Times New Roman') return 'Times-Roman';
    return fontFamily;
  }, [fontFamily]);

  const mappedFontSize = useMemo(() => {
    if (fontSize === 'small') return 9;
    if (fontSize === 'large') return 11;
    return 10;
  }, [fontSize]);

  // Styles
  const styles = useMemo(() => StyleSheet.create({
    page: { padding: 30, fontSize: mappedFontSize, fontFamily: mappedFontFamily || 'Helvetica', color: '#1a202c', lineHeight: 1.4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    logoContainer: { width: '100%', flexDirection: 'row', justifyContent: logoPosition === 'center' ? 'center' : (logoPosition === 'right' ? 'flex-end' : 'flex-start'), marginBottom: 10 },
    logo: { width: 80, height: 80, objectFit: 'contain' },
    companyInfo: { width: '50%' },
    companyName: { fontSize: 18, fontWeight: 'bold', color: primaryColor, marginBottom: 4 },
    legalInfo: { fontSize: 8, color: '#718096', marginTop: 4 },

    // Title Section
    titleSection: { 
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, 
        borderBottomWidth: 1, borderBottomColor: secondaryColor, paddingBottom: 10 
    },
    docTitle: { fontSize: 20, fontWeight: 'bold', color: primaryColor, textTransform: 'uppercase' },
    
    // Client Box
    clientBox: { 
        width: '45%', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', ...radiusCorners,
        backgroundColor: secondaryColor || 'transparent',
    },
    label: { fontSize: 8, color: '#718096', marginBottom: 2 },
    value: { fontSize: 10, fontWeight: 'bold' },

    // Table
    table: { marginTop: 10, width: '100%' },
    tableHeader: { 
        flexDirection: 'row', 
        backgroundColor: secondaryColor,
        color: '#fff',
        padding: 8,
        borderTopLeftRadius: r,
        borderTopRightRadius: r,
        fontWeight: 'bold'
    },
    tableRow: { flexDirection: 'column', borderBottomWidth: 1, borderBottomColor: '#edf2f7', paddingVertical: 8 },
    rowMain: { flexDirection: 'row', paddingHorizontal: 8 },
    
    colDesc: { width: '30%' },
    colBrand: { width: '15%' },
    colModel: { width: '15%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    // Optical Details
    opticalGrid: { marginLeft: 10, marginTop: 4, padding: 4, backgroundColor: '#f8fafc', ...radiusCorners },
    opticalRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'center' },
    optLabel: { width: '18%', fontSize: 8, color: '#718096' },
    optVal: { fontSize: 8, fontWeight: 'bold', color: '#2d3748' },

    // Totals
    totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
    totalBox: { width: '40%' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    totalFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 2, borderTopColor: primaryColor, marginTop: 4 },
    
    // Footer
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#a0aec0', borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 10 },
    signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 20 },
    signatureBox: { width: '45%', height: 60, borderWidth: 1, borderColor: '#cbd5e0', ...radiusCorners, padding: 8 },
    watermark: {
      position: 'absolute',
      top: '45%',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 64,
      color: secondaryColor || '#94a3b8',
      opacity: 0.15,
      transform: [{ rotate: '-20deg' }],
    },
    pageNumber: {
      position: 'absolute',
      fontSize: 8,
      bottom: 12,
      right: 30,
      color: '#94a3b8',
    },
  }), [mappedFontFamily, mappedFontSize, primaryColor, secondaryColor, logoPosition, r, radiusCorners]);

  const docTitles: Record<DocType, Record<'fr' | 'ar' | 'en', string>> = {
    facture: { fr: 'FACTURE', ar: 'فاتورة', en: 'INVOICE' },
    devis: { fr: 'DEVIS', ar: 'عرض سعر', en: 'QUOTE' },
    bc: { fr: 'BON DE COMMANDE', ar: 'طلب شراء', en: 'PURCHASE ORDER' },
    bl: { fr: 'BON DE LIVRAISON', ar: 'وصل توصيل', en: 'DELIVERY NOTE' },
  };

  const titleLang = (language === 'ar' || language === 'en') ? language : 'fr';
  const docTitle = docTitles[docType][titleLang];

  const amountInWordsLabel = useMemo(() => {
    if (titleLang === 'ar') {
      return docType === 'devis'
        ? 'حُدِّد هذا العرض بمبلغ:'
        : 'حُدِّدت هذه الوثيقة بمبلغ:';
    }
    if (titleLang === 'en') {
      return docType === 'devis'
        ? 'This quote is drawn up for the total amount of:'
        : 'This document is drawn up for the total amount of:';
    }
    // fr
    return docType === 'devis'
      ? 'Arrêté le présent devis à la somme de :'
      : docType === 'facture'
        ? 'Arrêté la présente facture à la somme de :'
        : docType === 'bc'
          ? 'Arrêté le présent bon de commande à la somme de :'
          : 'Arrêté le présent bon de livraison à la somme de :';
  }, [docType, titleLang]);

  const formatDateSafe = (date: any) => {
      try { return isValid(new Date(date)) ? format(new Date(date), 'dd/MM/yyyy') : '-'; } catch { return '-'; }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {showWatermark && (
          <Text style={styles.watermark} fixed>
            {watermarkText || 'CONFIDENTIEL'}
          </Text>
        )}
        
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{settings?.storeName || 'Opticien'}</Text>
                
                {showAddress && settings?.address && (
                    <Text>{settings.address}</Text>
                )}
                
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                   {showPhone && settings?.phone && <Text>{settings.phone} </Text>}
                   {showEmail && settings?.email && <Text>| {settings.email}</Text>}
                </View>

                <View style={{ marginTop: 4 }}>
                   {showIce && settings?.ice && <Text style={styles.legalInfo}>ICE: {settings.ice}</Text>}
                   {showRc && settings?.rc && <Text style={styles.legalInfo}>RC: {settings.rc}</Text>}
                   {showRib && settings?.rib && <Text style={styles.legalInfo}>RIB: {settings.rib}</Text>}
                </View>
            </View>
            {showLogo && settings?.logoUrl && (
              <View style={{ flexDirection: 'row', justifyContent: logoPosition === 'center' ? 'center' : (logoPosition === 'right' ? 'flex-end' : 'flex-start'), width: '50%' }}>
                <Image style={styles.logo} src={settings.logoUrl} />
              </View>
            )}
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
            <View>
                <Text style={styles.docTitle}>{docTitle} N° {doc.saleNumber || doc.id}</Text>
                <Text style={styles.label}>Date: {formatDateSafe(doc.date || doc.createdAt)}</Text>
            </View>
            <View style={styles.clientBox}>
                <Text style={styles.label}>CLIENT</Text>
                <Text style={styles.value}>{client?.fullName?.toUpperCase() || 'CLIENT PASSAGE'}</Text>
                {client?.phone && <Text style={{fontSize: 9}}>{client.phone}</Text>}
            </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
            <View style={styles.tableHeader}>
                <Text style={styles.colDesc}>Désignation</Text>
                <Text style={styles.colBrand}>Marque</Text>
                <Text style={styles.colModel}>Modèle</Text>
                <Text style={styles.colQty}>Qte</Text>
                <Text style={styles.colPrice}>P.U.</Text>
                <Text style={styles.colTotal}>Total</Text>
            </View>
            {(doc.items || []).map((item: any, i: number) => {
                const totalItem = Number(item.lineTotalTTC || 0);
                const unitPrice = Number(item.unitPriceTTC || 0);
                // Optical detals check
                const od = Array.isArray(item.lensDetails) ? item.lensDetails.find((d: any) => d.eye === 'OD') : null;
                const og = Array.isArray(item.lensDetails) ? item.lensDetails.find((d: any) => d.eye === 'OG') : null;

                return (
                    <View key={i} style={styles.tableRow} wrap={false}>
                        <View style={styles.rowMain}>
                            <View style={styles.colDesc}>
                                <Text>{item.productName || item.label}</Text>
                                {item.reference && <Text style={{fontSize: 8, color: '#718096', marginTop: 2}}>Réf: {item.reference}</Text>}
                            </View>
                            <Text style={styles.colBrand}>{item.brand || '-'}</Text>
                            <Text style={styles.colModel}>{item.model || '-'}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{formatMoney(unitPrice)}</Text>
                            <Text style={styles.colTotal}>{formatMoney(totalItem)}</Text>
                        </View>
                        
                        {/* Lens Details */}
                        {(od || og) && (
                            <View style={styles.opticalGrid}>
                                {od && (
                                    <View style={styles.opticalRow}>
                                        <Text style={[styles.optVal, {width: '8%', color: primaryColor}]}>OD</Text>
                                        <Text style={styles.optLabel}>Sph: <Text style={styles.optVal}>{od.sphere}</Text></Text>
                                        <Text style={styles.optLabel}>Cyl: <Text style={styles.optVal}>{od.cylinder}</Text></Text>
                                        {od.axis && <Text style={styles.optLabel}>Axe: <Text style={styles.optVal}>{od.axis}°</Text></Text>}
                                        {od.addition && <Text style={styles.optLabel}>Add: <Text style={styles.optVal}>{od.addition}</Text></Text>}
                                    </View>
                                )}
                                {og && (
                                    <View style={styles.opticalRow}>
                                        <Text style={[styles.optVal, {width: '8%', color: primaryColor}]}>OG</Text>
                                        <Text style={styles.optLabel}>Sph: <Text style={styles.optVal}>{og.sphere}</Text></Text>
                                        <Text style={styles.optLabel}>Cyl: <Text style={styles.optVal}>{og.cylinder}</Text></Text>
                                        {og.axis && <Text style={styles.optLabel}>Axe: <Text style={styles.optVal}>{og.axis}°</Text></Text>}
                                        {og.addition && <Text style={styles.optLabel}>Add: <Text style={styles.optVal}>{og.addition}</Text></Text>}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );
            })}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
            <View style={styles.totalBox}>
                <View style={styles.totalRow}>
                    <Text>Total HT</Text>
                    <Text style={{fontWeight: 'bold'}}>{formatMoney(Number(doc.totalHT || 0))}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text>Total TVA</Text>
                    <Text style={{fontWeight: 'bold'}}>{formatMoney(Number(doc.totalTVA || 0))}</Text>
                </View>
                <View style={styles.totalFinal}>
                    <Text style={{fontSize: 12, fontWeight: 'bold', color: primaryColor}}>NET À PAYER</Text>
                    <Text style={{fontSize: 12, fontWeight: 'bold', color: primaryColor}}>{formatMoney(Number(doc.totalTTC || 0))}</Text>
                </View>
            </View>
        </View>

        {/* Footer */}
        {showFooter && (
            <View style={styles.footer}>
                <Text>{amountInWordsLabel} {formatCurrencyToWords(Number(doc.totalTTC || 0))}</Text>
                {footerText && <Text style={{marginTop: 4}}>{footerText}</Text>}
            </View>
        )}

        {showSignature && (
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.label}>{titleLang === 'ar' ? 'التوقيع' : (titleLang === 'en' ? 'Signature' : 'Signature')}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.label}>{titleLang === 'ar' ? 'الختم' : (titleLang === 'en' ? 'Stamp' : 'Cachet')}</Text>
            </View>
          </View>
        )}

        {showPageNumber && (
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        )}
      </Page>
    </Document>
  );
};
