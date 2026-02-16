import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format, addDays, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

// Styles (CSS for PDF)
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#333', lineHeight: 1.4 },
  
  // Header Section
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyInfo: { width: '60%' },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 4 },
  legalInfo: { fontSize: 8, color: '#666', marginTop: 4 },
  logo: { width: 80, height: 80, objectFit: 'contain' },
  
  // Document Title & Client
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1 solid #eee', paddingBottom: 10 },
  docTitleBase: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  clientBox: { border: '1 solid #e2e8f0', padding: 10, borderRadius: 4, width: '45%' },
  label: { fontSize: 8, color: '#718096', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 'bold' },

  // Table
  table: { marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f7fafc', borderBottom: '1 solid #cbd5e0', padding: 8 },
  tableRow: { flexDirection: 'column', borderBottom: '1 solid #eee', paddingVertical: 8 }, 
  tableRowReturned: { flexDirection: 'column', borderBottom: '1 solid #eee', paddingVertical: 8, opacity: 0.6, backgroundColor: '#fff5f5' },
  
  rowMain: { flexDirection: 'row', paddingHorizontal: 8 }, 
  colDesc: { width: '40%' },
  colBrand: { width: '15%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  badgeReturned: { color: '#e53e3e', fontSize: 7, fontWeight: 'bold', marginTop: 2 },

  // Optical Grid (The Magic Part 👓)
  opticalGrid: { marginLeft: 20, marginTop: 6, marginBottom: 4, padding: 6, backgroundColor: '#f8f9fa', borderRadius: 4, border: '1 solid #e9ecef' },
  opticalHeader: { flexDirection: 'row', borderBottom: '1 solid #dee2e6', paddingBottom: 4, marginBottom: 4 },
  opticalRow: { flexDirection: 'row', marginBottom: 2 },
  optColEye: { width: '10%', fontWeight: 'bold', fontSize: 8 },
  optColVal: { width: '15%', fontSize: 8, textAlign: 'center' },
  optLabel: { width: '15%', fontSize: 7, color: '#666', textAlign: 'center' },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  totalBox: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #eee' },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 4 },
  totalLabel: { fontSize: 10 },
  totalValue: { fontSize: 10, fontWeight: 'bold' },
  totalFinal: { fontSize: 12, fontWeight: 'bold' },
  
  // Footer & Signatures
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, borderTop: '1 solid #eee', paddingTop: 20 },
  signatureBox: { width: '45%', height: 60, border: '1 solid #cbd5e0', borderRadius: 4, padding: 8 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#a0aec0', borderTop: '1 solid #eee', paddingTop: 10 },
});

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);

interface PdfDocumentTemplateProps {
    type: 'devis' | 'facture';
    data: {
        document: any;
        client: any;
        settings: any;
    };
}

