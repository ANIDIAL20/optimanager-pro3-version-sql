import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image as PDFImage,
} from '@react-pdf/renderer';
import type { Devis } from '@/app/actions/devis-actions';
import type { Client } from '@/lib/types';

import { pdfStyles } from '@/lib/pdf-styles';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

// Styles moved to shared file

interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

interface QuotePDFProps {
    devis: Devis;
    shopSettings: ShopSettings;
    // client info is inside devis or fetched separately?
    // Devis stored clientName/Phone but full client details might be needed.
    // We will use devis fields locally.
    client?: Client; 
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ devis, shopSettings, client }) => {
    // Determine data
    const items = devis.items || [];
    const totalHT =  devis.totalHT || items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
    const totalTTC = devis.totalTTC || totalHT * 1.2; // fallback
    const tva = totalTTC - totalHT;

    const formattedDate = devis.createdAt ? new Date(devis.createdAt).toLocaleDateString('fr-FR') : 'N/A';
    const formattedTTC = Number(totalTTC).toFixed(2);
    const amountInWords = formatCurrencyToWords(totalTTC);

    // Client info resolution (prefer direct client object if available, else devis snapshot)
    const clientName = client?.prenom ? `${client.prenom} ${client.nom}` : devis.clientName;
    const clientPhone = client?.telephone1 || devis.clientPhone;
    const clientAddress = client?.adresse || client?.ville || '';

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                 {/* Header */}
                 <View style={pdfStyles.headerContainer}>
                    <View style={pdfStyles.headerLeft}>
                        {shopSettings.logoUrl && (
                            <View style={pdfStyles.logoContainer}>
                                <PDFImage src={shopSettings.logoUrl} style={pdfStyles.logo} />
                            </View>
                        )}
                        <View style={pdfStyles.shopInfo}>
                            <Text style={pdfStyles.shopName}>{shopSettings.shopName}</Text>
                            <Text style={pdfStyles.shopDetail}>{shopSettings.address || 'Adresse non renseignée'}</Text>
                            {shopSettings.phone && <Text style={pdfStyles.shopDetail}>Tél: {shopSettings.phone}</Text>}
                            <View style={pdfStyles.legalRow}>
                                {shopSettings.ice && <Text style={pdfStyles.legalText}>ICE: {shopSettings.ice}</Text>}
                                {shopSettings.rib && <Text style={pdfStyles.legalText}>RIB: {shopSettings.rib}</Text>}
                            </View>
                        </View>
                    </View>

                    <View style={pdfStyles.headerRight}>
                         <View style={pdfStyles.docBadge}>
                            <Text style={pdfStyles.docTitle}>DEVIS</Text>
                        </View>
                        <Text style={pdfStyles.docMetaItem}>N° {String(devis.id || '').substring(0, 8).toUpperCase()}</Text>
                        <Text style={pdfStyles.docMetaItem}>Date: <Text style={pdfStyles.docMetaValue}>{formattedDate}</Text></Text>
                        <Text style={pdfStyles.docMetaItem}>Validité: <Text style={pdfStyles.docMetaValue}>15 Jours</Text></Text>
                        <Text style={pdfStyles.docMetaItem}>Distribution: <Text style={pdfStyles.docMetaValue}>{devis.status}</Text></Text>
                    </View>
                </View>

                {/* Info Bar - Removed in favor of print-like Header Right, but can keep if needed. 
                    Print template puts everything in header. We follow print template. */}

                {/* Client Info */}
                <View style={pdfStyles.clientContainer}>
                    <View style={pdfStyles.clientBox}>
                        <Text style={pdfStyles.clientLabel}>Client</Text>
                        <Text style={pdfStyles.clientName}>{clientName}</Text>
                        {clientPhone && <Text style={pdfStyles.clientDetail}>Tél: {clientPhone}</Text>}
                        {clientAddress && <Text style={pdfStyles.clientDetail}>{clientAddress}</Text>}
                    </View>
                </View>

                {/* Table */}
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeader}>
                        <Text style={[pdfStyles.th, pdfStyles.colDesc]}>Désignation</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colBrand]}>Marque</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colModel]}>Modèle</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colQty]}>Qté</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colPrice]}>P.U. HT</Text>
                        <Text style={[pdfStyles.th, { width: '13%', textAlign: 'right' }]}>Total HT</Text>
                    </View>

                    {items.map((item, idx) => {
                         const itemAny = item as any;
                         // Handle potential devis item structure
                         const name = item.designation || itemAny.nomProduit || 'Produit';
                         const marque = itemAny.marque || itemAny.brand || '-';
                         const modele = itemAny.modele || itemAny.model || '-';
                         const price = Number(item.prixUnitaire);
                         const qty = Number(item.quantite);
                         const total = price * qty;

                        return (
                            <View key={idx} style={[pdfStyles.tableRow, idx % 2 !== 0 ? pdfStyles.tableRowAlt : {}]}>
                                <Text style={[pdfStyles.clientDetail, pdfStyles.colDesc]}>{name}</Text>
                                <Text style={[pdfStyles.clientDetail, pdfStyles.colBrand]}>{marque}</Text>
                                <Text style={[pdfStyles.clientDetail, pdfStyles.colModel]}>{modele}</Text>
                                <Text style={[pdfStyles.clientDetail, pdfStyles.colQty]}>{qty}</Text>
                                <Text style={[pdfStyles.clientDetail, pdfStyles.colPrice]}>{price.toFixed(2)}</Text>
                                <Text style={[pdfStyles.docMetaValue, { width: '13%', textAlign: 'right', fontSize: 9 }]}>{total.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Totals */}
                <View style={pdfStyles.totalsContainer}>
                    <View style={pdfStyles.totalsBox}>
                        <View style={pdfStyles.totalRow}>
                            <Text style={pdfStyles.totalLabel}>Total HT</Text>
                            <Text style={pdfStyles.totalValue}>{Number(totalHT).toFixed(2)} DH</Text>
                        </View>
                        <View style={pdfStyles.totalRow}>
                            <Text style={pdfStyles.totalLabel}>TVA (20%)</Text>
                            <Text style={pdfStyles.totalValue}>{Number(tva).toFixed(2)} DH</Text>
                        </View>
                        <View style={pdfStyles.totalTTCBox}>
                            <Text style={pdfStyles.totalTTCLabel}>Total TTC</Text>
                            <Text style={pdfStyles.totalTTCValue}>{formattedTTC} <Text style={{ fontSize: 9, fontWeight: 'normal' }}>DH</Text></Text>
                        </View>
                    </View>
                </View>
                
                 {/* Amount in Words */}
                 <View style={pdfStyles.wordsContainer}>
                    <Text style={pdfStyles.wordsLabel}>Arrêté le présent devis à la somme de :</Text>
                    <Text style={pdfStyles.wordsValue}>{formattedTTC} DH ({amountInWords})</Text>
                </View>

                {/* Signatures */}
                <View style={pdfStyles.signaturesContainer}>
                    <View style={pdfStyles.signatureBox}>
                        <Text style={pdfStyles.signatureLabel}>Signature du Client</Text>
                        <Text style={pdfStyles.signatureSubLabel}>Bon pour accord</Text>
                    </View>
                    <View style={pdfStyles.signatureBox}>
                        <Text style={pdfStyles.signatureLabel}>Cachet et Signature</Text>
                        <Text style={pdfStyles.signatureSubLabel}>{shopSettings.shopName || 'OptiManager'}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={pdfStyles.footerSection}>
                     <View style={pdfStyles.footerRow}>
                        <View style={pdfStyles.footerCol}>
                            <Text style={pdfStyles.footerLabel}>Conditions</Text>
                            <Text style={pdfStyles.footerText}>Ce devis est valable 15 jours.</Text>
                            <Text style={pdfStyles.footerText}>Pour accord, merci de retourner ce devis signé.</Text>
                        </View>
                         {shopSettings.rib && (
                             <View style={[pdfStyles.footerCol, { alignItems: 'flex-end' }]}>
                                <Text style={pdfStyles.footerLabel}>Coordonnées Bancaires</Text>
                                <Text style={[pdfStyles.footerText, { fontFamily: 'Courier' }]}>{shopSettings.rib}</Text>
                            </View>
                        )}
                    </View>
                     <Text style={[pdfStyles.footerText, { textAlign: 'center', marginTop: 10, fontStyle: 'italic' }]}>
                        "Merci de votre confiance"
                    </Text>
                </View>
                
                 <Text style={pdfStyles.pagination} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};
