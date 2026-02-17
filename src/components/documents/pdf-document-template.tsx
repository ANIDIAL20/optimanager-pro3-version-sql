import React, { useMemo } from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format, addDays, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';
import { DocumentSettings, DEFAULT_DOCUMENT_SETTINGS } from '@/lib/document-settings-types';

// Helper for formatting currency
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);

// Helper for radius
export const safeRadius = (value: unknown, fallback = 4) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

interface PdfDocumentTemplateProps {
    type: 'devis' | 'facture' | 'bc' | 'bl';
    data: {
        document: any;
        client: any;
        settings: any; // Shop Profile (static info)
        documentSettings?: DocumentSettings; // Dynamic Design (colors, layout) (Legacy path)
    };
    documentSettings?: DocumentSettings; // 🆕 Direct Prop (Preferred path)
}

export const PdfDocumentTemplate = ({ type, data, documentSettings }: PdfDocumentTemplateProps) => {
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
  
  // Merge defaults
  const effectiveSettings = documentSettings || dataSettings; // Prop wins

  const docConfig = useMemo(() => {
    const inputDefaults = effectiveSettings?.default || {};
    return { ...DEFAULT_DOCUMENT_SETTINGS.default, ...inputDefaults };
  }, [effectiveSettings, type]);

  const { 
      primaryColor, secondaryColor, fontFamily, layout, 
      showFooter, footerText, showLogo, logoPosition, borderRadius,
      showAddress, showPhone, showEmail, showIce, showRc, showRib 
  } = docConfig;
  const r = safeRadius(borderRadius, 4);
  const radiusCorners = {
      borderTopLeftRadius: r, borderTopRightRadius: r,
      borderBottomLeftRadius: r, borderBottomRightRadius: r,
  };

  // Styles
  const styles = useMemo(() => StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: fontFamily || 'Helvetica', color: '#1a202c', lineHeight: 1.4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    logoContainer: { width: '100%', flexDirection: 'row', justifyContent: logoPosition === 'center' ? 'center' : (logoPosition === 'right' ? 'flex-end' : 'flex-start'), marginBottom: 10 },
    logo: { width: 80, height: 80, objectFit: 'contain' },
    companyInfo: { width: '50%' },
    companyName: { fontSize: 18, fontWeight: 'bold', color: primaryColor, marginBottom: 4 },
    legalInfo: { fontSize: 8, color: '#718096', marginTop: 4 },
    // ... (rest of styles logic is fine, using existing styles)
    
    // Title Section
    titleSection: { 
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, 
        borderBottomWidth: 1, borderBottomColor: secondaryColor, paddingBottom: 10 
    },
    docTitle: { fontSize: 20, fontWeight: 'bold', color: primaryColor, textTransform: 'uppercase' },
    
    // Client Box
    clientBox: { 
        width: '45%', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', ...radiusCorners,
        backgroundColor: layout === 'modern' ? '#f8fafc' : 'transparent' 
    },
    label: { fontSize: 8, color: '#718096', marginBottom: 2 },
    value: { fontSize: 10, fontWeight: 'bold' },

    // Table
    table: { marginTop: 10, width: '100%' },
    tableHeader: { 
        flexDirection: 'row', 
        backgroundColor: layout === 'minimalist' ? 'transparent' : secondaryColor, 
        color: layout === 'minimalist' ? '#000' : '#fff', 
        padding: 8,
        borderTopLeftRadius: layout === 'modern' ? r : 0, 
        borderTopRightRadius: layout === 'modern' ? r : 0,
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
    signatureBox: { width: '45%', height: 60, borderWidth: 1, borderColor: '#cbd5e0', ...radiusCorners, padding: 8 }
  }), [docConfig, r]);

  const docTitle = type === 'devis' ? 'DEVIS' : (type === 'bc' ? 'BON DE COMMANDE' : 'FACTURE');
  const dateObj = doc.date ? new Date(doc.date) : new Date();
  
  const formatDateSafe = (date: any) => {
      try { return isValid(new Date(date)) ? format(new Date(date), 'dd/MM/yyyy') : '-'; } catch { return '-'; }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{settings?.storeName || 'Opticien'}</Text>
                
                {(showAddress !== false) && settings?.address && (
                    <Text>{settings.address}</Text>
                )}
                
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                   {(showPhone !== false) && settings?.phone && <Text>{settings.phone} </Text>}
                   {(showEmail !== false) && settings?.email && <Text>| {settings.email}</Text>}
                </View>

                <View style={{ marginTop: 4 }}>
                   {(showIce !== false) && settings?.ice && <Text style={styles.legalInfo}>ICE: {settings.ice}</Text>}
                   {(showRc !== false) && settings?.rc && <Text style={styles.legalInfo}>RC: {settings.rc}</Text>}
                   {(showRib !== false) && settings?.rib && <Text style={styles.legalInfo}>RIB: {settings.rib}</Text>}
                </View>
            </View>
            {showLogo && settings?.logoUrl && <Image style={styles.logo} src={settings.logoUrl} />}
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
                <Text>Arrêté la présente facture à la somme de : {formatCurrencyToWords(Number(doc.totalTTC || 0))}</Text>
                {footerText && <Text style={{marginTop: 4}}>{footerText}</Text>}
                <Text style={{marginTop: 4}}>Merci de votre confiance.</Text>
            </View>
        )}
      </Page>
    </Document>
  );
};