export const PdfDocumentTemplate = ({ type, data }: PdfDocumentTemplateProps) => {
  const { document: doc, client, settings } = data;
  
  // 🔥 UNIFIED LOGIC: Switch between Devis and Facture
  const isQuote = type === 'devis' || doc.type === 'QUOTE';
  const docTitle = isQuote ? 'DEVIS' : 'FACTURE';
  const primaryColor = isQuote ? '#718096' : '#2c5282'; // Grey for Quotes, Blue for Invoices
  
  // Define allItems for the audit trail
  const allItems = doc.items || [];
  

  const formatDateSafe = (dateVal: any) => {
    try {
        if (!dateVal) return format(new Date(), 'dd/MM/yyyy');
        const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
        if (!isValid(date)) return format(new Date(), 'dd/MM/yyyy');
        return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
        return format(new Date(), 'dd/MM/yyyy');
    }
  };

  const totalTTC = Number(doc.totalTTC || doc.totalAmount || 0);
  const dateObj = doc.date || doc.createdAt ? new Date(doc.date || doc.createdAt) : new Date();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* --- HEADER (Company Info) --- */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={[styles.companyName, { color: primaryColor }]}>{settings?.storeName || settings?.shopName || 'OptiManager Pro'}</Text>
            <Text>{settings?.address || 'Adresse du magasin'}</Text>
            <Text>{settings?.phone || ''} {settings?.email ? `| ${settings.email}` : ''}</Text>
            <Text style={styles.legalInfo}>
                {settings?.ice && `ICE: ${settings.ice} | `} 
                {settings?.rc && `RC: ${settings.rc} | `} 
                {settings?.if && `IF: ${settings.if} | `} 
                {settings?.patente && `Patente: ${settings.patente}`}
            </Text>
          </View>
          {settings?.logoUrl && <Image style={styles.logo} src={settings.logoUrl} />}
        </View>

        {/* --- TITLE & CLIENT --- */}
        <View style={styles.titleSection}>
          <View>
            <Text style={[styles.docTitleBase, { color: primaryColor }]}>{docTitle} N° {doc.saleNumber || doc.invoiceNumber || String(doc.id).substring(0,8).toUpperCase()}</Text>
            <Text style={styles.label}>Date: {formatDateSafe(doc.date || doc.createdAt)}</Text>
            {isQuote && (
                <Text style={{ fontSize: 9, color: '#e53e3e', marginTop: 4 }}>
                    Valable jusqu'au: {isValid(addDays(dateObj, 15)) ? format(addDays(dateObj, 15), 'dd/MM/yyyy', { locale: fr }) : formatDateSafe(addDays(new Date(), 15))}
                </Text>
            )}
          </View>
          <View style={styles.clientBox}>
            <Text style={styles.label}>CLIENT</Text>
            <Text style={styles.value}>{client?.fullName || client?.name || doc.clientName || 'Client Passage'}</Text>
            {(client?.phone || doc.clientPhone) && <Text style={{fontSize: 9}}>{client?.phone || doc.clientPhone}</Text>}
            {(client?.mutuelle || client?.assuranceId) && <Text style={{fontSize: 9, color: '#4a5568'}}>Mutuelle: {client?.mutuelle || client?.assuranceId}</Text>}
          </View>
        </View>

        {/* --- TABLE ITEMS --- */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, {fontWeight: 'bold'}]}>Désignation</Text>
            <Text style={[styles.colBrand, {fontWeight: 'bold'}]}>Marque</Text>
            <Text style={[styles.colQty, {fontWeight: 'bold'}]}>Qté</Text>
            <Text style={[styles.colPrice, {fontWeight: 'bold'}]}>P.U. (TTC)</Text>
            <Text style={[styles.colTotal, {fontWeight: 'bold'}]}>Total (TTC)</Text>
          </View>

          {/* Rows */}
          {allItems.map((item: any, i: number) => {
            const unitTTC = Number(item.unitPriceTTC || item.unitPrice || item.prixVente || 0);
            const lineTTC = Number(item.lineTotalTTC || item.totalTTC || (unitTTC * (item.quantity || item.qty)));
            
            // ✅ CHECK FOR RETURNED/CANCELED
            const isReturned = (item.quantity || item.qty) <= 0 || item.status === 'returned';
            
            const od = Array.isArray(item.lensDetails) ? item.lensDetails.find((ld: any) => ld.eye === 'OD') : null;
            const og = Array.isArray(item.lensDetails) ? item.lensDetails.find((ld: any) => ld.eye === 'OG') : null;
            const isLens = item.productType === 'lens' || item.type === 'VERRE';

            return (
                <View key={i} style={isReturned ? styles.tableRowReturned : styles.tableRow} wrap={false}>
                    <View style={styles.rowMain}>
                        <View style={styles.colDesc}>
                            <Text>{item.productName || item.label || item.nomProduit}</Text>
                            {isReturned && <Text style={styles.badgeReturned}>(RETOURNÉ / ANNULÉ)</Text>}
                        </View>
                        <Text style={styles.colBrand}>{item.brand || item.marque || '-'}</Text>
                        <Text style={styles.colQty}>{item.quantity || item.qty}</Text>
                        <Text style={styles.colPrice}>{formatMoney(unitTTC)}</Text>
                        <Text style={styles.colTotal}>{formatMoney(lineTTC)}</Text>
                    </View>

                    {/* 👓 SUB-ROW: Optical Details (Only for non-returned) */}
                    {!isReturned && isLens && (od || og) && (
                        <View style={styles.opticalGrid}>
                            <View style={styles.opticalHeader}>
                                <Text style={styles.optColEye}>Oeil</Text>
                                <Text style={styles.optLabel}>Sphère</Text>
                                <Text style={styles.optLabel}>Cylindre</Text>
                                <Text style={styles.optLabel}>Axe</Text>
                                <Text style={styles.optLabel}>Add</Text>
                                <Text style={styles.optLabel}>Traitement</Text>
                            </View>
                            {od && (
                                <View style={styles.opticalRow}>
                                <Text style={styles.optColEye}>OD</Text>
                                <Text style={styles.optColVal}>{od.sphere || '-'}</Text>
                                <Text style={styles.optColVal}>{od.cylinder || '-'}</Text>
                                <Text style={styles.optColVal}>{od.axis ? od.axis + '°' : '-'}</Text>
                                <Text style={styles.optColVal}>{od.addition || '-'}</Text>
                                <Text style={styles.optColVal}>{od.treatment || '-'}</Text>
                                </View>
                            )}
                            {og && (
                                <View style={styles.opticalRow}>
                                <Text style={styles.optColEye}>OG</Text>
                                <Text style={styles.optColVal}>{og.sphere || '-'}</Text>
                                <Text style={styles.optColVal}>{og.cylinder || '-'}</Text>
                                <Text style={styles.optColVal}>{og.axis ? og.axis + '°' : '-'}</Text>
                                <Text style={styles.optColVal}>{og.addition || '-'}</Text>
                                <Text style={styles.optColVal}>{og.treatment || '-'}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            );
          })}
        </View>

        {/* --- TOTALS SECTION --- */}
        <View style={styles.totalsSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT:</Text>
              <Text style={styles.totalValue}>{formatMoney(Number(doc.totalHT || 0))}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA:</Text>
              <Text style={styles.totalValue}>{formatMoney(Number(doc.totalTVA || 0))}</Text>
            </View>
            
            <View style={[styles.totalRowFinal, { borderTopColor: primaryColor }]}>
              <Text style={[styles.totalFinal, { color: primaryColor }]}>NET À PAYER:</Text>
              <Text style={[styles.totalFinal, { color: primaryColor }]}>{formatMoney(totalTTC)}</Text>
            </View>

            {doc.resteAPayer > 0 && !isQuote && (
                <View style={[styles.totalRow, { borderBottom: 'none' }]}>
                    <Text style={[styles.totalLabel, {color: '#dc2626'}]}>Reste à payer:</Text>
                    <Text style={[styles.totalValue, {color: '#dc2626'}]}>{formatMoney(Number(doc.resteAPayer))}</Text>
                </View>
            )}
          </View>
        </View>

        {/* --- FOOTER (Conditional) --- */}
        {isQuote ? (
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={{fontSize: 8, fontWeight: 'bold', marginBottom: 10}}>Bon pour accord (Client)</Text>
              <Text style={{fontSize: 7, color: '#aaa'}}>Date et signature</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={{fontSize: 8, fontWeight: 'bold', marginBottom: 10}}>L'Opticien</Text>
              <Text style={{fontSize: 7, color: '#aaa'}}>Cachet et signature</Text>
            </View>
          </View>
        ) : (
          <View style={styles.footer}>
            <Text>Arrêté la présente facture à la somme de : {formatCurrencyToWords(totalTTC)}</Text>
            <Text style={{marginTop: 5, fontStyle: 'italic'}}>Merci de votre confiance</Text>
            {settings?.rib && <Text style={{marginTop: 5}}>RIB: {settings.rib}</Text>}
            <Text style={{marginTop: 5, fontSize: 7, color: '#cbd5e0'}}>Généré par OptiManager Pro</Text>
          </View>
        )}

      </Page>
    </Document>
  );
};
