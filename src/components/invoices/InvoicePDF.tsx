import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image as PDFImage,
    Font,
} from '@react-pdf/renderer';
import type { Sale, Client } from '@/lib/types';

// Define types for shop settings
interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
    if?: string;
    rc?: string;
    tp?: string;
    inpe?: string;
}

interface InvoicePDFProps {
    sale: Sale;
    client: Client;
    shopSettings: ShopSettings;
}

// Register fonts (optional - using default Helvetica)
// You can add custom fonts here if needed

import { pdfStyles } from '@/lib/pdf-styles';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

// Create styles - Removed (using shared styles)


export const InvoicePDF: React.FC<InvoicePDFProps> = ({ sale, client, shopSettings }) => {
    // Normalization
    const items = sale.items || [];
    const totalHT = sale.totalHT || (sale.totalNet / 1.2) || 0; // Fallback if totalHT missing
    const totalTTC = sale.totalNet || 0;
    const tva = totalTTC - totalHT;
    const resteAPayer = sale.resteAPayer || 0;

    // Dates
    const formattedDate = sale.date ? new Date(sale.date).toLocaleDateString('fr-FR') : 'N/A';
    const formattedTTC = Number(totalTTC).toFixed(2);
    const amountInWords = formatCurrencyToWords(totalTTC);

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                
                {/* Header */}
                <View style={pdfStyles.headerContainer}>
                    {/* Left: Logo & Shop Info */}
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
    // Legal Info
    <View style={pdfStyles.legalRow}>
        {shopSettings.ice && <Text style={pdfStyles.legalText}>ICE: {shopSettings.ice}</Text>}
        {shopSettings.if && <Text style={pdfStyles.legalText}> • IF: {shopSettings.if}</Text>}
        {shopSettings.rc && <Text style={pdfStyles.legalText}> • RC: {shopSettings.rc}</Text>}
    </View>
    <View style={pdfStyles.legalRow}>
        {shopSettings.tp && <Text style={pdfStyles.legalText}>TP: {shopSettings.tp}</Text>}
        {shopSettings.inpe && <Text style={pdfStyles.legalText}> • INPE: {shopSettings.inpe}</Text>}
    </View>
    {shopSettings.rib && <Text style={[pdfStyles.legalText, { marginTop: 2 }]}>RIB: {shopSettings.rib}</Text>}
                        </View>
                    </View>

                    {/* Right: Doc Meta */}
                    <View style={pdfStyles.headerRight}>
                        <View style={pdfStyles.docBadge}>
                            <Text style={pdfStyles.docTitle}>FACTURE</Text>
                        </View>
                        <Text style={pdfStyles.docMetaItem}>N° {String(sale.id || '').substring(0, 8).toUpperCase()}</Text>
                        <Text style={pdfStyles.docMetaItem}>Date: <Text style={pdfStyles.docMetaValue}>{formattedDate}</Text></Text>
                        <Text style={pdfStyles.docMetaItem}>
                            Statut: <Text style={pdfStyles.docMetaValue}>{sale.resteAPayer === 0 ? 'PAYÉE' : 'EN ATTENTE'}</Text>
                        </Text>
                    </View>
                </View>

                {/* Client Section */}
                <View style={pdfStyles.clientContainer}>
                    <View style={pdfStyles.clientBox}>
                        <Text style={pdfStyles.clientLabel}>Client</Text>
                        <Text style={pdfStyles.clientName}>{client.prenom} {client.nom}</Text>
                        <Text style={pdfStyles.clientDetail}>{client.telephone1 || 'Tél non renseigné'}</Text>
                        {client.ville && <Text style={pdfStyles.clientDetail}>{client.ville}</Text>}
                        {client.email && <Text style={pdfStyles.clientDetail}>{client.email}</Text>}
                    </View>
                </View>

                {/* Items Table */}
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeader}>
                        <Text style={[pdfStyles.th, pdfStyles.colDesc]}>Désignation</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colBrand]}>Marque</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colModel]}>Modèle</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colQty]}>Qté</Text>
                        <Text style={[pdfStyles.th, pdfStyles.colPrice]}>P.U. HT</Text>
                        <Text style={[pdfStyles.th, { width: '13%', textAlign: 'right' }]}>Total HT</Text>
                    </View>

                    {items.map((item, index) => {
                         // Adapters for different item structures if needed
                         const name = item.nomProduit || item.productName || 'Article';
                         // Cast to any to access potential extra fields not in SaleItem strict type
                         const itemAny = item as any;
                         const marque = itemAny.marque || itemAny.brand || '-';
                         const modele = itemAny.modele || itemAny.model || '-';
                         
                         const price = Number(item.prixVente || item.unitPrice || item.price || 0);
                         const qty = Number(item.quantity || 0);
                         const total = price * qty;
                         
                         return (
                            <View key={index} style={[pdfStyles.tableRow, index % 2 !== 0 ? pdfStyles.tableRowAlt : {}]}>
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

                {/* Totals Section */}
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

                        {resteAPayer > 0 && (
                            <View style={[pdfStyles.totalRow, { marginTop: 5 }]}>
                                <Text style={[pdfStyles.totalLabel, { color: '#dc2626' }]}>Reste à Payer</Text>
                                <Text style={[pdfStyles.totalValue, { color: '#dc2626' }]}>{Number(resteAPayer).toFixed(2)} DH</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Amount in Words */}
                 <View style={pdfStyles.wordsContainer}>
                    <Text style={pdfStyles.wordsLabel}>Arrêté la présente facture à la somme de :</Text>
                    <Text style={pdfStyles.wordsValue}>{formattedTTC} DH ({amountInWords})</Text>
                </View>

                {/* Payment Methods */}
                <View style={pdfStyles.paymentMethodsContainer}>
                    <Text style={pdfStyles.paymentMethodsLabel}>Modes de paiement acceptés</Text>
                    <Text style={pdfStyles.paymentMethodsList}>Espèces • Chèque • Virement bancaire</Text>
                </View>

                {/* Signatures */}
                <View style={pdfStyles.signaturesContainer}>
                    <View style={pdfStyles.signatureBox}>
                        <Text style={pdfStyles.signatureLabel}>Signature du Client</Text>
                        <Text style={pdfStyles.signatureSubLabel}>Lu et approuvé</Text>
                    </View>
                    <View style={pdfStyles.signatureBox}>
                        <Text style={pdfStyles.signatureLabel}>Cachet et Signature</Text>
                        <Text style={pdfStyles.signatureSubLabel}>{shopSettings.shopName || 'OptiManager'}</Text>
                    </View>
                </View>

                 {/* Footer / Conditions - Absolute Position */}
                 <View style={pdfStyles.footerSection}>
                    <View style={pdfStyles.footerRow}>
                        <View style={pdfStyles.footerCol}>
                            <Text style={pdfStyles.footerLabel}>Conditions</Text>
                            <Text style={pdfStyles.footerText}>Paiement comptant à réception.</Text>
                            <Text style={pdfStyles.footerText}>Marchandise livrée, non reprise, non échangée.</Text>
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
