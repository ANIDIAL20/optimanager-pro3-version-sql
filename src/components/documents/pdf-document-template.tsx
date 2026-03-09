import React, { useMemo } from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, isValid } from 'date-fns';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import { formatOpticalValue } from '@/lib/format-optical';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import { DEFAULT_DOCUMENT_SETTINGS, type DocType, type DocumentSettings, type DocumentSettingsBase } from '@/types/document-settings-types';

// Helper for formatting currency
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);

// Helper for radius
export const safeRadius = (value: unknown, fallback = 4) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const ITEMS_PER_PAGE = 8;

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
        <Document title="OptiManager Pro">
            <Page size="A4" style={{ padding: 40 }}>
                <Text>Données du document manquantes.</Text>
            </Page>
        </Document>
    );
  }

  // extract from data
  const doc = data.document || {};
  const client = data.client || {};
  const settings = data.settings || {};
  const dataSettings = data.documentSettings;

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
    primaryColor = '#1e293b',
    secondaryColor = '#f1f5f9',
    fontFamily = 'Helvetica',
    fontSize = 'medium',
    borderRadius = 4,
    logoPosition = 'left',
    language = 'fr',
    showLogo = true,
    showFooter = true,
    footerText = '',
    showAddress = true,
    showPhone = true,
    showEmail = true,
    showIce = true,
    showRc = true,
    showRib = true,
    showWatermark = false,
    watermarkText = 'CONFIDENTIEL',
    showSignature = true,
    showPageNumber = true,
  } = resolvedSettings;

  const r = safeRadius(borderRadius, 4);
  const radiusCorners = {
      borderTopLeftRadius: r, borderTopRightRadius: r,
      borderBottomLeftRadius: r, borderBottomRightRadius: r,
  };

  const mappedFontFamily = useMemo(() => {
    if (fontFamily === 'Arial' || fontFamily === 'Roboto') return 'Helvetica';
    if (fontFamily === 'Times New Roman') return 'Times-Roman';
    return fontFamily || 'Helvetica';
  }, [fontFamily]);

  const mappedFontSize = useMemo(() => {
    if (fontSize === 'small') return 9;
    if (fontSize === 'large') return 11;
    return 10;
  }, [fontSize]);

  // Styles
  const styles = useMemo(() => StyleSheet.create({
    page: { padding: 30, fontSize: mappedFontSize, fontFamily: mappedFontFamily, color: '#1a202c', lineHeight: 1.4, position: 'relative' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    miniHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: 15, 
      paddingBottom: 5, 
      borderBottomWidth: 1, 
      borderBottomColor: secondaryColor 
    },
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
    miniDocTitle: { fontSize: 12, fontWeight: 'bold', color: primaryColor },
    
    // Client Box
    clientBox: { 
        width: '45%', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', ...radiusCorners,
        backgroundColor: secondaryColor || 'transparent',
    },
    label: { fontSize: 8, color: '#718096', marginBottom: 2 },
    value: { fontSize: 10, fontWeight: 'bold' },

    // Table
    table: { marginTop: 10, width: '100%', flexGrow: 1 },
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
    footer: { marginTop: 20, textAlign: 'center', fontSize: 8, color: '#a0aec0', borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 10 },
    signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 20 },
    signatureBox: { width: '45%', height: 60, borderWidth: 1, borderColor: '#cbd5e0', ...radiusCorners, padding: 8 },
    watermark: {
      position: 'absolute',
      top: '40%',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 64,
      color: secondaryColor || '#94a3b8',
      opacity: 0.15,
      transform: 'rotate(-20deg)',
    },
    pageNumber: {
      position: 'absolute',
      fontSize: 8,
      bottom: 15,
      right: 30,
      color: '#94a3b8',
    },
  }), [mappedFontFamily, mappedFontSize, primaryColor, secondaryColor, logoPosition, r, radiusCorners]);

  const docTitles: Record<DocType, Record<'fr' | 'ar' | 'en', string>> = {
    facture: { fr: 'FACTURE', ar: 'FACTURE', en: 'INVOICE' },
    devis: { fr: 'DEVIS', ar: 'DEVIS', en: 'QUOTE' },
    bc: { fr: 'BON DE COMMANDE', ar: 'BON DE COMMANDE', en: 'PURCHASE ORDER' },
    bl: { fr: 'BON DE LIVRAISON', ar: 'BON DE LIVRAISON', en: 'DELIVERY NOTE' },
    recu: { fr: 'REÇU', ar: 'REÇU', en: 'RECEIPT' },
  };

  const titleLang = (language === 'ar' || language === 'en') ? language : 'fr';
  const docTitleString = docTitles[docType]?.[titleLang] || 'DOCUMENT';

  const amountInWordsLabel = useMemo(() => {
    if (titleLang === 'ar' || titleLang === 'fr') {
      return docType === 'devis'
        ? 'Arrêté le présent devis à la somme de :'
        : docType === 'facture'
          ? 'Arrêté la présente facture à la somme de :'
          : docType === 'bc'
            ? 'Arrêté le présent bon de commande à la somme de :'
            : 'Arrêté le présent bon de livraison à la somme de :';
    }
    if (titleLang === 'en') {
      return docType === 'devis'
        ? 'This quote is drawn up for the total amount of:'
        : 'This document is drawn up for the total amount of:';
    }
    return '';
  }, [docType, titleLang]);

  const formatDateSafe = (date: any) => {
      if (!date) return '-';
      try { 
          const d = new Date(date);
          return isValid(d) ? format(d, 'dd/MM/yyyy') : '-'; 
      } catch { return '-'; }
  };

  const safePdfTitle = useMemo(() => {
    try {
      const typeLabels: Record<DocType, string> = {
        facture: 'Facture',
        devis: 'Devis',
        bc: 'BonCommande',
        bl: 'Bon_Livraison',
        recu: 'Recu',
      };

      const reference =
        docType === 'devis'
          ? doc?.documentNumber || (doc?.id ? `DEV-${doc.id}` : 'Document')
          : doc?.saleNumber ||
            doc?.documentNumber ||
            doc?.orderNumber ||
            doc?.id ||
            'Document';

      const partyName =
        client?.fullName ||
        client?.nom ||
        client?.name ||
        doc?.clientName ||
        doc?.supplierName ||
        doc?.fournisseur ||
        settings?.storeName ||
        'Client';

      return (
        generateDocumentFilename(
          typeLabels[docType] || 'Document',
          String(reference || 'Document'),
          String(partyName || 'Client')
        ) || 'OptiManager Pro'
      );
    } catch (error) {
      console.error('[PDF ERROR]', error);
      return 'OptiManager Pro';
    }
  }, [client, doc, docType, settings]);

  const items = Array.isArray(doc.items) ? doc.items : [];
  
  // Chunking logic
  const chunkItems = (arr: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks.length > 0 ? chunks : [[]];
  };

  const pages = chunkItems(items, ITEMS_PER_PAGE);
  const totalPages = pages.length;

  return (
    <Document title={safePdfTitle || 'OptiManager Pro'}>
      {pages.map((pageItems, index) => {
        const isFirstPage = index === 0;
        const isLastPage = index === totalPages - 1;
        const currentPageNumber = index + 1;

        return (
          <Page key={index} size="A4" style={styles.page}>
            {showWatermark && (
              <Text style={styles.watermark} fixed>
                {watermarkText || 'CONFIDENTIEL'}
              </Text>
            )}

            {/* ====== HEADER ====== */}
            {isFirstPage ? (
              <View>
                <View style={styles.header}>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{settings?.storeName || settings?.shopName || 'Opticien'}</Text>
                    {showAddress && settings?.address && <Text>{String(settings.address)}</Text>}
                    <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                      {showPhone && settings?.phone && <Text>{String(settings.phone)} </Text>}
                      {showEmail && settings?.email && <Text>| {String(settings.email)}</Text>}
                    </View>
                    <View style={{ marginTop: 4 }}>
                      {showIce && settings?.ice && <Text style={styles.legalInfo}>ICE: {String(settings.ice)}</Text>}
                      {showRc && settings?.rc && <Text style={styles.legalInfo}>RC: {String(settings.rc)}</Text>}
                      {showRib && settings?.rib && <Text style={styles.legalInfo}>RIB: {String(settings.rib)}</Text>}
                    </View>
                  </View>
                  {showLogo && settings?.logoUrl && (
                    <View style={{ flexDirection: 'row', justifyContent: logoPosition === 'center' ? 'center' : (logoPosition === 'right' ? 'flex-end' : 'flex-start'), width: '45%' }}>
                      <Image style={styles.logo} src={settings.logoUrl} />
                    </View>
                  )}
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                  <View>
                    <Text style={styles.docTitle}>{docTitleString} N° {doc.saleNumber || doc.documentNumber || doc.orderNumber || doc.id || '—'}</Text>
                    <Text style={styles.label}>Date: {formatDateSafe(doc.date || doc.createdAt)}</Text>
                  </View>
                  <View style={styles.clientBox}>
                    <Text style={styles.label}>DESTINATAIRE</Text>
                    <Text style={styles.value}>{String(client?.fullName || client?.nom || doc?.clientName || doc?.supplierName || 'CLIENT PASSAGE').toUpperCase()}</Text>
                    {client?.phone && <Text style={{fontSize: 9}}>{String(client.phone)}</Text>}
                  </View>
                </View>
              </View>
            ) : (
              /* Mini Header for subsequent pages */
              <View style={styles.miniHeader}>
                <View>
                  <Text style={styles.miniDocTitle}>{docTitleString} N° {doc.saleNumber || doc.documentNumber || doc.orderNumber || doc.id || '—'}</Text>
                  <Text style={{fontSize: 8, color: '#718096'}}>Date: {formatDateSafe(doc.date || doc.createdAt)}</Text>
                </View>
                <View>
                  <Text style={{fontSize: 8, color: '#718096'}}>Page {currentPageNumber} / {totalPages}</Text>
                  <Text style={{fontSize: 9, fontWeight: 'bold'}}>{String(client?.fullName || client?.nom || 'CLIENT').toUpperCase()}</Text>
                </View>
              </View>
            )}

            {/* ====== Items Table ====== */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colDesc}>Désignation</Text>
                <Text style={styles.colBrand}>Marque</Text>
                <Text style={styles.colModel}>Modèle</Text>
                <Text style={styles.colQty}>Qte</Text>
                <Text style={styles.colPrice}>P.U.</Text>
                <Text style={styles.colTotal}>Total</Text>
              </View>
              {pageItems.map((item: any, i: number) => {
                const totalItem = Number(item?.lineTotalTTC || item?.total || 0);
                const unitPrice = Number(item?.unitPriceTTC || item?.prixUnitaire || 0);
                const quantity = Number(item?.quantity || item?.quantite || 1);
                const od = Array.isArray(item?.lensDetails) ? item.lensDetails.find((d: any) => d?.eye === 'OD') : null;
                const og = Array.isArray(item?.lensDetails) ? item.lensDetails.find((d: any) => d?.eye === 'OG') : null;
                const description = item?.lensType || item?.designation || item?.name || item?.productName || item?.label || 'Article';

                return (
                  <View key={i} style={styles.tableRow} wrap={false}>
                    <View style={styles.rowMain}>
                      <View style={styles.colDesc}>
                        <Text>{description}</Text>
                        {item?.reference && !item.reference.startsWith('LENS-PACK') && <Text style={{fontSize: 8, color: '#718096', marginTop: 2}}>Réf: {item.reference}</Text>}
                      </View>
                      <Text style={styles.colBrand}>{item?.brand || item?.marque || '-'}</Text>
                      <Text style={styles.colModel}>{item?.model || item?.modele || '-'}</Text>
                      <Text style={styles.colQty}>{quantity}</Text>
                      <Text style={styles.colPrice}>{formatMoney(unitPrice)}</Text>
                      <Text style={styles.colTotal}>{formatMoney(totalItem)}</Text>
                    </View>
                    {(od || og) && (
                      <View style={styles.opticalGrid}>
                        {od && (
                          <View style={styles.opticalRow}>
                            <Text style={[styles.optVal, {width: '8%', color: primaryColor}]}>OD</Text>
                            <Text style={styles.optLabel}>Sph: <Text style={styles.optVal}>{formatOpticalValue(od.sphere)}</Text></Text>
                            <Text style={styles.optLabel}>Cyl: <Text style={styles.optVal}>{formatOpticalValue(od.cylinder)}</Text></Text>
                            {od.axis && <Text style={styles.optLabel}>Axe: <Text style={styles.optVal}>{od.axis}°</Text></Text>}
                            {od.addition && <Text style={styles.optLabel}>Add: <Text style={styles.optVal}>{od.addition}</Text></Text>}
                          </View>
                        )}
                        {og && (
                          <View style={styles.opticalRow}>
                            <Text style={[styles.optVal, {width: '8%', color: primaryColor}]}>OG</Text>
                            <Text style={styles.optLabel}>Sph: <Text style={styles.optVal}>{formatOpticalValue(og.sphere)}</Text></Text>
                            <Text style={styles.optLabel}>Cyl: <Text style={styles.optVal}>{formatOpticalValue(og.cylinder)}</Text></Text>
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

            {/* ====== Totals, Footer & Signatures (Last Page Only) ====== */}
            {isLastPage && (
              <View>
                {/* Totals */}
                <View style={styles.totalsSection}>
                  <View style={styles.totalBox}>
                    <View style={styles.totalRow}>
                      <Text>Total HT</Text>
                      <Text style={{fontWeight: 'bold'}}>{formatMoney(Number(doc?.totalHT || 0))}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text>Total TVA</Text>
                      <Text style={{fontWeight: 'bold'}}>{formatMoney(Number(doc?.totalTVA || 0))}</Text>
                    </View>
                    <View style={styles.totalFinal}>
                      <Text style={{fontSize: 12, fontWeight: 'bold', color: primaryColor}}>NET À PAYER</Text>
                      <Text style={{fontSize: 12, fontWeight: 'bold', color: primaryColor}}>{formatMoney(Number(doc?.totalTTC || doc?.total || doc?.sousTotal || 0))}</Text>
                    </View>
                  </View>
                </View>

                {/* Footer */}
                {showFooter && (
                  <View style={styles.footer}>
                    <Text>{amountInWordsLabel} {formatCurrencyToWords(Number(doc?.totalTTC || 0))}</Text>
                    {footerText && <Text style={{marginTop: 4}}>{String(footerText)}</Text>}
                  </View>
                )}

                {/* Signatures */}
                {showSignature && (
                  <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                      <Text style={styles.label}>Signature</Text>
                    </View>
                    <View style={styles.signatureBox}>
                      <Text style={styles.label}>Cachet</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Page Number */}
            {showPageNumber && (
              <Text style={styles.pageNumber}>
                {currentPageNumber} / {totalPages}
              </Text>
            )}
          </Page>
        );
      })}
    </Document>
  );
};
